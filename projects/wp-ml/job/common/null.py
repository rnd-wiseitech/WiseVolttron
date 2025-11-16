import pandas as pd
from pandas.api.types import is_numeric_dtype
def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])


    for data in s_data['dataArray']:
        c = data['column']
        t = data['type']
        v = data['value']
        if t == 'remove':
            s_df = s_df.dropna(subset=[c])
        else:
            # WPLAT-380 최소/최대/평균/중앙값
            if v == 'min(value)':
                v = s_df[c].min()
            if v == 'max(value)':
                v = s_df[c].max()
            if v == 'avg(value)':
                v = s_df[c].mean()
            if v == 'median(value)':
                v = s_df[c].median()
                
            s_num = True
            try:
                float(v)
            except:
                s_num = False

            if is_numeric_dtype(s_df[c]) and s_num == True:
                s_df = s_df.fillna(value={c: float(v)})
            else:
                s_df = s_df.fillna(value={c: v})

    return s_df