import json
from config.wp import getConfig
from serviceStorage import common
from datetime import datetime
from database.manager import WpDataBaseManagement

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_userId = kwargs['userId']
    s_userno = kwargs['userno']
    s_jobId = kwargs['jobId']
    s_groupId = kwargs['groupId']
    s_method = kwargs['method']
    s_regUserNo = s_data['REG_USER_NO']
    s_reVal = 1
        
    try :
        # print(s_data)
        
        o_storageManager = p_dataSource.o_storageManager
        
        s_dsviewId = s_data['DS_VIEW_ID']
        # 데이터셋 시작 인덱스 1 → 0으로 수정
        s_dsviewIdx = s_data['VIEW_IDX'] if s_data['VIEW_IDX'] else 0
        
        s_option = 'manifest'
        s_filepath = f'/{s_regUserNo}/wp_dataset/{s_dsviewId}/{s_dsviewId}_{s_dsviewIdx}.{s_option}'
        
        if s_method == 'create':                    
            s_result = o_storageManager.writeFile(s_filepath,s_data,s_option)
            if s_dsviewIdx != 1 :
                s_orgfilepath = f'/{s_regUserNo}/wp_dataset/{s_dsviewId}/{s_dsviewId}_{s_dsviewIdx-1}.{s_option}'
                try:
                    s_orgSchemaList = o_storageManager.readFile(s_orgfilepath, s_option)['schema']
                except:
                    # manifest 적용 이전 데이터셋일 경우
                    s_orgSchemaList = None
                    
                if s_orgSchemaList:
                    s_newschemaList = s_data['schema']
                    
                    s_orgSchema = {item['name']: item['type'] for item in s_orgSchemaList}
                    s_newSchema = {item['name']: item['type'] for item in s_newschemaList}
                    
                    s_schemaCheck = {"result": True, "type": ''}
                    
                    # column 같은지 확인
                    if s_orgSchema.keys() == s_newSchema.keys():                    
                        # datatype 같은지 확인
                        for name in s_orgSchema.keys():
                            if s_orgSchema[name] != s_newSchema[name]:
                                s_schemaCheck = {"result": False, "type": 'datatype'}
                    else:
                        s_schemaCheck = {"result": False, "type": 'column'}
                    
                    if not s_schemaCheck['result']:     
                        s_dbMng = WpDataBaseManagement('meta')
                        s_historyDict = {"H_TYPE":'MANIFEST',
                                        "DS_VIEW_ID": s_dsviewId,
                                        "OPERATION":'schema', 
                                        "PRE_VALUE":f'{s_dsviewId}_{s_dsviewIdx-1}', 
                                        "CUR_VALUE":f'{s_dsviewId}_{s_dsviewIdx}',
                                        "UPD_DT": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                        "UPD_USER_ID":str(s_userno),
                                        "HISTORY_DESC":s_schemaCheck['type']
                                        }
                        s_dbMng.insert('DS_VIEW_HISTORY',s_historyDict,'single')
                s_dbMng.update('DS_VIEW_TBL_MSTR',{'STATUS_CODE':40}, {"DS_VIEW_ID": s_dsviewId},'single')
                s_dbMng.close()       
                           
                
        elif s_method == 'update':    
            try:
                s_orgData = o_storageManager.readFile(s_filepath, s_option)
            except:
                # manifest 적용 전 데이터셋의 매니페스트 재생성 할 경우
                s_orgData = {"TBL_TYPE":'structure', "REG_USER_NO":s_userno, "REG_DT":datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
                                
            s_data = {key: value for key, value in s_data.items() if value is not None}
            
            # 업데이트할 값들을 기존 데이터에 병합
            s_orgData.update(s_data)

            s_result = o_storageManager.writeFile(s_filepath,s_orgData,s_option)
            # manifest 파일 만들어 졌으면 DS_VIEW_TBL_MSTR 에 STATUS_CODE 40 변경
            # 40으로 변경해야 데이터셋 덮어쓰기 하고나서 통계량하고 저장된 값이 맞게 교헤됨
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.update('DS_VIEW_TBL_MSTR',{'STATUS_CODE':40}, {"DS_VIEW_ID": s_dsviewId},'single')
                
        elif s_method == 'read':    
            s_reVal = o_storageManager.readFile(s_filepath, s_option)



    except Exception as ex:
        print("manifest err : ",ex)
        s_reVal = 0

    return s_reVal
    
