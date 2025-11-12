from flask import Blueprint, jsonify, Response
from .base import WiseBaseBlueprint
from urllib.parse import unquote, quote, urlparse
import time
from flask import Response
import os
from pathlib import Path

class WiseStorageRouter(WiseBaseBlueprint):
    def __init__(self, p_api_key,p_dataSource):
        super().__init__('storageRouter', __name__, p_api_key,url_prefix='/storage')

        @self.route('/saveModel', methods=['POST'], endpoint='saveModel')
        def saveModel():
            print('=================saveModel================')
            s_path = self.o_params['path']
            s_type = self.o_params['type']
            s_filename = self.o_file.filename

            s_uploadResult = p_dataSource.o_storageManager.saveModel(s_path,self.o_file,s_type)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_uploadResult
            return s_result
        
        @self.route('/copyFile', methods=['POST'], endpoint='copyFile')
        def copyFile():
            print('=================copyFile================')
            s_target = self.o_params['target']
            s_new_path = self.o_params['new_path']
            s_moveResult = p_dataSource.o_storageManager.copyFile(s_target,s_new_path)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_moveResult
            return s_result
        
        @self.route('/moveFile', methods=['POST'], endpoint='moveFile')
        def moveFile():
            print('=================moveFile================')
            s_target = self.o_params['target']
            s_new_path = self.o_params['new_path']
            s_moveResult = p_dataSource.o_storageManager.moveFile(s_target,s_new_path)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_moveResult
            return s_result
        
        @self.route('/chown', methods=['POST'], endpoint='chown')
        def chown():
            print('=================chown================')
            s_path = self.o_params['path']
            s_userId = self.o_params['userId']
            s_chown = p_dataSource.o_storageManager.setOwner(f"{s_path}",s_userId)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_chown
            return s_result
        
        @self.route('/isExists', methods=['POST'], endpoint='isExists')
        def isExists():
            print('=================isExists================')
            s_path = self.o_params['path']
            s_exists = p_dataSource.o_storageManager.checkExist(f"{s_path}")
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_exists
            return s_result
        @self.route('/getFileList', methods=['POST'], endpoint='getFileList')
        def getFileList():
            print('=================getFileList================')
            s_path = unquote(self.o_params['path'])
            
            s_listFiles = p_dataSource.o_storageManager.getDir(f"{s_path}",True)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['listFiles'] = s_listFiles
            return s_result
        
        @self.route('/makeDir', methods=['POST'], endpoint='makeDir')
        def makeDir():
            print('=================makeDir================')
            s_path = self.o_params['path']
            s_listFiles = p_dataSource.o_storageManager.createDirs(f"{s_path}",True)
            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_listFiles
            return s_result
        @self.route('/delete', methods=['POST'], endpoint='delete')
        def delete():
            print('=================delete================')
            s_path = self.o_params['path']
            s_isDirectory = self.o_params['isDirectory']

            if type(s_path) == str:
                s_path = [s_path]
                s_isDirectory = [s_isDirectory]

            for s_idx, s_fileName in enumerate(s_path['path']):
                s_fileNamePath = s_path['prefix'] + s_fileName
                
                if s_isDirectory[s_idx] :
                    s_listFiles = p_dataSource.o_storageManager.deleteDirs(f"{s_fileNamePath}")
                else :
                    s_listFiles = p_dataSource.o_storageManager.removeFile(f"{s_fileNamePath}")

            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['result'] = s_path
            return s_result
        
        @self.route('/upload', methods=['POST'], endpoint='upload')
        def upload():
            print('=================upload================')
            s_path = unquote(self.o_req.headers.get('filepath'))
            s_filename = unquote(self.o_req.headers.get('filename'))

            s_uploadResult = p_dataSource.o_storageManager.uploadFile(f"{s_path}/{s_filename}",self.o_req.stream)

            s_result = {}
            s_result['responsecode'] = 200
            s_result['duration'] = round(time.time() - self.o_start, 2)
            s_result['file'] = s_filename
            s_result['path'] = s_path
            return s_result
        @self.route('/download', methods=['POST'], endpoint='download')
        def download():
            print('=================download================')
            s_path = unquote(self.o_params['path'])
            #s_filename = self.o_file.filename
             # 파일 크기 가져오기
            s_fileSize = p_dataSource.o_storageManager.getFileSize(s_path)  # 파일 크기를 계산하는 메서드    
            s_file = p_dataSource.o_storageManager.downloadFile(s_path)

            # Flask Response 객체로 스트리밍 반환
            response = Response(s_file, mimetype='application/octet-stream')
            # 다운로드 파일이름
            s_filename = s_path.split("/")[-1]
            
            # deltalake 파일 다운로드 추가
            if s_filename.endswith('.parquet') or s_filename.endswith('.delta'):
                if self.o_params['filename'] != '':
                    s_filename = self.o_params['filename']
                response.headers['Transfer-Encoding'] = 'chunked'
                response.headers.pop('Content-Length', None)
                s_filename = os.path.splitext(s_filename)[0] + '.csv'
                
            else:
                response.headers['Content-Length'] = str(s_fileSize)  # 파일 크기 추가

            encoded_filename = quote(s_filename)  # UTF-8로 인코딩
            response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{encoded_filename}"
            print(f"${encoded_filename} donwload response")
            return response
        
        @self.route('/downloadZipFile', methods=['POST'], endpoint='downloadZipFile')
        def downloadZipFile():
            print('=================downloadZipFile================')
            s_path = unquote(self.o_params['path'])
             # 파일 크기 가져오기
            # s_fileSize = p_dataSource.o_storageManager.getModelArtifactSize(s_path)  # 파일 크기를 계산
            s_fullPath = False
            if self.o_params['option'] == 'model':
                s_fullPath = True
            s_zipStream = p_dataSource.o_storageManager.downloadZipFile(s_path, s_fullPath)

            # Flask Response 객체로 스트리밍 반환
            # response = Response(s_zipStream, mimetype='application/octet-stream')
            response = Response(s_zipStream, mimetype='application/zip')
            # response = p_dataSource.o_storageManager.downloadZipFile(s_path, s_fullPath)
            # 다운로드 파일이름
            s_fileName = f"{self.o_params['filename']}_{self.o_params['option']}.zip"
            s_encodedFileName = quote(s_fileName)
            # response.headers['Content-Length'] = str(s_zipStreamSize)  # 파일 크기 

            response.headers['Content-Disposition'] = f"attachment; filename*=UTF-8''{s_encodedFileName}"
            print(f"{s_fileName} donwload response")
            return response
        
        @self.route('/artifactExist', methods=['POST'], endpoint='artifactExist')
        def artifactExist():
            print('=================ArtifactExist================')
            s_path = unquote(self.o_params['path'])
            # file:/// 이 있는지 확인
            s_urlpath = urlparse(s_path)
            
            # file:/// 이 있을 경우
            if s_urlpath.scheme == 'file' or s_urlpath.scheme == 'hdfs': 
                s_path = s_urlpath.path
                # 맨 앞에 / 이 붙어서 문제 생기므로 제거 해줌
                if s_urlpath.scheme == 'file':
                    s_path = s_path[1:]
            # 없을 경우
            else :
                s_path=unquote(s_path)

            try:
                s_exist = p_dataSource.o_storageManager.checkArtifactExist(s_path)
                if not s_exist:
                    raise Exception
                else : 
                    s_result = {}
                    s_result['responsecode'] = 200
                    s_result['duration'] = round(time.time() - self.o_start, 2)
                    return s_result
            except Exception as e:
                raise e
            
        @self.route('/workflowRename', methods=['POST'], endpoint='workflowRename')
        def workflowRename():
            print('=================workflowFileRename================')
            try:
                p_dataSource.o_storageManager.workflowRename(self.o_params)
                s_result = {}
                s_result['responsecode'] = 200
                s_result['duration'] = round(time.time() - self.o_start, 2)
                return s_result
            except Exception as e:
                raise e