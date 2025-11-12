import logging
import json
import os 
from serviceCommon import fileService
import joblib
from config.wp import getConfig, getWiseDefaultStorage
import numpy as np
import matplotlib.pyplot as plt
import re
import shutil
from serviceStorage import common

#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('CommonUtil')
o_filesystem = getConfig('','STORAGE_TYPE')


'''
폴더 생성
p_userno : 유저번호
p_folder: 생성할 폴더경로
p_filesystem: 하둡 또는 서버(생성위치)
'''
def createFolder(p_userno, p_folder, p_filesystem=o_filesystem):
    s_wiseStorage = common.WiseStorageManager(p_userno,p_filesystem)
    s_wiseStorage.createDirs(f'{str(p_userno)}/{p_folder}')
    
'''
폴더 삭제
p_folder: 삭제할 폴더경로
'''   
def deleteFolder(p_path):
    o_logger.info('######## Folder Del ########')
    s_output = False
    try:
        shutil.rmtree(p_path, ignore_errors=True)
        s_output = True
    except Exception as ex:
        print(ex)
        o_logger.info('######## Folder Del Error########')
        o_logger.info(ex)
        s_output = False
    s_result = {"result": s_output}
    return json.dumps(s_result)

'''
트리 모델 저장
p_graph: 저장 트리 그래프 객체
p_userno: 유저번호
p_uuid: 모델 uuid
p_argType: 알고리즘 타입 (reg, class)
'''
def saveTreeGraphPdf(p_graph, p_userno, p_uuid, p_argType):
    o_logger.info('######## tree Save ########')
    # 폴더 생성
    fileService.createFolder(p_userno, 'treegraph')
    
    # WPLAT-148
    s_wiseStorage = common.WiseStorageManager(p_userno)
    s_output = s_wiseStorage.writeFile(str(p_userno) + '/treegraph/' + p_uuid + "_decisiontree_" + p_argType + ".pdf",p_graph, 'pdf')
    
    return s_output


'''
모델 pkl 파일 저장
p_model: 저장 모델 객체
p_argType: 알고리즘 타입 (reg, class, cluster)
p_modelType: 모델 타입
p_userno: 유저번호
p_uuid: 모델 uuid
p_layerModelFlag: tensorflow layer 모델 여부
'''
def saveModelPkl(p_model, p_argType, p_modelType, p_userno, p_uuid, p_layerModelFlag=False):
    o_logger.info('######## Pkl Save ########')
    s_output = False
         
    # 폴더 생성
    fileService.createFolder(p_userno, 'pkl')    
    # storage
    # WPLAT-148
    s_wiseStorage = common.WiseStorageManager(p_userno)
    # 모델파일 이름
    s_filename = str(p_userno) + '/pkl/' + p_argType + '_' + p_modelType + '_' + p_uuid
    # 모델 저장
    try: 
        # joblib.dump(p_model, 'py_result/' + s_filename + '.pkl')
        s_output = s_wiseStorage.saveModel(s_filename + '.pkl',p_model,'pkl')

        # if fileInfo['dataType']=='CLOUD':
        #     modelPklUpload(modelCate,modelType,uuid,fileInfo)

    except Exception as ex:
        print(ex)
        o_logger.info('######## Pkl Save Error########')
        o_logger.info(ex)
        s_output = False

    return s_output

'''
모델 실행 결과 저장 (csv)
p_userno: 유저번호
p_uuid: 모델 uuid
p_df: 실행 결과 데이터프레임
p_folder: 저장 폴더명
p_prefix: csv 파일 prefix
p_mode: 저장 옵션(w, wb 등)
'''
def saveModelResultCsv(p_userno, p_uuid, p_df, p_folder, p_prefix='', p_mode='w', p_filesystem=None):
    o_logger.info('######## Model Result to Csv Save ########')
    
    if p_filesystem != None:
        s_filesystem = p_filesystem
    else:
        s_filesystem = o_filesystem

    # 결과 저장할 폴더 생성
    fileService.createFolder(p_userno, p_folder, s_filesystem)
    s_header = True

    if p_userno != '0':
        try:
            # 모델 결과파일명 (prefix가 None인 경우는 배치결과데이터설정저장시에)
            if p_prefix != None:
                s_filename = f'{p_uuid}_{p_prefix}_result.csv'
            else:
                s_filename = f'{p_uuid}.csv'

            s_path = f'{str(p_userno)}/{p_folder}/{s_filename}' 

            s_wiseStorage = common.WiseStorageManager(p_userno,s_filesystem)
            s_wiseStorage.writeFile(s_path,p_df,'csv',p_encType='utf-8-sig',p_writeMode=p_mode)
            
            s_output = True
        except Exception as ex:
            print("==============ex=================")
            print(ex)
            o_logger.info('######## ExeResutltoCsv Error########')
            o_logger.info(ex)
            s_output = False
    else :
        s_output = False
    
    return s_output

'''
모델 실행 결과 저장 (parquet)
p_userno: 유저번호
p_uuid: 모델 uuid
p_df: 실행 결과 데이터프레임
p_folder: 저장 폴더명
p_prefix: csv 파일 prefix
p_batchFlag: 배치 여부
'''
def saveModelResultParquet(p_userno, p_uuid, p_df, p_folder):
    o_logger.info('######## Model Result to Csv Save ########')
    

    # 결과 저장할 폴더 생성
    fileService.createFolder(p_userno, p_folder, o_filesystem)

    if p_userno != '0':
        try:
            # 모델 결과파일명 
            s_filename = f'{p_uuid}.parquet'
            s_filepath = f'{str(p_userno)}/{p_folder}/{s_filename}'
            # 2020.03.16 TTA 1차 수정 : 20번. encoding : utf-8-sig로
            #WP-50 1-1 filesystem_type 변수로 HDFS면 하둡에 학습 결과파일 저장 / LOCAL이면 LOCAL에 학습 결과 파일 저장   
            s_wiseStorage = common.WiseStorageManager(p_userno)  
            s_wiseStorage.writeFile(s_filepath,p_df,'parquet')
            s_path = s_wiseStorage.getPath()+s_filepath
            
            s_output = True
        except Exception as ex:
            print("==============ex=================")
            print(ex)
            o_logger.info('######## ExeResutltoCsv Error########')
            o_logger.info(ex)
            s_output = False
    else :
        s_output = False
    
    return s_output, s_filepath




'''
정형모델 pkl 파일 불러오기
p_argType: 알고리즘 타입 (reg, class, cluster)
p_modelType: 모델 타입
p_userno: 유저번호
p_uuid: 모델 uuid
p_deepFlag: 딥러닝 모델 여부
'''
def loadModelPkl(p_argType, p_modelType, p_userno, p_uuid, p_deepFlag=False):
    o_logger.info('######## Pkl Load ########')
    # 모델 이름
    s_filename = str(p_userno) + '/pkl/' + p_argType + '_' + p_modelType + '_' + p_uuid    
    s_wiseStorage = common.WiseStorageManager(p_userno)
    s_fileType = 'h5' if p_deepFlag else 'pkl'
    s_output = s_wiseStorage.loadModel(s_filename+'.'+s_fileType,s_fileType)
    
    return s_output

# #202 예측값을 붙인 데이터를 받아서 filepath에 저장 => 데이터에 예측값을 붙인 다음 저장하는것으로 변경.

'''
예측값을 붙인 데이터를 저장(wkModel 사용)
p_df: 원 데이터
p_y_predict: 예측값
p_argType: 모델 유형('Clustering', 'Regression', 'Classification')
p_targetCol: 목표 변수 컬럼명
p_fileInfo: 파일정보
p_rawColList: 원데이터 컬럼명(특수문자 정제하기 전)
'''
def savePredictData_WK(p_df, p_y_predict, p_argType, p_targetCol, p_fileInfo, p_uuid, p_rawColList=[], p_dataSource=None):
    try:
        s_df = p_df.copy()
        # #202 특수문자가 정제된 후 분석한경우 최종 저장시 컬럼명에 특수문자를 다시 붙여서 저장함.
        if len(p_rawColList) > 0:
            s_colNmDict = {}
            for rawCol in p_rawColList:
                s_newCol = re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·ï»¿]', "", rawCol)
                s_colNmDict[s_newCol] = rawCol
            s_rawColList = [s_colNmDict[col] for col in s_df.columns]
            s_df.columns = s_rawColList
            
        # 예측 컬럼명
        s_targetCol = ('predict_'+p_targetCol) if p_argType != 'Clustering' else 'predict_cluster'
        # 이미 예측 컬럼명이 존재하면 _2 이런식으로 뒤에 숫자 붙임
        s_dupColList = [colNm for colNm in list(s_df.columns) if s_targetCol in colNm]
        s_dupCnt = len(s_dupColList)
        if s_dupCnt > 0:
            s_targetCol = s_targetCol + '_' + str(s_dupCnt+1)
        s_df[s_targetCol] = p_y_predict
        
        s_userno = p_fileInfo['USER_NO']
        s_filepath = p_fileInfo['fileName']
        s_filename, s_fileExtension = os.path.splitext(s_filepath)
        s_fileExtension = s_fileExtension.lower()
        # 실제 파일로 저장
        if p_dataSource is None:
            if s_fileExtension == '.csv':
                saveModelResultCsv(s_userno, s_filename, s_df, 'wiseprophet/temp')
            if s_fileExtension == '.parquet':
                saveModelResultParquet(s_userno, s_filename, s_df, 'wiseprophet/temp')
        # dataSource에만 설정하는 경우.
        else :
            p_dataSource.setDataSet(p_fileInfo, s_df)

        return True
    
    except Exception as ex:
        print(ex)
        o_logger.info('######## predictToData Error ########')
        o_logger.info(ex)
        return False
