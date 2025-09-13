import { Op, Transaction } from "sequelize";
import { WiseCronJobInterface } from "../../wp-type/WP_CRON_INFO";
import { WP_META_DB } from "../../wp-type/WP_META_DB";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import { WiseStorageManager } from "../data-storage/WiseStorageManager";
import { WpScheduleManagement } from "./schedule-mng";
import { JOB_SUB_MSTR_ATT } from "../../metadb/model/JOB_SUB_MSTR";
import { wpUid } from "../wp-uuid";

const moment = require('moment');
const request = require('request');
const CronJobManager = require('cron-job-manager');
/**
 * 저장된 워크플로우를 스케쥴에 등록하고 실행하는 클래스.
 * 
 * @example
 * ```ts
 *  wpCronJobMng2 = new WiseCronManagement({
 *           USER_NO:p_adminUser[0].USER_NO,
 *           USER_ID:p_adminUser[0].USER_ID,
 *           USER_MODE:'ADMIN',
 *           USER_TOKEN:p_adminToken,
 *           HDFS_TOKEN :  Buffer.from(`root:${p_adminUser[0].PASSWD}`, "utf8").toString('base64')
 *           });
 * 
 *  wpCronJobMng2.init();
 * ```
 */
export class WiseCronManagement implements WiseCronJobInterface {

    o_metaDb: WP_META_DB;
    o_userInfo: WP_SESSION_USER;
    o_cronJob: any;

    o_wiseStorageMng: WiseStorageManager;
    o_schMng: WpScheduleManagement;
    // SLACK 주석처리 
    // o_slackMng: WpSlackManagement = new WpSlackManagement();

    constructor(p_userInfo: WP_SESSION_USER) {
        this.o_userInfo = p_userInfo;
        this.o_metaDb = global.WiseMetaDB;
        this.o_schMng = new WpScheduleManagement(p_userInfo);
        if(p_userInfo.AppConfig == undefined) {
            p_userInfo.AppConfig = global.WiseAppConfig;
        }
        this.o_wiseStorageMng = new WiseStorageManager(p_userInfo, global.WiseStorage);
        (async () => {
            // await this.init();
        })();
    }
    checkJobInit(): void {
        throw new Error("Method not implemented.");
    }
    init() {
        console.log('크론탭시작');
        this.o_cronJob = new CronJobManager( // this creates a new manager and adds the arguments as a new job.
            'init_cron',
            '* * * * *', // the crontab schedule
            // '* * * * * *' // WPLAT-412 * * * * * * 로 하면 1초마다 작동, 맨 앞자리가 초단위이니 */5 하면 5초, */60 하면 60초 마다 작동함
            () => {
                try {
                    console.log('1분 마다 작업 실행 :', new Date().toString());
                    // 실행중인 cron list
                    // var jobs = CronManager.listCrons();
                    console.log("현재 등록된 cron : ", Object.keys(this.o_cronJob.jobs));
                    let s_sql = `SELECT A.*, B.WF_NM, B.WF_PATH ,
                                    CASE WHEN REALTIME_INFO IS NULL THEN 'WORKFLOW' ELSE 'REALTIME' END AS SCH_TYPE,
                                    APP_INFO.APP_SVC_IP, APP_INFO.APP_SVC_PORT
                                    FROM WK_SCH_MSTR A 
                                    INNER JOIN WF_MSTR B ON A.WF_ID = B.WF_ID
                                    INNER JOIN DP_USER_PROFILE USER_PROFILE ON A.REG_USER_NO = USER_PROFILE.USER_NO
		                            LEFT OUTER JOIN SERVER_APP_INFO APP_INFO ON USER_PROFILE.APP_NO = APP_INFO.APP_NO
                                    WHERE A.DEL_YN='N' AND A.SCH_STATUS NOT IN ('BATCH_40', 'BATCH_30') AND A.SCH_STATUS !='REALTIME_30'
                                    
                                UNION ALL 

                                SELECT A.SCH_ID,
                                        A.SCH_NM,
                                        A.DEL_YN,
                                        A.SCH_STATUS,
                                        A.SCH_ST AS ST_DT, 
                                        A.SCH_ED AS ED_DT,
                                        A.SCH_CRON AS CRON_PARAM,
                                        '' AS CRON_INFO,
                                        A.REG_USER_NO,
                                        A.REG_DATE,
                                        A.MODEL_ID AS WF_ID,
                                        NULL AS USE_CORE,
                                        NULL AS USE_MEMORY,
                                        NULL AS REALTIME_INFO,
                                        B.MODEL_NM AS WF_NM,
                                        NULL AS WF_PATH, 
                                        'WP' AS SCH_TYPE,
                                        APP_INFO.APP_SVC_IP,
                                        APP_INFO.APP_SVC_PORT
                                        FROM DP_SCH_MSTR A
                                        INNER JOIN DP_MODEL_MSTR B ON A.MODEL_ID = B.MODEL_ID
                                        INNER JOIN DP_USER_PROFILE USER_PROFILE ON A.REG_USER_NO = USER_PROFILE.USER_NO
			                            LEFT OUTER JOIN SERVER_APP_INFO APP_INFO ON USER_PROFILE.APP_NO = APP_INFO.APP_NO
                                    WHERE A.DEL_YN='N' 
                                    AND A.SCH_STATUS != 40`;


                    this.o_metaDb.query(s_sql, '', true).then(async (p_schResult) => {
                        // console.log("#####크론 매니저 SchResult#####", SchResult);
                        for (let s_sch of p_schResult) {
                            // let s_nowDate = moment().tz("Asia/Seoul").format();
                            let s_nowDate = moment().tz("Asia/Seoul");
                            // 워크플로우, 프로핏 배치
                            if (s_sch['SCH_TYPE'] == 'WP' || s_sch['SCH_TYPE'] == 'WORKFLOW') {
                                let s_startDate = moment(s_sch['ST_DT'], 'YYYY-MM-DD HH:mm:ss').subtract(1, 'minute');
                                let s_endDate = moment(s_sch['ED_DT']);
                            // 프로핏, 워크플로우 배치
                                // cron 추가 조건
                                // 1. 현재시간이 시작날짜보다 같거나 크고
                                // 2. 종료날짜가 시작날짜보다 같거나 크고
                                // 3. 배치 정지 상태가 아니고
                                // 4. 실행중인 cron에 해당 스케줄이 등록이 안되있으면
                                if (
                                    // #28 시작시간 1분전에 시작됨. cron-manager에서 첫 배치시간대에는 등록만하고 작업을 하지 않기 때문.
                                    (s_nowDate >= s_startDate) &&
                                    (s_nowDate <= s_endDate) &&
                                    (s_sch['SCH_STATUS'] != 'BATCH_30' || s_sch['SCH_STATUS'] != '99') &&
                                    (this.o_cronJob.exists(String(s_sch['SCH_ID'])) == false)
                                ) {
                                    // 크론 등록 함수.
                                    // 크론 태우기 전에 기존 로그값을 99 / 재시작으로 업데이트하고 크론에 태움

                                    // if (s_sch['SCH_TYPE'] == 'WP') {
                                    //     let s_wpCronMng = new WpCronJobManagement(this.o_userInfo);
                                    //     s_wpCronMng.init(s_sch['SCH_ID'], this.o_cronJob);

                                    // }
                                    if (s_sch['SCH_TYPE'] == 'WORKFLOW') {
                                        global.WiseMetaDB.update('WK_SCH_LOG', { LOG_STATUS: '99', ERROR_MSG: '스케줄 또는 서버 재시작' }, { SCH_ID: s_sch['SCH_ID'], LOG_STATUS: '20' }).then(async result => {
                                            // 이거때문에 async 추가. 추후 에러나는지 확인 필요.
                                            await global.WiseMetaDB.update('JOB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: s_sch['SCH_ID'], STATUS: { [Op.ne]: 40 } });
                                            await global.WiseMetaDB.update('JOB_SUB_MSTR', { STATUS: 99, END_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss') }, {SCH_ID: s_sch['SCH_ID'], STATUS: { [Op.ne]: 40 }});
                                            this.add(s_sch, this.o_cronJob);
        
                                        }).catch(function (pErr) {
                                            console.log("sJobSubMstr 로그 에러 : ", pErr);
                                            // next({ status: 310, instance: pErr });
                                        });
        
                                    }
                                    // cron 종료 조건
                                    // 1. 현재날짜가 종료날짜보다 크고
                                    // 2. 배치 종료가 아니고
                                    // 3. cron에 등록되어 있으면
                                } else if (
                                    (s_nowDate >= s_endDate) &&
                                    (s_sch['SCH_STATUS'] != 'BATCH_40')
                                ) {
                                    // if(s_sch['SCH_TYPE'] == 'WP')
                                    // {
                                    //     let s_wpCronMng = new WpCronJobManagement(this.o_userInfo); 
                                    //     s_wpCronMng.finish(s_sch['SCH_ID'],this.o_cronJob);
                                    // }
                                    // else
                                    this.finish(s_sch, this.o_cronJob);
                                }
                            }
                            // 실시간 수집 실행
                            if (s_sch['SCH_TYPE'] == 'REALTIME') {
                                if (s_sch['SCH_STATUS'] == 'REALTIME_20' || s_sch['SCH_STATUS'] == 'REALTIME_30') {
                                    // 실시간 실행 뷰테이블 있는지 체크.
                                    // groupId를 생성 시점은 스케줄 등록할 때. db에 넣으면서 추가한다. {REALTIME_INFO: rfqjkafhdkwslf} - JSON string으로 
                                    let s_realtimeInfo = JSON.parse(s_sch['REALTIME_INFO']);
                                    let s_endFlag = false;
                                    // 워크플로우 내에 있는 I-STREAMING 컴포넌트의 뷰테이블이 존재하는지 확인. 하나라도 존재하지 않다면 재실행 필요.
                                    for await (const s_jobId of s_realtimeInfo['jobId']) {
                                        let s_viewTable = `${s_sch['REG_USER_NO']}_${s_realtimeInfo['groupId']}_${s_jobId}`;
                                        let s_active = await this.o_schMng.checkRealtimeStatus(s_viewTable);
                                        // 실시간 실행 뷰테이블이 없다면 정지 상태로 변경해야 함.
                                        if (!s_active && s_sch['SCH_STATUS'] == 'REALTIME_20')
                                            s_endFlag = true;
                                        // 정지해야 하는 테이블이 아직 존재한다면
                                        if (s_active && s_sch['SCH_STATUS'] == 'REALTIME_30')
                                            this.o_schMng.stopRealtimeJob(s_viewTable);
                                    }
                                    if (s_endFlag){
                                        // 에러가 발생/이미 완료된 상태이면 groupId를 재생성하고 상태를 정지 상태로 변경해야 한다.
                                        let s_jobSubResult = await global.WiseMetaDB.select('JOB_SUB_MSTR', ['COM_ID', 'STATUS'], { ID: s_realtimeInfo['groupId'] });
                                        let s_errCnt = 0; // 에러
                                        let s_finCnt = 0; // 완료
                                        s_jobSubResult.forEach((s_jobResult: JOB_SUB_MSTR_ATT) => {
                                            if (s_jobResult['STATUS'] == 40){
                                                s_finCnt += 1;
                                            }else if (s_jobResult['STATUS'] == 99){
                                                s_errCnt += 1;
                                            }
                                        });
                                        if (s_errCnt > 0 || s_jobSubResult.length == s_finCnt) {
                                            let s_newJobId = wpUid();
                                            let s_realtimeInfo = JSON.parse(s_sch['REALTIME_INFO']);
                                            s_realtimeInfo['groupId'] = s_newJobId;
                                            await global.WiseMetaDB.update('WK_SCH_MSTR', { SCH_STATUS: 'REALTIME_30', REALTIME_INFO: JSON.stringify(s_realtimeInfo) }, { SCH_ID: s_sch['SCH_ID'] });
                                        }
                                    }
                                }
                            }
                            
                        }
                    })
                }
                catch (e) {
                    console.log(e);
                }
            },
            {
                // extra options.. 
                // see https://www.npmjs.com/package/cron for all available
                // start: true,
                timeZone: "Asia/Seoul",
                onComplete: () => {
                    console.log(`CRON : init_cron FINISHED`);
                }
            }
        );
        // WPLAT-128 config.json 파일의 CRON 이 true 일때만 서버 켤 때 자동 실행.
        if (global.WiseAppConfig.CRON) {
            this.o_cronJob.start("init_cron");
        }
    }
    getAnalyticDataNm() {
        return new Promise<WiseReturn>((resolve, reject) => {
            resolve({ isSuccess: true, result: '' });
        });
    }
    add(p_schData: any, p_cronManager: any) {
        let that = this;
        let o_execUser = {
            USER_ID: '',
            USER_NO: 0,
            USER_MODE: ''
        }
        p_cronManager.add(String(p_schData['SCH_ID']), p_schData['CRON_PARAM'], () => {
            try {
                // #28 JOB_SUB_MSTR에서 SCH_ID값으로 MAX(LOG_ID) 조회
                // STATUS 30을 제외한 STATUS 조회(20, 99, 40)
                global.WiseMetaDB.query(`
                    SELECT 
                        LOG_STATUS, 
                        (SELECT MAX(LOG_ID) AS LOG_ID FROM WK_SCH_LOG WHERE SCH_ID=${p_schData['SCH_ID']}) AS LOG_ID
                    FROM WK_SCH_LOG 
                    WHERE SCH_ID=${p_schData['SCH_ID']} 
                    AND LOG_ID = (SELECT MAX(LOG_ID) FROM WK_SCH_LOG WHERE SCH_ID=${p_schData['SCH_ID']}  AND LOG_STATUS!=30)
                `, '', true).then(async (p_logResult) => {

                    // 최초 스케줄이면 LOG_ID = 1 아니면 + 1
                    if (p_logResult.length == 0) {
                        p_schData['LOG_ID'] = 1;
                    } else {
                        p_schData['LOG_ID'] = p_logResult[0].LOG_ID + 1;
                    };
                    let s_nowDate = moment().tz("Asia/Seoul").format();
                    let s_endDate = moment(new Date(p_schData['ED_DT'])).tz("Asia/Seoul").format();
                    if (p_cronManager.exists(String(p_schData['SCH_ID'])) == true && (s_endDate > s_nowDate)) {
                        
                        
                        await global.WiseMetaDB.update('WK_SCH_LOG', {LOG_STATUS: 99, ERROR_MSG: '시간내 처리 불가'}, {LOG_STATUS:20, SCH_ID:p_schData['SCH_ID']})
                        // 만약 status30 제외 최신 로그의 status가 20이면 이번 스케줄은 skip이라고 표시(배치안돌고 건너뜀)
                        
                            // p_schData를 그대로 사용하면 p_schData의 LOG_ID를 변경할때 executeScheduleJob 함수 안에 있는 p_schData까지 영향을 받음
                            // 그래서 배치 건너뛰지 않고 실행해야 할때, 실행하는 시점의 p_schData 데이터를 s_schData로 deepcopy 해서 이후 p_schData의 변동에 영향을 받지 않게 한다.
                            const s_schData = JSON.parse(JSON.stringify(p_schData))
                            // #28 WF_MSTR 값 불러오기
                            global.WiseMetaDB.select('WF_MSTR', ['WF_PATH'], s_schData['WF_ID']).then(function (p_wfResult) {
                                // 실행할 workflow 경로
                                let s_wfPath = p_wfResult[0]['WF_PATH'];
                                let s_core = s_schData['USE_CORE'];
                                let s_memory = s_schData['USE_MEMORY'];
                                // 유저정보
                                global.WiseMetaDB.select('DP_USER_MSTR', [], { [Op.or]: [{ DEL_YN: 'N' }, { DEL_YN: 'E' }], USER_NO: p_schData['REG_USER_NO'] }).then(async s_userResult => {
                                    o_execUser.USER_ID = s_userResult[0]['USER_ID'];
                                    o_execUser.USER_NO = s_userResult[0]['USER_NO'];
                                    o_execUser.USER_MODE = s_userResult[0]['USER_MODE'];

                                    await global.WiseMetaDB.insert('WK_SCH_LOG',
                                        {
                                            SCH_ID: s_schData['SCH_ID'],
                                            LOG_ID: s_schData['LOG_ID'],
                                            LOG_STATUS: 20,
                                            ST_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss'),
                                        }, false);


                                    let s_param = {
                                        logId: s_schData['LOG_ID'],
                                        schId: s_schData['SCH_ID'],
                                        batch: true,
                                        userno: String(o_execUser.USER_NO),
                                        userId: o_execUser.USER_ID,
                                        usermode: o_execUser.USER_MODE,
                                        location: 'schedule',
                                        memory: `${s_memory}mb`,
                                        core: s_core,
                                        svcIp : s_schData['APP_SVC_IP'],
                                        svcPort : s_schData['APP_SVC_PORT']
                                    };  

                                    await that.o_schMng.executeScheduleJob(s_wfPath, JSON.stringify(s_param), s_schData, o_execUser);

                                })


                            }).catch(async (pErr: any) => {
                                console.log("getWfMstr 조회 에러 : ", pErr);
                                // next({ status: 320, instance: pErr });
                                await global.WiseMetaDB.insert('WK_SCH_LOG',
                                    {
                                        SCH_ID: p_schData['SCH_ID'],
                                        LOG_ID: p_schData['LOG_ID'],
                                        LOG_STATUS: 99,
                                        ST_DT: moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss'),
                                        ERROR_MSG: pErr
                                    }, false);
                            });
                        //고용노동부 코드 적용 시 주석 해야됨 시작     
                        // };
                        //고용노동부 코드 적용 시 주석 해야됨 끝
                    };
                });

            } catch (e) {
                console.log("e : ", e);
                console.log(String(p_schData['SCH_ID']) + " Error : ", e);
                let s_param = { LOG_ID: p_schData['LOG_ID'], SCH_ID: p_schData['SCH_ID'], STATUS: 99, ERROR_MSG: e };
                that.o_schMng.updateLog(s_param, { SCH_ID: p_schData['SCH_ID'], LOG_ID: p_schData['LOG_ID'] }).then(function (pLogResult) {
                    console.log(`스케줄 ${p_schData['SCH_ID']}의  ${p_schData['LOG_ID']} 로그 실패`);
                });
            }
        },
            {
                // extra options.. 
                // see https://www.npmjs.com/package/cron for all available
                start: true,
                timeZone: "Asia/Seoul",
                onComplete: () => {
                    console.log(`CRON : ${String(p_schData['SCH_ID'])} FINISHED`);
                }
            });

        // cron 설정 후 시작.
        p_cronManager.start(String(p_schData['SCH_ID']));
        this.o_schMng.changeWkStatus(p_schData['SCH_ID'], 'BATCH_20').then((updateSchMstr) => {
            global.WiseSocketServer.sendClientMsg(global.WiseSocketServer.getId(), 'statusCron', { SCH_ID: p_schData['SCH_ID'], SCH_STATUS: 'BATCH_20' });
            console.log(`${String(p_schData['SCH_ID'])}  스케줄 등록 완료`);
            this.insertDsViewHistory(p_schData, 'start');
        }).catch((error) => {
            console.log("errror : ", error);
            console.log(`DP_SCH_MSTR ${p_schData['SCH_ID']} 스케줄 상태 20 변경 에러`);
        });
    }
    delete(p_schData: any, p_type: string = 'delete') {
        try {
            if (this.o_cronJob.exists(p_schData['SCH_ID']) == true) {
                this.o_cronJob.deleteJob(p_schData['SCH_ID']);
            }
            // #28. DS_VIEW_HISTORY 에 추가.
            if (p_type == 'edit') {

                this.insertDsViewHistory(p_schData, 'edit');
            } else {
                this.insertDsViewHistory(p_schData, 'delete');
            }
        } catch (e) {
            console.log("deleteCron Error : ", e);
        }
    }
    finish(p_schData: any, p_cronManager: any) {
        try {

            // 만약에 등록된 cron이면 cron상에서도 제거함.
            if (p_cronManager.exists(String(p_schData['SCH_ID'])) == true) {
                p_cronManager.deleteJob(String(p_schData['SCH_ID']));
                console.log("스케줄 종료");
            }
            this.o_schMng.changeWkStatus(p_schData['SCH_ID'], 'BATCH_40').then(p_result => {
                global.WiseSocketServer.sendClientMsg(global.WiseSocketServer.getId(), 'statusCron', { SCH_ID: p_schData['SCH_ID'], SCH_STATUS: 'BATCH_40' });
                console.log(String(p_schData['SCH_ID']) + " SCH_STATUS UPDATE SUCESS");
                // #28. DS_VIEW_HISTORY 에 추가.
                this.insertDsViewHistory(p_schData, 'finish');
            }).catch((err) => {
                console.log("err : ", err);
                console.log(`DP_SCH_MSTR ${p_schData['SCH_ID']} 스케줄 상태 40 변경 에러`);
            });
        } catch (e) {
            console.log("finishCron Error : ", e);
        }
    }
    pause(p_schData: any) {
        try {
            if (this.o_cronJob.exists(String(p_schData['SCH_ID'])) == true) {
                this.o_cronJob.stop(String(p_schData['SCH_ID']));
            }
            this.insertDsViewHistory(p_schData, 'pause');
        } catch (e) {
            console.log("pauseCron Error : ", e);
        }
    }
    run(p_schData: any) {
        try {
            console.log("CronManager.exists(String(pSchData['SCH_ID'])) : ", this.o_cronJob.exists(String(p_schData['SCH_ID'])));
            if (this.o_cronJob.exists(String(p_schData['SCH_ID'])) == true) {
                this.o_cronJob.start(String(p_schData['SCH_ID']));
                // #28. DS_VIEW_HISTORY 에 추가.
                this.insertDsViewHistory(p_schData, 'restart');
            } else {
                //변경해야됨 kjs
                this.add(p_schData, this.o_cronJob);
            }

        } catch (e) {
            console.log("pauseCron Error : ", e);
        }
    }
    insertDsViewHistory(p_schData: any, p_type: string) {
        if (p_type == 'edit') {
            if (p_schData['BEFORE_WF_ID'] != '') {
                p_schData['WF_ID'] = p_schData['BEFORE_WF_ID'];
            }
        }
        global.WiseMetaDB.select('WF_USE_DATASET', [], { WF_ID: p_schData['WF_ID'], OUTPUT_YN: 'Y' }).then(p_wfDataResult => {
            let s_today = moment().tz("Asia/Seoul").format('YYYY-MM-DD HH:mm:ss');
            if (p_wfDataResult.length > 0) {
                let s_historyArray = [];
                for (let s_idx in p_wfDataResult) {
                    let s_tempParam = {
                        H_TYPE: 'SCHEDULE',
                        OPERATION: p_type,
                        DS_VIEW_ID: p_wfDataResult[s_idx]['DS_VIEW_ID'],
                        UP_USER_ID: p_schData['REG_USER_NO'],
                        SCH_ID: p_schData['SCH_ID'],
                        UPD_DT: ''
                    }
                    if (p_type == 'finish') {
                        s_tempParam.UPD_DT = p_schData['ED_DT'];
                    } else if (p_type == 'restart') {
                        s_tempParam.UPD_DT = s_today;
                        s_tempParam.OPERATION = 'start'
                    } else {
                        s_tempParam.UPD_DT = s_today;
                    }
                    s_historyArray.push(s_tempParam);
                }
                global.WiseMetaDB.insert('DS_VIEW_HISTORY', s_historyArray, true).then(result => {
                    console.log(String(p_schData['SCH_ID']) + ` cron ${p_type}`);
                });
            }
        })
    }

}