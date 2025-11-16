import pandas as pd

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    for data in s_data['dataArray']:
        d = data['derivedColumn']
        v = data['value']
        # 넘어온 파라미터 pandas 변환에 맞게끔 수정
        for i in s_df.columns:
            v = v.replace(f'`{i}`', f's_df[\'{i}\']')
        s_df[d] = eval(v)


    return s_df


def lpad(p_data, p_width, p_fillchar):
    """입력된 숫자 또는 문자열 왼쪽에 fillchar 문자로 패딩"""
    return p_data.astype(str).str.pad(p_width, side='left', fillchar=str(p_fillchar))

    
def rpad(p_data, p_width, p_fillchar):
    """입력된 숫자 또는 문자열 왼쪽에 fillchar 문자로 패딩"""
    return p_data.astype(str).str.pad(p_width, side='right', fillchar=str(p_fillchar))
    
def replace(p_data, p_old, p_new):
    return p_data.replace(p_old, p_new)
    
def upper(p_data):
    return p_data.str.upper()

def lower(p_data):
    return p_data.str.lower()

def isnull(p_data):
    return p_data.isnull()

def abs(p_data):
    return p_data.abs()

def round(p_data, p_decimal=0):
    return p_data.round(p_decimal)

def length(p_data):
    return p_data.str.len()