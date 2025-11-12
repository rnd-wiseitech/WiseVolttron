import pandas as pd
import sys as sys
import os
from config.wp import getConfig
from serviceData import dataService
from serviceStorage import common
from database.manager import WpDataBaseManagement
import gc
from cachetools import TTLCache

class dataSource():
    def __init__(self, p_userNo, p_extra=None,p_storageType='',p_apiType='',p_storageInfo=None):
        # self.dataset = {} # dataset
        # 보관시간 하루. 하루지나면 자동으로 해제
        self.dataset = TTLCache(maxsize=100, ttl=86400) # dataset
        self.sdataset = {} # scale dataset
        self.edataset = {} # epoch dataset
        self.bdataset = {} # backup dataset
        self.tdataset = {} # streaming output dataset
        self.scaleList = {} # use scale array
        self.cdataset = pd.DataFrame # custom function code data
        self.userNo = p_userNo # userno
        self.o_storageType = p_storageType
        self.o_apiManager = None
        
        self.o_apiType = p_apiType

        self.o_storageManager = common.WiseStorageManager(p_userNo, self.o_apiType, self.o_storageType, p_extra=p_extra, p_storageInfo=p_storageInfo)
            
        self.o_rootPath = '/'

        self.o_fileFormat = getConfig('', 'FILE_FORMAT')
        
    def getRootPath(self):
        return self.o_storageManager.getPath()
    
    def getDataSet2(self, p_key):
        
        s_reData = None
        # if self.o_apiType == 'SPARK' :
        #     s_reData = self.o_storageManager.readView(p_key)
        # else :
        s_reData = self.dataset[p_key]

        return s_reData
    '''
    데이터셋 추가
    p_id : 데이터셋 아이디
    p_filename: 파일명
    '''

    def addDataSet(self, p_df, p_userno, p_jobId, p_groupId, p_userId=None, p_filename=None, p_filetype='csv', p_workflowId=None, p_temp=True, p_writeMode='overwrite'):
        s_viewname = str(p_userno) + "_" + str(p_groupId) + "_" + str(p_jobId)
        s_index = None
        # OUTPUT O-DATASOURCE 경우
        if p_temp == False:
            # 저장 파일 형식
        
            
            # DS_VIEW_IDX 가져오기 (DS_VIEW_TBL_MSTR 조회)
            s_dbMng = WpDataBaseManagement('meta')
            s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', \
                                            f" where DS_VIEW_ID='{p_filename}' and REG_USER_NO='{p_userno}' and DEL_YN='N'")
            
            s_index = s_dsViewTblMstr['VIEW_IDX'][0]
            # s_index가 None이 아닐 경우 overwrite로 판단
            if s_index != None:
                s_index = s_index + 1
            # s_index가 None일 경우 new로 판단.
            else:
                s_index = 0
            # if getConfig('', 'FILE_FORMAT') == 'delta':
            
            # 파일명
            # delta일 경우 index 없는 폴더로 저장됨
            if p_filetype == 'delta':
                s_filename =  str(p_filename) + "." + p_filetype
            else :
                # 파일명
                p_filetype = self.o_fileFormat
                s_filename = str(p_filename) + "_" + str(s_index) + "." + p_filetype
            
            # API_TYPE : COMMON
            if self.o_apiType.upper() == 'COMMON':
                s_realPath = self.o_rootPath + str(p_userno) + '/wp_dataset/' + str(p_filename) + '/'
                # 실제 저장 폴더 체크
                if not self.o_storageManager.checkExist(s_realPath) :
                    self.o_storageManager.createDirs(s_realPath)
                    # 폴더 소유 설정
                    if p_userId != None:
                        self.o_storageManager.setOwner(s_realPath, p_userId)

                # 저장
                self.o_storageManager.writeFile(f"{s_realPath}{s_filename}", p_df, p_option=p_filetype, p_writeMode=p_writeMode)
                if p_userId != None:
                    self.o_storageManager.setOwner(f"{s_realPath}{s_filename}", p_userId)
                       
            # p_batch=False
            p_batch=False
            if p_batch != True:
                s_update = 'N'
            else:
                s_update = 'Y'
            # s_index가 None이 아닐때 = overwrite일 때 update를 Y로 변경, 그래야 overwrite해도 값이 잘 나옴
            if s_index != None :
                s_update = 'Y'
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.executeOutputMetaDB(p_filename, s_index, s_update, p_userno, p_workflowId)
            s_viewname = str(p_userno) + "_" + str(p_filename)
        
        else :
            self.dataset[s_viewname] = p_df
        
        return s_viewname, s_index
  
    '''
    데이터셋 getter
    p_param: 데이터 정보 (USER_NO, fileName) 
    '''
    def getDataSet(self, p_param):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        if not set([(s_userno, s_filename)]).issubset( set(self.dataset.keys())):
            s_uploadType = p_param['fileType']
            s_df = dataService.readNewData(s_uploadType, p_param)
            self.dataset[s_userno, s_filename] = s_df
            return self.dataset[s_userno, s_filename].copy()
        else :
            return self.dataset[s_userno, s_filename].copy()
    
    def addImageDataSet(self, p_df, p_userno, p_jobId, p_groupId, p_userId=None, p_filename=None, p_filetype='csv', p_workflowId=None, p_temp=True):
        s_viewname = str(p_userno) + "_" + str(p_groupId) + "_" + str(p_jobId)
        s_index = None
        if p_temp == False:
            # 임지 저장 경로 (/ 유저 번호 / tmp_dataset)
            s_tmpDir = f'/{p_userno}/temp_labelset'
            # DS_VIEW_IDX 가져오기 (DS_VIEW_TBL_MSTR 조회)
            s_dbMng = WpDataBaseManagement('meta')
            s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', \
                                            f" where DS_VIEW_ID='{p_filename}' and REG_USER_NO='{p_userno}' and DEL_YN='N'")
            
            s_index = s_dsViewTblMstr['VIEW_IDX'][0]
            # s_index가 None이 아닐 경우 overwrite, None면 new로 판단
            if s_index != None:
                s_index = s_index + 1
            else:
                s_index = 1

            # 파일명
            s_filename = str(p_filename) + "_" + str(s_index) + "." + self.o_fileFormat

            # # LOCAL/COMMON일 경우
            if self.o_apiType.upper() == 'COMMON':
                # 이미지 데이터셋 저장 경로 (user번호 / wp_dataset / DS_VIEW 번호 / 버전 번호)
                s_basePath = str(p_userno) + '/wp_dataset/' + str(p_filename) + '/' + str(s_index)
                s_realPath = self.o_rootPath + s_basePath
                # 이미지 경로 폴더 생성
                self.o_storageManager.createDirs(s_basePath + '/' + 'images')
                # 원본 이미지 데이터 images로 복사
                for s_file in p_df['filepath']:
                    self.o_storageManager.copyFile(s_file, s_basePath + '/' + 'images')


                # 이미지 라벨 컴퍼넌트 여부 확인
                if 'labelpath' in p_df.columns:
                    # 이미지데이터셋 라벨 폴더 생성
                    self.o_storageManager.createDirs(s_basePath + '/' + 'labels')
                    # 임시저장 라벨파일 -> 이동
                    self.o_storageManager.moveFile(s_tmpDir+f"/{p_df['labelpath'].iloc[0]}_ui.json", s_basePath + '/' + 'labels/ui.json')
                    self.o_storageManager.moveFile(s_tmpDir+f"/{p_df['labelpath'].iloc[0]}_coco.json", s_basePath + '/' + 'labels/coco.json')
                    # 파일 욺기고 데이터셋 경로로 변경
                    p_df['labelpath'] = s_basePath + '/labels'
                    
                # filepath 경로 데이터셋 경로로 수정
                p_df['filepath'] = s_basePath + '/images/' + p_df['filename']
                # csv 저장
                self.o_storageManager.writeFile(f"{str(p_userno) + '/wp_dataset/' + str(p_filename)}/{s_filename}", p_df, p_option=self.o_fileFormat)

                # 폴더 소유 설정
                if p_userId != None:
                    self.o_storageManager.setOwner(s_basePath, p_userId)

            p_batch=False
            if p_batch != True:
                s_update = 'N'
            else:
                s_update = 'Y'
            # s_index가 None이 아닐때 = overwrite일 때 update를 Y로 변경, 그래야 overwrite해도 값이 잘 나옴
            if s_index != None :
                s_update = 'Y'
            s_dbMng = WpDataBaseManagement('meta')
            s_dbMng.executeOutputMetaDB(p_filename, s_index, s_update, p_userno, p_workflowId, 40)
            s_viewname = str(p_userno) + "_" + str(p_filename)

        # if self.o_apiType == 'SPARK' :
        #     self.o_storageManager.createView(s_viewname, p_df)

        # else :
        self.dataset[s_viewname] = p_df
        
        return s_viewname, s_index, p_df
    '''
    데이터셋 setter
    p_param: 데이터 정보 (USER_NO, fileName) 
    p_df: 설정할 데이터 프레임
    '''
    def setDataSet(self,p_param, p_df):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        self.dataset[s_userno, s_filename] = p_df

    '''
    스케일 데이터셋 getter
    p_param: 데이터 정보 (USER_NO, fileName) 
    '''
    def getScaleDataSet(self, p_param):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        
        if not set([(s_userno, s_filename)]).issubset( set(self.sdataset.keys())):
            if not set([(s_userno, s_filename)]).issubset( set(self.dataset.keys())):
                s_uploadType = p_param['uploadType']
                s_df = dataService.readNewData(s_uploadType, p_param)
            else:
                s_df = self.dataset[str(s_userno), s_filename]
            self.sdataset[s_userno, s_filename] = s_df
            return self.sdataset[s_userno, s_filename].copy()
        else :
            s_df = self.sdataset[s_userno, s_filename]
            self.sdataset[s_userno, s_filename] = s_df
            return self.sdataset[s_userno, s_filename].copy()

    '''
    스케일 데이터셋 setter
    p_param: 데이터 정보 (USER_NO, fileName) 
    p_df: 설정할 데이터 프레임
    '''
    def setScaleDataSet(self, p_param, p_df):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        self.sdataset[s_userno, s_filename] = p_df

    '''
    스케일 getter
    p_param: 데이터 정보 (USER_NO, fileName) 
    '''
    def getUseScale(self, p_param):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        
        if not set([(s_userno, s_filename)]).issubset( set(self.scaleList.keys())):            
            return None
        else :
            return self.scaleList[s_userno, s_filename]

    '''
    스케일 setter
    p_param: 데이터 정보 (USER_NO, fileName) 
    p_scale: 설정할 스케일
    '''
    def setUseScale(self, p_param, p_scale):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        self.scaleList[s_userno, s_filename] = p_scale
                
    '''
    epoch 데이터셋 getter
    p_param: 데이터 정보 (USER_NO, fileName) 
    p_uuid: 모델 uuid
    p_epochs: epoch
    '''
    def getEpochDataSet(self, p_param, p_uuid, p_epochs):
        s_userno = str(p_param['USER_NO'])
        if not set([(s_userno, p_uuid, p_epochs)]).issubset(set(self.edataset.keys())):
            return []
        else :
            return self.edataset[s_userno, p_uuid, p_epochs]
    '''
    epoch 데이터셋 setter
    p_param: 데이터 정보 (USER_NO, fileName)
    p_uuid: 모델 uuid
    p_df: 설정할 데이터프레임
    p_epochs: epoch
    p_bertFlag: bert 여부
    p_poseFlag: pose 여부
    '''
    def setEpochDataSet(self, p_param, p_uuid, p_df, p_epochs, p_bertFlag=False, p_poseFlag=False):
        s_userno = str(p_param['USER_NO'])
        s_df = p_df.copy()
        
        if not set([(s_userno, p_uuid, p_epochs)]).issubset(set(self.edataset.keys())):
            self.edataset[s_userno, p_uuid, p_epochs] = {'data':[]}
        # 2020.04.14 추가. 기존에는 append로 array에 배치 데이터를 적재하는 형식이였는데
        # 배치 data에도 epoch파라미터를 추가해서 이제는 push가 아닌 그냥 덮어씌움.
        else :
            # 2020.05.08 추가. 분석이 진행중일 경우.
            if s_df != None:
                if p_bertFlag:
                    # 47 Accuracy 계산 방식 선택에 따른 키값의 명칭 선택 오류로 조건 추가
                    s_accKey = 'sparse_categorical_accuracy' if ('sparse_categorical_accuracy') in s_df.keys() else 'categorical_accuracy'

                    if 'val_loss' in s_df : 
                        s_df = {
                            'epochs': p_epochs,
                            'loss' : s_df['loss'],
                            'accuracy' : s_df[s_accKey],
                            'val_loss' : s_df['val_loss'],
                            'val_accuracy' : s_df['val_'+s_accKey],
                        }
                    elif 'loss' in s_df :
                        s_df = {
                            'epochs': p_epochs,
                            'batch': 0,
                            'loss' : s_df['loss'],
                            'accuracy' : s_df[s_accKey]
                        }
                    elif 'train_loss' in s_df:
                        s_df = {
                            'epochs': p_epochs,
                            'train_loss': s_df['train_loss'],
                            'valid_loss': 0,
                            # 'metric': s_df['metric'],
                            # 'lr': s_df['lr'],
                            # 'metric_name': s_df['metric_name']
                        }
                    else:
                        s_df = {
                            'epochs': p_epochs,
                            'batch': 0,
                            'loss' : 0,
                            'accuracy' : 0
                        }
                # 210125 추가
                elif p_poseFlag:
                    if 'val_loss' in s_df : 
                        s_df = {
                            'epochs': p_epochs,
                            'loss' : s_df['loss'],
                            'accuracy' : s_df['scmap_loss'],
                            'val_loss' : s_df['val_loss'],
                            'val_accuracy' : s_df['val_accuracy'],
                        }
                    else :
                        # s_acc = 0
                        # if p_epochs >= 2:
                        #     s_acc = self.edataset[s_userno, p_uuid, p_epochs-1]['data']['scmap_loss']
                        s_df = {
                            'epochs': p_epochs,
                            'batch': 0,
                            'loss' : s_df['loss'],
                            'accuracy' : s_df['scmap_loss']
                        }
                else:
                    s_df['epochs'] = p_epochs
            # 분석이 끝났을 경우(조기종료 또는 분석완료)
            else:
                # 조기종료시에는 조기종료된 값들을 먼저 불러와서 loss, accuracy에 넣어준다.
                s_lastData = self.edataset[s_userno, p_uuid, p_epochs]
          
                s_df = {
                        'finish': True,
                        'epochs': p_epochs,
                        'loss': s_lastData['data']['loss'],
                        'accuracy': s_lastData['data']['accuracy'],
                        'val_loss': s_lastData['data']['val_loss'],
                        'val_accuracy': s_lastData['data']['val_accuracy']
                        }
                
               
            if 'val_loss' in s_df:
                print('==========set Data ' + str(p_epochs) + '==========')
               
            self.edataset[s_userno, p_uuid, p_epochs]['data'] = s_df
        
    '''
    epoch 데이터셋 초기화 (다시 레이어ui로 돌아가서 모델을 돌릴 경우 )
    p_param: 데이터 정보 (USER_NO, fileName) 
    p_uuid: 모델 uuid
    p_epochs: epoch
    '''
    def clearEpochDataSet(self, p_param, p_uuid, p_epochs):
        s_userno = str(p_param['USER_NO'])
        self.edataset[s_userno, p_uuid, p_epochs] = {'data':[]}

    '''
    backup 데이터셋 getter
    데이터탐색에서 타입변경, 전처리시 최초데이터백업하고, 데이터초기화버튼 클릭시 백업데이터 불러옴
    p_param: 데이터 정보 (USER_NO, fileName) 
    '''
    def getBackupDataSet(self, p_param):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        if not set([(s_userno, s_filename)]).issubset( set(self.bdataset.keys())):
            return pd.DataFrame()
        else:
            return self.bdataset[s_userno, s_filename]
        
    '''
    backup 데이터셋 setter
    p_param: 데이터 정보 (USER_NO, fileName)
    p_df: 설정 데이터셋
    '''
    def setBackupDataSet(self, p_param, p_df):
        s_userno = str(p_param['USER_NO'])
        s_filename = p_param['fileName']
        self.bdataset[s_userno, s_filename] = p_df

    '''
    code 데이터셋 getter
    '''
    def getTempDataSet(self):
        return self.cdataset
    
    '''
    code 데이터셋 setter
    p_df: 설정 데이터셋
    '''
    def setTempDataSet(self, p_df):
        self.cdataset = p_df


    def checkExist(self, p_tablename):
        return p_tablename in self.dataset

    def setStreamOutputDatset(self, p_streamingViewTable, p_userno, p_jobId, p_groupId, p_userId=None, p_filename=None, p_filetype='csv', p_workflowId=None):
        # 입력데이터가 스트리밍 컴포넌트이면 스트리밍 뷰테이블을 키값으로 하고 출력시 필요한 파라미터 값들을 저장해둠.(addDataSet 함수의 파라미터)
        s_outputDataParam = {
            "userno": p_userno,
            "userId": p_userId,
            "outputJobId": p_jobId,
            "groupId": p_groupId,
            "filename": p_filename,
            "filetype": p_filetype,
            "workflowId": p_workflowId
        }
        if self.tdataset.get(p_streamingViewTable):
            # 기존에 실행 이력이 있으면 먼저 제거
            self.tdataset[p_streamingViewTable] = [item for item in self.tdataset[p_streamingViewTable] if item.get("outputJobId") != p_jobId]
            self.tdataset[p_streamingViewTable].append(s_outputDataParam)
        else :
            self.tdataset[p_streamingViewTable] = [s_outputDataParam]
    
    def getStreamOutputDataset(self, p_streamingViewTable):
        return self.tdataset.get(p_streamingViewTable, [])

    def uploadDataset(self, p_df, p_userno, p_userId, p_filepath, p_filename, p_tablename, p_filetype):
        
        if self.o_apiType == 'COMMON':
            # 저장
            self.o_storageManager.writeFile(f"{p_filepath}", p_df, p_option=p_filetype)
            if p_userId != None:
                self.o_storageManager.setOwner(f"{p_filepath}", p_userId)
                
            if p_filename != None:    
                self.dataset[str(p_userno) + "_" + str(p_filename)] = p_df

    def saveTempDataset(self, p_key, p_userno):
        s_path = f'{self.o_rootPath}{p_userno}/temp/'
        if self.o_fileFormat == 'delta':
            s_fileFormat = 'parquet'
        else : 
            s_fileFormat = self.o_fileFormat
        s_filename = f'{p_key}.{s_fileFormat}'
        self.o_storageManager.createDirs(s_path)

        s_df = self.dataset[p_key]
        self.o_storageManager.writeFile(s_path + s_filename, s_df, s_fileFormat)

    # common에서 메모리 자원 관리 위해 dataset 제거 함수
    def deleteDataSet(self, p_key):
        self.dataset.pop(p_key, None)

        # 강제로 가비지 컬렉션 실행 (필수는 아님, 메모리 민감한 경우에만)
        gc.collect()