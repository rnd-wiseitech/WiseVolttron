import numpy as np
import pandas as pd
import json
import sys as sys
from sklearn.decomposition import TruncatedSVD
from sklearn.preprocessing import LabelEncoder
from operator import eq
import logging
import re
from datetime import timedelta
import re
from itertools import product
from serviceModel import modelService
from serviceCommon import fileService
from serviceFeature import featureService
from eli5.sklearn import PermutationImportance
from sklearn.metrics import accuracy_score
from database.manager import WpDataBaseManagement
from config.wp import getConfig
from datetime import datetime,timedelta

logger = logging.getLogger('model_management')


"""
모델관리/모델운영 모델 실행
p_df: 예측할 데이터
p_modelType: 모델타입
p_uuid: 모델관리uuid(모델id)
p_argInfo: 모델정보(스케일등)
p_varInfo:  변수정보
p_fileInfo: 파일 정보
p_batchFlag: 모델운영일경우 True
p_batchId: 모델운영 배치 id
p_wkFlag: 워크플로우 모델 예측 컴포넌트에서 실행
"""
def runModel(p_df, p_modelType, p_uuid, p_argInfo, p_varInfo, p_fileInfo, p_batchFlag=False, p_batchId='', p_wkFlag=False):
    logger = logging.getLogger('ModelRun')
    logger.info('## ModelRun started ## ')

    p_df.fillna(0, inplace=True)
    s_orgDf = p_df.copy()


    # 모델 이름 설정
    s_modelname = p_argInfo['name']


    # optimizer batch 추가 (사용하지 않음)
    try:
        if p_fileInfo['optimizer'] == 'Y':
            s_optiFlag = True
        else:
            s_optiFlag = False
    except Exception as ex:
        s_optiFlag = False

    # 스케일 설정
    s_scaleType = p_argInfo['scaleType']


    # 타겟변수 원래 라벨
    s_originLabel = []
    # 종속변수 카테고리컬 원래 컬럼(one host encoding)
    s_varExCol = []
    # 모델에 사용하는 변수
    s_featureColList = []
    # 변수명 및 타입
    s_changeTypeInfo = {}
    # 타겟 컬럼명 
    s_targetCol = ''
    # 타겟컬럼 존재 여부
    s_targetFlag = False
    
    # timeseriesModel 일 경우에는(날짜변수를 사용하는) index_col과 window_size값을 따온다.
    if s_modelname in ['lstm', 'rnn']:
        s_seriesOption = json.loads(p_argInfo['option'])['option']
        s_indexCol = s_seriesOption['Name']
        s_windowSize = s_seriesOption['Window_Size']

    # 모델에서 사용하는 변수 추출
    for s_var in p_varInfo:
        s_target_yn = s_var['VAR_TARGET_YN']
        s_colname = s_var['COL_NM']
        s_use_yn = s_var['VAR_MAJOR_YN'].strip()
        s_import_yn = s_var['VAR_IMPORT'].strip()
        s_coltype = s_var['VAR_TYPE']
        s_changeTypeInfo[s_colname] = s_coltype
        # 타겟컬럼일 경우
        if s_target_yn == 'Y':
            s_targetType = s_coltype
            s_targetCol = s_colname
            # 테스트 데이터에 타겟컬럼이 있다면
            if s_colname in p_df.columns:
                s_targetFlag = True
                s_featureColList.append(s_colname)
            if s_targetType == 'categorical':
                s_originLabel = s_var['VAR_EX']
        # 아닐 경우
        else:
            # 모델에서 사용하면 featurCol에 넣음
            if s_use_yn == 'Y' and s_import_yn == 'Y':
                s_featureColList.append(s_colname)
                # 사용하고 카테고리변수이면 기존 카테고리컬럼값을 넣음
                if s_var['VAR_EX']:
                    for category in s_var['VAR_EX']:
                        s_varExCol.append(category)

        
    # 테스트데이터에서 모델에서 상요하는 변수들만 추출
    p_df = p_df[s_featureColList]
    
    # 더미변수 변수명까지 포함된 컬럼명 리스트
    s_useColList = list(p_df.columns) + s_varExCol
    
    
    if p_modelType != 'Recommend':                
        # 실제 테스트데이터 정재(모델학습떄 설정한 데이터타입으로 변환)
        for s_col in  p_df.columns:
            # 카테고리일 경우
            if s_changeTypeInfo[s_col] == 'categorical':
                # 타겟변수일 경우
                if s_col == s_targetCol:
                    # 타겟변수가 있을경우 카테고리칼인데 컬럼타입이 float일 경우 int로 변환
                    try:
                        if p_df[s_col].dtype == 'float64':
                            p_df[s_col] =p_df[s_col].astype('Int64')
                    except Exception as e:
                        pass
                    # 분류 모델일 경우 학습데이터의 카테고리라벨값으로 초기화
                    s_le = LabelEncoder()
                    s_le.classes_ = np.asarray(s_originLabel)
                    try:
                        p_df[s_col] = s_le.transform(p_df[s_col].astype(str))
                    except Exception as e:
                        pass
                # 그외는 one hot encoding
                else:
                    p_df = pd.get_dummies(data=p_df,
                                            columns=[s_col],
                                            # prefix를 특수문자 언더바로 함.
                                            prefix=[s_col], prefix_sep='＿')
            # 날짜일 경우
            elif s_changeTypeInfo[s_col] == 'date':
                # lstm, rnn이 아닌 경우에는 날짜컬럼을 모델에서 사용하지 않음.
                if s_modelname not in ['lstm', 'rnn']:
                    p_df = p_df.drop(s_col, axis=1)
                # lstm, rnn인 경우
                else:
                    # 날짜변수가 인덱스 변수일 경우
                    if s_col == s_indexCol:
                        # 먼저 null값 제거
                        p_df = p_df.dropna(subset=[s_col])
                        from servicePreprocess import preprocessService
                        s_checkDate, s_val = preprocessService.isDateType(p_df[s_col])
                        p_df[s_col] = s_val
                        if s_checkDate == True:
                            p_df = p_df.sort_values(by=[s_col], ascending=True)
                            p_df = p_df.reset_index(drop=True)
                    # 인덱스변수가 아닌 날짜변수는 제거
                    else:
                        p_df = p_df.drop(s_col, axis=1) 

    # 카테고리컬럼명에서 특문있을경우 수정
    p_df_col = p_df.columns
    p_df_col = [re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·ï»¿]', "", s_col) for s_col in p_df_col]
    p_df.columns = [s_col.replace(" ", "_") for s_col in p_df_col]

    # 학습떄의 카테고리컬럼명이 없을 경우 값은 0으로 컬럼 추가
    for exCol in s_varExCol:
        if exCol not in p_df:
            p_df[exCol] = 0
    
    # 학습때 사용한지 않은 카테고리 컬럼은 제외함. (클러스터는 동작 X)
    if p_modelType != 'Clustering' and p_modelType != 'Recommend':
        p_df = p_df[[col for col in p_df.columns if col in s_useColList]]
              
    p_df.sort_index(axis=1, inplace=True)


    # x 테스트데이터, y테스트데이터 설정
    s_x_test = None
    s_y_test = None

    s_x_test = p_df
    # 데이터에 타겟컬럼도 있을 경우(향후 재학습일 경우 있을수있음)
    if s_targetFlag == True:
        s_y_test = p_df[s_targetCol]
        s_x_test = s_x_test.drop([s_targetCol], axis=1)
    
    s_layerModelFlag = True if p_argInfo.get('layerModelYn', 'N')=='Y' else False
    # 클러스터링 일 경우
    if p_modelType == 'Clustering':
        s_x_test, s_scaler = modelService.getScaleData(s_x_test, s_scaleType)
        s_output = clustering(
            s_x_test, p_uuid, s_modelname, p_fileInfo, s_orgDf, p_batchFlag, p_batchId, s_optiFlag, p_wkFlag)
    elif p_modelType == 'Recommend':
        # s_x_test, s_scaler = modelService.getScaleData(s_x_test, s_scaleType)
        s_output = recommend(
            s_x_test, p_uuid, s_modelname, p_fileInfo, s_orgDf, p_argInfo['modelParam'], p_batchFlag, p_batchId, s_optiFlag, p_wkFlag)
    # 회귀, 분류
    else:
        # 회귀모델
        if s_targetType == 'numerical':
            s_x_test, s_scaler = modelService.getScaleData(s_x_test, s_scaleType)
            s_output = regressor(
                s_x_test, s_y_test, p_uuid, s_modelname, p_fileInfo, s_orgDf, p_batchFlag, p_batchId, s_optiFlag, s_scaleType, s_layerModelFlag, p_wkFlag)
        # 분류모델 / 강화학습
        elif s_targetType == 'categorical':
            s_x_test, s_scaler = modelService.getScaleData(s_x_test, s_scaleType)
            s_output = classifier(
                s_x_test, s_y_test, p_uuid, s_modelname, p_fileInfo, s_orgDf, p_batchFlag, p_batchId, s_optiFlag, s_originLabel, s_layerModelFlag, p_wkFlag)
    
    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return s_output
    else :
        return json.dumps(s_output)


# 시계열 모델
'''
p_df, p_windowSize, p_indexCol, p_targetCol, p_uuid, p_batchId, p_orgDf, p_scaleType, p_fileInfo, p_batchFlag, p_modelname
모델관리/모델운영 시계열
p_df: 예측데이터(설명, 종속변수 모두 있음)
p_windowSize: window size
p_indexCol: 인덱스 컬럼명
p_targetCol: 타겟 컬럼명
p_uuid: 모델관리uuid(모델id)
p_batchId: 모델운영 배치 id
p_orgDf: 원본데이터(스케일,원핫인코딩 x)
p_scaleType: 스케일링 유형
p_fileInfo:  파일정보
p_batchFlag: 모델운영일경우 True
p_modelname: 모델이름
'''
def timeseries(p_df, p_windowSize, p_indexCol, p_targetCol, p_uuid, p_batchId, p_orgDf, p_scaleType, p_fileInfo, p_batchFlag, p_modelname, p_wkFlag=False):
    import serviceUnmodel.keras_retinanet.utils.gpu as gpu_util
    gpu_util.setGPU()
    
    # 유저번호
    s_userno = p_fileInfo['USER_NO']

    # #180
    from serviceModel import timeseriesService
    s_df = timeseriesService.loadModelManagement(
        p_df, p_windowSize, p_indexCol, p_targetCol, p_uuid, p_orgDf, p_scaleType, p_fileInfo, p_modelname)
    
    # WP-57 1-3 LSTM 결과값 모델관리/모델운영 뒤에서 100개 나오게 로직 추가
    if len(s_df) >= 100:
        s_histIndex = s_df.index.astype(str).tolist()[-100:]
    else:
        s_histIndex = s_df.index.astype(str).tolist()
    s_df = s_df.reset_index()

    if len(s_df) >= 100:
        s_histData = s_df['pred_y'][-100:].tolist()
    else:
        s_histData = s_df['pred_y'].tolist()
        
    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return s_df
    
    # 배치실행이고 lstm일 경우
    if p_batchFlag:
        s_histDf = pd.DataFrame(s_histData, index=s_histIndex)
        s_histDf = s_histDf.T


        # 배치 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_batchId, s_df, 'batchResult', 'batch')
        # 배치 그래프파일
        fileService.saveModelResultCsv(s_userno, p_batchId, s_histDf, 'batchResult', 'histogram', p_filesystem='LOCAL')
        # 파일 또는 DB에 결과를 append, 또는 overwrite
        saveResultBatchData(s_df, s_userno, p_fileInfo)

        s_output = {"BATCH_ID": p_batchId,
                    "DATA_TYPE": p_fileInfo['dataType'],
                    "FILE_NAME": p_fileInfo['fileName'],
                    "LOG_ID": p_fileInfo['LOG_ID'],
                    "DBMS_TYPE": p_fileInfo['dbType'],
                    "dbName": p_fileInfo['dbName'],
                    "dbInfo": p_fileInfo['dbInfo'],
                    "ORIGIN_FILE": p_fileInfo['origin_file'],
                    "USER_NO": s_userno,
                    "DB_SCRIPT": ""}
       
    # 모델관리
    else:
        # 모델관리 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_uuid, s_df, 'deployResult', 'deploy')
        s_output = {"reVal": json.dumps(s_histData), "labelVal": json.dumps(s_histIndex), "uuid": p_uuid}

    return s_output


"""
모델관리/모델운영 회귀
p_x_test: 종속데이터
p_y_test: 타겟데이터(있을경우)
p_uuid: 모델관리uuid(모델id)
p_modelname: 모델이름
p_fileInfo:  파일정보
p_orgDf: 원본데이터(스케일,원핫인코딩 x)
p_batchFlag: 모델운영일경우 True
p_batchId: 모델운영 배치 id
p_optiFlag: 최적화일경우(현재사용x)
p_layerModelFlag: 사용자 정의 딥러닝 모델 여부(사용자 모델은 모델명으로 딥러닝 여부 확인할 수 없어서 추가)
"""
def regressor(p_x_test, p_y_test, p_uuid, p_modelname, p_fileInfo, p_orgDf, p_batchFlag, p_batchId, p_optiFlag, p_scaleType, p_layerModelFlag=False, p_wkFlag=False):
    # 유저번호
    s_userno = p_fileInfo['USER_NO']
    # 딥러닝플래그
    s_deepFlag = False
    # 예측변수
    s_predicted = None
    s_featureLog = None
    # cnn일 경우

    if p_modelname == 'cnn' or p_layerModelFlag:  
        import serviceUnmodel.keras_retinanet.utils.gpu as gpu_util
        gpu_util.setGPU()
        # 플래그를 True로
        s_deepFlag = True
        # if (p_layerModelFlag) :
        #     p_x_test = np.asarray(p_x_test)
        # else :
        #     p_x_test = p_x_test.to_numpy().reshape((p_x_test.shape[0], p_x_test.shape[1], 1))

    # 모델 로드    
    s_model = fileService.loadModelPkl('reg', p_modelname, s_userno, p_uuid, s_deepFlag)
   
    # s_deelFlag 될 경우 (Sequintal 모델 일 경우) layer 층 있으면 input_shape 보고 p_x_test 모양 결정
    if s_deepFlag and hasattr(s_model, 'layers'):
        s_layersOuputLen = len(s_model.layers[0].input_shape)

        if s_layersOuputLen == 2 :
            p_x_test = np.asarray(p_x_test)
        else :
            p_x_test = p_x_test.to_numpy().reshape((p_x_test.shape[0], p_x_test.shape[1], 1))

    # 모델 로드    
    s_model = fileService.loadModelPkl('reg', p_modelname, s_userno, p_uuid, s_deepFlag)
   
    
    try:
        # 모델운영이고 재학습일 경우 (최적화는 일단 주석처리함.)
        if(p_fileInfo['reLearnTF'] == 'Y' and p_batchFlag):
           
            s_model.fit(p_x_test, p_y_test)
            fileService.saveModelPkl(s_model, 'reg', p_modelname, s_userno, p_uuid)

    except KeyError:
        print('#############Key Error###################')

    try:
        # torch 모델일 때 예측
        if hasattr(s_model, 'state_dict') :
            import torch
            s_testColumn = p_x_test.columns
            s_orgColumn = p_orgDf.columns
            # WP-181 원본은 말그대로 원본데이터임, 학습데이터는 원본에 원핫 인코딩 작업하고 정렬한 다음타겟 빠져있는 상태

            # WP-181 일단 원본 데이터임 컬럼과 학습 데이터는 비교해서 둘다 있는거를 가져옴 (숫자유형 종류 같은거)
            s_sortOrgList= [a_column for a_column in s_orgColumn if a_column in s_testColumn]
            # WP-181 그 다음 학습 데이터과 원본 데이터 컬럼을 비교해서 학습프레임만 갖고 있는거를 가져옴 (숫자유형 종류 같은거)
            s_lastColumnList = [a_column for a_column in s_testColumn if a_column not in s_orgColumn]
            # WP-181 그다음 둘이 합침 = 원본 데이터 순서로 타겟이 빠진 상태로 원핫 인코딩만 한 데이터가 나옴
            p_x_test = p_x_test[s_sortOrgList + s_lastColumnList]

            s_x_test = torch.FloatTensor(p_x_test.to_numpy())

            s_targetData = p_fileInfo['torchScale']
            s_max = s_targetData['MAX']
            s_min = s_targetData['MIN']
            s_std = s_targetData['STD']
            s_mean = s_targetData['MEAN']
            s_q1 = s_targetData['Q1']
            s_q3 = s_targetData['Q3']
            with torch.no_grad():
                s_model.eval()
                s_predict_result = s_model(s_x_test).detach().numpy().flatten()
                
                #standard
                if p_scaleType == 'Standard Scale':
                    s_predicted = s_std * s_predict_result + s_mean
                #minmax
                elif p_scaleType == 'MinMax Scale':
                    s_predicted = (s_max - s_min) * s_predict_result + s_min
                #abs
                elif p_scaleType == 'MaxAbs Scale':
                    if abs(s_min)>= abs(s_max) :
                        s_denominator = abs(s_min)
                    else :
                        s_denominator = abs(s_max)
                    s_predicted = s_predict_result * s_denominator
                #Robust
                elif p_scaleType == 'Robust Scale':
                    s_predicted = (s_q1 - s_q3) * s_predict_result + ((s_min+s_max) / 2)
                #Normalize
                else : 
                    pass
        # 모델 예측
        else :
            s_predicted = s_model.predict(p_x_test)
            if p_layerModelFlag:
                s_predicted = s_predicted.flatten()
            elif s_deepFlag:
                s_predicted = s_predicted[:, 0]
    except ValueError as vex:
        print(vex)
        raise ValueError("입력 변수의 개수가 다릅니다.")
    except Exception as ex:
        print('에러가 발생 했습니다', ex)


    # 원본 데이터에 예측값 붙이기
    p_orgDf['wp_predict'] = s_predicted

    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return p_orgDf
    
    # 변수중요도
    if s_deepFlag or p_modelname in ["ensemble"]:
        s_featureLog = None
    else:
        if p_modelname == 'svm':
            s_perm = PermutationImportance(s_model, random_state=1).fit(p_x_test, p_y_test)
            # s_perm = permutation_importance(s_model, p_x_test.values, p_y_test.values, random_state=1)
            s_featureLog = featureService.getFeatureCoef(p_x_test, s_perm, p_modelname)
        else :
            s_featureLog = featureService.getFeatureCoef(p_x_test, s_model, p_modelname)

    # 모델운영(배치)
    if p_batchFlag:
        # 모델운영 그래프 데이터 
        try:
            s_hist, s_binEdges = np.histogram(s_predicted)
        except Exception as ex:
            print('에러가 발생 했습니다', ex)

        s_binEdges = np.round_(s_binEdges, 2)
        s_binEdges = np.delete(s_binEdges, -1)
        s_histDf = pd.DataFrame(s_hist, index=s_binEdges)
        s_histDf = s_histDf.T


         # 배치 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_batchId, p_orgDf, 'batchResult', 'batch')
        # 배치 그래프파일
        fileService.saveModelResultCsv(s_userno, p_batchId, s_histDf, 'batchResult', 'histogram', p_filesystem='LOCAL')
        # 변수 중요도 저장
        if s_featureLog != None:
            s_featureDf = pd.DataFrame(list(s_featureLog.items()), index=s_featureLog.keys())
            s_featureDf = pd.DataFrame(np.round_(p_orgDf['wp_predict'], 1))
            s_featureDf = s_featureDf.sort_index()
            s_featureDf = s_featureDf.T
            fileService.saveModelResultCsv(s_userno, p_batchId, s_featureDf, 'featureResult', 'feature')
        
        # 파일 또는 DB에 결과를 append, 또는 overwrite
        saveResultBatchData(p_orgDf, s_userno, p_fileInfo)

        s_output = {"BATCH_ID": p_batchId,
                    "DATA_TYPE": p_fileInfo['dataType'],
                    "FILE_NAME": p_fileInfo['fileName'],
                    "LOG_ID": p_fileInfo['LOG_ID'],
                    "DBMS_TYPE": p_fileInfo['dbType'],
                    "dbName": p_fileInfo['dbName'],
                    "dbInfo": p_fileInfo['dbInfo'],
                    "ORIGIN_FILE": p_fileInfo['origin_file'],
                    "USER_NO": s_userno,
                    "DB_SCRIPT": ""}

    else:
        # 모델관리 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_uuid, p_orgDf, 'deployResult', 'deploy')

        s_output = {"reVal": json.dumps(s_predicted.tolist()), "test_score": 0, "uuid": p_uuid, "featureLog": s_featureLog}
    
    return s_output




"""
모델관리/모델운영 분류
p_x_test: 종속데이터
p_y_test: 타겟데이터(있을경우)
p_uuid: 모델관리uuid(모델id)
p_modelname: 모델이름
p_fileInfo:  파일정보
p_orgDf: 원본데이터(스케일,원핫인코딩 x)
p_batchFlag: 모델운영일경우 True
p_batchId: 모델운영 배치 id
p_optiFlag: 최적화일경우(현재사용x)
p_originLabel: 타겟변수의 원래라벨값
p_layerModelFlag: 사용자 정의 딥러닝 모델 여부(사용자 모델은 모델명으로 딥러닝 여부 확인할 수 없어서 추가)
"""
def classifier(p_x_test, p_y_test, p_uuid, p_modelname, p_fileInfo, p_orgDf, p_batchFlag, p_batchId, p_optiFlag, p_originLabel=None, p_layerModelFlag=False, p_wkFlag=False):


    # 유저번호
    s_userno = p_fileInfo['USER_NO']
    # 딥러닝플래그
    s_deepFlag = False
    # cnn일 경우
    if p_modelname == 'cnn' or p_modelname =='dqn' or p_layerModelFlag:
        import serviceUnmodel.keras_retinanet.utils.gpu as gpu_util
        gpu_util.setGPU()
        # 딥러닝 플래그 True로
        s_deepFlag = True
        # if (p_layerModelFlag) :
        #     p_x_test = np.asarray(p_x_test)
        # elif p_modelname != 'dqn':
        #     p_x_test = p_x_test.to_numpy().reshape((p_x_test.shape[0], p_x_test.shape[1], 1))

    # 모델 로드  
    s_model = fileService.loadModelPkl('class', p_modelname, s_userno, p_uuid, s_deepFlag)
    
    if s_deepFlag and not hasattr(s_model, 'state_dict') :
        s_layersOuputLen = len(s_model.layers[0].input_shape)
        if s_layersOuputLen == 2 :
            p_x_test = np.asarray(p_x_test)
        else :
            p_x_test = p_x_test.to_numpy().reshape((p_x_test.shape[0], p_x_test.shape[1], 1))
    try:
        # 모델운영이고 재학습일 경우 (최적화는 일단 주석처리함.)
        if p_fileInfo['reLearnTF'] == 'Y' and p_batchFlag:
            # 재학습은 불가.
            # 재학습을 하려면 지금까지의 모든데이터로 해야지 재학습이 되는 것.
            # 신규데이터로만 한다면 지금까지 학습한데이터의 대한 모든 모델 정보는 잃어버림.
            s_model.fit(p_x_test, p_y_test)
            fileService.saveModelPkl(s_model, 'class', p_modelname, s_userno, p_uuid)
    except KeyError as keyerr:
        print('#############Key Error###################')
        print(keyerr)

    # 모델 예측
    try:
        # WP-177 Torch 모델일 경우
        if hasattr(s_model, 'state_dict') :
            import torch
            p_x_test = torch.FloatTensor(p_x_test.to_numpy())
            with torch.no_grad():
                s_model.eval()
                s_predicted = s_model(p_x_test)
            s_predicted = torch.argmax(s_predicted, dim=1)
        # WP-177 그외 다른 모델일 경우
        else :
            s_predicted = s_model.predict(p_x_test)
            # WP-177 사용자 생성 모델일 경우
            if s_deepFlag:
                s_predicted = np.argmax(s_predicted, axis=1)
    except ValueError as vex:
        print(vex)
        raise ValueError("입력 변수의 개수가 다릅니다.")
    except Exception as ex:
        print('에러가 발생 했습니다', ex)

    # 라벨인코더 초기화
    s_le = LabelEncoder()
    s_le.classes_ = np.asarray(p_originLabel)
    # 분류예측값 원래값으로 iverse하고 원본데이터에 예측값 붙이기
    p_orgDf['wp_predict'] = s_le.inverse_transform(s_predicted)

    # 변수중요도
    if s_deepFlag or p_modelname in ["multilayerperceptron", "ensemble"]:
        s_featureLog = None
    else:
        s_featureLog = featureService.getFeatureCoef(p_x_test, s_model, p_modelname)

    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return p_orgDf
    
    # 모델운영(배치)
    if p_batchFlag:
        # 모델운영 그래프 데이터 
        s_label, s_count = np.unique(s_predicted, return_counts=True)
        s_histDf = pd.DataFrame(s_count, index=s_label)
        s_histDf = s_histDf.T

        # 배치 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_batchId, p_orgDf, 'batchResult', 'batch')
        # 배치 그래프파일
        fileService.saveModelResultCsv(s_userno, p_batchId, s_histDf, 'batchResult', 'histogram', p_filesystem='LOCAL')
        # 변수 중요도 저장
        if s_featureLog != None:
            s_featureDf = pd.DataFrame(list(s_featureLog.items()), index=s_featureLog.keys())
            s_featureDf = s_featureDf.T
            fileService.saveModelResultCsv(s_userno, p_batchId, s_featureDf, 'featureResult', 'feature')
        
        # 파일 또는 DB에 결과를 append, 또는 overwrite
        saveResultBatchData(p_orgDf, s_userno, p_fileInfo)

        s_output = {"BATCH_ID": p_batchId,
                    "DATA_TYPE": p_fileInfo['dataType'],
                    "FILE_NAME": p_fileInfo['fileName'],
                    "LOG_ID": p_fileInfo['LOG_ID'],
                    "DBMS_TYPE": p_fileInfo['dbType'],
                    "dbName": p_fileInfo['dbName'],
                    "dbInfo": p_fileInfo['dbInfo'],
                    "ORIGIN_FILE": p_fileInfo['origin_file'],
                    "USER_NO": s_userno,
                    "DB_SCRIPT": ""}
           
    # 모델 관리
    else:
         # 모델관리 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_uuid, p_orgDf, 'deployResult', 'deploy')

        s_output = {"reVal": json.dumps(s_predicted.tolist()), "accuracy": "", "uuid": p_uuid, "featureLog": s_featureLog}


    return s_output

"""
모델관리/모델운영 추천
p_x_test: 종속데이터
p_uuid: 모델관리uuid(모델id)
p_modelname: 모델이름
p_fileInfo:  파일정보
p_orgDf: 원본데이터(스케일,원핫인코딩 x)
p_batchFlag: 모델운영일경우 True
p_batchId: 모델운영 배치 id
p_optiFlag: 최적화일경우(현재사용x)
"""
def recommend(p_x_test, p_uuid, p_modelname, p_fileInfo, p_orgDf, p_modelParam, p_batchFlag, p_batchId, p_optiFlag, p_wkFlag=False):
    # 유저번호
    s_userno = p_fileInfo['USER_NO']

    # 모델로드
    s_model = fileService.loadModelPkl('recommend', p_modelname, s_userno, p_uuid)
    
    s_modelParam = p_modelParam
    s_userCol = next(map(lambda idx: idx['PARAM_VALUE']['VALUE'], filter(lambda idx: idx.get('PARAM_NM') == 'user', s_modelParam)), None)
    s_itemCol = next(map(lambda idx: idx['PARAM_VALUE']['VALUE'], filter(lambda idx: idx.get('PARAM_NM') == 'item', s_modelParam)), None)
    s_rateCol = next(map(lambda idx: idx['PARAM_VALUE']['VALUE'], filter(lambda idx: idx.get('PARAM_NM') == 'rating', s_modelParam)), None)
    s_rateCol = None
    
    s_colNms = [s_userCol,s_itemCol]
    s_x_test = p_x_test[s_colNms]
    s_x_test['s_rateCol'] = None
    s_testset = s_x_test.apply(tuple, axis=1)
     # 모델 예측
    try:
        s_predicted = s_model.test(s_testset)
    except ValueError as vex:
        print(vex)
        raise ValueError("입력 변수의 개수가 다릅니다.")
    except Exception as ex:
        print('에러가 발생 했습니다', ex)

    p_orgDf['wp_predict'] = [pred.est for pred in s_predicted]
    p_orgDf['wp_predict'].round(3)
    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return p_orgDf
    
    # 모델운영(배치)
    if p_batchFlag:
        # 모델운영 그래프 데이터 
        print("추가해야됨")
         
    else:
        # 모델관리 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_uuid, p_orgDf, 'deployResult', 'deploy')
        # 모델관리 그래프 데이터
        from serviceModel import recommendService
        s_topItem = recommendService.get_top_n(s_predicted)
        if len(s_topItem)>3:
            s_topItem = dict(list(s_topItem.items())[:3])  
            s_reVal = {key: [item[0] for item in value] for key, value in s_topItem.items()}    
        else:
            s_reVal = {key: [item[0] for item in value] for key, value in s_topItem.items()}  
                            
        s_output = {"reVal": json.dumps(s_reVal), "uuid": p_uuid}

    return s_output


"""
모델관리/모델운영 군집
p_x_test: 종속데이터
p_uuid: 모델관리uuid(모델id)
p_modelname: 모델이름
p_fileInfo:  파일정보
p_orgDf: 원본데이터(스케일,원핫인코딩 x)
p_batchFlag: 모델운영일경우 True
p_batchId: 모델운영 배치 id
p_optiFlag: 최적화일경우(현재사용x)
"""
def clustering(p_x_test, p_uuid, p_modelname, p_fileInfo, p_orgDf, p_batchFlag, p_batchId, p_optiFlag, p_wkFlag=False):

    # 유저번호
    s_userno = p_fileInfo['USER_NO']

    # 모델로드
    s_model = fileService.loadModelPkl('cluster', p_modelname, s_userno, p_uuid)
    
    try:
        # 모델운영이고 재학습일 경우 (최적화는 일단 주석처리함.)
        if p_fileInfo['reLearnTF'] == 'Y' and p_batchFlag:
            s_model.fit(p_x_test)
            fileService.saveModelPkl(s_model, 'cluster', p_modelname, s_userno, p_uuid)
    except KeyError:
        print('#############ModelManagement Pkl Save Error###################')

     # 모델 예측
    try:
        s_predicted = s_model.fit_predict(p_x_test)
    except ValueError as vex:
        print(vex)
        raise ValueError("입력 변수의 개수가 다릅니다.")
    except Exception as ex:
        print('에러가 발생 했습니다', ex)


    # 원본데이터에 예측값 붙이기
    p_orgDf['Cluster_Label'] = s_predicted
    p_x_test['Cluster_Label'] = s_predicted

    # 플랫폼에서는 예측값 붙은 데이터 반환
    if p_wkFlag:
        return p_orgDf
    
    # 모델운영(배치)
    if p_batchFlag:
        # 모델운영 그래프 데이터 
        s_label, s_count = np.unique(p_x_test['Cluster_Label'], return_counts=True)
        s_histDf = pd.DataFrame(s_count, index=s_label)
        s_histDf = s_histDf.T
        # 배치 결과 파일

        fileService.saveModelResultCsv(s_userno, p_batchId, p_orgDf, 'batchResult', 'batch')
        # 배치 그래프파일
        fileService.saveModelResultCsv(s_userno, p_batchId, s_histDf, 'batchResult', 'histogram', p_filesystem='LOCAL')
        
        # 파일 또는 DB에 결과를 append, 또는 overwrite
        saveResultBatchData(p_orgDf, s_userno, p_fileInfo)

        s_output = {"BATCH_ID": p_batchId,
                    "DATA_TYPE": p_fileInfo['dataType'],
                    "FILE_NAME": p_fileInfo['fileName'],
                    "LOG_ID": p_fileInfo['LOG_ID'],
                    "DBMS_TYPE": p_fileInfo['dbType'],
                    "dbName": p_fileInfo['dbName'],
                    "dbInfo": p_fileInfo['dbInfo'],
                    "ORIGIN_FILE": p_fileInfo['origin_file'],
                    "USER_NO": s_userno,
                    "DB_SCRIPT": ""}
         
    else:
        # 모델관리 결과 파일 
        fileService.saveModelResultCsv(s_userno, p_uuid, p_orgDf, 'deployResult', 'deploy')
        # 모델관리 그래프 데이터
        s_svd = TruncatedSVD(n_components=2)
        s_svd_df = pd.DataFrame(s_svd.fit_transform(p_x_test), columns=[
            'x', 'y'], index=p_x_test.index)
        s_svd_df['Cluster_Label'] = p_x_test['Cluster_Label']
        s_svd_json = s_svd_df.to_json(orient='columns')

        s_output = {"reVal": s_svd_json, "uuid": p_uuid}


    return s_output


"""
모델운영 결과파일을 각각 저장하는게 아닌
하나의 테이블 또는 DB에 저장
p_df: 결과데이터
s_userno: 유저번호
p_fileInfo: 저장할 파일 정보(파일명, db접속정보등 )
"""
def saveResultBatchData(p_df, s_userno, p_fileInfo):
    # 파일 저장 위치(LOCAL, HDFS, DBMS)
    s_storageType = p_fileInfo['storageFileType']
    s_filename = p_fileInfo['storageName']
    
    # SAVE DB
    if s_storageType == 'DS_VIEW':
        from serviceDatabase import databaseService
        s_dbInfo = p_fileInfo['storageInfo']
        databaseService.saveDatabase(s_userno, s_filename, p_df, s_dbInfo, p_fileInfo['storageMode'])
    # SAVE HDFS, LOCAL
    else:
        # 파일 저장 모드(append, overwrite 기본은 overwrite)
        s_mode = 'w'
        if str(p_fileInfo['storageMode']) == 'append':
            s_mode = 'a'
        fileService.saveModelResultCsv(s_userno, s_filename, p_df, 'batchResult', None, p_mode=s_mode)

"""
플랫폼 모델 예측에서 사용하는 데이터 반환 (바로 model management 함수 태우면 되는 형태)
p_modelId: DP_MODEL_MSTR MODEL_ID
p_modelIdx: DP_MODEL_MSTR MODEL_IDX
p_modelComId: 모델 컴포넌트의 comId (상위 연결된 모델 컴포넌트를 예측에 사용할 때 필요)
p_userno: USER_NO
p_userID: USER_ID
p_batchData: 배치 실행시 DB 조회 불가능하기 때문에 직접 파라미터 정보를 담아서 보냄.
"""
def getWkTestRunData(p_modelId, p_modelIdx, p_modelComId, p_userno, p_userId, p_batchData=None):
    s_storageType = getConfig('', 'STORAGE_TYPE')
    s_dbMng = WpDataBaseManagement('meta', False)
    s_modelId = p_modelId
    s_modelIdx = p_modelIdx   

    # p_batchData - 배치에서 상위 컴포넌트에서 실행한 모델로 예측값을 붙이고 싶은경우 
    if p_batchData is not None:
        s_modelId = p_batchData['modelId']
        s_modelIdx = p_batchData['modelIdx']
        s_dpModelMstrData = p_batchData['modelParams']['algorithmInfo']['algorithm']
        s_dpModelMstrData['ARG_NM'] = s_dpModelMstrData['ARG_FILE_NAME']
        s_dpModelMstrData['MODEL_OPTIMIZER_YN'] = 'Y' if p_batchData['modelParams']['algorithmInfo']['optimizer'] else 'N'
        s_dpModelMstrData['USER_PREPROCESSING'] = None
        s_dpModelMstrData['MODEL_EVAL_TYPE'] = s_dpModelMstrData['ARG_TYPE']
        s_dpModelMstrData['MODEL_EVAL_RESULT'] = json.loads(p_batchData['modelRunResult'])['reVal']['uuid']
        s_dpModelMstrData['MODEL_ARG_PARAM'] = json.dumps(p_batchData['modelParams']['algorithmInfo']['parameter'], default=str)
        s_dpModelMstrData['MODEL_PART_OPTION'] = p_batchData['modelParams']['partitionInfo']
        s_dpModelMstrData['MODEL_FEATURE_TYPE'] = p_batchData['modelParams']['scaleInfo']

        s_targetCol = p_batchData['modelParams']['targetCol']
        s_cleanDataInfo = []
        s_selectedFeatureCols = p_batchData['modelParams']['featureInfo']['featureList']

        s_dpVarMstrData = getWkDpVarMstrData(p_batchData['modelParams']['varInfo'], p_modelId, p_modelIdx, '', s_targetCol)
        s_data = {"dbscanCluster": p_batchData['modelParams'].get('dbscanCluster', None)}
        s_labelList = json.loads(p_batchData['modelParams']['featureInfo']['labelData']) if type(p_batchData['modelParams']['featureInfo']['labelData'])==str else p_batchData['modelParams']['featureInfo']['labelData']
        s_dpVarStrExMstrData = getWkDpVarStrExData(p_batchData['modelParams']['varInfo'],p_batchData['modelParams']['algorithmInfo'],s_modelId,s_modelIdx,'', s_labelList, s_targetCol, s_selectedFeatureCols, s_data)
        
    # 일반 모델 예측 케이스
    else :
        if p_modelComId != '':
            s_dpModelWorkflowUserMstr = s_dbMng.select('DP_MODEL_WORKFLOW_USE_MSTR', {"COM_ID":p_modelComId} )
            s_dpModelWorkflowUserMstr = s_dpModelWorkflowUserMstr.sort_values(by=['MODEL_ID','MODEL_IDX'], ascending= False).iloc[0]
            s_modelId = s_dpModelWorkflowUserMstr['MODEL_ID']
            s_modelIdx = s_dpModelWorkflowUserMstr['MODEL_IDX']

        s_dpModelMstrData = s_dbMng.getModelList(p_userno,s_modelId, '', s_storageType)
        s_dpModelMstrData = s_dpModelMstrData.iloc[0]
        
        s_targetCol = ""
        s_cleanDataInfo = []
        s_dpVarMstrData = s_dbMng.select('DP_VAR_MSTR', {"MODEL_ID":s_modelId, "MODEL_IDX":s_modelIdx})
        s_dpVarStrExMstrData = s_dbMng.select('DP_VAR_STR_EX_MSTR', {"MODEL_ID":s_modelId, "MODEL_IDX":s_modelIdx})

        # DP_VAR_MSTR
        for i in range(len(s_dpVarMstrData)):
            tempClean = json.loads(s_dpVarMstrData.iloc[i]['VAR_PRE'])
            if tempClean['duplication']['use'] == True or tempClean['missing']['use'] == True or tempClean['outlier']['use'] == True:
                tempData = {
                    "Type": "CleanData",
                    "Column": s_dpVarMstrData.iloc[i]['VAR_NM'],
                    "ColumnType": "categorical",
                    "Value": json.loads(s_dpVarMstrData.iloc[i]['VAR_PRE'])
                }
                s_cleanDataInfo.append(tempData)
        
        # get target column
        if s_dpModelMstrData['MODEL_EVAL_TYPE'] != "Clustering" and s_dpModelMstrData['MODEL_EVAL_TYPE'] != "Recommend" :
            s_targetIndex = list(s_dpVarMstrData['VAR_TARGET_YN']).index('Y')
            s_targetCol = s_dpVarMstrData.iloc[s_targetIndex]['COL_NM']

    s_layerModelYn = s_dpModelMstrData.get('LAYER_YN','N')
    s_blockModelYn = s_dpModelMstrData.get('BLOCK_YN','N')
    s_pytorchModelYn = s_dpModelMstrData.get('PYTORCH_YN','N')

    if s_layerModelYn == 'N' :
        s_layerModelYn = s_pytorchModelYn

    s_argInfo = {
        "name": s_dpModelMstrData['ARG_NM'],
        # "param": s_schLogData if s_schLogData else json.loads(s_dpModelMstrData['MODEL_ARG_PARAM']) ,
        "param": json.loads(s_dpModelMstrData['MODEL_ARG_PARAM']) ,
        "option": s_dpModelMstrData['MODEL_PART_OPTION'],
        "scaleType": s_dpModelMstrData['MODEL_FEATURE_TYPE'],
        "layerModelYn": s_layerModelYn,
        "blockModelYn": s_blockModelYn,
        "modelParam": json.loads(s_dpModelMstrData['MODEL_ARG_PARAM']) 
    }
    
    # DP_VAR_STR_EX_MSTR
    s_dpVarMstrData['VAR_EX'] = [[] for x in range(len(s_dpVarMstrData))]

    for i in range(len(s_dpVarMstrData)):
        if s_dpVarMstrData.iloc[i]['VAR_TYPE'] == "categorical" : 
            for j in range(len(s_dpVarStrExMstrData)):
                if s_dpVarStrExMstrData.iloc[j]['COL_NM'] == s_dpVarMstrData.iloc[i]['COL_NM'] :
                    s_dpVarMstrData.iloc[i]['VAR_EX'].append(s_dpVarStrExMstrData.iloc[j]['VAR_NM'])
    
    s_torchScalerData = None
    #  PYTORCH PARAMETER
    if s_pytorchModelYn == 'Y' and s_dpModelMstrData['MODEL_EVAL_TYPE'] == "Regression": 
        s_argInfo['layerModelYn'] = 'Y'
        s_targetColIndex = list(s_dpVarMstrData['VAR_NM'] == s_targetCol).index(True)
        s_torchTargetParam = s_dpVarMstrData.iloc[s_targetColIndex]
        s_torchScalerData = {
            "MIN": s_torchTargetParam['VAR_MIN'], "MAX": s_torchTargetParam['VAR_MAX'],
            "STD": s_torchTargetParam['VAR_STD_DEV'], "MEAN": s_torchTargetParam['VAR_MEAN'],
            "Q1": s_torchTargetParam['VAR_1Q'], "Q3": s_torchTargetParam['VAR_3Q']
        }

    # lstm 에서 실제 이 변수 쓰는지 확인 필요
    if s_argInfo['name'] == 'lstm' or s_argInfo['name'] == 'rnn' :
        s_deepArgParse = json.loads(s_argInfo['option'])
        s_now = datetime.today()
        try :
            s_deepArgParse['option']['Range'] = s_now.strftime("%Y-%m-%d %H:%M:%S")
            s_deepArgParse['option']['End'] = (s_now + timedelta(days=60)).strftime("%Y-%m-%d %H:%M:%S") ;
            s_argInfo['option'] = json.dumps(s_deepArgParse)
        except Exception as e:
            print(e)

    s_params = {
        "fileName": json.dumps({
            "USER_ID": p_userId,
            "USER_NO": p_userno,
            "reLearnTF": 'N',
            "optimizer": s_dpModelMstrData['MODEL_OPTIMIZER_YN'],
            "torchScale": s_torchScalerData,
            "userPreprocessing": s_dpModelMstrData['USER_PREPROCESSING'],
        },default=str),
        "modelType": s_dpModelMstrData['MODEL_EVAL_TYPE'],
        "uuid": s_dpModelMstrData['MODEL_EVAL_RESULT'],
        "argNm": json.dumps(s_argInfo, default=str),
        "parameter": json.dumps(s_dpVarMstrData.to_dict('records'), default=str),
        "cleanInfo": json.dumps(s_cleanDataInfo, default=str)
    }

    return s_params

"""
플랫폼 배치 실행시 DP_VAR_MSTR에 배치가 종료된 후 정보가 추가되므로
DB 조회를 하지 않고 DP_VAR_MSTR 데이터 형태로 변환
"""
def getWkDpVarMstrData(p_varInfo, p_modelId, p_modelIdx, p_datasetName, p_targetCol):
    s_dpVarTemp = []
    for s_varData in p_varInfo:
        varItem = {
        "MODEL_ID": p_modelId,
        "MODEL_IDX": p_modelIdx,
        "VAR_NM": s_varData['NAME'],
        "DS_VIEW_ID": '0',
        "TBL_NM": p_datasetName,
        "COL_NM": s_varData['NAME'],
        "VAR_TARGET_YN": 'Y' if s_varData['NAME'] == p_targetCol else 'N',
        "VAR_MAJOR_YN": 'Y' if s_varData['USE'] else 'N',
        "VAR_CAPTION": s_varData['NAME'],
        "VAR_TYPE": s_varData['TYPE'],
        "DATA_TYPE": s_varData['TYPE'],
        "VAR_IMPORT": 'Y' if s_varData['USE'] else 'N',
        "VAR_RANK": '',
        "VAR_UNI_CNT": s_varData['UNIQUE_VALUE'],
        "VAR_MISS_CNT": s_varData['MISSING'],
        "VAR_MIN": 0,
        "VAR_MAX": 0,
        "VAR_MEAN": 0,
        "VAR_STD_DEV": 0,
        "VAR_1Q": 0,
        "VAR_2Q": 0,
        "VAR_3Q": 0,
        "VAR_4Q": 0,
        "VAR_DESC": '',
        "VAR_PRE": '{"duplication":{"value":"clean","delete":false,"use":false},"missing":{"value":"clean","delete":false,"use":false},"outlier":{"value":"clean","delete":false,"use":false}}',
        "VAR_EX": []
        }
        s_dpVarTemp.append(varItem)
    return pd.DataFrame(s_dpVarTemp)

"""
플랫폼 배치 실행시 DP_VAR_STR_EX_MSTR에 배치가 종료된 후 정보가 추가되므로
DB 조회를 하지 않고 DP_VAR_STR_EX_MSTR 데이터 형태로 변환
"""
def getWkDpVarStrExData(p_varInfo, p_algorithmInfo, p_modelId, p_modelIdx, p_datasetName, p_labelList, p_targetCol, p_selectedFeatureCols, p_data):
    s_dpVarExTemp = []
    if p_algorithmInfo['algorithm']['ARG_TYPE'] == "Classification" or p_algorithmInfo['algorithm']['ARG_TYPE'] == "Regression" or p_algorithmInfo['algorithm']['ARG_TYPE'] == "Reinforcement" :
        for s_varData in p_varInfo:
            if p_targetCol == s_varData['NAME'] and s_varData['TYPE'] == 'categorical':
               for lIdx in p_labelList['label'] : 
                    
                    varExItem = {
                        "MODEL_ID": p_modelId,
                        "MODEL_IDX": p_modelIdx,
                        "TBL_NM": p_datasetName,
                        "COL_NM": s_varData['NAME'],
                        "VAR_NM": p_labelList['labelVal'].get(p_labelList['label'][lIdx], str(p_labelList['label'][lIdx])),
                        "VAR_TARGET_YN": 'Y',
                        "LABEL_VAL": p_labelList['label'][lIdx]
                    }
                    s_dpVarExTemp.append(varExItem)
                
            for sCol in p_selectedFeatureCols :
                if sCol['FEATURE'] == s_varData['NAME'] :
                    break
                else :
                    if s_varData['TYPE'] == 'categorical' :
                        #170 카테고리 변수 prefix 변경
                        pattern  = rf'^{s_varData["NAME"]}＿'
                        if re.match(pattern , sCol['FEATURE']):
                            varExItem = {
                                "MODEL_ID": p_modelId,
                                "MODEL_IDX": p_modelIdx,
                                "TBL_NM": p_datasetName,
                                "COL_NM": s_varData['NAME'],
                                "VAR_NM": sCol['FEATURE'],
                                "VAR_TARGET_YN": 'N',
                                "LABEL_VAL": 0
                            }
                            s_dpVarExTemp.append(varExItem)
             
    if p_algorithmInfo['algorithm']['ARG_TYPE'] == "Clustering":
        if (p_algorithmInfo['algorithm']['ARG_ID'] != 18) :
            clusterLabel = list(filter(lambda pVar: pVar['PARAM_NM']=='n_clusters', p_algorithmInfo['parameter']))
            if len(clusterLabel) == 0:
                clusterLabel = list(filter(lambda pVar: pVar['PARAM_NM']=='min_samples', p_algorithmInfo['parameter']))
            
            if len(clusterLabel) == 0:
                clusterLabel = list(filter(lambda pVar: pVar['PARAM_NM']=='n_components', p_algorithmInfo['parameter']))

            tmpParamValue = clusterLabel[0]['PARAM_VALUE']
            clusterLabelNum = int(tmpParamValue['VALUE'])
            for sIdx in range(clusterLabelNum):
                varExItem = {
                    "MODEL_ID": p_modelId,
                    "MODEL_IDX": p_modelIdx,
                    "TBL_NM": p_datasetName,
                    "COL_NM": '',
                    "VAR_NM": 'Label_' + str(sIdx),
                    "VAR_TARGET_YN": 'N',
                    "LABEL_VAL": sIdx
                }
                s_dpVarExTemp.append(varExItem)


        else :
            s_dbscanCluster = p_data['dbscanCluster']

            for idx in range(len(s_dbscanCluster)):
                varExItem = {
                    "MODEL_ID": p_modelId,
                    "MODEL_IDX": p_modelIdx,
                    "TBL_NM": p_datasetName,
                    "COL_NM": '',
                    "VAR_NM": 'Label_' + str(s_dbscanCluster[idx]),
                    "VAR_TARGET_YN": 'N',
                    "LABEL_VAL": s_dbscanCluster[idx]
                }

                if any(sVarExItem['COL_NM ']== varExItem['COL_NM'] and sVarExItem['LABEL_VAL'] == varExItem['LABEL_VAL'] and sVarExItem['VAR_NM'] == varExItem['VAR_NM'] for sVarExItem in s_dpVarExTemp):
                    s_dpVarExTemp.append(varExItem)

    return pd.DataFrame(s_dpVarExTemp)


def permutation_importance(model, X, y, metric=accuracy_score, n_repeats=10, random_state=None):
    if random_state is not None:
        np.random.seed(random_state)

    baseline_score = metric(y, model.predict(X))
    importances = np.zeros(X.shape[1])

    for col in range(X.shape[1]):
        scores = np.zeros(n_repeats)
        X_permuted = X.copy()

        for n in range(n_repeats):
            np.random.shuffle(X_permuted[:, col])
            score = metric(y, model.predict(X_permuted))
            scores[n] = baseline_score - score  # Difference in score

        importances[col] = np.mean(scores)

    return importances

def putModelQ(q, data, modelType, uuid, argNm, params):
    q.put(ModelRun(data, modelType, uuid, params))