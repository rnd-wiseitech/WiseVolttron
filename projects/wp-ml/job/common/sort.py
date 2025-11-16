

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_row = []
    s_sort = []

    for data in s_data['dataArray']:
        if data['type'] == 'desc':
            s_sort.append(False)
        else:
            s_sort.append(True)
        s_row.append(data['column'])

    s_df = s_df.sort_values(by=s_row, ascending=s_sort)

    return s_df