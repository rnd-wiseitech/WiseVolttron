from serviceModel import analyticJobService



def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_modelname = s_data['modelName']
    s_userno = kwargs['userno']
    s_workflowId = kwargs['data']['workflowId']
    s_batch = kwargs.get('batch', False)
 

    
    s_modelResultList = []
    # 비교 대상 컴포넌트의 학습 결과 조회
    s_modelResultList = analyticJobService.getModelResult(s_data['dataArray'], s_data['filterOpt'], s_userno)   

    # 학습 결과로 가장 성능이 좋은 모델 조회
    s_bestModelInfo = analyticJobService.getBestModelData(s_modelResultList, s_data['filterOpt'])
    # 최고 성능모델 저장
    analyticJobService.saveFilterModel(s_bestModelInfo, s_modelname, s_userno, s_workflowId, p_dataSource)
