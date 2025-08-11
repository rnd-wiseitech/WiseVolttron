import pandas as pd
import json
import numpy as np
from pandas.api.types import is_string_dtype
from pandas.api.types import is_numeric_dtype
from job.common import boxplot_, manifest
from datetime import datetime
from job.common.io import schema

def get_ideal_dtypes(p_col):
    ideal_dtypes = ''
    
    dtype = p_col.dtype
    
    if str(dtype) not in ['object', 'category', 'string', 'datetime64[ns]']:
        c_min = p_col.min()
        c_max = p_col.max()

        # 숫자형 데이터 형식 최적화
        if str(dtype)[:3] == 'int':
            if c_min > np.iinfo(np.int8).min and c_max < np.iinfo(np.int8).max:
                ideal_dtypes = 'int8'
            elif c_min > np.iinfo(np.uint8).min and c_max < np.iinfo(np.uint8).max:
                ideal_dtypes = 'uint8'
            elif c_min > np.iinfo(np.int16).min and c_max < np.iinfo(np.int16).max:
                ideal_dtypes = 'int16'
            elif c_min > np.iinfo(np.uint16).min and c_max < np.iinfo(np.uint16).max:
                ideal_dtypes = 'uint16'
            elif c_min > np.iinfo(np.int32).min and c_max < np.iinfo(np.int32).max:
                ideal_dtypes = 'int32'
            elif c_min > np.iinfo(np.uint32).min and c_max < np.iinfo(np.uint32).max:
                ideal_dtypes = 'uint32'
            elif c_min > np.iinfo(np.int64).min and c_max < np.iinfo(np.int64).max:
                ideal_dtypes = 'int64'
            elif c_min > np.iinfo(np.uint64).min and c_max < np.iinfo(np.uint64).max:
                ideal_dtypes = 'uint64'
        else:
            if c_min > np.finfo(np.float16).min and c_max < np.finfo(np.float16).max:
                ideal_dtypes = 'float32'
            elif c_min > np.finfo(np.float32).min and c_max < np.finfo(np.float32).max:
                ideal_dtypes = 'float32'
            else:
                ideal_dtypes = 'float64'
    else:
        n_unique = p_col.nunique()
        
        # 값의 종류가 n개 미만일 경우에만 category 형식으로 최적화
        if n_unique > 100:
            ideal_dtypes = 'object'
        else:
            ideal_dtypes = 'category'
            
    return ideal_dtypes
def execute(p_dataSource, **kwargs):
    
    s_data = kwargs['data']

    try:
        # append 기능 일 때, 마지막 delta 데이터 불러와서 statistic 진행, append는 지금 delta 밖에 안씀
        if 'saveOpt' in kwargs and kwargs['saveOpt'] == 'append':
            o_storageManager = p_dataSource.o_storageManager
            s_deltaTable =  f'/{s_data["REG_USER_NO"]}/wp_dataset/{s_data["DS_VIEW_ID"]}/{s_data["DS_VIEW_ID"]}.delta'
            s_df = o_storageManager.readFile(s_deltaTable, 'delta')
        else :
            s_df = p_dataSource.getDataSet2(s_data['usetable'])
    except KeyError:
        s_df = kwargs['df']

    s_count = len(s_df)

    s_output = []
    s_manifestParam = {}
    
    for col in s_df.columns:
        
        s_tempJson = {
                    "column" : str(col),
                    "datatype" : None,
                    "count": None,
                    "mean": None,
                    "stddev": None,
                    "min": None,
                    "q1": None,
                    "q2": None,
                    "q3": None,
                    "10PER":0,
                    "90PER":0,
                    "max": None,
                    "null_count": None,
                    "total_count": s_count,
                    "duplicate_count":0,
                    "distinct_count": None,
                    "outlier_count": None,
                    "outliers": [],
                    "distribution": []
        }
        
        s_nullCount = sum(pd.isnull(s_df[col]))
        
        # s_tempJson["total_count"] = len(s_df)-s_nullCount
        s_tempJson["distinct_count"] = s_df[col].value_counts().count()
        
        s_tempJson["duplicate_count"] = sum(s_df[col].duplicated())
        
        # s_df.loc[:,[col]] = s_df.loc[:,[col]].astype(get_ideal_dtypes(s_df[col]))
        s_df[col] = s_df[col].astype(get_ideal_dtypes(s_df[col]))
        if is_numeric_dtype(s_df[col]) and s_df[col].dtypes != 'bool':            

            s_stat = s_df[col].describe()
            s_tempJson['count'] = s_stat['count']
            s_tempJson['mean'] = s_stat['mean'] if np.isfinite(s_stat['mean']) else None
            s_tempJson['stddev'] = s_stat['std'] if np.isfinite(s_stat['std']) else None
            s_tempJson['min'] = s_stat['min'] if np.isfinite(s_stat['min']) else None
            s_tempJson['q1'] = s_stat['25%'] if np.isfinite(s_stat['25%']) else None
            s_tempJson['q2'] = s_stat['50%'] if np.isfinite(s_stat['50%']) else None
            s_tempJson['q3'] = s_stat['75%'] if np.isfinite(s_stat['75%']) else None
            s_tempJson['max'] = s_stat['max'] if np.isfinite(s_stat['max']) else None
            s_tempJson['null_count'] = s_count - s_tempJson['count']
            s_tempJson['distinct_count'] = s_df[col].nunique()

            s_currentCol = {
                'dataArray' : [{
                    'column':col,
                    'type':''
                }]
            }
            s_currentCol['dataArray'][0]['type'] = "numerical"
           
            s_boxPlotData = boxplot_.execute(p_dataSource,df=s_df, data=s_currentCol)
            s_tempJson['outlier_count'] = len(s_boxPlotData[0]['outlier'])
            # s_tempJson['outliers'] = s_boxPlotData[0]
            # s_tempJson['outlier_count'] = s_df.loc[(s_df[col] < lowRange) | (s_df[col] > upperRange), col].count()
            if s_tempJson['distinct_count'] <= 10:
                s_tempJson['datatype'] = "numerical"
                s_tempJson['distribution'] = categoryHist(s_df, col, False)
            else:
                s_tempJson['datatype'] = "numerical"
                s_tempJson['distribution'] = numericHist(s_df, col)
        elif s_df[col].dtypes == 'bool':
            s_tempJson['datatype'] = "categorical"
            s_tempJson['count'] = s_df[col].count()
            s_tempJson['min'] = s_df[col].min()
            s_tempJson['max'] = s_df[col].max()
            s_tempJson['distinct_count'] = s_df[col].nunique()
            s_tempJson['null_count'] = s_count - s_tempJson['count']
            s_tempJson['distribution'] = categoryHist(s_df, col)
        else:
            s_tempJson['count'] = s_df[col].count()
            s_tempJson['min'] = s_df[col].astype(str).dropna().min()
            s_tempJson['max'] = s_df[col].astype(str).dropna().max()
            s_tempJson['distinct_count'] = s_df[col].nunique()
            s_tempJson['null_count'] = s_count - s_tempJson['count']
            s_tempJson['datatype'] = "categorical"
            if s_tempJson['distinct_count'] <= 10:
                s_tempJson['distribution'] = categoryHist(s_df, col)
            else:
                s_textFlag=False
                for i in s_df[col].head(10).astype(str):
                    if pd.isna(i) == False and len(i) > 50:
                        s_textFlag = True
                        s_tempJson['datatype'] = "text"
                        break
                if not s_textFlag:
                    s_tempJson['distribution'] = categoryHist(s_df, col)                            

        s_output.append(s_tempJson)
    
    # platform manifest 저장
    if 'DS_VIEW_ID' in s_data:        
        # row_count = 0
        # column_count = colResult.length
        cell_count = s_count*s_df.shape[1]        
        cell_null_count = sum(item["null_count"] if item["null_count"] is not None else 0 for item in s_output)
        cell_outlier_count = sum(item["outlier_count"] if item["outlier_count"] is not None else 0 for item in s_output)
        
        s_paramData = {
            "REG_USER_NO": s_data['REG_USER_NO'],
            "DS_VIEW_ID":s_data['DS_VIEW_ID'],
            "VIEW_IDX":(s_data['VIEW_IDX']),     
            "UPD_DT": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "schema": schema.getSchemaData(s_df),
            "row_count": len(s_df),
            "column_count": s_df.shape[1],         
            "cell_count": int(cell_count),
            "cell_null_count": int(cell_null_count),
            "cell_outlier_count": int(cell_outlier_count),
            "statistics":json.loads(json.dumps(s_output, default=str))
        }
        s_manifestParam = {
            "action" : 'manifest',
            "method": 'update',
            "userId" :  kwargs['userId'],
            "userno" : kwargs['userno'],
            "jobId" : kwargs['jobId'],
            "groupId" : kwargs['groupId'],
            "data" : s_paramData,
            "schema" : [],
            "viewname": kwargs['viewname'],
            "count":  len(s_df)
        }
        manifest.execute(p_dataSource, **s_manifestParam)
         
     
    return s_df, s_output


def categoryHist(p_df, p_colname, p_cateFlag=True):
    s_interval = p_df[p_colname].value_counts().reset_index()
    s_interval.columns = ['interval', 'count']
    s_sortColNm = 'count'
    
    if not p_cateFlag:
        s_sortColNm = 'interval'
        
    s_sortedInterval = s_interval.sort_values(by=s_sortColNm, ascending=False)
    
    s_result = s_sortedInterval.to_json(orient='records', lines=True, force_ascii=False).splitlines()
    
    if len(s_result) > 10:
        s_result = s_result[:10]
    if s_result==['']:
        s_result = []
    
    return s_result

def numericHist(p_df, p_colname):
    try:
        print('numericHist p_colname : ', p_colname)
        s_hist, s_binEdges = np.histogram(p_df[p_colname].dropna())
        s_valRange = []
        for binIdx, binVal in enumerate(s_binEdges):
            if (binIdx+1 != s_binEdges.size):
                s_valRange.append(str(round(s_binEdges[binIdx], 3)) + ' ~ ' + str(round(s_binEdges[binIdx+1], 3)))
                
        s_result = []
        for interval, count in zip(s_valRange, s_hist):
            s_temp = json.dumps({"interval": interval, "count": count}, default=str)
            s_result.append(s_temp)
        if s_result==['']:
            s_result = []
        
        return s_result
    except Exception as ex:
        print("a : ",ex)
