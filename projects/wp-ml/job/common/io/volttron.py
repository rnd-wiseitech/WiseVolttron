from serviceStorage import common,localService
from config.wp import getConfig
from database.manager import WpDataBaseManagement
import subprocess
import requests
import pandas as pd
from serviceDatabase import databaseService
import time

"""
p_spark : 스파크세션
p_viewname : 뷰테이블이름
p_filepath : 파일경로
p_config : app config(hdfs url 등..)

"""

def getData(p_dataSource, **kwargs):

    s_topic = kwargs['data']['topic']
    s_fromConn = getConfig('','VOLTTRON')

    s_url = f"http://{s_fromConn['host']}:{s_fromConn['port']}/topicData"

    s_stream = False

    s_param = { "topic": s_topic }
    if 'offset' in kwargs.keys():
        s_param['offset'] = kwargs['offset']
    
        s_stream = True
        s_schId = kwargs['sch_id']
        s_meta = getConfig('','META_DB')
        s_conn = databaseService.connectRDBMS(s_meta['type'],s_meta['host'],s_meta['port'],s_meta['id'],s_meta['passwd'],s_meta['db'])
        s_logId = s_conn.execute(f"SELECT IFNULL(MAX(LOG_ID),0) AS LOG_ID FROM WK_SCH_LOG WHERE SCH_ID={s_schId}").fetchall()[0][0]
                
    try:
        response = requests.post(s_url, json=s_param)
        # 최신걸로만 가져오든 아님 전체 다 합쳐서 가져오든 해서 수정할 것 
        if response.json()['rows'] == []:
            raise Exception('데이터가 없습니다')
        
        idx = len(response.json()['rows']) - 1 

        if idx < 0 :
            idx = 0

        s_df = pd.DataFrame(response.json()['rows'][idx]['value'])

        if s_stream:
            s_now = time.strftime('%Y-%m-%d %H:%M:%S')
            s_query = 'INSERT INTO WK_SCH_LOG (SCH_ID, LOG_ID, LOG_STATUS, ST_DT, ED_DT, ERROR_MSG, ANALYTIC_RESULT) VALUES (%s, %s, %s, %s, %s, %s, %s)'
            s_conn.execute(s_query, (s_schId, s_logId + 1, 40, s_now, s_now, '', f'{len(s_df)}건'))
        return s_df
    except Exception as e:
        s_query = 'INSERT INTO WK_SCH_LOG (SCH_ID, LOG_ID, LOG_STATUS, ST_DT, ED_DT, ERROR_MSG, ANALYTIC_RESULT) VALUES (%s, %s, %s, %s, %s, %s, %s)'
        s_conn.execute(s_query, (s_schId, s_logId + 1, 99, s_now, s_now, '수집 중 오류가 발생했습니다', ''))
        return e

def installSubAgent(local_path, remote_path, user, host):
    cmd = f"scp {local_path} {user}@{host}:{remote_path}"
    subprocess.run(cmd, shell=True)

def get_volttron_agents():
    volttron_config = getConfig('','VOLTTRON')
    key_path = volttron_config['key']
    user = volttron_config['user']
    host = volttron_config['host']
    cmd = f"ssh -i {key_path} {user}@{host} 'vctl list'"
    output = subprocess.check_output(cmd, shell=True).decode()
    return output

def run_workflow():
    return True