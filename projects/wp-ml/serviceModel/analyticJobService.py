# job의 model에서 사용하는 기존 pyspark api에서 serviceProphet/analyticService 파일
# 일단 모델 돌아가게 한 다음에 기존 메서드들 사용할 수 있도록 대체 필요


#from py4j.java_gateway import java_import
import re
import json
from datetime import datetime
import os

from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
from database.manager import WpDataBaseManagement

from serviceMlflow import mlflowService 
from sklearn.base import is_classifier, is_regressor, BaseEstimator
import tensorflow as tf
import torch
from sklearn.pipeline import Pipeline
import mlflow
import pandas as pd
import json
import io
def getModelResult(p_dataArray, p_filterOpt, p_userno):
    s_dbMng = WpDataBaseManagement('meta')
    s_result = []
    for data in p_dataArray:
        if 'COM_UUID' in data:
            s_where = {
                'UUID': data['COM_UUID']
            }
            s_comModel = s_dbMng.select('DP_MODEL_RESULT', s_where)
            s_comModel = json.loads(s_comModel[['MODEL_ID', 'MODEL_IDX']].iloc[0].to_json(force_ascii=False))
            s_result.append(s_comModel)
        elif 'MODEL_ID' in data:
            s_result.append(data)

    s_mlflow = mlflowService.mlFlowClient(p_userno)

    for model in s_result:
        s_modelName = model['MODEL_ID']
        s_modelVersion = model['MODEL_IDX']
        # s_modelVersionInfo = s_mlflow.client.get_model_version(name=s_modelName, version=s_modelVersion)
        s_modelVersionInfo = s_mlflow.getModelVerion(s_modelName, s_modelVersion)
        s_runId = s_modelVersionInfo.run_id
        # s_runInfo = s_mlflow.client.get_run(s_runId)
        s_runInfo = s_mlflow.getRunInfo(s_runId)
        # metrics
        model[p_filterOpt] = s_runInfo.data.metrics[p_filterOpt]

    s_dbMng.close()
    

    return s_result

def getBestModelData(p_modelResult, p_filterOpt):
    if len(p_modelResult) < 1:
        raise Exception('모델 실행 결과가 없습니다. 워크플로우를 실행한 후 확인해 주세요')

    # accuracy를 기준으로 정렬 (내림차순), 같으면 index 순서 유지
    if p_filterOpt == 'rmse' or p_filterOpt == 'mse' :
        s_result = sorted(p_modelResult, key=lambda x: x.get(p_filterOpt, float("inf")), reverse=False)
    else:
        s_result = sorted(p_modelResult, key=lambda x: x[p_filterOpt], reverse=True)
    # 가장 첫 번째 모델이 accuracy가 가장 높은 모델
    return s_result[0]

def saveFilterModel(p_bestModelInfo, p_modelname, p_userno, p_workflowId, p_dataSource):
    # DP_MODEL_MSTR 조회
    s_dbMng = WpDataBaseManagement('meta')
    s_where = {
                'MODEL_NM': p_modelname,
                'REG_USER_NO': p_userno,
                "DEL_YN": "N"
    }
    s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
    # 값이 있을 경우에는 모델 ID 가져옴
    if len(s_select) > 0:
        s_modelId = s_select['MODEL_ID'][0]
    # 없을 경우에는 INSERT하고 모델 ID 가져옴
    else:
        s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
        s_modelId = s_insert.lastrowid
    
    

    # 기존 모델 정보
    s_mlflow = mlflowService.mlFlowClient(p_userno)
    


    s_bestModelId = p_bestModelInfo['MODEL_ID']
    s_bestModelVersion = p_bestModelInfo['MODEL_IDX']

    s_bestModelMstr = s_dbMng.select('DP_MODEL_MSTR', {'MODEL_ID': s_bestModelId})

    s_modelVersion = s_mlflow.getModelVerion(s_bestModelId, s_bestModelVersion)

    s_bestRunInfo = s_mlflow.getRunInfo(s_modelVersion.run_id)

    # config파일
    s_path = s_bestRunInfo.info.artifact_uri
    s_bestConfig = s_mlflow.loadConfig(s_path)

    # 모델 로드
    s_bestModel = s_mlflow.loadModel(s_bestModelId, s_bestModelVersion)
    
    # 스케일러 로드
    s_bestScaler = s_mlflow.loadScaler(s_path, p_dataSource.o_storageManager.o_wpStorage)

    # signature
    s_bestSignature = s_bestModel.metadata.signature

    # inputSchema
    s_bestInputSample = s_mlflow.loadInputSample(s_path)

    # run 생성
    s_mlflowInfo = s_mlflow.createRun(str(p_userno), s_modelId)
    s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)
    # 모델 저장
    s_mlflow.logModel(s_bestModel, s_bestSignature, s_bestInputSample)
    # metrics 저장
    s_mlflow.logMetrics(s_mlflowInfo['run_id'], s_bestRunInfo.data.metrics) 
    # parameter 저장
    s_mlflow.logParams(s_mlflowInfo['run_id'], s_bestRunInfo.data.params)
    # config 저장
    s_mlflow.logConfig(s_mlflowInfo['run_id'], s_bestConfig)
    # 스케일러 저장
    s_mlflow.logScaler(s_bestScaler, p_dataSource.o_storageManager.o_wpStorage)
    # 모델 등록
    s_model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)
    # tag 저장
    s_bestRunInfo.data.tags['version'] = s_model_version
    s_bestRunInfo.data.tags['mlflow.runName'] = s_modelId
    s_mlflow.setTags(s_mlflowInfo['run_id'], s_bestRunInfo.data.tags)
    # mlflow 종료
    s_mlflow.endRun(s_mlflowInfo['run_id'])
    artifact_uri = s_mlflowInfo['artifact_uri']  

    # 업데이트
    s_data = {
        'MODEL_IDX': s_model_version,
        'ARG_ID': s_bestModelMstr['ARG_ID'][0],
        'ARG_TYPE': s_bestModelMstr['ARG_TYPE'][0],
        'ACCURACY': s_bestModelMstr['ACCURACY'][0],
        'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'MLFLOW_PATH': artifact_uri,
        'WF_ID': p_workflowId,
        'FRAMEWORK_TYPE': s_bestModelMstr['FRAMEWORK_TYPE'][0]
    }
    s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)
    s_dbMng.close()


def saveCustomModel(p_customModelInfo, p_model, p_modelname, p_userno, p_wpStorage, p_code):
    # DP_MODEL_MSTR 조회
    s_dbMng = WpDataBaseManagement('meta')
    s_where = {
                'MODEL_NM': p_modelname,
                'REG_USER_NO': p_userno,
                "DEL_YN": "N",
                "CUSTOM_YN": "Y"
    }
    s_select = s_dbMng.select('DP_MODEL_MSTR', s_where)
    # 값이 있을 경우에는 모델 ID 가져옴
    if len(s_select) > 0:
        s_modelId = s_select['MODEL_ID'][0]
    # 없을 경우에는 INSERT하고 모델 ID 가져옴
    else:
        s_insert = s_dbMng.insert('DP_MODEL_MSTR', s_where, 'single')
        s_modelId = s_insert.lastrowid
    
    

    # mlflow
    s_mlflow = mlflowService.mlFlowClient(p_userno)

    # run 생성
    s_mlflowInfo = s_mlflow.createRun(str(p_userno), s_modelId)
    s_mlflow.startRun(s_mlflowInfo['run_id'], s_modelId)

    # 모델 저장
    s_mlflow.logModel(p_model, p_customModelInfo['signature'], None, p_customModelInfo['frameWorkType'])

    # parameter 저장
    s_mlflow.logParams(s_mlflowInfo['run_id'], p_customModelInfo['params'])

    if p_code != None:
        s_mlflow.logPythonCode(p_code, p_wpStorage)

    # config 저장
    if p_customModelInfo['config'] != {}:
        s_mlflow.logConfig(s_mlflowInfo['run_id'], p_customModelInfo['config'])

    # 모델 등록
    s_model_version = s_mlflow.registerModel(s_mlflowInfo['run_id'], s_modelId)
    # tag 저장
    p_customModelInfo['tags']['version'] = s_model_version
    p_customModelInfo['tags']['mlflow.runName'] = s_modelId
    s_mlflow.setTags(s_mlflowInfo['run_id'], p_customModelInfo['tags'])
    # mlflow 종료
    s_mlflow.endRun(s_mlflowInfo['run_id'])
    artifact_uri = s_mlflowInfo['artifact_uri']  

    # 업데이트
    s_data = {
        'MODEL_IDX': s_model_version,
        'ARG_TYPE': p_customModelInfo['ARG_TYPE'],
        'REG_DATE': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'MLFLOW_PATH': artifact_uri,
        'FRAMEWORK_TYPE': p_customModelInfo['frameWorkType']
    }
    s_dbMng.update('DP_MODEL_MSTR', s_data, s_where)

    s_data = {
        "MODEL_ID": s_modelId,
        "DEL_YN": 'N'
    }
    s_dbMng.update('DP_MODEL_CUSTOM_MSTR', s_data, {"CUSTOM_ID": p_customModelInfo['CUSTOM_ID']})
    s_dbMng.close()   


# --- DB 작업 ---

def uploadModel(p_userno, p_filename, p_code, p_mode, p_layerModelFlag, p_createFlag):
    s_path = os.path.dirname(os.path.dirname(os.path.realpath(__file__))) #최상단 경로

    s_userModelPath =  f"{s_path}/py_result/{str(p_userno)}/userModel"
    
    if not os.path.isdir(s_userModelPath):
        os.makedirs(s_userModelPath)
    
    s_filePath = s_userModelPath + '/' + json.loads(p_filename) + '.py'
    
    s_mode = json.loads(p_mode)
    # tf layer model 일 경우 layerModel true
    
    # s_layerModel 값이 없을때 → 프로핏 에서 돌릴 때
    if not p_layerModelFlag:
        s_path = os.getcwd()
        s_output = ''
        if p_createFlag:
            s_filePath = f"{s_path}/serviceModel/model/custom-code.py"

        if not os.path.exists(s_filePath) and not p_createFlag :
            raise Exception('\n해당 파일이 존재하지 않습니다')
        if s_mode == 'w':
            with open( s_filePath, 'r', encoding='utf-8') as s_file:
                s_originCode = s_file.readlines()
            
            s_fileCode = json.loads(p_code)
            s_newCode = s_fileCode.split('\n')
                                            
            for p_idx in range(len(s_newCode)):
                s_newCode[p_idx] = '    '+ s_newCode[p_idx]

            s_newCode = '\n'.join(s_newCode)
            s_saveCode = s_originCode[0] + s_newCode + '\n' + s_originCode[-1]

            try:
                s_savefile = open(s_userModelPath + '/' + json.loads(p_filename) + '.py', s_mode, encoding='utf-8')
                s_savefile.write(s_saveCode)
                s_savefile.close()
                s_output = True
            except:
                s_output = False
        else :
            with open(s_filePath, 'r', encoding='utf-8') as s_file:
                s_fileCode = s_file.readlines()
            s_customfuncCode = s_fileCode

            del s_customfuncCode[0]
            del s_customfuncCode[len(s_customfuncCode)-1]
            s_customfuncCode[-1] = s_customfuncCode[-1].replace('\n','')
            for p_idx in range(len(s_customfuncCode)):
                s_customfuncCode[p_idx] = s_customfuncCode[p_idx].replace('    ', '', 1)
            s_output = ''.join(s_customfuncCode)
            
        return {'reVal' : s_output, 'path' : s_path}
    
    else :
        s_modelTemplatePath = f"{s_path}/serviceModel/model/custom-ml-code-template.py"
        s_customCode = ''
        s_fileCode = json.loads(p_code)
        s_classCnt = 2
        # 분류 모델이면 클래스 카운트 설정해야 함.
        if '#class_model(classCnt' in p_code:
            # #class_model(classCnt=2) 이면 2만 추출
            # s_regRegex = re.compile('(?<=#class_model\(classCnt=)(.*?)(?=\))')
            s_regRegex = re.compile(r'(?<=#class_model\(classCnt=)(.*?)(?=\))')
            s_ClassList = s_regRegex.findall(p_code)
            if len(s_ClassList) > 0 :
                s_classCnt = int(s_ClassList[0])

        # 코드 들여쓰기 수정
        s_fileCode = s_fileCode.replace('\n', '\n    ')
        with open(s_modelTemplatePath, 'r', encoding='utf-8') as f:
            s_customCode = f.read()
            s_customCode = s_customCode.replace("s_classCnt = None", f's_classCnt = {s_classCnt}')
            s_customCode = s_customCode.replace("model, history = None, None", s_fileCode)
        
        with open(s_filePath, 'w', encoding='utf-8') as f:
            f.write(s_customCode)
            
        return {'reVal' : True}
    

def checkModel(p_model, p_frameWorkType):
    # MLflow 모델인지 확인
    if isinstance(p_model, mlflow.pyfunc.PyFuncModel):
        flavors = p_model.metadata.flavors  # 모델 flavor 정보 가져오기

        # Flavor에 따라 프레임워크 결정
        if "sklearn" in flavors:
            return p_frameWorkType == "Scikit-learn"
        elif "pytorch" in flavors:
            return p_frameWorkType == "PyTorch"
        elif "tensorflow" in flavors:
            return p_frameWorkType == "TensorFlow/Keras"
        else:
            return False  # 알 수 없는 모델 유형

    # 기존 방식 (MLflow 모델이 아닌 경우)
    framework_classes = {
        "Scikit-learn": BaseEstimator,
        "PyTorch": torch.nn.Module,
        "TensorFlow/Keras": tf.keras.Model
    }

    return isinstance(p_model, framework_classes.get(p_frameWorkType, object))


def is_cluster(p_model):
    """
    군집 모델인지 확인하는 함수
    - KMeans, DBSCAN, GaussianMixture, KMedoids 등 지원
    - fit_predict() 또는 predict()를 가지고 있는지 체크
    """
    return isinstance(p_model, BaseEstimator) and (hasattr(p_model, "fit_predict") or hasattr(p_model, "predict"))
    
def extractModelFromPipeline(p_model):
    """
    파이프라인에서 모델(예측기 or 군집기)만 찾아 반환
    - 모델이 하나면 객체 그대로 반환
    - 모델이 여러 개면 {step_name: model} 형태로 반환
    - 파이프라인이 아니면 단일 모델 그대로 반환
    """
    if isinstance(p_model, Pipeline):  # 파이프라인인지 확인
        model_steps = {
            name: step for name, step in p_model.named_steps.items()
            if is_classifier(step) or is_regressor(step) or is_cluster(step)
        }
        
        if len(model_steps) == 1:
            return list(model_steps.values())[0]  # 모델이 하나면 객체 그대로 반환
        return model_steps  # 모델이 여러 개면 딕셔너리 반환
    
    return p_model if is_classifier(p_model) or is_regressor(p_model) or is_cluster(p_model) else None


def is_scaler(transformer):
    """스케일러(변환기)인지 확인"""
    return isinstance(transformer, (StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer))

def extractScalerFromPipeline(pipeline):
    """
    파이프라인에서 스케일러(변환기)만 추출하는 함수
    - 스케일러가 하나면 객체 그대로 반환
    - 스케일러가 여러 개면 {step_name: scaler} 형태로 반환
    - 스케일러가 없으면 None 반환
    """
    if not isinstance(pipeline, Pipeline):
        return None  # 파이프라인이 아니면 None 반환

    scalers = {
        name: step for name, step in pipeline.named_steps.items()
        if is_scaler(step)
    }

    if len(scalers) == 1:
        return list(scalers.values())[0]  # 스케일러가 하나면 객체 그대로 반환
    return scalers if scalers else None  # 여러 개면 딕셔너리, 없으면 None 반환


def getLayerFromTfModel(p_model):
    """Keras 모델의 간략한 summary 정보를 Pandas DataFrame으로 반환"""

    layer_info = []
    for layer in p_model.layers:
        layer_name = layer.name
        layer_type = layer.__class__.__name__
        
        # 일부 레이어 (예: Normalization)에서는 output_shape가 없을 수 있으므로 예외 처리
        try:
            input_shape = str(layer.input.shape)
        except AttributeError:
            input_shape = "N/A"

        try:
            output_shape = str(layer.output.shape)
        except AttributeError:
            output_shape = "N/A"
            
        param_count = layer.count_params()
        
        # get_config()에서 Activation 정보 가져오기
        layer_config = layer.get_config()
        activation = layer_config.get("activation", "N/A")

        layer_info.append([layer_name, layer_type, input_shape, output_shape, param_count, activation])


    return json.loads(pd.DataFrame(layer_info, columns=["Layer Name", "Layer Type", "Input Shape", "Output Shape", "Param", "Activation"]).to_json(orient='records'))

def getParamFromTfModel(model):
    """model.summary()에서 Total params, Trainable params, Non-trainable params, Optimizer params 추출"""
    
    # model.summary()의 출력을 StringIO로 저장
    summary_io = io.StringIO()
    model.summary(print_fn=lambda x: summary_io.write(x + "\n"))
    
    # 저장된 문자열 가져오기
    summary_str = summary_io.getvalue()
    summary_io.close()

    # 각 줄을 리스트로 변환
    summary_lines = summary_str.split("\n")
    
    # 필요한 값 추출
    total_params = None
    trainable_params = None
    non_trainable_params = None
    optimizer_params = None
    
    for line in summary_lines:
        if "Total params:" in line:
            total_params = line.split(":")[1].strip()
        elif "Trainable params:" in line:
            trainable_params = line.split(":")[1].strip()
        elif "Non-trainable params:" in line:
            non_trainable_params = line.split(":")[1].strip()
        elif "Optimizer params:" in line:
            optimizer_params = line.split(":")[1].strip()

    return {
        "Total Params": total_params,
        "Trainable Params": trainable_params,
        "Non-trainable Params": non_trainable_params,
        "Optimizer Params": optimizer_params
    }

def getLayerFromPytorchModel(p_model):
    """
    PyTorch JIT 모델에서 모든 레이어 정보를 추출하여 DataFrame으로 반환하는 함수.
    - `ModuleList` 및 최상위 모델 클래스를 제거함.
    - `Activation` 컬럼 제거.
    - 어떤 모델이든 적용 가능하도록 유연하게 구성.
    """
    layer_info = []

    # ✅ `named_modules()`를 사용하여 모든 레이어 탐색
    for name, module in list(p_model.named_modules())[1:]:
        module_type = getattr(module, "original_name", module.__class__.__name__)  # JIT 변환된 모듈에서 원래 클래스명 가져오기

        # ✅ ModuleList 및 최상위 모델 클래스 제외
        if module_type in ["ModuleList", p_model.__class__.__name__]:
            continue

        param_count = sum(p.numel() for p in module.parameters() if p.requires_grad)  # 학습 가능한 파라미터 개수 계산

        # ✅ 입력 및 출력 크기 설정
        input_shape = None
        output_shape = None
        weight_shape = None

        if hasattr(module, 'weight') and module.weight is not None:
            weight_shape = tuple(module.weight.shape)
            if len(weight_shape) == 4:  # Conv2d
                out_channels, in_channels, kernel_h, kernel_w = weight_shape
                input_shape = (in_channels, "?", "?")
                output_shape = (out_channels, "?", "?")
            elif len(weight_shape) == 2:  # Linear
                out_features, in_features = weight_shape
                input_shape = (in_features,)
                output_shape = (out_features,)

        # ✅ 레이어 정보 저장
        layer_info.append({
            "Layer Name": name,
            "Layer Type": module_type,
            "Input Shape": str(input_shape),
            "Output Shape": str(output_shape),
            "Param": param_count
        })



    return layer_info


def getParamFromPytorchModel(p_model):
    total_params = sum(p.numel() for p in p_model.parameters())
    trainable_params = sum(p.numel() for p in p_model.parameters() if p.requires_grad)
    non_trainable_params = total_params - trainable_params
    return {
        "Total Params": total_params,
        "Trainable Params": trainable_params,
        "Non-trainable Params": non_trainable_params,
    }


def vaildateClassCode(p_code):
    import torch.nn as nn
    # 1. 문법 검사
    try:
        compile(p_code, '<string>', 'exec')
    except SyntaxError as e:
        raise e

    local_ns = {
        "s_model": None
    }
    # 2. 코드 실행 검사 (여기서 수정!)
    try:
        exec(p_code, local_ns)
    except Exception as e:
        raise e

    # 3. nn.Module 상속 클래스 찾기
    model_class = None
    for name, obj in local_ns.items():
        if isinstance(obj, type) and issubclass(obj, nn.Module) and obj is not nn.Module:
            model_class = obj
            break
    if model_class is None:
        raise ("❌ nn.Module을 상속한 모델 클래스를 찾을 수 없습니다.")

    # 4. 인스턴스 생성 테스트
    try:
        model = local_ns["s_model"]
    except Exception as e:
        raise e

    return model


def getInputSizeFromPytorch(p_model, default_image_size=224):
    import torch.nn as nn
    """
    주어진 PyTorch 모델의 첫 번째 레이어를 기준으로 입력 사이즈를 추론합니다.
    - Conv2d 레이어이면 (in_channels, H, W) 반환
    - Linear 레이어이면 (in_features,) 반환
    - 찾지 못하면 None 반환
    """
    def find_first_layer(layers):
        for layer in layers:
            if isinstance(layer, (nn.Conv2d, nn.Linear)):
                return layer
            elif isinstance(layer, nn.Sequential):
                first = find_first_layer(list(layer.children()))
                if first is not None:
                    return first
        return None

    first_layer = find_first_layer(list(p_model.children()))
    if first_layer is None:
        return None

    if isinstance(first_layer, nn.Conv2d):
        return (first_layer.in_channels, default_image_size, default_image_size)
    elif isinstance(first_layer, nn.Linear):
        return (first_layer.in_features,)
    else:
        return None