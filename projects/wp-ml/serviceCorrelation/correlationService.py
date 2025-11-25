

import pandas as pd
import json
'''
# 상관관계 구하기
p_cateFlag: 카테고리변수인지 아닌지 여부
p_df : 데이터프레임
p_option : 카테고리변수일경우 그에대한 옵션파라미터(일반변수일경우는 없음)
'''
def getCorrelation(p_cateFlag, p_df, p_option):
    # na는 제외하고 상관관계 그림
    s_df = p_df.copy()
    s_df = s_df.dropna(axis=0)
    
    if len(s_df)==0:
        s_df = p_df.copy()
        s_df = s_df.dropna(axis=1)

    # 카테고리일경우
    if p_cateFlag:
        from scipy.stats import chi2_contingency

        s_selectCol = p_option['selectCol'] # 선택한 컬럼
        s_cateColList = [s_col for s_col in p_option['categoryCol'] if s_col != s_selectCol] # 카테고리형 컬럼 리스트
        s_cateDf = s_df[s_cateColList]
        s_cateColCnt = len(s_cateColList)
        print("s_cateColCnt : ", s_cateColCnt)
        s_output = []

        if s_cateColCnt == 0 :
            s_output.append({'NAME':s_selectCol, 'CHIVALUE':0.0, 'PVALUE':1.0, 'DOFVALUE':1.0 })
        else :
            # 카이제곱 통계량, p-value 할당
            for idx in range(s_cateColCnt):
                print('idx : ',idx)
                contingency = pd.crosstab(s_df[s_selectCol], s_cateDf.iloc[:,idx])
                chi, p, dof, expected = chi2_contingency(contingency)
                s_output.append({'NAME':s_cateColList[idx], 'CHIVALUE':round(chi,5), 'PVALUE':round(p,5), 'DOFVALUE':dof })

        s_output = json.dumps(s_output)
        s_output = '{"cateColVal": '+ s_output +'}'
    # 그외
    else:
        s_output = s_df.corr(numeric_only=True)
        s_output = s_output.to_json(orient='split')
        s_output = '{"reVal": ' + s_output + '}'
        
    return s_output