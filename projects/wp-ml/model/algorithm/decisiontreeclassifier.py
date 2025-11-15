import os
import logging
import logging.config

from sklearn.tree import DecisionTreeClassifier
from config.wp import getConfig
from model.dataloader import WiseDataSet
os.environ["PATH"] += os.pathsep + 'C:/Program Files (x86)/Graphviz2.38/bin/'

from model.algorithm import WiseClassArgorithm
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_MSTR_ATT, ARG_OPTIMIZER_ATT, ARG_PARTITION_ATT, ARG_PARAMETER_ATT
from typing import Optional, List, Any, Dict,Union
#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

o_logger = logging.getLogger('decision-run')

o_mlflow = getConfig('','MLFLOW')


class decisiontreeclassifier(WiseClassArgorithm) :
    def __init__(self, p_parameter, p_optimizer, p_argInfo):
        super().__init__(p_parameter, p_optimizer, p_argInfo) 
        self.o_argorithm = DecisionTreeClassifier
        
    def onLearning(self,p_dataSet:WiseDataSet):        
        return super().onLearning(p_dataSet)
    
    def onPredicting(self, p_dataSet:WiseDataSet, p_partition):
        return super().onPredicting(p_dataSet, p_partition)
