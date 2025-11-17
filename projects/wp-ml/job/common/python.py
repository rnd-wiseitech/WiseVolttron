import pandas as pd
from urllib import parse
import base64
import traceback
import io
import sys 
import numpy as np
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])

    s_code = parse.unquote(base64.b64decode(s_data['value']).decode('utf-8'))
    

    
    # if s_code[0:6] == 'import' or '\r\nimport' in s_code:
    #     raise Exception("np, pd 외의 패키지는 import 할 수 없습니다.")

    # s_vars = locals()

    # s_vars["df"] = s_df

    # 사용자 전용 전역 공간
    user_globals = globals().copy()
    user_globals['df'] = s_df

    # 코드 출력 담기 위해서 stdout 할당
    s_old_stdout = sys.stdout
    s_new_stdout = io.StringIO()
    sys.stdout = s_new_stdout 

    # 코드 출력
    s_code_result = ''


    try:
        # exec(s_code, globals(), s_vars) 
        exec(s_code, user_globals) 
        s_code_result = sys.stdout.getvalue().strip()

    except SyntaxError as err:            
        s_code_result = ""
        s_code_result += str(err.__class__.__name__)             
        for v in err.args:
            if(len(s_code_result) > 0):
                s_code_result += "\n"
            s_code_result += str(v)

        s_line_number = err.lineno
        raise err

    except Exception as err:
        s_code_result = ""
        s_code_result += str(err.__class__.__name__)             
        for v in err.args:
            if(len(s_code_result) > 0):
                s_code_result += "\n"
            s_code_result += str(v)

        cl, exc, tb = sys.exc_info()
        s_line_number = traceback.extract_tb(tb)[-1][1]
        raise err

    # 파이썬 코드 실행에서 필요한 출력을 얻은 후 기존 stdout으로 다시 원복
    sys.stdout = s_old_stdout 


    # 결과 base64 인코딩 (한글 깨짐 문제로) uri encoding 후 base64로 인코딩함. 디코딩하는 쪽에서 base64디코딩 후 uri디코딩해서 사용해야 함.
    s_code_result = str(base64.b64encode(parse.quote(s_code_result).encode('utf-8')))
    s_code_result = s_code_result.replace("b'",'')
    s_code_result = s_code_result.replace("'",'')

   
    s_df = user_globals.get('df', None)

    del user_globals

    return s_df, s_code_result