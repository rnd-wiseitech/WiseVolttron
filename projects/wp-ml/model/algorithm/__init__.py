from abc import ABC, abstractmethod
from typing import Optional, List, Any, Dict,Union

from sklearn.calibration import cross_val_predict
from sklearn.inspection import permutation_importance
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_ENSEMBLE_PARAMETER_ATT, ARG_MSTR_ATT, ARG_OPTIMIZER_ATT, ARG_PARTITION_ATT, ARG_PARAMETER_ATT, WP_SAVE_INFO_ATT
from model.dataloader2 import WiseDataSet, WiseImageSet
from serviceUtil import algorithmService
from serviceModel import clusterService
# from permetrics.regression import Metrics
from permetrics import RegressionMetric
import sys
import os
import numpy as np
from serviceCommon import commonService
import pandas as pd
import json
from sklearn.metrics import precision_recall_fscore_support,r2_score,mean_squared_error,accuracy_score,confusion_matrix, silhouette_score
#from serviceFeature import featureService
from database.manager import WpDataBaseManagement


#from sklearn.pipeline import Pipeline
from datetime import datetime
from serviceMlflow import mlflowService 
from urllib import parse
import base64
import re
# Abstract base class for all algorithms


class WISE_BASE_ALGORITHM(ABC):

    def __init__(self, p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_optimizer:ARG_OPTIMIZER_ATT, p_argInfo: ARG_MSTR_ATT=None):
        self.parameter = p_parameter
        self.optimizer = p_optimizer
        self.argInfo = p_argInfo
        self._model = None
        self._optParams = {}
        # self.useParams = {}

    @abstractmethod
    def onLearning(self, p_dataSet: WiseDataSet):
        pass
    @abstractmethod
    def onPredicting(self, p_dataSet: WiseDataSet, p_partition:ARG_PARTITION_ATT):
        pass
    @abstractmethod
    def onEvaluating(self, p_dataSet: WiseDataSet, p_class, p_modelname: str, p_targetCol: str):
        pass
    @abstractmethod
    def onSaving(self, p_x_data, p_saveModelInfo, p_pStorage):
        pass
    @abstractmethod
    def getModel(self) :
        pass

def getFeatureCoef(p_x_columns, p_x_test, p_y_test, p_model, p_modelname):

    s_featureLog = {}
    if p_modelname == 'Ensemble':
        result = permutation_importance(p_model, p_x_test, p_y_test, n_repeats=10, random_state=42)
        s_featureLog = {columns: round(importance, 3) for columns, importance in zip(p_x_columns, result.importances_mean)}
    elif(p_modelname == 'lightgradientboosting'):
        total = sum(p_model.feature_importances_)
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):
            s_featureLog.__setitem__(feat, round(float(imp)/total, 3))
    # svm 은 PermutationImportance model을 p_model로 넘긴다.
    elif p_modelname == "svm":
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):            
           s_featureLog.__setitem__(feat,round(np.abs(imp),3))
    else:
        # coef_ 있는 것 일때
        if hasattr(p_model,'coef_'):
            try:
                for feat, imp in zip(p_x_columns, np.abs(p_model.coef_)):
                    s_featureLog.__setitem__(feat, round(imp, 3))
            except Exception as e: 
                # logistic Resgression 때문에 추가
                if type(e) == TypeError:
                    for feat, imp in zip(p_x_columns, p_model.coef_):
                        s_featureLog.__setitem__(feat, np.mean(imp))
                else:
                    for feat, imp in zip(p_x_columns, np.abs(p_model.coef_[0])):
                        s_featureLog.__setitem__(feat, round(imp, 3))
        # feature_importances_ 있는 것 일때
        elif hasattr(p_model,'feature_importances_'):
            if hasattr(p_model, 'booster'):
                for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                    s_featureLog.__setitem__(feat, round(float(imp), 3))
            else :
                try :
                    for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                            s_featureLog.__setitem__(feat, round(float(imp)/total, 3))
                except Exception as e:
                    if type(e) == TypeError:
                        for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                            s_featureLog.__setitem__(feat, round(imp, 3))
                    else :
                        for feat, imp in zip(p_x_columns, p_model.feature_importances_):            
                            s_featureLog.__setitem__(feat,round(np.abs(imp),3)) 
        else :
            s_featureLog = []

    return s_featureLog
class WiseRegArgorithm(WISE_BASE_ALGORITHM):
    def __init__(self,  p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_optimizer:ARG_OPTIMIZER_ATT, p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_optimizer, p_argInfo)
        self.o_argorithm = None

    def getModel(self):
        return self.o_argorithm
    
    def onLearning(self,p_dataSet:WiseDataSet):
        try:
            # 최적화
            # 최적화 일경우 
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)
            # 아닐 경우
            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)
                
            self.model.fit(p_dataSet.x_train, p_dataSet.y_train)

            if self.optimizer.use:
                self.model = self.model.best_estimator_

            # 앙상블 아닐 경우  모델 파라미터 정의
            if self.argInfo.ARG_ID not in [2000, 2001]:
                self.useParams = self.model.get_params()
                # usePrams에서 해당 이름들만 필터링
                self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
            # 앙상블일 경우  모델 파라미터 정의
            else:
                # 새로운 딕셔너리로 self.useParams 초기화
                self.useParams = {}

                # 모델의 모든 파라미터 가져오기
                model_params = self.model.get_params()

                # self.parameter 기반으로 필터링 및 값 가져오기
                for index, argParam in enumerate(self.parameter):
                    argNm = argParam.ARG_NM    # 알고리즘 이름 (예: 'DecisionTree')
                    for param in argParam.parameter:
                        param_name = f"{index+1}{argNm}__{param.name}"  # 패턴: ARG_NM__parameter_name
                        if param_name in model_params:  # 모델 파라미터에 있는 경우
                            self.useParams[param_name] = model_params[param_name]  # 모델의 값을 가져옴
        except Exception as ex:
            exc_type, exc_obj, exc_tb = sys.exc_info()

            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            return False

    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        if p_partition.type =='t-holdout':
            p_dataSet.y_predict = self.model.predict(p_dataSet.x_test)   
        else:
            s_cv = algorithmService.getCrossValidationPredict(p_partition, self.argInfo)
            p_dataSet.y_predict = cross_val_predict(self.model, p_dataSet.x_train, p_dataSet.y_train, cv=s_cv)
        print(p_dataSet.y_predict)  

    def onEvaluating(self, p_dataSet: WiseDataSet, p_encoder, p_modelname:str, p_targetCol:str):
        s_r2_score = r2_score(p_dataSet.y_test, p_dataSet.y_predict)
        if np.isnan(s_r2_score) :
            s_r2_score = 0

        s_mse = mean_squared_error(p_dataSet.y_test, p_dataSet.y_predict)
        if np.isnan(s_mse) :
            s_mse = 0

        s_rmse = np.sqrt(s_mse)
        if np.isnan(s_rmse) :
            s_rmse = 0
            
        s_tmpMtrc = RegressionMetric(np.array(p_dataSet.y_test), np.array(p_dataSet.y_predict))
        s_mape = s_tmpMtrc.mean_absolute_percentage_error() *100

        s_accuracy = s_r2_score
                    
        if s_accuracy < 0 :
            s_accuracy = 0

        if len(p_dataSet.y_predict) > 1000:
            try:
                p_dataSet.y_predict = p_dataSet.y_predict[:1000]
                p_dataSet.y_test = p_dataSet.y_test[:1000]
            except Exception as ex:
                print('에러가 발생 했습니다', ex)
                
        s_predict = list(map(lambda x: round(x, 2), p_dataSet.y_predict.astype(float)))
        s_original = list(map(lambda x: round(x, 2), p_dataSet.y_test))
        
        self.evaluateLog = {"result": json.dumps({"predict":s_predict, "original":s_original}), "accuracy": s_accuracy, "mse": s_mse, "rmse": s_rmse, "mape": s_mape, "r2_score":s_r2_score}
        self.featureLog = getFeatureCoef(p_dataSet.x_data.columns, p_dataSet.x_test, p_dataSet.y_test, self.model, p_modelname)
    
    def onSaving(self, p_x_data, p_saveModelInfo:WP_SAVE_INFO_ATT, p_wpStorage):
        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})
        
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.featureLog,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': self.optimizer.use
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult, cls=commonService.JsonEncoder)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # # 모델 파이프라인 (스케일과 모델 연결)
            # pipeline = Pipeline(steps=[
            #     ('scaler', p_saveModelInfo.scaler),  
            #     ('model', self.model)  
            # ])

            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            # 모델 저장
            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            # 스케일러 저장
            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)

            # metrics 저장
            s_metrics = {
                    'accuracy': self.evaluateLog['accuracy'],
                    'mse': np.mean(self.evaluateLog['mse']),
                    'rmse':  np.mean(self.evaluateLog['rmse']),
                    'mape': np.mean(self.evaluateLog['mape']),
                    'r2_score' : np.mean(self.evaluateLog['r2_score'])
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            # config.json 파일 저장(평가, 변수정확도)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.model).__name__  # 모델 이름 자동 추출
            model_class = type(self.model)
            ensemble = 'N'
            if self.argInfo.ARG_ID in [2000, 2001]:
                ensemble = 'Y'
            
            s_tags = {
                    "mlflow.user": p_saveModelInfo.userno,
                    "model_name": model_name,  # 모델 클래스명 자동 설정
                    "model_class": model_class,
                    'model_type': self.argInfo.ARG_TYPE,
                    "version": model_version,  # 등록된 버전 자동 설정
                    "target": p_saveModelInfo.targetCol,
                    "scaler": type(p_saveModelInfo.scaler).__name__,
                    "encoder": json.dumps(p_saveModelInfo.encoder, cls=commonService.JsonEncoder),
                    "ensemble": ensemble,
                    'optimizer': self.optimizer.use,
                    "wp_model": True
                }
            
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
            # 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': self.evaluateLog['accuracy']*100,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.argInfo.FRAMEWORK_TYPE
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()

class WiseClassArgorithm(WISE_BASE_ALGORITHM):
    def __init__(self,  p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_optimizer:ARG_OPTIMIZER_ATT, p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_optimizer, p_argInfo)
        self.o_argorithm = None

    def getModel(self):
        return self.o_argorithm
    
    def onLearning(self, p_dataSet:WiseDataSet):
        try:
            # 최적화 일경우 
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)
            # 아닐 경우
            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)
                
            self.model.fit(p_dataSet.x_train, p_dataSet.y_train)

            if self.optimizer.use:
                self.model = self.model.best_estimator_
           
            # 앙상블 아닐 경우  모델 파라미터 정의
            if self.argInfo.ARG_ID not in [2000, 2001]:
                self.useParams = self.model.get_params()
                # usePrams에서 해당 이름들만 필터링
                self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
            # 앙상블일 경우  모델 파라미터 정의
            else:
                # 새로운 딕셔너리로 self.useParams 초기화
                self.useParams = {}

                # 모델의 모든 파라미터 가져오기
                model_params = self.model.get_params()

                # self.parameter 기반으로 필터링 및 값 가져오기
                for index, argParam in enumerate(self.parameter):
                    argNm = argParam.ARG_NM    # 알고리즘 이름 (예: 'DecisionTree')
                    for param in argParam.parameter:
                        param_name = f"{index+1}{argNm}__{param.name}"  # 패턴: ARG_NM__parameter_name
                        if param_name in model_params:  # 모델 파라미터에 있는 경우
                            self.useParams[param_name] = model_params[param_name]  # 모델의 값을 가져옴
            print(self.useParams)
        except Exception as ex:
            raise ex

    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        if p_partition.type =='t-holdout':
            p_dataSet.y_predict = self.model.predict(p_dataSet.x_test)   
        else:
            s_cv = algorithmService.getCrossValidationPredict(p_partition, self.argInfo)
            p_dataSet.y_predict = cross_val_predict(self.model, p_dataSet.x_train, p_dataSet.y_train, cv=s_cv)
        print(p_dataSet.y_predict)
    

    def onEvaluating(self, p_dataSet: WiseDataSet, p_encoder, p_modelname:str, p_targetCol:str):
        s_targetEncoder = p_encoder[p_targetCol]
        s_accuary = accuracy_score(p_dataSet.y_test, p_dataSet.y_predict)
        s_precision, s_recall, s_fscore, s_support = precision_recall_fscore_support(p_dataSet.y_test, p_dataSet.y_predict, average=None)
        s_confusionData = confusion_matrix(p_dataSet.y_test, p_dataSet.y_predict)
        try:
            s_confusionMatrix = pd.DataFrame(
                s_confusionData, columns=s_targetEncoder, index=s_targetEncoder)
        except Exception as ex:
            s_confusionMatrix = pd.DataFrame(s_confusionData, columns=s_targetEncoder[:len(s_confusionData)], index=s_targetEncoder[:len(s_confusionData)])

        self.evaluateLog = {"result": s_confusionMatrix.to_json(orient='split'), "accuracy": s_accuary, "precision": s_precision.tolist(), "recall": s_recall.tolist(), "fscore": s_fscore.tolist(), "support": s_support.tolist()}
        self.featureLog = getFeatureCoef(p_dataSet.x_data.columns, p_dataSet.x_test, p_dataSet.y_test, self.model, p_modelname)
        
    def onSaving(self, p_x_data, p_saveModelInfo:WP_SAVE_INFO_ATT, p_wpStorage):
        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})
        
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.featureLog,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': self.optimizer.use
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult, cls=commonService.JsonEncoder)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # # 모델 파이프라인 (스케일과 모델 연결)
            # pipeline = Pipeline(steps=[
            #     ('scaler', p_saveModelInfo.scaler),  
            #     ('model', self.model)  
            # ])
            
            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            # 모델 저장
            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            # 스케일러 저장
            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)
            # metrics 저장
            s_metrics = {
                    'accuracy': self.evaluateLog['accuracy'],
                    'precision': np.mean(self.evaluateLog['precision']),
                    'recall':  np.mean(self.evaluateLog['recall']),
                    'fscore': np.mean(self.evaluateLog['fscore'])
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            # config.json 파일 저장(평가, 변수정확도)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.model).__name__  # 모델 이름 자동 추출
            model_class = type(self.model)
            ensemble = 'N'
            if self.argInfo.ARG_ID in [2000, 2001]:
                ensemble = 'Y'
            
            s_tags = {
                    "mlflow.user": p_saveModelInfo.userno,
                    "model_name": model_name,  # 모델 클래스명 자동 설정
                    "model_class": model_class,
                    'model_type': self.argInfo.ARG_TYPE,
                    "version": model_version,  # 등록된 버전 자동 설정
                    "target": p_saveModelInfo.targetCol,
                    "scaler": type(p_saveModelInfo.scaler).__name__,
                    "encoder": json.dumps(p_saveModelInfo.encoder, cls=commonService.JsonEncoder),
                    'optimizer': self.optimizer.use,
                    "ensemble": ensemble,
                    "wp_model": True
                }
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
                
            # 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': self.evaluateLog['accuracy']*100,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.argInfo.FRAMEWORK_TYPE
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()


class WiseClusterArgorithm(WISE_BASE_ALGORITHM):
    def __init__(self,  p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_optimizer:ARG_OPTIMIZER_ATT, p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_optimizer, p_argInfo)
        self.o_argorithm = None

    def getModel(self):
        return self.o_argorithm
    
    def onLearning(self,p_dataSet:WiseDataSet,p_optiFlag:bool=False):
        try:
            # 최적화 일경우 
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)
            # 아닐 경우
            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)

            self.model.fit(p_dataSet.x_train)
            if 'dbscan' in str(self.o_argorithm):
                p_dataSet.y_predict = self.model.labels_

            if self.optimizer.use:
                self.model = self.model.best_estimator_

            self.useParams = self.model.get_params()
            # usePrams에서 해당 이름들만 필터링
            self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
        except Exception as ex:
            exc_type, exc_obj, exc_tb = sys.exc_info()

            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            return False

    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        # dbscan은 predict로 예측 안하고 fit만 쓰거나 fit_predict만 사용함, onLearning 때 fit()이 실행되어서 dbscan이면 넘어가게 설정함
        if not 'dbscan' in str(self.o_argorithm):
            p_dataSet.y_predict = self.model.predict(p_dataSet.x_train)
    

    def onEvaluating(self, p_dataSet: WiseDataSet, p_encoder, p_modelname:str, p_targetCol:str):
        # silhouette_score 계산
        p_dataSet.x_train = pd.DataFrame(p_dataSet.x_train, columns=p_dataSet.data.keys(), index=p_dataSet.data.index)
        s_silhScore = silhouette_score(p_dataSet.x_train, p_dataSet.y_predict, metric='euclidean',sample_size=1000)
        
        # 클러스터 중심, 군집 알고리즘에 따라 값이 달라서 if else 문으로 중심값과 라벨 지정
        # s_cluster_labels는 밑에 getSvdOutput에 사용됨        
        if  'dbscan' in str(self.o_argorithm):
            # dbscan은 클러스터 중심 값(cluster_centers_)이 없어 visaul값 따로 지정
            s_cluster_labels = self.model.labels_
            s_df_visual = p_dataSet.x_train
            s_featureLog = []
        else :
            if 'gaussian' in str(self.o_argorithm):
                #  모델 속성 중에 means_ 있는지 확인 → gaussian Mixture 인지
                s_cluster_centers = self.model.means_
                s_cluster_labels = p_dataSet.y_predict
                
            else :
                s_cluster_centers = self.model.cluster_centers_
                s_cluster_labels = self.model.labels_    
            
            s_df_visual, s_featureLog = clusterService.getVisualizeData(p_dataSet.x_train, s_cluster_centers)

        s_df_svd, s_df_svd_center = clusterService.get2dData(s_df_visual, p_dataSet.x_train.index[-1])
        
        s_svdOutput = clusterService.getSvdOutput(s_df_svd, s_cluster_labels)
        s_cluster_center_data = s_df_svd_center.apply(lambda x: round(x, 2)).to_json()
        
        self.evaluateLog = {"result": s_svdOutput, "silhouette_coef": s_silhScore, 'cluster_center': s_cluster_center_data}
        self.featureLog = s_featureLog
    
    def onSaving(self, p_x_data, p_saveModelInfo:WP_SAVE_INFO_ATT, p_wpStorage):
       

        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})
        
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.featureLog,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': self.optimizer.use,
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # 모델 파이프라인 (스케일과 모델 연결)
            # pipeline = Pipeline(steps=[
            #     ('scaler', p_saveModelInfo.scaler),  
            #     ('model', self.model)  
            # ])

            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            # 모델 저장
            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            # 스케일러 저장
            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)

            # metrics 저장
            s_metrics = {
                    'silhouette_coef': self.evaluateLog['silhouette_coef'],
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            # config.json 파일 저장(평가, 변수정확도)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.model).__name__  # 모델 이름 자동 추출
            model_class = type(self.model)
                        
            s_tags = {"mlflow.user": p_saveModelInfo.userno,
                    "model_name": model_name,  # 모델 클래스명 자동 설정
                    "model_class": model_class,
                    'model_type': self.argInfo.ARG_TYPE,
                    "version": model_version,  # 등록된 버전 자동 설정
                    "target": p_saveModelInfo.targetCol,
                    "scaler": type(p_saveModelInfo.scaler).__name__,
                    "encoder": json.dumps(p_saveModelInfo.encoder, cls=commonService.JsonEncoder),
                    "ensemble": 'N',
                    'optimizer': self.optimizer.use,
                    "wp_model": True
                    }
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
            s_accuracy = self.evaluateLog['silhouette_coef']
            if s_accuracy < 0 :
                s_accuracy = 0
            else :
                s_accuracy = s_accuracy * 100
            # DP_MODEL_MSTR 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': s_accuracy,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.argInfo.FRAMEWORK_TYPE
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)
            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()

class WiseLangArgorithm(WISE_BASE_ALGORITHM):
    def __init__(self,  p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_optimizer:ARG_OPTIMIZER_ATT, p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_optimizer, p_argInfo)
        self.o_base_model = None
        self.o_argorithm = None
        self.o_tokenizer = None
        self.o_tokenized_trainset = []
        self.o_max_length = None
        self.o_training_params = None
        self.o_peft_config = None
        self.o_trainer = None
        self.o_trainOutput = None

    def getModel(self):
        return self.o_argorithm

    def loadTokenizer(self):
        return self.o_tokenizer

    def setParams(self):
        # 사용자 정의 파라미터 받아오기
        s_params = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)
        self.useParams = {param.name: s_params[param.name] for param in self.parameter if param.name in s_params}

    def preprocessDataset(self, p_dataSet: WiseDataSet):
        # 학습데이터셋 토크나이저 적용
        for t in p_dataSet['trainset']:
            result = self.o_tokenizer(
                t,
                truncation=True,
                max_length=self.o_max_length,
                padding="max_length",
            )
            result["labels"] = result["input_ids"].copy()
            self.o_tokenized_trainset.append(result)

    def setTrainer(self):
        return self.o_trainer

    def onLearning(self):
        self.o_trainOutput = self.o_trainer.train()
        # return self.o_trainOutput

    def onEvaluating(self):
        # 평가지표가 모델마다 다를 수 있으므로, 여기서는 선언만 하고 구체적인 평가지표는 자식클래스에서 업데이트함
        self.evaluateLog = {}
        self.featureLog = {}

    def onSaving(self, p_x_data, p_saveModelInfo:WP_SAVE_INFO_ATT):
        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})

        # log_params에 저장할 값. peft config
        self.useParams.update({ 
            key: list(value) if isinstance(value, set) else value for key, value in self.o_peft_config.to_dict().items()
        })
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.featureLog,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': self.optimizer.use,
        }

        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # 모델 파이프라인 (스케일과 모델 연결)
            pipeline = {
                "model": self.o_trainer.model, 
                # "tokenizer": self.o_tokenizer_no_pad # 패딩 없는 토크나이저
                "tokenizer": self.o_tokenizer # 패딩 있는 토크나이저. 학습에 사용
            }

            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)
            # 모델 저장
            s_mlflow.logModel(pipeline, p_saveModelInfo.signature, p_x_data, 'transformers')

            # metrics 저장
            s_metrics = self.evaluateLog # 평가지표 값이 모델마다 다를 수 있으므로 이와 같이 변경함.
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics)

            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)

            # config.json 파일 저장(평가, 변수정확도)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.o_trainer.model.base_model.model).__name__  # LlamaForCausalLM
            model_class = type(self.o_trainer.model.base_model.model)           # <class 'transformers.models.llama.modeling_llama.LlamaForCausalLM'>

            s_tags = {
                "mlflow.user": p_saveModelInfo.userno,
                "model_name": model_name,  # 모델 클래스명 자동 설정
                "model_class": model_class,
                'model_type': self.argInfo.ARG_TYPE,
                "version": model_version,  # 등록된 버전 자동 설정
                "target": p_saveModelInfo.targetCol,
                "scaler": type(p_saveModelInfo.scaler).__name__,
                "encoder": json.dumps(p_saveModelInfo.encoder),
                "ensemble": 'N',
                'optimizer': self.optimizer.use,
                "wp_model": True
            }
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
            s_accuracy = 0
            if s_accuracy < 0 :
                s_accuracy = 0
            else :
                s_accuracy = s_accuracy * 100

            # DP_MODEL_MSTR 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': s_accuracy,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()

    # 안 씀
    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        return True


# @dataclass
# class WP_MODEL:
#     MODEL_ID: Optional[int] = None
#     MODEL_IDX: Optional[int] = None
#     labelInfos: Optional[WP_LABEL_INFO] = None
#     dateColYn: Optional[bool] = None
#     uuid: str = ''
#     savedYn: bool = False
#     unPreAugmentInfo: Optional[WP_UN_PRE_AUGMENT] = None
#     analyticType: str = ''
#     modelModified: bool = False
#     targetCol: str = ''
#     targetType: str = ''
#     varInfo: Optional[List[WP_VAR_INFO]] = None
#     algorithmInfo: Optional[WP_ALGORITHM] = None
#     featureInfo: Optional[WP_FEATURE_INFO] = None
#     partitionInfo: WP_PARTITION = field(default_factory=dict)
#     saveModelName: Optional[str] = None
#     pythonUniqueId: str = ''
#     importData: WP_IMPORT_DATA = field(default_factory=dict)
#     scaleInfo: Optional[str] = None

#     deepLearn: Optional[bool] = None
#     recurrentModel: Optional[bool] = None
#     dateRange: Optional[Dict[str, Any]] = None

#     ensembleModel: Optional[List[Any]] = None
#     ensemble: Optional[bool] = None

#     reinforcement: Optional[bool] = None
#     reinforcementData: Optional[WP_REINFOCE_DATA] = None

#     excuteResult: Optional[Dict[str, Any]] = None
#     wkModelFlag: bool = False
#     wkModelSaveFlag: bool = False

#     modelRunType: Optional[str] = None
#     dbscanCluster: Optional[Any] = None
#     userPreprocessing: Optional[str] = None

class WISE_TRANSFER_ALGORITHM(ABC):

    def __init__(self, p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_argInfo: ARG_MSTR_ATT, p_learnedModelInfo):
        self.parameter = p_parameter
        self.argInfo = p_argInfo
        self.learnedModelInfo = p_learnedModelInfo

    @abstractmethod
    def onLoading(self, p_userno):
        pass
    @abstractmethod
    def onTransfering(self, p_code):
        pass
    @abstractmethod
    def onTraining(self, p_dataSet: WiseDataSet):
        pass
    @abstractmethod
    def onPredicting(self, p_dataSet: WiseDataSet, p_partition:ARG_PARTITION_ATT):
        pass
    @abstractmethod
    def onEvaluating(self, p_dataSet: WiseDataSet, p_class, p_modelname: str, p_targetCol: str):
        pass
    @abstractmethod
    def onSaving(self, p_x_data, p_saveModelInfo, p_wpStorage):
        pass
    # @abstractmethod
    # def getModel(self) :
    #     pass
    
def getFeatureGradient(p_model, p_x_data, p_x_columns, p_frameworkType):
    if p_frameworkType == 'TensorFlow/Keras':
        import tensorflow as tf
        # numpy 배열을 tf.Tensor로 변환
        x_test_tensor = tf.convert_to_tensor(p_x_data, dtype=tf.float32)

        # Gradient-based Feature Importance 계산
        with tf.GradientTape() as tape:
            tape.watch(x_test_tensor)  # 입력값 추적
            preds = p_model(x_test_tensor)  # 모델 예측

        grads = tape.gradient(preds, x_test_tensor)  # Gradient 계산
        importance = tf.reduce_mean(tf.abs(grads), axis=0)  # 평균 절대값 계산

        # 중요도 값을 전체 합 대비 %로 변환
        importance_abs = importance.numpy()
        importance_percent = (importance_abs / np.sum(importance_abs)) * 100  # % 변환
    
        return {col: round(float(importance_percent[i]), 2) for i, col in enumerate(p_x_columns)}
    
    elif p_frameworkType =='PyTorch':
        import torch
        p_model.eval()
        if isinstance(p_x_data, np.ndarray):
            x_test_tensor = torch.tensor(p_x_data, dtype=torch.float32, requires_grad=True)
        else:
            x_test_tensor = p_x_data.clone().detach().requires_grad_(True)
        
        # 모델 예측 (분류/회귀 모두 동일)
        preds = p_model(x_test_tensor)

        # 출력 전체 합계에 대한 입력 gradient 계산 (모든 feature 기여도 반영)
        preds_sum = preds.sum()
        preds_sum.backward()

        # 입력 gradient 평균 절대값 계산
        grads = x_test_tensor.grad
        grads_abs_mean = grads.abs().mean(dim=0).detach().cpu().numpy()

        # 중요도를 전체 합 대비 %로 변환
        importance_percent = (grads_abs_mean / np.sum(grads_abs_mean)) * 100

        return {
        p_x_columns[i]: round(float(importance_percent[i]), 2) for i in range(len(p_x_columns))
        }

class WiseTransferArgorithm(WISE_TRANSFER_ALGORITHM):
    def __init__(self,  p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_argInfo:ARG_MSTR_ATT, p_learnModelInfo):
        super().__init__(p_parameter, p_argInfo, p_learnModelInfo)
        self.o_argorithm = None

    def onLoading(self, p_userno):
        s_mlflow = mlflowService.mlFlowClient(p_userno)
        self.model = s_mlflow.loadModel(self.learnedModelInfo['MODEL_ID'], self.learnedModelInfo['MODEL_IDX'], self.learnedModelInfo['FRAMEWORK_TYPE'])


    def onTransfering(self, p_code):
       s_code = parse.unquote(base64.b64decode(p_code).decode('utf-8'))
       self.code = s_code
       self.parameter = algorithmService.getArgParam(self.parameter, None)
       self.useParams = self.parameter.copy()

       if self.learnedModelInfo['FRAMEWORK_TYPE'] == 'PyTorch':
           self.parameter['optimizer'] = algorithmService.getPyTorchOptimizer(self.parameter['optimizer'], self.model)
           self.parameter['loss'] = algorithmService.getPyTorchLoss(self.parameter['loss'])

       s_execParam = {
            "s_model": self.model,
            "s_new_model": None,
            "s_optimizer": self.parameter['optimizer'],
            "s_loss": self.parameter['loss'],
            "s_metrics": self.parameter['metrics']
        }
       
       try:
           exec(s_code, s_execParam)
           self.model = s_execParam["s_new_model"]   
       except Exception as e:
           raise e
       
    def onTraining(self, p_dataSet:WiseDataSet):
       if self.learnedModelInfo['FRAMEWORK_TYPE'] == 'TensorFlow/Keras':
           self.history = self.model.fit(p_dataSet.x_train, p_dataSet.y_train, epochs=self.parameter['epochs'], batch_size=self.parameter['batch_size'],  validation_data=(p_dataSet.x_test, p_dataSet.y_test))
       elif self.learnedModelInfo['FRAMEWORK_TYPE'] == 'PyTorch':
        from torch.utils.data import TensorDataset, DataLoader
        import torch
        p_dataSet.x_train = torch.tensor(p_dataSet.x_train, dtype=torch.float32)

        if self.argInfo.ARG_TYPE == 'Classification':
            p_dataSet.y_train = torch.tensor(p_dataSet.y_train, dtype=torch.long)
        else:
            p_dataSet.y_train = torch.tensor(p_dataSet.y_train, dtype=torch.float32)

        train_dataset = TensorDataset(p_dataSet.x_train, p_dataSet.y_train)
        train_loader = DataLoader(train_dataset, batch_size=self.parameter["batch_size"], shuffle=True)
        
        for epoch in range(self.parameter['epochs']):
            self.model.train()
            running_loss = 0.0
            for batch in train_loader:
                inputs, targets = batch
                self.parameter['optimizer'].zero_grad()
                outputs = self.model(inputs)
                loss = self.parameter['loss'](outputs, targets)
                loss.backward()
                self.parameter['optimizer'].step()
                running_loss += loss.item()
            avg_loss = running_loss / len(train_loader)   # epoch 끝에서 계산

        # ✅ for문 밖에서 들여쓰기 잘 맞춰서 이렇게!
        self.metrics  = {'loss': avg_loss}
            

    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        if self.learnedModelInfo['FRAMEWORK_TYPE'] == 'TensorFlow/Keras':
            p_dataSet.y_predict = self.model.predict(p_dataSet.x_test)
        elif self.learnedModelInfo['FRAMEWORK_TYPE'] == 'PyTorch':
            import torch
            p_dataSet.x_test = torch.tensor(p_dataSet.x_test, dtype=torch.float32)
            self.model.eval()   # 평가 모드 (드롭아웃/배치정규화 비활성화)
            with torch.no_grad():
                p_dataSet.y_predict = self.model(p_dataSet.x_test)  # 예측

        if self.argInfo.ARG_TYPE == 'Classification':
            p_dataSet.y_predict = p_dataSet.y_predict.argmax(1)


    def onEvaluating(self, p_dataSet: WiseDataSet, p_encoder, p_modelname:str, p_targetCol:str):
        
        # 케라스일 경우 metrics
        if self.learnedModelInfo['FRAMEWORK_TYPE'] == 'TensorFlow/Keras':
            self.metrics = {metric_name: metric_values[-1] for metric_name, metric_values in self.history.history.items()}

        # 분류일 경우
        if self.argInfo.ARG_TYPE == 'Classification':
            s_targetEncoder = p_encoder[p_targetCol]
            s_accuary = accuracy_score(p_dataSet.y_test, p_dataSet.y_predict)
            s_precision, s_recall, s_fscore, s_support = precision_recall_fscore_support(p_dataSet.y_test, p_dataSet.y_predict, average=None)
            s_confusionData = confusion_matrix(p_dataSet.y_test, p_dataSet.y_predict)
            try:
                s_confusionMatrix = pd.DataFrame(
                    s_confusionData, columns=s_targetEncoder, index=s_targetEncoder)
            except Exception as ex:
                s_confusionMatrix = pd.DataFrame(s_confusionData, columns=s_targetEncoder[:len(s_confusionData)], index=s_targetEncoder[:len(s_confusionData)])

            self.evaluateLog = {"result": s_confusionMatrix.to_json(orient='split'), "accuracy": s_accuary, "precision": s_precision.tolist(), "recall": s_recall.tolist(), "fscore": s_fscore.tolist(), "support": s_support.tolist()}
            s_metrics = {
                    'accuracy': self.evaluateLog['accuracy'],
                    'precision': np.mean(self.evaluateLog['precision']),
                    'recall':  np.mean(self.evaluateLog['recall']),
                    'fscore': np.mean(self.evaluateLog['fscore'])
                }
            self.metrics.update(s_metrics)
        
        elif self.argInfo.ARG_TYPE == 'Regression':
            s_r2_score = r2_score(p_dataSet.y_test, p_dataSet.y_predict)
            if np.isnan(s_r2_score) :
                s_r2_score = 0

            s_mse = mean_squared_error(p_dataSet.y_test, p_dataSet.y_predict)
            if np.isnan(s_mse) :
                s_mse = 0

            s_rmse = np.sqrt(s_mse)
            if np.isnan(s_rmse) :
                s_rmse = 0
                
            s_tmpMtrc = RegressionMetric(np.array(p_dataSet.y_test), np.array(p_dataSet.y_predict))
            s_mape = s_tmpMtrc.mean_absolute_percentage_error() *100

            s_accuracy = s_r2_score
                        
            if s_accuracy < 0 :
                s_accuracy = 0

            if len(p_dataSet.y_predict) > 1000:
                try:
                    p_dataSet.y_predict = p_dataSet.y_predict[:1000]
                    p_dataSet.y_test = p_dataSet.y_test[:1000]
                except Exception as ex:
                    print('에러가 발생 했습니다', ex)
                    
            s_predict = [round(float(x), 2) for x in p_dataSet.y_predict]
            s_original = list(map(lambda x: round(x, 2), p_dataSet.y_test))
            
            self.evaluateLog = {"result": json.dumps({"predict":s_predict, "original":s_original}), "accuracy": s_accuracy, "mse": s_mse, "rmse": s_rmse, "mape": s_mape, "r2_score":s_r2_score}
        
        self.featureLog = getFeatureGradient(self.model, p_dataSet.x_test, p_dataSet.x_data.columns, self.learnedModelInfo['FRAMEWORK_TYPE'])
        # # 변수 중요도
        # # numpy 배열을 tf.Tensor로 변환
        # x_test_tensor = tf.convert_to_tensor(p_dataSet.x_test, dtype=tf.float32)

        # # Gradient-based Feature Importance 계산
        # with tf.GradientTape() as tape:
        #     tape.watch(x_test_tensor)  # 입력값 추적
        #     preds = self.model(x_test_tensor)  # 모델 예측

        # grads = tape.gradient(preds, x_test_tensor)  # Gradient 계산
        # importance = tf.reduce_mean(tf.abs(grads), axis=0)  # 평균 절대값 계산

        # # 중요도 값을 전체 합 대비 %로 변환
        # importance_abs = importance.numpy()
        # importance_percent = (importance_abs / np.sum(importance_abs)) * 100  # % 변환

        # # JSON 형태로 변환 (소수점 2자리 제한)
        # self.featureLog = {col: round(float(importance_percent[i]), 2) for i, col in enumerate(p_dataSet.x_data.columns)}
        # print(self.evaluateLog)
   

    def onSaving(self, p_x_data, p_saveModelInfo:WP_SAVE_INFO_ATT, p_wpStorage):
       

        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})
        
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.featureLog,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': False
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # # 모델 파이프라인 (스케일과 모델 연결)
            # pipeline = Pipeline(steps=[
            #     ('scaler', p_saveModelInfo.scaler),  
            #     ('model', self.model)  
            # ])

            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)
            

            # 모델 저장
            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data, self.learnedModelInfo['FRAMEWORK_TYPE'])
            # 스케일러 저장
            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)
            # 스키마 저장
            s_mlflow.logSignature(p_saveModelInfo.signature, p_wpStorage)
            # 샘플 데이터 저장
            s_mlflow.logSampleData(p_x_data, p_wpStorage)
            # 트랜스퍼 코드 저장
            s_mlflow.logPythonCode(self.code, p_wpStorage, self.parameter)
            # # metrics 저장
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], self.metrics) 
            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            # config.json 파일 저장(평가, 변수정확도)
            if self.learnedModelInfo['FRAMEWORK_TYPE'] == 'TensorFlow/Keras':
                s_summary = []
                self.model.summary(print_fn=lambda x: s_summary.append(x), expand_nested=True)
                s_summary = "\n".join(s_summary)
            elif self.learnedModelInfo['FRAMEWORK_TYPE'] == 'PyTorch':
                s_summary = str(self.model)
                
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog,
                'summary': s_summary
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.model).__name__  # 모델 이름 자동 추출
            model_class = type(self.model)
                        
            s_tags = {"mlflow.user": p_saveModelInfo.userno,
                    "model_name": model_name,  # 모델 클래스명 자동 설정
                    "model_class": model_class,
                    'model_type': self.argInfo.ARG_TYPE,
                    "version": model_version,  # 등록된 버전 자동 설정
                    "target": p_saveModelInfo.targetCol,
                    "scaler": type(p_saveModelInfo.scaler).__name__,
                    "encoder": json.dumps(p_saveModelInfo.encoder, cls=commonService.JsonEncoder),
                    "ensemble": 'N',
                    'optimizer': False,
                    "wp_model": True
                    }
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  

            if self.argInfo.ARG_TYPE == 'Classification':
                s_accuracy = self.metrics['accuracy']
            elif self.argInfo.ARG_TYPE =='Regression':
                s_accuracy = self.evaluateLog['accuracy']

            if s_accuracy < 0 :
                s_accuracy = 0
            else :
                s_accuracy = s_accuracy * 100
            # DP_MODEL_MSTR 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': s_accuracy,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.learnedModelInfo['FRAMEWORK_TYPE']
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)
            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()


class WISE_IMAGE_ALGORITHM(ABC):

    def __init__(self, p_parameter:List[ARG_PARAMETER_ATT], p_argInfo: ARG_MSTR_ATT=None):
        self.parameter = p_parameter
        self.argInfo = p_argInfo
        self._model = None
        self._optParams = {}
        # self.useParams = {}

    @abstractmethod
    def onLearning(self, p_dataSet: WiseImageSet):
        pass
    @abstractmethod
    def onEvaluating(self):
        pass    
    @abstractmethod
    def onSaving(self, p_saveModelInfo):
        pass

#학습후 필요없는 파일 삭제
def deleteYoloLogs(p_path):
    delete_keywords = [
        "train_batch",
        "val_batch",
        "events.out.tfevents",
        "results.png"
    ]

    deleted_files = 0
    for file in os.listdir(p_path):
        file_path = os.path.join(p_path, file)
        if any(keyword in file for keyword in delete_keywords):
            os.remove(file_path)
            deleted_files += 1

    print(f"\n✅ 정리 완료: {deleted_files}개 파일 삭제됨")



# 1000개든 50개든 각 커브데이터를 일정간격으로 최대 50개씩만
def sampleCurveData(p_curve, p_num_points=50):
    """
    곡선 데이터에서 첫/마지막 포함, 소수점 3자리로 제한하여 num_points개 추출
    """
    length = len(p_curve)
    if p_num_points >= length:
        return [round(float(x), 3) for x in p_curve]

    mid_idxs = np.linspace(1, length - 2, num=p_num_points - 2, dtype=int)
    idxs = np.concatenate(([0], mid_idxs, [length - 1]))
    return [round(float(p_curve[i]), 3) for i in idxs]


# mlflow테이블적재 특문 제거
def cleanKey(key: str) -> str:
    # 1. 슬래시 → 점
    key = key.replace("/", ".")
    # 2. 괄호 → _내부내용 (또는 그냥 제거)
    key = re.sub(r"\((.*?)\)", r"_\1", key)
    # 3. 하이픈 → 언더스코어
    key = key.replace("-", "_")
    return key

class WiseYoloArgorithm(WISE_IMAGE_ALGORITHM):
    def __init__(self,  p_parameter:List[ARG_PARAMETER_ATT], p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_argInfo)
        self.o_argorithm = None

    
    def onLearning(self, p_dataSet: WiseImageSet):
        try:
            self.useParams = algorithmService.getArgParam(self.parameter)
            self.model = self.o_argorithm(os.path.join(os.path.dirname(__file__), "Image", self.useParams['model']))
            self.model.train(
                data=f'{p_dataSet.modelsetPath}/data.yaml',       # data.yaml 경로
                epochs=self.useParams['epochs'],              # 학습 epoch 수
                imgsz=self.useParams['imgsz'],              # 이미지 크기
                batch=self.useParams['batch'],               # 배치 사이즈
                optimizer=self.useParams['optimizer'],
                workers=0,              # GPU 번호 (-1이면 CPU 사용)
                name='output',
                project=p_dataSet.modelsetPath,# 저장될 프로젝트 이름,
                exist_ok=True,
                lr0 = self.useParams['lr0'],
                # EarlyStopping 설정
                patience=10,    
                # es_metric='val/map50',                        # 성능 기준 metric
                # es_patience=5                                 # 5 epoch 동안 개선 없으면 중단
                # optimizer='SGD'
                # device='cpu'
            )
            # deleteYoloLogs(p_dataSet.resultPath)
        
        except Exception as ex:
            exc_type, exc_obj, exc_tb = sys.exc_info()

            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            return False
        
    def onEvaluating(self):
        self.modelVal = self.model.val()
        #confusion matrix 추출
        s_cm_matrix = self.modelVal.confusion_matrix.matrix.astype(int)
        # 클래스 추출 (background 까지 추가)
        s_class = list(self.model.names.values())  # ['cat', 'dog', ...]
        self.label = ", ".join(s_class)
        s_full_class = s_class + ["background"]  # YOLO는 background 자동 추가
        # confusion matrix → DataFrame → JSON string
        s_confusionMatrix = pd.DataFrame(s_cm_matrix, columns=s_full_class, index=s_full_class)
        s_confusionMatrix = s_confusionMatrix.to_json(orient='split')
        #  y_true, y_pred 생성
        y_true, y_pred = [], []
        for i in range(s_cm_matrix.shape[0]):
            for j in range(s_cm_matrix.shape[1]):
                count = s_cm_matrix[i][j]
                y_true += [i] * count
                y_pred += [j] * count
        # 평가지표
        s_precision, s_recall, s_fscore, s_support = precision_recall_fscore_support(y_true, y_pred, average=None)
        s_accuary = accuracy_score(y_true, y_pred)
        
        self.evaluateLog = {
            "result": s_confusionMatrix,
            "accuracy": round(s_accuary, 4),
            "precision": [round(p, 4) for p in s_precision],
            "recall": [round(r, 4) for r in s_recall],
            "fscore": [round(f, 4) for f in s_fscore],
            "support": s_support.tolist()
        }
        # Yolo PR 커브데이터 (피처로그에 넣음)
        s_className = self.model.names # 라벨명
        self.featureLog = {
            "classes": [*s_className.values(), "all classes"],
            "curves": []
        }
        # 클래스별 PR Curve 저장
        for class_id, (p_curve, r_curve) in enumerate(zip(self.modelVal.box.p_curve, self.modelVal.box.r_curve)):
            ap_curve = self.modelVal.box.all_ap[class_id]
            map50 = ap_curve[0] if isinstance(ap_curve, np.ndarray) else ap_curve

            self.featureLog["curves"].append({
                "class": s_className[class_id],
                "mAP50": round(float(map50), 3),
                "precision": sampleCurveData(p_curve, 50),
                "recall": sampleCurveData(r_curve, 50)
            })

        # 전체 평균 곡선 (all classes)
        mean_p = np.mean(np.array(self.modelVal.box.p_curve), axis=0)
        mean_r = np.mean(np.array(self.modelVal.box.r_curve), axis=0)
        mean_map50 = np.mean(self.modelVal.box.all_ap[:, 0])

        self.featureLog["curves"].append({
            "class": "all classes",
            "mAP50": round(float(mean_map50), 3),
            "precision": sampleCurveData(mean_p, 50),
            "recall": sampleCurveData(mean_r, 50)
        })

    def onSaving(self, p_saveModelInfo:WP_SAVE_INFO_ATT):
        # DP_MODEL_RESULT 저장 (워크플로우 결과 화면, 모델 필터링에 사용)
        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})
        s_metrics = self.modelVal.results_dict
        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': s_metrics,
            'useParams': self.useParams,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': False
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult, cls=commonService.JsonEncoder)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        # 모델 저장할 경우
        if p_saveModelInfo.modelsave == True:
            # DP_MODEL_MSTR 조회
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            # 값이 있을 경우에는 모델 ID 가져옴
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            # 없을 경우에는 INSERT하고 모델 ID 가져옴
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            # mlflow
            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            self.model.model_path = p_saveModelInfo.model_path
            # 모델 저장
            s_mlflow.logModel(self.model, None, None, self.argInfo.FRAMEWORK_TYPE)

            # metrics 저장
            s_metrics = {cleanKey(k): v for k, v in s_metrics.items()}
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics)

            # 파라미터 저장
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams) 

            # config.json 파일 저장(평가, 변수정확도)
            s_config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], s_config)

             # 모델 등록
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

            # tag 저장
            model_name = type(self.model).__name__  # 모델 이름 자동 추출
            model_class = type(self.model)
            s_tags = {
                    "mlflow.user": p_saveModelInfo.userno,
                    "model_name": model_name,  # 모델 클래스명 자동 설정
                    "model_class": model_class,
                    'model_type': self.argInfo.ARG_TYPE,
                    "version": model_version,  # 등록된 버전 자동 설정
                    "label_info": self.label,
                    "ensemble": 'N',
                    "wp_model": True
                }
            s_mlflow.setTags(s_mlflowInfo['run_id'], s_tags)

            # mlflow 종료
            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
                
            # 업데이트
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': self.evaluateLog['accuracy']*100,
                'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': artifact_uri,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.argInfo.FRAMEWORK_TYPE
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

            # DP_MODEL_RESULT (모델 필터에서 사용)
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()