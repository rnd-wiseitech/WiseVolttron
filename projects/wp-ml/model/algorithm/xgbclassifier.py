import logging
import logging.config
from xgboost import XGBClassifier

from config.wp import getConfig
from model.dataloader import WiseDataSet

from model.algorithm import WiseClassArgorithm

#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('decision-run')

o_mlflow = getConfig('','MLFLOW')


class reg_decisiontree(WiseClassArgorithm) :
    def __init__(self, algorithmInfo,varInfo):
        super().__init__(algorithmInfo,varInfo) 
        self.o_argorithm = XGBClassifier
    def onLearning(self,p_dataSet:WiseDataSet,p_optiFlag:bool=False):        
        return super().onLearning(p_dataSet,p_optiFlag)
        
    def onPredicting(self, p_predictionData):
        return super().onPredicting(p_predictionData.o_x_test)
    