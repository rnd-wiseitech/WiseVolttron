import pandas as pd

def execute(p_dataSource, **kwargs):
    # s_df = kwargs['df']
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_indexCol = s_data['indexColumn']
    s_windowSize = int(s_data['value'])
    s_targetCol = s_data['column']
    s_stride = int(s_data['stride'])
    s_nanhandle = s_data['nanhandle']

    s_df = s_df[[s_indexCol, s_targetCol]]
    s_df = s_df.sort_values(by=[s_indexCol])

    for t in range(1, s_windowSize+1):
        s_df[f't-{t}'] = s_df[s_targetCol].shift(t)

    if s_stride > 0:
        s_df = s_df.iloc[::s_stride]

    if s_nanhandle == 'remove':
        s_df.dropna(inplace=True)
        
    elif s_nanhandle == 'fill':
        s_df.fillna(method='ffill', inplace=True)
        s_df.fillna(method='bfill', inplace=True)

    return s_df