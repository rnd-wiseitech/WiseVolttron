from dataclasses import dataclass, field
from typing import Optional, List, Any, Union
from model.algorithm.att import BaseATT

@dataclass
class MODEL_ATT (BaseATT):
    PARAM_NM : Optional[str] = None
    PARAM_DEFAULT: Optional[str] = None
    PARAM_VALUE: Optional[str] = None
    PARAM_DESC: Optional[str] = None