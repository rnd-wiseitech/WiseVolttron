import pandas as pd
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.model_selection import train_test_split
'''
클러스터링 시각화데이터 생성
p_df_scale: 시각화 대상 데이터(스케일링 되어있는 2차원 데이터)
p_cluster_centers: 클러스터 중심점 리스트
'''
def getVisualizeData(p_df_scale, p_clusterCenters):
    # 시각화 데이터
    s_df_visual = p_df_scale.copy()
    s_featureLog = []
    for s_label in p_clusterCenters: 
        s_log = {}
        for feat, imp in zip(p_df_scale.columns, s_label):         
            s_log.__setitem__(feat, round(np.abs(imp),3))  
        s_featureLog.append(s_log)
        # 중심점 데이터 붙임
        s_appendIndex = s_df_visual.index[-1] + 1 
        s_df_visual.loc[s_appendIndex] = s_label
    return s_df_visual, s_featureLog

'''
클러스터링 시각화를 위한 2차원 데이터 생성
p_dfVisual: 2차원 축소 데이터 생성
p_centerStartIdx: 중심점 데이터가 시작되는 index
'''
def get2dData(p_df_visual, p_centerStartIdx):
    # Visualization (2차원으로 차원 축소)
    svd = TruncatedSVD(n_components=2)
    if len(p_df_visual.columns) == 2 :
        s_df_svd = p_df_visual
        s_df_svd.columns = ['x', 'y']
    else :
        s_df_svd = pd.DataFrame(svd.fit_transform(p_df_visual), columns=['x', 'y'], index=p_df_visual.index)
    
    # 시각화 데이터 중심
    s_df_svd_center = s_df_svd.loc[p_centerStartIdx+1:].reset_index(drop=True) # 중심점 붙인 부분.
    s_df_svd = s_df_svd.loc[:p_centerStartIdx] # #18 중심점 붙이기 이전 실제 데이터.
    
    return s_df_svd, s_df_svd_center

'''
클러스터링 시각화 저장 데이터 생성 (json 형식)
p_df_svd: 2차원 데이터
p_labels: 클러스터 라벨
'''
def getSvdOutput(p_df_svd, p_labels):
    s_unique_label_size = len(pd.Series(p_labels).unique())
    s_train_size = min(len(p_df_svd)-s_unique_label_size, 1000)

    # 라벨 갯수가 딱 1개인 값이 있을 경우 train_test_split에서 오류 발생
    # train_test_split 실행하기 전에 라벨 갯수와 train_size를 체크하여 stratify 여부 결정
    s_label_counts = pd.Series(p_labels).value_counts()
    s_can_stratify = s_label_counts.min() >= 2 and s_train_size >= s_unique_label_size * 2

    # train_test_split 파라미터 설정
    p_split_param = { "train_size": 0.8 }
    
    # 모든 라벨 값 갯수가 2개 이상일 경우 stratify 파라미터 설정
    if s_can_stratify:
        p_split_param['stratify'] = p_labels
    # 없으면 stratify 파라미터 설정 안하고 random_state 설정
    else:
        p_split_param['random_state'] = 42
        
    s_df_svd_save, _, s_clusterLabel, _ = train_test_split(p_df_svd, p_labels, **p_split_param)

    s_df_svd_save = s_df_svd_save.apply(lambda x: round(x, 2))
    
    s_df_svd_save['Cluster_Label'] = s_clusterLabel
    s_df_svd_save = s_df_svd_save.reset_index(drop=True)
    
    s_output = s_df_svd_save.to_json(orient='columns')
    return s_output