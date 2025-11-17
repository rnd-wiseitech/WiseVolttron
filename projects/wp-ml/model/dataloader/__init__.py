from abc import ABC
from typing import List
from dateutil.parser import parse

import pandas as pd
from sklearn.calibration import LabelEncoder
from sklearn.model_selection import train_test_split
from model.algorithm.att.WP_VAR_ATT import DP_VAR_MSTR_ATT, PARTITION_ATT
# Abstract base class for all algorithms


class WiseDataSet(ABC):

    def __init__(self, p_data,p_varInfo: List[DP_VAR_MSTR_ATT],p_smote:bool=False):
        self.o_data = p_data
        self.o_varInfo: List[DP_VAR_MSTR_ATT] = p_varInfo

        self.o_partitionInfo = None
        self.o_smote = p_smote
        self.o_labelEncoder = LabelEncoder()

        self.x_train = None
        self.x_test = None
        self.y_train = None
        self.y_test = None
        self.x_data = None
        self.y_data = None
        self.y_predict = None
        #self.setFeature()

    def getTargetColumnNm(self):
        s_target = ''

        for s_var in self.o_varInfo:
            if s_var.VAR_TARGET_YN :
                s_target = s_var.COL_NM
        
        return s_target
    
    def setFeature(self):
        try:
            s_targetColType = ''
            s_modelFeature = []
            s_targetColNm = ''

            # s_modelFeature : Array 형태로 된 선택된 feauture (타겟변수까지 포함)
            if self.o_varInfo is None: 
                s_modelFeature = self.o_data.columns
            else :
                for s_feature in self.o_varInfo:
                    if s_feature.VAR_MAJOR_YN == True:
                        s_modelFeature.append(s_feature.COL_NM)
                    if s_feature.VAR_TARGET_YN == True:
                        s_targetColNm = s_feature.COL_NM
                        if s_feature.DATA_TYPE == 'categorical':
                            self.o_labelEncoder.fit(self.o_data[s_feature.COL_NM])


            if s_targetColNm != '':
                if s_targetColNm not in s_modelFeature: 
                    s_modelFeature.append(s_targetColNm)
            
            p_unFeature = list(set(self.o_data.columns) - set(s_modelFeature))

            self.x_data = self.o_data.drop(columns=p_unFeature)
            self.y_data = self.o_data[s_targetColNm]

        except Exception as p_error:
            print("p_error : ", p_error)

        
        return True
    def getDataColumns(self):
        return self.o_data.columns
    
    def onSplitTrainTest(self,p_target,p_partitionInfo:PARTITION_ATT):
        
        self.o_partitionInfo = p_partitionInfo
        self.x_train = None 
        self.x_test = None 
        self.y_train = None 
        self.y_test = None 
        
        if self.o_partitionInfo.option.value != '' :
            if self.o_partitionInfo.type == 't-holdout':
                s_holdout, s_foldCnt = self.o_partitionInfo.option.value, 0

            elif self.o_partitionInfo.type == 't-cv' or self.o_partitionInfo.type == 't-loocv':
                s_holdout, s_foldCnt = 0, self.o_partitionInfo.option.value

            s_targetColValue = list(self.o_data[p_target])

            # k-fold 일때는 전체 데이터를 사용하므로 전체데이터를 그대로 사용.
            if s_holdout == 0:
                self.x_train, self.x_test, self.y_train, self.y_test = self.o_data, self.o_data, s_targetColValue, s_targetColValue
            # 평가 데이터 분할 비율 로 분할
            else :
                s_splitSize = float(int(s_holdout)/100)
                self.x_train, self.x_test, self.y_train, self.y_test = train_test_split(self.o_data.drop(columns=p_target), s_targetColValue, test_size=s_splitSize, random_state=123456)
            
            return True
        else :
            return False
    
    def onSplitTime(self,p_target):
        
        self.x_train, self.x_test, self.y_train, self.y_test = None 

        if self.o_partitionInfo.option.time.range == '':
            indexDate = str(parse(self.o_partitionInfo.option.time.end).date())
        else :
            indexDate = str(parse(self.o_partitionInfo.option.time.range).date())

        for s_var in self.o_varInfo:
            if s_var['TYPE'] == 'date' and s_var['NAME'] == self.o_partitionInfo.option.time.colName :
                # 만약 이미 index 로 설정되지 않았으면 index 설정
                if s_var['NAME'] not in self.o_data.index.names:
                    self.o_data[s_var['NAME']] = pd.to_datetime(self.o_data[s_var['NAME']])
                    self.o_data = self.o_data.set_index(s_var['NAME'])              

        s_trainDf = self.o_data[:indexDate]
        s_testDf = self.o_data[indexDate:]
        
        p_unFeature = list(set(self.o_data.columns) - set(p_target))
        # scale 처리 적용
        self.x_train, self.y_train = s_trainDf[p_unFeature], s_trainDf[p_target]        
        self.x_test, self.y_test = s_testDf[p_unFeature], s_testDf[p_target]

        return True