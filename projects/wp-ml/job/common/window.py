import pandas as pd

def execute(p_dataSource, **kwargs):
    # s_df = kwargs['df']
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_indexCol = s_data['indexColumn']
    s_windowSize = int(s_data['value'])
    s_targetCol = s_data['column']
    # 옵션 추가 전에 저장된 워크플로는 값이 없을 수 있다
    s_stride = int(s_data.get('stride') or 0)
    s_nanhandle = s_data.get('nanhandle') or 'none'

    s_df = s_df[[s_indexCol, s_targetCol]]
    s_df = s_df.sort_values(by=[s_indexCol])

    for t in range(1, s_windowSize+1):
        s_df[f't-{t}'] = s_df[s_targetCol].shift(t)

    # 결측값을 먼저 처리한 뒤 이동 간격을 적용해야 남는 행이 일정하다
    if s_nanhandle == 'remove':
        s_df = s_df.dropna()
    elif s_nanhandle == 'fill':
        # fillna(method=...) 는 pandas 2.x 에서 deprecated
        s_df = s_df.ffill().bfill()

    if s_stride > 0:
        s_df = s_df.iloc[::s_stride].reset_index(drop=True)

    return s_df
