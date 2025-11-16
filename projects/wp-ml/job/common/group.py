import pandas as pd
import numpy as np

def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_derivedCol = s_data['derivedColumn']
    s_targetCol = s_data['column']

    s_condition = []
    s_value = []
    for data in s_data['dataArray']:
        maxRange = data['maxRange']
        minRange = data['minRange']
        v = data['value']
        if checkNumeric(maxRange) == True:
            maxRange = float(maxRange)
        if checkNumeric(minRange) == True:
            minRange = float(minRange)
        cond = (minRange <= s_df[s_targetCol]) & (s_df[s_targetCol] < maxRange)
        s_condition.append(cond)
        s_value.append(v)

    s_df[s_derivedCol] = np.select(s_condition, s_value, 'ETC')

    return s_df


def checkNumeric(p_data):
    try:
        float(p_data)
        return True
    except ValueError:
        return False
