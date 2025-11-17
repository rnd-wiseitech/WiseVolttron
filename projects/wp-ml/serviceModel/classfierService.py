import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from six import StringIO
from sklearn.tree import export_graphviz
import pydotplus
from serviceCommon import fileService

'''
인코딩한 카테고리라벨 원래의 값으로 변환
p_df : 데이터프레임
p_orgLabel: 원래라벨값
p_y_test: 예측한 y값
'''
def getOriginLabel(p_df, p_orgLabel, p_y_test):
    p_orgLabel = list(p_orgLabel.values())
    p_orgLabel = np.array(p_orgLabel)
    s_le = LabelEncoder()
    s_le.classes_ = p_orgLabel
    p_df['predict_y'] = s_le.inverse_transform(p_df['predict_y'])
    p_df['real_y'] = s_le.inverse_transform(p_y_test)

    return p_df
def saveTreeGraph(p_model,p_userNo,p_uuid,p_dataColumns):
    # 트리 그래프 저장
    s_result = True
    s_dotData = StringIO()
    export_graphviz(p_model, out_file=s_dotData, feature_names=p_dataColumns, filled=True, rounded=True, special_characters=True)
    s_fontChange = s_dotData.getvalue().replace('"helvetica"', '"../../serviceText/malgun.ttf"')
    s_treeGraphData = pydotplus.graph_from_dot_data(s_fontChange)
    # if fileService.saveTreeGraphPdf(s_treeGraphData, p_userNo, p_uuid, 'reg'):
    #     print("###### tree Save Success #########")
    # else:
    #     print("###### tree Save Fail ########")
    #     s_result = False
    
    return s_result

def setWorkflowProba(p_x_train, p_x_test, p_probaTrainData, s_probaTestData,p_originLabel):
    s_x_data = pd.concat([p_x_train, p_x_test], axis=0).reset_index()
    
    s_trainTestprobaData = pd.concat([p_probaTrainData, s_probaTestData], axis=0).reset_index(drop=True)
    
    s_totalData = pd.concat([s_x_data, s_trainTestprobaData], axis=1).set_index(keys='index')
    s_totalData = s_totalData.sort_values(by = ['index'], ascending=[True])
    s_totalDf= s_totalData[list(p_originLabel.values())]

    return s_totalDf