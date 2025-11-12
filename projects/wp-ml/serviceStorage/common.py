import json
# #import logging
# #import logging.config
import os
import pandas as pd
import joblib
import h5py
# https 자체인증서 인증 경고 메시지 처리
import urllib3
# from database.manager import WpDataBaseManagement

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import re
from dask import dataframe as dd
from config.wp import getConfig, getWiseDefaultStorage
from .wpType import WpStorage
from .localService import localStorage
import json

class WiseStorageManager(WpStorage):
    def __init__(self, p_userno, p_apiType, p_type, p_path='', p_extra=None, p_storageInfo = None):
        self.o_wpStorage = None
        self.o_userno = p_userno
        # self.dbinfo = getConfig('','META_DB')
        # self.dsId = getConfig('','DS_ID')
        # DS_VIEW_IDX 가져오기 (DS_VIEW_TBL_MSTR 조회)
        if p_storageInfo:
            self.o_storageInfo = p_storageInfo
        else:
            # s_dbMng = WpDataBaseManagement('meta')
            # s_dsMstr = s_dbMng.select('DS_MSTR', f" WHERE DS_ID={self.dsId}")
            self.o_storageInfo = getWiseDefaultStorage()
        
        if p_path == '' :
            self.o_rootPath = self.o_storageInfo['DEFAULT_PATH']
        else :
            self.o_rootPath = p_path

        self.o_storageType = p_type
        self.o_apiType = p_apiType
        
        if p_type == 'LOCAL':
            self.o_wpStorage = localStorage(p_userno, self.o_storageInfo)
        else :
            self.o_wpStorage = localStorage(p_userno, self.o_storageInfo)


    def getRootPath(self):
        return self.o_rootPath 
    def getDir(self, p_path, p_status=False):
        '''
        LOCAL 파일 리스트
        p_path: 파일 경로
        p_status: Also return each file's corresponding FileStatus
        '''
        return self.o_wpStorage.getDir(self.o_rootPath + p_path,p_status)
    def createBuffer(self, p_path, p_option='rb', p_encType ='utf-8'):
        '''
        Buffer 읽기 
        p_path: 파일 경로
        p_option :  'r' : open for reading (default)
                    'w' : open for writing, truncating the file first
                    'x' : open for exclusive creation, failing if the file already exists
                    'a' : open for writing, appending to the end of file if it exists
                    'b' : binary mode
                    't' : text mode (default) 
                    '+' : open for updating (reading and writing)
        p_encType: 인코딩 타입
        '''
        s_cloudTF = getConfig('','CLOUD')
        if any(idx in p_option for idx in ['w', 'a', 'x']) and s_cloudTF:
            self.checkUserDirSize()
        return self.o_wpStorage.createBuffer(self.o_rootPath + p_path,p_option,p_encType)

    def getPath(self):
        return self.o_rootPath
    
    def moveFile(self, p_target, p_newPath):
        '''
        파일 이동
        p_target: 원래 경로
        p_newPath: 이동할 경로
        '''
        s_deleteFlag = self.checkExist(p_newPath)
        if s_deleteFlag:
            self.o_wpStorage.removeFile(self.o_rootPath + p_newPath)

        return self.o_wpStorage.moveFile(self.o_rootPath + p_target, self.o_rootPath + p_newPath)

    def copyFile(self, p_target, p_newPath, p_fullPath=True):
        '''
        파일 이동
        p_target: 원래 경로
        p_newPath: 복사할 경로
        '''
        s_deleteFlag = self.checkExist(p_newPath)
        if s_deleteFlag:
            self.o_wpStorage.removeFile(self.o_rootPath + p_newPath)

        # p_target에 rootPath 붙여야할 경우에만 붙임 
        if p_fullPath:
            p_target = self.o_rootPath + p_target
        
        return self.o_wpStorage.copyFile(p_target, self.o_rootPath + p_newPath)

    #175 HDFS 파일 읽기 (워크플로우에서 파일 쓸 때 utf-8 포맷으로 해서  default encType = utf-8 )
    # 데이터셋 인덱스 번호 읽기 기능 추가로 p_index 파라미터 추가
    def readFile(self, p_path, p_option='read', p_mode='r', p_readsize=0, p_encType ='utf-8', p_sep=',',p_fullPath=False, p_index=None):
        '''
        LOCAL 파일 읽기 
        p_path: 파일 경로
        p_option: read option(read, readline, csv, parquet)
        p_mode: open mode(r, rb...) - 현재 local만 사용
        p_readsize: p_option이 'read'일 때 read_size. 0 일 경우 전체 파일 읽음
        p_encType: 인코딩 타입 (현재 local만 세분화 되어있음.)
        p_sep: 구분자
        p_fullPath: (p_path의) o_rootPath 포함여부
        '''
        try:
            if isinstance(p_path, list):
               s_path = [self.o_rootPath + path for path in p_path]
            else: 
                s_path = self.o_rootPath + p_path
            if p_fullPath:
                s_path = p_path
            
            s_df = self.o_wpStorage.readFile(s_path, p_option, p_mode, p_readsize, p_encType, p_sep, p_index)
            return s_df

        except Exception as ex:
            print(ex)
            raise
    
    def readImgFile(self, p_path, p_fileList):
        '''
        LOCAL 이미지 파일 읽기 
        p_path: 파일 경로
        p_comId : 이미지 임시 저장 폴더 고유값
        p_fileList : 이미지 파일 리스트
        p_execute : 파일 복사 여부
        '''
        try:
            s_path = self.o_rootPath + p_path
            s_df = self.o_wpStorage.readImgFile(s_path, p_fileList)
            
            return s_df

        except Exception as ex:
            print(ex)
            raise
        
    def downloadFile(self, p_path):
        try:
            s_path = self.o_rootPath + p_path     
            s_df = self.o_wpStorage.downloadFile(s_path)
            return s_df

        except Exception as ex:
            print(ex)
            raise
    
    def downloadZipFile(self, p_path, p_fullPath=True):
        try:
            if p_fullPath == True:
                s_path = p_path
            else:
                s_path = self.o_rootPath + p_path    
            s_modelZip = self.o_wpStorage.downloadZipFile(s_path)
            return s_modelZip

        except Exception as ex:
            print(ex)
            raise

    def removeFile(self, p_target, p_recursive=False):
        '''
        파일 삭제
        p_target: 파일 경로
        p_recursive: 내부 파일까지 삭제하는지
        '''
        try:
            return self.o_wpStorage.removeFile(self.o_rootPath + p_target,p_recursive)
        except Exception as ex:
            print(ex)
            # o_logger.info('######## readFile Error ########')
            # _LoggerConfiguration.info(ex)
            raise
        

    def createView(self, p_viewName, p_df, p_option='csv', p_index=False, p_encType ='utf-8', p_writeMode='w'):
        '''
        View 생성 
        p_viewName: 뷰 네임
        p_df: 데이터프레임
        p_option: write option(csv, parquet, h5, pkl)
        p_index: index 저장 option
        p_encType: 인코딩 타입
        p_writeMode: write mode (w, a, ...)
        '''
        try:
            return self.o_wpStorage.createView(p_viewName, p_df, p_option)
        
        except Exception as ex:
            print(ex)
            # o_logger.info('######## createView Error ########')
            # o_logger.info(ex)
            raise
    #175 HDFS 파일 쓰기
    def writeFile(self, p_path, p_df, p_option='parquet', p_index=False, p_encType ='utf-8', p_writeMode='w', p_schemaInfo=None):
        '''
        파일 쓰기 
        p_path: 파일 경로
        p_df: 데이터프레임
        p_option: write option(csv, parquet, h5, pkl)
        p_index: index 저장 option
        p_encType: 인코딩 타입
        p_writeMode: write mode (w, a, ...)
        '''

        try :
            s_cloudTF = getConfig('','CLOUD')
            if s_cloudTF:
                self.checkUserDirSize()
            return self.o_wpStorage.writeFile(self.o_rootPath + p_path, p_df, p_option, p_index, p_encType, p_writeMode,p_schemaInfo)        

        except Exception as ex:

            print("ex ??????????????????????????: ", ex)
            # o_logger.info('######## writeFile Error ########')
            # o_logger.info(ex)
            raise

    def uploadFile(self, p_path, p_df):
        try :
            s_cloudTF = getConfig('','CLOUD')
            if s_cloudTF:
                self.checkUserDirSize()
            return self.o_wpStorage.uploadFile(self.o_rootPath + p_path, p_df)        

        except Exception as ex:

            print("uploadFile error: ", ex)
            # o_logger.info('######## writeFile Error ########')
            # o_logger.info(ex)
            raise
    
    # 파일 존재 체크 여부 
    def checkExist(self, p_path):
        s_existFlag = self.o_wpStorage.checkExist(self.o_rootPath + p_path)    
        return s_existFlag

    #175 LOCAL 경로 생성
    def createDirs(self, p_path,p_fullPath=False):
        '''
        LOCAL 경로 생성
        p_path: 파일 경로
        p_fullPath: (p_path의) o_rootPath 포함여부
        '''
        s_path = self.o_rootPath + p_path
        return self.o_wpStorage.createDirs(s_path)

    # LOCAL 경로 삭제
    def deleteDirs(self, p_path):
        '''
        LOCAL 경로 생성
        p_path: 파일 경로
        '''
        self.o_wpStorage.deleteDirs(self.o_rootPath + p_path)        
    
    def moveDirs(self, p_oldPath, p_newPath, p_moveAll=False):
        '''
        LOCAL 경로 생성
        p_path: 파일 경로
        '''
        self.o_wpStorage.moveDirs(self.o_rootPath + p_oldPath, self.o_rootPath + p_newPath, p_moveAll)   
    
    def listFile(self, p_path, p_status=False):
        '''
        LOCAL 파일 리스트
        p_path: 파일 경로
        p_status: Also return each file's corresponding FileStatus
        '''
        return self.o_wpStorage.listFile(self.o_rootPath + p_path,p_status)
        
    # 모델 저장
    def saveModel(self, p_path, p_df, p_option='pkl', p_tmpModel=False):
        '''
        p_path: 파일 경로
        p_df: 모델파일
        p_option 모델 확장자
        p_tmpModel: hdfs && h5일 경우 local에 임시 모델 저장하기 위해 추가
        '''
        try:
            s_cloudTF = getConfig('','CLOUD')
            if s_cloudTF:
                self.checkUserDirSize()
                
            s_path = self.o_rootPath + p_path
            if p_tmpModel:
                s_path = p_path
        
            s_output = self.o_wpStorage.saveModel(s_path, p_df, p_option)
            return s_output

        except Exception as ex:
            print(ex)
            # o_logger.info('######## saveModel Error ########')
            # o_logger.info(ex)
            raise
            
    # 모델 로드 
    def loadModel(self, p_path, p_frameWorkType='Scikit-learn'):
        '''
        p_path: 파일 경로
        p_option 모델 확장자
        '''
        try:
            s_path = self.o_rootPath + p_path
            # if p_option=='h5' and self.o_storageType == 'HDFS':
            #     s_wiseStorage = WiseStorageManager(self.o_userno,'LOCAL')
            #     s_folderPath = os.path.split('py_result/' + p_path)
            #     s_wiseStorage.createDirs(s_folderPath[0],True)
            #     s_path = p_path
            s_output = self.o_wpStorage.loadModel(s_path, p_frameWorkType)
            return s_output

        except Exception as ex:
            print(ex)
            # o_logger.info('######## loadModel Error ########')
            # o_logger.info(ex)
            raise
        
    def getDirSize(self, p_path):
        '''
        p_path: 파일 경로
        '''
        return self.o_wpStorage.getDirSize(self.o_rootPath + p_path)    
    
    # dir check && hdd 비교 코드 추가
    # 각 service에 dirsize 코드(local 외에는 true, 0)
    def checkUserDirSize(self):
        '''
        user dir size check(aws-market)
        '''
        from serviceDatabase import databaseService
        s_userDirSize = self.o_wpStorage.getDirSize(f'{self.o_rootPath}/{str(self.o_userno)}')        
        if getConfig('','CLOUD'):
            s_userDirSize = self.sizeToBytes(s_userDirSize,"","linux")
        s_userInstance = databaseService.selectRDBMS(
            'mysql', self.dbinfo['host'], self.dbinfo['port'], self.dbinfo['id'], self.dbinfo['passwd'], self.dbinfo['db'], 'DP_USER_PROFILE',f'WHERE USER_NO={str(self.o_userno)}') 
        if s_userDirSize < self.sizeToBytes(json.loads((s_userInstance.USER_INSTANCE)[0])['hdd']) :
            return True
        else:
            print('HDD 용량 초과')
            # Exception('######## HDD 용량 초과 ########')   
            raise      
        
    def bytesToSize(self, p_bytes:int, p_sep=""):
        import math
        if p_bytes == 0:
            return f'0{p_sep}Bytes'
        s_sizeName = ("Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
        i = int(math.floor(math.log(p_bytes, 1024)))
        p = math.pow(1024, i)
        s = round(p_bytes / p, 2)
        
        return f'{s}{p_sep}{s_sizeName[i]}'
    
    def sizeToBytes(self, p_size:str, p_sep="", p_type=""):
        import math
        if p_type=="":
            s_sizeName = ("Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB")
        else:
            s_sizeName = ("B", "K", "M", "G", "T", "P", "E", "Z", "Y")
        s_size = p_size
        s_idx = 0
        for idx, val in enumerate(s_sizeName):
            if val in p_size:
                s_size = s_size.split(p_sep+val)[0]
                s_idx = idx
        
        return float(s_size)*(1024** s_idx)

    # Owner
    def setOwner(self, p_path, p_user):
        s_result = self.o_wpStorage.setOwner(f"{self.o_rootPath}{p_path}", p_user)    
        
    def downloadToLocal(self, p_hdfsPath, p_localPath):
        self.o_wpStorage.downloadToLocal(p_hdfsPath, p_localPath)

    def getFileSize(self, p_path):
        try:
            s_path = self.o_rootPath + p_path     
            s_size = self.o_wpStorage.getFileSize(s_path)
            return s_size

        except Exception as ex:
            print(ex)
            raise
    def getModelArtifactSize(self, p_path):
        try:
            s_path = p_path
            s_size = self.o_wpStorage.getFileSize(s_path)
            return s_size

        except Exception as ex:
            print(ex)
            raise
    
    def checkArtifactExist(self, p_path):
        try:
            s_exist = self.o_wpStorage.checkExist(p_path)
            return s_exist
        except Exception as ex:
            print(ex)
            raise
        
    def workflowRename(self, p_path):
        try:
            s_exist = self.o_wpStorage.workflowRename(p_path)
            return s_exist
        except Exception as ex:
            print(ex)
            raise
    
    def checkDelta(self, p_path, p_extension):
        try:
            s_chkDelta = self.o_wpStorage.isDelta(self.o_rootPath + p_path, p_extension)
            return s_chkDelta
        except Exception as ex:
            print(ex)
            raise