#-*-coding:utf-8
import abc

from job.error import WpError
import importlib.util
import sys
import copy
from serviceUtil.process import savePid, saveSparkPid
# COMMON일 경우 schema 통일
from pandas.api.types import is_integer_dtype, is_float_dtype, is_bool_dtype
import traceback

class wpJob(metaclass=abc.ABCMeta):

    def __init__(self, p_type,p_func):
        p_type = p_type.lower()
        if p_type == '' or p_type == None :
            raise WpError('호출 타입을 지정하지 않았습니다.')
        elif p_type != 'spark' and p_type != 'common' :
            raise WpError('없는 호출 타입 입니다.')
        try:
            s_spec = importlib.util.spec_from_file_location("execute", f"job/{p_type}/{p_func}.py")
            self.o_func = importlib.util.module_from_spec(s_spec)
            sys.modules[s_spec.name] = self.o_func
            s_spec.loader.exec_module(self.o_func)
        except Exception as e:
            print(e)
    @abc.abstractmethod
    def execute(self,**kwargs):
        raise NotImplemented

def run_job(p_apieType, p_func, p_dataSource, p_params, return_dict):
    # 새로운 프로세스에서 실행되는 함수
    try:
        print('======')
        o_jobExcuter = JobExecutor(p_apieType, p_func, p_dataSource)
    except Exception as e:
        print(e)
    # job 실행
    s_json = o_jobExcuter.execute(**p_params)
    return_dict['s_json'] = s_json
    print('11111')
    return_dict['o_dataSource'] = o_jobExcuter.o_dataSourceMng

class JobExecutor(wpJob):
    def __init__(self, p_type, p_funcNm, p_dataSourceMng):
        self.o_type = p_type.lower()
        self.o_funcNm = p_funcNm
        self.o_dataSourceMng = p_dataSourceMng
        super().__init__(p_type,p_funcNm)

    def execute(self,**kwargs):

        # location
        s_location = "unknown"
        s_action = kwargs['action']
        try:
            s_location = kwargs['location']
        except KeyError:
            kwargs['location'] = "unknown"
            
        try:
            s_batch = kwargs['batch']
        except KeyError:
            s_batch = False
            
        try:
            s_method = kwargs['method']
        except KeyError:
            s_method = None
            
        s_userNo = str(kwargs['userno'])
        s_jobId = kwargs['jobId']
        s_groupId = kwargs['groupId']

        s_uuid = str(s_userNo) + "_" + str(s_groupId) + "_" + str(s_jobId)
        
        kwargs['viewname'] = s_uuid
        s_desc = f"{s_location}-{self.o_funcNm}"
        if self.o_type != 'common':
            saveSparkPid(s_uuid, s_desc, self.o_type, self.o_dataSourceMng)
        else:
             savePid(s_uuid, s_desc)
        s_result = None
        s_code_result = None

        try:
            s_user_param = kwargs['data']['user_param']

            if s_user_param != None:
                print("Use user_param==")
                s_data = self.parseUserParams(kwargs['df'], kwargs['data'], self.o_funcNm)
                kwargs['data'] = s_data
                
        except KeyError:
            print('==Not use user_param==')
        if self.o_funcNm not in ['python', 'model-train', 'feature-importance', 'model-process']:
            s_df = self.o_func.execute(self.o_dataSourceMng, **kwargs)
        else :
            s_df, s_code_result = self.o_func.execute(self.o_dataSourceMng, **kwargs)

        # ['output', 'page', 'correlation', 'statistics', 'hive'] 는 데이터셋 저장 필요없음.
        # output은 자체 파일 안에서 저장
        if self.o_funcNm not in ['eda', 'chart', 'output', 'page', 'correlation', 'statistics', "hive", "upload", "manage", "model-filter", "model-compare", "workflow", "model-process", "stream", "model-deploy", "manifest", "model-info", "model-history", "resource-model-deploy", "model-custom", "model-predict-lang", "image-read", "readfile", "function"]:
            # 필터가 아닌 경우에는 단일로 바로 저장
            if self.o_funcNm != 'filter':
                s_uuid, s_viewIdx = self.o_dataSourceMng.addDataSet(s_df, s_userNo, s_jobId, s_groupId)
            # 필터일 경우에는 viewtable이 2개가 나와서 2번 저장 필요(prefix 추가)
            else:
                s_filterPrefix = "true"
                for df in s_df:
                    self.o_dataSourceMng.addDataSet(df, s_userNo, f'{s_jobId}_{s_filterPrefix}', s_groupId)
                    s_filterPrefix = "false"
                s_df = s_df[0]
                s_uuid = [f'{s_uuid}_true', f'{s_uuid}_false']
            
        
        if self.o_type == 'common':
            from job.common.io import result
            s_result = result.excute(s_df, s_action, self.o_funcNm, s_method, s_uuid, s_batch, s_code_result)

        return s_result

    # 사용자 매개변수 파싱(원 API 파라미터를 받아서 사용자 매개변수가 있을 경우 값을 변경함.)
    # p_data 안에 있는 키값을 돌면서 user_param 값이 포함되어있으면 바꿈
    def parseUserParams(self, p_df, p_data, p_type=None):
        
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