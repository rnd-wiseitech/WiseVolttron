import io
import requests
import boto3
import os
import chardet
from detect_delimiter import detect
import pandas as pd
from config.wp import getConfig
from serviceStorage import common

"""
# LOCAL 또는 HDFS일 경우 csv 파일경로 따기
p_filetype: LOCAL인지 HDFS인지 (나머지는 확인 필요)
p_filename: 파일 이름
p_userinfo: 유저 정보

return fullpath(config파일의 DEFAULT_DATA_PATH 포함 path)
"""
def getCsvPath(p_filetype, p_filename, p_userinfo):
    

    s_userno = p_userinfo['USER_NO']
   
    # WPLAT-148
    s_wiseStorage = common.WiseStorageManager(s_userno)
    s_wiseStorage.createDirs(f'{str(s_userno)}')

    # 파일타입이 WEB일 경우 (원래의 WP가 아님. 확인 필요.)
    if (p_filetype == 'web'):
        s_url = 'http://' + getConfig('NODE','host') + ':' + getConfig('NODE','port') + '/staticUpload/'
        s_res = requests.get(s_url)
        s_decodedContent = s_res.content.decode('utf-8')
        s_output = io.StringIO(s_decodedContent)
    # 클라우드일경우(확인 필요)
    else:        
        s_wiseStorage = common.WiseStorageManager(s_userno)
        # 지금 운영 데이터셋 교체할 때 뭔가 문제가 있음, getPath 할때 파일 경로가 중복됨
        s_output = s_wiseStorage.getPath() + p_userinfo['path']

    return s_output



"""
# csv 업로드 (원본 WP에서 사용하지 않음)
p_uuid: UUID
p_userinfo: 유저 정보
"""
def uploadCsv(p_uuid, p_userinfo):
    s_session = boto3.Session(
        aws_access_key_id='AKIAIGE72I33H7G4VOGQ',
        aws_secret_access_key='LwGMDiSCvNKKSGc2qSYACMhFeBimrM7dSwKe44',
        region_name='ap-northeast-2'
    )

    s_userno = p_userinfo['USER_NO']
    s_userId = p_userinfo['USER_ID']

    s_s3 = s_session.resource('s3')
    s_s3.Bucket('wisestorage').upload_file('py_result/' + str(s_userno) + '/exeResult/' + p_uuid + '_exe_result.csv', str(s_userno) + '/' + s_userId + '/exeResult/' + p_uuid + '_exe_result.csv')


"""
# csv 정보 얻기
p_path: 파일경로 (config파일의 DEFAULT_DATA_PATH 포함 fullpath 받음)
p_userno: 유저번호
p_isHdfs: 하둡인지 아닌지
"""
def checkCsvInfo(p_path, p_userno, p_storageInfo=None,p_apiType=None):
    # WPLAT-148
    if p_storageInfo:
        s_wiseStorage = common.WiseStorageManager(p_userno=p_userno, p_apiType=p_apiType,p_type=p_storageInfo['storage_type'], p_storageInfo=p_storageInfo)
    else:
        s_wiseStorage = common.WiseStorageManager(p_userno)
    s_storageType = getConfig('','STORAGE_TYPE')
    s_readSize = 1000 if s_storageType == 'HDFS' else 5000
    # encoding 확인
    s_rawdata = s_wiseStorage.readFile(p_path, p_option='read', p_mode='rb', p_readsize=s_readSize, p_fullPath=False)  # 바이트데이터 전체
    if type(s_rawdata) == str :
        s_rawdata = s_rawdata
        
    s_checkEnc = chardet.detect(s_rawdata)['encoding'] 

    s_colums = s_rawdata.decode(s_checkEnc, errors='ignore').split('\r\n', 1)[0]
    s_sep = detect(s_colums)

    # s_columns : 모델운영 변경데이터에서 컬럼 비교시 필요             
    s_colums = s_colums.strip()
    return s_sep, s_checkEnc, s_colums


"""
# csv 읽기
p_file: 파일경로
p_sep: 구분자
p_encType: 인코딩
"""
def readCsv(p_file, p_sep, p_encType):
    if p_encType == 'EUC_KR' or p_encType == 'euc_kr' or p_encType =='euc-kr' or p_encType =='EUC-KR':
        try:
            s_df = pd.read_csv(p_file, sep=p_sep, engine='python', encoding=p_encType)
        except:
            s_df = pd.read_csv(p_file, sep=p_sep, engine='python', encoding='CP949')
    elif p_encType == 'UTF-16' or p_encType == 'utf-16':
        s_df = pd.read_csv(p_file, sep=p_sep,  engine='c', encoding=p_encType)
    else:
        s_df = pd.read_csv(p_file, sep=p_sep, engine='python', encoding=p_encType, on_bad_lines='skip') # python==3.7.6
        # s_df = pd.read_csv(p_file, sep=p_sep, engine='python', encoding=p_encType, on_bad_lines='skip') # python==3.10.9

    return s_df


"""
# csv 저장
p_file: 파일경로
p_df: 데이터프레임
"""
def writeCsv(p_file, p_df):
    p_df.to_csv(p_file, index=False, header=True, encoding='utf-8-sig')