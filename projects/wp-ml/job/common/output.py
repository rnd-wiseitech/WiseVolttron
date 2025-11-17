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
    # for i in range(len(s_df.columns)):
    #     s_df.columns.values[i] = re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", s_df.columns.values[i])
    #     s_df.columns.values[i] = s_df.columns.values[i].replace(" ", "_")

    
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
                'df':s_df
            }
            o_jobExcuter = PipelineStep('excute', 'common', 'statistics', p_dataSource,None,**s_params)
            # job 실행
            s_json = o_jobExcuter.run()
        # kwargs['VIEW_IDX'] = s_viewIdx
        # manifest.execute(p_dataSource,**kwargs)
 
    elif s_method == 'O-IMAGE-DATASOURCE':
        # 폴더 설정 (파일이름, 임시경로, 실제경로)
        s_uuid, s_viewIdx, p_df = p_dataSource.addImageDataSet(s_df, s_data['dataUserno'], s_jobId, s_groupId, s_userId, s_data['filename'], s_data['filetype'], p_workflowId=s_data['workflowId'], p_temp=False)

        s_method = 'create'
        if s_viewIdx != 1:
            s_method = 'update'

        # 이미지의 경우 manifest 데이터가 추가적으로 있는지 확인
        s_imageComponentParam = imageManifestValidation(s_df, p_dataSource, s_userno, s_userId, s_groupId, s_jobId)

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
        }
        # 기본 manifest 데이터
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
        # 라벨 path 있을 경우
        # if 'labelpath' in s_df:
        #     s_labelPath = s_df['labelpath'][0]
        #     s_labelReadParams = {
        #         'action': 'readfile',
        #         'userno': s_userno, 
        #         'userId': s_userId,
        #         'usermode': 'ADMIN',  
        #         'groupId': s_groupId, 
        #         'jobId': s_jobId, 
        #         'data': {
        #             "filepath":f'{s_labelPath}/coco.json'
        #         }, 
        #         'batch': False, 
        #     }
        #     # 저장한 coco.json 파일 읽어서 라벨 이미지 갯수 확인
        #     o_jobExcuter = PipelineStep('excute', 'common', 'readfile', p_dataSource,None,**s_labelReadParams)  
        #     s_cocoLabel = o_jobExcuter.run()
        #     # manifest 만들때 추가
        #     s_params['data']['LABEL_COUNT'] = len(s_cocoLabel['data']['images'])

        #PipelineStep으로 manifest 실행시키기 전에 s_params에 manifest 데이터 넣어줌
        s_params['data'] = s_paramData
        o_jobExcuter = PipelineStep('excute', 'common', 'manifest', p_dataSource,None,**s_params)
        o_jobExcuter.run()
    elif s_method == 'O-FILE':
        p_dataSource.o_storageManager.writeFile(f"{s_data['filepath']}{s_data['filename']}", s_df)
    # s_result = {
    #     "action" : kwargs['action'],
    #     "method": kwargs['method'],
    #     "data" : s_df,
    #     "schema" : s_schema,
    #     "viewname": kwargs['viewname'],
    #     "count":  len(s_df)
    # }
    s_df = None
    # common이면 메모리 관리를 위해 전단계 워크플로우 컴퍼넌트의 뷰테이블은 삭제함
    # p_dataSource.deleteDataSet(s_data['usetable'])

    return s_df

# 이미지 manifest에 추가할 데이
def imageManifestValidation(p_df, p_dataSource, p_userno, p_userId, p_groupId, p_jobId):
    pImageParam = {}
    # 라벨 사용했을 때
    if 'labelpath' in p_df:
        # 라벨 저장 경로를 가져옴
        s_labelPath = p_df['labelpath'][0]
        s_labelReadParams = {
            'action': 'readfile',
            'userno': p_userno, 
            'userId': p_userId,
            'usermode': 'ADMIN',  
            'groupId': p_groupId, 
            'jobId': p_jobId, 
            'data': {
                "filepath":f'{s_labelPath}/coco.json'
            }, 
            'batch': False, 
        }
        # 가져온 라벨 경로에 저장한 coco.json 파일 읽음
        s_cocoLabel = p_dataSource.o_storageManager.readFile(f"{s_labelPath}/coco.json", 'json')
        # manifest 만들때 읽어온 coco.json에서 이미지 갯수 추가해줌
        pImageParam['LABEL_COUNT'] = len(s_cocoLabel['images'])
    # 예측 있을 때
    if 'predict' in p_df:
        # 예측 한 것 중에서 '' 값 없는것만 뽑아서 갯수 추가해줌 (예측 못하면 '' 값이 되어버림)
        pImageParam['PREDICT_COUNT'] = int((p_df['predict'] != '').sum())
     # 라벨 말고도 manifest에 등록해야할 경우 밑에 if 문으로 추가해주면 됨
    # ex) if 'resizepath' in p_df: ~~~~
    return pImageParam

# def execute(**kwargs):

#     s_userno = kwargs['userno']
#     s_userId = kwargs['userId']    
#     s_fileName = kwargs['data']['filename']
#     s_fileType = kwargs['data']['filetype']
#     s_viewName = kwargs['viewname']
#     s_targetConn = kwargs['targetConn']
#     s_df = kwargs['df']

#     s_reVal = False
    
#     s_rootPath = '/'

#     s_dbinfo = getConfig('','META_DB')

#     s_dbMng = WpDataBaseManagement('mysql')
#     s_dbMng.connect('mysql', \
#                     s_dbinfo['host'], \
#                     s_dbinfo['port'], \
#                     s_dbinfo['id'], \
#                     s_dbinfo['passwd'], \
#                     s_dbinfo['db'])
                    
#     s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', \
#                                     f" where DS_VIEW_ID='{s_fileName}' and REG_USER_NO='{s_userno}' and DEL_YN='N'")

#     s_index = s_dsViewTblMstr['VIEW_IDX'][0]

#     # s_index가 None이 아닐 경우 overwrite로 판단
#     if s_index != None:
#         s_index = s_index + 1
#     # s_index가 None일 경우 new로 판단.
#     else:
#         s_index = 1

#     # 폴더 설정 (파일이름, 임시경로, 실제경로)
#     s_saveFileName = f"{str(s_fileName)}_{str(s_index)}.{s_fileType}"
#     s_tempPath = s_rootPath + str(s_userno) + '/temp/' 
#     s_realPath = s_rootPath + str(s_userno) + '/wp_dataset/' + str(s_fileName) + '/'

#     if s_targetConn['type'] == 'I-HDFS' :
#         s_type = 'HDFS'
#     elif s_targetConn['type'] == 'I-HIVE' :
#         s_type = 'HIVE'
#     elif s_targetConn['type'] == 'I-DATABASE' :
#         s_type = 'RDBMS'
#     elif s_targetConn['type'] == 'I-DATASOURCE' :
#         s_type = 'DATASOURCE'
#     elif s_targetConn['type'] == 'I-STREAMING' :
#         s_type = 'STREAMING'
#     elif s_targetConn['type'] == 'I-FTP' :
#         s_type = 'FTP'
#     else :
#         s_type = 'LOCAL'

#     # 컬럼명 특수문자 제거    
#     for i in range(len(s_df.columns)):
#         s_df.columns.values[i] = re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', "", s_df.columns.values[i])
#         s_df.columns.values[i] = s_df.columns.values[i].replace(" ", "_")

    
#     s_localStorage = common.WiseStorageManager(s_userno,'LOCAL','/home/ubuntu/wp-platform/wp-ml/py_result/')

#     for p_path in [s_tempPath,s_realPath] : 
#         # 폴더체크 
#         if not s_localStorage.checkExist(p_path) :
#             s_localStorage.createDirs(p_path)

#             # 하둡 파일 소유주 설정 (경로, 이름명, 그룹명)
#             # if s_userno != None:
#             #     s_localStorage.setOwner(p_path, s_userId, 'wise')

#         # 임시 폴더에 있으면 삭제
#         if s_localStorage.checkExist(f"{p_path}{s_saveFileName}") == True:
#             s_localStorage.deleteDirs(f"{p_path}{s_saveFileName}")
    
#     s_localStorage.writeFile(f"{s_tempPath}{s_saveFileName}",s_df)
    
#     # 실제 이름으로 rename
#     s_localStorage.moveFile(f"{s_tempPath}{s_saveFileName}",f"{s_realPath}{s_saveFileName}")
#     # 임시폴더파일 삭제
#     s_localStorage.deleteDirs(f"{p_path}{s_saveFileName}")

#     # 서비스 메모리에 적재해야됨
#     # s_localStorage.createView(f"{str(s_userno)}_{str(s_fileName)}",s_df)
#     # s_localStorage.createView(s_viewName,s_df)

#     return s_df