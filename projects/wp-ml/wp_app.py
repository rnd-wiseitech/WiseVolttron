# -*- coding: utf-8 -*-

import asyncio
import signal
import json
import sys as sys
import os
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime, timedelta
# import backup.util.common as common
from flask import Flask, session, request,jsonify,send_file

from urllib import parse
from serviceData import dataService, dataSourceService
from servicePreprocess.preprocessService import WpPreprocessService

import re
import multiprocessing
from job.executor2 import background_execute

from config.wp import JOB_LOCATION_ATT, getConfig ,setWiseDefaultStorage, getWiseDefaultStorage
import time
from job.executor import JobExecutor, run_job
from database.manager import WpDataBaseManagement
import subprocess

import gc
import argparse
from route.storageRouter import WiseStorageRouter
import subprocess
import psutil
import pytz

app = Flask(__name__)
o_secret_key = 'wise1012!@'
app.secret_key = o_secret_key
o_dataSource:dataSourceService.dataSource = None
o_apiType = ''
o_storageInfo = getWiseDefaultStorage()
sys.path.append(os.getcwd())

formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler = TimedRotatingFileHandler('./log/wp-pyspark-api.log', when='midnight',interval=1, backupCount=10)
    
handler.suffix = '_%Y%m%d'
handler.setFormatter(formatter)
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)
class pyService():
    @app.route('/KillJob', methods=['POST'], defaults={'action':''})
    def KillJob(action):
        # 시작 시간.
        s_start = time.time() 
         # 요청 파라미터.
        # s_params = json.loads(request.get_data(), encoding='utf-8') # python==3.7.6
        s_params = json.loads(request.get_data(as_text=True)) # python==3.10.9
        s_jobId = s_params['jobId']
        s_schId = s_params['schId']
        s_logId = s_params['logId']
        o_dbMng = WpDataBaseManagement('meta')

        s_time = datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S")

        s_query = f"""
                UPDATE JOB_MSTR
                SET STATUS = '99', END_DT = '{s_time}'
                WHERE ID = '{s_jobId}' AND SCH_ID = '{s_schId}' AND LOG_ID ='{s_logId}'
            """
        s_result = o_dbMng.o_conn.execute(s_query)

        s_query = f"""
                UPDATE JOB_SUB_MSTR
                SET STATUS = '99', ERROR_MSG = 'process kill by user', END_DT = '{s_time}'
                WHERE ID = '{s_jobId}' AND SCH_ID = '{s_schId}' AND LOG_ID ='{s_logId}'
                AND STATUS != '40'
            """
        s_result = o_dbMng.o_conn.execute(s_query)

        try :

            if s_params['processId']  != None :
                os.kill(int(s_params['processId']), signal.SIGTERM)
        except Exception as e :
            print(e)
        
        s_json = {}
        s_json['responsecode'] = 200
        
        s_json['duration'] = round(time.time() - s_start, 2)
        # s_json = json.loads(s_json)
        
        return s_json
    
    @app.route('/schedule', methods=['POST'])
    def schedule():
        # 시작 시간.
        s_start = time.time() 
        s_storageType = getConfig('','STORAGE_TYPE')
        s_params = json.loads(request.get_data())
        s_userno = s_params['userno']
        s_data = s_params['data']
        s_schParam = s_data['param']
        
        # COMMON - HDFS
        if s_storageType == 'HDFS':
            s_rootpath = f'/py_result/'
            # 로컬있는지 확인
            s_dbMng = WpDataBaseManagement('meta')
            s_dsMstr = s_dbMng.select('DS_MSTR', f" WHERE TYPE='local' AND DEL_YN='N'")
            if s_dsMstr['DEFAULT_PATH'][0] != None:
                s_rootpath = s_dsMstr['DEFAULT_PATH'][0] 
            # 폴더 생성
            print("mkdir : ", f'{s_rootpath}{s_userno}/workflow')
            os.makedirs(f'{s_rootpath}{s_userno}/workflow', exist_ok=True)
            # 파일이름
            s_filename = s_data['filepath'].split('/')[-1]
            s_execPath = f'{s_rootpath}{s_userno}/workflow/{s_filename}'
            # 하둡에서 파일을 로컬에 복사
            o_dataSource.o_storageManager.downloadToLocal(s_data['filepath'], s_execPath)
            
        # COMMON - LOCAL
        else:
            s_execPath = s_data['filepath']
            
        
        # 파일 실행
        s_batchResult = subprocess.Popen(['python', s_execPath, s_schParam], stderr=subprocess.PIPE, stdout=subprocess.PIPE)
        stdout, stderr = s_batchResult.communicate()
        # 에러 날 경우
        if s_batchResult.returncode != 0:
            stderr_str = stderr.decode("utf-8", errors="ignore")
            lines = stderr_str.strip().split("\n")
            last_idx = max((i for i, line in enumerate(lines) if 'wp-ml' in line), default=None)
            if last_idx is not None:
                important_lines = lines[last_idx:]
                core_message = "\n".join(important_lines)
            else:
                # 못 찾으면 전체 stderr 출력
                error_lines = [l for l in lines if "Exception" in l or "Error" in l or "Traceback" in l]
                core_message = "\n".join(error_lines)

            s_workflowName='None'
            try:
                s_workflowName = s_data['filepath'].split('/')[-1]
            except:
                pass
            # 핵심 에러로 raise
            raise Exception(s_workflowName +":" + core_message)
            
        s_result = {}
        s_result['responsecode'] = 200
        s_result['duration'] = round(time.time() - s_start, 2)
        
        return s_result
    
    @app.route('/job2', methods=['POST'], defaults={'action':''})
    def job2(action):
        # 시작 시간.
        s_start = time.time() 
         # 요청 파라미터.
        # s_params = json.loads(request.get_data(), encoding='utf-8') # python==3.7.6
        s_params = json.loads(request.get_data(as_text=True)) # python==3.10.9

        
        # api 타입 (SPARK / COMMON)
        s_apieType = o_apiType

        s_jobList = []

        # 모드 추가. 워크플로우에서 중간실행 필요
        s_mode = s_params.get('mode', None)

        #s_jobList = execute_pipeline(s_jobList)        
        asyncio.run(background_execute({"userNo":s_params['jobParam'][0]['userno'],"storageInfo":o_storageInfo,"apiType":s_apieType,"jobId":s_params['jobId'], "mode": s_mode},s_params['jobParam']))
        # asyncio.run(background_execute({"userNo":o_userNo,"storageInfo":o_storageInfo,"apiType":s_apieType,"jobId":s_params['jobId'], "mode": s_mode},s_params['jobParam']))
        # job 실행
        s_json = {}
        s_stageList = []

        s_json['responsecode'] = 200
        s_json['joblist'] = s_jobList
        s_json['stagelist'] = s_stageList
        
        s_json['duration'] = round(time.time() - s_start, 2)
        s_json = json.dumps(s_json, default=str)
        s_json = json.loads(s_json)        
        
        return s_json
    
    @app.route('/job/<action>', methods=['POST'])
    @app.route('/job', methods=['POST'], defaults={'action':''})
    def job(action):
        # 시작 시간.
        s_start = time.time() 
         # 요청 파라미터.
        s_params = json.loads(request.get_data()) # python==3.7.6
        # s_params = json.loads(request.get_data(as_text=True)) # python==3.10.9

        # 배치
        s_params['batch'] = s_params.get('batch', False)
        
        # api 타입 (SPARK / COMMON)
        s_apieType = o_apiType
        
        # 함수(실행파일명) 설정
        s_func = s_params['action']
        global o_dataSource
        # 만료된 캐시 삭제 (메모리해소)
        o_dataSource.dataset.expire()
        # ['correlation', 'output', 'transform', 'statistics'] 인 경우에는 usetable로 데이터 읽음.
        if s_params['action'] in ['correlation', 'output', 'transform', 'statistics', 'model-train', 'model-predict', 'model-process', 'model-transfer', 'chart', 'eda']:
            s_params['df'] = o_dataSource.getDataSet2(s_params['data']['usetable'])

        # transform인 경우에는 method를 함수(실행파일명) 설정
        if s_params['action'] == 'transform' :
            s_func = s_params['method']
        
        # 자식 프로세스에서 리턴값을 가져오기 위해 Manager를 사용
       
        # job 세팅
        try:
            o_jobExcuter = JobExecutor(s_apieType, s_func, o_dataSource)
        except Exception as e:
            print(e)
        # job 실행
        s_json = o_jobExcuter.execute(**s_params)
        s_jobList = []
        s_stageList = []

        s_json['responsecode'] = 200
        s_json['joblist'] = s_jobList
        s_json['stagelist'] = s_stageList
        
        s_json['duration'] = round(time.time() - s_start, 2)
        s_json = json.dumps(s_json, default=str)
        s_json = json.loads(s_json)
        # workflow나 schedule 때만 job_sub_status update
        if s_params['location'] in ['workflow', 'schedule']:
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.updateJobStatus(s_params['groupId'], s_params['jobId'], 40, None, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"))
        
        return s_json

    @app.route('/Run_WkUnModel', methods=['POST'])
    def Run_WkUnModel():
        s_reqData = json.loads(request.get_data())
        print("s_reqData : \n", s_reqData)

        s_analyticType = s_reqData['AnalyticType']
        s_poseAnalyticType = s_reqData['PoseAnalyticType']
        s_fileInfo = s_reqData['fileName']
        s_labelData = s_reqData['LabelData']
        s_argParam = s_reqData['ArgorithmParam']
        s_layerProps = json.dumps(s_argParam['layerInfos'])
        s_partitionInfo = s_reqData['PartitionInfo']
        s_augmentInfo = s_reqData.get('AugmentInfo', None)
        # 텍스트 분석은 전처리 실행 후 모델 실행 
        if s_analyticType == 'TEXT-ANALYTIC':
            from serviceText import tokenizerService 
            s_uuid = s_labelData['uuid']
            s_preResult, s_df = output, df = tokenizerService.getTextPreProcess(s_labelData['fileType'], 
                                                                             s_uuid,
                                                                             s_labelData['Infos'],
                                                                             s_fileInfo['USER_NO'], 
                                                                             s_labelData['dictionary'], 
                                                                             s_labelData['bert_use'])
            s_preResult = json.loads(s_preResult)
            s_augInfo = {
                "embedding_input": s_preResult['NOUN_CNT'],
                "max_len": s_preResult['MAX_LEN'],
                "nb_class": s_preResult['NB_CLASS'],
                "bert_use": s_preResult['BERT'],
                "lang": s_preResult['LANG']
            }
            s_augmentInfo = s_augInfo
            s_targetParam = {
                "USER_NO": s_fileInfo['USER_NO'],
                "fileName": 'txtLabelResult/' + s_uuid + '/' + s_uuid + '_data.csv'
            }
            o_dataSource.setDataSet(s_targetParam, s_df)
            
        # epochDataSet 초기화 (다시 레이어ui로 돌아가서 모델을 돌릴 경우 )
        s_epoch = 1
        while s_epoch != (int(s_argParam['epochs']) + 1):
            o_dataSource.clearEpochDataSet(s_fileInfo, s_labelData['uuid'], s_epoch)
            s_epoch += 1
            
        from serviceUnmodel import unmodelService
        
        # 모델 실행
        s_output = unmodelService.runUnmodel(s_labelData, s_argParam, s_layerProps, s_fileInfo, s_partitionInfo, s_augmentInfo, o_dataSource, s_analyticType, s_poseAnalyticType, {})
        
        s_result = '{"reVal": ' + s_output + '}'
        return s_result

# 모델 관리에서 스케쥴에 맞게 저장된 모델을 실행
    @app.route('/BackGround_Worker', methods=['POST'])
    def BackGround_Worker():

        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_varInfo = json.loads(s_reqData['parameter'])
        if type(s_varInfo) == str:
            s_varInfo = json.loads(s_varInfo)

        s_fileInfo = json.loads(s_reqData['fileName'])
        s_modelType = s_reqData['modelType']
        s_uuid = s_reqData['uuid']
        s_argInfo = json.loads(s_reqData['argNm'])

        s_start = time.time()

        s_schParam = [s_modelType, s_uuid, s_argInfo, s_varInfo, s_fileInfo]
        s_modelId = s_reqData['modelId']
        s_userNo = s_fileInfo['USER_NO']
        s_execPath = f'py_result/{s_userNo}/workflow/{s_modelId}.py'
        
        # 파일 실행
        s_batchResult = subprocess.Popen(['python', s_execPath],stderr=subprocess.PIPE,stdout=subprocess.PIPE)
        
        s_batchResult.wait()
        out, err = s_batchResult.communicate()
        # 에러 날 경우
        if s_batchResult.returncode != 0:
            err = str(err, encoding='cp949').split("\r\n")
            raise Exception(err[len(err)-2])
            
        s_result = {
            'reVal' : {
                'taskId' : s_batchResult.pid
            }
        }
        s_result['responsecode'] = 200
        s_result['duration'] = round(time.time() - s_start, 2)


        return s_result

    @app.route('/getMlflowModelList', methods=['POST'])
    def getMlflowModel():
        '''
        MLFLOW에 등록되어 있는 모델 리스트 반환
        '''
        s_reqData = json.loads(request.get_data())
        s_result = mlflowService.getMlflowModelList(s_reqData['USER_NO'])
        return json.dumps(s_result)
    
    @app.route('/getMlflowModelInfo', methods=['POST'])
    def getMlflowModelInfo():
        '''
        MLFLOW에 등록되어 있는 모델 리스트 반환
        '''
        s_reqData = json.loads(request.get_data())
        s_result = mlflowService.getMlflowModelInfo(s_reqData['runid'])
        return json.dumps(s_result)
    
    @app.route('/setModelTag', methods=['POST'])
    def setModelTag():
        '''
        실행한 모델 기록에 정보 추가( 모델 저장시 MODEL_ID와 MODEL_IDX 추가) 
        '''
        s_reqData = json.loads(request.get_data())
        s_action = s_reqData.get('action', None) # action: 'add', 'remove'
        s_experimentName = s_reqData.get('experimentName', 'prophet') # experimentName: 'prophet', 'platform'
        s_runName = s_reqData.get('runName', None)
        # add 할 때에는 s_tagData 가 {key:value}, remove할때에는 string Arr
        s_tagData = s_reqData.get('tagData', None)
        s_result = { 'isSuccess': True, 'result':{'msg': ''}}
        try:
            if s_action == 'add':
                mlflowService.addModelTag(s_runName, s_tagData, s_experimentName)
            if s_action == 'remove':
                mlflowService.removeModelTag(s_runName, s_tagData, s_experimentName)

        except Exception as e:
            s_result = { 'isSuccess': True, 'result': {'msg':'mlflow 모델 설정에 실패하였습니다.'}}

        return json.dumps(s_result)
    

    @app.before_request
    def make_session_permanent():
        session.permanent = True
        app.permanent_session_lifetime = timedelta(minutes=120)
        
    @app.before_request
    def log_request_info():
        upload = request.headers.get('upload', None)
        userno = None
        action = None
        method = None
        if upload != 'true':
            try:
                # request로 온 데이터 읽기
                param = json.loads(request.get_data() or "{}")  # 빈 데이터일 경우 "{}"로 기본값 설정
            except json.JSONDecodeError:
                # JSON 디코딩 실패해서 오류 나면 빈 딕셔너리로 설정
                param = {}
            action = param.get('action', None)
            method = param.get('method', None)
            userno = param.get('userno', None)
        

        logging.info(f'request ip: {request.remote_addr}    url: {request.path}    userno: {userno}    action: {action}    method: {method}')

        if action != None:
            logging.info('parameter: %s', param)

    @app.errorhandler(Exception)
    def unhandled_exception(e):
        
        code = 600

        exc_type, exc_obj, exc_tb = sys.exc_info()
        
        fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
        # print("=================================Track Exception==================================")
        # print(exc_type, fname, exc_tb.tb_lineno)
        # print("==================================================================================")
        # print("Error.",e)
        if exc_type is KeyError : 
            code = 601
        elif str(e).find("one-column") > -1 :
            code = 602
        elif str(e).find("Install xlrd") > -1 :
            code = 603

        # logging.exception('Unhandled Exception: %s', (e))
        #app.logger.error('Unhandled Exception: %s', (e))
        # job error 났을 경우
        try:
            #s_params = json.loads(request.get_data()) # python==3.7.6
            s_params = json.loads(request.get_data(as_text=True)) # python==3.10.9
        except json.JSONDecodeError:
            s_params = {}

        if s_params.get('groupId'):
            try:
                error = str(e.java_exception)
                if 'cancelled' in error and 'hive' in error:
                    code = 621
            except:
                s_str_e = str(e)
                if 'given input columns' in s_str_e:
                    s_str_e = s_str_e.split(';')[0]
                    code = 622  
                if 'The column number of the existing table' in s_str_e:
                    code = 623 
                error = str(type(e)) + " : " +  s_str_e
                    
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.updateJobStatus(s_params['groupId'], s_params['jobId'], 99, error, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"))
            logging.error(f'request ip: {request.remote_addr},  url : {request.path}, action: {s_params.get("action")},  error : {error}' )
            return jsonify({'message': error, 'responsecode': code}), getattr(e, 'code', code)
        else:
            error = str(type(e)) + " : " +  str(e)
            logging.error(f'request ip: {request.remote_addr},  url : {request.path},  error : {error}' )

            return jsonify({'message': error, 'responsecode': code}), getattr(e, 'code', code)
        
if __name__ == "__main__":
       # ArgumentParser 객체 생성
    parser = argparse.ArgumentParser(description="명령줄 인수 예제")

    # 인수 정의 및 변수명 지정
    parser.add_argument('--userNo', type=int, required=True, help="사용자 NO")
    parser.add_argument('--dsId', type=int, required=True, help="저장소연결정보ID")
    parser.add_argument('--sparkUse', default=False, type=bool, help="SPARK사용유무")
    parser.add_argument('--mlflowUse', default=True, type=bool, help="SPARK사용유무")
    
    # 인수 파싱
    s_args = parser.parse_args()

    o_userNo = s_args.userNo
    s_dsId = s_args.dsId
    o_apiType = 'COMMON'

    setWiseDefaultStorage(s_dsId)
    from database.manager import WpDataBaseManagement
    o_dbMng = WpDataBaseManagement('meta')
    s_dsMstr = o_dbMng.select('DS_MSTR', f" WHERE DS_ID={s_dsId}")
    o_storageInfo = getWiseDefaultStorage()
    from serviceMlflow import mlflowService
    mlflowService.init()
    if getConfig('','API_TYPE') == 'SPARK':
        o_apiType = 'SPARK'

    o_dataSource = dataSourceService.dataSource(o_userNo,None,o_storageInfo['type'],o_apiType,o_storageInfo)
    app.register_blueprint(WiseStorageRouter(o_secret_key,o_dataSource))
    app.run(host='0.0.0.0', port=1337, threaded=True, use_reloader=False)
