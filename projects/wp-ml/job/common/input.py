import re
import os

from serviceStorage import hdfsService,ftpService,sftpService,localService, apiService
from job.common.io import database, volttron
from database.manager import WpDataBaseManagement
from datetime import datetime
import pandas as pd

def execute(p_dataSource, **kwargs):
    s_userno = kwargs['userno']
    s_data = kwargs['data']
    s_method = kwargs['method']
    s_groupId = kwargs['groupId']

    try:
        s_fromPath = kwargs['data']['filepath']
        path, extension = os.path.splitext(s_fromPath)
        extension = extension.replace('.','')
    except Exception :
        pass
        
    if s_method == 'I-HDFS' :
        s_storage = hdfsService.webHdfs(s_userno, s_data)
        s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_fromPath, extension)

    elif s_method in ['I-DATABASE', 'I-HIVE']  :
        s_storage = database
        # Temp면 10개만 뽑기 위해 groupId 보냄
        s_df = s_storage.getData(s_data, s_groupId)

    elif s_method == 'I-DATASOURCE' or s_method == 'I-IMAGE-DATASOURCE':
        s_dataUserno = s_data['dataUserno']
        s_dbMng = WpDataBaseManagement('meta')
        s_filename = s_data['filename']
        s_filetype = s_data['filetype']

        s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', 
                                            f" WHERE DS_VIEW_ID='{s_filename}' and REG_USER_NO='{s_dataUserno}' AND DEL_YN='N'")
        s_index = s_dsViewTblMstr['VIEW_IDX'][0]

        # delta일때는 뒤에 인덱스 안 붙히고 폴더 하나로 관리함
        if s_filetype == 'delta':
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "." + s_filetype    
        else :
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "_" + str(s_index) + "." + s_filetype
        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, s_filetype)

    elif s_method == 'I-FTP' :
        if s_data['ftptype'] == 'ftp':
            s_storage = ftpService.ftpStorage(s_userno, s_data['ftphost'], int(s_data['ftpport']), s_data['ftpuser'], s_data['ftppassword'])
        else:
            s_storage = sftpService.sftpStorage(s_userno, s_data['ftphost'], int(s_data['ftpport']), s_data['ftpuser'], s_data['ftppassword'])

        s_filelist = s_data['filelist']
        # dateexp일 경우 keyword 재정의
        s_keyword = s_data['keyword']
        if s_data['searchtype'] == 'dateexp':
            s_keyword = datetime.now().strftime(s_keyword)
        
        # 경로 이동
        s_storage.changeDir(s_data['filepath'])

        # regexp dateexp일 경우 파일리스트 정의
        if s_data['searchtype'] in ['regexp', 'dateexp']:
            s_totallist = s_storage.listFile(s_data['filepath'], True)
            s_filelist = []
            for file in s_totallist:
                if re.search(f'{s_keyword}', file) and re.search('\.csv$', file):
                    s_filelist.append(file)
            s_filelist.sort()

        # 폴더체크


        # 파일 읽기
        if s_data.get('ftpsample', False) != True:
            s_init = True
            for file in s_filelist:
                if s_init:
                    s_filepath, s_fileextension = os.path.splitext(file)
                    s_fileextension = s_fileextension.replace('.','')
                    if s_fileextension == 'txt':
                        s_df = s_storage.readFile(file, 'csv')
                    else:
                        s_df = s_storage.readFile(file, s_fileextension)
                    s_init = False
                else:
                    s_filepath, s_fileextension = os.path.splitext(file)
                    s_fileextension = s_fileextension.replace('.','')
                    if s_fileextension == 'txt':
                        # s_df = s_df.append(s_storage.readFile(file, 'csv'))
                        s_df = pd.concat([s_df, s_storage.readFile(file, 'csv')])
                    else:
                        # s_df = s_df.append(s_storage.readFile(file, s_fileextension))
                        s_df = pd.concat([s_df, s_storage.readFile(file, s_fileextension)])
        # workflow 샘플데이터일경우
        else:
            s_filepath, s_fileextension = os.path.splitext(s_filelist[0])
            s_fileextension = s_fileextension.replace('.','')
            if s_fileextension not in ['txt', 'csv']:
                # xlsx, parquet의 경우 인코딩 문제로 한줄씩 읽어와서 합치면 dataframe으로 변환시 에러 발생해서
                # 전체 데이터 읽어오게 적용
                s_df = s_storage.readFile(s_filelist[0], p_option=s_fileextension)
            else:
                s_df = s_storage.readFile(s_filelist[0], 'readsample')
        s_storage.close()

    elif s_method == 'I-STORAGE' :
        # deltaLake 형식인지 체크
        s_extension = p_dataSource.o_storageManager.checkDelta(s_fromPath, extension)

        if s_extension == 'txt':
            s_extension = 'csv'

        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, s_extension)

    elif s_method == 'I-LOCAL' :
        
        s_storage = localService.localStorage(s_userno, s_data)
        if extension == 'txt':
            s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_fromPath, 'csv')
        else:
            s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_fromPath, extension)

    # elif s_method == 'I-STREAMING' :
    #     s_storage = kafka
    #     s_df = s_storage.getData(kwargs)
    elif s_method == "I-API" :
        s_storage = apiService.apiStorage(s_data)
        s_df = s_storage.readApiData()

    elif s_method == "I-VOLTTRON" :
        s_storage = volttron
        s_df = s_storage.getData()

    # 이미지 스토리지
    elif s_method == 'I-IMAGE-STORAGE' or s_method == 'I-IMAGE-LABEL' :
        if s_method == 'I-IMAGE-STORAGE':
            extension='image'
        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, extension)

    else :
        s_storage = localService.localStorage(s_userno,'','/home/ubuntu/wp-platform/wp-ml/py_result/')
        s_df = s_storage.readFile(s_fromPath, extension)

    # 컬럼명 특수문자 제거
    s_df.columns = s_df.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
    s_df.columns = s_df.columns.str.replace(' ', '_')
    # for i in range(len(s_df.columns)):
    #     s_df.columns.values[i] = re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", s_df.columns.values[i])
    #     s_df.columns.values[i] = s_df.columns.values[i].replace(" ", "_")
        #s_df = s_df.rename(name, re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", df.columns.values[i]))
        #s_df = s_df.withColumnRenamed(name, name.replace(" ", "_"))        

    return s_df

# def execute(**kwargs):

#     s_type = ''
#     s_userno = kwargs['userno']
#     s_fromPath = kwargs['data']['filepath']
#     s_viewName = kwargs['viewname'] # viewname
#     s_fromConn = kwargs['conn']

#     s_batch = False
#     s_reVal = False

#     if s_fromConn['type'] == 'I-HDFS' :
#         s_type = 'HDFS'
#     elif s_fromConn['type'] == 'I-HIVE' :
#         s_type = 'HIVE'
#     elif s_fromConn['type'] == 'I-DATABASE' :
#         s_type = 'RDBMS'
#     elif s_fromConn['type'] == 'I-DATASOURCE' :
#         s_type = 'DATASOURCE'
#     elif s_fromConn['type'] == 'I-STREAMING' :
#         s_type = 'STREAMING'
#     elif s_fromConn['type'] == 'I-FTP' :
#         s_type = 'FTP'
#     else :
#         s_type = 'LOCAL'

#     s_fromStorage = common.WiseStorageManager(s_userno,s_type,'/home/ubuntu/wp-platform/wp-ml/py_result/')
#     path, extension = os.path.splitext(s_fromPath)
#     extension = extension.replace('.','')
#     s_df = s_fromStorage.readFile(s_fromPath,extension)    

#     # 컬럼명 특수문자 제거
#     for i in range(len(s_df.columns)):
#         s_df.columns.values[i] = re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", s_df.columns.values[i])
#         s_df.columns.values[i] = s_df.columns.values[i].replace(" ", "_")
#         #s_df = s_df.rename(name, re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", df.columns.values[i]))
#         #s_df = s_df.withColumnRenamed(name, name.replace(" ", "_"))


#     s_sparkStorage = common.WiseStorageManager(s_userno,'LOCAL')
#     s_reVal = s_sparkStorage.writeFile(f"{s_viewName}.{extension}",s_df)
    
#     # s_schema = []

#     # for s_colName in s_df.columns :
#     #     s_schema.append({
#     #         "metadata":{},
#     #         "name":s_colName,
#     #         "nullable":'true',
#     #         "type":str(s_df.dtypes[s_colName])
#     #     })

#     return s_reVal