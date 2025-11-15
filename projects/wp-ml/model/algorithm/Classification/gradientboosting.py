import os
import logging
import logging.config

from sklearn.ensemble import GradientBoostingClassifier
from config.wp import getConfig
from model.dataloader import WiseDataSet

from model.algorithm import WiseClassArgorithm
#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('gradientboosting-run')

o_mlflow = getConfig('','MLFLOW')


class gradientboosting(WiseClassArgorithm) :
    def __init__(self, p_parameter, p_optimizer, p_argInfo):
        super().__init__(p_parameter, p_optimizer, p_argInfo) 
        self.o_argorithm = GradientBoostingClassifier

    def onLearning(self,p_dataSet:WiseDataSet):        
        return super().onLearning(p_dataSet)
    
    def onPredicting(self, p_dataSet:WiseDataSet, p_partition):
        return super().onPredicting(p_dataSet, p_partition)
    
    def onEvaluating(self, p_dataSet:WiseDataSet, p_class, p_modelname, p_targetCol):
        return super().onEvaluating(p_dataSet, p_class, p_modelname, p_targetCol)
    
    def onSaving(self, p_x_data, p_saveModelInfo, p_wpStorage):
        return super().onSaving(p_x_data, p_saveModelInfo, p_wpStorage)
    