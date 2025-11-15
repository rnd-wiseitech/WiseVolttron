from dataclasses import dataclass, field
from typing import Optional, List, Any, Union
from model.algorithm.att import BaseATT
@dataclass
class ARG_PARAMETER_ATT (BaseATT):
    ARG_ID : int
    PARAM_NM : Optional[str] = None
    PARAM_DEFAULT: Optional[str] = None
    PARAM_VALUE: Optional[str] = None
    PARAM_DESC: Optional[str] = None
@dataclass
class ARG_MSTR_ATT (BaseATT):
    ARG_ID : int
    ARG_TYPE: str
    ARG_NM: str    
    ARG_FILE_NAME: str
    USE_YN: Optional[str] = None
    STRUCTURE_YN: Optional[str] = None
    REG_USER_NO: Optional[int] = None
    ARG_DESC: Optional[str] = None
    USER_MODEL_YN: Optional[str] = None

@dataclass
class REG_RESULT_ATT (BaseATT):
    accuracy : Optional[float] = None
    oob_score : Optional[float] = None
    r2_score : Optional[float] = None
    mse : Optional[float] = None
    rmse : Optional[float] = None
    mape : Optional[float] = None

@dataclass
class CLASS_RESULT_ATT (BaseATT):
    accuracy : Optional[float] = None
    precision : Optional[float] = None
    recall : Optional[float] = None
    fscore : Optional[float] = None
    support : Optional[float] = None
    
@dataclass
class CLUSTER_RESULT_ATT (BaseATT):
    score : float = None
    silhouette_coef:float = None
    cluster_center:dict =  field(default_factory=dict)
@dataclass
class OPTIMIZER_ATT (BaseATT):
    name : str = None
    type : str = None
    use :bool = False

@dataclass
class ALGORITHM_EVAL_ATT (BaseATT):
    score : float = None
    silhouette_coef:float = None
    cluster_center:dict =  field(default_factory=dict)

    accuracy : Optional[float] = None
    precision : Optional[float] = None
    recall : Optional[float] = None
    fscore : Optional[float] = None
    support : Optional[float] = None
    
    accuracy : Optional[float] = None
    oob_score : Optional[float] = None
    r2_score : Optional[float] = None
    mse : Optional[float] = None
    rmse : Optional[float] = None
    mape : Optional[float] = None
    
    featureLog:dict =  field(default_factory=dict)    
    reVal: str = None
    orgVal: str = None
    uuid: str = ''
    optParams:dict =  field(default_factory=dict)
    labelData:str = ''
@dataclass
class ALGORITHM_ATT (BaseATT):
    argorithm : ARG_MSTR_ATT
    parameter:List[ARG_PARAMETER_ATT]    
    optimizer:OPTIMIZER_ATT = field(default_factory=OPTIMIZER_ATT)    
    smote:bool = False
    imbalance:bool = False
    evalIndicator : ALGORITHM_EVAL_ATT = field(default_factory=ALGORITHM_EVAL_ATT)    
    layerInfos:Optional[List] = None
    predictData:Optional[List] = None
    originalData:Optional[List] = None
