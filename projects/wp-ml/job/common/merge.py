import pandas as pd

def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    p_useDF = p_dataSource.getDataSet2(s_data['usetable'])
    s_mergeDF = p_dataSource.getDataSet2(s_data['mergeTable'])

    # 조인하는 테이블의 jobId
    s_mergeJobId = s_data['mergeTable'].split('_')[-1]
    
    s_useCol = sorted(p_useDF.columns)
    s_mergeCol = sorted(s_mergeDF.columns)

    s_diff = False

    if len(s_mergeCol) != len(s_useCol):
        s_diff = True
    else:
        if s_useCol != s_mergeCol:
            s_diff = True

    if s_diff == True:
        for i in s_useCol:
            if i in s_mergeCol:
                s_mergeDF = s_mergeDF.rename(columns={i:f'{i}_{s_mergeJobId}'}) 

    p_useDF = pd.concat([p_useDF, s_mergeDF])
    return p_useDF