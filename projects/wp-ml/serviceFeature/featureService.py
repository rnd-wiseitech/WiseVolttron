import pandas as pd
import numpy as np
from sklearn.ensemble import ExtraTreesRegressor
from sklearn import preprocessing
from servicePreprocess.preprocessService import WpPreprocessService
from serviceCommon import commonService

import json

import cv2 as cv2
from scipy.cluster.vq import *

import joblib

from serviceModel import modelService 
from itertools import product
import re
from sklearn.inspection import permutation_importance

'''
파라메터 정보
p_df = 데이터
p_fileInfo = csv 파일 위치
p_targetCol = 타겟 컬럼명
p_varInfo = 사용자가 지정한 컬럼 정보
'''
def getFeatureInfoData(p_df, p_fileInfo, p_targetCol, p_varInfo):
    s_fileInfo = json.loads(p_fileInfo)
    
    # 사용 안하는 컬럼 리스트.
    s_noUseColList = []
    
    # 텍스트컬럼이 있는지 여부
    s_textAnalFlag = False

    # 텍스트컬럼 리스트
    s_textColList = []

    # 날짜컬럼 리스트
    s_dateColList = []

    # 타겟컬럼이 카테고리칼일 경우 원핫인코딩하고 원래값하고 매칭
    s_labelCodeMap = pd.DataFrame(columns=['label', 'labelVal'])

    # 임시 텍스트 컬럼명(10자리 길어질 경우 대체용)
    s_tmpTextCol = ""

    # 입력된 데이터의 컬럼정보를 가져와서 문자면 one-hot encoding 하고 텍스트면 vector 값 추출
    # #161
    if type(p_varInfo) == str:
        p_varInfo = json.loads(p_varInfo)

    for col in p_df.columns:
        for var in p_varInfo:
            if var['NAME'] == col:
                # 사용안하는 컬럼(데이터 탐색에서 해제)
                if var['USE'] == False:
                    s_noUseColList.append(col)
                # 그외
                else:
                    # 이미지
                    if var['TYPE'] == 'image':
                        s_featureDet = cv2.KAZE_create() # 특징점 검출 객체
                        s_desList = []
                        s_imagePathList = []
                        s_classModel, s_classNameList, s_stdScaler, s_k, s_voc = joblib.load("bof.pkl")
                        for imagePath in p_df[col]:
                            s_imagePathList.append(imagePath)
                            s_img = cv2.imread(imagePath)
                            s_gray = cv2.cvtColor(s_img, cv2.COLOR_BGR2GRAY)
                            (s_kpts, s_desc) = s_featureDet.detectAndCompute(s_gray, None) #키포인트, 서술자
                            s_desList.append((imagePath, s_desc))
                        # Stack all the descriptors vertically in a numpy array

                        s_descriptors = s_desList[0][1]
                        for imagePath, descriptor in s_desList[0:]:
                            s_descriptors = np.vstack((s_descriptors, descriptor))

                        #
                        s_testFeatures = np.zeros((len(s_imagePathList), s_k), "float32")
                        for i in range(len(s_imagePathList)):
                            s_words, s_distance = vq(s_desList[i][1], s_voc)
                            for w in s_words:
                                s_testFeatures[i][w] += 1

                        # Perform Tf-Idf vectorization
                        s_nbrOccurences = np.sum((s_testFeatures > 0) * 1, axis=0)
                        s_idf = np.array(
                            np.log((1.0*len(s_imagePathList)+1) / (1.0*s_nbrOccurences + 1)), 'float32')

                        # Scale the features
                        s_testFeatures = s_stdScaler.transform(s_testFeatures)

                        # Perform the predictions
                        s_predict = [s_classNameList[i] for i in s_classModel.predict(s_testFeatures)]

                        p_df[col] = s_predict

                        p_df = pd.get_dummies(data=p_df,
                                              columns=[col],
                                              prefix=[col], prefix_sep='_')
                    
                    # 날짜
                    elif var['TYPE'] == 'date':
                            s_dateColList.append(col)
                    # 카테고리형
                    elif var['TYPE'] == 'categorical':
                        if col == p_targetCol:
                            s_le = preprocessing.LabelEncoder()
                            p_df[col] = s_le.fit_transform(p_df[col].astype(str))
                            
                            for idx in s_le.transform(s_le.classes_):
                                s_labelCodeMap.loc[idx] = [
                                    idx, "".join(s_le.inverse_transform([idx]))]

                        else:
                            p_df = pd.get_dummies(data=p_df,
                                                  columns=[col],
                                                  # #170. prefix를 특수문자 언더바로 함.
                                                  # WP-39 1-4 회귀 분석시 dtype np.int64지정
                                                  prefix=[col], prefix_sep='＿', dtype=np.int64)
                            # 컬럼명 특수문자 제거
                            p_df_col = p_df.columns
                            p_df_col = [re.sub('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·ï»¿]', "", col) for col in p_df_col]
                            p_df.columns = [col.replace(" ", "_") for col in p_df_col]
    
    return {
        'noUseColList': s_noUseColList, 'textColList': s_textColList, 'textAnalFlag':s_textAnalFlag, 'dateColList': s_dateColList, 'labelCodeMap': s_labelCodeMap, 'df':p_df
    }

'''
파라메터 정보
p_df = 변수중요도 계산할 df
p_fileInfo = fileinfo
p_targetCol = 목표변수명
p_varInfo = 변수 정보(statistics에서 넘어온 정보)
p_scaler = 스케일링(클러스터링에서 사용)
'''
def getFeatureImportance(p_df, p_fileInfo, p_targetCol, p_varInfo, p_scaler):

    s_fileInfo = json.loads(p_fileInfo)

    # 결측값 대체 (데이터탐색에서 넘어갈때 결측값처리를 안한 결측값들은 0으로 전부 대체함)
    # NULL값 처리 (타입이 카테고리일 경우 에러남.)
    for col_name, col_dtype in p_df.dtypes.items():
        if str(col_dtype) == 'category':
            try:
                p_df[col_name] = p_df[col_name].cat.add_categories([0])
            except:
                pass
    p_df.fillna(0, inplace=True)

    s_featureDataSummury = []
    
    # 입력된 데이터의 컬럼정보를 가져와서 문자면 one-hot encoding 하고 텍스트면 vector 값 추출
    # #161
    if type(p_varInfo) == str:
        p_varInfo = json.loads(p_varInfo)

    s_featureInfo = getFeatureInfoData(p_df, p_fileInfo, p_targetCol, p_varInfo)
    # 사용 안하는 컬럼 리스트.
    s_noUseColList = s_featureInfo['noUseColList']

    # 텍스트컬럼이 있는지 여부
    s_textAnalFlag = s_featureInfo['textAnalFlag']

    # 텍스트컬럼 리스트
    s_textColList = s_featureInfo['textColList']

    # 날짜컬럼 리스트
    s_dateColList = s_featureInfo['dateColList']

    # 타겟컬럼이 카테고리칼일 경우 원핫인코딩하고 원래값하고 매칭
    s_labelCodeMap = s_featureInfo['labelCodeMap']

    p_df = s_featureInfo['df']

    # 사용 안하는 컬럼 제거
    p_df.drop(s_noUseColList, axis=1, inplace=True)

    

    if p_targetCol != '':

        s_y = p_df[p_targetCol]
        s_dateDf = p_df[s_dateColList]
        # 타겟이 있을 경우 s_x에 타겟컬럼 제거
        if p_targetCol != '':
            p_df.drop(p_targetCol, axis=1, inplace=True)

        # 날짜 데이터 제거
        # 텍스트 컬럼 제거
        p_df.drop(s_textColList, axis=1, inplace=True)
        p_df.drop(s_dateColList, axis=1, inplace=True)

        s_preProcess = WpPreprocessService(s_fileInfo['USER_NO'],'')
        
        s_x_scale, s_scaler = modelService.getScaleData(p_df, p_scaler)        
        
        s_xValueList = s_x_scale.keys()

        s_clf = ExtraTreesRegressor(n_estimators=10, max_depth=5, random_state=0)

        s_clf = s_clf.fit(s_x_scale, s_y)

        s_importances = s_clf.feature_importances_
        s_indices = np.argsort(s_importances)[::-1]
       
        # s_x_scale.merge(s_y, left_index=True, right_index=True)
        s_x_scale[p_targetCol] = s_y
        del s_y

        # s_transdf = s_transdf_date.merge(s_dateDf, left_index=True, right_index=True)
        
        for col in s_x_scale.columns:
            # 특징 선택에서 변수별 돋보기 눌렀을 때 나오는 그래프 데이터
            s_colData = s_preProcess.getHistogramData(s_x_scale, col)            
            s_featureDataSummury.append({"name":col, "data":json.dumps(s_colData, cls=commonService.JsonEncoder)})
            # s_featureDataSummury.append({"name":col, "data":"[]"})
       
        s_outputDict = dict(zip(list(s_xValueList[s_indices]), np.reshape(s_importances[s_indices], [1, -1])[0]),
                           analDataPath=s_fileInfo['fileName'], labelData=s_labelCodeMap.to_json(orient='columns'),
                           featureDataSummury=s_featureDataSummury, chkTextAnalytic=s_textAnalFlag)
        s_output = json.dumps(s_outputDict, ensure_ascii=False)

    elif p_targetCol == '':
        s_x_scale, s_scaler = modelService.getScaleData(p_df, p_scaler)
        s_output = s_x_scale
        s_x_scale = p_df
    
    return s_output, s_x_scale, s_scaler

"""
모델 실행 후 실제 변수 중요도 계산
p_x_test: 테스트데이터의 설명변수데이터
p_model: 실행한 모델
p_modelname: 모델 이름
"""
def getFeatureCoef(p_x_columns, p_x_test, p_y_test, p_model, p_modelname):

    s_featureLog = {}
    if p_modelname == 'Ensemble':
        result = permutation_importance(p_model, p_x_test, p_y_test, n_repeats=10, random_state=42)
        s_featureLog = {columns: round(importance, 3) for columns, importance in zip(p_x_columns, result.importances_mean)}
    elif(p_modelname == 'lightgradientboosting'):
        total = sum(p_model.feature_importances_)
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):
            s_featureLog.__setitem__(feat, round(float(imp)/total, 3))
    # svm 은 PermutationImportance model을 p_model로 넘긴다.
    elif p_modelname == "svm":
        for feat, imp in zip(p_x_columns, p_model.feature_importances_):            
           s_featureLog.__setitem__(feat,round(np.abs(imp),3))
    else:
        # coef_ 있는 것 일때
        if hasattr(p_model,'coef_'):
            try:
                for feat, imp in zip(p_x_columns, np.abs(p_model.coef_)):
                    s_featureLog.__setitem__(feat, round(imp, 3))
            except Exception as e: 
                # Logtistic 때문에 추가
                if type(e) == TypeError:
                    for feat, imp in zip(p_x_columns, p_model.coef_):
                        s_featureLog.__setitem__(feat, np.mean(imp))
                else:
                    for feat, imp in zip(p_x_columns, np.abs(p_model.coef_[0])):
                        s_featureLog.__setitem__(feat, round(imp, 3))
        # feature_importances_ 있는 것 일때
        elif hasattr(p_model,'feature_importances_'):
            if hasattr(p_model, 'booster'):
                for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                    s_featureLog.__setitem__(feat, round(float(imp), 3))
            else :
                try :
                    for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                            s_featureLog.__setitem__(feat, round(float(imp)/total, 3))
                except Exception as e:
                    if type(e) == TypeError:
                        for feat, imp in zip(p_x_columns, p_model.feature_importances_):
                            s_featureLog.__setitem__(feat, round(imp, 3))
                    else :
                        for feat, imp in zip(p_x_columns, p_model.feature_importances_):            
                            s_featureLog.__setitem__(feat,round(np.abs(imp),3)) 
        else :
            s_featureLog = []

    return s_featureLog
