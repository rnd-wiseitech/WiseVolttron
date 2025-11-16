import pandas as pd

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable']) 

    for data in s_data['dataArray']:
        s_targetColumn = data['column']
        s_derivedColumn = data['derivedColumn']
        s_dataFormat = data['value']  # array [python변환형식, spark변환형식]
        try:
            s_val = pd.to_datetime(s_df[s_targetColumn].astype(str))
        except:
            s_val = pd.to_datetime(s_df[s_targetColumn])
        s_df[s_derivedColumn] = s_val.dt.strftime(s_dataFormat[0])


    return s_df