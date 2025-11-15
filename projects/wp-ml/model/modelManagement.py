import importlib
import os
from typing import List
import uuid

from sklearn.model_selection import StratifiedKFold
from serviceMlflow import mlflowService
from serviceStorage.wpType import WpStorage
from model.algorithm.att.WP_ALGORITHM_ATT import ALGORITHM_ATT
from model.algorithm import WISE_BASE_ALGORITHM
from model.dataloader import WiseDataSet
from model.algorithm.att.WP_VAR_ATT import DP_VAR_MSTR_ATT, PARTITION_ATT
from sklearn.model_selection import KFold, StratifiedKFold, LeaveOneOut, cross_val_predict
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_PARAMETER_ATT
from serviceStorage.common import WiseStorageManager

class WiseModelManagement :
    def __init__(self,p_storageInfo:WpStorage,p_userNo):
        self.algorithms = {}
        self.o_storageManager:WiseStorageManager = p_storageInfo
        self.o_userNo = p_userNo
        self.o_uuid = None
        self.mlflow = False
        self.modelLogger = None
        self.mlflowInfo = None

        # s_metaDbInfo = getConfig('','META_DB')
        # s_trackingUrl = "mysql://" + s_metaDbInfo['id'] + ":" + parse.quote(s_metaDbInfo['passwd']) + "@" +  s_metaDbInfo['host'] + ":" + s_metaDbInfo['port'] + "/mlflow"
        # o_modelLogger = mlflowService.mlFlowClient(self.o_storageManager['DEFAULT_PATH'],self.o_storageManager['type'],s_trackingUrl)

    def add_algorithm(self, algorithm: WISE_BASE_ALGORITHM):
        self.algorithms[algorithm.get_name()] = algorithm
    
    def remove_algorithm(self, algorithm_name):
        if algorithm_name in self.algorithms:
            del self.algorithms[algorithm_name]
    
    def execute_algorithm(self, p_varInfo:List[DP_VAR_MSTR_ATT],p_algorithmInfo:ALGORITHM_ATT,p_partitionInfo:PARTITION_ATT, p_data):
        self.o_uuid = str(uuid.uuid1())

        s_dataSet = WiseDataSet(p_data,p_varInfo)

        s_dataSet.onSplitTrainTest(s_dataSet.getTargetColumnNm(),p_partitionInfo)
        s_dataSet.setFeature()
        s_varInfo:List[DP_VAR_MSTR_ATT] = p_varInfo
        s_algorithmInfo:ALGORITHM_ATT = p_algorithmInfo
        
        #s_className = s_algorithmInfo.argorithm.ARG_FILE_NAME.replace(".py","")
        s_className = p_algorithmInfo.argorithm.ARG_FILE_NAME
         
        print(f"=========================={s_className}==========================")
        s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.realpath(__file__))}/algorithm/{s_className}.py")
        #s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.realpath(__file__))}/algorithm/" + s_algorithmInfo.argorithm.ARG_FILE_NAME )
        s_model = importlib.util.module_from_spec(s_spec)
        
        s_spec.loader.exec_module(s_model)

        if self.mlflow:            
            self.modelLogger = mlflowService.mlFlowClient(s_algorithmInfo.argorithm.ARG_NM)
            self.mlflowInfo = self.modelLogger.createRun(p_userNo = self.o_userNo, p_runName = self.o_uuid)
            self.modelLogger.startRun(self.mlflowInfo['run_id'])
        
        a :List[ARG_PARAMETER_ATT] = []
        for tmp in p_algorithmInfo.parameter:
            a.append(ARG_PARAMETER_ATT(
                name= tmp.PARAM_NM,
                type=tmp.PARAM_VALUE['TYPE'],
                value=tmp.PARAM_VALUE['VALUE'],
                options=tmp.PARAM_VALUE['OPTION'],
            ))
        s_modelInstance:WISE_BASE_ALGORITHM = getattr(s_model, s_className)(p_parameter=a,p_optimizer=p_algorithmInfo.optimizer,p_argInfo=p_algorithmInfo.argorithm)
        
        s_predictResult = s_modelInstance.onLearning(s_dataSet)
        
        if s_predictResult == False :
            raise RuntimeError("학습오류")

        s_model = s_modelInstance.model
        
        s_predictionData = None

        if p_partitionInfo.type == 't-holdout': 
            s_predictionData = s_modelInstance.onPredicting(s_dataSet,ARG_PARTITION_ATT(type=p_partitionInfo.option.type,value=p_partitionInfo.option.value))
        else :
            if p_partitionInfo.type == 't-cv':
                s_foldCnt = s_dataSet.o_partitionInfo.option.value
                if s_algorithmInfo.argorithm.ARG_TYPE == 'Classification' :
                    s_cvValue = StratifiedKFold(n_splits=int(s_foldCnt), shuffle=True)
                else :
                    s_cvValue = KFold(n_splits=int(s_foldCnt), shuffle=True)
            # Leave One Out 교차 검증
            elif p_partitionInfo.type == 't-loocv':
                s_cvValue = LeaveOneOut()
            s_predictionData = cross_val_predict(s_model, s_dataSet.x_train, s_dataSet.y_train, cv=s_cvValue)            
        

        # if s_algorithmInfo.argorithm.ARG_TYPE == 'Classification' :
        #     if "Decision Tree" == s_algorithmInfo.argorithm.ARG_NM :
        #         classfierService.saveTreeGraph(s_model,self.o_userNo,self.o_uuid,s_dataSet.getDataColumns())

        s_filename = str(self.o_userNo) + '/pkl/' + s_algorithmInfo.argorithm.ARG_TYPE + '_' + s_algorithmInfo.argorithm.ARG_FILE_NAME + '_' + self.o_uuid
        self.o_storageManager.createDirs(str(self.o_userNo) + '/pkl/')
        #a = self.o_storageManager.saveModel(s_filename,s_model)
        #print(a)
        # if fileService.saveModelPkl(s_model, s_algorithmInfo.argorithm.ARG_TYPE, s_algorithmInfo.argorithm.ARG_NM, self.o_userNo, self.o_uuid):
        #     print("###### Pkl Save Success #########")
        # else:
        #     print("###### Pkl Save Fail ########")

        c = {}

        c[s_dataSet.getTargetColumnNm()] = list(s_dataSet.o_labelEncoder.classes_)
        s_modelInstance.onEvaluating(p_dataSet=s_dataSet,p_encoder=c,p_modelname=s_algorithmInfo.argorithm.ARG_FILE_NAME,p_targetCol=s_dataSet.getTargetColumnNm())    
        s_output = {
            "optParams":"",
            "featureLog":s_modelInstance.featureLog,
            "reVal":s_modelInstance.evaluateLog['result'],
            "accuracy":s_modelInstance.evaluateLog['accuracy'],
            "precision":s_modelInstance.evaluateLog['precision'],
            "recall":s_modelInstance.evaluateLog['recall'],
            "fscore":s_modelInstance.evaluateLog['fscore'],
            "support":s_modelInstance.evaluateLog['support'],
            "uuid" : self.o_uuid
        }
        if self.mlflow:
            self.modelLogger.logArtifacts(self.mlflowInfo['run_id'], self.o_uuid, 'model')
            self.modelLogger.endRun(self.mlflowInfo['run_id'])
            self.modelLogger.saveModel(s_model, self.o_uuid, 'sklearn', s_dataSet.o_x_train, s_predictionData)
            self.modelLogger.logArtifacts(self.mlflowInfo['run_id'], self.o_uuid, 'model')
            self.modelLogger.logModelMetrics(self.mlflowInfo['run_id'], 'sklearn', s_model, s_output)
            # 학습 종료
            self.modelLogger.endRun(self.mlflowInfo['run_id'])
            s_output['mlflow'] = str(self.mlflowInfo)
        
        return s_output
    
    def list_algorithms(self):
        return list(self.algorithms.keys())