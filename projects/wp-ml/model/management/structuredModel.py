import importlib
import os
from typing import List, Union

from config.wp import getConfig
from serviceStorage.wpType import WpStorage
from model.algorithm import WISE_BASE_ALGORITHM, WISE_TRANSFER_ALGORITHM
from model.dataloader2 import WiseDataSet

from serviceStorage.common import WiseStorageManager

from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_ENSEMBLE_PARAMETER_ATT, ARG_MSTR_ATT, ARG_OPTIMIZER_ATT, ARG_PARTITION_ATT, ARG_PARAMETER_ATT, WP_SAVE_INFO_ATT
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
from mlflow.models.signature import infer_signature
import numpy as np
import pandas as pd
class WiseStructuredModel :
    def __init__(self,p_storageInfo:WpStorage, p_userno, p_argData, p_df, p_batch, p_jobId, p_workflowId):
        self.o_storageManager:WiseStorageManager = p_storageInfo
        self.argInfo:ARG_MSTR_ATT = ARG_MSTR_ATT(**p_argData['modelInfo'])
        if self.argInfo.ARG_NM != 'Ensemble':
            self.parameter:List[ARG_PARAMETER_ATT] = [
                ARG_PARAMETER_ATT(**param) for param in p_argData['parameter']
                ]
        else:
            self.parameter:List[ARG_ENSEMBLE_PARAMETER_ATT] = [
                ARG_ENSEMBLE_PARAMETER_ATT(
                    **{
                        **param,
                        "parameter": [ARG_PARAMETER_ATT(**p) for p in param["parameter"]]
                    }
                )
                for param in p_argData['parameter']
            ]
        self.optimizer:ARG_OPTIMIZER_ATT = ARG_OPTIMIZER_ATT(**p_argData['optimizer'])
        self.argInfo:ARG_MSTR_ATT = ARG_MSTR_ATT(**p_argData['modelInfo'])
        self.partition:ARG_PARTITION_ATT = ARG_PARTITION_ATT(**p_argData['partition'])
        self.modelData:WiseDataSet = WiseDataSet(p_df)
        self.userno = str(p_userno)
        self.modelname = p_argData['modelname']
        self.argType = p_argData['modelInfo']['ARG_TYPE']
        self.targetCol = p_argData['targetCol']
        self.useSchema = p_argData['use_schema']
        self.scalerName = p_argData['scaler']
        self.comId = p_argData['comId']
        self.batch = p_batch
        self.jobId = p_jobId
        self.workflowId = p_workflowId
        if self.modelname != '':
            self.modelsave = True
        else:
            self.modelsave = False
        self.scaler = None
        self.encoder = {}
        self.categoricalCols = []
        self.xCols = []
        self.signature = None
        # self.mlflow = False
        # self.modelLogger = None
        # self.mlflowInfo = None
        self.model:Union[WISE_BASE_ALGORITHM, WISE_TRANSFER_ALGORITHM] = None
        self.metaDbInfo = getConfig('','META_DB')
        # 'learnModelInfo'가 존재하면 DP_ARG_MSTR로 변환하여 저장, 없으면 None 할당
        self.learnedModelInfo = p_argData.get('learnedModel', None)
        # s_trackingUrl = "mysql://" + s_metaDbInfo['id'] + ":" + parse.quote(s_metaDbInfo['passwd']) + "@" +  s_metaDbInfo['host'] + ":" + s_metaDbInfo['port'] + "/mlflow"
        # o_modelLogger = mlflowService.mlFlowClient(self.o_storageManager['DEFAULT_PATH'],self.o_storageManager['type'],s_trackingUrl)
    # 1. null값 대체 : numeric은 0, string은 제거
    def controlNullData(self):
        for col in self.modelData.data.columns:
            if self.useSchema[col]  in ['integer', 'float', 'double']:
                self.modelData.data.fillna({col: 0}, inplace=True)
            elif self.useSchema[col]  in ['string']:
                self.modelData.data.dropna(subset=[col], inplace=True)
    
    # 2. 카테고리컬럼 추출 (라벨 인코딩을 위해)
    def setCategoricalColumn(self):
        # 종속변수 카테고리컬럼
        if self.argType == 'Clustering':
            # 목표 변수가 없으므로 ([미선택]이 목표 변수가 됨) 모든 컬럼을 다음 로직에 사용
            s_model_columns = self.modelData.data.columns
        else :
            s_model_columns = self.modelData.data.drop(columns=[self.targetCol]).columns
        
        for col in s_model_columns:
            # 종속변수 컬럼 기록
            self.xCols.append(col)
            # string일 경우 카테고리 컬럼 기록
            if self.useSchema[col]  in ['string']:
                self.categoricalCols.append(col)
        # 독립변수(분류일 경우)
        if self.argType =='Classification':
            self.categoricalCols.append(self.targetCol)

    # 3. 카테고리컬럼 라벨인코딩
    def setLabelEncodingData(self):
        for col in self.categoricalCols:
            s_encoder = LabelEncoder()
            self.modelData.data[col] = s_encoder.fit_transform(self.modelData.data[col])
            self.encoder[col] = list(s_encoder.classes_)

    # 4. 독립변수 종속변수 분리 / mlflow 스키마 설정
    def separateXYdata(self):
        if self.argType == 'Clustering':
            self.modelData.x_train = self.modelData.data
            self.modelData.x_data = self.modelData.data
            self.modelData.y_data = None
        else :
            self.modelData.x_data = self.modelData.data.drop(columns=[self.targetCol])
            self.modelData.y_data = self.modelData.data[self.targetCol]

        


    
    # 5. 훈련 / 테스트 셋 분할
    def splitTrainTestData(self):
        # LOOCV인데 데이터가 1000건 이상이면 t-holdout / 20 으로 변경
        # 군집은 비지도 학습이라 검증해야할 부분이 따로 없음 안하고 넘어감
        if self.argType != 'Clustering':
            if self.partition.type == 't-holdout':
                s_value = float(int(self.partition.value)/100)
                if s_value == 0:
                    s_value = 0.2
                self.modelData.x_train, self.modelData.x_test, self.modelData.y_train, self.modelData.y_test = train_test_split(self.modelData.x_data, self.modelData.y_data, test_size=s_value, random_state=42)

            if self.partition.type == 't-loocv':
                if len(self.modelData.x_data) > 1000:
                    self.partition.type = 't-holdout'
                    self.partition.value = '20'
                    self.modelData.x_train, self.modelData.x_test, self.modelData.y_train, self.modelData.y_test = train_test_split(self.modelData.x_data, self.modelData.y_data, test_size=s_value, random_state=42)
                else:
                    self.modelData.x_train, self.modelData.x_test, self.modelData.y_train, self.modelData.y_test = self.modelData.x_data, self.modelData.x_data, self.modelData.y_data, self.modelData.y_data
            if self.partition.type == 't-cv':
                self.modelData.x_train, self.modelData.x_test, self.modelData.y_train, self.modelData.y_test = self.modelData.x_data, None, self.modelData.y_data, self.modelData.y_data
    # 6. 스케일링
    def setScaleData(self):
        if (self.scalerName == 'MinMax Scale'):
            self.scaler = MinMaxScaler()
            self.modelData.x_train = self.scaler.fit_transform(self.modelData.x_train)
        elif (self.scalerName == 'Robust Scale'):
            self.scaler = RobustScaler()
            self.modelData.x_train = self.scaler.fit_transform(self.modelData.x_train)
        elif (self.scalerName == 'MaxAbs Scale'):
            self.scaler = MaxAbsScaler()
            self.modelData.x_train = self.scaler.fit_transform(self.modelData.x_train)
        elif (self.scalerName == 'Normalize'):
            self.scaler = Normalizer()
            self.modelData.x_train = self.scaler.fit_transform(self.modelData.x_train)
        else:
            self.scaler = StandardScaler()
            self.modelData.x_train = self.scaler.fit_transform(self.modelData.x_train)
            # x_test_scaled = s_scaler.transform(p_x_test)
        if self.partition.type == 't-holdout' and self.argType != 'Clustering':
            self.modelData.x_test = self.scaler.transform(self.modelData.x_test) 

        if self.partition.type != 't-holdout':
            self.modelData.x_test = self.modelData.x_train

        # 군집은 y_data가 None이라 따로 y_data를 만들어줌, None 값 들어가면 infer_signature에서 오류Add commentMore actions
        if self.argType == 'Clustering':
            s_y_data = self.modelData.y_data
        else :
            s_y_data = self.modelData.y_data[:3]
        self.signature = infer_signature(pd.DataFrame(self.modelData.x_train[:3], columns=self.modelData.x_data.columns), s_y_data)
    # 7. 모델 훈련
    def learnModel(self):
        s_className = self.argInfo.ARG_FILE_NAME
        s_classType = self.argInfo.ARG_TYPE
        s_spec = importlib.util.spec_from_file_location(
            s_className,
            os.path.join(os.path.dirname(__file__), "..", "algorithm", s_classType, f"{s_className}.py")
        )
        s_model = importlib.util.module_from_spec(s_spec)
        s_spec.loader.exec_module(s_model)
        self.model = getattr(s_model, s_className)(self.parameter, self.optimizer, self.argInfo)
        print(self.model)
        self.model.onLearning(self.modelData)

    def predictModel(self):
        self.model.onPredicting(self.modelData,  self.partition)
    
    def evaluateModel(self):
        self.model.onEvaluating(self.modelData, self.encoder, self.argInfo.ARG_NM, self.targetCol)
    
    def saveModel(self):
        print("saveModel 호출 완료")
        # 모델 이름 세팅. 없으면 알고리즘 + JOBID로. (워크플로우에 결과 보여줄 DB저장용도)
        if self.modelname == '':
            s_modelname = f'{self.argInfo.ARG_NM}_{self.jobId}'
        else:
            s_modelname = self.modelname

        # 모델 저장시 필요한 내용 정의
        s_saveModelInfo:WP_SAVE_INFO_ATT = WP_SAVE_INFO_ATT(**{
            'batch': self.batch,
            'comId': self.comId,
            'modelsave': self.modelsave,
            'modelname': s_modelname,
            'scaler': self.scaler,
            'userno': self.userno,
            'signature': self.signature,
            'encoder': self.encoder,
            'metaDbInfo': self.metaDbInfo,
            'targetCol': self.targetCol,
            'workflowId': self.workflowId

        })
        
        s_sampleData = self.modelData.x_data[:3]

        # if self.learnedModelInfo != None and self.learnedModelInfo['FRAMEWORK_TYPE'] in ['TensorFlow/Keras', 'PyTorch']:
        #     s_saveModelInfo.signature = infer_signature(
        #         self.modelData.x_data[:5].to_numpy().astype(np.float32), 
        #         self.modelData.y_data[:5].to_numpy().astype(np.float32).reshape(-1)
        #     )
        #     s_sampleData = self.modelData.x_data[:3].to_numpy().astype(np.float32)
        # if self.learnedModelInfo != None and self.learnedModelInfo['FRAMEWORK_TYPE'] == 'PyTorch':
        #     s_saveModelInfo.signature = infer_signature(
        #         self.modelData.x_train[:5],
        #         self.modelData.y_train[:5]
        #     )
        #     s_sampleData = self.modelData.x_train[:3]
        self.model.onSaving(s_sampleData, s_saveModelInfo, self.o_storageManager.o_wpStorage)


    '''전이학습 추가'''
    def loadModel(self):
        s_className = self.argInfo.ARG_FILE_NAME
        s_classType = self.argInfo.ARG_TYPE
        s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.realpath(__file__))}/algorithm/{s_classType}/{s_className}.py")
        s_model = importlib.util.module_from_spec(s_spec)
        s_spec.loader.exec_module(s_model)
        self.model = getattr(s_model, s_className)(self.parameter, self.argInfo, self.learnedModelInfo)
        self.model.onLoading(self.userno)

    # 7. 전이학습모델
    def transferModel(self, p_code):
        self.model.onTransfering(p_code)

    def trainModel(self):
        self.model.onTraining(self.modelData)