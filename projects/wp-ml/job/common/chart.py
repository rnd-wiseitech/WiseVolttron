import pandas as pd
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_usetable = s_data['usetable']
    s_userno = kwargs['userno']
    s_df = kwargs['df']
    # s_df = p_dataSource.getDataSet2(s_usetable)
    
    # try:
    #     s_df = p_dataSource.getDataSet2(s_usetable)
    # except:
    #     s_path = f'{str(s_userno)}/temp/{s_usetable}.parquet'
    #     s_df = p_dataSource.o_storageManager.readFile(s_path, 'parquet')
    #     p_dataSource.dataset[s_usetable] = s_df
    
    s_method = kwargs['method']

    s_groupCol = s_data['groupColumn']

    if s_method in ['pie', 'bar', 'line']:
        s_tempList = []
        for data in s_data['dataArray']:
            c = data['column']
            t = data['type']

            s_tempDf = s_df.groupby(s_groupCol).agg({c:[t]})
            # if t =='mean':
            #     t = 'avg'
            rename = f'{t}({c})'
            s_tempDf.columns = [rename]
            s_tempList.append(s_tempDf)

        s_df = pd.concat(s_tempList, axis=1).reset_index()
        del s_tempDf
        del s_tempList

        if s_df.shape[0] > 1000:
            s_df = s_df.sample(n=1000)
            s_df = s_df.sort_values(by=s_groupCol[0])
        else:
            s_df[s_groupCol[0]] = s_df[s_groupCol[0]].astype(str)
        

    else:
        s_col = [s_groupCol[0]]
        for data in s_data['dataArray']:
            s_col.append(data['column'])

        s_df = s_df[s_col]

        if s_df.shape[0] > 1000:
            s_df = s_df.sample(n=1000)

    return s_df