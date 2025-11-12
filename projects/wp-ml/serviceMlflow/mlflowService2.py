from config.wp import getConfig, getWiseDefaultStorage
import os
import mlflow # 1.30.1
import json 
import datetime
import numpy as np
from mlflow.server import handlers
from mlflow.tracking._tracking_service import utils as tracking_utils 
from mlflow.tracking._model_registry import utils as model_utils
from mlflow.store.artifact.artifact_repository_registry import _artifact_repository_registry
from mlflow.store.tracking.sqlalchemy_store import SqlAlchemyStore
from mlflow.models.signature import infer_signature
from urllib import parse
import shutil

o_filesystem = ''
o_defaultDataPath = ''

def init():
    o_wiseStorage = getWiseDefaultStorage()
    global o_defaultDataPath 
    global o_filesystem

    o_defaultDataPath = o_wiseStorage['DEFAULT_PATH']    
    o_apiIp = getConfig('WP_API', 'host')
    o_filesystem = getConfig('','STORAGE_TYPE')
    if o_filesystem == 'LOCAL':
        o_metadata_uri = o_wiseStorage['DEFAULT_PATH'] + "mlruns"
        
    if o_filesystem == 'HDFS':
        from serviceMlflow import hdfsFilestore, hdfsModelRegistry

        def get_hdfs_store(store_uri, **_):
            return hdfsFilestore.FileStore('/user/mlruns',o_metadata_uri)

        # hdfs_ip = getConfig('WEB_HDFS', 'host')
        # hdfs_port = getConfig('WEB_HDFS', 'port')
        hdfs_ip = o_wiseStorage['host']
        hdfs_port = o_wiseStorage['port']
        if o_wiseStorage['host'] == o_apiIp:
            hdfs_ip = 'localhost'

        o_metadata_uri = f'webhdfs://{hdfs_ip}:{hdfs_port}/gateway/sandbox/user/mlruns'


    s_metadbInfo = getConfig('', 'META_DB')
    o_tracking_uri = "mysql://" + s_metadbInfo['id'] + ":" + parse.quote(s_metadbInfo['passwd']) + "@" +  s_metadbInfo['host'] + ":" + s_metadbInfo['port'] + "/mlflow"


    def get_sql_store(*args, **kwargs):
        return SqlAlchemyStore(o_tracking_uri, o_metadata_uri)

    if o_filesystem == 'HDFS':
        handlers._model_registry_store_registry.register("webhdfs", hdfsFilestore.FileStore('/user/mlruns', o_metadata_uri))
        _artifact_repository_registry.register("webhdfs", hdfsModelRegistry.HdfsArtifactRepository)

        if model_utils._model_registry_store_registry is None:
            model_utils._model_registry_store_registry = model_utils.ModelRegistryStoreRegistry()
        model_utils._model_registry_store_registry.register("webhdfs", get_hdfs_store)

    handlers._tracking_store_registry.register("mysql", get_sql_store)
    tracking_utils._tracking_store_registry.register("mysql", get_sql_store)

    mlflow.set_tracking_uri(o_tracking_uri)
    mlflow.set_registry_uri(o_metadata_uri)

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
    def __init__(self, p_experimentName):
        init()
        self.experiment_name = p_experimentName + '_' + o_filesystem
        self.run_info = {}
        # self.experiment_id = 0
        
        mlflow.set_experiment(self.experiment_name)
        self.experiment_id = mlflow.get_experiment_by_name(self.experiment_name)._experiment_id
        self.client = mlflow.MlflowClient()
        
    def createRun(self, p_userNo = None, p_runName = None):
        """
        모델 학습 기록 시작
        :param p_userNo: 사용자 번호
        """
        tags = None
        if p_userNo is not None:
            tags = {"mlflow.user":p_userNo}
        if p_runName is not None:
            run = self.client.create_run(self.experiment_id, tags=tags, run_name = p_runName)
        else :
            run = self.client.create_run(self.experiment_id, tags=tags)
        # 실행 정보
        self.run_info = run.info
        return run.to_dictionary()['info']
    
    def startRun(self, p_runId):
        mlflow.start_run(run_id=p_runId, experiment_id=self.experiment_id, nested=True)
    
    def saveModel(self, p_model, p_uuid, p_modelType=None, p_trainData=None, p_predictData=None):
        s_signature = None
        s_localPath = o_defaultDataPath + 'temp/' + p_uuid
        if not os.path.exists(s_localPath):
            os.makedirs(s_localPath)

        try :
            if p_trainData is not None and p_predictData is not None:
                s_signature = infer_signature(p_trainData, p_predictData)
                print('=====================================================================')
                print(s_signature)
                print(p_trainData.info())
                print('=====================================================================')
        except Exception as e:
            print("s_signature error")
            print(e)
        # hasattr(p_model, 'booster') → 사용자 알고리즘이 xgboosts 일 때
        if p_modelType == 'xgboosts' or hasattr(p_model, 'booster'):
            mlflow.xgboost.save_model(p_model, s_localPath, signature = s_signature)
            
        elif p_modelType in ['rnn', 'cnn', 'lstm', 'tensorflow', 'dqn']:
            import tensorflow as tf
            from tensorflow.python.saved_model import signature_constants
            s_tensorLocalPath = o_defaultDataPath + 'tensorTemp/' + p_uuid
            tf.saved_model.save(p_model, s_tensorLocalPath)
            mlflow.tensorflow.save_model(tf_saved_model_dir= s_tensorLocalPath, tf_meta_graph_tags=['serve'], 
                                         tf_signature_def_key = signature_constants.DEFAULT_SERVING_SIGNATURE_DEF_KEY,
                                         path=s_localPath, signature = s_signature)

            if os.path.exists(s_tensorLocalPath):
                shutil.rmtree(s_tensorLocalPath)
                #os.rmdir(s_tensorLocalPath)
        elif p_modelType == 'pytorch':
            mlflow.pytorch.save_model(pytorch_model=p_model, path=s_localPath, signature = s_signature)
        else:
            mlflow.sklearn.save_model(p_model, s_localPath, signature = s_signature)

    def logArtifacts(self, p_runId, p_uuid, p_targetPath):
        s_localPath = o_defaultDataPath + 'temp/' + p_uuid
        self.client.log_artifacts(p_runId, s_localPath, p_targetPath)
        if os.path.exists(s_localPath):
            print("임시 폴더 삭제 - ", s_localPath)
            shutil.rmtree(s_localPath)
            
    def endRun(self, p_runId, p_status = 'FINISHED'):
        """
        모델 기록 종료
        :return run.info
        """
        self.client.set_terminated(p_runId, p_status)

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
        
        if p_modelType in ['recommend']:
            s_params = {}
            for s_key in p_model.__dict__:
                if s_key in ["sim_options", "k", "min_k", "bsl_options", "n_x", "n_y"]:
                    s_params[s_key] = p_model.__dict__[s_key]
            # self.setTag(p_runId, 'params', p_model.__dict__)
            self.setTag(p_runId, 'params', s_params)

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