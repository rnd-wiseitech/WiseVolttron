
from serviceMlflow import mlflowService 

def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_modelId = s_data['MODEL_ID']
    s_userno = kwargs['userno']

    s_mlflow = mlflowService.mlFlowClient(s_userno)
    
    # 모든 버전 가져오기
    s_modelVersions = s_mlflow.client.search_model_versions(f"name='{s_modelId}'")
    
    # 파라미터 키를 저장할 리스트
    s_paramKeys = []
    s_metricsKeys = []

    # 각 버전의 params와 metrics 가져오기
    s_data = {
        "metrics":[],
        "params":[],
        "metrics_key":[],
        "param_key":[]
    }

    for version in s_modelVersions:
        s_runId = version.run_id  # 각 버전의 run_id 가져오기
        s_runInfo = s_mlflow.getRunInfo(s_runId)  # run_id로 실행 정보 가져오기

        # metrics, params 추출
        s_metrics = s_runInfo.data.metrics
        s_params = s_runInfo.data.params
        s_modelName = s_runInfo.data.tags['model_name']

        # 새로운 파라미터 키를 s_paramKeys에 추가
        for key in s_params.keys():
            if key not in s_paramKeys:
                s_paramKeys.append(key)  # 새로운 키 추가

        # 새로운 매트릭스 키를 s_metricsKeys에 추가
        for key in s_metrics.keys():
            if key not in s_metricsKeys:
                s_metricsKeys.append(key)  # 새로운 키 추가

        s_params['MODEL_IDX'] = version.version
        s_params['MODEL_NAME'] = s_modelName
        s_metrics['MODEL_IDX'] = version.version
        s_metrics['MODEL_NAME'] = s_modelName
        s_data['metrics'].append(s_metrics)
        s_data['params'].append(s_params)

    s_data['metrics_key'] = s_metricsKeys
    s_data['param_key'] = s_paramKeys
    # s_data['param_key'].append('new_param')   
    return s_data