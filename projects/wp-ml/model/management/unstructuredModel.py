import importlib
import os
from typing import List, Union

from config.wp import getConfig
from serviceStorage.wpType import WpStorage
from model.algorithm import WISE_IMAGE_ALGORITHM
from model.dataloader2 import WiseImageSet

from serviceStorage.common import WiseStorageManager
from sklearn.model_selection import train_test_split
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_MSTR_ATT, ARG_OPTIMIZER_ATT, ARG_PARTITION_ATT, ARG_PARAMETER_ATT, WP_SAVE_INFO_ATT
from serviceStorage.localService import localStorage

class WiseUnstructuredModel :
    def __init__(self,p_storageInfo:WpStorage, p_userno, p_argData, p_df, p_batch, p_jobId, p_workflowId):
        self.o_storageManager:WiseStorageManager = p_storageInfo
        self.argInfo:ARG_MSTR_ATT = ARG_MSTR_ATT(**p_argData['modelInfo'])
        self.parameter:List[ARG_PARAMETER_ATT] = [
                ARG_PARAMETER_ATT(**param) for param in p_argData['parameter']
                ]
        self.optimizer:ARG_OPTIMIZER_ATT = ARG_OPTIMIZER_ATT(**p_argData['optimizer'])
        self.argInfo:ARG_MSTR_ATT = ARG_MSTR_ATT(**p_argData['modelInfo'])
        self.partition:ARG_PARTITION_ATT = ARG_PARTITION_ATT(**p_argData['partition'])
        self.userno = str(p_userno)
        self.modelname = p_argData['modelname']
        self.argType = p_argData['modelInfo']['ARG_TYPE']
        self.comId = p_argData['comId']
        self.batch = p_batch
        self.jobId = p_jobId
        self.workflowId = p_workflowId
        self.modelData = WiseImageSet(p_df)
        self.modelData.modelsetPath = f'{self.userno}/temp_modelset/{self.comId}'
        self.modelData.resultPath = f'{self.userno}/temp_modelset/{self.comId}/output'
        self.modelData.labelPath = self.modelData.data['labelpath'][0]
        self.cocoLabel = None
        self.metaData = None
        if self.modelname != '':
            self.modelsave = True
        else:
            self.modelsave = False
        self.model:Union[WISE_IMAGE_ALGORITHM] = None
        self.metaDbInfo = getConfig('','META_DB')
        if self.o_storageManager.o_apiType == 'SPARK':
            self.basePath = os.path.dirname(__file__)
            self.localStorage =  localStorage(self.userno, {'DEFAULT_PATH': ''})
            self.modelData.modelsetPath = os.path.join(self.basePath, '..', '..', 'py_result', self.modelData.modelsetPath)
            self.modelData.resultPath = os.path.join(self.basePath, '..', '..', 'py_result', self.modelData.resultPath)
        

    # createDataset
    def createModelset(self):
        self.o_storageManager.createDirs(self.modelData.modelsetPath)
        self.o_storageManager.createDirs(f'{self.modelData.modelsetPath}/labels')
        self.o_storageManager.createDirs(f'{self.modelData.modelsetPath}/images')

    # 5. 훈련 / 테스트 셋 분할
    def splitTrainTestData(self):

        s_modelsetImagePath = os.path.join(self.modelData.modelsetPath, 'images')
        s_modelsetLabelPath = os.path.join(self.modelData.modelsetPath, 'labels')

        s_value = float(int(self.partition.value)/100)
        if s_value == 0:
            s_value = 0.2
        s_train, s_val = train_test_split(self.modelData.data, test_size=s_value, random_state=42)
        # === 모델셋의 이미지, 라벨폴더에 하위 폴더 생성
        for split in ['train', 'val']:
            if self.o_storageManager.o_apiType == 'SPARK':
                self.localStorage.createDirs(os.path.join(s_modelsetImagePath, split))
                self.localStorage.createDirs(os.path.join(s_modelsetLabelPath, split))
            else:
                self.o_storageManager.createDirs(os.path.join(s_modelsetImagePath, split))
                self.o_storageManager.createDirs(os.path.join(s_modelsetLabelPath, split))

        # train, test 이미지 욺기기
        for split, file_df in [('train', s_train), ('val', s_val)]:
            for _, file in file_df.iterrows():
                s_currentImgPath = file['filepath']
                s_currentLabelPath = os.path.join(s_modelsetLabelPath, os.path.splitext(file['filename'])[0] + '.txt')

                s_newImgPath = os.path.join(s_modelsetImagePath, split, file['filename'])
                s_newLabelPath = os.path.join(s_modelsetLabelPath, split, os.path.splitext(file['filename'])[0] + '.txt')
                # 스파크일 경우는 하둡에서 -> 로컬의 모델데이터셋경로로 이미지 다운로드
                if self.o_storageManager.o_apiType == 'SPARK':
                    with open(s_newImgPath, 'wb') as f:
                        for chunk in self.o_storageManager.downloadFile(s_currentImgPath):
                            f.write(chunk)
                    self.localStorage.moveFile(s_currentLabelPath, s_newLabelPath)
                else:
                    self.o_storageManager.copyFile(s_currentImgPath, s_newImgPath)
                    self.o_storageManager.moveFile(s_currentLabelPath, s_newLabelPath)


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
        self.model = getattr(s_model, s_className)(self.parameter, self.argInfo)
        
        self.modelData.modelsetPath = self.o_storageManager.o_rootPath + self.modelData.modelsetPath
        self.modelData.resultPath = self.o_storageManager.o_rootPath + self.modelData.resultPath
        self.model.onLearning(self.modelData, self.userno)

    # 5. 훈련 / 테스트 셋 분할
    def splitTrainTestDataTag(self):
        s_modelsetImagePath = os.path.join(self.modelData.modelsetPath, 'images')
        
        # === train/val 분할 (예: 8:2)
        s_value = float(int(self.partition.value)/100)
        if s_value == 0:
            s_value = 0.2
        s_train, s_val = train_test_split(self.modelData.data, test_size=s_value, random_state=42)
        # === 모델셋의 이미지, 라벨폴더에 하위 폴더 생성
        for split in ['train', 'val']:
            for tag in self.modelData.data['tag'].unique():
                self.o_storageManager.createDirs(os.path.join(s_modelsetImagePath, split, str(tag)))

        # train, test 이미지 욺기기
        for split, file_df in [('train', s_train), ('val', s_val)]:
            for _, file in file_df.iterrows():
                s_currentImgPath = file['filepath']
                s_newImgPath = os.path.join(s_modelsetImagePath, split, file['tag'], file['filename'])
                self.o_storageManager.copyFile(s_currentImgPath, s_newImgPath)
        
    def evaluateModelTag(self):
        self.model.onEvaluating(self.modelData)
    
    def evaluateModel(self):
        self.model.onEvaluating()
    
    def saveModel(self):

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
            'userno': self.userno,
            'metaDbInfo': self.metaDbInfo,
            'workflowId': self.workflowId,
            'model_path': self.modelData.resultPath + '/weights/best.pt',
            'output_path': self.modelData.resultPath 

        })

        self.model.onSaving(s_saveModelInfo, self.o_storageManager.o_wpStorage)

    def setModel(self):
        s_className = self.argInfo.ARG_FILE_NAME
        s_classType = self.argInfo.ARG_TYPE
        s_spec = importlib.util.spec_from_file_location(
            s_className,
            os.path.join(os.path.dirname(__file__), "..", "algorithm", s_classType, f"{s_className}.py")
        )
        s_model = importlib.util.module_from_spec(s_spec)
        s_spec.loader.exec_module(s_model)
        self.model = getattr(s_model, s_className)(self.parameter, self.argInfo)
        print(self.model)
        if self.o_storageManager.o_apiType != 'SPARK':
            # 데이터셋 path 다시 정의. root_path를 못 읽음
            self.modelData.modelsetPath = self.o_storageManager.o_rootPath + self.modelData.modelsetPath
            self.modelData.resultPath = self.o_storageManager.o_rootPath + self.modelData.resultPath

        # DB에서 재학습한 모델 학습 결과 가져오기
        s_dbMng = WpDataBaseManagement('meta')
        s_modelResult = s_dbMng.select('DP_MODEL_RESULT', {"UUID":self.comId} )
        print("s_modelResult: ", s_modelResult)
        s_modelResult = json.loads(s_modelResult['MODEL_RESULT'][0])
        self.model.evaluateLog = s_modelResult['evaluateLog']
        self.model.metrics = s_modelResult['featureLog']
        self.model.featureLog = s_modelResult['curve']
        s_basePath = os.path.dirname(__file__)
        s_localPath = f'{self.userno}/relearn'
        s_localPath = os.path.join(s_basePath, '..', '..', 'py_result', s_localPath) 
        self.model.model = self.model.o_argorithm(f'{s_localPath}/best.pt')
        # self.model.model = self.model.o_argorithm(f'{s_localPath}/weights/best.pt')
        self.model.label = s_modelResult['label']

