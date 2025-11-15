from dataclasses import dataclass, field
from typing import Optional, List, Union, Any, Dict
from model.algorithm.att import BaseATT

@dataclass
class ARG_MSTR_ATT(BaseATT):
    ARG_ID: int
    ARG_TYPE: str
    ARG_NM: str    
    ARG_FILE_NAME: str
    USE_YN: Optional[str] = None
    STRUCTURE_YN: Optional[str] = None
    REG_USER_NO: Optional[int] = None
    ARG_DESC: Optional[str] = None
    USER_MODEL_YN: Optional[str] = None
    OPT_YN: Optional[str] = None
    ENSEMBLE_YN: Optional[str] = None
    FRAMEWORK_TYPE: Optional[str] = None

@dataclass
class ARG_OPTIMIZER_ATT(BaseATT):
    type: str = ''
    use: bool = False

@dataclass
class ARG_PARAMETER_ATT(BaseATT):
    name: str = ''
    type: str = ''
    value: Union[str, int, float, List[Union[int, float]]] = ''
    options: List[Union[str, int, float]] = field(default_factory=list)

@dataclass
class ARG_ENSEMBLE_PARAMETER_ATT(BaseATT):
    ARG_ID: str = ''
    ARG_TYPE: str = ''
    ARG_NM: str = ''
    ARG_FILE_NAME: str = ''
    parameter: List[ARG_PARAMETER_ATT] = field(default_factory=list)

@dataclass
class ARG_PARTITION_ATT(BaseATT):
    type: str = ''
    value: Union[str, int, float] = ''

@dataclass
class WP_TRAIN_MODEL_ATT(BaseATT):
    algorithm: ARG_MSTR_ATT
    parameter: List[ARG_PARAMETER_ATT]
    optimizer: ARG_OPTIMIZER_ATT = field(default_factory=ARG_OPTIMIZER_ATT)
    scaler: str = 'Standard Scale'
    targetColumn: str = ''


@dataclass
class WP_SAVE_INFO_ATT(BaseATT):
    batch: bool = False
    comId: str = ''
    modelsave: bool = False
    modelname: str = ''
    scaler: Optional[Any] = None
    userno: str = ''
    signature: Optional[Any] = None
    encoder: Optional[Any] = None
    metaDbInfo: Optional[Any] = None
    targetCol: str = ''
    workflowId: str = ''
    model_path: Optional[str] = ''