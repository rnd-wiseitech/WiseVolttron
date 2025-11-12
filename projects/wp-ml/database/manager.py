from dask import dataframe as dd
from sqlalchemy import create_engine
import os
import cx_Oracle
from config.wp import getConfig
from sqlalchemy import insert,MetaData,update
from sqlalchemy.pool import NullPool
import logging
import pandas as pd
import pymysql
pymysql.install_as_MySQLdb()
from typing import Union
import json
from datetime import datetime
import pytz

class WpDataBaseManagement():
    def __init__(self, p_type=None, p_autoCommit=True):
        self.o_type = p_type        
        self.o_conn = None
        self.o_autoCommit = p_autoCommit
        
        if p_type == 'meta':
            s_dbinfo = getConfig('','META_DB')
            self.o_conn = self.connect(s_dbinfo['type'],s_dbinfo['host'],s_dbinfo['port'],s_dbinfo['id'],s_dbinfo['passwd'],s_dbinfo['db'], p_autoCommit)

    """
    db 커넥션 생성
    p_dbType: db종류(mysql, oracle 등)
    p_ip: db host
    p_port : db port
    p_user : db id
    p_passwd : db passwd
    p_dbname : database name(schema)
    """
    def connect(self, p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_autoCommit):
        if p_dbtype == 'mysql':
            s_engine = create_engine(f'mysql+mysqldb://{p_user}:{p_passwd}@{p_ip}:{p_port}/{p_dbname}?charset=utf8', encoding='utf-8-sig')
            self.o_conn = s_engine.connect().execution_options(stream_results=True, max_row_buffer=100000, autocommit=p_autoCommit)
        elif p_dbtype == 'mssql':
            s_engine = create_engine(f'mssql+pymssql://{p_user}:{p_passwd}@{p_ip}:{p_port}/{p_dbname}?charset=utf8', encoding='utf-8')
            self.o_conn = s_engine.connect().execution_options(stream_results=True, max_row_buffer=100000, autocommit=p_autoCommit)
        elif p_dbtype == 'oracle':
            # 라이브러리 설정
            try:
                cx_Oracle.init_oracle_client(lib_dir=os.getcwd()+'\\..\\..\\' + getConfig('','LIB_PATH'))
            except Exception as e:
                print("init oracle error error : ", e)
                pass
                
            s_engine = create_engine(f'oracle+cx_oracle://{p_user}:{p_passwd}@{p_ip}:{p_port}/?service_name={p_dbname}', arraysize=100000, max_identifier_length=30)

            self.o_conn = s_engine.connect().execution_options(stream_results=True, autocommit=p_autoCommit)
        elif p_dbtype == 'hive':
            self.o_conn = create_engine(f'hive://{p_ip}:{p_port}/{p_dbname}', 
                echo=False, 
                poolclass=NullPool, 
                connect_args={'auth': 'NOSASL', 'configuration': {'mapreduce.job.queuename': 'default'}
            })
        elif p_dbtype == 'postgresql':
            s_engine = create_engine(f'postgresql+psycopg2://{p_user}:{p_passwd}@{p_ip}:{p_port}/{p_dbname}', encoding='utf-8-sig')
            self.o_conn = s_engine.connect().execution_options(stream_results=True, max_row_buffer=100000, autocommit=p_autoCommit)       

        return self.o_conn
    
    def close(self):
        self.o_conn.close()

    """
    db 테이블 조회
    p_tblname : 테이블명
    p_where: 조건문
    p_batchFlag: 모델운영 여부(스케줄데이터변경) ---> True일 경우 컬럼명만 들구옴
    """
    def select(self, p_tblname, p_where='', p_flag=None, p_dbtype=''):
        
        s_df = None

        # 모델운영 데이터 변경시 사용가능한지 컬럼비교(컬럼만 들고옴)
        if p_flag == 'column':
            s_query = self.getCustomQuery(p_dbtype, p_tblname, p_flag)
        # 모델운영 output 설정시 해당 테이블명이 존재하는지 안하는지 체크
        elif p_flag =='exist':
            s_query = self.getCustomQuery(p_dbtype, p_tblname, p_flag)
        elif p_flag == 'query':
            s_query = p_where
        # 일반적인 SELECT
        else:
            if type(p_where) == str:
                if p_where == '':
                    s_query = f'SELECT * FROM {p_tblname}'
                else :
                    s_query = f'SELECT * FROM {p_tblname} {p_where}'
            # WHERE 조건을 객체로 넘기면 쿼리로 변환함.
            else :
                s_where = " AND ".join([f"{x[0]}={self.replaceQueryStr(x[1])}" for x in p_where.items()])
                s_query = f'SELECT * FROM {p_tblname} WHERE {s_where}'


        s_chunks = []
        if self.o_type == 'spark-hive' :
            # 하이브는 테이블명에 dbname.tblname이기 때문에 이를 분리해서 사용
            try :
                s_dbname = p_tblname.split(".", maxsplit=1)[0]
                s_tblname = p_tblname.split(".", maxsplit=1)[1]
            except :
                # 배치에러: 모델운영 - 컬럼체크 성공한 후에 통계량 계산할 때 모델 운영에서는 p_dbname:dbname , p_tblname:tblname 으로 들어옴.
                s_dbname = ''
                s_tblname = p_tblname
                
            # warn로그가 너무 떠서 이부분에서는 레벨 조정
            logger = logging.getLogger()
            logger.setLevel(logging.WARN)

            # hdfs 접속정보
            s_webHdfsHost = getConfig('WEB_HDFS', 'host')
            s_webHdfsPort = getConfig('WEB_HDFS', 'port')

            s_daskDf = dd.read_parquet(f'webhdfs://{s_webHdfsHost}:{s_webHdfsPort}/user/hive/warehouse/{s_dbname}.db/{s_tblname}',engine='pyarrow', split_row_groups=100000)

            # 컬럼은 전부 소문자로
            s_daskDf.columns = s_daskDf.columns.str.lower()
            # s_daskList.append(s_daskDf)
            # s_daskTotal = dd.concat(s_daskList)
            s_df = s_daskDf.compute()
            s_df = s_df.reset_index(drop=True)
            # del s_daskTotal
            del s_daskDf
        else :
            for chunk in pd.read_sql(s_query, self.o_conn, chunksize = 100000):
                s_chunks.append(chunk)
            s_df = pd.concat(s_chunks, ignore_index=True)

        del s_chunks
        del chunk
        # # 한번 실행하고 연결 종료하는 경우. 이 클래스에서 여러 쿼리 실행할때에는 전체 종료 후에 연결 끊어야 함.
        # if self.o_autoCommit:
        #     self.o_conn.close()
        return s_df
    
    # Insert할 데이터를 p_data에 넣음. many는 입력할 데이터 프레임을 넘기면 되고, single은 dict 형태로 넘긴다.
    def insert(self, p_tblname, p_data:Union[dict, pd.DataFrame], p_flag=None):
        if p_flag == 'many':
            s_query = f"""
                INSERT INTO {p_tblname} ({",".join(p_data.columns)}) VALUES {",".join([f'({",".join(list(map(self.replaceQueryStr, x)))})' for x in p_data.values])}
            """
            return self.o_conn.execute(s_query)
        
        if p_flag == 'single':
            s_insertValue = {key: value for key, value in p_data.items() if value is not None}
            s_query = f"""
                INSERT INTO {p_tblname} ({",".join(s_insertValue.keys())}) VALUES ({",".join([self.replaceQueryStr(x) for x in s_insertValue.values()])})
            """
            return self.o_conn.execute(s_query)

        return self.o_conn.execute(insert(p_tblname),p_data)
    
    # update할 데이터를 p_data에 dict 형태로, 조건이 되는 값을 p_where에 dict로 넣는다.
    # 사용법- s_dbMng.update('DP_MODEL_DATASET_USE_MSTR', {"MODEL_ID":1000, "MODEL_IDX":1}, {"DATASET_ID":1111}) 
    # 실행되는 쿼리 => UPDATE DP_MODEL_DATASET_USE_MSTR SET MODEL_ID=1000, MODEL_IDX=1 WHERE DATASET_ID=1111
    def update(self, p_tblname, p_data:dict, p_where:dict, p_flag=None):     
        s_data = ",".join([f"{x[0]}={self.replaceQueryStr(x[1])}" for x in p_data.items()])
        s_where = " AND ".join([f"{x[0]}={self.replaceQueryStr(x[1])}" for x in p_where.items()])
        s_query = f'UPDATE {p_tblname} SET {s_data} WHERE {s_where}'
        return self.o_conn.execute(s_query)
    
    def delete(self, p_tblname, p_where:dict, p_flag=None):
        s_where = " AND ".join([f"{x[0]}={self.replaceQueryStr(x[1])}" for x in p_where.items()])
        s_query = f'DELETE FROM {p_tblname} WHERE {s_where}'
        return self.o_conn.execute(s_query)


    """
    커스텀 쿼리
    p_dbType: db종류(mysql, mssql등)
    p_tblename: 컬럼조회할테이블명
    p_flag == 'column'모델운영에서 스케줄 데이터 변경시 데이터가 
    모델에 적합한지 컬럼을 비교하기 위한 컬럼가져오는 쿼리
    p_flasg =='exist' 해당 테이블이 있는지 없는지 확인쿼리(모델운영 output데이터설정시)
    """
    def getCustomQuery(self,p_dbType, p_tblname, p_flag):
        
        s_query = ''
        
        if p_dbType in ['mysql', 'mssql']:
            if p_flag == 'column':
                s_query = f'''
                    SELECT COLUMN_NAME AS 'column'
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME='{p_tblname}'
                '''
            else:
                s_query = f'''
                    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_NAME='{p_tblname}'
                '''
        elif p_dbType == 'oracle':
            if p_flag == 'column':
                s_query = f'''
                    SELECT COLUMN_NAME AS "column"
                    FROM COLS
                    WHERE TABLE_NAME='{p_tblname}'
                    '''
            else:
                s_query = f'''
                    SELECT 1
                    FROM ALL_TABLES
                    WHERE TABLE_NAME='{p_tblname}'
                    '''
        elif p_dbType == 'hive':
            if p_flag == 'column':
                s_query = f'SHOW COLUMNS IN {p_tblname}'
            else:
                s_query = f'''SHOW TABLES LIKE '{p_tblname}' '''
        return s_query


    def executeOutputMetaDB(self, p_filename, p_index, p_update, p_userno, p_workflowId=None, p_statusCode=10):
        
        s_date = datetime.today().strftime("%Y-%m-%d %H:%M:%S")
        if p_index < 2:
            s_updDt = "NULL"
        else:
            s_updDt = f"'{s_date}'"
        # UPDATE DS_VIEW_TBL_MSTR
        s_query = f'''UPDATE DS_VIEW_TBL_MSTR 
                      SET 
                      VIEW_IDX={p_index}, 
                      UPDATE_YN='{p_update}',
                      UPD_DT = {s_updDt},
                      STATUS_CODE={p_statusCode} 
                      WHERE DS_VIEW_ID={p_filename}'''

        self.o_conn.execute(s_query)


        # INSERT DS_VIEW_HISTROY 
        s_operation = 'overwrite'
        s_curValue = str(p_filename) + "_" + str(p_index)
        s_preValue = str(p_filename) + "_" + str(p_index - 1)
        # 데이터셋 시작 인덱스 1 → 0으로 수정
        if p_index == 0:
            s_query = f'''
                        SELECT DS_VIEW_NM FROM DS_VIEW_MSTR WHERE DS_VIEW_ID={p_filename}
                        '''
            s_row = self.o_conn.execute(s_query)
            s_curValue = s_row.fetchone()[0]
            s_preValue = None
            s_operation = 'create'
            
        s_query = f'''
                    INSERT INTO DS_VIEW_HISTORY
                    (H_TYPE, DS_VIEW_ID, OPERATION, PRE_VALUE, CUR_VALUE, UPD_DT, UPD_USER_ID) 
                    VALUES('WK', {p_filename}, '{s_operation}', '{s_preValue}', '{s_curValue}', '{s_date}', {p_userno})
                  '''

        self.o_conn.execute(s_query)


        # (3) WF_USE_DATASET DELETE & INSERT 작업
        if p_workflowId != None:
            s_query = f'''
                    DELETE FROM WF_USE_DATASET
                    WHERE WF_ID = {p_workflowId} AND DS_VIEW_ID = {p_filename} AND OUTPUT_YN = 'Y'
                    '''
            self.o_conn.execute(s_query)
           
            s_query = f'''
                        INSERT INTO WF_USE_DATASET
                        (WF_ID, DS_VIEW_ID, DS_VIEW_IDX, REG_DT, REG_USER, OUTPUT_YN) 
                        VALUES({p_workflowId}, {p_filename}, {p_index}, '{s_date}', {p_userno}, 'Y')
                      '''
            self.o_conn.execute(s_query)


        self.o_conn.close()
        
    
    def getModelList(self, p_userno, p_modelId, p_modelNm, p_storageType) :
        s_layerModelQuery = "(SELECT ARG_ID, 'Y' AS LAYER_YN FROM DP_ARG_PARAM WHERE (PARAM LIKE '%%LAYER' OR PARAM_VALUE LIKE '%%LAYER%%') AND PARAM NOT LIKE '%%PYTORCH%%' GROUP BY ARG_ID)"
        s_pyTorchModelQuery = "(SELECT ARG_ID, 'Y' AS PYTORCH_YN FROM DP_ARG_PARAM WHERE PARAM LIKE '%%PYTORCH%%' GROUP BY ARG_ID)"
        s_blockModelQuery = "(SELECT ARG_ID, 'Y' AS BLOCK_YN FROM DP_ARG_PARAM WHERE PARAM LIKE 'BLOCK_LAYER' GROUP BY ARG_ID)"

        s_query = f''' SELECT 
            A.MODEL_ID,
            A.MODEL_IDX,
            B.ARG_ID,
            B.PROJ_ID,
            B.MODEL_NM,
            B.MODEL_PROGRESS,
            B.MODEL_RUN_TYPE,
            B.MODEL_EVAL_TYPE,
            B.MODEL_EVAL_RESULT,
            B.MODEL_USE_DATASET_ID,
            B.DEL_YN,
            B.MODEL_FEATURE_TYPE,
            B.MODEL_PART_OPTION,
            B.MODEL_ARG_PARAM,
            B.MODEL_OPTIMIZER_YN,
            B.REG_USER_NO,
            B.REG_DATE,
            B.DESC,
            B.EXCUTE_RESULT,
            B.USER_PREPROCESSING,
            C.DATASET_NAME,
            C.DATASET_TYPE,
            C.DATASET_REF_ID, 
            C.HADOOP_PATH,
            C.DATASET_ID,
            D.STRUCTURE_YN,
            D.ARG_FILE_NAME AS ARG_NM,
            E.PYTORCH_YN,
            F.DBMS_TYPE,
            F.DB_NM, 
            F.IP, 
            F.PORT, 
            F.USER_ID, 
            F.PASSWD,
            G.LAYER_YN,
            H.BLOCK_YN,
            (SELECT COL_NM FROM DP_VAR_MSTR WHERE MODEL_ID = A.MODEL_ID AND MODEL_IDX = A.MODEL_IDX  AND  VAR_TARGET_YN = 'Y' ) TARGET_NM
        FROM (SELECT MODEL_ID, MAX(MODEL_IDX) AS MODEL_IDX FROM DP_MODEL_MSTR GROUP BY MODEL_ID) A
        INNER JOIN DP_MODEL_MSTR B ON A.MODEL_ID = B.MODEL_ID AND A.MODEL_IDX = B.MODEL_IDX
        INNER JOIN  DP_MODEL_DATASET_USE_MSTR C ON C.MODEL_ID = B.MODEL_ID AND C.MODEL_IDX = B.MODEL_IDX AND C.DATASET_ID = B.MODEL_USE_DATASET_ID
        INNER JOIN  DP_ARG_MSTR D ON B.ARG_ID = D.ARG_ID
        LEFT OUTER JOIN DS_MSTR F ON C.DATASET_REF_ID = F.DS_ID
        LEFT OUTER JOIN {s_layerModelQuery} G ON G.ARG_ID = B.ARG_ID
        LEFT OUTER JOIN {s_pyTorchModelQuery} E ON E.ARG_ID = B.ARG_ID                            
        LEFT OUTER JOIN {s_blockModelQuery} H ON H.ARG_ID = B.ARG_ID                            
        WHERE B.DEL_YN = 'N' AND B.REG_USER_NO = {p_userno}
        '''
        if p_storageType != '' and p_storageType and p_storageType == 'HDFS':
            s_query += " AND C.DATASET_TYPE != 'LOCAL'" 
        else:
            s_query += " AND C.DATASET_TYPE != 'HDFS'"

        if p_modelNm != '' and p_modelNm:
            s_query += " AND B.MODEL_NM like '%%" + p_modelNm + "%%'";    

        if p_modelId != '' and p_modelId :
            # MODEL_ID 조회 조건이 있으면 삭제된 모델이어도 조회.
            s_query = s_query.replace(" B.DEL_YN = 'N' AND ", " ")
            s_query += " AND A.MODEL_ID = " + str(p_modelId)

        s_query += " GROUP BY A.MODEL_ID ORDER BY A.MODEL_ID DESC "

        s_chunks = []
        for chunk in pd.read_sql(s_query, self.o_conn, chunksize = 100000):
            s_chunks.append(chunk)
        s_df = pd.concat(s_chunks, ignore_index=True)
        del s_chunks
        return s_df
        
    def updateJobStatus(self, p_groupid, p_jobId, p_status, p_error, p_time, p_schId=0, logId=0):
        s_query = 'UPDATE JOB_SUB_MSTR SET STATUS = %s, ERROR_MSG = %s, END_DT = %s WHERE ID = %s AND JOB_ID = %s AND SCH_ID= %s AND LOG_ID = %s'
        s_result = self.o_conn.execute(s_query, (p_status, p_error, p_time, p_groupid, p_jobId, p_schId, logId))
        
        if s_result.rowcount > 0:
            print(f"UPDATE JOB_SUB_MSTR SET STATUS = {p_status}, ERROR_MSG = {p_error} WHERE ID = {p_groupid} AND JOB_ID = {p_jobId} AND SCH_ID= {p_schId} AND LOG_ID = {logId} SUCCESS!")
        else:
            print(f"UPDATE JOB_SUB_MSTR SET STATUS = {p_status}, ERROR_MSG = {p_error} WHERE ID = {p_groupid} AND JOB_ID = {p_jobId}AND SCH_ID= {p_schId} AND LOG_ID = {logId} FAILED!")



        self.o_conn.close()

    # python에서 null을 쿼리에 입력할 수 있는 NULL 문자로 변환. NULL이 아니면 string 으로 변환
    def replaceQueryStr(self, p_text):
        if p_text is None:
            return 'NULL'
        if str(p_text) in ["nan", "None", "NaT"]:
            return 'NULL'
        if type(p_text) == object or type(p_text) == str:
            s_text = ""
            try :
                json.loads(p_text)
                s_text = json.dumps(p_text)
            except Exception as e:
                s_text = f'"{p_text}"'
            return s_text
        return str(p_text)