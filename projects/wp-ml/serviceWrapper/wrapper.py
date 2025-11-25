import mlflow.pyfunc
from ultralytics import YOLO

class YOLOv8Wrapper(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        from ultralytics import YOLO
        self.model = YOLO(context.artifacts["model_path"])

    def predict(self, context, model_input):
        """
        model_input은 dict로 넘긴다:
        {
            "source": <이미지 경로>,
            "project": <결과 저장 경로>,
            "name": <서브폴더 이름>,
            "conf": <confidence>,
            "save": True,
            "save_txt": True
        }
        """
        return self.model.predict(
            source=model_input["source"],
            project=model_input.get("project", "runs/predict"),
            name=model_input.get("name", "exp"),
            conf=model_input.get("conf", 0.25),
            save=model_input.get("save", True),
            save_txt=model_input.get("save_txt", False),
            exist_ok=True,
            stream=True
        )