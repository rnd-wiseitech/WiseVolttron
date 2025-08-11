    

from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import deque, defaultdict
import json
from job.error import WpError
import importlib.util
import sys
import copy
from database.manager import WpDataBaseManagement
from datetime import datetime
import asyncio
import os 
from serviceCommon import commonService
from serviceUtil.process import savePid
from threading import Lock
import pytz


# mlflow는 멀티스레드 불가. 전역으로 run 상태를 저장하기 때문.
mlflow_lock = Lock()  # 전역 락 선언

def safe_step_run(step):
    action = step.jobParam.get('action')
    model_name = step.jobParam.get('data', {}).get('modelname')

    # 조건에 따라 직렬 실행
    if action == 'model-train' and model_name not in (None, '', 'null'):
        with mlflow_lock:
            return step.run()
    else:
        return step.run()
    
class PipelineStep():
    # 중간실행 모드 추가
    def __init__(self, p_mode, p_apiType,p_funcNm,p_dataSourceMng, dependencies=None,**p_jobParam):

        self.apiType = p_apiType.lower()
        if self.apiType == '' or self.apiType == None :
            raise WpError('호출 타입을 지정하지 않았습니다.')
        elif self.apiType != 'spark' and self.apiType != 'common' :
            raise WpError('없는 호출 타입 입니다.')

        s_spec = importlib.util.spec_from_file_location("execute", f"job/{self.apiType}/{p_funcNm}.py")
        self.o_func = importlib.util.module_from_spec(s_spec)
        sys.modules[s_spec.name] = self.o_func
        s_spec.loader.exec_module(self.o_func)

        self.name = p_funcNm
        self.job = self.o_func
        self.jobParam = p_jobParam
        self.dataSourceMng = p_dataSourceMng
        self.dependencies = dependencies or []
        self.mode = p_mode

    def run(self):
        try:
            # location
            s_dbMng = WpDataBaseManagement('meta')
            s_location = "unknown"
            s_action = self.jobParam['action']
            try:
                s_location = self.jobParam['location']
            except KeyError:
                self.jobParam['location'] = "unknown"
                
            try:
                s_batch = self.jobParam['batch']
            except KeyError:
                s_batch = False
                
            try:
                s_method = self.jobParam['method']
            except KeyError:
                s_method = None
            
             # JOB_SUM_MSTR 대기중 -> 실행중으로 변경
            s_query = 'UPDATE JOB_SUB_MSTR SET STATUS = %s, ERROR_MSG = %s, ST_DT = %s WHERE ID = %s AND JOB_ID = %s'
            s_result = s_dbMng.o_conn.execute(s_query, (20, None, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"), self.jobParam['groupId'], self.jobParam['jobId']))

            s_userNo = str(self.jobParam['userno'])
            s_jobId = self.jobParam['jobId']
            s_groupId = self.jobParam['groupId']

            s_uuid = str(s_userNo) + "_" + str(s_groupId) + "_" + str(s_jobId)
            
            self.jobParam['viewname'] = s_uuid
            s_result = None
            s_code_result = None

            try:
                s_user_param = self.jobParam['data']['user_param']

                if s_user_param != None:
                    print("Use user_param==")
                    s_data = self.parseUserParams(self.jobParam['df'], self.jobParam['data'], self.name)
                    self.jobParam['data'] = s_data
                    
            except KeyError:
                print('==Not use user_param==')
            if self.name not in ['python', 'model-train', 'statistics', 'feature-importance', 'model-process']:
                s_df = self.job.execute(self.dataSourceMng, **self.jobParam)
            else :
                s_df, s_code_result = self.job.execute(self.dataSourceMng, **self.jobParam)
                
            # ['output', 'page', 'correlation', 'statistics', 'hive'] 는 데이터셋 저장 필요없음.
            # output은 자체 파일 안에서 저장
            if self.name not in ['chart', 'output', 'page', 'correlation', "hive", "upload", "manage", "model-filter", "model-compare", "workflow", "model-process", "stream", "model-deploy", "manifest", "model-custom", "model-predict-lang", "image-read", "readfile", "funtion"]:
                # 필터가 아닌 경우에는 단일로 바로 저장
                if self.name != 'filter':
                    s_uuid, s_viewIdx = self.dataSourceMng.addDataSet(s_df, s_userNo, s_jobId, s_groupId)
                # 필터일 경우에는 viewtable이 2개가 나와서 2번 저장 필요(prefix 추가)
                else:
                    s_filterPrefix = "true"
                    for df in s_df:
                        self.dataSourceMng.addDataSet(df, s_userNo, f'{s_jobId}_{s_filterPrefix}', s_groupId)
                        s_filterPrefix = "false"
                    s_df = s_df[0]
                    s_uuid = [f'{s_uuid}_true', f'{s_uuid}_false']
                
                # # common이면 메모리 관리를 위해 전단계 워크플로우 컴퍼넌트의 뷰테이블은 삭제함
                # if self.apiType == 'common':
                #     if 'usetable' in self.jobParam['data']:
                #         self.dataSourceMng.deleteDataSet(self.jobParam['data']['usetable'])

            
            
            if self.apiType == 'common':
                from job.common.io import result
                s_result = result.excute(s_df, s_action, self.name, s_method, s_uuid, True, s_code_result)
            else:
                from job.spark.io import result
                print("s_code_result : ", s_code_result)
                s_result = result.excute(s_df, s_action, self.name, s_method, s_uuid, True, s_code_result)     

            if self.jobParam['location'] == 'wiseprophet' :
                del s_result['data']

                s_dbMng.updateJobStatus(self.jobParam['groupId'], self.jobParam['jobId'], 40, json.dumps(s_result,cls=commonService.JsonEncoder), datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            else:
                s_dbMng.updateJobStatus(self.jobParam['groupId'], self.jobParam['jobId'], 40, None, datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"))

            return s_result
        except Exception as e:
            print("e : ", e)
            s_dbMng.updateJobStatus(self.jobParam['groupId'], self.jobParam['jobId'], 99, str(type(e)) + " : " +  str(e), datetime.now(pytz.timezone('Asia/Seoul')).strftime("%Y-%m-%d %H:%M:%S"))
            raise 

# 위상 정렬을 사용해 steps를 의존성에 따라 정렬하는 함수
def sort_pipeline_steps(steps):
    # 그래프 및 진입차수(in-degree) 테이블 초기화
    graph = defaultdict(list)  # 의존성을 저장할 그래프
    in_degree = defaultdict(int)  # 각 단계의 진입차수를 저장
    
    # 모든 단계를 순회하며 의존성 그래프 구성
    for step in steps:
        for dep in step.dependencies:
            graph[dep].append(step.name)
            in_degree[step.name] += 1
    
    # 진입차수가 0인 노드(즉, 의존성이 없는 단계)를 찾아 큐에 추가
    zero_in_degree_queue = deque([step.name for step in steps if in_degree[step.name] == 0])

    sorted_steps = []  # 정렬된 단계를 저장할 리스트
    
    while zero_in_degree_queue:
        current = zero_in_degree_queue.popleft()
        sorted_steps.append(current)

        # 현재 단계에 의존하는 모든 단계의 진입차수를 감소시키고, 진입차수가 0이 되면 큐에 추가
        for dependent in graph[current]:
            in_degree[dependent] -= 1
            if in_degree[dependent] == 0:
                zero_in_degree_queue.append(dependent)
    
    # 만약 사이클이 없고 모든 단계가 정렬되었다면 결과 반환
    if len(sorted_steps) == len(steps):
        return sorted_steps
    else:
        raise Exception("사이클이 감지되어 의존성을 해결할 수 없습니다.")

async def background_execute(p_jobOption,p_jobParams):
    try:
        # 비동기적으로 서브 프로세스를 생성
        # 환경 변수 PYTHONPATH에 'job' 폴더 추가
        env = os.environ.copy()
        env["PYTHONPATH"] = os.path.abspath(".")
        print(p_jobOption)
        process = await asyncio.create_subprocess_exec(
            'python', 'job/background_executor.py', json.dumps(p_jobOption),json.dumps(p_jobParams),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        savePid(p_jobOption['jobId'], process.pid)
        print(f"pid: {p_jobOption['jobId']}=>{process.pid} ==========")
        # 표준 출력과 표준 에러를 비동기적으로 읽기
        stdout, stderr = await process.communicate()
        # 프로세스 종료 코드 확인
        exit_code = process.returncode
        
        # 표준 출력(stdout) 출력
        if stdout:
            print(f"Standard Output for command")
            print(stdout.decode())

        # 표준 에러(stderr) 출력
        if stderr:
            print(f"Standard Error for command")
            print(stderr.decode())

        s_dbMng = WpDataBaseManagement('meta',False)

        try :
            s_transaction = s_dbMng.o_conn.begin()
            # KST 시간
            s_kst = pytz.timezone('Asia/Seoul')
            s_kstTime = datetime.now(s_kst)
            s_kstTime = s_kstTime.strftime("%Y-%m-%d %H:%M:%S")
            if exit_code == 0 :
                s_dbMng.update("JOB_MSTR",{"STATUS": 40,"END_DT" : s_kstTime},{"ID": p_jobOption['jobId']})
            else :
                s_dbMng.update("JOB_MSTR",{"STATUS": 99,"END_DT" : s_kstTime},{"ID": p_jobOption['jobId']})
                s_query = f'UPDATE JOB_SUB_MSTR SET STATUS=99, END_DT = \'{s_kstTime}\' WHERE ID=\'{p_jobOption["jobId"]}\' AND STATUS=20'
                s_dbMng.o_conn.execute(s_query)
            s_transaction.commit()
            s_dbMng.o_conn.close()

        except Exception as e:
            s_transaction.rollback()
            s_dbMng.o_conn.close()
        

        # 종료 코드 출력
        print(f"Exit Code for command : {exit_code}")
    
        return process.pid
    
    except FileNotFoundError as e:
        print(f"FileNotFoundError: {e}")
    except asyncio.CancelledError:
        print("Process was cancelled")
    except Exception as e:
        print(f"An error occurred: {e}")
# 파이프라인의 순서와 병렬 실행을 처리하는 함수
def execute_pipeline(steps):
    step_futures = {}
    completed_steps = set()
    s_result = []

    with ThreadPoolExecutor() as executor:
        while steps:
            ready_steps = [step for step in steps if all(dep in completed_steps for dep in step.dependencies)]
            s_groupId = ''
            for step in ready_steps:
                s_groupId = step.jobParam['groupId']
                future = executor.submit(safe_step_run, step)  # ✅ 여기만 바꿈
                step_futures[future] = step
                steps.remove(step)

            for future in as_completed(step_futures):
                completed_step = step_futures[future]
                result = future.result()
                print(f"Step {completed_step.name} completed with result: {result}")
                completed_steps.add(completed_step.jobParam['jobId'])
                s_result.append((completed_step.name, result))
                del step_futures[future]

                if not steps and not step_futures:
                    print("✅ 모든 step 완료됨. 마지막 step:", completed_step.name)
                    if completed_step.mode == 'excuteBefore':
                        s_key = f"{completed_step.jobParam['userno']}_{completed_step.jobParam['groupId']}_{completed_step.jobParam['jobId']}"
                        if completed_step.name == 'filter':
                            for f in ['true', 'false']:
                                completed_step.dataSourceMng.saveTempDataset(s_key + '_' + f, str(completed_step.jobParam['userno']))
                        else:
                            completed_step.dataSourceMng.saveTempDataset(s_key, str(completed_step.jobParam['userno']))
                break

    return s_result


# 사용자 매개변수 파싱(원 API 파라미터를 받아서 사용자 매개변수가 있을 경우 값을 변경함.)
# p_data 안에 있는 키값을 돌면서 user_param 값이 포함되어있으면 바꿈
def parseUserParams(self, p_df, p_data, p_type=None):
    if self.o_type == 'spark':
        from job.spark.util.user_param import getUserParamValue
    else :
        from job.common.util.user_param import getUserParamValue
    s_data = copy.deepcopy(p_data)
    # 입력 받은 사용자 파라미터들
    s_user_param_names = list(s_data['user_param'].keys())
    # 길이가 긴 것 부터 오도록 정렬.
    s_user_param_names.sort(key=lambda x: -len(x))
    s_user_param_dict = {}
    for s_param_name in s_user_param_names:
        s_paramValue = s_data['user_param'][s_param_name]
        # 실제 userparam 값으로 변환하는 부분
        s_user_param_dict[s_param_name] = getUserParamValue(p_df, {s_param_name: s_paramValue}, p_type)
    
    del s_data['user_param']
    
    # 사용자 파라미터를 제외한 기존 파라미터명 리스트
    s_data_key = list(s_data.keys())
    
    for data_key in s_data_key:
        # dataArray 일 때.
        if type(s_data[data_key]) == list:
            # dataArray 각 행의 object를 돌면서 사용자 파라미터가 있는지 확인함.
            for arrayData in s_data[data_key]:
                for s_param_name in s_user_param_names:
                    if type(arrayData) == dict or type(arrayData) == object: # dataArray 안에 objectArray로 들어가있는경우
                        for arrayData_key in (list(arrayData.keys())):
                            if s_param_name in str(arrayData[arrayData_key]):
                                arrayData[arrayData_key] = s_user_param_dict[s_param_name]
                    else : # dataArray 안에 그냥 단일 값으로 들어가있는 경우
                        if s_param_name in str(arrayData):
                            arrayData = s_user_param_dict[s_param_name]
        # 그냥 단일 값일때
        else :
            for s_param_name in s_user_param_names:
                if s_param_name in str(s_data[data_key]):
                    s_data[data_key] = s_user_param_dict[s_param_name]

    # 바뀐 파라미터 값으로 업데이트
    p_data.update(s_data)

    return p_data