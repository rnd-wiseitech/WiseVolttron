import pandas as pd
import json
'''
# 상관관계 구하기
p_cateFlag: 카테고리변수인지 아닌지 여부
p_df : 데이터프레임
p_option : 카테고리변수일경우 그에대한 옵션파라미터(일반변수일경우는 없음)
'''
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_usetable = s_data['usetable']
    s_userno = kwargs['userno']
    s_df = kwargs['df']

    # try:
    #     s_df = p_dataSource.getDataSet2(s_usetable)
    # except:
    #     s_path = f'{str(s_userno)}/temp/{s_usetable}.parquet'
    #     s_df = p_dataSource.o_storageManager.readFile(s_path, 'parquet')
    #     p_dataSource.dataset[s_usetable] = s_df

    s_output = s_df.corr(numeric_only=True)
    # s_output = s_output.fillna(0)
    s_output = s_output.to_json(orient='split')
    
    return [s_output]