import pandas as pd
import datetime
import numpy as np

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
        
    return s_df


'''
p_val: 날짜 타입 체크 대상 변수(pd.Series)
'''
def isDateType(p_val):
    s_val = p_val
    s_checkDate = False
    try:
        
        s_val = s_val.astype(str)
        try:
            s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d %H:%M:%S')
            s_checkDate = True
        except Exception as e:
            s_checkDate = False
        
        if s_checkDate == False:
            try:
                s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d')
                s_val = s_val + ' 00:00:00'
                s_checkDate = True
            except Exception as e:
                s_checkDate = False

        if s_checkDate == False:
            try:
                s_val = pd.to_datetime(s_val)
                s_val = s_val.dt.strftime('%Y-%m-%d %H:%M:%S')
                s_checkDate = True
            except Exception as e:
                s_val = s_val.replace(["nan", "None", "NaT"], np.nan)
                s_checkDate = False
                
        if s_checkDate == True:
            s_val = s_val.astype(str)

    except Exception as e:
        s_checkDate = ''
    
    return s_val    