# -*- coding: utf-8 -*-

import asyncio
import signal
import numpy as np
import pandas as pd
import json
import sys as sys
import concurrent.futures
import os
import io
import logging
from logging.handlers import TimedRotatingFileHandler
from datetime import datetime, timedelta
# import backup.util.common as common
from flask import Flask, session, request,jsonify,send_file
import base64
import traceback
from urllib import parse
from serviceData import dataService, dataSourceService
from servicePreprocess.preprocessService import WpPreprocessService

from serviceFeature import featureService
from serviceCommon import commonService, fileService
from serviceModel import genCodeService
import re
import multiprocessing
from multiprocessing import   Queue
from random import random 
from job.executor2 import background_execute
import random
import string
from multiprocessing import Process

# # WPLAT-210 python 업로드
# from flask_cors import CORS
# CORS(app, resources={r'*': {'origins': 'http://localhost:4200'}})
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
# from serviceStorage.sparkService import sparkStorage
# # 2020.03.24 추가 텐서플로우가 버전이 1일 경우 예외처리 필요.
# import tensorflow as tf
# gpus = tf.config.experimental.list_physical_devices('GPU')
# if not len(gpus) == 0 :
#     tf.config.experimental.set_memory_growth(gpus[0], True)


#tf.enable_eager_execution()
#tf.compat.v1.disable_eager_execution()

app = Flask(__name__)
o_secret_key = 'wise1012!@'
app.secret_key = o_secret_key
o_dataSource:dataSourceService.dataSource = None
o_apiType = ''
o_storageInfo = getWiseDefaultStorage()
# 각 폴더에서 import 가능하도록 추가함
sys.path.append(os.getcwd())
# pool = multiprocessing.Pool()

# from serviceStorage import common

# ========= Storage 예제!!!! ==================
# s_webHdfs = common.WiseStorageManager(1000,getConfig('','STORAGE_TYPE'))
# temp = s_webHdfs.readFile('/1000/BostonHousing.parquet','parquet')
# print(temp)
# aaa = s_webHdfs.writeFile('/1000/BostonHousing.parquet',temp,'parquet')
# s_webHdfs.createDirs('/test1')
# print('============================')
# print(aaa)
# print('============================')

# a = s_webHdfs.createBuffer('/10815247 석영자053.dcm.png')
# print(a.read())


formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
handler = TimedRotatingFileHandler(
     './log/wp-pyspark-api.log', when='midnight',interval=1, backupCount=10)
    #'/home/wp-platform/data/logs/wp-pyspark-api/wp-pyspark-api.log', when='midnight',interval=1, backupCount=5)
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
    @app.route("/getResourceUsage", methods=['GET'])
    def getResourceUsage():
        current_process = psutil.Process(os.getpid())
    
        # CPU 사용률 (interval 동안의 평균)
        #   interval=1로 주면 이 함수가 1초 동안 CPU 사용률을 직접 측정하고 반환합니다.
        cpu_usage = current_process.cpu_percent(interval=1)
        
        # 메모리 사용률 (일시 측정)
        memory_usage = current_process.memory_percent()

        return f'spark_info{{aversion="3.0.1", revision="2b147c4cd50da32fe2b4167f97c8142102a0510d"}} 1.0\nmetrics_executor_memoryUsed_bytes{{application_id=\"{o_apiType}\", application_name=\"\", executor_id=\"driver\"}} {memory_usage}\n'
    # @app.route('/job/<type>', methods=['POST']) # table/query
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
            # raise Exception(stderr.decode("utf-8"))
            stderr_str = stderr.decode("utf-8", errors="ignore")
            lines = stderr_str.strip().split("\n")
            last_idx = max((i for i, line in enumerate(lines) if 'wp-ml' in line), default=None)
            if last_idx is not None:
                # 마지막으로 나온 'C:/prophet' 줄부터 끝까지 가져오기
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

            # 언어 모델일 경우 프롬프트 정보 추가
            # if s_params['action'] == 'model-train':
            #     s_argId = json.loads(s_params['data']['parameter'])['algorithmInfo']['parameter'][0]['ARG_ID']
            #     if s_argId == 107:
            #         s_params['prompt'] = o_dataSource.getPromptData()

        # transform인 경우에는 method를 함수(실행파일명) 설정
        if s_params['action'] == 'transform' :
            s_func = s_params['method']
        
        # 자식 프로세스에서 리턴값을 가져오기 위해 Manager를 사용
        # manager = multiprocessing.Manager()
        # return_dict = manager.dict()
        # print(round(time.time() - s_start, 2),'매니저 선언 시간===============================')
        # # 자식 프로세스 생성
        # s_start1 = time.time() 
        # process = multiprocessing.Process(
        #     target=run_job,
        #     args=(s_apieType, s_func, o_dataSource, s_params,return_dict)
        # )

        # # 자식 프로세스 실행
        # process.start()
        
        # print(round(time.time() - s_start1, 2),'실행 시간===============================')
        # # 메인 프로세스에서 새로 만든 프로세스의 PID 확인
        # print(f"[Main] 자식 프로세스 생성 완료. Process 객체의 PID: {process.pid}")
        
        # # 자식 프로세스가 끝날 때까지 대기
        # process.join()
        
        # # 자식 프로세스가 넘긴 정보 확인 (실제 OS PID)
        # s_json = return_dict["s_json"]
        
        # o_dataSource = return_dict["o_dataSource"]
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

    @app.route('/getEpochData', methods=['POST'])
    def getEpochData():
        s_reqData = json.loads(request.get_data())
        s_uuid = s_reqData['uuid']
        s_epochs = s_reqData['epochs']
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_output =  json.dumps(o_dataSource.getEpochDataSet(s_fileInfo, s_uuid, s_epochs), cls=commonService.JsonEncoder)
        s_result = '{"reVal": ' + s_output + '}'
        return s_result

    @app.route('/Run_UnStructuredModel', methods=['POST'])
    def Run_UnStructuredModel():
        s_reqData = json.loads(request.get_data())
        print("s_reqData : \n", s_reqData)

        s_analyticType = json.loads(s_reqData['AnalyticType'])
        s_poseAnalyticType = json.loads(s_reqData['PoseAnalyticType'])
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_labelData = json.loads(s_reqData['LabelData'])
        s_argParam = json.loads(s_reqData['ArgorithmParam'])
        s_layerProps = s_reqData['LayerProperties']
        s_partitionInfo = json.loads(s_reqData['PartitionInfo'])
        s_augmentInfo = json.loads(s_reqData['AugmentInfo'])
        s_retrainInfo = json.loads(s_reqData['RetrainInfo']) # 언어모델 재학습 정보. [모델관리] ARG_ID==107이 아닐 경우 {}

        # epochDataSet 초기화 (다시 레이어ui로 돌아가서 모델을 돌릴 경우 )
        s_epoch = 1
        while s_epoch != (int(s_argParam['epochs']) + 1):
            o_dataSource.clearEpochDataSet(s_fileInfo, s_labelData['uuid'], s_epoch)
            s_epoch += 1
            
        from serviceUnmodel import unmodelService
        
        # 모델 실행
        s_output = unmodelService.runUnmodel(s_labelData, s_argParam, s_layerProps, s_fileInfo, s_partitionInfo, s_augmentInfo, o_dataSource, s_analyticType, s_poseAnalyticType, s_retrainInfo)
        
        s_result = '{"reVal": ' + s_output + '}'
        return s_result
    
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

    # 모델 관리에서 모델 실행
    @app.route('/Model_Test_Run', methods=['POST'])
    def Model_Test_Run():
        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_argInfo = json.loads(s_reqData['argNm'])
        s_modelType = s_reqData['modelType']
        s_uuid = s_reqData['uuid']
        s_varInfo = json.loads(s_reqData['parameter'])
        if type(s_varInfo) == str:
            s_varInfo = json.loads(s_varInfo)

        # 저장된 데이터 정재 불러오기(돋보기만 처리함)
        s_editInfo = json.loads(s_reqData['cleanInfo'])
        
        # 업로드타입
        s_uploadType = s_fileInfo['fileType']

        # 데이터 불러오기
        s_df = dataService.readNewData(s_uploadType, s_fileInfo)
        
        s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')
        # 저장된 정재정보로 신규데이터 전처리 시작
        s_userPreprocessingFile = s_fileInfo['userPreprocessing']
        s_df = s_preProcess.loadUserPreprocessing(s_df, s_fileInfo['USER_NO'], s_userPreprocessingFile)

        s_df, s_output = s_preProcess.loadEditData(s_df, s_editInfo)

        # 모델 시작
        from serviceModel import managementService
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as exe:
            s_modelExe = exe.submit(
                managementService.runModel, s_df, s_modelType, s_uuid, s_argInfo, s_varInfo, s_fileInfo)
            s_output = s_modelExe.result()


        s_result = '{"reVal": ' + s_output + '}'
        return s_result

# 모델 분석에서 알고리즘을 실행
    @app.route('/Run_Model', methods=['POST'])
    def Run_Model():
        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_function = s_reqData['functionName']

        # 모델 정보
        s_params = json.dumps(s_reqData['parameter'])
        
        # 데이터 불러오기(카테고리변환완료한데이터)
        from serviceModel import modelService
        if s_reqData['parameter']['algorithmInfo']['algorithm']['ARG_TYPE'] == 'Recommend':
            s_df = o_dataSource.getDataSet(s_fileInfo)
        else:
            s_df = o_dataSource.getScaleDataSet(s_fileInfo)
        
        s_scaler = o_dataSource.getUseScale(s_fileInfo)
        # 모델 실행
        s_output = modelService.runModel(s_df, s_fileInfo, s_function, s_params, o_dataSource)
        
        gc.collect()
        s_result = '{"reVal": ' + s_output + ',"argId": "' + str(s_reqData['argId']) + '"}'
        return s_result

    @app.route('/Run_Text_Generation', methods=['POST'])
    def Run_Text_Generation():
        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_argNm = s_reqData['argNm']
        s_inputText = s_reqData['inputText']
        s_poseAnalType = s_reqData['analType']

        # 모델 실행
        from serviceUnmodel import unmodelService
        s_output = unmodelService.runUnmodel(s_reqData, {}, '', s_fileInfo, '', '', s_inputText, s_argNm, s_poseAnalType, {})

        s_result = '{"reVal": ' + s_output + '}'
        return s_result

    # GPT API
    @app.route('/API_Text_Gen', methods=['POST'])
    def API_Text_Gen():
        '''
        *** How to use ***
            (1) V100 서버에서 모델 학습 및 저장
            (2) /app/.../1157/pkl(aws instance)에 저장된 모델을 C:/.../1157/pkl(local)에 내려 받음
            (3) 다음 s_reqData.uuid 값을 모델이름에 맞게 변경(DP_MODEL_MSTR의 MODEL_EVAL_RESULT 참고)

            (4) 호출 형식: {"inputText": "부서장명의 칼럼명을 추천해줘"}
            (5) 응답 형식: {"reVal": {"uuid": "4bffcfbe335b2f5dbf84a60438972a66", "ds_set": "부서장명의 칼럼명은 HDODP_NM이고 도메인은 명칭/내역(문자_60)입니다"}}

        *** How to test (호출 테스트) ***
            curl -X POST -d "{\"inputText\":\"부서장명의 칼럼명을 추천해줘\"}" http://localhost:1337/API_Text_Gen
        '''
        s_reqData = {
            'analType': 'gpt', # textgeneration.py에서 'gpt'/'llama' 분기 기준
            'uuid': '4bffcfbe335b2f5dbf84a60438972a66' # 모델이 저장된 폴더명. DP_MODEL_MSTR 테이블의 MODEL_EVAL_RESULT
        }
        s_fileInfo = {
            'USER_NO': 1157 # 경로이름
        }
        s_inputText = json.loads(request.get_data())['inputText'] # 사용자가 입력한 문장
        s_argNm = 'TEXT-GENERATION' # (변경 X) unmodelService.py 분기 기준
        s_poseAnalType = 'gpt' # textgeneration.py에서 'learn'이면 '모델학습', 그 외의 값이면 '모델관리'

        # 모델 실행
        from serviceUnmodel import unmodelService
        s_output = unmodelService.runUnmodel(s_reqData, {}, '', s_fileInfo, '', '', s_inputText, s_argNm, s_poseAnalType, {})

        s_result = '{"reVal": ' + s_output + '}'
        return s_result

    # 정형학습 모델 REST API
    @app.route('/analyze-structured', methods=['POST'])
    def Analyze_Structured():
        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_uuid = s_reqData['uuid']

        s_modelType = s_reqData['modelType']
        s_argInfo = json.loads(s_reqData['argNm'])
        s_varInfo = json.loads(s_reqData['parameter'])
        if type(s_varInfo) == str:
            s_varInfo = json.loads(s_varInfo)
        s_fileInfo = json.loads(s_reqData['fileName'])

        # 데이터 불러오기
        s_uploadType = s_fileInfo['fileType']
        s_df = dataService.readNewData(s_uploadType, s_fileInfo)

        # 모델 시작
        from serviceModel import managementService
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as exe:
            s_modelExe = exe.submit(
                managementService.runModel, s_df, s_modelType, s_uuid, s_argInfo, s_varInfo, s_fileInfo)
            s_output = s_modelExe.result()
        s_result = '{"reVal": ' + s_output + '}'
        return s_result

    @app.route('/runCheckAnswer', methods=['POST'])
    def RunCheckAnswer():
        s_time = time.time()

        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_userNo = s_reqData['USER_NO']
        s_question = s_reqData['question']
        s_inputAnswer = s_reqData['inputAnswer']

        from langchain.embeddings import HuggingFaceBgeEmbeddings
        from langchain.vectorstores import Chroma
        from langchain.llms import Ollama
        from langchain.chains import RetrievalQA

        # 한국어 임베딩 모델
        hf = HuggingFaceBgeEmbeddings(
            model_name="jhgan/ko-sbert-nli",
            model_kwargs={'device': 'cuda'},
            encode_kwargs={'normalize_embeddings': True}
        )

        # 벡터DB
        db = Chroma(persist_directory="serviceUnmodel/vectorDB/ko_history_db", embedding_function=hf)
        llm = Ollama(model='eeve', temperature=1)
        qa_chain = RetrievalQA.from_chain_type(llm, retriever=db.as_retriever(search_type='similarity'), return_source_documents=True, verbose=True)

        # 프롬프트 동적 할당 적용
        template = '넌 국사 퀴즈를 채점하고 있어. {question}라는 문제에 대한 정답이 {input_answer} 맞아?'
        formatted_prompt = template.format(question = s_question, input_answer = s_inputAnswer)
        qa = qa_chain(formatted_prompt)

        e_time = time.time()
        print(qa)

        s_output = {"reVal": qa['result'], "answerTime": round(e_time - s_time, 2)}
        s_result = '{"reVal": ' + json.dumps(s_output) + '}'

        return s_result

    @app.route('/CodeGen', methods=['POST'])
    def CodeGen():
        s_reqData = json.loads(request.get_data())
        s_userno = s_reqData['USER_NO']
        s_params = s_reqData['WP_MODEL']
        s_dataInfo = s_params["importData"]
        s_varInfo = s_params['varInfo']
        s_targetCol = s_params['targetCol']
        s_featureInfo = s_params['featureInfo']['featureList']
        s_partitionInfo = s_params['partitionInfo']
        s_scaleType = s_params['scaleInfo']
        s_argInfo = s_params['algorithmInfo']

        s_output = genCodeService.generator(s_dataInfo, s_varInfo, s_userno, s_targetCol, s_featureInfo, s_partitionInfo, s_scaleType, s_argInfo)
        s_result = '{"reVal":"' + str(base64.b64encode(s_output.encode('utf-8'))) + '"}'
        return s_result

    @app.route('/RemoveImg', methods=['POST'])
    def RemoveImg():
        s_reqData = json.loads(request.get_data())
        s_userno = s_reqData['USER_NO']
        s_uuid = s_reqData['UUID']

        s_output = fileService.deleteImgFile(s_userno, s_uuid)
        s_result = '{"reVal": ' + s_output + '}'
        return s_result
        
    @app.route('/GetImageInfo', methods=['POST'])
    def GetImageInfo():
        s_reqData = json.loads(request.get_data())
        s_userno = s_reqData['USER_NO']
        s_uuid = s_reqData['UUID']

        s_output = fileService.readImage(s_userno, s_uuid)
        s_result = '{"reVal": ' + s_output + '}'
        return s_result
# 데이터 탐색 - 기초통계 값 추출
    @app.route('/Statistics', methods=['POST'])
    def Statistics():
        # request 파라미터
        
        s_tableInfo = json.loads(request.get_data())
        # 업로드타입(HDFS, DS_VIEW, LOCAL)
        s_uploadType = s_tableInfo['uploadType']

        # 20210526 model-template 수정
        # model-template일 경우와 아닐 경우로 나눠서 dataset 저장
        # model-template에서의 호출이 아닐 경우 ('TEMPLATE_MODEL' 키가 있는지 없는지로 판단.)
     
        # model-template에서의 호출일 경우
        if s_tableInfo['reload'] :
            s_realUserNo = s_tableInfo['USER_NO']
            # 20210526 model-template 수정
            # 모든 사용자에게 공통으로 보여주는 모델(USER_NO = 1 / mstr@wise.co.kr / wise1012 계정으로 만들어진 데이터와 모델)도
            # 같이 보여줘야 하기 때문에 파일 경로를 모델을 등록한 REG_USER_NO 폴더로 타도록
            # real_user_no에 기존 번호를 저장하고 USER_NO값을 REG_USER_NO로 저장한다.(파일 찾을때 USER_NO로 찾기 때문) 
          

            s_filePath = s_tableInfo['path']

            s_filename, s_fileExtension = os.path.splitext(s_filePath)
            s_fileExtension = s_fileExtension.lower()
            if s_fileExtension in ['.csv', '.txt']:
                # 구분자/인코딩 얻기,  s_colums : 배치에서 input데이터 변경할 경우 컬럼비교에 사용
                s_df = o_dataSource.o_storageManager.readFile(s_filePath, p_option='csv', p_encType="utf8", p_sep=",", p_fullPath=False)

            # parquet
            elif s_fileExtension == '.parquet':
                s_df = o_dataSource.o_storageManager.readFile(s_filePath,'parquet',p_fullPath=False)
            # excel (local만 되어있음.)
            else:
                s_df = o_dataSource.o_storageManager.readFile(s_filePath,'xlsx')
            # s_df = dataService.readNewData(s_uploadType, s_tableInfo)
            # 다시 원상복구
            s_tableInfo['USER_NO'] = s_realUserNo
        else :
            s_df = o_dataSource.getBackupDataSet(s_tableInfo)
        
        s_preProcess = WpPreprocessService(s_tableInfo['USER_NO'],s_tableInfo['processUuid'])
        
        import time
        start = time.time()
        # 실제 데이터탐색 로직
        s_output, s_df = s_preProcess.getDataPreProcess(s_df,JOB_LOCATION_ATT.WISEPROPHET,o_dataSource)
        end = time.time()

        print(end - start)
        # 데이터셋 저장
        # SPARK 일때는 toPanda로
        if getConfig('','API_TYPE') == 'SPARK':
            s_df = s_df.toPandas()
        o_dataSource.setDataSet(s_tableInfo, s_df)
        
        # sample data
        s_sampleDf, s_sampleHeader = s_preProcess.getSampleData(s_df)
        del s_df
        
        s_output['sampleData'] = s_sampleDf
        s_output['sampleHeader'] = s_sampleHeader
        
        s_output = json.dumps(s_output, default=str)

        s_result = '{"reVal": ' + s_output + '}'
        print("/Statistics s_result : ", s_result)
        return s_result

# 데이터 탐색 - 상관관계 추출
    @app.route('/Correlation', methods=['POST'])
    def Correlation():

        s_tableInfo = json.loads(request.get_data())
        
        # 데이터 불러오기
        s_df = o_dataSource.getDataSet(s_tableInfo)

        # 범주형타겟인지 체크, 옵션 설정
        if 'categoryOption' in s_tableInfo.keys() :
            s_cateFlag = True
            s_cateOption = json.loads(s_tableInfo['categoryOption'])
        else :
            s_cateFlag = False
            s_cateOption = {}
        
        # 상관관계 실행
        from serviceCorrelation import correlationService
        s_result = correlationService.getCorrelation(s_cateFlag, s_df, s_cateOption)

        return s_result

# 컬럼 변경 함수
    @app.route('/ChangeColInfo', methods=['POST'])
    def ChangeColInfo():
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])

        try:
            # 데이터 불러오기
            s_df = o_dataSource.getDataSet(s_fileInfo)

            # 데이터 타입이나 전처리를 할때 최초데이터를 백업해둠
            if len(o_dataSource.getBackupDataSet(s_fileInfo)) < 1 :
                o_dataSource.setBackupDataSet(s_fileInfo, s_df.copy())
                
            s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')

            # 데이터 전처리(컬럼타입변환 or 돋보기 처리)
            s_output, s_df = s_preProcess.editData(s_df, s_reqData['Type'], s_reqData['Column'], s_reqData['ColumnType'], s_reqData['Value'])
            

            # 돋보기 처리면 통계량 다시 계산
            if s_reqData['Type'] != 'ChgType':          
                s_output, s_df = s_preProcess.getDataPreProcess(s_df,JOB_LOCATION_ATT.WISEPROPHET,o_dataSource)
                s_sampleDf, s_sampleHeader = s_preProcess.getSampleData(s_df)
                s_output['sampleData'] = s_sampleDf
                s_output['sampleHeader'] = s_sampleHeader
     
            s_output = json.dumps(s_output, default=str)

            # 변환한 데이터로 다시 저장
            o_dataSource.setDataSet(s_fileInfo, s_df)

        except Exception as e:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            # return Exception        
            raise Exception("ChangeColInfo 중 오류 발생")

        s_result = '{"reVal": ' + s_output + '}'

        return s_result

    #167 공백 문자 결측값으로 처리. 
    @app.route('/ChangeWhitespace', methods=['POST'])
    def ChangeWhitespace():
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])
        try:
            s_df = o_dataSource.getDataSet(s_fileInfo)

            # 참고: 애초에 dp.changeDataType()에서 dataType == 'numerical'일 경우에만 @(/ChangeWhitespace)를 탈 수 있으므로 여기서 to_numeric 함수를 써도 무방.
            s_df[s_reqData['Column']] = pd.to_numeric(s_df[s_reqData['Column']].str.strip()) # 이거 한 줄 추가. 그 외 ChangeColInfo()와 같음.
            
            s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')

            s_df = s_preProcess.editData(s_df, s_reqData['Type'],s_reqData['Column'],s_reqData['ColumnType'], s_reqData['Value'])
            if s_reqData['Type'] == 'ChgType':
                s_output = s_preProcess.changeTypeData(s_df, s_reqData['Column'], s_reqData['Value'])
                s_output = json.dumps(s_output)
            else:
                s_dfStat, s_df = s_preProcess.getDataPreProcess(s_df,JOB_LOCATION_ATT.WISEPROPHET,o_dataSource)
                s_output = s_dfStat.to_json(orient='columns')
                if s_fileInfo['fileType'] == 'LOCAL':
                    s_sampleDf, s_sampleHeader = s_preProcess.getSampleData(s_df)
                    s_output['sampleData'] = s_sampleDf
                    s_output['sampleHeader'] = s_sampleHeader
                    s_output = json.dumps(s_output)

                o_dataSource.setDataSet(s_fileInfo, s_df)

        except Exception as e:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            raise Exception("ChangeWhitespace 중 오류 발생")

        s_result = '{"reVal": ' + s_output + '}'
        return s_result


# 피처변수 - 피쳐  변수 추출
    @app.route('/FeatureImportance', methods=['POST'])
    def feature_importance():
        # 파라미터
        s_reqData = json.loads(request.get_data())

        # 데이터 불러오기 (여기서는 copy를 함)
        s_df = o_dataSource.getDataSet(json.loads(s_reqData['fileName'])).copy()

        # 실제 피쳐 중요도 추출 로직
        s_output, s_data, s_scaler = featureService.getFeatureImportance(s_df,
                                                           s_reqData['fileName'],
                                                           s_reqData['target'],
                                                           s_reqData['varInfo'],
                                                           s_reqData['scaler']
                                                           )
        
        o_dataSource.setUseScale(json.loads(s_reqData['fileName']), s_scaler)
        # 변환데이터 저장
        o_dataSource.setScaleDataSet(json.loads(s_reqData['fileName']), s_data)

        s_result = '{"reVal": ' + s_output + '}'
        
        return s_result

    @app.route('/ViewPCA', methods=['POST'])
    def ViewPCA():
        request_data = json.loads(request.get_data())
        
        user_no = request_data['USER_NO']
        col_name = request_data['Target']

        full_filename = os.path.join('py_result/' + str(user_no) + '/pca', col_name + '_pca_coef.jpeg')
        with open(full_filename, 'rb') as bites:
            return send_file(
                        io.BytesIO(bites.read()),
                        attachment_filename = col_name + '.jpeg',
                        mimetype='image/jpeg'
                )


    
    @app.route('/editLoadModelColumnInfo', methods=['POST'])
    def editLoadModelColumnInfo():
        # request 파라미터
        s_reqData = json.loads(request.get_data())
        s_editInfo = json.loads(s_reqData['editInfo'])
        s_fileInfo = json.loads(s_reqData['fileName'])

        # 데이터 불러오기
        s_df = o_dataSource.getDataSet(s_fileInfo)

        try:
            # 저장된 전처리정보(타입변경/돋보기)로 데이터 전처리시작
            s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')
            s_df, s_output = s_preProcess.loadEditData(s_df, s_editInfo)
            # 돋보기 처리일경우 마지막에 다시 데이터 통계 시작(s_output에는 타입변경컬럼에 대한 통계량 들어감)
            if s_output == []:
                s_output, s_df = s_preProcess.getDataPreProcess(s_df,JOB_LOCATION_ATT.WISEPROPHET,o_dataSource)
                s_sampleDf, s_sampleHeader = s_preProcess.getSampleData(s_df)
                s_output['sampleData'] = s_sampleDf
                s_output['sampleHeader'] = s_sampleHeader
     
            # 전처리한 데이터 다시 저장
            o_dataSource.setDataSet(s_fileInfo, s_df)

            s_output = json.dumps(s_output)


        except Exception as e:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            # return Exception        
            raise Exception("LoadModelCleanInfo 중 오류 발생")
        
        s_result = '{"reVal": ' + s_output + '}'


        return s_result



# 피처변수 - 피쳐  변수 추출
    @app.route('/TextInfo', methods=['POST'])
    def TextInfo():

        s_reqData = json.loads(request.get_data())

        s_filelist = s_reqData['dataFileName']
        s_userno = s_reqData['USER_NO']

        from serviceText import tokenizerService
        s_result = tokenizerService.getTextInfo(s_filelist, s_userno)
 
        return s_result

    @app.route('/TextPreProcess', methods=['POST'])
    def TextPreProcess():
         # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())

        s_userno = s_reqData['USER_NO']
        s_datalist = s_reqData['Infos']
        s_type = s_reqData['fileType']
        s_uuid = s_reqData['uuid']
        s_dictionary = s_reqData['dictionary']
        s_bertFlag = s_reqData['bert_use']
        print("s_datalist : \n", s_datalist)

        from serviceText import tokenizerService 

        s_result, s_df = output, df = tokenizerService.getTextPreProcess(s_type, s_uuid, s_datalist, s_userno, s_dictionary, s_bertFlag)
        s_targetParam = {}
        s_targetParam['USER_NO'] = s_userno
        s_targetParam['fileName'] = 'txtLabelResult/' + s_uuid + '/' + s_uuid + '_data.csv'
        o_dataSource.setDataSet(s_targetParam, s_df)

        return s_result

    @app.route('/GetInputText', methods=['POST'])
    def GetInputText():

        s_reqData = json.loads(request.get_data())
        s_fileNm = s_reqData['fileNm']
        s_userno = s_reqData['USER_NO']

        from serviceText import tokenizerService
        s_result = tokenizerService.getInputText(s_fileNm, s_userno)

        return s_result

    @app.route('/RemoveEmptyRow', methods=['POST'])
    def RemoveEmptyRow():
        s_reqData = json.loads(request.get_data())

        s_fileNm = s_reqData['fileNm']
        s_userno = s_reqData['USER_NO']

        from serviceText import tokenizerService
        s_result = tokenizerService.removeEmptyRow(s_fileNm, s_userno)

        return s_result

    @app.route('/UnModel_Test_Run', methods=['POST'])
    def UnModel_Test_Run():

        from serviceUnmodel import managementService
        s_reqData = json.loads(request.get_data())
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as exe:
            s_modelExe = exe.submit(
                managementService.runUnModel, s_reqData)

            s_output = s_modelExe.result()


        s_result = '{"reVal": ' + s_output + '}'
        return s_result

    # # 텍스트분석 모델관리
    # @app.route('/UnModel_Test_Run', methods=['POST'])
    # def UnModel_Test_Run():
    #     #self.logger = logging.getLogger('Model_Test_Run')
    #     #self.logger.info("###LOGGER START###")
    #     # data --> fileNm, params
    #     request_data = json.loads(request.get_data())
    #     fileType = request_data['fileType']
    #     uploadfileName = request_data['uploadfileName']
    #     userno = request_data['USER_NO']
    #     lang = request_data['lang']
    #     bert_use = request_data['bert_use']
    #     uuid = request_data['uuid']
    #     embedding_input = request_data['embedding_input']
    #     max_len = request_data['max_len']
    #     textCol = request_data['textCol']
    #     labelCol = request_data['labelCol']
    #     origin_label = request_data['origin_label']
    #     encode_label = request_data['encode_label']

    #     fileType = 'single'

    #     if fileType == 'multi' :
    #         text = []
    #         # 1,2개로 이루어진 단어 제거
    #         shortword = re.compile(r'\W*\b\w{1,2}\b')
    #         for upfile in uploadfileName:
    #             f = open('./py_result/'+str(userno)+'/txt_newdata/' + upfile, encoding="utf8")
    #             realText = f.read()
    #             # realText = shortword.sub('', realText)
    #             # realText = text_to_word_sequence(realText)
    #             text.append(realText)
    #             f.close()
    #         data = pd.DataFrame({"TEXT":text})

    #         textCol = 'TEXT'
    #     else:
    #         with open('./py_result/'+str(userno)+'/txt_newdata/' + uploadfileName, 'rt', encoding='utf-8') as f:
    #             fline = f.readline()
    #             f.close()
    #         sep = detect(fline)
    #         data = pd.read_csv('./py_result/'+str(userno)+'/txt_newdata/' + uploadfileName, sep=sep, encoding='utf-8')

            
    #         data = data.dropna(how='any')

    #         if textCol not in data.columns.tolist():
    #             raise Exception('Error : 컬럼명이 동일하지 않습니다.')
            
    #     with concurrent.futures.ThreadPoolExecutor(max_workers=5) as exe:
    #         modelExe = exe.submit(
    #             model_management2.UnModelRun, data, textCol, labelCol, uuid, userno, bert_use, lang, embedding_input, max_len, origin_label, encode_label)
    #         # future = concurrent.futures.as_completed(modelExe)
    #         output = modelExe.result()

    #     # output = model_management.ModelRun(data, modelType, uuid, parameter)
    #     # return pyservice_pb2.PyModelResponse(reVal=output)
    #     reVal = '{"reVal": ' + output + '}'
    #     return reVal


    
    # #2021.02.01 비정형 모델 이미지 쪽 추가
    # @app.route("/UnModel_Image_Run", methods=['POST'])
    # def UnModel_Image_Run() :
    #     request_data = json.loads(request.get_data())
    #     print("요청 데이따 :",request_data) #modelID, fileType, uuid, orgin_label, uploadfileName, user_no
    #     fileInfo = request_data
    #     uploadfileName = request_data['uploadfileName']
    #     uuid = request_data['uuid']
    #     param = request_data['model_param']
    #     argNm = request_data['argNm']
    #     modelType = request_data['modelType']
    #     outValueDict = {}
    #     outValueList = []
    #     csvValue = pd.read_csv('py_result/' + str(fileInfo['USER_NO']) + '/objLabelResult/' +
    #                             uuid+'/classes.csv', names=['colName', 'colValue'], encoding='utf-8')
    #     print(uploadfileName)
    #     img_name= uploadfileName
    #     # for img_name in uploadfileName :
    #         #이미지 파일 가져오기
    #     print(img_name)
    #     file = csvReader.csvReader('LOCAL', img_name, fileInfo) 
    #     #이미지 읽고
    #     data = image.load_img(file, target_size=(148,148))
    #     #복사
    #     imagedata = data.copy()
        
    #     # 바이트 형식
    #     img_buffer = io.BytesIO() 
    #     #바이트 형식으로 교체 
    #     imagedata.save(img_buffer, format="PNG")
        
    #     #base64로 변경 - 이미지 base64로 저장
    #     img_str = base64.b64encode(img_buffer.getvalue()).decode("utf-8")

    #     #읽은 이미지 배열로 저장
    #     data = image.img_to_array(data) 

    #     #축 추가
    #     data = np.expand_dims(data, axis=0) 
            
    #     #결과값 얻어오기
    #     with concurrent.futures.ThreadPoolExecutor(max_workers=5) as exe:
    #         modelExe = exe.submit(
    #             model_management.UnModelRun, data, modelType, uuid, argNm, param, fileInfo, False, '')
    #         output = modelExe.result()
        
    
    #     row = csvValue.loc[(csvValue['colValue'] == output[0])]

    #     img_output = str(row.iloc[0, 0])
        
    #     outValueDict = {"imgName" : img_name, "imgBase64" : 'data:image/png;base64,'+img_str, "imgPredict" : img_output}
    #     print("결과",outValueDict)
    #     outValueList.append(outValueDict)
    #     print(outValueList)

    #     reVal = {"reVal" : outValueList}
    #     reVal = json.dumps(reVal)
    #     return reVal
    # 210311
    @app.route('/drawLinesOnImg', methods=['POST'])
    def drawLinesOnImg():
        s_reqData = json.loads(request.get_data())
        # imfNameList = request_data.split(',')

        # data = imfNameList[1:]
        # userno = imfNameList[0]
        # path = './py_result/' + str(userno)

        # fileInfo = {}
        # fileInfo['path'] = path # json 파일 위치
        # fileInfo['dataName'] = data # json 파일 내에서 검색될 이미지파일 이름
        # fileInfo['userno'] = userno # 유저 폴더명

        s_fileInfo = {
            "userno": s_reqData['USER_NO'],
            "label_file_nm": s_reqData['labelFileNm'],
            "img_file_nms": s_reqData['imgNms']
        }
        s_labelsInJson = fileService.drawLinesOnImg(s_fileInfo)
        s_labelsDict = {i:s_labelsInJson[i] for i in range(len(s_labelsInJson))}
        return s_labelsDict

    # #202 RunWkModel 추가
    @app.route('/Run_WkModel', methods=['POST'])
    def Run_WkModel():      
        s_reqData = json.loads(request.get_data())  
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_params = json.loads(s_reqData['parameter']) # 모델 파라미터 값
        s_wkFlag = s_reqData['wkModelFlag']
        s_wkPredictSaveFlag = s_reqData.get('wkPredictSaveFlag', False) # 원데이터에 평가 set 예측값 붙여서 저장할경우 True 

        # 1. Set Dataset
        s_uploadType = s_fileInfo['fileType']
        s_df = dataService.readNewData(s_uploadType, s_fileInfo)
        # 프로필에서 수정한데이터를 바로 다시 데이터셋으로 저장함.

        s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')
        s_dfStat, s_df = s_preProcess.getDataPreProcess(s_df,JOB_LOCATION_ATT.WORKFLOW,o_dataSource)
        o_dataSource.setDataSet(s_fileInfo, s_df)

        # 2-1 getFeatureInfoData 파라미터 설정
        s_varInfo = [] # 변수 중요도 구하는 과정에서 필요하기 때문에 아래 형식에 맞춰서 작성
        for colName in s_df.columns :
            sColInfo = s_dfStat[colName]
            sTmpObj = {
                "NAME":colName,
                "TYPE": s_params['targetType'] if colName == s_params['targetCol'] else sColInfo['val_type'],
                "USE": False if sColInfo['val_type'] == "categorical" and sColInfo['distinct_count']>100 else True,
                "TARGET" : True if colName == s_params['targetCol'] else False,
                # 추후 MIN, MAX 등 정보 제공 필요할 경우 아래 주석 해제
                # "MIN":sColInfo['min'],
                # "MAX":sColInfo['max'],
                # "Q1":sColInfo['1Q'],
                # "Q3":sColInfo['3Q'],
                # "UNIQUE_VALUE":sColInfo['distinct_count'],
                # "MISSING":sColInfo['na_count'],
                # "MEAN":sColInfo['mean'],
                # "STDDEV":sColInfo['std'],
                # "SUMMURY":sColInfo['colDataSummury'],
                # "BOXPLOTDATA":sColInfo['colBoxData'],
                # "TOTAL_COUNT":sColInfo['total_count'],
            }
            s_varInfo.append(sTmpObj)
        # 컬럼정보 파라미터에 할당
        s_params['varInfo'] = s_varInfo
        
        # NULL값 처리
        s_df = s_df.fillna(0)

        # 2. label data 구하고 label encoding 처리된 데이터로 setScaleDataSet
        if s_params['algorithmInfo']['algorithm']['argType'] != 'Clustering':
            s_featureInfoData = featureService.getFeatureInfoData(s_df,
                                                           s_reqData['fileName'],
                                                           s_params['targetCol'],
                                                           json.dumps(s_varInfo))
            # label data
            s_labelData = s_featureInfoData['labelCodeMap'].to_json(orient='columns')
            s_removeColList = list(set(s_featureInfoData['noUseColList'] + s_featureInfoData['textColList'] + s_featureInfoData['dateColList']))
            s_params['featureInfo']['featureList'] = [{"FEATURE" : col, "IMPORTANCE" : 0, "USE" : True} for col in s_featureInfoData['df'].columns if col not in s_removeColList]
            s_params['featureInfo']['labelData'] = s_labelData
            s_df = s_featureInfoData['df']
            
        else :
            s_labelData = pd.DataFrame(columns=['label', 'labelVal']).to_json(orient='columns')
        
        # 3. 모델 실행 (Run_Model)
        from serviceModel import modelService
        
        s_function = s_params['algorithmInfo']['algorithm']['argFunc']
        s_rawColNameList = list(s_reqData.get('analysisColInfo', {}).keys())
        s_params['wkRawColNmList'] = s_rawColNameList
        s_output = modelService.runModel(s_df, s_fileInfo, s_function, json.dumps(s_params), o_dataSource, s_wkFlag, s_wkPredictSaveFlag)

        # 15 dbscan 모델 저장 에러 수정
        if s_params['algorithmInfo']['algorithm']['argNm'] == 'DBSCAN' :
            s_params['dbscanCluster'] = list(json.loads(json.loads(s_output)['reVal'])['Cluster_Label'].values())

        # spark viewtable 생성
        from serviceUtil import sparkService
        sparkService.createSparkView(s_fileInfo)
        s_result = {
            "edaResult":'',
            "featureImportanceResult": {'labelData':s_labelData},
            "modelRunResult":'{"reVal": ' + s_output + ',"argId": "' + str(s_params['algorithmInfo']['algorithm']['argId']) + '"}',
            "modelParams":s_params, # #15 모델 id 생성을 위해서 추가
            "logId":s_reqData['logId'] # #15 logId 기준으로 modelId 업데이트 하기 위해서 추가=
        }
        return s_result

    @app.route('/getReward', methods=['POST'])
    def getReward():
        # #211 강화학습 추가
        from serviceModel.model.reinforcements.reinfocements import Reinfocements
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileName'])
        s_df = o_dataSource.getScaleDataSet(s_fileInfo)

        s_targetCol = s_reqData['target']
        s_rewardCode = s_reqData['code']

        s_rfclass = Reinfocements(10, iterations_episode=10, reward_code=s_rewardCode)
        s_trainCnt = int(len(s_df)*0.8)
        s_output = s_rfclass.excution(s_df[:s_trainCnt], 
                                      s_df[s_trainCnt:], 
                                      s_df[s_targetCol][:s_trainCnt].to_numpy(), 
                                      s_df[s_targetCol][s_trainCnt:].to_numpy(), 
                                      'check', s_targetCol)

        s_result = '{"reVal": ' + json.dumps(s_output, cls=commonService.JsonEncoder) + '}'

        return s_result


    @app.route('/execCustomFunc', methods=['POST'])
    def execCustomFunc():
        request_data = json.loads(request.get_data())
        fileInfo = json.loads(request_data['fileName'])
        df = o_dataSource.getDataSet(fileInfo).copy()
        # 코드가 실행했는지 체크하는 파라미터
        codeRunCheck = False
        codeInput = request_data['code']

        Vars = locals()
        Vars["df"] = df

        old_stdout = sys.stdout
        new_stdout = io.StringIO()
        sys.stdout = new_stdout 
        result = ''
        codeLine = codeInput.split('\\r\\n')
        
        for code in codeLine:
            try:
                exec(code,globals(),Vars)  
                result = sys.stdout.getvalue().strip()
                # 코드가 제대로 실행되었다면 True
                codeRunCheck = True
            except SyntaxError as err:            
                result = ""
                result += str(err.__class__.__name__)             
                for v in err.args:
                    if(len(result) > 0):
                        result += "\n"
                    result += str(v)

                line_number = err.lineno
                # 코드 실행중 에러로 exception 생기면 false
                codeRunCheck = False
            except Exception as err:
                result = ""
                result += str(err.__class__.__name__)             
                for v in err.args:
                    if(len(result) > 0):
                        result += "\n"
                    result += str(v)

                cl, exc, tb = sys.exc_info()
                line_number = traceback.extract_tb(tb)[-1][1]
                codeRunCheck = False
        # 코드 실행 체크가 false가 아니다 = 여러 코드 실행했을때 모두 성공적으로 돌아갔을때만 저장 진행
        dateFormat = ""
        if codeRunCheck :
            # 변경된 df를 데이터 셋 저장해 적용
            o_dataSource.setTempDataSet(Vars['df'])
            
            if not os.path.isdir('./py_result/'+ str(fileInfo['USER_NO']) + '/userPreprocessing'):
                os.makedirs('./py_result/'+ str(fileInfo['USER_NO']) + '/userPreprocessing')
            date = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S") 
            dateFormat = date + "_code.txt"
            codeDir = './py_result/'+ str(fileInfo['USER_NO']) + '/userPreprocessing/' + dateFormat
            codeFile = open(codeDir, 'w')
            codeFile.write(code)
            codeFile.close()

        #put stdout back to normal 
        sys.stdout = old_stdout 
        base64_str = str(base64.b64encode(parse.quote(result).encode('utf-8')))
        base64_str = base64_str.replace("b'",'')
        base64_str = base64_str.replace("'",'')
        reVal = '{"reVal": "'+ base64_str +'", "fileName": "'+ dateFormat +'"}'

        return reVal

    @app.route('/execCustomFuncSave', methods=['POST'])
    def execCustomFuncSave():
        request_data = json.loads(request.get_data())
        fileInfo = json.loads(request_data['fileName'])
        # fileType = fileInfo['fileName'].split('.')[1]
        
        df = o_dataSource.getTempDataSet()
        if not df.empty:
            o_dataSource.setBackupDataSet(fileInfo, df)
            
            # baseDir = './py_result/'+ str(fileInfo['USER_NO']) + '/' +fileInfo['fileName']
            
            # if fileType == 'xlsx' or fileType == 'excel':
            #     df = df.to_excel(baseDir, index = False)  
            # else:
            #     df = df.to_csv(baseDir, index = False)
            
            reVal = '{"reVal": "Save"}'
        else :
            reVal = '{"reVal": "Failed"}'
        return reVal

    @app.route('/onCheckFileName', methods=['POST'])
    def onCheckFileName():

        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_fileInfo = s_reqData['fileInfo']
        s_uploadType = s_fileInfo['STORAGE_FILETYPE']

        # 데이터명이 있는지 없는지 체크로직
        s_output = dataService.checkDataExist(s_uploadType, s_fileInfo)

        s_result = {'reVal' : s_output}

        return s_result

        
    #WP-56 모델 운영 스케줄 데이터셋 변경할 때 모델에서 사용된 컬럼 다 있는지 확인하는 기능
    @app.route('/onCheckChangeData', methods=['POST'])
    def onCheckChangeData():
        # 리퀘스트 파라미터
        s_reqData = json.loads(request.get_data())
        s_fileInfo = json.loads(s_reqData['fileInfo'])
        s_uploadType = s_fileInfo['fileType']
        s_varInfo = json.loads(s_reqData['parameter'])

        # 변경하는 데이터셋의 컬럼만 불러오기
        s_columns = dataService.readColumns(s_uploadType, s_fileInfo)

        s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')

        # 모델에서 사용한 컬럼 리스트
        s_featureCol = []
        # 학습모델에서 사용한 전체 컬럼리스트
        s_totalCol = []
        # 학습모델에서 사용한 전체컬럼의 정보(타입변환 위해)
        s_totalVarInfo = {}
        #모델학습에 사용한 변수정보 loop
        for var in s_varInfo:
            # 종속변수로 사용했으면 s_featureCol append
            if var['VAR_MAJOR_YN'] == 'Y' and var['VAR_IMPORT'] == 'Y' and var['VAR_TARGET_YN'] == 'N':
                s_featureCol.append(var['VAR_NM'])
            # 사용 여부 관계없이 전체 컬럼명 append 
            s_totalCol.append(var['VAR_NM'])
            # 통계량 계산 위해 전체 컬럼 정보 json    
            s_totalVarInfo[var['VAR_NM']] = { 
                    'VAR_TYPE': var['VAR_TYPE'],
                    'VAR_TARGET_YN': var['VAR_TARGET_YN'],
                    'VAR_MAJOR_YN': var['VAR_MAJOR_YN'],
                    'VAR_IMPORT': var['VAR_IMPORT'],
                }
                
        # isMatch가 True면 사용할수 있는 데이터. 
        # 모델에서 사용한 컬럼이 변경하는 데이터셋에 없으면 isMatch = False (사용할 수 없음). s_notCol에 없는컬럼 append
        s_isMatch = True
        s_notCol = []
        for feature in s_featureCol:
            if feature not in s_columns:
                    s_isMatch = False
                    s_notCol.append(feature)

        # 모델에서 사용할 수 있는 데이터일 경우  (통계량이 당분간 필요없으면 아래 주석처리)
        if s_isMatch == True:
            # 통계량을 위해 데이터 불러오기
            s_df = dataService.readNewData(s_uploadType, s_fileInfo)

            # 변경할데이터의 통계량담을 변수
            s_schVarInfo = []
            for col in s_df.columns.tolist():
                # 학습모델 데이터랑 컬럼이 같을 경우
                if col in s_totalCol:
                    s_type = s_totalVarInfo[col]['VAR_TYPE']
                    s_edit, s_df = s_preProcess.editData(s_df, 'ChgType', col, '', s_type, True)
                    s_edit['VAR_TARGET_YN'] = s_totalVarInfo[col]['VAR_TARGET_YN']
                    s_edit['VAR_MAJOR_YN'] = s_totalVarInfo[col]['VAR_MAJOR_YN']
                    s_edit['VAR_IMPORT'] = s_totalVarInfo[col]['VAR_IMPORT']
                # 학습모델 데이터에는 없는 컬럼일 경우
                else:
                    if s_df[col].dtypes in ['int64', 'int32', 'float64', 'float32']:
                        s_type = 'numerical'
                    else:
                        s_type = 'categorical'
                    s_edit, s_df = s_preProcess.editData(s_df, 'ChgType', col, '', s_type, True)
                    s_edit['VAR_TARGET_YN'] = 'N'
                    s_edit['VAR_MAJOR_YN'] = 'N'
                    s_edit['VAR_IMPORT'] = 'N'
                # 통계량에 대한 KEY명을 컬럼 DB명과 맞춤. 아 변수명하고 컬럼하고 동일하지가 않아서 이거를 해야함. 이부분은 나중에 반드시 고칠 필요가 있다.    
                for key in list(s_edit.keys()):
                    # 값이 nan일 경우 에러나서 None으로 변경해야함.
                    if pd.isna(s_edit[key]):
                        s_edit[key] = None
                    if 'VAR' not in key:
                        if pd.isna(s_edit[key]):
                            s_edit[key] = None
                        if key == 'STDDEV':
                            s_edit['VAR_STD_DEV'] = s_edit.pop(key)
                        elif key =='Q1':
                            s_edit['VAR_1Q'] = s_edit.pop(key)
                        elif key =='Q3':
                            s_edit['VAR_3Q'] = s_edit.pop(key)
                        else:
                            s_edit['VAR_' + key] = s_edit.pop(key)

                s_edit['DS_VIEW_ID'] = 0
                s_edit['TBL_NM'] = s_fileInfo['fileName']
                s_edit['VAR_NM'] = col
                s_edit['COL_NM'] = col
                s_edit['VAR_CAPTION'] = col
                s_edit['VAR_TYPE'] = s_type
                s_edit['DATA_TYPE'] = s_type
                    
                s_schVarInfo.append(s_edit)


        # 변경데이터가 사용가능할 경우
        if s_isMatch:
            s_output = {
                'reVal' : s_isMatch,
                'value' : {
                    'DP_SCH_VAR_MSTR': s_schVarInfo,
                    'DP_SCH_VAR_STR_EX_MSTR': []
                }
            }
        # 아닐 경우
        else:
            s_output = {'reVal' : s_isMatch, 'value': s_notCol}

        return s_output
    
    @app.route('/validationAlgorithmCode', methods=['POST'])
    def validationAlgorithmCode():
        
        s_reqData = json.loads(request.get_data())
        #WP-160 알고리즘 코드
        s_fileCode = str(json.loads(s_reqData['algorithmCode']))
        s_reVal = {'isSuccess' : True, 'result' : None}
        #WP-160 일단 exec로 한번 코드를 실행해야 선언한 함수나 파라미터를 locals()로 확인 가능함
        try:
            exec(s_fileCode, None, globals())
            s_returnValue =  globals()['s_output']
            # WP-177 실행된 코드에 layer가 있을 경우 (Keras Sequential 모델일 경우)
            if hasattr(s_returnValue, 'layers'):
                s_reVal['result'] = 'hasLayers'
            # WP-177 실행된 코드에 state_dict이 있을 경우 (pytorch 모델일 경우)
            elif hasattr(s_returnValue, 'state_dict'):
                s_reVal['result'] = 'hasPytorch'
            else :
                if not hasattr(s_returnValue, 'fit'):
                    s_reVal = {'isSuccess' : False, 'result' : 's_output 값이 모델이 아닙니다.\n'}
        except Exception as e:
            print(e)
            pass
        return json.dumps({'reVal': s_reVal})
    
    @app.route('/accessAlgorithmCode', methods=['POST'])
    def accessAlgorithmCode():
        s_reqData = json.loads(request.get_data())
        s_createYn = s_reqData['createYn']
        s_userModelPath = 'py_result/' + str(s_reqData['USER_NO']) + '/userModel'
        
        if not os.path.isdir(s_userModelPath):
            os.makedirs(s_userModelPath)
        
        s_filePath = s_userModelPath + '/' + json.loads(s_reqData['fileName']) + '.py'
        
        s_mode = json.loads(s_reqData['mode'])
        # tf layer model 일 경우 layerModel true
        s_layerModel = s_reqData.get('layerModel', False)
        
        # s_layerModel 값이 없을때 → 프로핏 에서 돌릴 때
        if not s_layerModel:
            s_path = os.getcwd()
            s_output = ''
            if s_createYn:
                s_filePath = 'serviceModel/model/custom-code.py'
            if not os.path.exists(s_filePath) and not s_createYn :
                raise Exception('\n해당 파일이 존재하지 않습니다')
            if s_mode == 'w':
                with open( s_filePath, 'r', encoding='utf-8') as s_file:
                    s_originCode = s_file.readlines()
                
                s_fileCode = json.loads(s_reqData['fileCode'])
                s_newCode = s_fileCode.split('\n')
                                              
                for p_idx in range(len(s_newCode)):
                    s_newCode[p_idx] = '    '+ s_newCode[p_idx]

                s_newCode = '\n'.join(s_newCode)
                s_saveCode = s_originCode[0] + s_newCode + '\n' + s_originCode[-1]

                try:
                    s_savefile = open(s_userModelPath + '/' + json.loads(s_reqData['fileName']) + '.py', s_mode, encoding='utf-8')
                    s_savefile.write(s_saveCode)
                    s_savefile.close()
                    s_output = True
                except:
                    s_output = False
            else :
                with open(s_filePath, 'r', encoding='utf-8') as s_file:
                    s_fileCode = s_file.readlines()
                s_customfuncCode = s_fileCode

                del s_customfuncCode[0]
                del s_customfuncCode[len(s_customfuncCode)-1]
                s_customfuncCode[-1] = s_customfuncCode[-1].replace('\n','')
                for p_idx in range(len(s_customfuncCode)):
                    s_customfuncCode[p_idx] = s_customfuncCode[p_idx].replace('    ', '', 1)
                s_output = ''.join(s_customfuncCode)
                
            return json.dumps({'reVal' : s_output, 'path' : s_path})
        
        else :
            s_modelTemplatePath = './serviceModel/model/custom-ml-code-template.py'
            s_customCode = ''
            s_fileCode = json.loads(s_reqData['fileCode'])
            s_classCnt = 2
            # 분류 모델이면 클래스 카운트 설정해야 함.
            if '#class_model(classCnt' in s_reqData['fileCode']:
                # #class_model(classCnt=2) 이면 2만 추출
                # s_regRegex = re.compile('(?<=#class_model\(classCnt=)(.*?)(?=\))')
                s_regRegex = re.compile(r'(?<=#class_model\(classCnt=)(.*?)(?=\))')
                s_ClassList = s_regRegex.findall(s_reqData['fileCode'])
                if len(s_ClassList) > 0 :
                    s_classCnt = int(s_ClassList[0])

            # 코드 들여쓰기 수정
            s_fileCode = s_fileCode.replace('\n', '\n    ')
            with open(s_modelTemplatePath, 'r', encoding='utf-8') as f:
                s_customCode = f.read()
                s_customCode = s_customCode.replace("s_classCnt = None", f's_classCnt = {s_classCnt}')
                s_customCode = s_customCode.replace("model, history = None, None", s_fileCode)
            
            with open(s_filePath, 'w', encoding='utf-8') as f:
                f.write(s_customCode)
                
            return json.dumps({'reVal' : True})

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
    
    # @app.errorhandler(500)
    # def internal_server_error(error):
    #     app.logger.error('Server Error: %s', (error))
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
            # print("???? : ", traceback.print_exc(limit=1))
                s_str_e = str(e)
                if 'given input columns' in s_str_e:
                    s_str_e = s_str_e.split(';')[0]
                    code = 622  
                if 'The column number of the existing table' in s_str_e:
                    code = 623 
                error = str(type(e)) + " : " +  s_str_e
                    
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.updateJobStatus(s_params['groupId'], s_params['jobId'], 99, error, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"))
            # logging.exception('Unhandled Exception: %s', (e))
            logging.error(f'request ip: {request.remote_addr},  url : {request.path}, action: {s_params.get("action")},  error : {error}' )
            # app.logger.error('Unhandled Exception: %s', (e))
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
    # if s_args.sparkUse :
    #     o_apiType = 'SPARK'
        
    # if s_args.mlflowUse :
    #     s_metaDbInfo = getConfig('','META_DB')
    #     s_trackingUrl = "mysql://" + s_metaDbInfo['id'] + ":" + parse.quote(s_metaDbInfo['passwd']) + "@" +  s_metaDbInfo['host'] + ":" + s_metaDbInfo['port'] + "/mlflow"
    #     o_modelLogger = mlflowService.mlFlowClient(o_storageInfo['DEFAULT_PATH'],o_storageInfo['type'],s_trackingUrl)

    print(o_storageInfo['type'])
    o_dataSource = dataSourceService.dataSource(o_userNo,None,o_storageInfo['type'],o_apiType,o_storageInfo)
    app.register_blueprint(WiseStorageRouter(o_secret_key,o_dataSource))
    print(app.url_map)
    app.run(host='0.0.0.0', port=1337, threaded=True, use_reloader=False)
