from serviceUtil import csvReaderService
import os
import re 
from serviceDatabase import databaseService
from detect_delimiter import detect
import pandas as pd
from dask import dataframe as dd
from serviceStorage import common

"""
# WP에서 신규데이터 불러올때
# p_uploadType: HDFS, LOCAL, DS_VIEW
# p_param: 파일 정보(파일이름 파일타입 등)
"""
def readNewData(p_uploadType, p_param, p_spark=None):


    if p_uploadType == 'DS_VIEW':
        s_filePath = ''
        s_fileExtension = ''
        s_df = databaseService.readDatabase(p_param)
    
    else:

        # 파일path 및 파일타입(csv, txt 등) 얻기
        s_filePath = p_param['path']

        s_filename, s_fileExtension = os.path.splitext(s_filePath)
        s_fileExtension = s_fileExtension.lower()

        # WPLAT-148
        s_df = readDataset(s_filePath, s_fileExtension, p_param)
    
    # 컬럼이 2개미만인 경우에는 에러처리
    if len(s_df.columns) < 2:
        raise ValueError("one-column")
    
    # 컬럼 특수문자 처리
    s_df = editColumnName(p_uploadType, s_fileExtension, s_df, s_filePath, p_param)

    return s_df

"""
# LOCAL 및 HDFS 신규데이터 읽기
p_filePath: 파일경로
p_fileExtension: 파일타입(csv, txt 등)
p_param: 유저정보
WPLAT-148 추가(readLocalDataset, readHdfsDataset 대신)
"""
def readDataset(p_filePath, p_fileExtension, p_param, p_apiType=None,p_storageInfo=None):
    s_userno = p_param['USER_NO']
    if p_storageInfo:
        s_wiseStorage = common.WiseStorageManager(p_userno=s_userno,p_apiType=p_apiType, p_type=p_storageInfo['storage_type'], p_storageInfo=p_storageInfo)
    else:
        s_wiseStorage = common.WiseStorageManager(p_userno=s_userno,p_apiType=p_apiType, p_type=p_storageInfo['storage_type'])
    # csv
    s_sep = ","
    if p_fileExtension in ['.csv', '.txt']:
        # 구분자/인코딩 얻기,  s_colums : 배치에서 input데이터 변경할 경우 컬럼비교에 사용
        s_sep, s_encType, s_colums = csvReaderService.checkCsvInfo(p_filePath, s_userno, p_storageInfo,p_apiType)
        s_df = s_wiseStorage.readFile(p_filePath, p_option='csv', p_encType=s_encType, p_sep=s_sep, p_fullPath=False)

    # parquet
    elif p_fileExtension == '.parquet' or p_fileExtension == '.delta':
        s_df = s_wiseStorage.readFile(p_filePath,'parquet',p_fullPath=False)
    # excel (local만 되어있음.)
    else:
        s_df = s_wiseStorage.readFile(p_filePath,'xlsx')

    return s_df

"""
# 컬럼명처리(특수문자 빈값 등 처리)
p_uploadType: HDFS, LOCAL, DS_VIEW 등
p_fileExtension: 파일 확장자
p_df: 데이터프레임
p_filePath: 파일경로
p_param: 유저 정보
"""
def editColumnName(p_uploadType, p_fileExtension, p_df, p_filePath, p_param):
    s_regex = re.compile('[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》 \t\n\r\f\v]')

    # 컬럼에 특문이나 컬럼명이없는(Unnamed) 존재할 경우
    if bool(s_regex.search(''.join(p_df.columns.tolist()))) or any("Unnamed:" in s_col for s_col in p_df.columns.tolist()):
        p_df.columns = p_df.columns.str.replace('[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》》\”\“\’·ï»¿]', '', regex=True)
        p_df.columns = p_df.columns.str.replace(' ', '_')
        p_df.columns = p_df.columns.str.replace('Unnamed ', 'tmpCol_')

        if '' in p_df.columns:
            p_df.columns = ['tmpCol_'+str(idx) if column=='' else column for idx, column in enumerate(p_df.columns)]

        s_wiseStorage = common.WiseStorageManager(p_param['USER_NO'])
        s_wiseStorage.writeFile(p_filePath, p_df, p_option=p_fileExtension.split('.')[1])            
    return p_df






"""
모델운영에서 INPUT데이터 변경할때
모델학습데이터와 컬럼명이 같은지 확인(모델에 사용할 수 있는 데이터인지)
"""
def readColumns(p_uploadType, p_param):
    if p_uploadType == 'DS_VIEW':
        s_df = databaseService.readDatabase(p_param, 'column')
        s_columns = s_df['column'].values.tolist()

    else:
        # 파일path 및 파일타입(csv, txt 등) 얻기
        s_filePath = csvReaderService.getCsvPath(p_param['fileType'], p_param['fileName'], p_param)
        s_filename, s_fileExtension = os.path.splitext(s_filePath)
        s_fileExtension = s_fileExtension.lower()
        s_filePath = p_param['path']
        if p_uploadType == 'LOCAL':
            s_columns = readLocalColumn(s_filePath, s_fileExtension, p_param)
        elif p_uploadType =='HDFS':
            s_columns = readHdfsColumn(s_filePath, s_fileExtension, p_param)


    
    s_regex = re.compile('[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》 \t\n\r\f\v]')

    # 컬럼에 특문이나 컬럼명이없는(Unnamed) 존재할 경우
    if bool(s_regex.search(''.join(s_columns))) or any("Unnamed:" in s_col for s_col in s_columns):
        s_columns = [col.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·ï»¿]', '') for col in s_columns]
        s_columns = [col.replace(' ', '_') for col in s_columns]
        s_columns = [col.replace('Unnamed ', 'tmpCol_') for col in s_columns]


        if '' in s_columns:
            s_columns = ['tmpCol_'+str(idx) if column=='' else column for idx, column in enumerate(s_columns)]

    return s_columns



"""
# 로컬신규데이터에서 컬럼읽기(배치데이터에서 input데이터 변경시 컬럼 비교)
p_filePath: 파일경로
p_fileExtension: 파일타입(csv, txt 등)
p_param: 유저정보
"""
def readLocalColumn(p_filePath, p_fileExtension, p_param):
    s_userno = p_param['USER_NO']
    # csv
    s_sep = ","
    if p_fileExtension in ['.csv', '.txt']:
        # 구분자/인코딩 얻기
        s_sep, s_encType, s_columns = csvReaderService.checkCsvInfo(p_filePath, s_userno)
        s_columns = s_columns.split(s_sep)

    # parquet
    elif p_fileExtension == '.parquet':
        import pyarrow.parquet
        s_schema = pyarrow.parquet.read_schema(p_filePath, memory_map=True)
        s_columns = []
        for i in s_schema:
            s_columns.append(i.name)
    # excel
    else:
        s_df = pd.read_excel(p_filePath, nrows=0)
        s_columns = s_df.columns.tolist()


   
    return s_columns


"""
# 하둡신규데이터에서 컬럼읽기(배치데이터에서 input데이터 변경시 컬럼 비교)
p_filePath: 파일경로
p_fileExtension: 파일타입(csv, txt 등)
p_param: 유저정보
"""
def readHdfsColumn(p_filePath, p_fileExtension, p_param):
    s_userno = p_param['USER_NO']
    s_wiseStorage = common.WiseStorageManager(s_userno)

    if p_fileExtension in ['.csv', '.txt']:
        s_sep, s_encType, s_columns = csvReaderService.checkCsvInfo(p_filePath, s_userno)
        s_columns = s_columns.split(s_sep)

    elif p_fileExtension == '.parquet':
        s_df = s_wiseStorage.readFile(p_filePath, p_option='parquet', p_fullPath=False)
        s_columns = s_df.columns.tolist()
    return s_columns



def checkDataExist(p_uploadType, p_param):
    s_existFlag = False
    s_userno = p_param['USER_NO']
    p_filename = p_param['STORAGE_NAME']
    if p_uploadType == 'DS_VIEW':
        s_dbType = p_param['DBMS_TYPE']
        s_param = {
            'dbType': s_dbType,
            'dbName': p_param['DB_NM'],
            'fileName': p_filename,
            'dbInfo': {
                'ip': p_param['IP'],
                'port': p_param['PORT'],
                'user': p_param['USER_ID'],
                'passwd': p_param['PASSWD']
            }
        }
        s_df = databaseService.readDatabase(s_param, 'exist')
        if len(s_df) > 0:
            s_existFlag = True
    else:
        s_wiseStorage = common.WiseStorageManager(s_userno)
        s_existFlag = s_wiseStorage.checkExist(f'{str(s_userno)}/batchResult/{p_filename}.csv')

    return s_existFlag