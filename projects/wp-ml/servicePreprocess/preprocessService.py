
import numpy as np
import pandas as pd
import datetime
import os
import logging

from serviceData import dataSourceService
from serviceStorage import common
from job.executor2 import PipelineStep
from config.wp import JOB_LOCATION_ATT

logging.basicConfig(level=logging.ERROR)

'''
p_df: statistics 계산 대상 dataframe
'''
class WpPreprocessService():
    o_userNo = 0
    o_pUuid = ''
    def __init__(self,p_userNo,p_pUuid):
        self.p_id = os.getpid()
        self.o_userNo = p_userNo
        self.o_pUuid = p_pUuid

    def getDataPreProcess(self,p_df,p_location:JOB_LOCATION_ATT,p_dataSource:dataSourceService.dataSource = None):
        try :
            s_df = None
            s_apieType = p_dataSource.o_apiType
            if s_apieType == 'SPARK' :
                s_df = p_dataSource.o_storageManager.o_wpStorage.o_spark.createDataFrame(p_df)
            else:
                s_df = p_df
        except TypeError as ex:
            s_df = p_df

        try :
            s_params = {
                'action': 'statistics',
                'method': '', 
                'userno': 1000, 
                'userId': 'administrator',
                'usermode': 'ADMIN',  
                'groupId': '1000_wiseprophet', 
                'jobId': '1', 
                'location': p_location, 
                'data': {'usetable': '1000_wiseprophet'}, 
                'batch': False, 
                'df':s_df
            }
            o_jobExcuter = PipelineStep(s_apieType, 'statistics', p_dataSource,None,**s_params)
            # job 실행
            s_json = o_jobExcuter.run()
            
            s_dfStat = {}

            for s_colInfo in s_json['schema']:
                s_dfStat[s_colInfo['column']] = {
                    "mean":s_colInfo['mean'],
                    "std":s_colInfo['stddev'],
                    "min":s_colInfo['min'],
                    "1Q":s_colInfo['q1'],
                    "3Q":s_colInfo['q3'],
                    "max":s_colInfo['max'],
                    "10PER":s_colInfo['10PER'],
                    "90PER":s_colInfo['90PER'],
                    "total_count":s_colInfo['total_count'],
                    "na_count":s_colInfo['null_count'],
                    "distinct_count":s_colInfo['distinct_count'],
                    "chart_img":"",
                    "val_type":s_colInfo['datatype'],
                    "colDataSummury":s_colInfo['distribution'],
                    "colBoxData":s_colInfo['outliers'],
                    "duplicate_count":s_colInfo['duplicate_count']
            }

            return s_dfStat, p_df
            
        except Exception as ex:
            print("val : ",ex)
    

    '''
    p_df: 히스토그램 데이터를 얻을 dataframe
    p_col: 히스토그램 데이터를 얻을 컬럼
    '''
    def getHistogramData(self,p_df, p_col):
        s_df = p_df[p_col].copy()

        if s_df.isnull().values.any():
            s_df.fillna(0, inplace=True)

        s_DistinctCount = s_df.value_counts().count()
        if s_DistinctCount < 10:
            s_hist, s_binEdges = np.histogram(s_df, bins=s_DistinctCount, range=(s_df.min(), s_df.max()))
        else:
            s_hist, s_binEdges = np.histogram(s_df)

        if s_df.dtype != s_binEdges.dtype:
            s_binEdges = s_binEdges.astype(s_df.dtype)

        s_valRange = []
        for s_binIdx, s_binVal in enumerate(s_binEdges):
            if (s_binIdx+1 != s_binEdges.size):
                s_valRange.append(
                    str(round(s_binEdges[s_binIdx], 6)) + ' ~ ' + str(round(s_binEdges[s_binIdx+1], 6)))

        s_colData = {}
        for s_lab, s_histVal in zip(s_valRange, s_hist):
            s_colData.__setitem__(s_lab, s_histVal)
        return s_colData

    '''
    p_df: 상자그림 데이터를 얻을 dataframe
    p_col: 상자그림 대상 컬럼
    '''
    def getBoxplotData(self,p_df, p_col):
        try :
            _, s_boxPlot = p_df.boxplot(column=[p_col], return_type='both')
            
        except Exception as ex:
            print("bp : ", s_boxPlot)
            print("val : ",ex)
            print("val : ", p_col + "에러")

        s_boxes = [s_box.get_ydata() for s_box in s_boxPlot["boxes"]]
        s_medians = [s_median.get_ydata() for s_median in s_boxPlot["medians"]]
        s_whiskers = [s_whiskers.get_ydata() for s_whiskers in s_boxPlot["whiskers"]]

        s_colBoxDataTmp = np.concatenate((s_boxes, s_medians, s_whiskers), axis=None)
        s_colBoxDataTmp = np.unique(s_colBoxDataTmp)

        return s_colBoxDataTmp, s_boxPlot


    '''
    p_val: 날짜 타입 체크 대상 변수(pd.Series)
    '''
    def isDateType(self,p_val):
        s_val = p_val
        s_checkDate = False
        try:
            
            # 먼저 null값 제거
            s_val = s_val.astype(str)
            # 타입체크 1 'yyyy-mm-dd hh:mm:ss
            try:
                s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d %H:%M:%S')
                s_checkDate = True
            except Exception as e:
                s_checkDate = False
            
            # 타입체크 2 'yyyy-mm-dd'
            if s_checkDate == False:
                try:
                    s_check = datetime.datetime.strptime(s_val[0], '%Y-%m-%d')
                    s_val = s_val + ' 00:00:00'
                    s_checkDate = True
                except Exception as e:
                    s_checkDate = False

            # 'yyyy-mm-dd hh:mm:ss'도 아니고 'yyyy-mm-dd'도 아닐 경우
            if s_checkDate == False:
                try:
                    # 먼저 datetime으로 변환
                    s_val = pd.to_datetime(s_val)
                    # format 변환
                    s_val = s_val.dt.strftime('%Y-%m-%d %H:%M:%S')
                    s_checkDate = True
                except Exception as e:
                    # WP-99: 문자열처리된 null값들을 다시 null로 원복(돋보기에서 제거될수 있도록) 
                    s_val = s_val.replace(["nan", "None", "NaT"], np.nan)
                    s_checkDate = False
                    
            # null 값을 문자열 표기 하기 위해서 다시 str 처리(strftime하면 'nan'이 nan 으로 변환됨)
            if s_checkDate == True:
                s_val = s_val.astype(str)

        except Exception as e:
            s_checkDate = ''
        
        return s_checkDate, s_val
    def changeTypeData(self, p_df, p_changeCol, p_changeColType, p_batchFlag=False):
        if p_changeColType == 'categorical':
            p_changeColType = 'string'
        elif p_changeColType == 'numerical':
            p_changeColType = 'float'
        s_params = {
                'action': 'transform',
                'method': 'type', 
                'userno': 1000, 
                'userId': 'administrator',
                'usermode': 'ADMIN',  
                'groupId': '1000_wiseprophet', 
                'jobId': '1', 
                'location': JOB_LOCATION_ATT.DATAMANAGER, 
                'data': {'dataArray': [{"column" : p_changeCol, "type": p_changeColType}]}, 
                'batch': False, 
                'df':p_df
            }
        print('s_params : ', s_params)
        from job.common import type

        p_df = type.execute(s_params, **s_params)
        
        s_dfStat, s_colDf = self.getDataPreProcess(p_df[[p_changeCol]])

        return s_dfStat, p_df
   
    '''
    # 돋보기 전처리 (데이터탐색)
    p_df: 변환 대상 데이터
    p_changeCol: 변환 대상 컬럼(str)
    p_changeColType: 변환 컬럼 타입(str)
    p_changeInfo: 변환 정보 (dict) (dictkey: duplication, missing, outlier, delete, use, outlierInfo)
    '''
    def getCleanData(self,p_df, p_changeCol, p_changeColType, p_changeInfo):
        # 이상치 정제 먼저해야 에러안남
        s_df = p_df
        if p_changeInfo['outlier']['use']:
            s_outlierIndex = p_changeInfo['outlier']['outlierInfo']
            if p_changeInfo['outlier']['delete']:
                s_df = s_df.drop(index = s_outlierIndex)
                s_df.reset_index(drop=True, inplace=True)
            else:
                s_df.loc[s_outlierIndex, p_changeCol] = float(p_changeInfo['outlier']['value'])

        for s_key, s_value in p_changeInfo.items():
            if s_value['use'] == True and s_value['delete'] == True:
                if s_key == 'duplication':
                    s_df = s_df.drop_duplicates([p_changeCol], keep="last")
                elif s_key == 'missing':
                    s_df = s_df.dropna(subset=[p_changeCol])
                s_df.reset_index(drop=True, inplace=True)

            elif s_value['use'] == True and s_value['delete'] == False:
                if s_key == 'missing':
                    if s_df[p_changeCol].dtypes == 'int64':
                        s_df = s_df.fillna({p_changeCol: int(s_value['value'])})
                    elif s_df[p_changeCol].dtypes == 'float64':
                        s_df = s_df.fillna({p_changeCol: float(s_value['value'])})
                    elif p_changeColType == 'categorical':
                        # 2020.03.11 추가.
                        # null 있는 numerical을 categorical로 바꾼 후(Int64타입 변환됨)
                        # null 값을 제거할 때 타입이 Int64면 int값이 들어가도록 함.
                        if s_df[p_changeCol].dtype == 'Int64':
                            s_df = s_df.fillna({p_changeCol: int(s_value['value'])})
                        else:
                            s_df = s_df.fillna({p_changeCol: s_value['value']})
        return s_df
        
    '''
    # 컬럼타입변경 또는 돋보기전처리(데이터탐색)
    p_df: 변환 대상 데이터
    p_chgType: 변환 유형(str) (CleanData, Scale, ChgType) ---> Scale은 안쓸듯
    p_changeCol: 변환 대상 컬럼(str)
    p_changeColType: 변환 컬럼 타입(str)
    p_changeInfo: 변환 정보 (dict) (dictkey: duplication, missing, outlier, delete, use, outlierInfo)
    p_batchFlag: 모델운영 변경데이터 로직일 경우 True
    '''
    def editData(self,p_df, p_chgType, p_changeCol, p_changeColType, p_changeInfo, p_batchFlag=False):
        if p_chgType == 'ChgType':
            s_output, s_df = self.changeTypeData(p_df, p_changeCol, p_changeInfo, p_batchFlag)
            return s_output, s_df
        else:
            s_df = self.getCleanData(p_df, p_changeCol, p_changeColType, p_changeInfo)
            return None, s_df

    '''
    # sample data, 컬럼명 구하기
    p_df: 데이터프레임
    '''
    def getSampleData(self,p_df):
        # p_df = p_df.toPandas()
        s_sampleDf = p_df[0:9].to_json(orient='index')
        s_sampleHeader = p_df.columns.tolist()     
        return s_sampleDf, s_sampleHeader



    '''
    모델 수정 / 모델 관리 / 모델 배치에서
    모델학습 때 실행한 전처리 정보로
    신규 데이터에 적용
    p_df: 전처리할 데이터
    p_editInfo: 전처리 정보
    '''
    def loadEditData(self,p_df, p_editInfo):
        # 타입변경일 경우에 담길 array
        # 불러온 정재정보에 따라서 데이터 전처리
        s_changeTypeCol = []
        for i in p_editInfo:
            # 돋보기 처리에서 outlier를 사용할경우 outlier 인덱스값 얻어서 넣기
            if i['Type'] == 'CleanData' and (i['Value']['outlier']['use']):                
                _, s_bp = p_df.boxplot(column=[i['Column']], return_type='both')
                s_outliers = [s_flier.get_ydata() for s_flier in s_bp["fliers"]]
                s_outliers = np.unique(s_outliers)
                s_outliersIndex = p_df[(p_df[i['Column']]).isin(s_outliers)].index.values
                i['Value']['outlier']['outlierInfo'] = s_outliersIndex
            # 전처리 시작
            s_edit, p_df = self.editData(p_df, i['Type'], i['Column'], i['ColumnType'], i['Value'])
            
            # 컬럼타입 변경은 해당 컬럼에 대해 통계량이 있기 때문에 s_edit정보가 있음
            if s_edit != None:
                        s_edit['NAME'] = i['Column']
                        s_changeTypeCol.append(s_edit)

        return p_df, s_changeTypeCol
    # WPLAT-187 사용자 전처리 기능 모델 관리, 운영에 추가
    '''
    모델 관리 / 모델 배치에서
    모델 학습 때 사용했던 사용자 정의 전처리 코드를 신규 데이터에 적용
    p_df: 전처리할 데이터
    p_userPreprocessing: 전처리 정보
    '''
    def loadUserPreprocessing(self,p_df, p_userNo, p_userPreprocessing):
        s_df = p_df
        if (p_userPreprocessing) :
            Vars = locals()
            Vars['df'] = p_df

            s_wiseStorage = common.WiseStorageManager(p_userNo)
            s_path = '/' + str(p_userNo) + '/userPreprocessing/' + p_userPreprocessing
            s_userPreprocessingCode = s_wiseStorage.readFile(s_path)
            codeLine = s_userPreprocessingCode.split('\\n')

            for line in codeLine:
                exec(line, globals(), Vars)  
            
            s_df = Vars['df']
        return s_df