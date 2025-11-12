import json
#import logging
#import logging.config
import os
import pandas as pd
import joblib
import pickle
import h5py
# https 자체인증서 인증 경고 메시지 처리
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import re
import shutil
from dask import dataframe as dd
from config.wp import getConfig
from .wpType import WpStorage
import pyarrow.parquet as pq
import pyarrow as pa
from io import BytesIO
import zipfile
from urllib.parse import urlparse, unquote
import yaml  
import base64
from stream_zip import stream_zip, ZIP_64, NO_COMPRESSION_64
from datetime import datetime
from stat import S_IFREG
# from deltalake import write_deltalake, DeltaTable
import chardet
from io import StringIO
# from transformers import GPT2LMHeadModel


#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

#o_logger = logging.getLogger('LOCAL')

class localStorage(WpStorage):
    def __init__(self, p_userno, p_info):
        # HDFS Client
        # HDFS IP, PORT 변경 반영
        self.o_userno = p_userno
        self.o_rootPath = p_info['DEFAULT_PATH']
        self.dbinfo = getConfig('','META_DB')

    def getPath(self):
        return self.o_rootPath
    
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
        return open(p_path,p_option)
    
    def readcsv(self, p_path,p_sep, p_engine, p_encoding,p_bad_lines=False,p_memory_save=False):
        chunksize=10**5
        print(chunksize)
        result_df = pd.DataFrame()

        if p_memory_save :
            for cnt,chunk in enumerate(pd.read_csv(p_path, sep=p_sep, engine=p_engine, encoding=p_encoding ,on_bad_lines=p_bad_lines,chunksize=chunksize)):
                result_df = pd.concat([result_df, chunk], ignore_index=True)
        else :
            # result_df = pd.read_csv(p_path, sep=p_sep, engine=p_engine, encoding=p_encoding, error_bad_lines=p_bad_lines) # python==3.7.6
            result_df = pd.read_csv(p_path, sep=p_sep, engine=p_engine, encoding=p_encoding, on_bad_lines='skip') # python==3.10.9
  
        return result_df

    def readFile(self, p_path, p_option='read', p_mode='r', p_readsize=0, p_encType ='utf-8', p_sep=',', p_index=None):
        '''
        LOCAL 파일 읽기 
        p_path: 파일 경로
        p_option: read option(read, readline, csv, parquet)
        p_mode: open mode(r, rb...) - 현재 local만 사용
        p_readsize: p_option이 read일 때 read_size. 0 일 경우 전체 파일 읽음
        p_encType: 인코딩 타입
        '''
        try:
            if p_option == 'read':
                with open(p_path, p_mode) as rawdata:
                    if p_readsize > 0 :
                        s_df = rawdata.read(p_readsize)
                    else :
                        s_df = rawdata.read()
                    rawdata.close()

            if p_option == 'readline':
                with open(p_path, p_mode) as rawdata:
                    s_df = rawdata.readline()
                    rawdata.close()

            if p_option == 'csv':
                if p_encType == 'EUC_KR' or p_encType == 'euc_kr' or p_encType =='euc-kr' or p_encType =='EUC-KR':
                    try:
                        s_df = self.readcsv(p_path, p_sep, 'python', p_encType)
                    except:
                        s_df = self.readcsv(p_path, p_sep, 'python', 'CP949')
                elif p_encType == 'UTF-16' or p_encType == 'utf-16':
                    s_df = self.readcsv(p_path, p_sep,  'c', p_encType)
                else:
                    s_df = self.readcsv(p_path, p_sep, 'python', p_encType, 'skip') # python==3.7.6
                    # s_df = pd.read_csv(p_path, sep=p_sep, engine='python', encoding=p_encType, on_bad_lines='skip') # python==3.10.9
                    
            if p_option == 'xlsx':
                s_df = pd.read_excel(p_path, engine='openpyxl')

            if p_option == 'parquet':
                # s_df = pd.read_parquet(p_path,engine='pyarrow')
                s_df = dd.read_parquet(p_path, engine='pyarrow', split_row_groups=100000)
                s_df = s_df.compute()
                s_df = s_df.reset_index(drop=True)

            if p_option == 'pkl':                
                with open(p_path, 'rb') as f:
                    s_df = pickle.load(f)

            if p_option == 'h5':
                s_filename = os.path.basename(p_path)
                with h5py.File(p_path, "r") as h5file:
                    # print("Keys: %s" % f.keys())
                    # s_df = f[a_group_key]      # returns as a h5py dataset object
                    # ds_arr = f[a_group_key][()]  # returns as a numpy array
                    s_df = h5file.get(s_filename)
                    h5file.close()
            if p_option == 'txt':
                r = open(p_path, encoding=p_encType)
                s_df = r.read()
                r.close()
            if p_option == 'manifest':                
                with open(p_path, 'r') as f:
                    s_df = json.load(f)
            if p_option == 'json':                
                with open(p_path, 'r') as f:
                    s_df = json.load(f)
            if p_option =='yaml':
                with open(p_path, 'r', encoding='utf-8') as f:
                    s_df = yaml.safe_load(f)
            # 이미지는 파일경로가 list로 들어옴. 디렉토리가 포함될수도있음.
            # 디렉토리일 경우에는 해당 디렉토리의 파일이미지 전부
            if p_option =='image':
                s_image_extensions = (".jpg", ".jpeg", ".png")
                s_data = []
                for path in p_path:
                    if os.path.isdir(path):
                         files = [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f)) and f.lower().endswith(s_image_extensions)]
                         for f in files:
                            s_data.append({
                                'filepath': f"{os.path.relpath(path, self.o_rootPath)}/{f}",
                                'filename': f
                            })
                    else:
                        s_data.append({
                            'filepath': os.path.relpath(path, self.o_rootPath),
                            'filename': os.path.basename(path)
                        })
                s_df = pd.DataFrame(s_data)
                del s_data
                s_df.insert(0, 'id', range(len(s_df)))
            if p_option =='base64':
               with open(p_path, 'rb') as f:
                   s_df = f.read()
                   s_df = base64.b64encode(s_df).decode('utf-8')
            # deltalake로 저장된 파일 읽기
            if p_option =='delta':
                from deltalake import DeltaTable
                if p_index is not None :
                    p_index = int(p_index)
                    
                if os.path.isdir(p_path) and '_delta_log' in os.listdir(p_path):
                    delta_table = DeltaTable(p_path, version = p_index)
                    s_df = delta_table.to_pandas()

            return s_df
        

        except Exception as ex:
            print(ex)
            # o_logger.info('######## readFile Error ########')
            # o_logger.info(ex)
            raise
        
    def uploadFile(self, p_path, p_df):
        try:
            s_wpFileFormat = getConfig('', 'FILE_FORMAT')

            s_chunk_size = 10 * 1024 * 1024  # 10MB 단위로
            # 1️⃣ 저장할 디렉토리 경로 추출
            dir_path = os.path.dirname(p_path)

            # 2️⃣ 디렉토리가 없으면 생성
            if not os.path.exists(dir_path):
                os.makedirs(dir_path, exist_ok=True)
            # deltalake 일때 스토리지 파일 업로드
            if s_wpFileFormat == 'delta':
                from deltalake import write_deltalake, DeltaTable
                s_extension = os.path.splitext(p_path)[-1].lower()

                if s_extension in ['.txt', '.csv', '.parquet', '.json', '.xlsx', '.pkl', '.yaml']:
                    s_isExist = False
                    s_startStream = False
                    s_mode = 'overwrite'
                    s_schema_mode = 'merge'
                    s_data = p_df.read()
                    # while s_data := p_df.read(s_chunk_size):
                        
                    s_encodingType = chardet.detect(s_data)['encoding']
                    
                    # 해당 경로에 이미 deltalake가 있다면
                    if os.path.exists(p_path):
                        s_isExist = True
                        try:
                            # Deltalake의 컬럼들을 불러옴
                            s_existing_columns = DeltaTable(p_path).schema().to_arrow().names
                        except :
                            # 안불러와지면 존재 안하는걸로 취급
                            s_isExist = False

                    if s_extension == '.txt' or s_extension == '.csv': 
                        s_data_decode = s_data.decode(s_encodingType)
                        s_data_buffer = StringIO(s_data_decode)
                        s_df = pd.read_csv(s_data_buffer)
                
                    elif s_extension == '.parquet': # parquet 확인
                        s_data_buffer = BytesIO(s_data)
                        s_df = pq.read_table(s_data_buffer).to_pandas()

                    elif s_extension == '.json':
                        s_data_buffer = json.loads(s_data.decode(s_encodingType))
                        if isinstance(s_data_buffer, dict):
                            s_df = pd.DataFrame([s_data_buffer])
                        elif isinstance(s_data_buffer, list):
                            s_df = pd.DataFrame(s_data_buffer)
                    
                    elif s_extension == '.xlsx':
                        s_df = pd.read_excel(BytesIO(s_data), engine='openpyxl')
                    
                    elif s_extension == '.pkl':
                        s_data_buffer = pickle.load(BytesIO(s_data))
                        s_df = pd.DataFrame(s_data_buffer)
                    
                    elif s_extension == '.yaml':
                        s_data_buffer = yaml.safe_load(StringIO(s_data.decode(s_encodingType)))
                        if isinstance(s_data_buffer, dict):
                            s_data_buffer = [s_data_buffer]
                        s_df = pd.DataFrame(s_data_buffer)
                    
                    safe_schema  = self.checkDataFrameSchema(s_df)
                    s_deltaLakeTbl = pa.Table.from_pandas(s_df, schema=safe_schema)

                    if s_isExist:
                        s_deltaLakeTblColumn = s_deltaLakeTbl.schema.names
                        s_schema_mode = self.checkDeltaLakeColumns(s_existing_columns, s_deltaLakeTblColumn)
                        
                    # if s_startStream == False:
                    #     s_mode = 'overwrite'
                    # else :
                    #     s_mode = 'append'

                    write_deltalake(p_path, data=s_deltaLakeTbl, mode=s_mode, schema_mode=s_schema_mode)
                    # s_startStream = True

            else :
                with open(p_path, 'wb') as s_writer:
                    while chunk := p_df.read(s_chunk_size):
                        s_writer.write(chunk)
            return True
        except Exception as ex:
            print("uploadFile error", ex)
            # o_logger.info('######## writeFile Error ########')
            # o_logger.info(ex)
            raise

    #175 HDFS 파일 쓰기
    def writeFile(self, p_path, p_df, p_option='parquet', p_index=False, p_encType ='utf-8', p_writeMode='w', p_schemaInfo=None):
        '''
        HDFS 파일 쓰기 
        p_path: 파일 경로
        p_df: 데이터프레임
        p_option: write option(csv, parquet, h5, pkl, txt)
        p_index: index 저장 option
        p_encType: 인코딩 타입
        p_writeMode: write mode (w, a, ...)
        '''
        s_header = True
        s_overwrite = True
        s_append = False
        # 모드가 append이고 csv저장일 경우. 최초파일이 있는지 없는지 체크해서 설정
        if p_writeMode == 'a' and p_option == 'csv':
            s_exist = self.checkExist(p_path)
            if s_exist in [None, True]:
                s_header = False
                s_overwrite = False
                s_append = True

        try:
            if p_option == 'csv':
                p_df.to_csv(p_path, index=p_index, header=s_header, encoding=p_encType, mode = p_writeMode)

            if p_option == 'parquet':
                # WP-126 to_parquet 적용시 문자/숫자 섞여있는 object 컬럼 str 타입으로 명시해야 함.
                for col in p_df.columns:
                    if str(p_df[col].dtype) == 'object':
                        p_df[col] = p_df[col].astype(str)
                if p_writeMode == 'a':
                    s_df_table = pa.Table.from_pandas(p_df)
                    if os.path.exists(p_path):
                        # fastparquet일 때 사용하는 코드, 쓸려면 fastparquet을 pip install 해야함
                        # p_df.to_parquet(p_path,engine="fastparquet",index=p_index, append=True)
                        # 기존 파일에서 스키마 가져오기
                        s_exist = True
                        s_parqetFileTable = pq.read_table(p_path)
                        s_df_schema = s_parqetFileTable.schema
                    else:
                        s_exist = False
                        s_df_schema = s_df_table.schema
                        # fastparquet일 때 사용하는 코드, 쓸려면 fastparquet을 pip install 해야함
                        # p_df.to_parquet(p_path,engine="fastparquet",index=p_index)
                    with pq.ParquetWriter(p_path, s_df_schema) as writer:
                        if s_exist:
                            writer.write_table(s_parqetFileTable)
                        writer.write_table(s_df_table)
                        
                else :
                    p_df.to_parquet(p_path,engine='pyarrow',index=p_index)
                    
            if p_option == 'pkl':
                with open(p_path, 'wb') as f:
                    pickle.dump(p_df, f, pickle.HIGHEST_PROTOCOL)

                # 압축해서 저장하는 코드
                # import gzip
                # with gzip.open('testPickleFile.pickle', 'wb') as f:
                #     pickle.dump(data, f)
                # 압축 로드
                # # load and uncompress.
                # with gzip.open('testPickleFile.pickle','rb') as f:
                #     data = pickle.load(f)

            if p_option == 'h5':
                s_filename = os.path.basename(p_path)
                with h5py.File(p_path, "w") as h5file:
                    h5file.create_dataset(s_filename, data=p_df)
                    h5file.close()

            if p_option == 'pdf':
                p_df.write_pdf(p_path)  

            if p_option == 'txt':
                w = open(p_path, p_writeMode, encoding=p_encType)
                w.write(p_df)
                w.close()
                
            if p_option == 'manifest' or p_option == 'json':
                with open(p_path, 'w') as f:            
                    json.dump(p_df, f, indent=4) 
                    
            if p_option == 'yaml':
                with open(p_path, 'w', encoding=p_encType) as f:
                    yaml.dump(p_df, f, allow_unicode=True)
            # deltalake 일때 파일 다운로드 파일 쓰기
            if p_option == 'delta':
                from deltalake import write_deltalake, DeltaTable
                s_isExist = False
                if p_writeMode == 'new' or  p_writeMode == 'w':
                    p_writeMode = 'overwrite'
                s_schema_mode = 'merge'
                if os.path.exists(p_path):
                    s_isExist = True
                    try:
                        # Deltalake의 컬럼들을 불러옴
                        s_existing_columns = DeltaTable(p_path).schema().to_arrow().names
                    except :
                        # 안불러와지면 존재 안하는걸로 취급
                        s_isExist = False

                safe_schema  = self.checkDataFrameSchema(p_df)
                s_deltaLakeTbl = pa.Table.from_pandas(p_df, schema=safe_schema)

                if s_isExist:
                    s_deltaLakeTblColumn = s_deltaLakeTbl.schema.names
                    s_schema_mode = self.checkDeltaLakeColumns(s_existing_columns, s_deltaLakeTblColumn)
          
                if s_schema_mode != 'merge':
                    p_writeMode = 'overwrite'
                
                write_deltalake(p_path, data=s_deltaLakeTbl, mode=p_writeMode, schema_mode=s_schema_mode)

            return True
        
        except Exception as ex:
            print(ex)
            print("???????????????????????????????????????????")
            # o_logger.info('######## writeFile Error ########')
            # o_logger.info(ex)
            raise
            
    # 파일 존재 체크 여부 
    def checkExist(self, p_path):
        return os.path.exists(p_path)

    #175 LOCAL 경로 생성
    def createDirs(self, p_path):
        '''
        LOCAL 경로 생성
        p_path: 파일 경로
        '''
        print("createDirs p_path : ", p_path)
        try:
            # makedirs - 중간 경로 폴더 자동 생성
            # exist_ok=True일 경우 이미 경로 존재하는 경우 에러 발생하지 않고 넘어감(덮어쓰기 하지않음)
            os.makedirs(p_path, exist_ok=True)  
            return True
            # s_existFlag = self.checkExist(p_path)
            # if s_existFlag == False:
            #     os.makedirs(p_path)
            #     return True
            # else:
            #     return False
        except Exception as ex:
            print(ex)
            # o_logger.info('######## createDirs Error ########')
            # o_logger.info(ex)
            raise

    # LOCAL 경로 삭제
    def deleteDirs(self, p_path):
        try:
            shutil.rmtree(p_path, ignore_errors=True)
            return True
        except Exception as ex:
            print(ex)
            # o_logger.info('######## deleteDirs Error########')
            # o_logger.info(ex)
            raise
        
    
    def listFile(self, p_path, p_status=False):
        '''
        LOCAL 파일 리스트
        p_path: 파일 경로
        p_status: Also return each file's corresponding FileStatus
        '''
        if p_status:
            listResult = os.listdir(p_path)
        return listResult
    
    # 모델 저장 
    def saveModel(self, p_path, p_df, p_option='pkl'):
        '''
        p_path: 파일 경로
        p_option 모델 확장자
        '''
        try:     
            if p_option == 'pkl':
                joblib.dump(p_df, p_path)
            if p_option == 'h5':
                # WP-177 TORCH일 경우 
                if hasattr(p_df, 'state_dict') :
                    import torch
                    s_torchModel = torch.jit.script(p_df)
                    s_torchModel.save(p_path)
                else :
                    p_df.save(p_path)
            return True

        except Exception as ex:
            print(ex)
            # o_logger.info('######## saveModel Error ########')
            # o_logger.info(ex)
            raise
        
    # 모델 로드
    def loadModel(self, p_path, p_frameWorkType):
        from tensorflow import keras
        import torch
        try:
            if p_frameWorkType == 'Scikit-learn':
                try:
                    return joblib.load(p_path)
                except:
                    return pickle.load(p_path)

            # PyTorch (pt, pth)
            elif p_frameWorkType == 'PyTorch':
                return torch.load(p_path)

            # TensorFlow/Keras (h5)
            elif p_frameWorkType == 'TensorFlow/Keras':
                return keras.models.load_model(p_path)

            else:
                raise ValueError(f"Unsupported framework type: {p_frameWorkType}")
        except Exception as e:
            print(f"Error loading model from HDFS: {e}")
            return None 
  
    def copyFile(self, p_target, p_newPath):
        '''
        파일 이동
        p_target: 원래 경로
        p_newPath: 복사할 경로
        '''
        s_deleteFlag = self.checkExist(p_newPath)
        if s_deleteFlag:
            self.removeFile(p_newPath)

        shutil.copy(p_target, p_newPath)

    def removeFile(self, p_target, p_recursive=False):
        '''
        파일 삭제
        p_target: 파일 경로
        p_recursive: 내부 파일까지 삭제하는지
        '''
        
        try:
            if os.path.isfile(p_target):
                os.remove(p_target)
            # else:
            #     shutil.rmtree(p_target)
        except Exception as e:
            print(e)
    
    def getDir(self, p_path, p_status=False):
        '''
        LOCAL 파일 리스트
        p_path: 파일 경로
        p_status: Also return each file's corresponding FileStatus
        '''
        try:
            s_DirList = os.scandir(p_path)
        except:
            self.createDirs(p_path) 
            s_DirList = os.scandir(p_path)
        s_listResult = []
        for s_listItem in s_DirList:
            s_itemValue = {
                'type': '',
                'name':'',
                'pathSuffix':'',
                'length':'',
                'modificationTime':'',
                'owner': ''
            }
            s_itemValue['name'] = s_listItem.name
            s_itemValue['pathSuffix'] = s_listItem.name
            s_itemValue['modificationTime'] = s_listItem.stat().st_ctime * 1000
            if s_listItem.is_dir():
                s_itemValue['type'] = 'DIRECTORY'
            else :
                s_itemValue['type'] = 'FILE'
                s_itemValue['length'] = s_listItem.stat().st_size
            s_listResult.append(s_itemValue)
        return s_listResult
    
    def moveFile(self, p_target, p_newPath):
        '''
        파일 이동
        p_target: 원래 경로
        p_newPath: 이동할 경로
        '''
        s_deleteFlag = self.checkExist(p_newPath)
        if s_deleteFlag:
            self.removeFile(p_newPath)

        shutil.move(p_target, p_newPath)
        return {'success' : True}
    
    def getDirSize(self, p_path):
        '''
        p_path: 파일 경로
        '''
        try:
            if getConfig('','CLOUD'):
                # linux
                import subprocess
                size = subprocess.check_output(['du','-sh', p_path]).split()[0].decode('utf-8')
                return size
            else:
                # window
                def walk_method(path):
                    if os.path.isdir(path):
                        return sum(
                            sum(
                                os.path.getsize(os.path.join(walk_result[0], element))
                                for element in walk_result[2]
                            )
                            for walk_result in os.walk(path)
                        )
                size = walk_method(p_path)
                return size

        except Exception as ex:
            print(ex)
            # o_logger.info('######## getDirSize Error########')
            # o_logger.info(ex)
            raise


    def setOwner(self,p_filepath,p_userId):

        try:
            # self.client_hdfs.set_owner(p_filepath,  owner=p_userId, group='wise')
            return True

        except Exception as ex:
            print(ex)
            # o_logger.info('######## createDirs Error ########')
            # o_logger.info(ex)
            raise        

    def downloadFile(self, p_path, p_encType='utf-8'):
        '''
        LOCAL 파일 읽기 
        p_path: 파일 경로
        '''
        try:
            s_fileType = os.path.splitext(p_path)[-1].lower()
            # parquet
            if s_fileType in ['.parquet']:
                is_header_written = False
                def process_parquet(file_path):
                    nonlocal is_header_written
                    with open(file_path, 'rb') as reader:
                        data = BytesIO(reader.read()) 
                        parquet_file = pq.ParquetFile(data)  # ParquetFile 객체 생성
                        for batch in parquet_file.iter_batches():  # 데이터를 청크 단위로 처리
                            df = batch.to_pandas()
                            if not is_header_written:
                                yield ','.join(df.columns) + '\n'
                                is_header_written = True
                            i = 1
                            for row in df.itertuples(index=False):
                                yield ','.join(str(value) if value is not None else '' for value in row) + '\n'
       
                yield from process_parquet(p_path)
            # csv, json, txt, yaml
            elif  s_fileType in ['.csv', '.json', '.txt', '.yaml']:
                def process_text(file_path):
                    """
                    일반 텍스트 파일을 읽어서 스트리밍
                    """
                    with open(file_path, 'rb') as reader:
                        while chunk := reader.read(1024):
                            yield chunk
                                
                yield from process_text(p_path)
            # deltalake 일때 파일 다운로드
            elif s_fileType == '.delta':
                from deltalake import DeltaTable
                def generate():
                
                    s_deltaTable = DeltaTable(p_path)
                    s_arrowTable = s_deltaTable.to_pyarrow_table()
                    s_columns = s_arrowTable.schema.names
                    s_data = s_arrowTable.to_batches(max_chunksize=10000)

                    yield ','.join(s_columns) + '\n'

                    for batch in s_data:
                        df = batch.to_pandas()
                        if df.empty:
                            continue

                        buffer = StringIO()
                        df.to_csv(buffer, index=False, header=False)
                        yield buffer.getvalue()
                        buffer.close()
                yield from generate()

            else:
                def process_common(file_path):
                    """
                    엑셀 파일을 바이너리 데이터로 스트리밍
                    :param file_path: 파일 경로
                    """
                    with open(file_path, 'rb') as reader:
                        while chunk := reader.read(1024):
                            yield chunk
                yield from process_common(p_path)
            print('LOCAL 파일 읽기 종료')
        except Exception as e:
            raise e
        
    def downloadZipFile(self, p_path, p_encType='utf-8'):
        '''
        LOCAL 파일 읽기 
        p_path: 파일 경로
        '''
        chunk_size = 1 * 1024 * 1024  # 1MB
        # file:/// 이 있는지 확인
        s_urlpath = urlparse(p_path)
        
        # file:/// 이 있을 경우
        if s_urlpath.scheme == 'file': 
            s_path = s_urlpath.path
            # 맨 앞에 / 이 붙어서 문제 생기므로 제거 해줌
            if s_urlpath.scheme == 'file':
                s_path = s_path[1:]
        # 없을 경우
        else :
            s_path = unquote(p_path)

        def file_generator():
            for root, _, files in os.walk(s_path):
                for file in files:
                    full_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_path, s_path)
                    modified_time = datetime.fromtimestamp(os.path.getmtime(full_path))
                    permissions = S_IFREG | 0o644  # 일반 파일 권한

                    def file_data_generator(path=full_path):
                        with open(path, 'rb') as f:
                            while chunk := f.read(8192):
                                yield chunk

                    yield (relative_path, modified_time, permissions, ZIP_64, file_data_generator())

        return stream_zip(file_generator())

    def getFileSize(self, p_path):
        try:
            return os.path.getsize(p_path)
        
        except Exception as e:
            raise e
    def workflowRename(self, p_pathParam):
        try:
            p_newPath = p_pathParam['newPath']
            p_oldPath = p_pathParam['path']
            return os.rename(p_oldPath, p_newPath)
        
        except Exception as e:
            raise e
        
    def moveDirs(self, p_oldPath, p_newPath, p_moveAll):
        '''
        LOCAL 파일 이동
        p_path: 파일 경로
        '''
        try:
            shutil.move(p_oldPath, p_newPath)
        except Exception as e:
            raise e
    
    # deltaLake 컬럼 달라진게 있는지 확인    
    def checkDeltaLakeColumns(self, p_existing_columns, p_deltaLakeTblColumn):
        existing_set = set(p_existing_columns)
        new_set = set(p_deltaLakeTblColumn)
        added_columns = new_set - existing_set
        removed_columns = existing_set - new_set
    
        if added_columns or removed_columns:
            s_schema_mode = 'overwrite'
        else :
            s_schema_mode = 'merge'

        return s_schema_mode
    
    # deltaLake  업로드한 datafarme 컬럼 타입 설정
    def checkDataFrameSchema(self, df):
        s_schema = pa.Schema.from_pandas(df, preserve_index=False)
        s_fixed_column = []

        for s_column in s_schema:
            #pa.type이 null 값일 경우 타입 구분을 못하므로 그냥 string으로 설정해줌
            if pa.types.is_null(s_column.type):
                s_fixed_column.append(pa.field(s_column.name, pa.string()))
            else:
                s_fixed_column.append(s_column)

        return pa.schema(s_fixed_column)
    
    # deltalake 파일인지 확인, 해당 경로가 디렉토리이고, 하위 디렉토리에 _delta_log 디렉토리가 있는지 확인
    def isDelta(self, p_path, p_extension):
        if os.path.isdir(p_path) and '_delta_log' in os.listdir(p_path):
            return 'delta'
        else :
            return p_extension