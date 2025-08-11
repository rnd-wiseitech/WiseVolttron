from executor2 import execute_pipeline
import sys
import json
from job.executor2 import PipelineStep
from config.wp import  getWiseDefaultStorage
from serviceData import dataSourceService

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python executor2.py <param1> <param2>")
    else:        
        s_option = json.loads(sys.argv[1])        
        s_jobParams = json.loads(sys.argv[2])
          
        s_func = ""

        o_storageInfo = getWiseDefaultStorage()
        o_dataSource = dataSourceService.dataSource(s_option["userNo"],None,s_option["storageInfo"]['type'].upper(),s_option["apiType"],s_option["storageInfo"])
        
        obj_list = []        

        for s_param in s_jobParams:
            # 함수(실행파일명) 설정
            
            s_func = s_param['action']
            
            if s_func == 'transform' or s_func == 'image-transform' :
                s_func = s_param['method']

            # 워크플로우 중간실행(상관관계 등) 위해 모드 추가
            obj_list.append(PipelineStep(s_option['mode'], s_option["apiType"],s_func,o_dataSource, s_param['parentJobId'],**s_param))

    execute_pipeline(obj_list)
