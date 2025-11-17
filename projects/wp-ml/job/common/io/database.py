import json
# import pyspark.sql.functions as F
import re
import os
from config.wp import getConfig
from database.manager import WpDataBaseManagement
from serviceDatabase import databaseService
from urllib import parse
import base64
"""
p_spark : 스파크세션
p_viewname : 뷰테이블이름
p_filepath : 파일경로
p_config : app config(hdfs url 등..)

"""
o_storage = None
# 데이터베이스에서 데이터 가져올떄 Temp면 10개만 뽑기 위해 p_status보냄
# 테이블선택했을때만 가능 쿼리로는 불가
def getData(p_data, p_status):

        
    if p_data['type'] == 'table': 
        s_df = databaseService.fromDatabaseTable(p_data, p_status)
    else:
        s_query = parse.unquote(base64.b64decode(p_data['query']).decode('utf-8'))
        s_query = s_query.strip()
        p_data['query'] = s_query

        s_df = databaseService.fromDatabaseQuery(p_data)


    return s_df



def setData(p_df, p_data):
    if p_data['mode'] == 'query' :
        s_query = parse.unquote(base64.b64decode(p_data['query']).decode('utf-8'))
        s_query = s_query.strip()
        p_data['query'] = s_query
        s_df = databaseService.queryDatabase(p_df, p_data)
    else:    
        s_df = databaseService.insertDatabase(p_df, p_data)
    
    

def uploadData(p_userno, p_data, p_dataSource):
    databaseService.uploadFromTable(p_data, p_dataSource)


def getStorage(**kwargs):
    return o_storage




