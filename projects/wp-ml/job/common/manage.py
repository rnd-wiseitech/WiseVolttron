
import logging
'''
컬럼이 같으면 union

'''
def execute(p_dataSource, **kwargs):
    s_method = kwargs['method']
    s_data = kwargs['data']
    s_userno = kwargs['userno']
    s_usetable = s_data['usetable']
    if s_method == 'VIEWTABLE':
        try:
            s_df = p_dataSource.getDataSet2(s_usetable)
        except Exception as e:
            s_path = f'{str(s_userno)}/temp/{s_usetable}.parquet'
            s_df = p_dataSource.o_storageManager.readFile(s_path, 'parquet')
            p_dataSource.dataset[s_usetable] = s_df
        return s_df[:20]
            
    