
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])


    s_df = s_df[[s_data['column']]].drop_duplicates()
    return s_df
