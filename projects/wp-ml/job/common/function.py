import pandas as pd
from deltalake import write_deltalake, DeltaTable
import pyarrow as pa
from sqlalchemy import text
import json
import subprocess
import sys
from database.manager import WpDataBaseManagement

def execute(p_dataSource, **kwargs):
    # 기능이 필요는 한데, 파일로 따로 관리하기는 애매한 기능들 모아놓은 파일
    # functionType의 값에 따라 기능을 구분함. /jobexecute/function 으로 실행시킨뒤 s_functionType에 따라 기능 실행
    
    s_functionType = kwargs['functionType']
    
    # 데이터셋 컬럼 체크 (현재 DeltaLake에서만 쓰임)
    if s_functionType =='datasetColumnCheck':
        s_fromPath =  str(kwargs['userno']) + "/wp_dataset/" + str(kwargs['fileName']) + "/" + str(kwargs['fileName']) + '_'+ str(kwargs['fileIdx']) +".manifest"
        s_manifest = p_dataSource.o_storageManager.readFile(s_fromPath, 'manifest')
        s_datasetColumn = [s_schema['name'] for s_schema in s_manifest['schema']]
        
        if set(s_datasetColumn) == set(kwargs['columnList']):
            s_result = {'result' : True}
        else :
            s_result = {'result' : False, 'useColumn':s_datasetColumn}

     # 토픽 전달
    if s_functionType =='topicSend':
        s_topic = kwargs['topic']
        
        # 여기 토픽을 volttron 워크플로우 중에서 있는것만 찾아 실행시켜야한다 
        s_dbMng = WpDataBaseManagement('meta')
        s_volttronQuery = text(""" SELECT 
                            A.SCH_ID,
                            B.WF_NM,
                            B.WF_ID,
                            B.REG_USER,
                            B.WF_PATH,
                            E.WF_DATA
                        FROM WK_SCH_MSTR A
                        INNER JOIN WF_MSTR B ON A.WF_ID = B.WF_ID
                        LEFT OUTER JOIN WF_USE_DATASET C ON B.WF_ID = C.WF_ID 
                        LEFT OUTER JOIN DS_VIEW_MSTR D ON C.DS_VIEW_ID = D.DS_VIEW_ID
                        INNER JOIN WF_COM_MSTR E ON A.WF_ID = E.WF_ID
                        WHERE A.DEL_YN='N' AND A.SCH_STATUS LIKE 'REALVOLTTRON_20' AND E.COM_ID = 78 GROUP BY SCH_ID ORDER BY SCH_ID DESC;""")
        s_workflow = s_dbMng.o_conn.execute(s_volttronQuery).mappings().all()

        # 여기서 log_id랑 sch_id 같이 보내서 장치관리 로그 만들기
        
        for s_component in s_workflow:
            s_componentTopic = json.loads(s_component['WF_DATA'])['wp-data']['o_data']['topic']
            if s_topic == s_componentTopic:
                s_sch_id = s_component['SCH_ID']
                
                try :
                    s_param = { "topic" : s_topic, "offset" :  kwargs['offset'], "sch_id": s_sch_id}
                    s_execPath = s_component["WF_PATH"]
                    s_run = subprocess.Popen([sys.executable, s_execPath, json.dumps(s_param)], stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stdin=subprocess.DEVNULL, start_new_session=True)
                    s_run.wait()
                    
                except Exception as e:
                    pass
                    
        s_result = True

    if s_functionType =='writeDeltaLake':
        s_mode = 'overwrite'
        if type(kwargs['data']) != pd.DataFrame:
            try:
                s_df = pd.DataFrame.from_dict(kwargs['data'])
            except Exception as e:
                s_df = pd.DataFrame([kwargs['data']])
        else:
            s_df = kwargs['data']

        s_deltaLakeTbl = pa.Table.from_pandas(s_df)
        write_deltalake('C:/deltaTest', data=s_deltaLakeTbl, mode=s_mode)

        s_result = True

    return s_result
