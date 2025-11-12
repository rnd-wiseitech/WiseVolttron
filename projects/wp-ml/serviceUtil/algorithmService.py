from typing import List, Union
import numpy as np
import pandas as pd
import json
from skopt import BayesSearchCV
from skopt.space import Real, Categorical, Integer
from sklearn.metrics import precision_recall_fscore_support,r2_score,mean_squared_error,accuracy_score,confusion_matrix
# from permetrics.regression import Metrics
from permetrics import RegressionMetric
from sklearn.metrics import silhouette_score
from sklearn.tree import DecisionTreeClassifier
from scipy.stats import uniform
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.model_selection import KFold, StratifiedKFold, LeaveOneOut, cross_val_predict
from dataclasses import dataclass, fields
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT
import importlib
import os

def getCrossValidationPredict(p_partition, p_argInfo):
    if p_partition.type == 't-cv':
        if p_argInfo.ARG_TYPE == 'Classification':
            s_fold = StratifiedKFold(n_splits=int(p_partition.value), shuffle=True)
        else: 
            s_fold = KFold(n_splits=int(p_partition.value), shuffle=True) 
    else:
        s_fold = LeaveOneOut()

    return s_fold

def getArgParam(p_parameter, p_model=None):
    s_argParam = {}
    for param in p_parameter:
        # 각 파라미터의 이름과 값 추출
        name = param.name
        value = param.value
        
        # 타입에 따라 값 변환 (integer/float 타입 처리)
        if param.type == 'integer' or  param.type == 'INT' :
            value = int(value)
        elif param.type == 'float' or  param.type == 'FLOAT' :
            value = float(value)
        
        # 딕셔너리에 추가
        s_argParam[name] = value

    # random_state
    # 몇몇 알고리즘은 random_state 파라미터 들어가면 오류남 EX) DBSCAN, SVR, DQN 등등 
    # p_argId 일때
    # if not p_model in [1011]:
    # p_model 일때
    if p_model is not None and 'dbscan' not in str(p_model):
        s_argParam['random_state'] = 42

    return s_argParam

def getBasicModel(p_model, p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_argId):
    # 언어모델
    if p_argId in [3000, 3001]:
        return getArgParam(p_parameter, p_model)
    # 앙상블 아닐 경우
    elif p_argId not in [2000, 2001]:
        # DBSCAN에서 random_state 파라미터 때문에 p_model 매개변수 추가
        return p_model().set_params(**getArgParam(p_parameter, p_model))
    # 앙상블
    else:
        o_estimators = []
        for index, estimator in enumerate(p_parameter):
            s_className = estimator.ARG_FILE_NAME
            s_classType = estimator.ARG_TYPE
            s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.dirname(os.path.realpath(__file__)))}/model/algorithm/{s_classType}/{s_className}.py")
            s_model = importlib.util.module_from_spec(s_spec)
            s_spec.loader.exec_module(s_model)
            s_argorithm = getattr(s_model, s_className)(estimator.parameter, None, None).o_argorithm
            s_argorithm = s_argorithm().set_params(**getArgParam(estimator.parameter, s_argorithm))
            o_estimators.append((f'{index+1}{estimator.ARG_NM}', s_argorithm))

        return  p_model.set_params(estimators=o_estimators)

def getOptimizerModel(p_model, p_parameter, p_optimizer):
    # 옵티마이저 parameter 설정
    s_searchSpace = {}

    # 옵티마이저 모델 설정
    if p_optimizer.type == 'Bayesian':
        # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = Categorical(param.value)
            elif param.type == 'integer':
                s_searchSpace[param.name] = Integer(int(param.value[0]), int(param.value[1]))
            elif param.type == 'float':
                s_searchSpace[param.name] = Real(float(param.value[0]), float(param.value[1]))
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
            
        return BayesSearchCV(p_model(), s_searchSpace, random_state=42)
    
    elif p_optimizer.type == 'Grid':
         # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = param.value
            elif param.type == 'integer':
                s_searchSpace[param.name] = list(range(int(param.value[0]), int(param.value[1])+1))
            elif param.type == 'float':
                s_searchSpace[param.name] = [float(param.value[0]),(float(param.value[0])+float(param.value[1]))/2, float(param.value[1])]
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
        return GridSearchCV(p_model(), s_searchSpace)
    
    elif p_optimizer.type == 'Random':
        # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = param.value
            elif param.type == 'integer':
                s_searchSpace[param.name] = range(int(param.value[0]), int(param.value[1])+1)
            elif param.type == 'float':
                s_searchSpace[param.name] = uniform(loc = float(param.value[0]), scale=float(param.value[1]))
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
            
        return RandomizedSearchCV(p_model(), s_searchSpace, random_state=42)



'''
모델 파라미터 정재
p_argParam : 모델 파라미터
'''
def getArgParamList(p_argParam):
    p_output = dict()
    
    for param in p_argParam:
        if not param['PARAM_VALUE'] == '':
            p_output[param['PARAM_NM']] = param['PARAM_VALUE']
        else :
            p_output[param['PARAM_NM']] = param['PARAM_DEFAULT']
    
    return p_output



'''
모델평가지표 계산
p_argType: 알고리즘 타입
p_y_test: 실제 y값
p_y_predict: 예측 y값
p_le: 라벨인코더
'''
def getEvalIndicator(p_argType, p_y_test, p_y_predict, p_le=None):
    # 최종 결과 담길 변수
    s_output = {}
    ## pY list 형
    ## pPredicted ndarray
    if p_argType == 'Classification':
        
        s_precision, s_recall, s_fscore, s_support = precision_recall_fscore_support(p_y_test, p_y_predict, average=None)
        s_confusionData = confusion_matrix(p_y_test, p_y_predict)
        s_accuracy = accuracy_score(p_y_test, p_y_predict)

        try:
            s_confusionMatrix = pd.DataFrame(
                s_confusionData, columns=p_le.classes_, index=p_le.classes_)
        except Exception as ex:
            s_confusionMatrix = pd.DataFrame(s_confusionData, columns=p_le.classes_[:len(s_confusionData)], index=p_le.classes_[:len(s_confusionData)])

        s_output = {"reVal": s_confusionMatrix.to_json(orient='split'), "accuracy": s_accuracy, "precision": s_precision.tolist(), "recall": s_recall.tolist(), "fscore": s_fscore.tolist(), "support": s_support.tolist()}
        

    elif p_argType == 'Regression':
        
        s_test_score = r2_score(p_y_test, p_y_predict)
        if np.isnan(s_test_score) :
            s_test_score = 0

        s_mse = mean_squared_error(p_y_test, p_y_predict)
        if np.isnan(s_mse) :
            s_mse = 0

        s_rmse = np.sqrt(s_mse)
        if np.isnan(s_rmse) :
            s_rmse = 0
            
        # #34
        # s_tmpMtrc = Metrics(np.array(p_y_test), np.array(p_y_predict))
        s_tmpMtrc = RegressionMetric(np.array(p_y_test), np.array(p_y_predict))
        s_mape = s_tmpMtrc.mean_absolute_percentage_error() *100
        s_accuracy = 100 - s_mape
        # diff = np.divide((pY - pPredicted), pY,out=np.zeros_like(pPredicted), where=pY != 0)
        # diff[diff == -inf] = 0
        # diff = np.nan_to_num(diff)
        # mape = np.mean(np.abs(diff)) * 100
        
        if np.isinf(s_mape):
            print("mape infff")
            s_mape = 100
            

        if s_accuracy < 0 :
            s_accuracy = 0

        if len(p_y_predict) > 1000:
            try:
                p_y_predict = p_y_predict[:1000]
                p_y_test = p_y_test[:1000]
            except Exception as ex:
                print('에러가 발생 했습니다', ex)
                
        # WP-155 결과 테이블 소숫점 자리 2 자리 까지만 저장
        s_reVal = list(map(lambda x: round(x, 2), p_y_predict.astype(float)))
        s_orgVal = list(map(lambda x: round(x, 2), p_y_test))
        
        s_output = {
            "reVal": json.dumps(s_reVal), 
            "orgVal": json.dumps(s_orgVal), 
            "oob_score": "", "test_score": s_test_score, "mse": s_mse, "rmse": s_rmse, "mape": s_mape, "accuracy":s_accuracy}

    # Cluster는 사용하지 않음
    elif p_argType == 'Clustering':

        s_score = silhouette_score(p_y_test, p_y_predict, metric='euclidean')
        s_output = {"score":s_score}
    else:
        s_output = {}

    return s_output

"""
# 모델 학습 분할 방법 ( t-cv : 교차 검증, t-holdout : 학습-평가, t-loocv : )
p_modelType : 모델 타입
p_holdoutType : 검증데이터 비율 설정 타입
p_model : 사용할 모델
p_x_train : 교차 검증 (t-cv, t-loocv) 일 때 사용할 전체 데이터셋
p_y_train : 교차 검증 (t-cv, t-loocv) 일 때 사용할 전체 데이터셋
p_x_test : 학습 평가 (t-holdout) 일 때 사용할 데이터셋
p_foldCnt : 교차 검증 (t-cv) 일 때 필요한 비율 값
"""
def getHoldOut(p_modelType, p_holdoutType, p_model, p_x_train, p_y_train, p_x_test, p_foldCnt=0):
     # 학습-평가 데이터 분할
    if p_holdoutType == 't-holdout':
        s_y_predict = p_model.predict(p_x_test)
    else :
        # K-Fold 교차 검증
        if p_holdoutType == 't-cv':
            if p_modelType == 'classifier' :
                s_cvValue = StratifiedKFold(n_splits=int(p_foldCnt), shuffle=True)
            else :
                s_cvValue = KFold(n_splits=int(p_foldCnt), shuffle=True)         
        # Leave One Out 교차 검증
        elif p_holdoutType == 't-loocv':
            s_cvValue = LeaveOneOut()
        s_y_predict = cross_val_predict(p_model, p_x_train, p_y_train, cv=s_cvValue)
   
    return s_y_predict


def getPyTorchOptimizer(p_optimizer, p_model, lr=0.001):
    import torch.optim as optim
    s_optimizers = {
        "adam": optim.Adam(p_model.parameters(), lr=lr),
        "sgd": optim.SGD(p_model.parameters(), lr=lr),
        "rmsprop": optim.RMSprop(p_model.parameters(), lr=lr),
        "adagrad": optim.Adagrad(p_model.parameters(), lr=lr),
        "adamw": optim.AdamW(p_model.parameters(), lr=lr)
    }
    return s_optimizers[p_optimizer.lower()]

def getPyTorchLoss(p_loss):
    import torch.nn as nn
    losses = {
        # 분류용
        "categorical_crossentropy": nn.CrossEntropyLoss(),
        "sparse_categorical_crossentropy": nn.CrossEntropyLoss(),  # 보통 PyTorch에선 이걸 쓰면 됨
        "binary_crossentropy": nn.BCELoss(),
        # 회귀용
        "mse": nn.MSELoss(),     # Mean Squared Error
        "mae": nn.L1Loss(),      # Mean Absolute Error
        "huber": nn.HuberLoss() # Huber Loss
    }
    return losses[p_loss.lower()]