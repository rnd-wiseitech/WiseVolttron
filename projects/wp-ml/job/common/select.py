import pandas as pd

def execute(p_dataSource, **kwargs):
    # s_df = kwargs['df']
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_df = s_df[s_data['column']]

    return s_df