import pandas as pd
import numpy as np
'''
# 상관관계 구하기
p_cateFlag: 카테고리변수인지 아닌지 여부
p_df : 데이터프레임
p_option : 카테고리변수일경우 그에대한 옵션파라미터(일반변수일경우는 없음)
'''
def execute(p_dataSource, **kwargs):
    s_df = kwargs['df']

    # 총 행 수
    s_count = len(s_df)

    # 숫자형 describe
    s_numericDesc = s_df.describe()


    # 문자형 describe
    s_objectDesc = describe_object(s_df)

    # 숫자형과 문자형 결과 합치기
    s_finalDesc = pd.concat([s_numericDesc, s_objectDesc], axis=1)

    # 각 열의 타입 정보를 추가 (맨 위에)
    # s_types = pd.DataFrame({col: 'numeric' if np.issubdtype(s_df[col].dtype, np.number) else 'string' for col in s_df.columns}, index=['type'])
    # 예시: `string[pyarrow]` 타입을 고려하여 컬럼별로 처리
    s_types = pd.DataFrame({
        col: ('string' if s_df[col].dtype.name == 'string'  # 먼저 string 타입을 확인
            else 'numeric' if np.issubdtype(s_df[col].dtype, np.number)  # 그 후 numeric 타입 확인
            else 'string')  # 나머지 경우에는 'string'으로 처리
        for col in s_df.columns
    }, index=['type'])

    # null 값 계산
    s_nullCounts = pd.DataFrame({col: s_count - s_finalDesc.loc['count', col] for col in s_df.columns}, index=['null'])
    
    # 타입 정보와 null 값을 describe 결과와 합침
    # 먼저 type과 count를 합치고, 그다음 null을 추가
    s_finalDesc = pd.concat([s_types, s_finalDesc])

    # 인덱스를 재정렬하여 null을 count 다음으로 배치
    s_finalDesc = pd.concat([s_finalDesc.loc[['type', 'count']], s_nullCounts, s_finalDesc.drop(['type', 'count'])])

    # 인덱스 이름을 'summary'로 설정
    s_finalDesc.index.name = 'summary'
    # 인덱스를 컬럼으로 변환
    s_finalDesc = s_finalDesc.reset_index()
    
    return s_finalDesc


# 문자형 열에 대해 count, min, max 계산
def describe_object(df):
    obj_desc = pd.DataFrame()
    for col in df.select_dtypes(include=['object','string']).columns:
        obj_desc[col] = [
            df[col].count(),      # count
            None,                 # mean (None)
            None,                 # std (None)
            df[col].min(),        # min
            None,                 # 25% (None)
            None,                 # 50% (None)
            None,                 # 75% (None)
            df[col].max()         # max
        ]
    obj_desc.index = ['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max']
    return obj_desc