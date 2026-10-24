from config.wp import getConfig, getWiseDefaultStorage
import os
import mlflow # 1.30.1
import json 
import datetime
from urllib import parse
import shutil
import pandas as pd
import joblib 
from urllib.parse import urlparse
from mlflow.models.signature import ModelSignature
import re
s_metaDbInfo = getConfig('','META_DB')
o_apiType = getConfig('','API_TYPE')
o_tracking_uri = "mysql+pymysql://" + s_metaDbInfo['id'] + ":" + parse.quote(s_metaDbInfo['passwd']) + "@" +  s_metaDbInfo['host'] + ":" + s_metaDbInfo['port'] + "/mlflow"

mlflow.set_tracking_uri(o_tracking_uri)


def init():
    global o_wiseStorage 
    o_wiseStorage = getWiseDefaultStorage()
    global o_defaultDataPath 

    o_defaultDataPath = o_wiseStorage['DEFAULT_PATH']   
   
class mlFlowClient:
    """
    mlflow class 
    ---
    tracking store, model_registry 에는 webhdfs가 없기 때문에 register를 직접 한다. 
    mlflow를 직접 import 하면 초기화 되기 때문에 mlflow에서 필요한 기능은 mlflowService안에 추가해서 import 해서 사용해야 함.
    :param p_userNo (int): 사용자 번호
    :param p_experimentName (str) : 'prophet'(실행), 'workflow'(실행), 'register' (dsmstr 등록 모델)
    :return None
    """
    def __init__(self, p_userno):
        # init()
        self.userno = str(p_userno)
        self.run_info = {}
        # self.experiment_id = 0
        try:
            self.experiment = mlflow.get_experiment_by_name(self.userno)
            self.experiment_id = self.experiment.experiment_id
        except AttributeError:
            if o_wiseStorage['type'] == 'LOCAL':
                self.experiment_id = mlflow.create_experiment(self.userno, artifact_location=f'file:///{o_defaultDataPath}{self.userno}/mlrun')
            elif o_wiseStorage['type'] == 'HDFS':
                 self.experiment_id = mlflow.create_experiment(self.userno, artifact_location=f'hdfs://{o_defaultDataPath}{self.userno}/mlrun')
            else:
                self.experiment_id = mlflow.create_experiment(self.userno, artifact_location=f'file:///{o_defaultDataPath}/{self.userno}/mlrun')
        mlflow.set_experiment(self.userno)
        self.experiment_id = mlflow.get_experiment_by_name(self.userno)._experiment_id
        self.client = mlflow.MlflowClient()
        
    def createRun(self, p_userno, p_modelId):
        """
        모델 학습 기록 시작
        :param p_userNo: 사용자 번호
        """
        tags = {"mlflow.user":p_userno}
        run = self.client.create_run(self.experiment_id, tags=tags, run_name=p_modelId)
        # 실행 정보
        self.run_info = run
        return self.run_info.to_dictionary()['info']
    
    def startRun(self, p_runId, p_modelId):
        mlflow.start_run(run_id=p_runId, experiment_id=self.experiment_id,run_name=p_modelId, nested=True)
    
    def logModel(self, p_model, p_signature, p_sample, p_frameWorkType='Scikit-learn'):
        if p_frameWorkType == 'Scikit-learn':
           self.mlflowModel = mlflow.sklearn.log_model(p_model, artifact_path="model", signature=p_signature, input_example=p_sample)
        elif p_frameWorkType == 'TensorFlow/Keras':
            self.mlflowModel = mlflow.tensorflow.log_model(p_model, "model")
        elif p_frameWorkType == 'PyTorch':
            self.mlflowModel = mlflow.pytorch.log_model(p_model, "model")
        elif p_frameWorkType == 'YOLO':
            from serviceWrapper.wrapper import YOLOv8Wrapper
            self.mlflowModel = mlflow.pyfunc.log_model(
                artifact_path="model",
                python_model=YOLOv8Wrapper(),
                extra_pip_requirements=["Pillow", "opencv-python", "stream_zip"],
                artifacts={
                    "model_path": p_model.model_path,
                    "output_path": p_model.output_path
                },
                code_paths=["./serviceWrapper"]  # YOLOv8Wrapper 포함된 디렉토리
            )
        self.mlflowModelPath =  urlparse(self.mlflowModel.artifact_path)
        # self.mlflowModelPath  = self.mlflowModelPath.path
        # 윈도우일 경우
        self.mlflowModelPath = self.mlflowModelPath.path.lstrip("/")  # Windows의 경우 맨 앞 슬래시 제거

    def logSignature(self, p_signature, p_wpStorage):
        signature_path = os.path.join(self.mlflowModelPath, "signature.json")
        if o_apiType == 'COMMON':
            with open(signature_path, "w") as f:
                json.dump(p_signature.to_dict(), f, indent=2)
        else:
            p_wpStorage.o_sparkStorage.writeFile(signature_path, p_signature.to_dict(), 'json')

    def logSampleData(self, p_sample, p_wpStorage):
        sample_path = os.path.join(self.mlflowModelPath, "input_example.json")
        json_like = {
        "columns": p_sample.columns.tolist(),
        "data": p_sample.values.tolist()
        }
        if o_apiType == 'COMMON':
            with open(sample_path, "w") as f:
                json.dump(json_like, f, indent=2)
        else:
            p_wpStorage.o_sparkStorage.writeFile(sample_path, json_like, 'json')

    def logMetrics(self, p_runId, p_metrics):
        for key, value in p_metrics.items():
            self.client.log_metric(p_runId, key, value)

    def logScaler(self, p_scaler, p_wpStorage):
        scaler_path = os.path.join(self.mlflowModelPath, "scaler.pkl")
        if o_apiType == 'COMMON':
            # if bool(re.match(r'^/?[A-Za-z]:[\\/]', scaler_path)):
            scaler_path = scaler_path.lstrip("/")
            joblib.dump(p_scaler, scaler_path)
        else:
            p_wpStorage.o_sparkStorage.writeFile(scaler_path, p_scaler, 'pkl')

    def logPythonCode(self, p_code, p_wpStorage, p_parameter=None):
        code_path = os.path.join(self.mlflowModelPath, "code.py")
        s_code = p_code
        if p_parameter != None:
            s_code = s_code.replace("optimizer=s_optimizer", "optimizer={s_optimizer}")
            s_code = s_code.replace("loss=s_loss", "loss={s_loss}")
            s_code = s_code.replace("metrics=[s_metrics]", "metrics=[{s_metrics}]")
            # ✅ 템플릿 안에 실제 값 넣기
            s_optimizer_val = repr(p_parameter['optimizer'])
            s_loss_val = repr(p_parameter['loss'])
            s_metrics_val = repr(p_parameter['metrics'])
            s_code = s_code.format(
                s_optimizer=s_optimizer_val,
                s_loss=s_loss_val,
                s_metrics=s_metrics_val
            )
        if o_apiType == 'COMMON':
            with open(code_path, "w", encoding="utf-8") as f:
                f.write(s_code)
        else:
            p_wpStorage.o_sparkStorage.writeFile(code_path, s_code, 'py')

    def logParams(self, p_runId, p_param):
        for key, value in p_param.items():
            # 리스트나 딕셔너리처럼 복잡한 데이터 구조는 JSON 문자열로 변환하여 저장
            if isinstance(value, (list, dict)):
                self.client.log_param(p_runId, key, json.dumps(value))
            else:
                # 단순 데이터는 바로 저장
                self.client.log_param(p_runId, key, value)

    def logConfig(self, p_config, p_wpStorage):
        config_path = os.path.join(self.mlflowModelPath, "config.json")
        with open(config_path, "w") as f:
            json.dump(p_config, f, indent=2)
        

    def registerModel(self, p_runId, p_modelId):
        try:
            self.client.create_registered_model(name=p_modelId)
            print(f"Registered new model: {p_modelId}")
        except Exception as e:
            print(f"Model already exists: {e}")
        
        model_uri = f"runs:/{p_runId}/model"
        self.modelVersionInfo = self.client.create_model_version(
            name=p_modelId,
            source=model_uri,
            run_id=p_runId
        )
        # === modelPath 태그 저장 ===
        self.client.set_model_version_tag(
            name=p_modelId,
            version=self.modelVersionInfo.version,
            key="modelPath",
            value=self.mlflowModelPath
        )



        return self.modelVersionInfo.version


    def setTags(self, p_runId, p_tags):
        for key, value in p_tags.items():
            self.client.set_tag(p_runId, key, value)


    def endRun(self, p_runId, p_status = 'FINISHED'):
        """
        모델 기록 종료
        :return run.info
        """
        self.client.set_terminated(p_runId, p_status)

    def getModelVerion(self, p_modelName, p_modelVersion):
        return self.client.get_model_version(name=p_modelName, version=p_modelVersion)

    def getRunInfo(self, p_runId):
        return self.client.get_run(p_runId)

    def loadConfig(self, p_path):
        return mlflow.artifacts.load_dict(p_path + '/config.json')
    
    def loadSignature(self, p_path):
        s_json =  mlflow.artifacts.load_dict(p_path + '/signature.json')
        return ModelSignature.from_dict(s_json)

    def loadModel(self, p_modelId, p_modelVersion, p_frameWorkType=None):
        s_model_uri = f"models:/{p_modelId}/{p_modelVersion}"
        if p_frameWorkType ==None:
            return mlflow.pyfunc.load_model(model_uri=s_model_uri)
        elif p_frameWorkType == 'TensorFlow/Keras':
            return mlflow.keras.load_model(model_uri=s_model_uri)
        elif p_frameWorkType == 'PyTorch':
            return mlflow.pytorch.load_model(model_uri=s_model_uri)
    
    def loadScaler(self, p_arifact_uri, p_wpStorage):
        p_parsed_uri = urlparse(p_arifact_uri)
        s_artifact_path = p_parsed_uri.path
        if o_apiType == 'COMMON':
            if bool(re.match(r'^/?[A-Za-z]:[\\/]', s_artifact_path)):
                s_artifact_path = s_artifact_path.lstrip("/")
            return joblib.load(s_artifact_path + '/scaler.pkl')
        else:
            return p_wpStorage.o_sparkStorage.readFile(s_artifact_path + '/scaler.pkl', p_option='pkl')

    def loadInputSample(self, p_path):
        s_inputSample =  mlflow.artifacts.load_dict(p_path + '/input_example.json')
        s_inputSample = pd.DataFrame(data=s_inputSample['data'], columns=s_inputSample['columns'])
        return s_inputSample
    
    def saveArtifactsToLocal(self, p_mlflowPath, p_localPath):
        mlflow.artifacts.download_artifacts(artifact_uri=p_mlflowPath, dst_path=p_localPath)

    def logArtifacts(self, p_runId, p_uuid, p_targetPath):
        s_localPath = o_defaultDataPath + 'temp/' + p_uuid
        self.client.log_artifacts(p_runId, s_localPath, p_targetPath)
        if os.path.exists(s_localPath):
            print("임시 폴더 삭제 - ", s_localPath)
            shutil.rmtree(s_localPath)
            


    def setTag(self, p_runId, p_tagKey, p_tagValue):
        if type(p_tagValue) is dict :
            for s_tagKey in p_tagValue:
                self.client.set_tag(p_runId, f'{p_tagKey}.{s_tagKey}', p_tagValue[s_tagKey])
        else :
            self.client.set_tag(p_runId, p_tagKey, p_tagValue)
    



    def logModelMetrics(self, p_runId, p_modelType, p_model, p_metrics):
        s_metrics = {}            
        for s_key in list(p_metrics.keys()):
            if s_key in ["accuracy", "precision", "recall", "fscore", "support", "test_score", "mse", "rmse", "mape", "score", "silhouette_coef"]:
                s_metrics[s_key] = p_metrics[s_key]

        self.setTag(p_runId, 'metrics', s_metrics)
        if p_modelType in ['xgboosts', 'sklearn']:
            self.setTag(p_runId, 'params', p_model.get_params())
            self.setTag(p_runId, 'estimator_class', p_model.__class__)
            self.setTag(p_runId, 'estimator_name', p_model.__class__.__name__)
        
        if p_modelType in ['rnn', 'cnn', 'lstm', 'tensorflow', 'dqn']:
            self.setTag(p_runId, 'params', p_model.summary())
      

def parseMlflowRegistry(p_data):
    """
    mlflow 에서 조회된 모델 정보를 dict 형태로 변환
    :param p_data (dict): 모델 registry 결과 값
    :return  {
        'metrics': {},
        'params':{},
    }
    """
    s_result = {
        'metrics': p_data['data']['metrics'],
        'params':p_data['data']['params'],
        'tags':p_data['info']
    }
    s_tags = p_data['data']['tags']
    s_keys = s_tags.keys()
    for key in s_keys:
        if 'metrics.' in key:
            s_result['metrics'][key.replace('metrics.', '')] =  s_tags[key]
        elif 'params.' in key:
            s_result['params'][key.replace('params.', '')] =  s_tags[key]
        else :
            # 날짜 string 변환
            if isinstance(s_tags[key], datetime.datetime):
                s_result['tags'][key] = str(s_tags[key].strftime('%Y-%m-%d %H:%M:%S'))
            else :
                s_result['tags'][key] = s_tags[key] 
            
    return s_result

def getMlflowModelInfo(p_runId):
    s_info = mlflow.get_run(p_runId).to_dictionary()
    s_info = parseMlflowRegistry(s_info)
    return s_info


def addModelTag(p_runName, p_tagData, p_experimentName='prophet'):
    """
    모델 태그 등록
    :param p_userNo (int): 사용자 번호
    :param p_runName (str): 실행 runName
    :param p_tagData (Dict): 키: 태그명, 값: 태그값
    :param p_experimentName (str):experiment name prophet / platform 
    :return None
    """
    s_result = { 'isSuccess': False, 'result':{'msg': ''}}

    s_experiment = mlflow.get_experiment_by_name(p_experimentName)
    if s_experiment is not None:
        s_filterStr = f'tag.mlflow.runName = "{p_runName}"'
        s_runs = mlflow.search_runs(experiment_ids=s_experiment.experiment_id, filter_string=s_filterStr, max_results=1)

        if len(s_runs) > 0:
            s_run = s_runs.iloc[0]
            with mlflow.start_run(run_id=s_run.run_id, nested=True):
                mlflow.set_tags(p_tagData)
            
            s_result = { 'isSuccess': True, 'result':{'msg': '태그 등록 완료'}}
    return s_result

def removeModelTag(p_runName, p_tagKeyList, p_experimentName='prophet'):
    """
    모델 태그 삭제
    :param p_userNo (int): 사용자 번호
    :param p_runName (str): 실행 runName
    :param p_tagKeyList (list(str)): 삭제할 태그명
    :param p_experimentName (str):experiment name prophet / platform 
    :return None
    """
    s_result = { 'isSuccess': False, 'result':{'msg': ''}}
    s_experiment = mlflow.get_experiment_by_name(p_experimentName)
    if s_experiment is not None:
        s_filterStr = f'tag.mlflow.runName = {p_runName}'
        s_runs = mlflow.search_runs(experiment_ids=s_experiment.experiment_id, filter_string=s_filterStr, max_results=1)
        if len(s_runs) > 0:
            s_run = s_runs.iloc[0]
            for tag_key in p_tagKeyList:
                mlflow.delete_tag(tag_key, run_id = s_run.run_id)

            s_result = { 'isSuccess': True, 'result':{'msg': '태그 삭제 완료'}}
    return s_result


def adjustColumnTypes(p_df, p_schema):
    expected_dtypes = dict(zip(p_schema.input_names(), p_schema.numpy_types()))

    for col, expected_type in expected_dtypes.items():
        if col in p_df.columns:
            current_type = p_df[col].dtype

            # 타입이 다르면 변환
            if current_type != expected_type:
                print(f"🔄 변환: 컬럼 '{col}' → {expected_type} (현재 {current_type})")
                p_df[col] = p_df[col].astype(expected_type)

    return p_df

