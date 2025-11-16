import pandas as pd

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_matchCase = {
        '==': lambda p_col, p_value: s_df[p_col] == p_value,
        '>=': lambda p_col, p_value: s_df[p_col] >= p_value,
        '>': lambda p_col, p_value: s_df[p_col] > p_value,
        '<=': lambda p_col, p_value: s_df[p_col] <= p_value,
        '<': lambda p_col, p_value: s_df[p_col] < p_value,
        '!=': lambda p_col, p_value: s_df[p_col] != p_value
    }

    s_init = True
    
    for data in s_data['dataArray']:
        c = data['column']
        t = data['type']
        v = data['value']
        
        if v.isnumeric() == True:
            v = float(v)
            
        if s_init == True:
            expr = s_matchCase[t](c, v)
            s_init = False
        else:
            expr = expr & s_matchCase[t](c, v)

    s_df['filter_split'] = expr

    
    s_falseDF = s_df[s_df['filter_split'] == False].drop('filter_split', axis=1)
    s_df = s_df[s_df['filter_split'] == True].drop('filter_split', axis=1)

    return [s_df, s_falseDF]