from job.common.io import database, schema
from job.common import manifest
from serviceStorage import hdfsService,ftpService,sftpService,localService, apiService
import re
import os
from config.wp import getConfig
import pandas as pd
from datetime import datetime
def execute(p_dataSource, **kwargs):
    
    s_data = kwargs['data']
    s_userId = kwargs['userId']
    s_userno = kwargs['userno']
    s_jobId = kwargs['jobId']
    s_groupId = kwargs['groupId']
    s_method = kwargs['method']

    s_result = 1
    s_schema = None
    s_paramData = {}
    s_df = pd.DataFrame()
    s_fileExtension = ''
    s_wpFileFormat = getConfig('', 'FILE_FORMAT')

    # s_wpStorage = p_dataSource.o_storageManager.o_wpStorage
    
    
    # 1) 데이터매니저 데이터셋 추가, 2) storage viewer db 업로드 에서 사용
    if s_method == 'RDBMS':
        s_exist = p_dataSource.o_storageManager.checkExist(s_data['filepath'])
        if s_exist == True:
            p_dataSource.o_storageManager.removeFile(s_data['filepath'])
        print("s_exist : ", s_exist)
        # upload
        s_storage = database
        s_storage.uploadData(s_userno, s_data, p_dataSource)
        if s_data['filename'] != None:
            s_df = p_dataSource.o_storageManager.readFile(s_data['filepath'], s_wpFileFormat)
            p_dataSource.dataset[str(s_userno) + "_" + str(s_data['filename'])] = s_df

        #     s_tablename = s_data['tablename']
        #     s_filetype = 'csv'
        #     s_filepath = s_data['filepath']
    elif  s_method == 'HDFS':
        
        s_exist = p_dataSource.o_storageManager.checkExist(s_data['filepath'])

        if s_exist == True:
            p_dataSource.o_storageManager.removeFile(s_data['filepath'])

        try:
            if s_data['tbl_type'] == 'structure':
                s_fileExtension = 'csv'
            else:
                s_fromPath = s_data['filepath']
                path, s_fileExtension = os.path.splitext(s_fromPath)
                s_fileExtension = s_fileExtension.replace('.','')

            s_storage = hdfsService.webHdfs(s_userno, s_data)
            s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_data['filepath'], s_fileExtension)

        except KeyError :
            pass

    # 1) 데이터매니저 데이터셋 추가 에서만 사용
    else:
        from serviceData import dataService
        try:
            s_filename, s_fileExtension = os.path.splitext(s_data['filepath'])
            s_fileExtension = s_fileExtension.lower()
            # 로컬 파일 업로드 할때, deltalake 파일인지 확인
            s_fileExtension = '.' + p_dataSource.o_storageManager.checkDelta(s_data['filepath'], s_fileExtension.replace('.', ''))

            p_param = {}
            p_param['USER_NO'] = s_userno
            s_data['storage_type'] = s_method
            
            s_df = dataService.readDataset(s_data['filepath'], s_fileExtension, p_param,'COMMON',s_data)
            # if s_data['tbl_type'] == 'structure':
            #     s_extension = 'csv'
            # else:
            #     s_fromPath = s_data['filepath']
            #     path, s_extension = os.path.splitext(s_fromPath)
            # s_extension = s_fileExtension.replace('.','')
        except KeyError :
            pass

    s_tablename = s_data['filename']

    if getConfig('', 'FILE_FORMAT'):
        s_filepath = f'/{s_userno}/wp_dataset/{s_tablename}/{s_tablename}.{s_wpFileFormat}'
    else:
        s_filepath = f'/{s_userno}/wp_dataset/{s_tablename}/{s_tablename}_0.{s_wpFileFormat}'

    # 컬럼명 특수문자 제거
    if s_method != 'RDBMS':
        print("gdgdgdg")
        s_df.columns = s_df.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
        s_df.columns = s_df.columns.str.replace(' ', '_')
        p_dataSource.uploadDataset(s_df, s_userno, s_userId, s_filepath, s_data['filename'], s_tablename, s_wpFileFormat)

        s_result = len(s_df)

        if s_data['filename'] == None:
            del s_df
            
    if s_data['filename'] != None:
        s_schema = schema.getSchemaData(s_df)      
        s_paramData = {
            "DS_VIEW_ID": s_data['filename'],
            "VIEW_IDX": 0,
            "TBL_TYPE": s_data['tbl_type'],
            "REG_DT": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "REG_USER_NO": s_userno,
            "schema":s_schema,
            "row_count":len(s_df),
            "column_count":s_df.shape[1]
        }  
        
        s_manifestParam = {
            "action" : 'manifest',
            "method" : 'create',       
            "userId" :  kwargs['userId'],
            "userno" : kwargs['userno'],
            "jobId" : kwargs['jobId'],
            "groupId" : kwargs['groupId'],
            "data" : s_paramData,
            "schema" : s_schema,
            "viewname": kwargs['viewname'],
            "count":  len(s_df)
        }
        manifest.execute(p_dataSource, **s_manifestParam)
               
    s_result = s_df.head(10)
    
    return s_result