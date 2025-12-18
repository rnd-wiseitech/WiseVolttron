import { WpError, WpHttpCode } from "../../exception/WpError";
import { DP_MODEL_MSTR_ATT } from "../../metadb/model/DP_MODEL_MSTR";
import { DP_SCH_MSTR_ATT } from "../../metadb/model/DP_SCH_MSTR";
import { WF_COM_MSTR_ATT } from "../../metadb/model/WF_COM_MSTR";
import { WK_SCH_MSTR_ATT } from "../../metadb/model/WK_SCH_MSTR";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import { JOB_ATT, JobMstr } from "../job/job";
import { WpModelManagement } from "../model-mng/model-mng";
import * as request from "request";
import { WpSparkApiManager } from "../spark-api/spark-api-mng";
import { JOB_DATA_ATT, JOB_LOCATION_ATT } from "../../wp-type/WP_COM_ATT";
import { getCOM_ID } from '../../../wp-lib/src/lib/wp-meta/com-id';
import { Op, Transaction } from "sequelize";
const moment = require('moment');

/**
 * 스케쥴을 관리하는 클래스.
 * 
 * @example
 * ```ts
 * let o_schMng = new WpScheduleManagement(p_userInfo);
 * o_schMng.changeWkStatus(SCH_ID,'배치 종료')
 * ```
 */
export class WpScheduleManagement {

    public o_modelList:DP_MODEL_MSTR_ATT;
    public o_scheList:DP_SCH_MSTR_ATT;
    public o_modelToSchList:any;
    public o_userInfo:WP_SESSION_USER;
    public o_modelMng:WpModelManagement;
    public o_apiType = global.WiseAppConfig['API_TYPE'];

    constructor(p_userInfo:WP_SESSION_USER){
        this.o_userInfo = p_userInfo;
        this.o_modelMng = new WpModelManagement(p_userInfo);
        (async()=>{
            await this.init();
        })
    }

    async init(){
        this.o_modelList = (await this.o_modelMng.getModelList()).result;
    }
    getSchList(p_schId?:string,p_schNm?:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;

            let s_sql = `
                        SELECT
                            A.SCH_ID,
                            A.SCH_NM,
                            A.DEL_YN,
                            B.WF_NM,
                            B.WF_ID,
                            CONCAT('[', 
                            GROUP_CONCAT(CASE WHEN C.OUTPUT_YN='N' THEN CONCAT('"', D.DS_VIEW_NM,'"') END),
                            ']') AS INPUT_DATA,
                            CONCAT('[', 
                            GROUP_CONCAT(CASE WHEN C.OUTPUT_YN='Y' THEN CONCAT('"', D.DS_VIEW_NM,'"') END),
                            ']') AS OUTPUT_DATA,
                            A.SCH_STATUS,
                            A.USE_CORE,
                            A.USE_MEMORY,
                            A.ST_DT,
                            A.ED_DT,
                            A.CRON_PARAM,
                            A.CRON_INFO,
                            A.REG_USER_NO,
                            A.REG_DT,
                            A.REALTIME_INFO
                        FROM WK_SCH_MSTR A
                        INNER JOIN WF_MSTR B ON A.WF_ID = B.WF_ID 
                        LEFT OUTER JOIN WF_USE_DATASET C ON B.WF_ID = C.WF_ID 
                        LEFT OUTER JOIN DS_VIEW_MSTR D ON C.DS_VIEW_ID = D.DS_VIEW_ID 
                        WHERE A.DEL_YN='N'and A.SCH_STATUS NOT LIKE ('REALVOLTTRON%')`;

            if (this.o_userInfo.USER_MODE  != 'ADMIN') {
                s_sql += ` AND A.REG_USER_NO = ${this.o_userInfo.USER_NO}`;
            }
            if (p_schId != '' && p_schId != undefined) {
                s_sql += ` AND A.SCH_ID = ${p_schId}`;
            }
            else if (p_schNm != '' && p_schNm != undefined) {
                s_sql += ` AND A.SCH_NM = ${p_schNm}`;
            }
            s_sql += "  GROUP BY SCH_ID ORDER BY SCH_ID DESC";

            s_metaDb.query(s_sql,'',true).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    getVolttronList(p_schId?:string,p_schNm?:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;

            let s_sql = `
                        SELECT
                            A.SCH_ID,
                            A.SCH_NM,
                            A.DEL_YN,
                            B.WF_NM,
                            B.WF_ID,
                            CONCAT('[', 
                            GROUP_CONCAT(CASE WHEN C.OUTPUT_YN='N' THEN CONCAT('"', D.DS_VIEW_NM,'"') END),
                            ']') AS INPUT_DATA,
                            CONCAT('[', 
                            GROUP_CONCAT(CASE WHEN C.OUTPUT_YN='Y' THEN CONCAT('"', D.DS_VIEW_NM,'"') END),
                            ']') AS OUTPUT_DATA,
                            A.SCH_STATUS,
                            A.USE_CORE,
                            A.USE_MEMORY,
                            A.ST_DT,
                            A.ED_DT,
                            A.CRON_PARAM,
                            A.CRON_INFO,
                            A.REG_USER_NO,
                            A.REG_DT,
                            A.REALTIME_INFO
                        FROM WK_SCH_MSTR A
                        INNER JOIN WF_MSTR B ON A.WF_ID = B.WF_ID 
                        LEFT OUTER JOIN WF_USE_DATASET C ON B.WF_ID = C.WF_ID 
                        LEFT OUTER JOIN DS_VIEW_MSTR D ON C.DS_VIEW_ID = D.DS_VIEW_ID 
                        WHERE A.DEL_YN='N' AND A.REALTIME_INFO IS NOT NULL`;

            if (this.o_userInfo.USER_MODE  != 'ADMIN') {
                s_sql += ` AND A.REG_USER_NO = ${this.o_userInfo.USER_NO}`;
            }
            if (p_schId != '' && p_schId != undefined) {
                s_sql += ` AND A.SCH_ID = ${p_schId}`;
            }
            else if (p_schNm != '' && p_schNm != undefined) {
                s_sql += ` AND A.SCH_NM = ${p_schNm}`;
            }
            s_sql += "  GROUP BY SCH_ID ORDER BY SCH_ID DESC";

            s_metaDb.query(s_sql,'',true).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    saveSchedule(p_schData:DP_SCH_MSTR_ATT){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.insert('DP_SCH_MSTR',p_schData,false).then( async p_result=>{

                let s:WK_SCH_MSTR_ATT = {
                    SCH_NM : p_schData.SCH_NM,
                    DEL_YN : p_schData.DEL_YN,
                    SCH_STATUS : p_schData.SCH_STATUS == '10' ? '배치 대기':p_schData.SCH_STATUS,
                    ST_DT : p_schData.SCH_ST,
                    ED_DT : p_schData.SCH_ED,
                    REG_USER_NO : p_schData.REG_USER_NO,
                    WF_ID : p_schData.MODEL_ID,
                    REG_DT : p_schData.REG_DATE,
                    CRON_INFO : `${p_schData.SCH_TERM} ${p_schData.SCH_TERM_VALUE}`,
                    CRON_PARAM : p_schData.SCH_CRON
                };
                
                //s.SCH_ID = p_result.SCH_ID;
                let s_schIds = await s_metaDb.query('SELECT MAX(SCH_ID) as SCH_ID FROM WK_SCH_MSTR','WK_SCH_MSTR');
                let s_reInstall = false;

                if(p_result.SCH_ID > s_schIds[0].SCH_ID){

                    await s_metaDb.query(`ALTER TABLE WK_SCH_MSTR AUTO_INCREMENT = ${p_result.SCH_ID}`,'','update');
                    
                }

                else if(p_result.SCH_ID < s_schIds[0].SCH_ID)
                    s_reInstall = true;

                s_metaDb.insert('WK_SCH_MSTR',s,false).then( async p_result=>{
                    
                    if(s_reInstall){
                        await s_metaDb.query(`ALTER TABLE DP_SCH_MSTR AUTO_INCREMENT = ${p_result.SCH_ID}`,'','update');
                        await s_metaDb.insert('DP_SCH_MSTR',p_schData,false);
                    }

                    resolve({isSuccess:true,result:p_result});
                }).catch((p_error) => {
                    reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
                });
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
            
            
        })
    }
    saveWkSchedule(p_schData:WK_SCH_MSTR_ATT){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.insert('WK_SCH_MSTR',p_schData,false).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    updateSchedule(p_schData:DP_SCH_MSTR_ATT,p_where:any){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('DP_SCH_MSTR',p_schData,p_where).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    updateWkSchedule(p_schData:WK_SCH_MSTR_ATT,p_where:any){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('WK_SCH_MSTR',p_schData,p_where).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    deleteSchedule(p_schId:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.delete('DP_SCH_MSTR',{SCH_ID:p_schId}).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    deleteWkSchedule(p_schId:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('WK_SCH_MSTR',{ DEL_YN: 'Y'},{SCH_ID:p_schId}).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        })
    }
    getSchModelList(p_modelId?:string,p_modelNm?:string){
        return new Promise<WiseReturn>((resolve, reject) => {

            let s_metaDb = global.WiseMetaDB;

            let s_sql = `
                SELECT   A.SCH_ID,
                    A.SCH_NM,
                    A.SCH_STATUS,
                    A.SCH_CRON,
                    A.DEL_YN,
                    A.SCH_ST,
                    A.SCH_ED,
                    A.SCH_TERM,
                    A.SCH_TERM_VALUE,
                    A.RELEARN_YN,
                    A.DATASET_ID,
                    A.STORAGE_NAME,
                    A.STORAGE_FILETYPE,
                    A.STORAGE_MODE,
                    A.DS_ID,
                    A.HIVE_DB_NM,
                    A.MODEL_IDX,
                    B.MODEL_ID,
                    B.ARG_ID,
                    B.PROJ_ID,
                    B.MODEL_NM,
                    B.MODEL_PROGRESS,
                    B.MODEL_RUN_TYPE,
                    B.MODEL_EVAL_TYPE,
                    B.MODEL_EVAL_RESULT,
                    B.MODEL_USE_DATASET_ID,
                    B.DEL_YN,
                    B.MODEL_FEATURE_TYPE,
                    B.MODEL_ARG_PARAM,
                    B.REG_USER_NO,
                    B.MODEL_PART_OPTION,
                    MAX(C.DATASET_ID) AS DATASET_ID,
                    C.DATASET_TYPE, 
                    C.DATASET_REF_ID,
                    C.DATASET_NAME,
                    D.DS_NM,
                    D.DB_NM,
                    (SELECT ARG_FILE_NAME FROM DP_ARG_MSTR WHERE ARG_ID = B.ARG_ID ) ARG_NM, 
                    (SELECT COL_NM FROM DP_VAR_MSTR WHERE MODEL_ID = C.MODEL_ID AND  VAR_TARGET_YN = 'Y' ) TARGET_NM  
                FROM DP_SCH_MSTR A 
                LEFT OUTER JOIN DP_MODEL_MSTR B ON A.MODEL_ID = B.MODEL_ID
                LEFT OUTER JOIN DS_MSTR D ON A.DS_ID = D.DS_ID
                INNER JOIN DP_MODEL_DATASET_USE_MSTR C ON C.MODEL_ID = B.MODEL_ID 
                INNER JOIN DP_SCH_MSTR ON C.DATASET_ID = A.DATASET_ID
                WHERE A.DEL_YN = 'N' 
                AND B.DEL_YN = 'N'
                AND B.REG_USER_NO = ${this.o_userInfo.USER_NO}
                AND A.REG_USER_NO = ${this.o_userInfo.USER_NO}
                GROUP BY A.SCH_ID `;

            if (p_modelNm != '' && p_modelNm != undefined) {
                s_sql += " AND B.MODEL_NM like '%" + p_modelNm + "%'";
                //sql += " WHERE B.MODEL_NM like '%" + searchWord + "%'";
            }

            if (p_modelId != '' && p_modelId != undefined) {
                s_sql += " AND B.MODEL_ID = " + p_modelId;
            }

            s_sql += " ORDER BY A.SCH_ID DESC ";

            s_metaDb.query(s_sql,'',true).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });        
    }
    saveLog(p_logInfo:any){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.insert('DP_SCH_LOG',p_logInfo,false).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });
    }
    updateLog(p_logInfo:any,p_condition:any){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('DP_SCH_LOG',p_logInfo,p_condition).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });
    }
    getWkLogList(p_schId?:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            let s_sql = `SELECT 
                        SCH_ID,
                        LOG_ID,
                        LOG_STATUS AS STATUS,
                        ST_DT,
                        ED_DT,
                        ERROR_MSG
                        FROM WK_SCH_LOG
                        WHERE 1 = 1 `;

            if (p_schId != '' && p_schId != undefined) {
                s_sql += " AND SCH_ID = " + p_schId;
                //sql += " WHERE B.MODEL_NM like '%" + searchWord + "%'";
            }

            s_sql += ` ORDER BY LOG_ID DESC `;

            s_metaDb.query(s_sql,'',true).then(p_schList=>{
                resolve({isSuccess:true,result:p_schList});
            }).catch(p_error=>{reject(p_error)});
        })
    }
    getVolttronWkLogList(p_schId?:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            let s_sql = `SELECT 
                        SCH_ID,
                        LOG_ID,
                        LOG_STATUS AS STATUS,
                        ST_DT,
                        ED_DT,
                        ERROR_MSG,
                        ANALYTIC_RESULT
                        FROM WK_SCH_LOG
                        WHERE 1 = 1 `;

            if (p_schId != '' && p_schId != undefined) {
                s_sql += " AND SCH_ID = " + p_schId;
            }

            s_sql += ` ORDER BY LOG_ID DESC `;

            s_metaDb.query(s_sql,'',true).then(p_schList=>{
                resolve({isSuccess:true,result:p_schList});
            }).catch(p_error=>{reject(p_error)});
        })
    }
    getModelLogList(p_schId?:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            let s_sql = `SELECT E.DATASET_NAME, C.*, D.SCH_STATUS_NM AS STATUS_NM 
                            FROM (
                                SELECT
                                    @RNUM:=@RNUM +1 AS LOG_SEQ,   
                                        LOG_ID,
                                        MODEL_ID, 
                                        DATE_FORMAT(LOG_DT,'%Y-%m-%d %H:%i:%S') AS LOG_DT, 
                                        RESULT_PATH, 
                                        ACCURACY, 
                                        STATUS,
                                        LOG_DATASET_ID,
                                        ERROR_MSG
                                    FROM DP_SCH_LOG A, (SELECT @RNUM := 0) r
                                    ${typeof p_schId == 'undefined'? '': `WHERE SCH_ID = ${p_schId}`}
                                    ORDER BY LOG_ID
                            ) C
                            INNER JOIN DP_SCH_CODE D ON C.STATUS = D.SCH_STATUS_CD
                            INNER JOIN DP_MODEL_DATASET_USE_MSTR E ON C.LOG_DATASET_ID = E.DATASET_ID
                            ORDER BY C.LOG_SEQ DESC`;

            s_metaDb.query(s_sql,'',true).then(p_queryList=>{
                resolve({isSuccess:true,result:p_queryList});
            }).catch(p_error=>{reject(p_error)});
        })
    }
    changeStatus(p_schId:string,p_status:number){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('DP_SCH_MSTR',{SCH_STATUS: p_status},{ SCH_ID: p_schId }).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });
    }
    changeLogStatus(p_schId:string,p_status:number){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.update('DP_SCH_LOG',{SCH_STATUS: p_status},{ SCH_ID: p_schId }).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });
    }
    changeWkStatus(p_schId:string,p_status:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            
            let s_metaDb = global.WiseMetaDB;
            let s_param:any = {SCH_STATUS: p_status};

            if(p_status == 'BATCH_20')
                s_param.ST_DT = moment().format('YYYY-MM-DD HH:mm:ss');

            s_metaDb.update('WK_SCH_MSTR', s_param, { SCH_ID: p_schId }).then(p_result => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });
    }

    

    async executeScheduleJob(p_wfPath:string, p_param:any, p_schData:any, p_user:any) {

        // JOB_MSTR, JOB_SUB_MSTR 작업
        let s_groupId = `Workflow${p_schData['WF_ID']}`;
        await this.executeScheduleJobMetaDB(
            p_schData['REG_USER_NO'], 
            s_groupId,
            p_schData['SCH_NM'],
            p_schData['SCH_ID'],
            p_schData['LOG_ID'],
            p_schData['WF_ID']
        );
        
        let s_logId = p_schData['LOG_ID'];
        let s_schId = p_schData['SCH_ID']
        let s_param = {
            action: "schedule",
            method: "",
            userno: this.o_userInfo.USER_NO,
            userId: this.o_userInfo.USER_ID,
            usermode: this.o_userInfo.USER_MODE,
            groupId: `schedule${s_schId}`,
            jobId: s_logId,
            location: "schedule",
            data: {
                filepath: p_wfPath,
                param: p_param
            }
        };
        let s_option = {
            headers: { 
                'Content-Type': 'application/json',
                'authorization': this.o_userInfo.USER_TOKEN 
                },
            // #70 포트변경
            url: `http://${global.WiseAppConfig.NODE.host}:${global.WiseAppConfig.NODE.port}/jobexcute/schedule`,
            body: JSON.stringify(s_param)
        };

        request.post(s_option, async function (p_err, p_res, p_result) { 

            if(p_err) {
                await global.WiseMetaDB.update('JOB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });
                await global.WiseMetaDB.update('JOB_SUB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'], STATUS: { [Op.ne]: 40 } });
                await global.WiseMetaDB.update('WK_SCH_LOG', { LOG_STATUS: 99, ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss'), ERROR_MSG: p_err }, { SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });

            } else if (p_res.statusCode == 200) {
                                            
                await global.WiseMetaDB.update('JOB_MSTR', { STATUS: 40, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, { ID: s_groupId, SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });
                await global.WiseMetaDB.update('WK_SCH_LOG', { LOG_STATUS: 40, ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, { SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });
                
            } else {
                await global.WiseMetaDB.update('JOB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });
                await global.WiseMetaDB.update('JOB_SUB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'], STATUS: { [Op.ne]: 40 } });
                await global.WiseMetaDB.update('WK_SCH_LOG', { LOG_STATUS: 99, ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss'), ERROR_MSG: JSON.parse(p_result)['message'] }, { SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] });
            }
        });
    }
    // 실시간 수집 진행 중인지 체크
    async checkRealtimeStatus(p_tableName:string){
        try {
            let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
            let s_body = {
                groupId: 'Temp',
                userno: this.o_userInfo.USER_NO,
                userId: this.o_userInfo.USER_ID,
                usermode: this.o_userInfo.USER_MODE,
                location: 'workflow',
                action: 'stream',
                method: 'check',
                jobId: '0'
            };
            let s_result:any = await s_sparkApiMng.onCallApi(`/job`,
                JSON.stringify(s_body),
                {
                    'Content-Type': 'application/json',
                    'groupId': s_body.groupId,
                    'jobId': s_body.jobId
                });
            if (JSON.parse(s_result)['data'].includes(p_tableName)) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }
    // 실시간 수집 종료
    async stopRealtimeJob(p_tableName: string) {
        try {
            let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
            let s_body = {
                groupId: 'Temp',
                userno: this.o_userInfo.USER_NO,
                userId: this.o_userInfo.USER_ID,
                usermode: this.o_userInfo.USER_MODE,
                usetable: p_tableName,
                location: 'workflow',
                action: 'stream',
                method: 'stop',
                jobId: '0'
            };
            let s_result: any = await s_sparkApiMng.onCallApi(`/job`,
                JSON.stringify(s_body),
                {
                    'Content-Type': 'application/json',
                    'groupId': s_body.groupId,
                    'jobId': s_body.jobId
                });
            return true;
        } catch (error) {
            return false;
        }
    }
    // 실시간 수집 실행
    async executeRealtimeJob(p_user:WP_SESSION_USER, p_wkId:string, p_schId:string, p_groupId:string) {

        let COM_ID: Record<string, number> = getCOM_ID();
        let s_userNo = p_user.USER_NO;
        let s_userId = p_user.USER_ID;
        let s_userMode = p_user.USER_MODE;
        let s_binLog = global.WiseBinLog;
        let s_metaDb = global.WiseMetaDB;

        let s_status = await s_metaDb.query(`SELECT IFNULL(MAX(LOG_ID),0) AS LOG_ID, LOG_STATUS FROM WK_SCH_LOG WHERE SCH_ID=${p_schId}`, 'WK_SCH_LOG');
        // 기존 수집 작업이 실행 상태 아니면 실행
        if (s_status[0]['LOG_STATUS'] != 20) {
            let s_logId = s_status[0]['LOG_ID'] + 1;
            try {
                await s_metaDb.insert('WK_SCH_LOG', { SCH_ID: p_schId, LOG_ID: s_logId, LOG_STATUS: 20, ST_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, false);

                let s_wfData = await s_metaDb.select('WF_MSTR', [], { WF_ID: p_wkId });
                s_wfData = s_wfData[0].dataValues;
                let s_wfComData = await s_metaDb.select('WF_COM_MSTR', [], { WF_ID: p_wkId });
                s_wfComData = s_wfComData.map((s_com: any) => s_com.dataValues);

                let s_data: Array<JOB_DATA_ATT> = [];
                s_wfComData.forEach((s_com: WF_COM_MSTR_ATT) => {
                    let s_wf = JSON.parse(s_com.WF_DATA)
                    let s_tmp: JOB_DATA_ATT = {
                        id: s_wf.jobId,
                        type: s_wf.type,
                        location:JOB_LOCATION_ATT.SCHEDULE,
                        text: s_wf.text,
                        data: s_wf['wp-data'],
                        filter: s_wf['filter'],
                        parent_id: [],
                        step: 1
                    };
                    let s_parentId: string[] = [];
                    s_wfComData.forEach((s_com_: WF_COM_MSTR_ATT) => {
                        if (s_wf.parentId.includes(s_com_.COM_ID)) {
                            s_parentId.push(JSON.parse(s_com_.WF_DATA)['jobId']);
                        }
                    })
                    s_tmp.parent_id = s_parentId;
                    // STREAMING 컴포넌트의 realtime 파라미터 추가.
                    if (s_wf.type == COM_ID['I-STREAMING']) {
                        s_tmp['data']['o_data']['realtime'] = true;
                        s_tmp['data']['o_data']['schId'] = p_schId;
                        s_tmp['data']['o_data']['logId'] = s_logId;
                        s_wf['wp-data']['o_data'] = s_tmp['data']['o_data'];
                        s_com.WF_DATA = JSON.stringify(s_wf);
                    }
                    s_data.push(s_tmp);
                })
                // SAVE JOB MSTR
                let s_jobId = p_groupId;

                let sJobMstr = {
                    ID: s_jobId,
                    NAME: '',
                    STATUS: 20,
                    ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
                    DESC: '',
                    USER_NO: s_userNo,
                    // USER_NO: '1000',
                    ERROR_MSG: ''
                };

                let sJobSubMstr: any = [];

                for (let idx in s_data) {
                    sJobSubMstr.push({
                        ID: s_jobId,
                        JOB_ID: s_data[idx].id,
                        P_JOB_ID: JSON.stringify(s_data[idx].parent_id),
                        COM_ID: s_data[idx].type,
                        STATUS: 20,
                        ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
                        DATA: JSON.stringify(s_data[idx].data),
                        ERROR_MSG: ''
                    });
                }

                await s_metaDb.insert('JOB_MSTR', sJobMstr, false);
                await s_metaDb.insert('JOB_SUB_MSTR', sJobSubMstr, true);

                // EXECUTE JOB

                let s_jobParam: JOB_ATT = {
                    jobId: p_groupId, // uuid
                    clientId: '',
                    data: {
                        wkCompData: s_wfComData.map((s_com: any) => JSON.parse(s_com.WF_DATA)),
                        wkDiagram: s_wfData.WF_DIAGRAM,
                        wkId: s_wfData.WF_ID,
                        wkName: s_wfData.WF_NM,
                        wkType: 'excute'
                    },
                    token: p_user.USER_TOKEN
                };

                let s_jobMstr = new JobMstr(s_jobParam);

                // WF_MSTR, WF_COM_MSTR 작업
                await s_jobMstr.saveWorkflowMetaDb(s_jobParam.data, s_userNo);

                s_jobMstr.setJobList(s_data);
                s_binLog.setJob(s_jobMstr);

                let s_rootJob = s_jobMstr.start('schedule');

                s_rootJob.then(async p => {
                    await s_metaDb.update('WK_SCH_LOG', { SCH_ID: p_schId, LOG_ID: s_logId, LOG_STATUS: 40, ERROR_MSG: "실시간 수집 또는 서버 재시작", ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, { SCH_ID: p_schId, LOG_ID: s_logId });
                    return {isSuccess: true, result: "실행 완료"};
                }).catch(async p_error => {
                    console.log(p_error)
                    await s_metaDb.update('WK_SCH_LOG', { SCH_ID: p_schId, LOG_ID: s_logId, LOG_STATUS: 99, ERROR_MSG: "실시간 수집 에러", ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, { SCH_ID: p_schId, LOG_ID: s_logId });
                    return { isSuccess: false, result: "실패" };
                })
            } catch (error) {
                await s_metaDb.update('WK_SCH_LOG', { SCH_ID: p_schId, LOG_ID: s_logId, LOG_STATUS: 99, ERROR_MSG: "실시간 수집 에러", ED_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, { SCH_ID: p_schId, LOG_ID: s_logId });
                return { isSuccess: false, result: "실패" };
            }
        }
    }




    // 스케줄 JOB_MSTR, JOB_SUB_MSTR 적재
    async executeScheduleJobMetaDB(p_userno:any, p_groupId:any, p_schNm:any, p_schId:any, p_logId:any, p_workflowId:any) {
        // 현재시간
        let s_date = moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
        // JOB_MSTR 데이터
        let s_schJobMstr = {
                    ID: p_groupId,
                    NAME: p_schNm,
                    STATUS: 20,
                    ST_DT: s_date,
                    USER_NO: p_userno,
                    LOCATION: 'SCHELDULE',
                    SCH_ID: p_schId,
                    LOG_ID: p_logId

        }
        // JOB_MSTR INSERT
        await global.WiseMetaDB.insert('JOB_MSTR', s_schJobMstr, false);

        // WORKFLOW COM_MSTR 조회
        let s_schWfComMstr = await global.WiseMetaDB.select('WF_COM_MSTR', [], {WF_ID: p_workflowId});
        // JSON으로 변환 {jodid : data}
        let s_jobIdMap:any = {};
        for (const row of s_schWfComMstr) {
            try {
                const wfDataObj = JSON.parse(row.WF_DATA);
                const jobId = wfDataObj.jobId;

                if (jobId == null) {
                console.warn(`❗️ Missing jobId in row: ${JSON.stringify(row)}`);
                continue;
                }

                s_jobIdMap[jobId] = wfDataObj;

            } catch (e) {
                console.error(`❌ JSON parse error for row: ${JSON.stringify(row)}`);
            }
        }
        // JOB_SUB_MSTR 데이터
        let s_schJobSubMstr = []
        // 1. id -> jobId 매핑 딕셔너리 만들기
        const idToJobId = Object.fromEntries(
        Object.values(s_jobIdMap).map((j:any) => [j.id, j.jobId])
        );
        // 2. 변환
        for (let jobAny of Object.values(s_jobIdMap)) {
            const job = jobAny as any;
            const pJobIds = (job.parentId || []).map((id:any) => idToJobId[id]).filter(Boolean);
            s_schJobSubMstr.push({
                ID: p_groupId,
                JOB_ID: job.jobId,
                P_JOB_ID: JSON.stringify(pJobIds),
                COM_ID: job.type,
                STATUS: 10,
                ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
                DATA: JSON.stringify(job['wp-data']),
                ERROR_MSG: '',
                SCH_ID: p_schId,
                LOG_ID: p_logId
            });
        }
        // JOB_SUB_MSTR INSERT
        await global.WiseMetaDB.insert('JOB_SUB_MSTR', s_schJobSubMstr, true);
    }
}