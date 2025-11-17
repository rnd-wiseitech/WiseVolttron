
from database.manager import WpDataBaseManagement
from serviceMlflow import mlflowService 
import json
def execute(p_dataSource, **kwargs):
    
    s_data = kwargs['data']
    s_comId = s_data['COM_ID']
    s_dbMng = WpDataBaseManagement('meta')
    s_userno = kwargs['userno']

    s_mlflow = mlflowService.mlFlowClient(s_userno)

    s_result = []
    for model in s_data['dataArray']:
        if 'COM_UUID' in model:
            s_where = {
                'UUID': model['COM_UUID']
            }
            s_modelResult = s_dbMng.select('DP_MODEL_RESULT', s_where)
            s_modelResult = json.loads(s_modelResult['MODEL_RESULT'][0])
            del s_modelResult["evaluateLog"]["result"]
            del s_modelResult["featureLog"]
            s_modelResult['ARG_TYPE'] = s_modelResult['argInfo']['ARG_TYPE']
            del s_modelResult['argInfo']
            s_result.append(s_modelResult)
        elif 'MODEL_ID' in model:
            s_modelName = model['MODEL_ID']
            s_modelVersion = model['MODEL_IDX']
            s_modelVersionInfo = s_mlflow.getModelVerion(s_modelName, s_modelVersion)
            s_runId = s_modelVersionInfo.run_id

            s_runInfo = s_mlflow.getRunInfo(s_runId)

            # metrics
            s_metrics = s_runInfo.data.metrics

            # params
            s_params = s_runInfo.data.params

            # tags
            s_tags = s_runInfo.data.tags 

            s_modelResult = {
                'modelname': model['MODEL_NM'].split('(')[0].strip(),
                'useParams': s_params,
                'evaluateLog': s_metrics,
                'scaler': s_tags['scaler'],
                'optimizer': s_tags['optimizer'],
                'ARG_TYPE': s_tags['model_type']
            }
            s_result.append(s_modelResult)

    s_dbMng.delete('DP_MODEL_RESULT', {'UUID': s_comId})
    s_data = {
                'UUID': s_comId,
                'MODEL_RESULT': json.dumps(s_result)
            }
    s_dbMng.insert('DP_MODEL_RESULT', s_data, 'single')
    s_dbMng.close()
    return 