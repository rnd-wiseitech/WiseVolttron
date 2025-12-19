from model.dataloader2 import WiseImageSet

from model.algorithm import WiseYoloArgorithm

from ultralytics import YOLO, settings

settings.update({"mlflow": False})
class yolo(WiseYoloArgorithm) :
    def __init__(self, p_parameter, p_argInfo):
        super().__init__(p_parameter, p_argInfo) 
        self.o_argorithm = YOLO
        
    def onLearning(self,p_dataSet: WiseImageSet, p_userno):        
        return super().onLearning(p_dataSet, p_userno)
    
    def onEvaluating(self, p_dataSet: WiseImageSet):
        return super().onEvaluating(p_dataSet)
    
    def onSaving(self, p_saveModelInfo, p_wpStorage):
        return super().onSaving(p_saveModelInfo, p_wpStorage)