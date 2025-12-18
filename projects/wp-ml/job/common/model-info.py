from serviceMlflow import mlflowService 
from datetime import datetime
from database.manager import WpDataBaseManagement
from urllib import parse
import base64
import re
from serviceModel import analyticJobService
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_method = kwargs['method']
    s_userno = kwargs['userno']
    # 커스텀모델여부
    s_customYn = s_data['CUSTOM_YN']
    s_modelId = s_data['MODEL_ID']
    s_modelVersion = s_data['MODEL_IDX']
    

    s_mlflow = mlflowService.mlFlowClient(s_userno)
        

    if s_method == 'MODEL-INFO':
        s_featureLog = []    
        s_evaluateLog = []

        s_modelVersionInfo = s_mlflow.getModelVerion(s_modelId, s_modelVersion)

        s_runId = s_modelVersionInfo.run_id

        

        s_runInfo = s_mlflow.getRunInfo(s_runId)

        # metrics
        s_metrics = s_runInfo.data.metrics

        # params
        s_params = s_runInfo.data.params

        # tags
        s_tags = s_runInfo.data.tags 

        # config(evaluateLog + featureLog)
        s_path = s_runInfo.info.artifact_uri

        if s_customYn == 'N':
            s_config = s_mlflow.loadConfig(s_path)
            s_featureLog = s_config['feature_importance']
            s_evaluateLog = s_config['evaluation']
        else:
            try:
                s_config = s_mlflow.loadConfig(s_path)
               
                s_evaluateLog = s_config['evaluation']
                s_featureLog = s_config['feature_importance']
            except:
                pass
            s_dbMng = WpDataBaseManagement('meta')
            s_where = {
                'MODEL_ID': s_modelId
            }
            s_uploadSelect = s_dbMng.select('DP_MODEL_CUSTOM_MSTR', s_where)
            s_uploadsInfo = s_uploadSelect.to_dict(orient='records')[0]
            s_metrics = {
                '업로드모델명': s_uploadsInfo['MODEL_NM'],
                '업로드파일명': s_uploadsInfo['MODEL_FILE'],
                '프레임워크': s_uploadsInfo['FRAMEWORK_TYPE'],
                '알고리즘타입': s_uploadsInfo['ARG_TYPE'],
                '업로드날짜': s_uploadsInfo['REG_DATE']
            }
            # start_time 및 end_time 가져오기
        s_startTime = datetime.fromtimestamp(s_runInfo.info.start_time / 1000.0).strftime('%Y-%m-%d %H:%M:%S') 
        s_endTime = datetime.fromtimestamp(s_runInfo.info.end_time / 1000.0).strftime('%Y-%m-%d %H:%M:%S') 

        data = {
            "metrics": s_metrics,
            "params": s_params,
            "tags": s_tags,
            "featureLog": s_featureLog,
            "evaluateLog": s_evaluateLog,
            "startTime": s_startTime,
            "endTime": s_endTime,

        }
    elif s_method == 'MODEL-SCHEMA':

        # 모델 로드
        s_model = s_mlflow.loadModel(s_modelId, s_modelVersion)

        # 모델의 입력 스키마 가져오기
        try:
            s_inputSchema = s_model.metadata.get_input_schema()
            
            data = {
                'input_schema': [col.name for col in s_inputSchema.inputs]
            }
            if data['input_schema'] == [None]:
                data['input_schema'] = []
        except:
            data = {
                'input_schema': []
            }
            # 스키마 파일을 따로 저장했는지 체크(텐서플로, 파이토치)
            try:
                s_runId = s_model.metadata.run_id
                s_runInfo = s_mlflow.getRunInfo(s_runId)
                s_path = s_runInfo.info.artifact_uri
                s_inputSchema = s_mlflow.loadSignature(s_path)
                data = {
                'input_schema': [col.name for col in s_inputSchema.inputs]
                }
            except: 
                pass

    elif s_method == 'CHECK-CODE':
        s_frameWorkType =  s_data['FRAMEWORK_TYPE']
        s_parameter = s_data['PARAMETER']
        s_parameter = {param['name']: param['value'] for param in s_parameter}
        s_code = s_data['PYTHON_CODE']
        s_code = parse.unquote(base64.b64decode(s_code).decode('utf-8'))
        s_model = s_mlflow.loadModel(s_modelId, s_modelVersion, s_frameWorkType)

        s_execParam = {
            "s_model": s_model,
            "s_new_model": None,
            "s_optimizer": s_parameter['optimizer'],
            "s_loss": s_parameter['loss'],
            "s_metrics": s_parameter['metrics']
        }

        try:
            exec(s_code, s_execParam)
            s_new_model = s_execParam["s_new_model"]
        except Exception as e:
            raise e
        
        if s_frameWorkType == 'TensorFlow/Keras':
            stringlist = []
            s_new_model.summary(print_fn=lambda x: stringlist.append(x), expand_nested=True)
            data = "\n".join(stringlist)
        elif s_frameWorkType == 'PyTorch':
            data = str(s_new_model)

    elif s_method == 'CHECK-CLASS':
        s_code = s_data['PYTHON_CODE']
        s_code = parse.unquote(base64.b64decode(s_code).decode('utf-8'))
        
        from torchinfo import summary
       
        def getInputSizeFromCode(code_string, batch_size=1):
            # 1. Linear 레이어 우선 검색
            try:
                linear_matches = re.findall(r'nn\.Linear\((\d+),\s*\d+\)', code_string)
                if linear_matches:
                    in_features = int(linear_matches[0])
                    return (batch_size, in_features)
            
                # 2. Conv2d 레이어
                conv2d_matches = re.findall(r'nn\.Conv2d\((\d+),', code_string)
                if conv2d_matches:
                    in_channels = int(conv2d_matches[0])
                    # 높이/너비는 보통 추정값으로 224
                    return (batch_size, in_channels, 224, 224)
            
                # 3. Conv1d 레이어
                conv1d_matches = re.findall(r'nn\.Conv1d\((\d+),', code_string)
                if conv1d_matches:
                    in_channels = int(conv1d_matches[0])
                    # 길이 추정 128
                    return (batch_size, in_channels, 128)
            
                # 4. LSTM
                lstm_matches = re.findall(r'nn\.LSTM\((\d+),', code_string)
                if lstm_matches:
                    input_size = int(lstm_matches[0])
                    # sequence length 추정 50
                    return (batch_size, 50, input_size)
            
                # 5. Embedding
                embedding_matches = re.findall(r'nn\.Embedding\(\d+,\s*(\d+)\)', code_string)
                if embedding_matches:
                    # 입력은 정수 시퀀스: (batch, seq_len)
                    # seq_len 추정 50
                    return (batch_size, 50)
            except:
                return None
            
        s_model = analyticJobService.vaildateClassCode(s_code)
        s_input = getInputSizeFromCode(s_code)
        data = summary(s_model, input_size=s_input)
        data = str(data)
        
    # 커스텀 모델 학습에서 커스텀 학습 부분이 있는지 체크
    elif s_method == 'CHECK-TRAIN':
        s_frameworkType = s_data['FRAMEWORK_TYPE']
        s_model = s_mlflow.loadModel(s_modelId, s_modelVersion, s_frameworkType)
        s_customTrain = False
        if(hasattr(s_model, "customTrain")):
            s_customTrain = True

        data = {
            "customTrain": s_customTrain
        }


    return data