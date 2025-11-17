

import json
from sklearn.preprocessing import LabelEncoder
from serviceMlflow import mlflowService 
from serviceModel import analyticJobService
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
import pandas as pd
import numpy as np
import os
def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_modelId = s_data.get('modelId', '')
    s_modelIdx = s_data.get('modelIdx', '')
    s_customYn = s_data.get('customYn', 'N')
    s_userno = kwargs['userno']


    # mlflow 세팅
    s_mlflow = mlflowService.mlFlowClient(s_userno)
    

    # 모델 로드
    s_model = s_mlflow.loadModel(s_modelId, s_modelIdx)

    # 모델정보 가져오기
    s_runId = s_model.metadata.run_id
    s_runInfo = s_mlflow.getRunInfo(s_runId)

    s_tags = s_runInfo.data.tags
    s_modelType = s_tags['model_type']
    if s_modelType != 'Image':
        # WPP모델 전이학습모델
        if s_customYn =='N':
            s_encoder = json.loads(s_tags['encoder'])
            s_targetCol = s_tags['target']
            try:
                s_inputSchema = s_model.metadata.get_input_schema()
                s_inputSchema = [col.name for col in s_inputSchema.inputs]
            except:
                s_path = s_runInfo.info.artifact_uri
                s_inputSchema = s_mlflow.loadSignature(s_path)
                s_inputSchema = [col.name for col in s_inputSchema.inputs]
            # model input schema 적용 df 만들기
            try:
                s_predictDf = s_df[s_inputSchema]
            except Exception as e:
                s_predictDf = s_df.copy()
            # 카테고리컬 라벨 인코딩
            s_cateCol = list(s_encoder.keys())
            for col in s_cateCol:
                if col in s_predictDf.columns:
                    # 카테고리 컬럼 null 값은 행 제거
                    s_df.dropna(subset=[col], inplace=True)
                    s_predictDf.dropna(subset=[col], inplace=True)
                    enco = LabelEncoder()
                    enco.classes_ = s_encoder[col]
                    s_predictDf[col] = enco.transform(s_predictDf[col])
            # 숫자형은 null값 0으로 대체
            s_predictDf.fillna(0, inplace=True)

            s_scaler = s_mlflow.loadScaler(s_runInfo.info.artifact_uri, p_dataSource.o_storageManager.o_wpStorage)
            s_predictDf = s_scaler.transform(s_predictDf)
            # if "tensorflow" in s_model.metadata.flavors:
            #     s_scaler = s_mlflow.loadScaler(s_runInfo.info.artifact_uri)
            #     s_predictDf = s_scaler.transform(s_predictDf)

        # 커스텀 모델
        else:
            s_scalerName = s_tags['scaler']
            try:
                s_inputSchema = s_model.metadata.get_input_schema()
                s_inputSchema = [col.name for col in s_inputSchema.inputs]

                # model input schema 적용 df 만들기
                s_predictDf = s_df[s_inputSchema]
            except:
                s_predictDf = s_df.copy()
            # 카테고리 컬럼 추출(숫자형이 아닌 컬럼)
            s_cateCol = [col for col in s_predictDf.columns if not pd.api.types.is_numeric_dtype(s_predictDf[col])]
            # 인코딩
            for col in s_cateCol:
                s_df.dropna(subset=[col], inplace=True)
                s_predictDf.dropna(subset=[col], inplace=True)
                s_encoder = LabelEncoder()
                s_predictDf[col] = s_encoder.fit_transform(s_predictDf[col])

            # 숫자형은 null값 0으로 대체
            s_predictDf.fillna(0, inplace=True)
        
            # 스케일러 포함여부 확인
            if "sklearn" in s_model.metadata.flavors:
                s_scaler = analyticJobService.extractScalerFromPipeline(s_model._model_impl.sklearn_model)
            
            if any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch"]):
                s_scaler = None
                

            # 스케일러가 포함되지 않은 경우.
            if s_scaler == None:
                if (s_scalerName == 'MinMaxScaler'):
                    scaler = MinMaxScaler()
                    s_predictDf = scaler.fit_transform(s_predictDf)
                elif (s_scalerName == 'RobustScaler'):
                    scaler = RobustScaler()
                    s_predictDf = scaler.fit_transform(s_predictDf)
                elif (s_scalerName == 'MinMaxScaler'):
                    scaler = MaxAbsScaler()
                    s_predictDf = scaler.fit_transform(s_predictDf)
                elif (s_scalerName == 'Normalizer'):
                    scaler = Normalizer()
                    s_predictDf = scaler.fit_transform(s_predictDf)
                elif (s_scalerName == 'StandardScaler'):
                    scaler = StandardScaler()
                    s_predictDf = scaler.fit_transform(s_predictDf)

        # pytorch의 경우 타입 변경해야함.
        if any(flavor in s_model.metadata.flavors for flavor in ["keras",  "tensorflow", "pytorch"]):
            s_predictDf = s_predictDf.astype(np.float32)

        if any(flavor in s_model.metadata.flavors for flavor in ["sklearn"]):
            s_predictDf = pd.DataFrame(s_predictDf, columns=s_inputSchema)

        # 모델 예측
        try:
            if any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch", "tensorflow"]) and s_modelType =='Classification':
                s_predict = s_model.predict(s_predictDf).argmax(axis=1)
            elif any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch", "tensorflow"]) and s_modelType =='Reinforcement':
                s_predict = s_model.predict(s_predictDf).idxmax(axis=1)
            else:
                s_predict = s_model.predict(s_predictDf)
        except:
            if any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch"]) and s_modelType =='Classification':
                s_predict = s_model.predict(s_df).argmax(axis=1)
            else:
                s_predict = s_model.predict(s_df)

        # 라벨링 디코딩
        if s_modelType =='Classification' and s_customYn=='N':
            s_predict = [s_encoder[s_targetCol][label] for label in s_predict]
        
        s_df['wp_predict'] = s_predict
    
    # 이미지 모델일 때
    else:
        s_groupId = kwargs['groupId']
        s_jobId = kwargs['jobId']
        # 모델 결과 임시 저장소
        s_resultPath = f'{s_userno}/temp_result/{s_groupId}_{s_jobId}'
        # 모델 결과 임시 이미지폴더 생성
        p_dataSource.o_storageManager.createDirs(f'{s_resultPath}/images')
        # 예측할 이미지 복사
        for _, file in s_df.iterrows():
            p_dataSource.o_storageManager.copyFile(file['filepath'], f'{s_resultPath}/images/'+ file['filename'])
        # s_imageList = [os.path.join(p_dataSource.o_storageManager.o_rootPath, f) for f in s_df['filepath'].tolist()]
        s_result = s_model.predict({
        "source": f'{p_dataSource.o_storageManager.o_rootPath}{s_resultPath}/images',
        "project": f'{p_dataSource.o_storageManager.o_rootPath}{s_resultPath}',
        "name":'images',
        "conf": 0.3,
        "save": True,
        "save_txt": False
        })

        rows = []
        for idx, result in enumerate(s_result):
            # result.path로 할 경우 rootPath 붙어서 O-IMAGE-DATASOURCE 실행할 때 이미지 파일 복사하는 부분에서 오류남
            filepath = result.path.replace("\\", "/").replace(p_dataSource.o_storageManager.o_rootPath, '')
            filename = os.path.basename(filepath)

            # 예측된 클래스 리스트 (int)
            pred_classes = result.boxes.cls.cpu().numpy().astype(int)

            # 클래스 이름 추출 (from result)
            class_names = list(result.names.values())

            # 클래스별 개수 세기
            class_count = {name: 0 for name in class_names}
            for cls_id in pred_classes:
                cls_name = result.names[cls_id]
                class_count[cls_name] += 1

            # 예측 문자열
            predict_str = ", ".join([f"{k}:{v}" for k, v in class_count.items() if v > 0])

            #TODO. 라벨데이터까지 있으면 추가해야함.
            rows.append({
                "id": idx,
                "filepath": filepath,
                "filename": filename,
                "predict": predict_str
            })

        s_df = pd.DataFrame(rows)
        # print("df : ", df)
    return s_df