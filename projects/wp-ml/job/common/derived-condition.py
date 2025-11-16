import pandas as pd
import json
import numpy as np
def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    

    for data in s_data['dataArray']:
        s_condition = []
        s_value = []
        s_derived = data['derivedColumn']
    
        for value in eval(data['value']):
            s_value.append(value['value'])
            s_condition.append(eval(value['cond']))
            s_else = value['else']

        s_df[s_derived] = np.select(s_condition, s_value, s_else)


        
    return s_df