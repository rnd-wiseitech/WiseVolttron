from typing import List, Union
import numpy as np
import pandas as pd
import json
from skopt import BayesSearchCV
from skopt.space import Real, Categorical, Integer
from sklearn.metrics import precision_recall_fscore_support,r2_score,mean_squared_error,accuracy_score,confusion_matrix
# from permetrics.regression import Metrics
from permetrics import RegressionMetric
from sklearn.metrics import silhouette_score
from sklearn.tree import DecisionTreeClassifier
from scipy.stats import uniform
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.model_selection import KFold, StratifiedKFold, LeaveOneOut, cross_val_predict
from dataclasses import dataclass, fields
from model.algorithm.att.WP_TRAIN_MODEL_ATT import ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT
import importlib
import os

def getCrossValidationPredict(p_partition, p_argInfo):
    if p_partition.type == 't-cv':
        if p_argInfo.ARG_TYPE == 'Classification':
            s_fold = StratifiedKFold(n_splits=int(p_partition.value), shuffle=True)
        else: 
            s_fold = KFold(n_splits=int(p_partition.value), shuffle=True) 
    else:
        s_fold = LeaveOneOut()

    return s_fold

def getArgParam(p_parameter, p_model=None):
    s_argParam = {}
    for param in p_parameter:
        # 각 파라미터의 이름과 값 추출
        name = param.name
        value = param.value
        
        # 타입에 따라 값 변환 (integer/float 타입 처리)
        if param.type == 'integer' or  param.type == 'INT' :
            value = int(value)
        elif param.type == 'float' or  param.type == 'FLOAT' :
            value = float(value)
        
        # 딕셔너리에 추가
        s_argParam[name] = value

    # random_state
    # 몇몇 알고리즘은 random_state 파라미터 들어가면 오류남 EX) DBSCAN, SVR, DQN 등등 
    # p_argId 일때
    # if not p_model in [1011]:
    # p_model 일때
    if p_model is not None and 'dbscan' not in str(p_model):
        s_argParam['random_state'] = 42

    return s_argParam

def getBasicModel(p_model, p_parameter:List[Union[ARG_PARAMETER_ATT, ARG_ENSEMBLE_PARAMETER_ATT]], p_argId):
    # 언어모델
    if p_argId in [3000, 3001]:
        return getArgParam(p_parameter, p_model)
    # 앙상블 아닐 경우
    elif p_argId not in [2000, 2001]:
        # DBSCAN에서 random_state 파라미터 때문에 p_model 매개변수 추가
        return p_model().set_params(**getArgParam(p_parameter, p_model))
    # 앙상블
    else:
        o_estimators = []
        for index, estimator in enumerate(p_parameter):
            s_className = estimator.ARG_FILE_NAME
            s_classType = estimator.ARG_TYPE
            s_spec = importlib.util.spec_from_file_location(s_className,f"{os.path.dirname(os.path.dirname(os.path.realpath(__file__)))}/model/algorithm/{s_classType}/{s_className}.py")
            s_model = importlib.util.module_from_spec(s_spec)
            s_spec.loader.exec_module(s_model)
            s_argorithm = getattr(s_model, s_className)(estimator.parameter, None, None).o_argorithm
            s_argorithm = s_argorithm().set_params(**getArgParam(estimator.parameter, s_argorithm))
            o_estimators.append((f'{index+1}{estimator.ARG_NM}', s_argorithm))

        return  p_model.set_params(estimators=o_estimators)

def getOptimizerModel(p_model, p_parameter, p_optimizer):
    # 옵티마이저 parameter 설정
    s_searchSpace = {}

    # 옵티마이저 모델 설정
    if p_optimizer.type == 'Bayesian':
        # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = Categorical(param.value)
            elif param.type == 'integer':
                s_searchSpace[param.name] = Integer(int(param.value[0]), int(param.value[1]))
            elif param.type == 'float':
                s_searchSpace[param.name] = Real(float(param.value[0]), float(param.value[1]))
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
            
        return BayesSearchCV(p_model(), s_searchSpace, random_state=42)
    
    elif p_optimizer.type == 'Grid':
         # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = param.value
            elif param.type == 'integer':
                s_searchSpace[param.name] = list(range(int(param.value[0]), int(param.value[1])+1))
            elif param.type == 'float':
                s_searchSpace[param.name] = [float(param.value[0]),(float(param.value[0])+float(param.value[1]))/2, float(param.value[1])]
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
        return GridSearchCV(p_model(), s_searchSpace)
    
    elif p_optimizer.type == 'Random':
        # 옵티마이저 parameter 설정
        for param in p_parameter:
            if param.type == 'string':
                s_searchSpace[param.name] = param.value
            elif param.type == 'integer':
                s_searchSpace[param.name] = range(int(param.value[0]), int(param.value[1])+1)
            elif param.type == 'float':
                s_searchSpace[param.name] = uniform(loc = float(param.value[0]), scale=float(param.value[1]))
            else:
                raise ValueError(f"Unsupported parameter type: {param.type}")
            
        return RandomizedSearchCV(p_model(), s_searchSpace, random_state=42)



'''
모델 파라미터 정재
p_argParam : 모델 파라미터
'''
def getArgParamList(p_argParam):
    p_output = dict()
    
    for param in p_argParam:
        if not param['PARAM_VALUE'] == '':
            p_output[param['PARAM_NM']] = param['PARAM_VALUE']
        else :
            p_output[param['PARAM_NM']] = param['PARAM_DEFAULT']
    
    return p_output



'''
모델평가지표 계산
p_argType: 알고리즘 타입
p_y_test: 실제 y값
p_y_predict: 예측 y값
p_le: 라벨인코더
'''
def getEvalIndicator(p_argType, p_y_test, p_y_predict, p_le=None):
    # 최종 결과 담길 변수
    s_output = {}
    ## pY list 형
    ## pPredicted ndarray
    if p_argType == 'Classification':
        
        s_precision, s_recall, s_fscore, s_support = precision_recall_fscore_support(p_y_test, p_y_predict, average=None)
        s_confusionData = confusion_matrix(p_y_test, p_y_predict)
        s_accuracy = accuracy_score(p_y_test, p_y_predict)

        try:
            s_confusionMatrix = pd.DataFrame(
                s_confusionData, columns=p_le.classes_, index=p_le.classes_)
        except Exception as ex:
            s_confusionMatrix = pd.DataFrame(s_confusionData, columns=p_le.classes_[:len(s_confusionData)], index=p_le.classes_[:len(s_confusionData)])

        s_output = {"reVal": s_confusionMatrix.to_json(orient='split'), "accuracy": s_accuracy, "precision": s_precision.tolist(), "recall": s_recall.tolist(), "fscore": s_fscore.tolist(), "support": s_support.tolist()}
        

    elif p_argType == 'Regression':
        
        s_test_score = r2_score(p_y_test, p_y_predict)
        if np.isnan(s_test_score) :
            s_test_score = 0

        s_mse = mean_squared_error(p_y_test, p_y_predict)
        if np.isnan(s_mse) :
            s_mse = 0

        s_rmse = np.sqrt(s_mse)
        if np.isnan(s_rmse) :
            s_rmse = 0
            
        # #34
        # s_tmpMtrc = Metrics(np.array(p_y_test), np.array(p_y_predict))
        s_tmpMtrc = RegressionMetric(np.array(p_y_test), np.array(p_y_predict))
        s_mape = s_tmpMtrc.mean_absolute_percentage_error() *100
        s_accuracy = 100 - s_mape
        # diff = np.divide((pY - pPredicted), pY,out=np.zeros_like(pPredicted), where=pY != 0)
        # diff[diff == -inf] = 0
        # diff = np.nan_to_num(diff)
        # mape = np.mean(np.abs(diff)) * 100
        
        if np.isinf(s_mape):
            print("mape infff")
            s_mape = 100
            

        if s_accuracy < 0 :
            s_accuracy = 0

        if len(p_y_predict) > 1000:
            try:
                p_y_predict = p_y_predict[:1000]
                p_y_test = p_y_test[:1000]
            except Exception as ex:
                print('에러가 발생 했습니다', ex)
                
        # WP-155 결과 테이블 소숫점 자리 2 자리 까지만 저장
        s_reVal = list(map(lambda x: round(x, 2), p_y_predict.astype(float)))
        s_orgVal = list(map(lambda x: round(x, 2), p_y_test))
        
        s_output = {
            "reVal": json.dumps(s_reVal), 
            "orgVal": json.dumps(s_orgVal), 
            "oob_score": "", "test_score": s_test_score, "mse": s_mse, "rmse": s_rmse, "mape": s_mape, "accuracy":s_accuracy}

    # Cluster는 사용하지 않음
    elif p_argType == 'Clustering':

        s_score = silhouette_score(p_y_test, p_y_predict, metric='euclidean')
        s_output = {"score":s_score}
    else:
        s_output = {}

    return s_output

"""
# 모델 학습 분할 방법 ( t-cv : 교차 검증, t-holdout : 학습-평가, t-loocv : )
p_modelType : 모델 타입
p_holdoutType : 검증데이터 비율 설정 타입
p_model : 사용할 모델
p_x_train : 교차 검증 (t-cv, t-loocv) 일 때 사용할 전체 데이터셋
p_y_train : 교차 검증 (t-cv, t-loocv) 일 때 사용할 전체 데이터셋
p_x_test : 학습 평가 (t-holdout) 일 때 사용할 데이터셋
p_foldCnt : 교차 검증 (t-cv) 일 때 필요한 비율 값
"""
def getHoldOut(p_modelType, p_holdoutType, p_model, p_x_train, p_y_train, p_x_test, p_foldCnt=0):
     # 학습-평가 데이터 분할
    if p_holdoutType == 't-holdout':
        s_y_predict = p_model.predict(p_x_test)
    else :
        # K-Fold 교차 검증
        if p_holdoutType == 't-cv':
            if p_modelType == 'classifier' :
                s_cvValue = StratifiedKFold(n_splits=int(p_foldCnt), shuffle=True)
            else :
                s_cvValue = KFold(n_splits=int(p_foldCnt), shuffle=True)         
        # Leave One Out 교차 검증
        elif p_holdoutType == 't-loocv':
            s_cvValue = LeaveOneOut()
        s_y_predict = cross_val_predict(p_model, p_x_train, p_y_train, cv=s_cvValue)
   
    return s_y_predict


def getPyTorchOptimizer(p_optimizer, p_model, lr=0.001):
    import torch.optim as optim
    s_optimizers = {
        "adam": optim.Adam(p_model.parameters(), lr=lr),
        "sgd": optim.SGD(p_model.parameters(), lr=lr),
        "rmsprop": optim.RMSprop(p_model.parameters(), lr=lr),
        "adagrad": optim.Adagrad(p_model.parameters(), lr=lr),
        "adamw": optim.AdamW(p_model.parameters(), lr=lr)
    }
    return s_optimizers[p_optimizer.lower()]

def getPyTorchLoss(p_loss):
    import torch.nn as nn
    losses = {
        # 분류용
        "categorical_crossentropy": nn.CrossEntropyLoss(),
        "sparse_categorical_crossentropy": nn.CrossEntropyLoss(),  # 보통 PyTorch에선 이걸 쓰면 됨
        "binary_crossentropy": nn.BCELoss(),
        # 회귀용
        "mse": nn.MSELoss(),     # Mean Squared Error
        "mae": nn.L1Loss(),      # Mean Absolute Error
        "huber": nn.HuberLoss() # Huber Loss
    }
    return losses[p_loss.lower()]

# =============== 재학습 판단 (학습 시 기준값 생성 / 예측 시 변화율 비교) ===============
"""검증 데이터 예측값으로 PSI bin 경계 계산"""
def computeQuantileBins(values, n_bins=10):
    qs = np.linspace(0, 1, n_bins + 1)
    edges = np.quantile(values, qs)
    edges = np.unique(edges)
    if len(edges) < 3:  # 값이 모두 같을 때 대비
        vmin, vmax = float(np.min(values)), float(np.max(values))
        if vmin == vmax:
            vmax = vmin + 1e-6
        edges = np.array([vmin, (vmin + vmax) / 2, vmax], dtype=float)
    return edges

"""주어진 bin 경계로 분포 비율 계산"""
def distInBins(values, edges, eps=1e-8):
    counts, _ = np.histogram(values, bins=edges)
    probs = counts / (len(values) + eps)
    probs = np.maximum(probs, eps)
    probs = probs / probs.sum()
    return probs


"""
회귀분석 재학습 판단 기준값 생성
y_pred_ref: 검증 데이터 예측값 (numpy array or list)
n_bins: PSI 계산용 bin 개수
"""
def getRegRetrainCriteria(y_pred_ref, n_bins=10):
    y = np.asarray(y_pred_ref).ravel()

    # 1) TVD용: PSI와 동일한 고정 bin 경계 + 기준 비율(분포 히스토그램)
    bin_edges = computeQuantileBins(y, n_bins=n_bins)
    expected_probs = distInBins(y, bin_edges)

    # 2) 스케일 비교용: 표본 표준편차(ddof=1)
    baseline_std = float(np.std(y, ddof=1)) if y.size > 1 else 0.0

    # 3) W1/IQR 및 스케일(IQR) 비교용 분위수
    #    p10, p25, p50, p75, p90만 저장
    qps = [10, 25, 50, 75, 90]
    quants = {f"p{p}": float(np.quantile(y, p/100.0)) for p in qps}
    iqr = float(max(quants["p75"] - quants["p25"], 1e-12))

    return {
        "psi": {
            "bin_edges": list(map(float, bin_edges)),
            "expected_probs": list(map(float, expected_probs))
        },
        "shift": {
            "baseline_std": baseline_std
        },
        "quantiles": {
            **quants,
            "iqr": iqr
        }
    }


def getClassRetrainCriteria(p_y_proba):
    """
    분류모델 재학습 판단용 '최소 참조값' 저장.
    ① 분포(TVD %) 기준, ② 신뢰도 분위수(W1/IQR %), ③ 불확실성(엔트로피) 분위수(W1/IQR %)
    """
    import numpy as np

    EPS = 1e-12
    QGRID = np.array([0.10, 0.25, 0.50, 0.75, 0.90], dtype=float)  # 10/25/50/75/90 분위수

    y = np.asarray(p_y_proba, dtype=np.float32)
    if y.ndim != 2 or y.size == 0:
        raise ValueError("p_y_proba must be a non-empty 2D array [N, K].")

    N, K = y.shape
    label_order = list(range(K))

    # ① 클래스 분포(soft prior)
    expected_prior = y.mean(axis=0).astype(float).tolist()

    # ② 신뢰도(최대 확률) 분위수 요약
    conf = y.max(axis=1)                                    # (N,)
    conf_q = np.quantile(conf, QGRID).astype(float).tolist()
    q25, q75 = np.quantile(conf, [0.25, 0.75])
    conf_iqr = float(max(float(q75 - q25), EPS))

    # ③ 불확실성(정규화 엔트로피) 분위수 요약
    #    H = -∑ p_k log(p_k),  H_norm = H / log(K) ∈ [0,1]
    H = -(y * np.log(y + EPS)).sum(axis=1)                  # (N,)
    H_norm = H / np.log(K)
    H_q = np.quantile(H_norm, QGRID).astype(float).tolist()
    H_q25, H_q75 = np.quantile(H_norm, [0.25, 0.75])
    H_iqr = float(max(float(H_q75 - H_q25), EPS))
    

    return {
        "psi": {
            "expected_prior": expected_prior,
            "label_order": label_order,
        },
        "confidence_ref": {
            "q_grid": QGRID.astype(float).tolist(),
            "quantiles": conf_q,
            "iqr": conf_iqr
        },
        "uncert_ref": {  # NEW: 엔트로피 기준
            "q_grid": QGRID.astype(float).tolist(),
            "quantiles": H_q,
            "iqr": H_iqr,
        },
    }

"""
군집 모델 재학습 판단을 위한 '최소 기준치'만 저장.
- (1) 클러스터 혼합비(사전확률) 기준
- (2) 품질 지표(실루엣, 군집 수)
알고리즘 4종(KMeans, K-Medoids, GaussianMixture, DBSCAN) 공통으로 사용.
"""
def getClusterRetrainCriteria(
    y_ref,          # 전체 데이터의 군집 라벨 (DBSCAN은 -1 포함 가능)
    algo_name,        # 'dbscan' / 'kmeans' / 'k-medoids' / 'gaussian' 등
    silhouette=None  # 미리 계산한 실루엣(없으면 None)
):
    y = y_ref
    is_dbscan = 'dbscan' in str(algo_name).lower()

    if is_dbscan:
        noise_rate = float((y == -1).mean())
        y_eff = y[y >= 0]            # 노이즈 제외한 라벨로 분포 계산
    else:
        noise_rate = 0.0
        y_eff = y

    label_order = np.unique(y_eff)
    counts = np.array([(y_eff == l).sum() for l in label_order], dtype=float)
    expected_prior = (counts / counts.sum()) if counts.sum() > 0 else np.array([])
    n_clusters = int(len(label_order))

    return {
        "psi": {
            "expected_prior": expected_prior.tolist(),                   # 분포 기준
            "label_order": label_order.astype(int).tolist() if label_order.size else [],
            "noise_rate": noise_rate                                     # DBSCAN만 의미 있음
        },
        "quality_ref": {
            "silhouette": float(silhouette) if silhouette is not None else None,
            "n_clusters": n_clusters
        }
    }

def checkRegRetrain(p_ref, p_y, p_threshold, p_n, eps=1e-12):
    """
    재학습 판단 (간소화판)
    사용 지표(모두 %):
      - mass_moved_pct  : TVD 기반 분포 질량 이동 비율
      - w1_robust_pct   : (p10,p25,p50,p75,p90) W1/IQR 정규화
      - scale_change_pct: 표준편차/ IQR 변화 중 큰 값
    최종 판단: drift_pct = max(위 3개) >= ui_threshold_pct
    """
  
    # --- ref 꺼내기 ---
    edges   = np.array(p_ref["psi"]["bin_edges"], float)
    probs   = np.array(p_ref["psi"]["expected_probs"], float)
    s0      = float(p_ref["shift"]["baseline_std"])
    q       = p_ref["quantiles"]
    iqr_ref = float(q["iqr"])

    # 수치 안정성
    s0      = max(s0, eps)
    iqr_ref = max(iqr_ref, eps)

    # --- 히스토그램 기반: TVD(%)
    counts, _ = np.histogram(p_y, bins=edges)
    p_new = counts.astype(float) / max(p_n, 1)

    # smoothing & normalize (ref/new 동일 규칙)
    s_ref = np.maximum(probs, eps); s_ref /= s_ref.sum()
    p_new = np.maximum(p_new, eps); p_new /= p_new.sum()

    tvd_change_pct = 100.0 * 0.5 * np.abs(p_new - s_ref).sum()

    # --- W1(5-분위)/IQR (%): p10,p25,p50,p75,p90
    p_list    = [10, 25, 50, 75, 90]
    q_ref_vec = np.array([q[f"p{p}"] for p in p_list], float)
    q_new_vec = np.quantile(p_y, np.array(p_list) / 100.0)
    w1_iqr_change_pct = 100.0 * float(np.mean(np.abs(q_new_vec - q_ref_vec))) / iqr_ref

    # --- 스케일 변화(%): std vs IQR 중 큰 값
    std_new        = float(np.std(p_y, ddof=1)) if p_n > 1 else 0.0
    std_change_pct = 100.0 * abs(std_new / s0 - 1.0)

    iqr_new = float(np.quantile(p_y, 0.75) - np.quantile(p_y, 0.25))
    iqr_new = max(iqr_new, eps)
    iqr_scale_pct = 100.0 * abs(iqr_new / iqr_ref - 1.0)

    scale_change_pct = max(std_change_pct, iqr_scale_pct)

    # --- 종합 변화율 & 최종 판단 ---
    score = max(tvd_change_pct, w1_iqr_change_pct, scale_change_pct)
    relearn   = bool(score >= p_threshold)

    return {
        "relearn": relearn,
        "threshold": float(p_threshold),
        "score": round(float(score), 2),
        "tvd_change": round(float(tvd_change_pct), 2),
        "w1_iqr_change": round(float(w1_iqr_change_pct), 2),
        "scale_change": round(float(scale_change_pct), 2)
        
    }


def checkClassRetrain(p_ref, p_y, p_threshold, p_n, min_scale=1e-3, eps=1e-12):
    """
    분류 재학습 판단 (간소화판)
    사용 지표(모두 %):
      - tvd_change              : 클래스 사전분포(TVD) 변화율
      - conf_w1_iqr_change      : max-prob 분위수(W1) / IQR 변화율
      - uncert_w1_iqr_change    : 정규화 엔트로피 분위수(W1) / IQR 변화율
    최종 판단: score = max(위 3개)  >= p_threshold  →  relearn=True
    """
    import numpy as np

    # ---- 입력 검증 ----
    if p_y.ndim != 2 or p_n == 0:
        raise ValueError("p_y_proba must be a non-empty 2D array [N, K].")
    N, K = p_y.shape

    # ---- ① TVD 기반 분포 변화(%): soft prior 비교 ----
    prior_ref = np.asarray(p_ref["psi"]["expected_prior"], dtype=np.float64)
    if prior_ref.size != K:
        raise ValueError(f"ref prior length {prior_ref.size} != K {K}. (label order mismatch)")
    prior_new = p_y.mean(axis=0, dtype=np.float64)
    tvd_change = 100.0 * 0.5 * np.abs(prior_new - prior_ref).sum()

    # ---- ② 신뢰도(max prob) 분위수 W1/IQR (% ) ----
    conf = p_y.max(axis=1)  # (N,)
    q_grid_c = np.asarray(p_ref["confidence_ref"]["q_grid"], dtype=np.float64)
    Q_ref_c  = np.asarray(p_ref["confidence_ref"]["quantiles"], dtype=np.float64)
    if q_grid_c.size != Q_ref_c.size:
        raise ValueError("confidence_ref q_grid and quantiles size mismatch.")
    Q_new_c  = np.quantile(conf, q_grid_c).astype(np.float64)
    w1_c = float(np.trapz(np.abs(Q_ref_c - Q_new_c), q_grid_c))   # 1D W1 근사
    # 스케일(분모) 하한 적용
    conf_iqr_ref = float(p_ref["confidence_ref"]["iqr"])
    q25_c, q75_c = np.quantile(conf, [0.25, 0.75])
    conf_iqr_new = float(q75_c - q25_c)
    scale_conf = max(conf_iqr_ref, conf_iqr_new, min_scale, eps)
    conf_w1_iqr_change = 100.0 * (w1_c / scale_conf)

    # ---- ③ 불확실성(정규화 엔트로피) 분위수 W1/IQR (% ) ----
    # H = -∑ p_k log(p_k),  H_norm = H / log(K) ∈ [0,1]
    H = -(p_y * np.log(p_y + eps)).sum(axis=1)
    H_norm = H / np.log(K)
    q_grid_u = np.asarray(p_ref["uncert_ref"]["q_grid"], dtype=np.float64)
    Q_ref_u  = np.asarray(p_ref["uncert_ref"]["quantiles"], dtype=np.float64)
    if q_grid_u.size != Q_ref_u.size:
        raise ValueError("uncert_ref q_grid and quantiles size mismatch.")
    Q_new_u  = np.quantile(H_norm, q_grid_u).astype(np.float64)
    w1_u = float(np.trapz(np.abs(Q_ref_u - Q_new_u), q_grid_u))
    H_iqr_ref = float(p_ref["uncert_ref"]["iqr"])
    H_q25, H_q75 = np.quantile(H_norm, [0.25, 0.75])
    H_iqr_new = float(H_q75 - H_q25)
    scale_uncert = max(H_iqr_ref, H_iqr_new, min_scale, eps)
    uncert_w1_iqr_change = 100.0 * (w1_u / scale_uncert)

    
    # ---- 종합 & 최종 판단 ----
    score = max(tvd_change, conf_w1_iqr_change, uncert_w1_iqr_change)
    relearn = bool(score >= p_threshold)



    return {
        "relearn": relearn,
        "threshold": float(p_threshold),
        "score": round(float(score), 2),
        "tvd_change": round(float(tvd_change), 2),
        "conf_w1_iqr_change": round(float(conf_w1_iqr_change), 2),
        "uncert_w1_iqr_change": round(float(uncert_w1_iqr_change), 2)
    }

def checkClusterRetrain(
    p_ref,     
    p_predict_label,
    p_predictDf,
    p_threshold,                       # {'psi': {'expected_prior':[...], 'label_order':[...]} , 'quality_ref': {'silhouette': float}}
    max_sil_samples=1000,
    random_state=42,
    metric='euclidean'
):
    n_total = len(p_predict_label)

    # --- 신규 라벨 분포
    uniq_new, cnt_new = np.unique(p_predict_label, return_counts=True)
    prior_new = cnt_new / cnt_new.sum() if cnt_new.sum() > 0 else np.array([])

    # --- ref 라벨 분포
    ref_order = [int(x) for x in p_ref['psi']['label_order']]
    prior_ref = np.asarray(p_ref['psi']['expected_prior'], dtype=float)
    prior_ref = prior_ref / prior_ref.sum() if prior_ref.sum() > 0 else prior_ref

    # --- union 순서 (ref 우선)
    union_order = ref_order + [int(x) for x in uniq_new if int(x) not in ref_order]

    ref_map = {lbl: prior_ref[i] for i, lbl in enumerate(ref_order)}
    new_map = {int(lbl): float(p) for lbl, p in zip(uniq_new, prior_new)}
    ref_vec = np.array([ref_map.get(lbl, 0.0) for lbl in union_order], dtype=float)
    new_vec = np.array([new_map.get(lbl, 0.0) for lbl in union_order], dtype=float)

    # --- 분포 변화율 (TVD% = %p 총변동의 절반)
    tvd = 0.5 * np.abs(new_vec - ref_vec).sum()
    dist_change_pct = tvd * 100.0

    # --- 실루엣 (유효성 체크는 호출부에서 함)
    X_arr = p_predictDf.values if hasattr(p_predictDf, 'iloc') else np.asarray(p_predictDf)
    if n_total > max_sil_samples:
        rng = np.random.RandomState(random_state)
        idx = rng.choice(n_total, max_sil_samples, replace=False)
        Xs, ys = X_arr[idx], p_predict_label[idx]
    else:
        Xs, ys = X_arr, p_predict_label

    sil_new = float(silhouette_score(Xs, ys, metric=metric))
    sil_ref = float(p_ref.get('quality_ref', {}).get('silhouette', 0.0))
    sil_change_pct = (sil_new - sil_ref) / sil_ref * 100.0 if sil_ref > 0 else 0.0

    # --- 최종 판정
    score = max(dist_change_pct, abs(sil_change_pct))
    relearn = bool(score >= p_threshold)

    return {
        'relearn': relearn,
        'threshold': p_threshold,
        'score': round(score, 2),
        'silhouette_change': round(sil_change_pct, 2),
        'dist_change': round(dist_change_pct, 2),
    }

