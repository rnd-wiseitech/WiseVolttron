import numpy as np
from serviceCommon import commonService
import json
'''
p_df: 상자그림 데이터를 얻을 dataframe
p_col: 상자그림 대상 컬럼
'''
def execute(p_dataSource,**kwargs):
    s_data = kwargs['data']
    try:
        s_df = p_dataSource.getDataSet2(s_data['usetable'])
    except KeyError:
        s_df = kwargs['df'] 
    s_reVal = []
    s_boxPlot = None
    try :

        s_data = kwargs['data']

        for data in s_data['dataArray']:
            
            s_targetColumn = data['column']
            _, s_boxPlot = s_df.boxplot(column=[s_targetColumn], return_type='both')
            
            s_boxes = [s_box.get_ydata() for s_box in s_boxPlot["boxes"]]
            s_medians = [s_median.get_ydata() for s_median in s_boxPlot["medians"]]
            s_whiskers = [s_whiskers.get_ydata() for s_whiskers in s_boxPlot["whiskers"]]

            s_colBoxDataTmp = np.concatenate((s_boxes, s_medians, s_whiskers), axis=None)
            s_colBoxDataTmp = np.unique(s_colBoxDataTmp)

            # boxplot 값이 1개일경우 동일 값으로 4개를 만들어 그래프 그릴때 오류를 방지
            if len(s_colBoxDataTmp) == 1:
                s_colBoxDataTmp = np.concatenate(
                    (s_colBoxDataTmp, [s_colBoxDataTmp[0], s_colBoxDataTmp[0], s_colBoxDataTmp[0]]), axis=None)

            # 4. 이상치 확인
            s_outliers = [flier.get_ydata() for flier in s_boxPlot["fliers"]]
            s_outliers = np.unique(s_outliers)
            # outliers_index 이상치 정제시 인덱스값
            outliers_index = s_df[(s_df[s_targetColumn]).isin(s_outliers)].index.values

            s_reVal.append({
                'boxdata': json.dumps(s_colBoxDataTmp, cls=commonService.JsonEncoder),
                'outlier': json.dumps(s_outliers, cls=commonService.JsonEncoder),
                'outliers_index': json.dumps(outliers_index, cls=commonService.JsonEncoder)
            })
        return s_reVal
    except Exception as ex:
        print("bp : ", s_boxPlot)
        print("val ??? : ",ex)
        print("val 123 : ", s_targetColumn + "에러")
