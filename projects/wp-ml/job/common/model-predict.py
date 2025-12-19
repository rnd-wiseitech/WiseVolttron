

import json
from sklearn.preprocessing import LabelEncoder
from serviceMlflow import mlflowService 
from serviceModel import analyticJobService
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, MaxAbsScaler, Normalizer
import pandas as pd
import numpy as np
import os
from serviceUtil import algorithmService 
from database.manager import WpDataBaseManagement
from datetime import datetime
import pytz
from pathlib import Path
import gc

def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_modelId = s_data.get('modelId', '')
    s_modelIdx = s_data.get('modelIdx', '')
    s_customYn = s_data.get('customYn', 'N')
    s_userno = kwargs['userno']
    s_workflowId = kwargs['workflowId']
    s_checkRelearn = s_data.get('checkRelearn', False)
    s_threshold = float(s_data.get('threshold', 1.0))
    s_relearnValue = None
    s_argId = s_data.get('argId', '')

    # mlflow 세팅
    s_mlflow = mlflowService.mlFlowClient(s_userno)
    

    # 모델 로드
    s_model = s_mlflow.loadModel(s_modelId, s_modelIdx)

    # 모델정보 가져오기
    s_runId = s_model.metadata.run_id
    s_runInfo = s_mlflow.getRunInfo(s_runId)

    # CONFIG 파일 가져오기
    s_config = s_mlflow.loadConfig(s_model.metadata.artifact_path)

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
                s_path = s_model.metadata.artifact_path
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

            if s_tags['scaler'] != 'NoneType':
                s_scaler = s_mlflow.loadScaler(s_model.metadata.artifact_path, p_dataSource.o_storageManager.o_wpStorage)
                s_predictDf = s_scaler.transform(s_predictDf)

        else:
            s_scalerName = s_tags['scaler']
            try:
                s_inputSchema = s_model.metadata.get_input_schema()
                s_inputSchema = [col.name for col in s_inputSchema.inputs]
                s_predictDf = s_df[s_inputSchema]
            except:
                s_predictDf = s_df.copy()
            s_cateCol = [col for col in s_predictDf.columns if not pd.api.types.is_numeric_dtype(s_predictDf[col])]
            for col in s_cateCol:
                s_df.dropna(subset=[col], inplace=True)
                s_predictDf.dropna(subset=[col], inplace=True)
                s_encoder = LabelEncoder()
                s_predictDf[col] = s_encoder.fit_transform(s_predictDf[col])

            s_predictDf.fillna(0, inplace=True)
        
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

        if any(flavor in s_model.metadata.flavors for flavor in ["keras",  "tensorflow", "pytorch"]):
            s_predictDf = s_predictDf.astype(np.float32)

        if any(flavor in s_model.metadata.flavors for flavor in ["sklearn"]):
            s_predictDf = pd.DataFrame(s_predictDf, columns=s_inputSchema)

        # 모델 예측
        try:
            if any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch", "tensorflow"]) and s_modelType in ['Classification', 'Clustering']:
                s_predict = s_model.predict(s_predictDf).argmax(axis=1)
            elif any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch", "tensorflow"]) and s_modelType =='Reinforcement':
                s_predict = s_model.predict(s_predictDf).argmax(axis=1)
            else:
                s_predict = s_model.predict(s_predictDf)
        except:
            if any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch"]) and s_modelType =='Classification':
                s_predict = s_model.predict(s_df).argmax(axis=1)

            elif any(flavor in s_model.metadata.flavors for flavor in ["keras", "pytorch"]) and s_modelType =='LSTM':
                import torch
                gc.collect()
                torch.cuda.empty_cache()
                if s_model._model_impl.pytorch_model.enc.input_size == 1 :
                    s_predict_data = np.expand_dims(s_df.values.astype("float32"), axis=-1)
                else :
                    s_predict_data = s_df

                batch_size = 128

                gc.collect()
                torch.cuda.empty_cache()
                s_predictout = []
                for i in range(0, len(s_predict_data), batch_size):
                    batch = s_predict_data[i:i+batch_size]
                    try:
                        predict = s_model.predict(batch)
                        result = ((batch-predict)**2).mean(axis=1)
                        s_predictout.append(result)
                    except torch.cuda.OutOfMemoryError:
                        torch.cuda.empty_cache()
                        raise
                    gc.collect()
                    torch.cuda.empty_cache()
            
                s_predict = np.concatenate(s_predictout)
                s_threshold = 0.478748
                s_predict = (s_predict > s_threshold).astype(int)
                
            else:
                s_predict = s_model.predict(s_df)

        # 사이킷런 분류일 경우 proba구함
        if any(flavor in s_model.metadata.flavors for flavor in ["sklearn"]) and s_modelType =='Classification':
            s_predict_proba = s_model._model_impl.predict_proba(s_predictDf)

        # 라벨링 디코딩
        if s_modelType =='Classification' and s_customYn=='N':
            s_predict = [s_encoder[s_targetCol][label] for label in s_predict]
        
        s_df['wp_predict'] = s_predict


        if s_checkRelearn == True:
            s_relearnValue = None
            s_ref  = s_config['retrain_criteria']
            # 재학습 여부 판단
            if s_modelType == 'Regression':
                s_y = np.asarray(s_predict).ravel()
                s_n = s_y.size
                if s_n > 300:
                    s_relearnValue = algorithmService.checkRegRetrain(s_ref, s_y, s_threshold, s_n)
                print(s_relearnValue)
            elif s_modelType == 'Classification':
                s_y = np.asarray(s_predict_proba, dtype=np.float32)
                s_n = s_y.size
                if s_n > 300:
                    s_relearnValue = algorithmService.checkClassRetrain(s_ref, s_y, s_threshold, s_n)
                print(s_relearnValue)
            elif s_modelType == 'Clustering':
                s_predict_label = np.asarray(s_predict)
                if s_predict_label.size >= 2 and np.unique(s_predict_label).size >= 2:
                    s_relearnValue = algorithmService.checkClusterRetrain(s_ref, s_predict_label, s_predictDf, s_threshold)
                print(s_relearnValue)
            
            if s_relearnValue != None:
                s_relearnValue = json.dumps(s_relearnValue)
        
    # 이미지 모델일 때
    else:
        s_groupId = kwargs['groupId']
        s_jobId = kwargs['jobId']
        
        # confidence값
        s_confidence = float(s_data.get('confidence', 0.3))

        # 모델 결과 임시 저장소
        s_resultPath = f'{s_userno}/temp_result/{s_groupId}_{s_jobId}'
        # 모델 결과 임시 이미지폴더 생성
        p_dataSource.o_storageManager.createDirs(f'{s_resultPath}/images')
        p_dataSource.o_storageManager.createDirs(f'{s_resultPath}/labels')
        # 예측할 이미지 복사
        for _, file in s_df.iterrows():
            p_dataSource.o_storageManager.copyFile(file['filepath'], f'{s_resultPath}/images/'+ file['filename'])
        # s_imageList = [os.path.join(p_dataSource.o_storageManager.o_rootPath, f) for f in s_df['filepath'].tolist()]
        
        # 이 방식대로 저장하면 모든 이미지가 jpg로만 저장됨
        s_result = s_model.predict({
        "source": f'{p_dataSource.o_storageManager.o_rootPath}{s_resultPath}/images',
        "project": f'{p_dataSource.o_storageManager.o_rootPath}{s_resultPath}',
        "name":'wp_predict',
        "conf": s_confidence,
        "save": True,
        "save_txt": True
        })
        
        for r in s_result:
            orig_path = Path(r.path)
            orig_ext = orig_path.suffix.lower()  # 예: .png, .bmp 등
            save_dir = Path(r.save_dir)
            result_jpg = save_dir / f"{orig_path.stem}.jpg"

            # YOLO가 저장한 .jpg 파일을 원래 확장자로 변경
            if result_jpg.exists() and orig_ext != ".jpg":
                new_path = result_jpg.with_suffix(orig_ext)
                try:
                    result_jpg.rename(new_path)
                    # print(f"[RENAME] {result_jpg.name} → {new_path.name}")
                except Exception as e:
                    print(f"[WARN] 파일 이름 변경 실패: {result_jpg} → {new_path}, error={e}")

        rows = []
        s_resultJson = {}
        for idx, result in enumerate(s_result):
            filepath = result.path.replace("\\", "/").replace(p_dataSource.o_storageManager.o_rootPath, '')
            filename = os.path.basename(filepath)
            
            if s_argId == 4001:
                pred_idx = int(result.probs.top1)             # 가장 확률 높은 클래스 index
                predict_str = result.names[pred_idx]            # 클래스 이름
                class_count = {predict_str: 1}
            else :
                pred_classes = result.boxes.cls.cpu().numpy().astype(int)

                s_classMap = result.names
                class_names = list(s_classMap.values())

                class_count = {name: 0 for name in class_names}
                for cls_id in pred_classes:
                    cls_name = result.names[cls_id]
                    class_count[cls_name] += 1

                predict_str = ", ".join([f"{k}:{v}" for k, v in class_count.items() if v > 0])
                s_coco =analyticJobService.convertYoloToCoco(f'{p_dataSource.o_storageManager.o_rootPath}{s_resultPath}', s_classMap)
                s_ui = analyticJobService.convertCocoToUI(s_coco)
                p_dataSource.o_storageManager.writeFile(f'{s_resultPath}/labels/ui.json', s_ui, 'json')

                p_dataSource.o_storageManager.writeFile(f'{s_resultPath}/labels/coco.json', s_coco, 'json')
            s_labelpath = f'{s_resultPath}/wp_predict/labels' if predict_str else None
            
            s_dfRow = {
                "id": idx,
                "filepath": filepath,
                "predictpath": s_resultPath,
                "labelpath": s_labelpath,
                "filename": filename,
                "predict_class": predict_str
            }
            if s_argId == 4001:
                s_dfRow['tag'] = predict_str

            rows.append(s_dfRow)
            s_resultJson[filename] = {k: v for k, v in class_count.items() if v > 0}
        
        p_dataSource.o_storageManager.writeFile(f'{s_resultPath}/labels/predict.json', s_resultJson, 'json')
        s_df = pd.DataFrame(rows)


    s_dbMng = WpDataBaseManagement('meta')

    s_data = {
    'MODEL_ID': s_modelId,
    'MODEL_IDX': s_modelIdx,
    'ARG_TYPE': s_modelType,
    'WF_ID': s_workflowId,
    'HISTORY_TYPE': 'predict',
    'HISTORY_VALUE': s_relearnValue,
    'REG_USER_NO': s_userno,
    'REG_DT': datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S")
    }

    s_dbMng.insert('DP_MODEL_HISTORY', s_data, 'single')
    s_dbMng.close()
    return s_df