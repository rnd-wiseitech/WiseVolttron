
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
        this.o_code += `s_result = app.job(s_param, s_info, o_dataSource)\n\n`;
        return this.o_code;
    }
    addEndCode() {
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