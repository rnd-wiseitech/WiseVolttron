import pandas as pd

def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    
    s_groupCol = s_data['groupColumn']
    s_tempList = []
    for data in s_data['dataArray']:
            c = data['column']
            t = data['type']

            s_tempDf = s_df.groupby(s_groupCol).agg({c:[t]})
            if t =='mean':
               t = 'avg'
            rename = f'{t}_{c}'
            s_tempDf.columns = [rename]
            s_tempList.append(s_tempDf)

    s_df = pd.concat(s_tempList, axis=1).reset_index()
    del s_tempDf
    del s_tempList
    return s_df