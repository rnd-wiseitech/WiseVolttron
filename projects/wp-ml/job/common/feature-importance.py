from sklearn.ensemble import ExtraTreesRegressor, ExtraTreesClassifier
from sklearn.preprocessing import LabelEncoder
import random

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    
    s_targetCol = s_data['column']
    s_schema = dict(s_df.dtypes)
    print("s_schema")
    print(s_schema)

    s_randomSeed = int(random.random()*1000)

    s_featureCols = []
    s_stringCols = []
    s_extCategoryCols = []

    # null 값 처리, 범주형 
    for c in s_df:
        if c != s_targetCol:
            # 숫자형
            if  s_df[c].dtype.kind in 'iufc':
                s_df[c] = s_df[c].fillna(0)
                s_featureCols.append(c)
                
            else:
                s_df[c] = s_df[c].fillna(0)
                s_distinctCnt = s_df[c].nunique()
                
                # 범주형 32개 이상이면 모델 학습에서 에러 발생하므로 사용하지 않는다.
                if s_distinctCnt <= 30:
                    le = LabelEncoder()
                    s_df[f"{c}_Index_{s_randomSeed}"] = le.fit_transform(s_df[c])
                    
                    s_stringCols.append(c)
                    s_featureCols.append(f"{c}_Index_{s_randomSeed}")
                else :
                    s_extCategoryCols.append(c)
                    
    # feature 생성
    s_train_x = s_df[s_featureCols]
    s_train_y = s_df[s_targetCol]

    # RandomForest 모델 훈련 (타겟 변수에 맞춰서 모델 설정)
    if s_df[s_targetCol].dtype.kind in 'iufc':
        s_model = ExtraTreesRegressor(n_estimators=10, max_depth=5, random_state=0)
    else :
        s_model = ExtraTreesClassifier(n_estimators=10, max_depth=5, random_state=0)
        
    s_model = s_model.fit(s_train_x, y=s_train_y)

    # 변수 중요도 추출
    s_importances = s_model.feature_importances_
    s_featureNames = s_model.feature_names_in_

    s_result = {}
    for i in range(len(s_featureNames)):
        s_result[s_featureNames[i]] = s_importances[i]
    
    # 범주형 30개 이상인 컬럼 중요도를 -1로 표기
    for c in s_extCategoryCols:
        s_result[c] = -1
    
    for c in s_stringCols:
        s_result[c] = s_result.pop(f'{c}_Index_{s_randomSeed}')
        del s_df[f'{c}_Index_{s_randomSeed}']
        
    # 워크플로우에서 실행할 때에는 기준값으로 자동으로 컬럼을 선택해야 한다.
    if s_data.get('value', None) is not None:
        s_value = float(s_data['value'])
        for c in s_result:
            if s_result[c] < s_value:
                del s_df[c]
                
    return s_df, s_result