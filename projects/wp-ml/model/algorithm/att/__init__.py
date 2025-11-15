from dataclasses import dataclass, field, fields, is_dataclass
from typing import Optional, List, Any, Dict

# 상위 데이터 클래스
@dataclass
class BaseATT:
    def __post_init__(self):
        for f in fields(self):
            value = getattr(self, f.name)
            if isinstance(value, dict) and is_dataclass(f.type):
                # 필드가 dict이고 dataclass로 변환 가능한 경우 변환
                setattr(self, f.name, dict_to_dataclass(f.type, value))
        
    def get(self, key: str) -> Optional[Any]:
        if hasattr(self, key):
            return getattr(self, key)
        else:
            raise KeyError(f"Key '{key}' does not exist in {self.__class__.__name__}")

    def set(self, key: str, value: Any) -> None:
        if hasattr(self, key):
            setattr(self, key, value)
        else:
            raise KeyError(f"Key '{key}' does not exist in {self.__class__.__name__}")
        

def dict_to_dataclass(cls, data: dict):
    """
    주어진 dict를 주어진 dataclass로 동적으로 변환합니다.
    
    :param cls: 변환할 dataclass 클래스
    :param data: 변환할 dict
    :return: dataclass 객체
    """
    if not is_dataclass(cls):
        raise ValueError(f"{cls}는 dataclass가 아닙니다.")
    
    field_names = {f.name for f in fields(cls)}
    filtered_data = {k: v for k, v in data.items() if k in field_names}
    
    # 필드 중 dataclass 타입이 포함되어 있다면, 그 필드도 재귀적으로 처리
    for f in fields(cls):
        if is_dataclass(f.type) and f.name in filtered_data:
            filtered_data[f.name] = dict_to_dataclass(f.type, filtered_data[f.name])

    return cls(**filtered_data)