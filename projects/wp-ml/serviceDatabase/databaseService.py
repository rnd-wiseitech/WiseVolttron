import pandas as pd
from sqlalchemy import create_engine
# mysql
import pymysql
pymysql.install_as_MySQLdb()
# hive

import logging
from dask import dataframe as dd
from urllib import parse


import os
import cx_Oracle
from config.wp import getConfig
import sqlalchemy as sa
from sqlalchemy import insert,MetaData,update,text
import logging
import pyodbc
import re
import numpy as np
import math
logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
logging.getLogger('pyhive.hive').setLevel(logging.WARNING)
# print(pyodbc.drivers())
# 이중화 (전기안전공사)
#o_currMaster = 'wp-master1'
"""
p_param: db접속정보 및 테이블정보, 유저정보
p_batchFlag: 모델운영 여부(스케줄데이터변경)
"""
def readDatabase(p_param, p_flag=None):
    s_dbtype = p_param['dbType']
    s_dbname = p_param['dbName']
    s_tablename = p_param['fileName']
    s_ip = p_param['dbInfo']['ip']
    s_port = p_param['dbInfo']['port']
    s_user = p_param['dbInfo']['user']
    s_passwd = p_param['dbInfo']['passwd']
    
    # HIVE일 경우
    s_df = selectRDBMS(s_dbtype, s_ip, s_port, s_user, s_passwd, s_dbname, s_tablename, p_flag=p_flag)
    # 컬럼타입 재정의
    s_df = s_df._convert(numeric=True)
    
    return s_df

"""
db 커넥션 생성
p_dbType: db종류(mysql, oracle 등)
p_ip: db host
p_port : db port
p_user : db id
p_passwd : db passwd
p_dbname : database name(schema)
"""
def connectRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_owner='', p_auth=None):

    if p_dbtype == 'mysql':
        s_engine = create_engine(f'mysql+mysqldb://{p_user}:{parse.quote(p_passwd)}@{p_ip}:{p_port}/{p_dbname}?charset=utf8', encoding='utf-8-sig')
        s_conn = s_engine.connect().execution_options(stream_results=True, max_row_buffer=100000)
    elif p_dbtype == 'mssql':
        s_engine = create_engine(f'mssql+pymssql://{p_user}:{p_passwd}@{p_ip}:{p_port}/{p_dbname}?charset=utf8', encoding='utf-8')
        s_conn = s_engine.connect().execution_options(stream_results=True, max_row_buffer=100000)
    elif p_dbtype == 'oracle':
        # 라이브러리 설정
        try:
            # 비밀번호에 특수문자(@ 등)가 있을 경우 인코딩
            if any(c in p_passwd for c in ['@', ':', '/', '?', '#', '&', '=', '+']):
                s_encoded_passwd = parse.quote_plus(p_passwd)
            else:
                s_encoded_passwd = p_passwd
            # cx_Oracle.init_oracle_client(lib_dir=os.getcwd() +'\\..\\..\\' + getConfig('','LIB_PATH'))
            cx_Oracle.init_oracle_client(lib_dir=getConfig('','LIB_PATH'))
        except Exception as e:
            print("init oracle error error : ", e)
            pass
            
        s_engine = create_engine(f'oracle+cx_oracle://{p_user}:{s_encoded_passwd}@{p_ip}:{p_port}/?service_name={p_dbname}', arraysize=100000, max_identifier_length=30)

        s_conn = s_engine.connect().execution_options(stream_results=True)

    elif p_dbtype == 'postgresql':
        try:
            # 비밀번호에 특수문자(@ 등)가 있을 경우 인코딩
            if any(c in p_passwd for c in ['@', ':', '/', '?', '#', '&', '=', '+']):
                s_encoded_passwd = parse.quote_plus(p_passwd)
            else:
                s_encoded_passwd = p_passwd
            s_engine = create_engine(f'postgresql+psycopg2://{p_user}:{s_encoded_passwd}@{p_ip}:{p_port}/{p_dbname}',
                                    connect_args={'options': '-csearch_path={}'.format(p_owner)},
                                    encoding='utf-8-sig')
            s_conn = s_engine.connect().execution_options(stream_results=False, max_row_buffer=1000000)
        except Exception as e:
            print("❌ Postgre 연결 실패:", type(e), str(e))

    return s_conn


"""
db 테이블 조회
db 커넥션 생성
p_dbType: db종류(mysql, oracle 등)
p_ip: db host
p_port : db port
p_user : db id
p_passwd : db passwd
p_dbname : database name(schema)
p_tblname : 테이블명
p_where: 조건문
p_batchFlag: 모델운영 여부(스케줄데이터변경) ---> True일 경우 컬럼명만 들구옴
"""
def selectRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_tblname, p_owner='', p_where='', p_flag=None, p_query=None):
    
    s_conn = connectRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_owner)
    
    # 모델운영 데이터 변경시 사용가능한지 컬럼비교(컬럼만 들고옴)
    if p_flag == 'column':
        s_query = getCustomQuery(p_dbtype, p_tblname, p_flag)
    # 모델운영 output 설정시 해당 테이블명이 존재하는지 안하는지 체크
    elif p_flag =='exist':
        s_query = getCustomQuery(p_dbtype, p_tblname, p_flag)
    # inner join 등 query 직접 날려야 하는 경우
    elif p_flag =='direct':
        s_query = p_query
    # 일반적인 SELECT
    else:
        if p_where == '':
            s_query = f'SELECT * FROM {p_tblname}'
        else :
            s_query = f'SELECT * FROM {p_tblname} {p_where}'

    s_chunks = []
    for chunk in pd.read_sql(s_query, s_conn, chunksize = 100000):
        s_chunks.append(chunk)
    s_df = pd.concat(s_chunks, ignore_index=True)
    del s_chunks
    del chunk
    s_conn.close()
    return s_df

def insertRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_tblname, p_owner, p_data, p_flag=None):
    s_conn = connectRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_owner)   

    result = s_conn.execute(insert(p_tblname),p_data)

    return result

def updateRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_tblname, p_owner, p_where, p_flag=None):
    s_conn = connectRDBMS(p_dbtype, p_ip, p_port, p_user, p_passwd, p_dbname, p_owner)
    
    result = s_conn.execute(update(p_tblname),p_where)

    return result

"""
모델운영 배치결과 DB 저장
p_userno: 유저번호
p_tablename: 저장할 테이블명
p_df: 저장할 데이터
p_dbInfo: db접속정보
p_mode: 덮어쓰는건지 insert인지
"""
def saveDatabase(p_userno, p_tablename, p_df, p_dbInfo, p_mode='replace'):
    s_dbtype = p_dbInfo['dbType']
    s_dbname = p_dbInfo['dbName']
    s_ip = p_dbInfo['ip']
    s_port = p_dbInfo['port']
    s_user = p_dbInfo['user']
    s_passwd = p_dbInfo['passwd']
    s_owner = p_dbInfo['owner_nm']

    # db 연결


    # RDBMS일 경우
    
    # db 연결
    s_conn = connectRDBMS(s_dbtype, s_ip, s_port, s_user, s_passwd, s_dbname, s_owner)
    s_dtypeConfig = setSqlColumnType(p_df, s_dbtype)
    
    if s_dbtype == 'oracle':
        s_tablename = p_tablename.lower()
        p_df.to_sql(name=s_tablename, schema=s_owner, con=s_conn, if_exists=p_mode, index=False, chunksize=100000, dtype=s_dtypeConfig)
    else:
        p_df.to_sql(name=p_tablename, con=s_conn, if_exists=p_mode, index=False, chunksize=100000, dtype=s_dtypeConfig)
    s_conn.close()
    return ""



"""
모델운영 sql 테이블에 저장시 컬럼타입 세팅
default로 나둘 경우 컬럼타입이 너무 크게 잡혀서 변경
p_df: 저장할 데이터
"""
def setSqlColumnType(p_df, p_dbtype) :
    s_dtypeConfig = {}

    for col in p_df.columns:
        s_dtype = str(p_df[col].dtype)
        if s_dtype  == 'object':
                length = p_df[col].astype(str).str.len().max()
                if length < 1 :
                    s_dtypeConfig[col] = sa.types.VARCHAR(length = 1)
                else :
                    s_dtypeConfig[col] = sa.types.VARCHAR(length = length)
        elif 'datatime' in s_dtype:
            s_dtypeConfig[col] = sa.DateTime()
        elif 'float' in s_dtype  :
            s_dtypeConfig[col] = sa.types.Float(asdecimal=True)
        elif 'int' in s_dtype  :
            s_dtypeConfig[col] = sa.types.INTEGER()
            # 오라클 일때는 BIGINT 쓰면 안됨!! 오라클은 NUMBER 데이터 타입밖에 없어서 INTEGER로 주면 알아서 변환해서 저장함!!
            if p_df[col].max() > 2147483647 and p_dbtype not in ['oracle', 'tibero']:
                s_dtypeConfig[col] = sa.types.BIGINT()
        elif s_dtype  == 'boolean' :
            if p_dbtype == 'tibero':
                s_dtypeConfig[col] = sa.types.CHAR(1)
            else:
                s_dtypeConfig[col] = sa.types.Boolean()

    return s_dtypeConfig



"""
커스텀 쿼리
p_dbType: db종류(mysql, mssql등)
p_tblename: 컬럼조회할테이블명
p_flag == 'column'모델운영에서 스케줄 데이터 변경시 데이터가 
모델에 적합한지 컬럼을 비교하기 위한 컬럼가져오는 쿼리
p_flasg =='exist' 해당 테이블이 있는지 없는지 확인쿼리(모델운영 output데이터설정시)
"""
def getCustomQuery(p_dbType, p_tblname, p_flag):
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

    elif p_dbType == 'postgresql':
        if p_flag == 'column':
            s_query = f'SHOW COLUMNS IN {p_tblname}'
        else:
            s_query = f'''SHOW TABLES LIKE '{p_tblname}' '''
            
    return s_query
    
# p_status가 'Temp'면 10개만 뽑음
def fromDatabaseTable(p_data, p_status):
    s_auth = None

    s_tablename = p_data['tablename']

    s_conn = connectRDBMS(p_data['dbtype'], p_data['dbhost'], p_data['dbport'], p_data['dbuser'], p_data['dbpassword'], p_data['dbname'], p_data['owner'], s_auth)
    
    s_query = f'SELECT * FROM {s_tablename}'
    
    try:
        if p_data['dbtype'] == 'oracle':
            s_tablename = s_tablename.lower()
            s_query = f'SELECT * FROM {s_tablename}'
            if p_status == 'Temp':
                    s_query += ' WHERE ROWNUM <= 10'
        # 만약 에러나면 query로 대체    
        # s_query = f'SELECT * FROM {s_tablename}'
        elif p_data['dbtype'] == 'tibero':
                # Tibero는 pyodbc.Connection이므로 chunksize 사용 불가
            if p_status == 'Temp':
                s_query += ' WHERE ROWNUM <= 10'
        else:
            if p_status == 'Temp':
                s_query += ' LIMIT 10'

        s_chunks = []
        s_init = True
        for chunk in pd.read_sql(s_query, s_conn, chunksize = 1000000):
            if s_init == True:
                s_df = chunk
                s_init = False
            else:
                s_df = pd.concat([s_df, chunk], ignore_index=True)
        del s_chunks
        del chunk
    except Exception as e:
        raise e
    finally:
        # 하이브일 경우에는 engine도 끔
        s_conn.close()
        
    return s_df



def fromDatabaseQuery(p_data):
    s_auth = None
  
    s_conn = connectRDBMS(p_data['dbtype'], p_data['dbhost'], p_data['dbport'], p_data['dbuser'], p_data['dbpassword'], p_data['dbname'], p_data['owner'] ,s_auth)
    
        
    if p_data['dbtype'] == 'tibero':
        # Tibero는 pyodbc.Connection이므로 chunksize 사용 불가
        try:
            s_query = p_data['query']
            s_df = pd.read_sql(s_query, s_conn)
        except Exception as e:
            print(f"❌ Tibero SELECT 오류: {e}")
            raise e
        finally:
            s_conn.close()
    
    else: 
        s_chunks = []
        s_init = True
        for chunk in pd.read_sql(p_data['query'], s_conn, chunksize = 1000000):
            if s_init == True:
                s_df = chunk
                s_init = False
            else:
                s_df = pd.concat([s_df, chunk], ignore_index=True)
        del s_chunks
        del chunk
        s_conn.close()

    return s_df


def insertDatabase(p_df, p_data):
    s_auth = None
    if p_data['dbtype'] == 'hive':
        # s_auth = p_data['auth']
        s_auth = 'NOSASL'
        # db정보
        p_data['dbtype'] = 'hive'
        p_data['dbhost'] = 'localhost'
        p_data['dbport'] = '10000' 
        p_data['dbuser'] = 'root'   
        p_data['dbpassword'] = 'wise1012'
        
    s_conn = connectRDBMS(p_data['dbtype'], p_data['dbhost'], p_data['dbport'], p_data['dbuser'], p_data['dbpassword'], p_data['dbname'], p_data['owner'], s_auth)
            
    if p_data['mode'] in ['overwrite', 'new']:
        s_mode = 'replace'
    else:
        s_mode = 'append'
    
    # Tibero는 pyodbc방식으로  setSqlColumnType 안씀
    if p_data['dbtype'] != 'tibero':
        # type 정의
        s_dtypeConfig = setSqlColumnType(p_df, p_data['dbtype'])
    else:
        s_dtypeConfig = None

    s_tablename = p_data['tablename']
    #
    if p_data['dbtype'] == 'oracle':
        s_tablename = s_tablename.lower()
        p_df.to_sql(name=s_tablename, schema=p_data['owner'], con=s_conn, if_exists=s_mode, index=False, chunksize=100000, method='multi', dtype=s_dtypeConfig)

    elif p_data['dbtype'] == 'postgresql':
        p_df.to_sql(name=s_tablename, schema=p_data['owner'], con=s_conn, if_exists=s_mode, index=False,  chunksize=100000, dtype=s_dtypeConfig)
    elif p_data['dbtype'] == 'tibero':
        s_cursor = s_conn.cursor()
        if p_data['mode'] in ['overwrite', 'new']:
            # DROP 전에 테이블 존재 여부 확인
            s_tablename = s_tablename.upper()
            
            s_check_sql = f"""
                SELECT COUNT(*) 
                FROM USER_TABLES 
                WHERE TABLE_NAME = '{s_tablename}'
            """
            
            s_cursor.execute(s_check_sql)
            exists = s_cursor.fetchone()[0]

            if exists:
                s_cursor.execute(f"DROP TABLE {s_tablename} PURGE")
                s_conn.commit()
                print(f"[DROP TABLE] {s_tablename} 삭제 완료")
            else:
                print(f"[DROP TABLE] {s_tablename} 테이블 없음 → 삭제 건너뜀")

            # ✅ CREATE TABLE
            create_sql = createTiberoTableQuery(p_df, s_tablename)
            print(f"[Tibero] CREATE SQL:\n{create_sql}")
            s_cursor.execute(create_sql)
            s_conn.commit()

        # INSERT using batch
        s_columns = ", ".join(p_df.columns)
        s_placeholders = ", ".join(["?" for _ in p_df.columns])
        insert_sql = f"INSERT INTO {s_tablename} ({s_columns}) VALUES ({s_placeholders})"

        try:
            s_cursor.fast_executemany = True
            batch_size = 10000
            total_rows = len(p_df)
            num_batches = math.ceil(total_rows / batch_size)

            for i in range(num_batches):
                start = i * batch_size
                end = min(start + batch_size, total_rows)
                batch = p_df.iloc[start:end].values.tolist()
                s_cursor.executemany(insert_sql, batch)
                s_conn.commit()
                print(f"✅ Tibero: batch {i + 1}/{num_batches} inserted ({len(batch)} rows)")
        except Exception as e:
            s_conn.rollback()
            print(f"[Tibero Insert Error] {e}")
            raise
        finally:
            s_cursor.close()

    else:
        p_df.to_sql(name=s_tablename, con=s_conn, if_exists=s_mode, index=False, chunksize=100000, method='multi', dtype=s_dtypeConfig)
    
    s_conn.close()
    return p_df

def queryDatabase(p_df, p_data):
    print('update query')

    s_dbtype = p_data['dbtype']
    s_tablename = p_data['tablename']
    
    s_dbhost = p_data['dbhost']
    s_dbport = p_data['dbport']
    s_dbname = p_data['dbname']
    s_dbuser = p_data['dbuser']
    s_dbpassword = p_data['dbpassword']
    s_dbowner = p_data['owner']
        
    s_query = p_data['query']
    s_mode = p_data['mode']
    s_auth = None
    
    # --- 바인딩 변수 추출 ---
    binding_vars = re.findall(r":(\w+)", s_query)  # ex) :id, :name → ['id', 'name']
    modified_query = re.sub(r":\w+", "?", s_query)

    # --- 데이터 준비 ---
    p_df = p_df.replace({pd.NA: None, np.nan: None})
    
    # --- Tibero 처리 (ODBC 기반) ---
    if s_dbtype == 'tibero':
        s_tibero_odbc_conn_str = f"""
            DRIVER=Tibero 6 ODBC Driver;
            SERVER={s_dbhost};
            PORT={s_dbport};
            DATABASE={s_dbname};
            UID={s_dbuser};
            PWD={s_dbpassword};
        """

        try:
            with pyodbc.connect(s_tibero_odbc_conn_str, autocommit=False) as s_pyodbc_conn:
                s_pyodbc_conn.setdecoding(pyodbc.SQL_CHAR, encoding='cp949')
                s_pyodbc_conn.setdecoding(pyodbc.SQL_WCHAR, encoding='utf-16le')
                s_pyodbc_conn.setdecoding(pyodbc.SQL_WMETADATA, encoding='utf-16le')
                s_pyodbc_conn.setencoding(encoding='cp949')

                with s_pyodbc_conn.cursor() as s_pyodbc_cursor:
                    if not binding_vars:
                        s_pyodbc_cursor.execute(s_query)
                        print("✅ Tibero: 바인딩 변수 없음 → 단일 쿼리 실행")
                    else:
                        s_param_list = p_df[binding_vars].values.tolist()
                        print("s_param_list : ", s_param_list[0])
                        s_pyodbc_cursor.executemany(modified_query, s_param_list)
                        print("✅ Tibero: 바인딩 쿼리 실행 (executemany)")
                        
                    s_pyodbc_conn.commit()

        except Exception as e:
            print(f"❌ Tibero 처리 오류: {e}")
            raise e
    
    # --- 기타 DB (MySQL, PostgreSQL 등) → SQLAlchemy ---
    else:
        try:
            s_conn = connectRDBMS(s_dbtype, s_dbhost, s_dbport, s_dbuser, s_dbpassword, s_dbname, s_dbowner, s_auth)
            # 타입변환 필요시?
            #s_dtypeConfig = setSqlColumnType(p_df, s_dbtype)

            if not binding_vars:
                s_conn.execute(text(s_query))
                print("✅ SQLAlchemy: 바인딩 없음 → 단일 쿼리 실행 완료")
            else:
                s_param_dict_list = p_df[binding_vars].to_dict(orient='records')
                with s_conn.begin():
                    s_conn.execute(text(s_query), s_param_dict_list)
                    print("✅ SQLAlchemy: 바인딩 쿼리 실행 완료")

        except Exception as e:
            print(f"❌ SQLAlchemy 처리 오류: {e}")
            raise e
        
        finally:
            s_conn.close()
        
    return True
    

# 업로드 (테이블 데이터 -> csv)
def uploadFromTable(p_data, p_dataSource):
    s_auth = None
    
    s_tablename = p_data['tablename']

    s_conn = connectRDBMS(p_data['dbtype'], p_data['dbhost'], p_data['dbport'], p_data['dbuser'], p_data['dbpassword'], p_data['dbname'], p_data['owner'], s_auth)

    # 만약 에러나면 query로 대체    
    # s_query = f'SELECT * FROM {s_tablename}'

    s_chunks = []
    s_init = True
    # 1600만 bigdata_spark_type => 773초
    # data-manager에서 DB 데이터셋 업로드 할 때
    if getConfig('','FILE_FORMAT') == 'delta':
        s_chunkList = []
        for s_chunk in pd.read_sql(s_tablename, s_conn, chunksize = 1000000):
            s_chunkList.append(s_chunk)

        # 일단 chunk 모아서 합친 다음 한번에 delta로 저장 진행, 메모리 이슈 있으니까 다른 방식 찾아보기
        s_df = pd.concat(s_chunkList)
        s_df.columns = s_df.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
        s_df.columns = s_df.columns.str.replace(' ', '_')
        p_dataSource.o_storageManager.writeFile(p_data['filepath'], s_df, 'delta', p_writeMode='w')
        del s_chunkList
        del s_df
    else :
        for chunk in pd.read_sql(s_tablename, s_conn, chunksize = 1000000):
            chunk.columns = chunk.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
            chunk.columns = chunk.columns.str.replace(' ', '_')
            p_dataSource.o_storageManager.writeFile(p_data['filepath'], chunk, p_writeMode='a')

        del chunk
    s_conn.close()
    return True