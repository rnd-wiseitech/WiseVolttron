import { WP_CONFIG } from "../../wp-type/WP_CONN_ATT";
import { WpError, WpHttpCode } from "../../exception/WpError";
import * as request from "request";
import { NodeSSH, SSHExecOptions } from 'node-ssh';
import { WiseAppConfig } from '../../util/appConfig'
import moment from "moment";
const { PassThrough } = require('stream');
/**
 * Spark API 서버에 호출 URL 정의
 */
 export namespace PY_API_URL {
    export const STATISTICS = `/statistics`;
    export const LOAD_MEMORY = `/select`;
    export const ODBC = `/odbc`;
    export const SELECTALL = `/selectAll`;
    export const SELECT = `/select`;
    export const CORRELATION = `/correlation`;
    export const OUTPUT = `/output`;
    export const TRANSFORM = `/transform`;
    export const SUMMARY = `/summary`;
    export const UPLOAD = `/upload`;
};

/**
 * 플랫폼에 등록된 컴포넌트의 기능을 실행 하기위한 클래스
 * 
 * 구축된 Spark에 서비스되고 있는 API 서비스를 호출
 * 
 * @example
 * ```ts
 * let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
 *
 *   let s_param = {
 *       "filename": s_body.VIEW_ID + '/' + sFileNm,
 *       "userno": s_body.USER_NO,
 *       "groupId": 'api',
 *       "jobId": '0',
 *       "location": 'api',
 *       "usetable": s_body.USER_NO + "_" + s_body.VIEW_ID
 *   };
 *
 *   s_sparkApiMng.onCallApi(`/selectAll`,JSON.stringify(s_param),{'Content-Type': 'application/json', 'groupId': 'api', 'jobId': '0'}
 *   ).then(pResult => {
 *      res.json(pResult);
 *  }).catch(pErr => { next(pErr) }); 
 */
export class WpSparkApiManager {

    o_config:WP_CONFIG;
    o_master:string;
    o_httpHeader:object;

    constructor(p_config:WP_CONFIG,p_httpHeader?:object )
    {
        if(typeof p_httpHeader == 'undefined')
            this.o_httpHeader = {'Content-Type': 'application/json'};            
        else 
            this.o_httpHeader = p_httpHeader;
        if(p_config.WP_API.host==null) {
            p_config.WP_API = global.WiseAppConfig.WP_API
        }
        this.o_config = p_config;
        this.o_master = '1';
        
    }
    getApiUrl(){
        return `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.port}`;
    }
    onCallApi(p_type:string,p_param:string,p_httpHeader?:object,p_option?:any) {

        let s: request.CoreOptions & request.RequiredUriUrl;

        if(typeof p_httpHeader == 'undefined')
            this.o_httpHeader = {'Content-Type': 'application/json'};            
        else 
            this.o_httpHeader = p_httpHeader;
        
        if(this.o_config === undefined){
            this.o_config = (new WiseAppConfig()).getConfig();
        }

        if(typeof p_option != 'undefined'){
            s = {
                url : `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.port}${p_type}`,
                headers:this.o_httpHeader,
            }
            s.body = p_option;
        }            
        else{
            s = {
                url : `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.port}${p_type}`,
                headers:this.o_httpHeader,
                body:p_param
            };
        }      
        return new Promise<WiseReturn>((resolve, reject) => {
            request.post(s, (err:any, res:request.Response, body:any) =>{
                if (err || res.statusCode != 200) {
                    if (typeof res == 'undefined') {
                        // 2중화인지 판단값 불러오기
                        let s_lbCheck = this.o_config.LOAD_BALANCER;
                        // 2중화일 경우
                        if (s_lbCheck == true) {
                            // 서버정보 불러오기
        
                            let s_metaDb = global.WiseMetaDB;
        
                            s_metaDb.select('SERVER_INFO',[], { PLATFORM_ID: this.o_config.PLATFORM_ID, KUBER_TYPE: 1 }).then(async (p_select:any) => {
                                if (p_select.length > 0) {
                                    // 기존 마스터값
                                    let s_beforeMaster = this.o_master;
                                    let s_changeMaster:string;
                                    // 변경 마스터값
                                    if (this.o_master == "1") {
                                        s_changeMaster = "2"
                                    } else {
                                        s_changeMaster = "1"
                                    }
                                    // 서버정보에서 변경마스터값인 마스터접속정보 가져오기(DESC컬럼에 인덱스로 설정)
                                    let s_changeMasterInfo = p_select.filter(function (e:any) {
                                        return e.DESC === s_changeMaster;
                                    })
        
                                    let sConnectParam = {
                                        host: s_changeMasterInfo[0].IP,
                                        username: s_changeMasterInfo[0].ID,
                                        port: s_changeMasterInfo[0].SSD_PORT,
                                        password: s_changeMasterInfo[0].PASSWORD
                                    }
                                    console.log("sConnectParam : ", sConnectParam);
                                    console.log("s_beforeMaster : ", s_beforeMaster);
                                    console.log("s_changeMaster : ", s_changeMaster);
                                    let s_sshClient = new NodeSSH();
                                    // 서버접속
                                    await s_sshClient.connect(sConnectParam).then(async (e:any) => {
                                        // 현재마스터의 API떠있는지 확인
                                        let sCheckApiLog = await s_sshClient.execCommand(`kubectl exec wp-master${s_beforeMaster} -- sudo netstat -nlp -p | grep 1337`);
                                        if (sCheckApiLog['stdout'].includes('tcp        0      0 0.0.0.0:1337            0.0.0.0:*               LISTEN ')) {
                                            s_sshClient.dispose();
                                            reject( 
                                                new WpError({httpCode:WpHttpCode.PY_API_UNKOWN_ERR,message: new Error(`wp-master${s_beforeMaster}이 실행중입니다. 잠시 후에 시도해주세요.\n계속 에러가 발생할 경우 관리자에게 문의하세요.`)})
                                            );                                    
                                        // 안떠있으면 전역변수 마스터 번호를 변경 마스터값으로 변경하고
                                        } else {
                                            console.log(`wp-master${s_beforeMaster} 1337 no`);
                                            if (this.o_master == "1") {
                                                this.o_master = "2"
                                            } else {
                                                this.o_master = "1"
                                            }
                                            // 변경마스터 POD에 접속
                                            sCheckApiLog = await s_sshClient.execCommand(`kubectl exec wp-master${this.o_master} -- sudo netstat -nlp -p | grep 1337`);
                                            // 변경마스터 POD에 1337 떠있는지 확인
                                            if (sCheckApiLog['stdout'].includes('tcp        0      0 0.0.0.0:1337            0.0.0.0:*               LISTEN ')) {
                                                s_sshClient.dispose();
                                                reject( new WpError({ 
                                                    httpCode:WpHttpCode.PY_API_UNKOWN_ERR, 
                                                    message:`wp-master${this.o_master}이 실행중입니다. 잠시 후에 시도해주세요.\n계속 에러가 발생할 경우 관리자에게 문의하세요.`
                                                }));
                                             // 안떠있으면 쿠버네티스 master-external uuid를 변경마스터 pod로 바꾸고
                                             // api 실행
                                            } else {
                                                console.log(`wp-master${this.o_master} 1337 no`);
                                                let sChangeSvcLog = await s_sshClient.execCommand(`kubectl patch svc wp-master-external --type merge -p '{"spec":{"selector": {"uuid": "master${this.o_master}"}}}'`);
                                                let sStartApiLog = await s_sshClient.execCommand(`kubectl exec wp-master${this.o_master} -- sudo sh /home/wp-platform/wp-pyspark-api/start.sh`);
                                                s_sshClient.dispose();
                                                let s_master = this.o_master;
                                                setTimeout(function () {
                                                    console.log("sChangeSvcLog : ",sChangeSvcLog);
                                                    console.log("sStartApiLog : ",sStartApiLog);
                                                    reject( new WpError({ 
                                                        httpCode:WpHttpCode.PY_API_UNKOWN_ERR, 
                                                        message: `wp-master${s_beforeMaster}가 장애가 발생되어 wp-master${s_master}로 연결하였습니다.\n잠시 후에 시도해주세요.\n계속 에러가 발생할 경우 관리자에게 문의하세요.`
                                                    }));
                                                }, 3000);
                                            }
                                        }
                                    }).catch(e => {
                                        console.log("e : ", e);
                                        reject( new WpError({ 
                                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR,  
                                            message: `서버 접근이 되지 않습니다. 관리자에게 문의하세요.`
                                        }));
                                    });;
                                }
                            })
                            // 2중화 아닐 경우    
                        } else {
                            // getaddrinfo ENOTFOUND undefined?
                            reject( new WpError({ 
                                httpCode:WpHttpCode.PY_API_UNKOWN_ERR,  
                                message: err }));
                        }
        
                    } else {
                        let sError:any;
                        let s_response:any = res;
                        try {
                            sError = JSON.parse(s_response.body);
                        } catch (error) {
                            sError = { responsecode: s_response.statusCode, message: s_response.body };
                        }
        
                        reject(new WpError({ 
                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:sError.message
                        }));
                    }
        
                } else {
                    resolve(body);
                }
            });
        });

    }

    public onDownloadApi(p_type: string, p_param: string, p_header?: any) {
        return new Promise((resolve, reject) => {
            const downloadUrl = `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.port}${p_type}`;
    
            const options = {
                url: downloadUrl,
                headers: p_header,
                method: 'POST',
                body: p_param,
            };
            
            // Use request to handle streaming
            const req = request.post(options);
            const passThroughStream = new PassThrough(); // 새로운 PassThrough 스트림 생성
            req.on('response', (response) => {
                // Ensure file headers are properly passed to the client
                const contentDisposition = response.headers['content-disposition'];
                const contentType = response.headers['content-type'];
                const contentLength = response.headers['content-length'];
    
                if (!contentDisposition || !contentType) {
                    reject('Missing headers for file download.');
                    return;
                }
                req.pipe(passThroughStream);
                resolve({
                    stream: passThroughStream,
                    headers: { contentDisposition, contentType, contentLength },
                });
            });
    
            req.on('error', (err) => {
                reject(err);
            });
        });
    }

    public onFileChkApi(p_type: string, p_param: string, p_header?: any) {
        return new Promise((resolve, reject) => {
            const downloadUrl = `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.port}${p_type}`;
    
            const options = {
                url: downloadUrl,
                headers: p_header,
                method: 'POST',
                body: p_param,
            };
            
            // Use request to handle streaming
            const req = request.post(options);
            req.on('response', (response) => {
                resolve(response)
            });
    
            req.on('error', (err) => {
                reject(err);
            });
        });
    }
    
    getJobs(p_userMode:string, p_userno: number){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_returnJobs:any = [];
            let sUrl = '';
            let p_type = 'COMMON';
            if (p_type == 'COMMON')
                sUrl = `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications`;
            else 
                sUrl = `http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications`;

            request.get(`http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications`, (p_err:any, res:request.Response, p_body:any) =>{
                if (p_err) {
                    reject(new WpError({ 
                        httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:p_err.message
                    }));
                }
                else {
                    let s_result = JSON.parse(p_body);
                    if (s_result.length == 0) {
                        reject(new WpError({ 
                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:'spark-api 서버 작동 중지 중' 
                        }));
                    }
                    else {
                        let s_applicationId = s_result[0].id;
                        request.get(`http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications/${s_applicationId}/jobs`, async (p_err2:any, p_res2:request.Response, p_body2:any) => {
                            let s_runJobList = JSON.parse(p_body2);
                            if (p_res2.statusCode != 200) {
                                reject(new WpError({ 
                                    httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:p_body2.statusMessage 
                                }));
                            }
                            else{
                                for (let s_runJob of s_runJobList) {
                                    if(s_runJob.jobGroup != undefined) {
                                    // 일반
                                    let s_returnJob:any = null;
                                    let s_stDt:any = new Date(s_runJob.submissionTime.slice(0, -3) + 'Z');
                                    let s_descArry = s_runJob.description.split('-');
                                    if (p_userMode != 'ADMIN') {
                                        // sRunJob.jobGroup != undefined && 
                                        if ((s_runJob.jobGroup).slice(0, 4) == String(p_userno)) {
                                            
                                            s_returnJob = {
                                                "JOB_ID": s_runJob.jobId,
                                                "LOCATION": s_descArry[0],
                                                "DESC": s_descArry[1],
                                                "JOB_GROUP": s_runJob.jobGroup,
                                                "JOB_STATUS": s_runJob.status,
                                                "ST_DT": moment(s_stDt).format('YYYY-MM-DD HH:mm:ss'),
                                                "ED_DT": "",
                                                "DURATION": "",
                                                // userno 파라미터 생성
                                                "USERNO": (s_runJob.jobGroup).slice(0, 4),
                                                "ERROR": Object.keys(s_runJob.killedTasksSummary),
                                                "TASK_STATUS": "",
                                                "TOTAL_TASK": s_runJob.numTasks,
                                                "COM_TASK": s_runJob.numCompletedTasks,
                                                "KILL": "hidden"
                                            };
                                        }
                                        // 관리자
                                    } else {
                                        s_returnJob = {
                                            "JOB_ID": s_runJob.jobId,
                                            "LOCATION": s_descArry[0],
                                            "DESC": s_descArry[1],
                                            "JOB_GROUP": s_runJob.jobGroup,
                                            "JOB_STATUS": s_runJob.status,
                                            "ST_DT": moment(s_stDt).format('YYYY-MM-DD HH:mm:ss'),
                                            "ED_DT": "",
                                            "DURATION": "",
                                            // userno 파라미터 생성
                                            "USERNO": (s_runJob.jobGroup).slice(0, 4),
                                            "ERROR": Object.keys(s_runJob.killedTasksSummary),
                                            "TASK_STATUS": "",
                                            "TOTAL_TASK": s_runJob.numTasks,
                                            "COM_TASK": s_runJob.numCompletedTasks,
                                            "KILL": "hidden"
                                        };
    
                                    }
                                    
                                    let s_duration:any = "";
                                    if (s_returnJob != null) {
                                        if (s_runJob.completionTime != undefined) {
                                            let s_endDt:any = new Date(s_runJob.completionTime.slice(0, -3) + 'Z');
                                            s_returnJob["ED_DT"] = moment(s_endDt).format('YYYY-MM-DD HH:mm:ss');                                            
                                            s_duration = s_endDt - s_stDt;
                                        } else {
                                            s_duration = new Date() as any - s_stDt;
                                        }
        
                                        if (s_runJob.numActiveTasks != 0) {
                                            s_returnJob['TASK_STATUS'] = `${s_runJob.numCompletedTasks}/${s_runJob.numTasks}\r (${s_runJob.numActiveTasks} running)`
                                        } else if (Object.keys(s_runJob.killedTasksSummary).length != 0) {
                                            s_returnJob['TASK_STATUS'] = `${s_runJob.numCompletedTasks}/${s_runJob.numTasks} (${Object.keys(s_runJob.killedTasksSummary)})`
                                        } else {
                                            s_returnJob['TASK_STATUS'] = `${s_runJob.numCompletedTasks}/${s_runJob.numTasks}`;
                                        }
        
                                        if (0 < s_duration && s_duration < 100) {
                                            s_returnJob['DURATION'] = s_duration + 'ms';
                                        } else if (100 <= s_duration && s_duration < 60000) {
                                            s_returnJob['DURATION'] = (s_duration / 1000).toFixed(1) + 's';
                                        } else if (60000 <= s_duration) {
                                            s_returnJob['DURATION'] = (s_duration / 1000 / 60).toFixed(1) + 'min';
                                        } else {
                                            s_returnJob['DURATION'] = '0ms'
                                        }
        
                                        if (s_runJob.status != 'SUCCEEDED' && s_runJob.status != 'FAILED') {
                                            s_returnJob['KILL'] = "";
                                        }
        
                                        s_returnJobs.push(s_returnJob);
                                    }
                                }
                                }

                                resolve(s_returnJobs);
                            }
                            
                        });
                    }
                }
            });

        });
    }
    stopJobs(p_jobId:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            request.get(`http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/jobs/job/kill/?id=${p_jobId}`, (p_err:any, p_res:request.Response, p_body:any) =>{
                if (p_err) {
                    reject(new WpError({ 
                        httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:p_err.message
                    }));
                } else {
                    if (p_res['statusCode'] == 200) {
                        request.get(`http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications`, (p_err2:any, p_res2:request.Response, p_body2:any) =>{
                            if (p_err2) {
                                reject(new WpError({ 
                                    httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:p_err2.message
                                }));
                            }
                            else {
                                let s_result = JSON.parse(p_body2);
                                if (s_result.length == 0) {
                                    reject(new WpError({ 
                                        httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:'spark-api 서버 작동 중지 중' 
                                    }));
                                }
                                else {
                                    let s_applicationId = s_result[0].id;
                                    request.get(`http://${this.o_config.WP_API.host}:${this.o_config.WP_API.monitoring_port}/api/v1/applications/${s_applicationId}/jobs/${p_jobId}`, async (p_err3:any, p_res3:request.Response, p_body3:any) => {
            
                                        if (p_err3) {
                                            reject(new WpError({ 
                                                httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:p_err3 
                                            }));
                                        } else {
                                            let s_result = JSON.parse(p_body3);
                                            if(s_result['status'] == 'FAILED') {
                                                resolve({ isSuccess: true, result: `Job '${p_jobId}'이 정상적으로 중지되었습니다.`});
                                            } else if(s_result['status'] == 'SUCCEEDED') {
                                                resolve({ isSuccess: true, result: `Job '${p_jobId}'이 완료 상태입니다.`});
                                            } else {
                                                resolve({ isSuccess: false, result: `작업이 정상적으로 진행되지 않았습니다.\r 다시 실행해주세요.`});
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                }
            });
        });
    }
}