import importlib.util
import sys
import json
from typing import List
import pandas as pd
from dateutil.parser import parse
from sklearn.preprocessing import LabelEncoder, StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
from sklearn.model_selection import train_test_split
import matplotlib
matplotlib.use('AGG')
import matplotlib.pyplot as plt
import shap
import io
import base64
from dataclasses import asdict
import os
import numpy as np
from model.algorithm.att.WP_ALGORITHM_ATT import ALGORITHM_ATT,OPTIMIZER_ATT,ARG_PARAMETER_ATT
from model.algorithm.att.WP_VAR_ATT import DP_VAR_MSTR_ATT, OPTION_ATT, PARTITION_ATT
from serviceData.dataSourceService import dataSource
# shap 그래프 한글 깨져서 아래내용 추가.
plt.rcParams["font.family"] = "Gulim"

'''
모델 실행
p_df: 모델 실행 데이터
p_fileInfo: 파일 정보
p_function: 모델명
p_params: 모델 파라미터
p_dataSource: dataSourceService의 dataSource 객체
s_wkFlag: Run_WkModel을 통해 실행되는 경우 True (default: False)
(예측 컴포넌트 생성으로 미사용) s_wkPredictSaveFlag: 예측값을 원 데이터에 붙여서 저장하는 경우 True (default: False)
'''
def runModel(p_df, p_fileInfo, p_function, p_params, p_dataSource:dataSource, s_wkFlag=False):
    from model.modelManagement import WiseModelManagement
    s_path = os.path.dirname(os.path.realpath(__file__))
    p_params = json.loads(p_params)
    # WPLAT-298 검증데이터 비율 설정에서 LOOCV 일 때 데이터 1000건 이상이면 데이터 분할 20%로 맞춰서 진행하게 변경
    if p_params['partitionInfo']['type'] == 't-loocv' and len(p_df) > 1000 :
        p_params['partitionInfo']['type'] = 't-holdout'
        p_params['partitionInfo']['option'] = '20'

    # optimizerType없을경우
    p_params['algorithmInfo']['optimizerType'] = p_params['algorithmInfo'].get('optimizerType', '')
    
    s_wiseMm = WiseModelManagement(p_dataSource.o_storageManager,{}, str(p_fileInfo['USER_NO']))
    s_dataVar:List[DP_VAR_MSTR_ATT] = [] 
    s_targetColumn = ''
    s_param:List[ARG_PARAMETER_ATT] = [] 
    # 앙상블일 경우
    if p_function == 'ensemble':
        for item in p_params['algorithmInfo']['parameter'] :
            for item2 in item['param'] :
                s_param.append(
                    ARG_PARAMETER_ATT(ARG_ID=item2['ARG_ID'],
                                    PARAM_NM=item2['PARAM_NM'],
                                    PARAM_VALUE=item2['PARAM_VALUE'],
                                    PARAM_DEFAULT=item2['PARAM_DEFAULT'],
                                    PARAM_DESC=item2['PARAM_DESC'])
                )
    else:
        for item in p_params['algorithmInfo']['parameter'] :
            s_param.append(
                ARG_PARAMETER_ATT(ARG_ID=item['ARG_ID'],
                                PARAM_NM=item['PARAM_NM'],
                                PARAM_VALUE=item['PARAM_VALUE'],
                                PARAM_DEFAULT=item['PARAM_DEFAULT'],
                                PARAM_DESC=item['PARAM_DESC'])
            )
    
    s_arg:ALGORITHM_ATT = ALGORITHM_ATT(
        argorithm = p_params['algorithmInfo']['algorithm'],
        parameter = s_param,
        optimizer = OPTIMIZER_ATT(
            name = '',
            type = p_params['algorithmInfo']['optimizerType'],
            use = False
        ),
        smote = p_params['algorithmInfo']['smote'],
        imbalance = p_params['algorithmInfo']['imbalance']
    )
    s_partitionInfo:PARTITION_ATT = PARTITION_ATT(
        value = p_params['partitionInfo']['value'],
        type = p_params['partitionInfo']['type'],
        use = True,
        option = OPTION_ATT(
            value = p_params['partitionInfo']['option'],
            type = p_params['partitionInfo']['type'],
        )
    )
    for item in p_params['varInfo'] : 
        
        s_dataVar.append(DP_VAR_MSTR_ATT(
            COL_NM = item['NAME'],
            DATA_TYPE = item['TYPE'],
            VAR_TARGET_YN = item['TARGET'],
            VAR_MAJOR_YN = item['USE'],
            VAR_IMPORT = item['USE'],
            VAR_MIN = item['MIN'],
            VAR_MAX = item['MAX'],
            VAR_1Q = item['Q1'],
            VAR_3Q = item['Q3'],
            VAR_UNI_CNT = item['UNIQUE_VALUE'],
            VAR_MISS_CNT = item['MISSING'],
            VAR_MEAN = item['MEAN'],
            VAR_STD_DEV = item['STDDEV']
        ))
    
    if p_function == 'ensemble':
        s_modelList = p_params['ensembleModel'] # 앙상블 모델리스트

        s_ensembleList = [] # 모델 담을 리스트

        # 앙상블 모델리스트 loop
        for model in s_modelList:
            # 파라미터 설정
            s_function = model['arg']['argFunc'] # 모델별 알고리즘
            model['ensemble'] = p_params['ensemble'] # ensemble 유무(true, false)
            model['targetType'] = p_params['targetType'] # 타겟타입(회귀인지 분류인지)
            
            # 모델리스트 실행
            s_spec = importlib.util.spec_from_file_location("run_processing", f"{s_path}/model/" + s_function + ".py")
            s_model = importlib.util.module_from_spec(s_spec)
            
            sys.modules[s_spec.name] = s_model
            s_spec.loader.exec_module(s_model)

            s_model = s_model.run_processing(p_df, p_fileInfo, model)
            
            s_ensembleList.append((s_function, s_model)) # 모델 리스트에 담기

    s_output = s_wiseMm.execute_algorithm(s_dataVar,s_arg,s_partitionInfo,p_df)
  
    # WP-155 실행 결과에 라벨 정보 저장
    s_tmpOutput = s_output
    s_labelData = p_params.get('featureInfo', {}).get('labelData', {})
    s_tmpOutput.labelData = s_labelData

    s_output = json.dumps(asdict(s_tmpOutput))
    return s_output


'''
데이터 스케일링한 데이터, 스케일러
p_df: 스케일링 대상 데이터
p_scaleType: 스케일링 종류
'''
def getScaleData(p_df,p_scaleType='standard'):
    try:
        if (p_scaleType == 'MinMax Scale'):
            s_scaler = MinMaxScaler().fit(p_df)
            s_df = pd.DataFrame(s_scaler.transform(p_df), columns=p_df.keys(), index=p_df.index)
        elif (p_scaleType == 'Robust Scale'):
            s_scaler = RobustScaler().fit(p_df)
            s_df = pd.DataFrame(s_scaler.transform(p_df), columns=p_df.keys(), index=p_df.index)
        elif (p_scaleType == 'MaxAbs Scale'):
            s_scaler = MaxAbsScaler().fit(p_df)
            s_df = pd.DataFrame(s_scaler.transform(p_df), columns=p_df.keys(), index=p_df.index)
        elif (p_scaleType == 'Normalize'):
            s_scaler = Normalizer().fit(p_df)
            s_df = pd.DataFrame(s_scaler.transform(p_df), columns=p_df.keys(), index=p_df.index)
        else:
            s_scaler = StandardScaler()
            s_scaler.fit(p_df)
            s_df = pd.DataFrame(s_scaler.transform(p_df), columns=p_df.keys(), index=p_df.index)
        return s_df, s_scaler

    except Exception as ex:
        print(ex)
        # o_logger.info('######## setScaleDataError########')
        # o_logger.info(ex)
        return None

'''
모델 실행전에 최종적으로 변수에 대한 설정(특징 선택)
p_df: 데이터프레임
p_varInfo: 데이터탐색 변수 array
p_featureInfo: feature Importance에서 나온 값
p_targetCol: 타겟컬럼명
'''
def setFinalFeature(p_df, p_varInfo, p_featureInfo, p_targetCol):
    # o_logger.info('######## Feature Setting Start########')


    try:
        s_targetColValue = []
        s_targetColType = ''
        s_modelFeature = []
        s_Le = LabelEncoder()

        # s_modelFeature : Array 형태로 된 선택된 feauture (타겟변수까지 포함)
        if p_featureInfo is None: 
            s_modelFeature = p_df.columns
        else :
            for s_feature in p_featureInfo:
                if s_feature['USE'] == True:
                    s_modelFeature.append(s_feature['FEATURE'])

        if p_targetCol != None:
            if p_targetCol not in s_modelFeature: 
                s_modelFeature.append(p_targetCol)
        
        p_unFeature = list(set(p_df.columns) - set(s_modelFeature))

        p_df.drop(columns=p_unFeature, inplace=True)
        # s_targetColType : 타겟 컬럼 타입 확인
        for s_var in p_varInfo:
            if p_targetCol == s_var['NAME']:
                s_targetColType = s_var['TYPE']

        # s_trainCol : 모델 학습에 사용하는 컬럼명 리스트 (설명변수 컬럼 리스트)
        # s_targetColValue : 타겟 변수 값 리스트
        s_trainColList = []
        s_targetColValue = list(p_df[p_targetCol])

        # 실제 분석에 상용되는 X 변수명 LIST에 넣기
        for s_col in p_df.columns:
            if s_col != p_targetCol:
                s_trainColList.append(s_col)
            else:
                # 타겟변수이고 categorical이면 라벨인코더설정(분석후 confusionmatrix그리는데 사용)
                if s_targetColType == 'categorical':
                    s_Le.fit(p_df[s_col])


    except Exception as p_error:
        print("p_error : ", p_error)

    
    return p_df, s_trainColList, s_targetColValue, s_targetColType, s_Le



'''
훈련셋 테스트셋 분할(스케일까지 적용함)
p_df: 데이터프레임
p_trainCol: 분석에 사용할 X변수
p_targetColValue: 목표변수값
p_targetCol: 타겟컬럼명
p_varInfo: 데이터탐색 변수 array
p_holdoutType: 분할타입
p_holdoutValue: 분할에 대한 값
p_scaleType - 스케일링 유형
p_getScalerFlag - 스케일러 반환 필요하면 True (default: False)
'''
def splitTestTrainData(p_df, p_trainCol, p_targetColValue, p_targetCol, p_varInfo, p_holdoutType, p_holdoutValue, p_scaleType='standard', p_getScalerFlag=False):
    if p_holdoutType == 't-holdout':
        s_holdout, s_foldCnt = p_holdoutValue, 0

    elif p_holdoutType == 't-cv' or p_holdoutType == 't-loocv':
        s_holdout, s_foldCnt = 0, p_holdoutValue
    
    # 날짜 데이터 학습, 테스트 데이터 분할
    if type(s_holdout) == dict :
        if s_holdout['Range'] == '':
            indexDate = str(parse(s_holdout['End']).date())
        else :
            indexDate = str(parse(s_holdout['Range']).date())
        for s_var in p_varInfo:
            if s_var['TYPE'] == 'date' and s_var['NAME'] == s_holdout['Name']:
                # 만약 이미 index 로 설정되지 않았으면 index 설정
                if s_var['NAME'] not in p_df.index.names:
                    p_df[s_var['NAME']] = pd.to_datetime(p_df[s_var['NAME']])
                    p_df = p_df.set_index(s_var['NAME'])              

        s_trainDf = p_df[:indexDate]
        s_testDf = p_df[indexDate:]
        
        # scale 처리 적용
        s_x_train, s_y_train = s_trainDf[p_trainCol], s_trainDf[p_targetCol]        
        s_x_test, s_y_test = s_testDf[p_trainCol], s_testDf[p_targetCol]

    # 날짜 외에 다른 데이터 학습, 테스트 데이터 분할
    if not type(s_holdout) == dict :
        
        p_unFeature = list(set(p_df.columns) - set(p_trainCol))
        p_df.drop(columns=p_unFeature, inplace=True)
        p_df.sort_index(axis=1,inplace=True)

        # k-fold 일때는 전체 데이터를 사용하므로 전체데이터를 그대로 사용.
        if s_holdout == 0:
            s_x_train, s_x_test, s_y_train, s_y_test = p_df, p_df, p_targetColValue, p_targetColValue
        # 평가 데이터 분할 비율 로 분할
        else :
            s_splitSize = float(int(s_holdout)/100)
            s_x_train, s_x_test, s_y_train, s_y_test = train_test_split(p_df, p_targetColValue, test_size=s_splitSize, random_state=123456)

    # test 데이터의 원본 값
    s_x_orgTest = p_df.loc[s_x_test.index]

    s_x_train.sort_index(axis=1, inplace=True)
    s_x_test.sort_index(axis=1, inplace=True)    

    if p_getScalerFlag:
        return  s_x_train, s_x_test, s_y_train, s_y_test, s_x_orgTest, s_foldCnt, None
    else :
        return  s_x_train, s_x_test, s_y_train, s_y_test, s_x_orgTest, s_foldCnt

'''
shap 그래프 데이터 생성
p_type: shap 유형 (line, tree, kernel)
p_modelObject: shap 생성 모델
p_x_train: shap 생성 학습 데이터
'''
def getShapImgData(p_type, p_modelObject, p_x_train):
    try :
        if p_type == 'line':
            s_shapExplainer = shap.LinearExplainer(p_modelObject, p_x_train)
        elif p_type == 'tree':
            s_shapExplainer = shap.TreeExplainer(p_modelObject)
        elif p_type == 'kernel':
            s_shapExplainer = shap.KernelExplainer(p_modelObject.predict, p_x_train)

        s_shapValues = s_shapExplainer.shap_values(p_x_train)
        fig = plt.figure()
        shap.summary_plot(s_shapValues, p_x_train, show = False)
        s_shapImgByte = io.BytesIO()
        plt.savefig(s_shapImgByte, format = 'png', dpi=200, transparent=True,bbox_inches = 'tight')
        s_shapImgByte.seek(0)
        s_shapImgBase64 = base64.b64encode(s_shapImgByte.read()).decode('utf-8')
    
    except :
        s_shapImgBase64 = ''

    return s_shapImgBase64