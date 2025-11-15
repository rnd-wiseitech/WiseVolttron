from dataclasses import dataclass, field
from typing import Optional, List, Any, Dict
from model.algorithm.att import BaseATT

@dataclass
class DP_VAR_MSTR_ATT(BaseATT):
    MODEL_ID: Optional[int] = None
    MODEL_IDX: Optional[int] = None
    VAR_NM : Optional[str] = None
    DS_VIEW_ID: Optional[int] = None
    TBL_NM : Optional[str] = None
    COL_NM : Optional[str] = None
    VAR_TARGET_YN : Optional[str] = None
    VAR_MAJOR_YN : Optional[str] = None
    VAR_CAPTION : Optional[str] = None
    VAR_TYPE : Optional[str] = None
    DATA_TYPE : Optional[str] = None
    VAR_IMPORT : Optional[str] = None
    VAR_RANK : Optional[str] = None
    VAR_UNI_CNT : Optional[int] = None
    VAR_MISS_CNT :Optional[int] = None
    VAR_MIN : Optional[int] = None
    VAR_MAX : Optional[int] = None
    VAR_MEAN : Optional[int] = None
    VAR_STD_DEV : Optional[int] = None
    VAR_1Q : Optional[int] = None
    VAR_2Q : Optional[int] = None
    VAR_3Q : Optional[int] = None
    VAR_4Q : Optional[int] = None
    VAR_DESC : Optional[str] = None
    VAR_PRE : Optional[str] = None


@dataclass
class OPTION_TIME_ATT (BaseATT):
    range:str = None
    end:str = None
    colName:str = None

@dataclass
class OPTION_ATT (BaseATT):
    type : str = None
    value : str = None
    time : OPTION_TIME_ATT = field(default_factory=OPTION_TIME_ATT)    
@dataclass
class PARTITION_ATT (BaseATT):
    option : OPTION_ATT = field(default_factory=OPTION_ATT)    
    type : str = None
    value : str = None
    use :bool = False