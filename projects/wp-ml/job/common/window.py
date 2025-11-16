import pandas as pd

def execute(p_dataSource, **kwargs):
    # s_df = kwargs['df']
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_indexCol = s_data['indexColumn']
    s_windowSize = int(s_data['value'])
    s_targetCol = s_data['column']

    s_df = s_df[[s_indexCol, s_targetCol]]
    s_df = s_df.sort_values(by=[s_indexCol])

    for t in range(1, s_windowSize+1):
        s_df[f't-{t}'] = s_df[s_targetCol].shift(t)


    return s_df