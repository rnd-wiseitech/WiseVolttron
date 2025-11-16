
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    for data in s_data['dataArray']:
        c = data['column']
        t = data['value']
        s_df = s_df.rename(columns={c : t}, errors="raise")
        
    return s_df