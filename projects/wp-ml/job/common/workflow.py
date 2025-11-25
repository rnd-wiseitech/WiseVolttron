import pandas as pd
import subprocess
import json
import traceback
def execute(p_dataSource, **kwargs):

    s_data = kwargs['data']



    # 파일 실행
    s_batchResult = subprocess.Popen(['python', s_data['filepath'], s_data['param']],stderr=subprocess.PIPE,stdout=subprocess.PIPE)
    print("새로 실행된 프로세스 PID:", s_batchResult.pid)
    # s_batchResult.wait()
    stdout, stderr = s_batchResult.communicate()
    # 에러 날 경우
    if s_batchResult.returncode != 0:
        # raise Exception(stderr.decode("utf-8"))
        stderr_str = stderr.decode("utf-8", errors="ignore")
        lines = stderr_str.strip().split("\n")
        last_idx = max((i for i, line in enumerate(lines) if 'wp-ml' in line), default=None)
        if last_idx is not None:
            # 마지막으로 나온 'C:/prophet' 줄부터 끝까지 가져오기
            important_lines = lines[last_idx:]
            core_message = "\n".join(important_lines)
        else:
            # 못 찾으면 전체 stderr 출력
            error_lines = [l for l in lines if "Exception" in l or "Error" in l or "Traceback" in l]
            core_message = "\n".join(error_lines)

        s_workflowName='None'
        try:
            s_workflowName = s_data['filepath'].split('/')[-1]
        except:
            pass
        # 핵심 에러로 raise
        raise Exception(s_workflowName +":" + core_message)

    return None