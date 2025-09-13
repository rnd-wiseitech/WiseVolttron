
export class WpLivyScript {

    o_code: string;
    o_mlPath = global.WiseAppConfig['ML_PATH'];
    o_dsId = global.WiseAppConfig['DS_ID'];
    o_apiType = global.WiseAppConfig['API_TYPE'];
    o_storageType = global.WiseAppConfig['STORAGE_TYPE'];
    constructor(p_groupId:string, p_logId:string, p_batch:any, p_userno:number, p_userId:string, p_usermode:string, p_location: string) {
        this.o_code = `
# 코드 생성할때 기본적으로 반드시 들어가야하는 패키지 및 설정
import os
import sys
import gc
os.chdir('${this.o_mlPath}')
sys.path.append('${this.o_mlPath}')

import warnings
warnings.filterwarnings(action='ignore', category=FutureWarning) 
import livy_app as app
from serviceData import dataSourceService
from config.wp import setWiseDefaultStorage, getWiseDefaultStorage
import json
import time
from database.manager import WpDataBaseManagement

null = None
true = True
false = False
# 기본 workflow 정보
s_info = {
    "groupId": "${p_groupId}",
    "logId": ${p_logId},
    "schId" : None,
    "batch": ${p_batch},
    "userno": "${p_userno}",
    "userId": "${p_userId}",
    "usermode": "${p_usermode}",
    "location": "${p_location}",
    "core": "2",
    "memory": "1G"
}

#스케줄 실행시 받아오는 parameter
if len(sys.argv) > 1:
    s_info.update(json.loads(sys.argv[1]))

# PID 조회
s_pid = os.getpid()
# DB 연결
s_dbMng = WpDataBaseManagement('meta')
s_query = 'UPDATE JOB_MSTR SET PROCESS_ID = %s, STATUS = 20 WHERE SCH_ID = %s AND LOG_ID = %s'
s_result = s_dbMng.o_conn.execute(s_query, (s_pid, s_info['schId'], s_info['logId']))
s_dbMng.close()

# DS_ID 번호로 교체해야함
setWiseDefaultStorage(${this.o_dsId})
o_apiType = '${this.o_apiType}'
o_stroageType = '${this.o_storageType}'
o_storageInfo = getWiseDefaultStorage()

# 모델 학습 결과 리스트
o_modelResultList = []

# dataSource 설정
o_dataSource = dataSourceService.dataSource(${p_userno}, s_info, o_stroageType, o_apiType, o_storageInfo)

#try:
`;
    }
    
    addParamCode(p_param:string) {
        this.o_code += `s_param = ${p_param}\n`
        // this.o_code += `\ts_param = ${p_param}\n`
        return this.o_code
    }
    addFunctionCode(p_type: string) {
        // if (p_type == 'model-train') {
        //     this.o_code += `\ts_result = app.job(s_param, s_info, o_dataSource)\n`;
            //this.o_code += `o_modelResultList.append({"MODEL_EXCUTE_RESULT":s_result['modelRunResult'], "MODEL_EVAL_TYPE": s_result['modelParams']['algorithmInfo']['algorithm']['ARG_TYPE'], "result": s_result})\n\n`;
            // this.o_code += `\to_modelResultList.append({"result": s_result})\n\n`;
            // 고용 노동부 실행 코드 시작
            // this.o_code += `\ts_result = app.job(s_param, s_info, o_dataSource)\n`;
            // this.o_code += `\to_modelResultList.append({"MODEL_EXCUTE_RESULT":s_result['modelRunResult'], "MODEL_EVAL_TYPE": s_result['modelParams']['algorithmInfo']['algorithm']['ARG_TYPE'], "result": s_result})\n\n`;
            // 고용 노동부 실행 코드 끝
        // }
        // else if (p_type == 'model-filter' || p_type == 'model-predict' || p_type == 'model-deploy') {
            // this.o_code += `\ts_param["data"]["model_result_list"] = o_modelResultList\n`;
            // this.o_code += `\ts_result = app.job(s_param, s_info, o_dataSource)\n\n`;
        // } else {
        // this.o_code += `\ts_result = app.job(s_param, s_info, o_dataSource)\n\n`;
        this.o_code += `s_result = app.job(s_param, s_info, o_dataSource)\n\n`;
        // }
        return this.o_code;
    }
    addEndCode() {
        // this.o_code += `except Exception as e:\n`;
        // this.o_code += `\ts_workflowName='None'\n`;
        // this.o_code += `\ttry:\n`;
        // this.o_code += `\t\ts_workflowName = s_param['data']['filepath'].split('/')[-1]\n`;
        // this.o_code += `\texcept:\n`;
        // this.o_code += `\t\tpass\n`;
        // this.o_code += `\traise Exception(s_workflowName +":" +  str(e))\n`;

        // this.o_code += `\tprint(json.dumps(s_result))\n\n`
        // this.o_code += `except Exception as e:\n`
        // this.o_code += `\traise Exception(str(e))`
        return this.o_code
    }
    addWfEndCode() {
        this.o_code += `gc.collect()\n`
        this.o_code += `# Python 강제 종료 (JVM 충돌 방지)\n`
        this.o_code += `os._exit(0)\n`
        this.o_code += `print("gc end")\n`
        // this.o_code += `\tgc.collect()\n`
        // this.o_code += `\t# Python 강제 종료 (JVM 충돌 방지)\n`
        // this.o_code += `\tos._exit(0)\n`
        // this.o_code += `\tprint("gc end")\n`
        return this.o_code
    }
}

export class WpAnalyticScript {

    o_code: string;
    o_mlPath = global.WiseAppConfig['ML_PATH'];
    constructor(p_argInfo:any, p_uuid:string,p_modelType:string, p_varInfo:string, p_bactchId:string) {
        this.o_code = `
# 코드 생성할때 기본적으로 반드시 들어가야하는 패키지 및 설정
import os
import sys
os.chdir('${this.o_mlPath}')
sys.path.append('${this.o_mlPath}')
import warnings
warnings.filterwarnings(action='ignore', category=FutureWarning) 
import sys
#sys.path.append("C://00.Source/00.Platform/wp-platform.v1/projects/wp-ml")
#sys.path.append("C://00.Source/00.Platform/wp-platform.v1")
import json
import numpy as np
from servicePreprocess import preprocessService
from serviceData import dataService
from serviceModel import managementService 

s_info = {}

# 기본 model 정보
p_modelType = '${p_modelType}'
p_uuid = '${p_uuid}'
p_bactchId = '${p_bactchId}'
p_argInfo = ${this.stringifyJSON(p_argInfo)}
p_varInfo = ${p_varInfo}

p_fileInfo = ####p_fileInfo####

#스케줄 실행시 받아오는 parameter
if len(sys.argv) > 1:
    s_info.update(json.loads(sys.argv[1]))


try:

    # 업로드타입
    s_uploadType = p_fileInfo['dataType']
    # 데이터 불러오기
    s_df = dataService.readNewData(s_uploadType, p_fileInfo)
    # WPLAT-187 사용자 전처리 기능 거치게 설정
    s_preProcess = preprocessService.WpPreprocessService(p_fileInfo['USER_NO'],'')
    if p_fileInfo['userPreprocessing'] == "True" :
        p_fileInfo['userPreprocessing'] = True
    else:
        p_fileInfo['userPreprocessing'] = False

    s_df = s_preProcess.loadUserPreprocessing(s_df, p_fileInfo['USER_NO'], p_fileInfo['userPreprocessing'])

    # 데이터 정재리스트
    s_cleanInfo = p_fileInfo['cleanInfo']

    # 돋보기 처리
    for i in s_cleanInfo:
        # 200310 이상값 인덱스 추가
        if(i['Value']['outlier']['use']):                
            _, bp = s_df.boxplot(column=[i['Column']], return_type='both')
            outlierList = [flier.get_ydata() for flier in bp["fliers"]]
            outlierList = np.unique(outlierList)
            # 200309 outliers_index 이상치 정제시 인덱스값 추가
            outlierIndexList = s_df[(s_df[i['Column']]).isin(outlierList)].index.values
            i['Value']['outlier']['outlierInfo'] = outlierIndexList
        s_edit, s_df = preprocessService.editData(s_df,i['Type'],i['Column'],i['ColumnType'], i['Value'])

    s_result = managementService.runModel(s_df, p_modelType, p_uuid, p_argInfo, p_varInfo, p_fileInfo, True, p_bactchId)

    print(json.dumps(s_result))

except Exception as e:
	raise Exception(str(e))
`;
    }

    setFileInfo(p_fileInfo:string){
        return this.o_code.replace('####p_fileInfo####',p_fileInfo);
    }
    getCode(){
        return this.o_code;
    }

    stringifyJSON(obj:any) :string {
  
        if(typeof obj ==='boolean' || typeof obj ==='number' || obj === null){
          return String(obj)
        }
        if(typeof obj ==='string'){
            // if(obj.includes('{') || obj.includes('[')){
            //     return `'${obj}'`
            // }
            // else
                return `"${obj}"`
        }
        if(typeof obj ==='undefined' ||typeof obj ==='function'){
          return 'undefined';
        }
      
        if(Array.isArray(obj)){
          let newArr = []; //push메소드 쓰지 않고 배열의 요소를 stringifyJSON(item)값으로 치환할 때도 구현 가능
          for(let item of obj){
              newArr.push(this.stringifyJSON(item)) //push만 해주고 
          } 
          return `[${newArr}]` //`${newArr}` 하면 요소만 나열되고 통째로 문자열 
        }
      
        if(typeof obj ==='object' && obj!==null){
          let str = '';
            for (let key in obj) {
              if (typeof obj[key]==='function' || obj[key] === undefined) {
                return "{}";
              }
              let newKey = this.stringifyJSON(key); //key
              let newValue = this.stringifyJSON(obj[key]);//key의 값
                
              str = str+ newKey + ":" + newValue+',';
            }
            str = str.slice(0, -1); //마지막 쉼표 버리기
            return `{${str}}`;
        } 
      };
}