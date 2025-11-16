import pandas as pd
import datetime
from job.error import WpError
import numpy as np
from serviceStorage import common

'''
s_jobExe = JobExecutor('common','columnChange')
a = s_jobExe.execute(s_df,target_column=['PRE_PRC'],transform_type=['int64'])
'''

# 컬럼타입 변환
def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_schema = dict(s_df.dtypes)
    
    try:

        for data in s_data['dataArray']:
            c = data['column']
            if data['type'] == 'integer':
                data['type'] = 'int'
            t = data['type']
            s_ = {}

            s_[c] =  t
            s_df = s_df.astype(s_)


    except TypeError:
        raise Exception('변경할 수 없는 타입 입니다.')
    except pd.errors.IntCastingNaNError:
        raise Exception('값에 null 이 있어 타입을 변경 할 수 없습니다.')
    #     s_beforeType = s_schema[s_columnNm]
    #     s_colData = p_df[s_columnNm]
    #     try:
    #         if s_type == 'numerical':

    #             if s_beforeType == 'Int64':
    #                 s_colData = s_colData.astype('float64')
    #             if s_beforeType == 'object':
    #                 s_colData =  pd.to_numeric(s_colData)

    #         elif s_type == 'categorical':
    #             if s_beforeType == 'float64':
    #                 s_colData = s_colData.astype('Int64')

    #         elif s_type == 'text':
    #             s_colData = s_colData.astype(str)
    #         elif s_type == 'date':
    #             s_colData = isDateType(s_colData)
    #     except TypeError:
    #         raise WpError('변경할 수 없는 타입 입니다.')

    
    return s_df


'''
p_val: 날짜 타입 체크 대상 변수(pd.Series)
'''
def isDateType(p_val):
    s_val = p_val
    s_checkDate = False
    try:
        
        # 먼저 null값 제거
        s_val = s_val.astype(str)
        # 타입체크 1 'yyyy-mm-dd hh:mm:ss
        try:
            s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d %H:%M:%S')
            s_checkDate = True
        except Exception as e:
            s_checkDate = False
        
        # 타입체크 2 'yyyy-mm-dd'
        if s_checkDate == False:
            try:
                s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d')
                s_val = s_val + ' 00:00:00'
                s_checkDate = True
            except Exception as e:
                s_checkDate = False

        # 'yyyy-mm-dd hh:mm:ss'도 아니고 'yyyy-mm-dd'도 아닐 경우
        if s_checkDate == False:
            try:
                # 먼저 datetime으로 변환
                s_val = pd.to_datetime(s_val)
                # format 변환
                s_val = s_val.dt.strftime('%Y-%m-%d %H:%M:%S')
                s_checkDate = True
            except Exception as e:
                # WP-99: 문자열처리된 null값들을 다시 null로 원복(돋보기에서 제거될수 있도록) 
                s_val = s_val.replace(["nan", "None", "NaT"], np.nan)
                s_checkDate = False
                
        # null 값을 문자열 표기 하기 위해서 다시 str 처리(strftime하면 'nan'이 nan 으로 변환됨)
        if s_checkDate == True:
            s_val = s_val.astype(str)

    except Exception as e:
        s_checkDate = ''
    
    return s_val    