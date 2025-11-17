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
        if self.o_storageManager.o_apiType == 'SPARK':
            self.localStorage.deleteDirs(self.modelData.modelsetPath)
            self.localStorage.createDirs(self.modelData.modelsetPath)
            self.localStorage.createDirs(f'{self.modelData.modelsetPath}/labels')
            self.localStorage.createDirs(f'{self.modelData.modelsetPath}/images')
        else:
            self.o_storageManager.createDirs(self.modelData.modelsetPath)
            self.o_storageManager.createDirs(f'{self.modelData.modelsetPath}/labels')
            self.o_storageManager.createDirs(f'{self.modelData.modelsetPath}/images')

    # ARG_TYPE이 YOLO일 경우 data.yaml 만들기
    def prepareMeta(self):
        if self.argInfo.ARG_NM == 'YOLO':
            if 'wp_dataset' in self.modelData.labelPath:
                
                self.cocoLabel = self.o_storageManager.readFile(f'{self.modelData.labelPath}/coco.json', p_option='json')
            else:
                self.cocoLabel = self.o_storageManager.readFile(f'{self.userno}/temp_labelset/{self.modelData.labelPath}_coco.json', p_option='json')
            # 🧷 클래스 목록 추출
            s_categoryList = sorted(self.cocoLabel['categories'], key=lambda c: c['id'])
            s_className = [cat['name'] for cat in s_categoryList]
            s_numClass = len(s_className)
            s_data = {
                'names': s_className,
                'nc': s_numClass,
                'train': f'images/train',
                'val': f'images/val'
            }
            if self.o_storageManager.o_apiType == 'SPARK':
                self.localStorage.writeFile(self.modelData.modelsetPath + '/data.yaml', s_data, 'yaml')
            else:
                self.o_storageManager.writeFile(self.modelData.modelsetPath + '/data.yaml', s_data, 'yaml')

    def setImageLabel(self):
        # YOLO일 경우 COCO -> YOLO 이미지라벨 형식으로
        if self.argInfo.ARG_NM == 'YOLO':

            # 이미지파일 사이즈리스트
            s_cocoImgSize = {img['id']: (img['width'], img['height']) for img in self.cocoLabel['images']}
            # category_id → 0부터 시작하는 YOLO용 class_id로 변환
            s_categoryId = {
                cat['id']: idx for idx, cat in enumerate(sorted(self.cocoLabel['categories'], key=lambda c: c['id']))
            }
            # 이미지 ID → 파일명 매핑
            s_cocoImgId = {img['id']: img['file_name'] for img in self.cocoLabel['images']}
           
            for ann in self.cocoLabel['annotations']:
                image_id = ann['image_id']
                category_id = ann['category_id']
                x, y, w, h = ann['bbox']
                
                image_w, image_h = s_cocoImgSize[image_id]
                x_center = (x + w / 2) / image_w
                y_center = (y + h / 2) / image_h
                w /= image_w
                h /= image_h
                class_id = s_categoryId[category_id]

                s_labelTxt = f"{class_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}\n"

                filename = os.path.splitext(os.path.basename(s_cocoImgId[image_id].replace("\\", "/")))[0] + '.txt'
                s_labelPath = os.path.join(self.modelData.modelsetPath +'/labels/', filename)

                # ✅ 한 줄씩 바로 append 저장 → 메모리 효율 최상
                if self.o_storageManager.o_apiType == 'SPARK':
                    self.localStorage.writeFile(
                        p_path=s_labelPath,
                        p_df=s_labelTxt,
                        p_option='txt',
                        p_encType='utf-8',
                        p_writeMode='a'  # append
                    )
                else:
                    self.o_storageManager.writeFile(
                        p_path=s_labelPath,
                        p_df=s_labelTxt,
                        p_option='txt',
                        p_encType='utf-8',
                        p_writeMode='a'  # append
                    )
                            

    
    # 5. 훈련 / 테스트 셋 분할
    def splitTrainTestData(self):
        # 메타데이터값 읽기
        # self.metaData = self.o_storageManager.readFile(self.modelData.modelsetPath + '/data.yaml', 'yaml')
        # === 경로 설정 ===
        # s_datasetImagePath = os.path.join(self.modelData.datasetPath, 'images')
        s_modelsetImagePath = os.path.join(self.modelData.modelsetPath, 'images')
        s_modelsetLabelPath = os.path.join(self.modelData.modelsetPath, 'labels')
        # === 이미지 파일 목록
        # s_imgList = self.o_storageManager.listFile(s_datasetImagePath, True)
        # === train/val 분할 (예: 8:2)
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

        # for img in s_imgList:
        #     s_currentImgPath = os.path.join(s_datasetImagePath, img)
        #     s_newImgPath = os.path.join(s_modelsetImagePath, img)
        #     self.o_storageManager.copyFile(s_currentImgPath, s_newImgPath)

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
        print(self.model)
        if self.o_storageManager.o_apiType != 'SPARK':
            # 데이터셋 path 다시 정의. root_path를 못 읽음
            self.modelData.modelsetPath = self.o_storageManager.o_rootPath + self.modelData.modelsetPath
            self.modelData.resultPath = self.o_storageManager.o_rootPath + self.modelData.resultPath
        self.model.onLearning(self.modelData)


    
    def evaluateModel(self):
        self.model.onEvaluating()
    
    def saveModel(self):
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
            'userno': self.userno,
            'metaDbInfo': self.metaDbInfo,
            'workflowId': self.workflowId,
            'model_path': self.modelData.resultPath + '/weights/best.pt'

        })

        self.model.onSaving(s_saveModelInfo)


    # '''전이학습 추가'''
    # def loadModel(self):
    #     s_className = self.argInfo.ARG_FILE_NAME
    #     s_classType = self.argInfo.ARG_TYPE
    #     s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.realpath(__file__))}/algorithm/{s_classType}/{s_className}.py")
    #     s_model = importlib.util.module_from_spec(s_spec)
    #     s_spec.loader.exec_module(s_model)
    #     self.model = getattr(s_model, s_className)(self.parameter, self.argInfo, self.learnedModelInfo)
    #     self.model.onLoading(self.userno)

    # # 7. 전이학습모델
    # def transferModel(self, p_code):
    #     self.model.onTransfering(p_code)

    # def trainModel(self):
    #     self.model.onTraining(self.modelData)