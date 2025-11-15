from model.dataloader2 import WiseImageSet

from model.algorithm import WiseYoloArgorithm

from ultralytics import YOLO, settings

settings.update({"mlflow": False})
class yolo(WiseYoloArgorithm) :
    def __init__(self, p_parameter, p_argInfo):
        super().__init__(p_parameter, p_argInfo) 
        self.o_argorithm = YOLO
        
    def onLearning(self,p_dataSet: WiseImageSet):        
        return super().onLearning(p_dataSet)
    
    def onEvaluating(self):
        return super().onEvaluating()
    
    def onSaving(self, p_saveModelInfo):
        return super().onSaving(p_saveModelInfo)