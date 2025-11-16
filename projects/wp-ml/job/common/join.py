import pandas as pd

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    p_useDF = p_dataSource.getDataSet2(s_data['usetable'])
    s_joinDF = p_dataSource.getDataSet2(s_data['joinTable'])

    # 로직 변경 job_id를 prepix로 붙임. 기존 join 에서 붙여진건 다음에는 안 붙이게 해야함. 겹치는 컬럼만
    # 조인하는 테이블의 jobId
    s_joinJobId = s_data['joinTable'].split('_')[-1]

    s_useCol = sorted(p_useDF.columns)
    s_joinCol = sorted(s_joinDF.columns)
    
    s_joinType = s_data['type']
    if s_joinType == 'left_outer':
        s_joinType = 'left'
    elif s_joinType == 'right_outer':
        s_joinType = 'right'
    for i in s_useCol:
        if (i in s_joinCol) or ():
            s_joinDF = s_joinDF.rename(columns={i:f'{i}_{s_joinJobId}'}) 

    s_useOn = []
    s_joinOn = []
    for data in s_data['dataArray']:
        useCol = data['useColumn']
        joinCol = data['joinColumn']
        if useCol.lower() == joinCol.lower():
            joinCol = f'{joinCol}_{s_joinJobId}'

        s_useOn.append(useCol)
        s_joinOn.append(joinCol)


    p_useDF = pd.merge(left=p_useDF, right=s_joinDF, how=s_joinType, left_on=s_useOn, right_on = s_joinOn, sort=False)


    return p_useDF