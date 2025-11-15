import os
import logging
import logging.config
from typing import List

from sklearn.cluster import KMeans


from config.wp import getConfig
from model.dataloader import WiseDataSet
from serviceUtil import algorithmService
from serviceMlflow import mlflowService
from serviceModel import clusterService
from sklearn.metrics import silhouette_score

from model.algorithm import WISE_BASE_ALGORITHM, WiseClassArgorithm, WiseRegArgorithm
from model.algorithm.att.WP_ALGORITHM_ATT import ALGORITHM_ATT,ALGORITHM_EVAL_ATT,CLASS_RESULT_ATT,REG_RESULT_ATT
from model.algorithm.att.WP_VAR_ATT import DP_VAR_MSTR_ATT

#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('decision-run')

o_mlflow = getConfig('','MLFLOW')


class k_means(WISE_BASE_ALGORITHM) :
    def __init__(self, algorithmInfo: ALGORITHM_ATT,varInfo:List[DP_VAR_MSTR_ATT]):
        super().__init__(algorithmInfo,varInfo)
        self.o_argorithm = KMeans

    def onLearning(self,p_dataSet:WiseDataSet,p_optiFlag:bool=False):
        try:
            # 최적화
            self.algorithmInfo.optimizer.use
            if self.algorithmInfo.optimizer.use:
                self.model = algorithmService.getOptModel2(self.algorithmInfo.parameter, self.o_argorithm(), None, self.algorithmInfo.optimizer.type)
                self.model.fit(p_dataSet.o_data)

                for s_param in self.model.best_params_:
                    self.model.best_params_[s_param] = str(self.model.best_params_[s_param])
                self.optParams = self.model.best_params_
                self.model = self.model.best_estimator_

            # 최적화를 제외한 학습
            else:
                s_argParam = algorithmService.getArgParam2(self.algorithmInfo.parameter)

                self.model = self.o_argorithm(**s_argParam)

                self.model.fit(p_dataSet.o_data)

            return True
        except Exception as ex:
            raise ex

    def onPredicting(self,p_predictionData):
        self.o_yPredict = self.model.predict(p_predictionData.o_data)
        return self.o_yPredict
    
    def onSplitData(self):
        print('a')

    def onEvalIndicators(self,p_dataSet:WiseDataSet) :
        self.algorithmInfo.evalIndicator = ALGORITHM_EVAL_ATT()

        s_silhScore = silhouette_score(p_dataSet.o_data, self.o_yPredict, metric='euclidean',sample_size=1000)
            
        # 클러스터 중심
        s_cluster_centers = self.model.cluster_centers_         

        
        # 시각화 데이터
        s_df_visual, s_featureLog = clusterService.getVisualizeData(p_dataSet.o_data, s_cluster_centers)
        s_df_svd, s_df_svd_center = clusterService.get2dData(s_df_visual, p_dataSet.o_data.index[-1])
        s_cluster_center = s_df_svd_center.apply(lambda x: round(x, 2)).to_dict()
        s_svdOutput = clusterService.getSvdOutput(s_df_svd, self.model.labels_)

        self.algorithmInfo.evalIndicator.reVal = s_svdOutput
        self.algorithmInfo.evalIndicator.silhouette_coef = s_silhScore
        self.algorithmInfo.evalIndicator.cluster_center = s_cluster_center
        self.algorithmInfo.evalIndicator.featureLog = s_featureLog

        return self.algorithmInfo.evalIndicator
        
    def onExplan(self):
        print('b')