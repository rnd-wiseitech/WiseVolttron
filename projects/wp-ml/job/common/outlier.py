import pandas as pd

def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    for data in s_data['dataArray']:
        c = data['column']
        t = data['type']
        v = data['value']

       
        s_q1 = s_df[c].quantile(0.25)
        s_q3 = s_df[c].quantile(0.75)
        s_iqr = s_q3 - s_q1
        s_lower = s_q1 - 1.5 * s_iqr
        s_upper = s_q3 + 1.5 * s_iqr

        if t == 'remove':
            s_df = s_df[(s_df[c] < s_upper) & (s_df[c] > s_lower)]
        else:
            # WPLAT-380 최소/최대/평균/중앙값
            if v == 'min(value)':
                v = s_df[c].min()
            if v == 'max(value)':
                v = s_df[c].max()
            if v == 'avg(value)':
                v = s_df[c].mean()
            if v == 'median(value)':
                v = s_df[c].median()

            s_df[c] = s_df[c].where((s_df[c] < s_upper) & (s_df[c] > s_lower), float(v))

    return s_df