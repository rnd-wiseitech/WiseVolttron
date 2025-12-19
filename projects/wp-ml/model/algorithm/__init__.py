from abc import ABC, abstractmethod
from typing import Optional, List, Any, Dict,Union

from sklearn.calibration import cross_val_predict
from sklearn.inspection import permutation_importance
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_ENSEMBLE_PARAMETER_ATT, ARG_MSTR_ATT, ARG_OPTIMIZER_ATT, ARG_PARTITION_ATT, ARG_PARAMETER_ATT, WP_CUSTOM_MODEL_ATT, WP_SAVE_INFO_ATT
from model.dataloader2 import WiseDataSet, WiseImageSet
from serviceUtil import algorithmService
from serviceModel import clusterService
from permetrics import RegressionMetric
import sys
import os
import numpy as np
from serviceCommon import commonService
import pandas as pd
import json
from sklearn.metrics import precision_recall_fscore_support,r2_score,mean_squared_error,accuracy_score,confusion_matrix, silhouette_score, precision_recall_curve, average_precision_score
from database.manager import WpDataBaseManagement


import pytz
from datetime import datetime
from serviceMlflow import mlflowService 
from urllib import parse
import re


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
    if(p_modelname == 'lightgradientboosting'):
        total = sum(p_model.feature_importances_)
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):
            s_featureLog.__setitem__(feat, round(float(imp)/total, 3))
    
    elif p_modelname == "svm":
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):            
           s_featureLog.__setitem__(feat,round(np.abs(imp),3))
    else:
        
        if hasattr(p_model,'coef_'):
            try:
                for feat, imp in zip(p_x_columns, np.abs(p_model.coef_)):
                    s_featureLog.__setitem__(feat, round(imp, 3))
            except Exception as e: 
                
                if type(e) == TypeError:
                    for feat, imp in zip(p_x_columns, p_model.coef_):
                        s_featureLog.__setitem__(feat, np.mean(imp))
                else:
                    for feat, imp in zip(p_x_columns, np.abs(p_model.coef_[0])):
                        s_featureLog.__setitem__(feat, round(imp, 3))
        
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
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)

            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)
                
            self.model.fit(p_dataSet.x_train, p_dataSet.y_train)

            if self.optimizer.use:
                self.model = self.model.best_estimator_

            if self.argInfo.ARG_ID not in [2000, 2001]:
                self.useParams = self.model.get_params()
                self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
            else:
                self.useParams = {}

                model_params = self.model.get_params()

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

        if p_saveModelInfo.modelsave == True:
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)

            s_metrics = {
                    'accuracy': self.evaluateLog['accuracy'],
                    'mse': np.mean(self.evaluateLog['mse']),
                    'rmse':  np.mean(self.evaluateLog['rmse']),
                    'mape': np.mean(self.evaluateLog['mape']),
                    'r2_score' : np.mean(self.evaluateLog['r2_score'])
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
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

            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
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
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)
            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)
                
            self.model.fit(p_dataSet.x_train, p_dataSet.y_train)

            if self.optimizer.use:
                self.model = self.model.best_estimator_
           
            if self.argInfo.ARG_ID not in [2000, 2001]:
                self.useParams = self.model.get_params()
                self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
            else:
                self.useParams = {}

                model_params = self.model.get_params()

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

        if p_saveModelInfo.modelsave == True:
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)
            s_metrics = {
                    'accuracy': self.evaluateLog['accuracy'],
                    'precision': np.mean(self.evaluateLog['precision']),
                    'recall':  np.mean(self.evaluateLog['recall']),
                    'fscore': np.mean(self.evaluateLog['fscore'])
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
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

            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
                
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
            if self.optimizer.use:
                self.model = algorithmService.getOptimizerModel(self.o_argorithm, self.parameter, self.optimizer)
            else:
                self.model = algorithmService.getBasicModel(self.o_argorithm, self.parameter, self.argInfo.ARG_ID)

            self.model.fit(p_dataSet.x_train)
            if 'dbscan' in str(self.o_argorithm):
                p_dataSet.y_predict = self.model.labels_

            if self.optimizer.use:
                self.model = self.model.best_estimator_

            self.useParams = self.model.get_params()
            self.useParams = {param.name: self.useParams[param.name] for param in self.parameter if param.name in self.useParams}
        except Exception as ex:
            exc_type, exc_obj, exc_tb = sys.exc_info()

            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            return False

    def onPredicting(self,p_dataSet:WiseDataSet, p_partition: ARG_PARTITION_ATT):
        if not 'dbscan' in str(self.o_argorithm):
            p_dataSet.y_predict = self.model.predict(p_dataSet.x_train)
    

    def onEvaluating(self, p_dataSet: WiseDataSet, p_encoder, p_modelname:str, p_targetCol:str):
        p_dataSet.x_train = pd.DataFrame(p_dataSet.x_train, columns=p_dataSet.data.keys(), index=p_dataSet.data.index)
        s_silhScore = silhouette_score(p_dataSet.x_train, p_dataSet.y_predict, metric='euclidean',sample_size=1000)
        
        if  'dbscan' in str(self.o_argorithm):
            s_cluster_labels = self.model.labels_
            s_df_visual = p_dataSet.x_train
            s_featureLog = []
        else :
            if 'gaussian' in str(self.o_argorithm):
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

        if p_saveModelInfo.modelsave == True:
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
            s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
            s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

            s_mlflow.logModel(self.model, p_saveModelInfo.signature, p_x_data)

            s_mlflow.logScaler(p_saveModelInfo.scaler, p_wpStorage)

            s_metrics = {
                    'silhouette_coef': self.evaluateLog['silhouette_coef'],
                }
            s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_metrics) 
            s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams)
            config = {
                'evaluation': self.evaluateLog,
                'feature_importance': self.featureLog
            }
            s_mlflow.logConfig(s_mlflowInfo['run_id'], config)
            
            model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

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

            s_mlflow.endRun(s_mlflowInfo['run_id'])

            artifact_uri = s_mlflowInfo['artifact_uri']  
            s_accuracy = self.evaluateLog['silhouette_coef']
            if s_accuracy < 0 :
                s_accuracy = 0
            else :
                s_accuracy = s_accuracy * 100
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
            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()
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
    
def getFeatureGradient(p_model, p_x_data, p_x_columns, p_frameworkType):
    if p_frameworkType == 'TensorFlow/Keras':
        import tensorflow as tf
        x_test_tensor = tf.convert_to_tensor(p_x_data, dtype=tf.float32)

        with tf.GradientTape() as tape:
            tape.watch(x_test_tensor)  # 입력값 추적
            preds = p_model(x_test_tensor)  # 모델 예측

        grads = tape.gradient(preds, x_test_tensor)  # Gradient 계산
        importance = tf.reduce_mean(tf.abs(grads), axis=0)  # 평균 절대값 계산

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
        
        preds = p_model(x_test_tensor)

        preds_sum = preds.sum()
        preds_sum.backward()

        grads = x_test_tensor.grad
        grads_abs_mean = grads.abs().mean(dim=0).detach().cpu().numpy()

        importance_percent = (grads_abs_mean / np.sum(grads_abs_mean)) * 100

        return {
        p_x_columns[i]: round(float(importance_percent[i]), 2) for i in range(len(p_x_columns))
        }

class WISE_IMAGE_ALGORITHM(ABC):

    def __init__(self, p_parameter:List[ARG_PARAMETER_ATT], p_argInfo: ARG_MSTR_ATT=None):
        self.parameter = p_parameter
        self.argInfo = p_argInfo
        self._model = None
        self._optParams = {}

    @abstractmethod
    def onLearning(self, p_dataSet: WiseImageSet, p_userno):
        pass
    @abstractmethod
    def onEvaluating(self, p_dataset: WiseImageSet):
        pass    
    @abstractmethod
    def onSaving(self, p_saveModelInfo):
        pass

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


def cleanKey(key: str) -> str:
    key = key.replace("/", ".")
    key = re.sub(r"\((.*?)\)", r"_\1", key)
    key = key.replace("-", "_")
    return key

class WiseYoloArgorithm(WISE_IMAGE_ALGORITHM):
    def __init__(self,  p_parameter:List[ARG_PARAMETER_ATT], p_argInfo:ARG_MSTR_ATT=None):
        super().__init__(p_parameter, p_argInfo)
        self.o_argorithm = None

    def onLearning(self, p_dataSet: WiseImageSet, p_userno):
        try:
            self.useParams = algorithmService.getArgParam(self.parameter)

            if self.useParams['model'].endswith(".pt"):
                self.model = self.o_argorithm(os.path.join(os.path.dirname(__file__), "Image", self.useParams['model']))
            else:
                s_basePath = os.path.dirname(__file__)
                s_localPath = f'{p_userno}/relearn'
                s_localPath = os.path.join(s_basePath, '..', '..', 'py_result', s_localPath) 
                s_mlflow = mlflowService.mlFlowClient(p_userno)
                s_mlflow.saveArtifactsToLocal(self.useParams['model'], s_localPath)
                self.model = self.o_argorithm(f'{s_localPath}/best.pt')
            
            s_data_path = f'{p_dataSet.modelsetPath}/images'

            self.model.train(
                data=s_data_path,
                epochs=self.useParams['epochs'],
                imgsz=self.useParams['imgsz'],
                batch=self.useParams['batch'],
                optimizer=self.useParams['optimizer'],
                workers=0,
                name='output',
                project=p_dataSet.modelsetPath,
                exist_ok=True,
                lr0 = self.useParams['lr0'],
                patience=20,
                seed=42,
            )
        
        except Exception as ex:
            exc_type, exc_obj, exc_tb = sys.exc_info()

            fname = os.path.split(exc_tb.tb_frame.f_code.co_filename)[1]
            print("=================================Track Exception==================================")
            print(exc_type, fname, exc_tb.tb_lineno)
            print("==================================================================================")
            return False
        
    def onEvaluating(self, p_dataSet: WiseImageSet):
        self.modelVal = self.model.val()
        self.metrics = self.modelVal.results_dict
        s_cm_matrix = self.modelVal.confusion_matrix.matrix.astype(int)
        s_class = list(self.model.names.values())  # ['cat', 'dog', ...]
        self.label = ", ".join(s_class)
        if self.argInfo.ARG_NM == "YOLO-Class":
            s_full_class = s_class
        s_confusionMatrix = pd.DataFrame(s_cm_matrix, columns=s_full_class, index=s_full_class)
        s_confusionMatrix = s_confusionMatrix.to_json(orient='split')
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
        s_className = self.model.names # 라벨명
        self.featureLog = {
            "classes": [*s_className.values(), "all classes"],
            "curves": []
        }
        
        self.metrics.pop('metrics/accuracy_top5' , None)
        self.metrics['precision'] = self.evaluateLog['precision'][1]
        self.metrics['recall'] = self.evaluateLog['recall'][1]
        self.metrics['fscore'] = self.evaluateLog['fscore'][1]
        s_path = p_dataSet.modelsetPath
        s_val_dir = os.path.join(s_path, 'images', 'val')  # 검
        class_names = sorted([d for d in os.listdir(s_val_dir) if os.path.isdir(os.path.join(s_val_dir, d))])
        name_to_idx = {n:i for i, n in enumerate(class_names)}

        img_paths = []
        y_true = []
        for cname in class_names:
            cdir = os.path.join(s_val_dir, cname)
            for fn in os.listdir(cdir):
                if fn.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.webp')):
                    img_paths.append(os.path.join(cdir, fn))
                    y_true.append(name_to_idx[cname])

        y_true = np.array(y_true, dtype=int)

        y_prob_list = []
        for r in self.model.predict(source=img_paths, stream=True, verbose=False):
            y_prob_list.append(r.probs.data.cpu().numpy()) # r.probs.data: shape [C], 확률 텐서 (v8 분류)

        y_prob = np.stack(y_prob_list, axis=0)  # [N, C]
        C = y_prob.shape[1]

        for c in range(C):
            y_true_c = (y_true == c).astype(np.uint8)
            y_score_c = y_prob[:, c]

            prec, rec, _ = precision_recall_curve(y_true_c, y_score_c)
            ap = average_precision_score(y_true_c, y_score_c)  # 분류에선 AP로 표기 권장

            self.featureLog["curves"].append({
                "class": class_names[c],
                "mAP50": round(float(ap), 3),
                "precision": sampleCurveData(prec, 50),
                "recall": sampleCurveData(rec, 50),
            })

        r_grid = np.linspace(0.0, 1.0, 50)

        P_interp = []
        for c in self.featureLog["curves"]:
            rec = np.array(c["recall"],    float)
            prec= np.array(c["precision"], float)

            for i in range(len(prec)-2, -1, -1):
                prec[i] = max(prec[i], prec[i+1])

            p_i = np.interp(r_grid, rec, prec, left=prec[0], right=prec[-1])
            P_interp.append(p_i)

        P_interp = np.stack(P_interp, axis=0)

        mean_map50 = np.mean([item["mAP50"] for item in self.featureLog["curves"]])
        mean_p = P_interp.mean(axis=0)
        mean_r = r_grid         

        self.featureLog["curves"].append({
            "class": "all classes",
            "mAP50": round(float(mean_map50), 3),
            "precision": sampleCurveData(mean_p, 50),
            "recall": sampleCurveData(mean_r, 50)
        })

    def onSaving(self, p_saveModelInfo:WP_SAVE_INFO_ATT, p_wpStorage):
        if self.useParams == None:
            self.useParams = algorithmService.getArgParam(self.parameter)

        s_dbMng = WpDataBaseManagement('meta')
        s_dbMng.delete('DP_MODEL_RESULT', {'UUID': p_saveModelInfo.comId})

        s_modelResult = {
            'evaluateLog': self.evaluateLog,
            'featureLog': self.metrics,
            'useParams': self.useParams,
            'curve': self.featureLog,
            'modelname': p_saveModelInfo.modelname,
            'argInfo': self.argInfo.__dict__,
            "scaler": type(p_saveModelInfo.scaler).__name__,
            'optimizer': False,
            'label': self.label
        }
        s_data = {
            'UUID': p_saveModelInfo.comId,
            'MODEL_RESULT': json.dumps(s_modelResult, cls=commonService.JsonEncoder)
        }
        s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')

        if p_saveModelInfo.modelsave == True:
            s_where = {
                'MODEL_NM': p_saveModelInfo.modelname,
                'REG_USER_NO': p_saveModelInfo.userno,
                "DEL_YN": "N"
            }
            s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
            if len(s_select) > 0:
                s_modelId = s_select['MODEL_ID'][0]
            else:
                s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
                s_modelId = s_insert.lastrowid

            try:
                s_mlflow = mlflowService.mlFlowClient(p_saveModelInfo.userno)
                s_mlflowInfo = s_mlflow.createRun(str(p_saveModelInfo.userno), s_modelId)
                s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

                self.model.model_path = p_saveModelInfo.model_path
                self.model.output_path = p_saveModelInfo.output_path
                s_mlflow.logModel(self.model, None, None, self.argInfo.FRAMEWORK_TYPE)

                self.metrics = {cleanKey(k): v for k, v in self.metrics.items()}
                s_mlflow.logMetrics(s_mlflowInfo['run_id'], self.metrics)

                s_mlflow.logParams(s_mlflowInfo['run_id'], self.useParams) 

                s_config = {
                    'evaluation': self.evaluateLog,
                    'feature_importance': self.featureLog
                }
                s_mlflow.logConfig(s_config, p_wpStorage)

                model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)

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

                s_mlflow.endRun(s_mlflowInfo['run_id'])
            except Exception as e:
                s_mlflow.endRun(s_mlflowInfo['run_id'])
                raise e
            
            s_modelPath = s_mlflow.mlflowModelPath  
                
            s_data = {
                'MODEL_IDX': model_version,
                'ARG_ID': self.argInfo.ARG_ID,
                'ARG_TYPE': self.argInfo.ARG_TYPE,
                'ACCURACY': self.evaluateLog['accuracy']*100,
                'REG_DATE': datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"),
                'MLFLOW_PATH': s_modelPath,
                'WF_ID': p_saveModelInfo.workflowId,
                'FRAMEWORK_TYPE': self.argInfo.FRAMEWORK_TYPE
            }
            s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

            s_data = {
                'MODEL_IDX': model_version,
                'MODEL_ID': s_modelId
            }
            s_where = {
                'UUID':p_saveModelInfo.comId 
            }
            s_dbMng.update('DP_MODEL_RESULT', s_data, s_where)
        s_dbMng.close()