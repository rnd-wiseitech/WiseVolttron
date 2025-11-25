import time
import json
from serviceData import dataSourceService
from config.wp import getConfig
from job.executor import JobExecutor
from database.manager import WpDataBaseManagement
from flask import request
from datetime import datetime
import pytz
import os
def job(p_param, p_info, o_dataSource):
    print("=====================p_info :", p_info )
    
    # 시작 시간.
    s_start = time.time() 
    # 요청 파라미터.
    s_params = p_param 
    s_params.update(p_info)
    
    # 배치
    s_params['batch'] = s_params.get('batch', False)
    print("=====================s_params :", s_params )
    # api 타입 (SPARK / COMMON)
    s_apieType = getConfig('','API_TYPE')

    # JOB_SUB_MSTR 실행중으로 UPDATE
    # PID 조회
    s_pid = os.getpid()
    s_dbMng = WpDataBaseManagement('meta')
    s_query = 'UPDATE JOB_MSTR SET PROCESS_ID = %s, STATUS = 20 WHERE SCH_ID = %s AND LOG_ID = %s'
    s_dbMng.o_conn.execute(s_query, (s_pid, s_params['schId'], s_params['logId']))
    s_query = 'UPDATE JOB_SUB_MSTR SET STATUS = 20, ST_DT = %s WHERE ID = %s AND JOB_ID = %s AND SCH_ID = %s AND LOG_ID = %s'
    s_dbMng.o_conn.execute(s_query, (datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"), s_params['groupId'], s_params['jobId'], s_params['schId'], s_params['logId']))

    try:
        # 함수(실행파일명) 설정
        s_func = s_params['action']
        print("s_params : ", s_params)
        print("s_params['action'] : ", s_params['action'])
        # ['correlation', 'output', 'transform', 'statistics'] 인 경우에는 usetable로 데이터 읽음.
        if s_params['action'] in ['correlation', 'output', 'transform', 'statistics', 'model-train', 'model-predict', 'model-process']:
            s_params['df'] = o_dataSource.getDataSet2(s_params['data']['usetable'])
        
        # transform인 경우에는 method를 함수(실행파일명) 설정
        if s_params['action'] == 'transform' :
            s_func = s_params['method']
        # WPLAT-374
        if s_params['action'] == 'workflow' :
            s_params['data']['param'] = {
                "logId": p_info['logId'],
                "schId": p_info['schId'],
                "batch": p_info['batch'],
                "userno": p_info['userno'],
                "userId": p_info['userId'],
                "usermode": p_info['usermode'],
                "location": p_info['location'],
                "memory": p_info['memory'],
                "core": p_info['core'],
                }
            s_params['data']['param'] = json.dumps(s_params['data']['param'])
            
        # job 세팅
        o_jobExcuter = JobExecutor(s_apieType, s_func, o_dataSource)
        
        # job 실행
        s_json = o_jobExcuter.execute(**s_params)
        
        s_jobList = []
        s_stageList = []

        s_json['responsecode'] = 200
        s_json['joblist'] = s_jobList
        s_json['stagelist'] = s_stageList
        
        s_json['duration'] = round(time.time() - s_start, 2)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.updateJobStatus(s_params['groupId'], s_params['jobId'], 40, None, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"), s_params['schId'], s_params['logId'])
        print("s_json : ", s_json)
        return s_json
    
    except Exception as e:
        print("livy Exception e : ", e)
        print("s_params['schId'], s_params['logId'] : ", s_params['schId'], s_params['logId'])
        print("s_params['jobId'] : ", s_params['jobId'])
        s_dbMng.updateJobStatus(s_params['groupId'], s_params['jobId'], 99, e, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"), s_params['schId'], s_params['logId'])
        raise e