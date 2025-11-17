import time
from config.wp import getConfig





def execute(p_dataSource, **kwargs):
    # 시작 시간.
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
    # 정형/비정형 분기
    s_structureArg = s_data['modelInfo']['STRUCTURE_YN']

    if s_structureArg == 'Y':
        from model.management.structuredModel import WiseStructuredModel
        s_wiseMm = WiseStructuredModel(p_dataSource.o_storageManager,kwargs['userno'], s_data, s_df.copy(), s_batch, s_jobId, s_workflowId)
        # 1. null값 대체 : numeric은 0, string은 제거
        s_wiseMm.controlNullData()

        # 2. 카테고리컬럼 추출 (라벨 인코딩을 위해)
        # s_wiseMm.setCategoricalColumn(s_df)
        # 군집은 이 단계에서 목표변수 제거를 넘어가야함
        s_wiseMm.setCategoricalColumn()

        # 3. 카테고리컬럼 라벨인코딩
        # s_df = s_wiseMm.setLabelEncodingData(s_df)
        s_wiseMm.setLabelEncodingData()

        # 4. 독립변수, 종속변수 설정 / 독립변수 컬럼명 기록
        # x_data, y_data = s_wiseMm.separateXYdata(s_df)
        s_wiseMm.separateXYdata()

        # 5. train-test 데이터 분할 (t-hold 일 경우에만)
        # x_train, x_test, y_train, y_test = s_wiseMm.splitTrainTestData(x_data, y_data)
        # 군집은 이 단계를 거치치 말아야함 
        s_wiseMm.splitTrainTestData()

        #6. 스케일링
        # x_train_scaled = s_wiseMm.setScaleData(x_train)
        s_wiseMm.setScaleData()

        #7. 모델훈련
        s_wiseMm.learnModel()

        #8. 모델예측
        s_wiseMm.predictModel()

        #9. 모델평가
        s_wiseMm.evaluateModel()

        #10. 모델저장
        s_wiseMm.saveModel()
    else:
        # 이미지
        if s_argType == 'Image':
            # s_df = '1111/wp_dataset/1/1'
            # s_df = s_df['filePath'][0]
            from model.management.unstructuredModel import WiseUnstructuredModel
            s_wiseMm = WiseUnstructuredModel(p_dataSource.o_storageManager,kwargs['userno'], s_data, s_df, s_batch, s_jobId, s_workflowId)
            # 1. 모델데이터셋 구성
            s_wiseMm.createModelset()

            # 2. 메타생성
            s_wiseMm.prepareMeta()

            # 3. 이미지 라벨 구성
            s_wiseMm.setImageLabel()
            
            # 4. 훈련/데이터셋 분할
            s_wiseMm.splitTrainTestData()

            # #5. 모델훈련
            s_wiseMm.learnModel()

            # #6. 모델평가
            s_wiseMm.evaluateModel()

            # #7. 모델저장
            s_wiseMm.saveModel()
        # 언어
        else:
            from model.management.structuredModel import WiseStructuredModel
            s_wiseMm = WiseStructuredModel(p_dataSource.o_storageManager,kwargs['userno'], s_data, s_df.copy(), s_batch, s_jobId, s_workflowId)
            # (언어모델) 1. 언어 모델 불러오기
            s_wiseMm.loadModel()

            # (언어모델) 2. 토크나이저 불러오기
            s_wiseMm.loadTokenizer()

            # (언어모델) 3. 학습 파라미터 설정
            s_wiseMm.setParams()

            # (언어모델) 4. 학습 데이터 전처리
            s_wiseMm.preprocessDataset()

            # (언어모델) 5. 모델 학습기 정의
            s_wiseMm.setTrainer()

            # (언어모델) 6. 모델 학습
            s_wiseMm.learnModel()
            #9. 모델평가
            s_wiseMm.evaluateModel()

            #10. 모델저장
            s_wiseMm.saveModel()


    s_result = {}

    return s_df, s_result