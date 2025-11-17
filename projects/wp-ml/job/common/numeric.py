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
