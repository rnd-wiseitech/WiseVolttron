import json
from config.wp import getConfig
# import pyspark.sql.functions as F
import re

from job.common.io import database
from datetime import datetime
from job.executor2 import PipelineStep
import pandas as pd

def execute(p_dataSource, **kwargs):

    s_userno = kwargs['userno']
    s_userId = kwargs['userId']

    s_data = kwargs['data']
    s_method = kwargs['method']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_jobId = kwargs['jobId']
    s_groupId = kwargs['groupId']

    s_batch = kwargs.get('batch', False)
    
    #s_df가 데이터 프레임이 맞는지 확인 (이미지 같은 비정형 같은 경우는 데이터프레임이 아님)
    if isinstance(s_df, pd.DataFrame):
        # 컬럼명 특수문자 제거
        s_df.columns = s_df.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
        s_df.columns = s_df.columns.str.replace(' ', '_')
    
    if s_method == 'O-DATABASE' :
        s_storage = database.setData(s_df, s_data)

    elif s_method == 'O-DATASOURCE':
        # 폴더 설정 (파일이름, 임시경로, 실제경로)
        s_uuid, s_viewIdx = p_dataSource.addDataSet(s_df, s_data['dataUserno'], s_jobId, s_groupId, s_userId, s_data['filename'], s_data['filetype'], p_workflowId=s_data['workflowId'], p_temp=False, p_writeMode=s_data['saveOpt'])         
        if s_batch != True:
            s_params = {
                'action': 'statistics',
                'method': '', 
                'userno': s_userno, 
                'userId': s_userId,
                'usermode': 'ADMIN',  
                'groupId': s_groupId, 
                'jobId': s_jobId, 
                'location': kwargs['location'], 
                'data': {
                    "REG_DT": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    "REG_USER_NO": s_userno,
                    'usetable': s_data['usetable'],
                    "DS_VIEW_ID": s_data['filename'],
                    "VIEW_IDX": int(s_viewIdx),
                }, 
                'batch': False,
                'saveOpt': s_data['saveOpt'],
                'df':s_df
            }
            o_jobExcuter = PipelineStep('excute', 'common', 'statistics', p_dataSource,None,**s_params)
            # job 실행
            s_json = o_jobExcuter.run()

    elif s_method == 'O-IMAGE-DATASOURCE':
        s_uuid, s_viewIdx, p_df = p_dataSource.addImageDataSet(s_df, s_data['dataUserno'], s_jobId, s_groupId, s_userId, s_data['filename'], s_data['filetype'], p_workflowId=s_data['workflowId'], p_temp=False)

        s_method = 'create'
        if s_viewIdx != 1:
            s_method = 'update'

        s_imageComponentParam = imageManifestValidation(s_df, p_dataSource, s_userno, s_userId, s_groupId, s_jobId)
        s_data['DS_VIEW_ID'] = s_data['filename']
        s_dsViewId = s_data['DS_VIEW_ID']
        s_params = {
            'action': 'manifest',
            'method': s_method, 
            'userno': s_userno, 
            'userId': s_userId,
            'usermode': 'ADMIN',  
            'groupId': s_groupId, 
            'jobId': s_jobId, 
            'location': kwargs['location'], 
            'batch': False,
            'viewname': f'{str(s_userno)}_{str(s_dsViewId)}'
        }
        s_paramData = {
            "REG_DT": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "REG_USER_NO": s_userno,
            'usetable': s_data['usetable'],
            "DS_VIEW_ID": s_data['filename'],
            "VIEW_IDX": int(s_viewIdx),
            "TBL_TYPE" : s_data['filetype'],
            "COUNT": len(s_df)
        }
        
        for s_column in s_imageComponentParam:
            s_paramData[s_column] = s_imageComponentParam[s_column]
        s_params['data'] = s_paramData
        o_jobExcuter = PipelineStep('excute', 'common', 'manifest', p_dataSource,None,**s_params)
        o_jobExcuter.run()
    elif s_method == 'O-FILE':
        p_dataSource.o_storageManager.writeFile(f"{s_data['filepath']}{s_data['filename']}", s_df)
    s_df = None

    return s_df

def imageManifestValidation(p_df, p_dataSource, p_userno, p_userId, p_groupId, p_jobId):
    pImageParam = {}

    if 'tag' in p_df:
        s_labelPath = p_df['labelpath'].dropna().iloc[0]
        pImageParam['LABEL_COUNT'] = int(p_df['tag'].count())

    if 'predict' in p_df:
        pImageParam['PREDICT_COUNT'] = int((p_df['predict'] != '').sum())
    return pImageParam
