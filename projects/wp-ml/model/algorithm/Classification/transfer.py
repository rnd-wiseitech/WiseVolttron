import os
import logging
import logging.config


from config.wp import getConfig
from model.dataloader import WiseDataSet

from model.algorithm import WiseTransferArgorithm
#with open('./log/logging.json', 'rt') as f:
#    config = json.load(f)
#logging.config.dictConfig(config)

# o_logger = logging.getLogger('randomforest-run')

# o_mlflow = getConfig('','MLFLOW')


class transfer(WiseTransferArgorithm) :
    def __init__(self, p_parameter, p_argInfo, p_learnModelInfo):
        super().__init__(p_parameter, p_argInfo, p_learnModelInfo) 
        self.o_argorithm = None
        
    def onLoading(self,p_userno):        
        return super().onLoading(p_userno)
    
    def onTransfering(self, p_code):
        return super().onTransfering(p_code)
    
    def onTraining(self,p_dataSet:WiseDataSet):        
        return super().onTraining(p_dataSet)
    
    def onPredicting(self, p_dataSet:WiseDataSet, p_partition):
        return super().onPredicting(p_dataSet, p_partition)
    
    def onSaving(self, p_x_data, p_saveModelInfo, p_wpStorage):
        return super().onSaving(p_x_data, p_saveModelInfo, p_wpStorage)
