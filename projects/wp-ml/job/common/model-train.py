import time
from config.wp import getConfig





def execute(p_dataSource, **kwargs):
    s_start = time.time() 
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    try:
        s_batch = kwargs['batch']
    except KeyError:
        s_batch = False
    
    try:
        s_jobId = kwargs['jobId']
    except KeyError:
        s_jobId = 1

    try:
        s_workflowId = kwargs['workflowId']
    except KeyError:
        s_workflowId = 1

    s_argType = s_data['modelInfo']['ARG_TYPE']
    s_structureArg = s_data['modelInfo']['STRUCTURE_YN']

    if s_structureArg == 'Y':
        from model.management.structuredModel import WiseStructuredModel
        s_wiseMm = WiseStructuredModel(p_dataSource.o_storageManager,kwargs['userno'], s_data, s_df.copy(), s_batch, s_jobId, s_workflowId)
        s_wiseMm.controlNullData()

        s_wiseMm.setCategoricalColumn()

        s_wiseMm.setLabelEncodingData()

        s_wiseMm.separateXYdata()

        s_wiseMm.splitTrainTestData()

        s_wiseMm.setScaleData()

        s_wiseMm.learnModel()

        s_wiseMm.predictModel()

        s_wiseMm.evaluateModel()

        s_wiseMm.saveModel()
    else:
        # 태그인지 라벨인지 구분
        s_argModelNm = s_data['modelInfo']['ARG_NM']
        
        if s_argType == 'Image' and s_argModelNm == 'YOLO-Class':
            from model.management.unstructuredModel import WiseUnstructuredModel
            s_wiseMm = WiseUnstructuredModel(p_dataSource.o_storageManager, kwargs['userno'], s_data, s_df, s_batch, s_jobId, s_workflowId)
            s_wiseMm.createModelset()
            
            s_wiseMm.splitTrainTestDataTag()

            # s_wiseMm.learnModelTag()
            s_wiseMm.learnModel()

            s_wiseMm.evaluateModelTag()

            # #7. 모델저장
            s_wiseMm.saveModel()
        # 언어

    s_result = {}

    return s_df, s_result