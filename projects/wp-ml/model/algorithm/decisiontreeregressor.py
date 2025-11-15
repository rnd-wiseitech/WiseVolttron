import os
import logging
import logging.config

from sklearn.tree import DecisionTreeRegressor

from config.wp import getConfig
from model.dataloader import WiseDataSet
os.environ["PATH"] += os.pathsep + 'C:/Program Files (x86)/Graphviz2.38/bin/'

from model.algorithm import WiseRegArgorithm

#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('decision-run')

o_mlflow = getConfig('','MLFLOW')


    
class decisiontreeregressor(WiseRegArgorithm) :
    def __init__(self, algorithmInfo,varInfo):
        super().__init__(algorithmInfo,varInfo) 
        self.o_argorithm = DecisionTreeRegressor

    def onLearning(self,p_dataSet:WiseDataSet,p_optiFlag:bool=False):        
        return super().onLearning(p_dataSet,p_optiFlag)
        
    def onPredicting(self, p_predictionData):
        return super().onPredicting(p_predictionData.o_x_test)