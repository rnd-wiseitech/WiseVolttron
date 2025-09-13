import express, { NextFunction, Request, Response } from 'express';
import { WpSparkApiManager } from '../util/spark-api/spark-api-mng';
import {v4 as uuid4} from 'uuid';
import { JobMstr, JOB_ATT } from '../util/job/job';
import { wpUid } from '../util/wp-uuid';
import { WpScheduleManagement } from '../util/schedule/schedule-mng';
import { WP_CONFIG } from '../wp-type/WP_CONN_ATT';

const moment = require('moment');

export const pyApiRoute = express.Router();

pyApiRoute.post('/',async (req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    
    let s_userNo = req.decodedUser.USER_NO;
    // #54 binlog 통합
    let s_binLog = global.WiseBinLog;   
    // #121 워크플로우 저장 데이터 추가

    let s_mode = s_body?.mode ?? null;
    
    let s_jobParam:JOB_ATT = {
        jobId:s_body.jobId,
        clientId:s_body.clientId,
        data:s_body.wkSaveData,
        token:req.decodedUser.USER_TOKEN,
        mode: s_mode
    };
    let s_jobMstr = new JobMstr(s_jobParam);
    let s_ = [];

    // WF_MSTR, WF_COM_MSTR 작업
    await s_jobMstr.saveWorkflowMetaDb(s_body.wkSaveData, s_userNo);
    s_jobMstr.setJobList(Object.values(s_body.data));
    s_binLog.setJob(s_jobMstr);
    s_jobMstr.call('workflow').then(pCallResult=>{
        res.json({ success: true, reVal: pCallResult });
    }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/selectAll',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

    s_sparkApiMng.onCallApi(`/selectAll`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/select',async (req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;
    let s_userAppConfig: WP_CONFIG;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    // #37 공유된 데이터의 경우 userno 존재함
    if (!s_body['userno']) {
        s_body['userno'] = req.decodedUser.USER_NO;
    }
    // userId 추가
    if (!s_body['userId']) {
        s_body['userId'] = req.decodedUser.USER_ID;
    }
    // userMode 추가
    if (!s_body['usermode']) {
        s_body['usermode'] = req.decodedUser.USER_MODE;
    }
    
    // rdbms, hdfs, ftp 일 경우
    if (['I-DATABASE', 'I-HIVE', 'I-HDFS', 'I-FTP', 'I-STORAGE', 'I-IMAGE-STORAGE'].includes(s_body.method)) {
        // s_url = '/' + s_body.action;
        if (s_body.method == 'I-DATABASE' || s_body.method == 'I-FTP') {
            let s_ds = await s_metaDb.select('DS_MSTR', [], { DS_ID: s_body.data.dsId });
            let sDsInfo = s_ds[0].get({ plain: true });
            if (s_body.method == 'I-DATABASE') {
                s_body['data']['dbuser'] = sDsInfo.USER_ID;
                s_body['data']['dbpassword'] = sDsInfo.PASSWD;
            }
            if (s_body.method == 'I-FTP') {
                if (s_body['data']['filepath'].charAt(0) !== '/') {
                    s_body['data']['filepath'] = `/${s_body['data']['filepath']}`
                }
                s_body['data']['ftpuser'] = sDsInfo.USER_ID;
                s_body['data']['ftppassword'] = sDsInfo.PASSWD;
            }
        }
        // 워크플로우 실행시 필요한 userID, userpassword. UI 쪽에서 사용하지 않고 서버내부에서만 사용
        // HDFS 일반 사용자 파일 경로 수정
        if (['I-HDFS', 'I-STORAGE', 'I-IMAGE-STORAGE'].includes(s_body.method)) {
            
            if (!s_body['data']['host']) {
                s_body['data']['host'] = global.WiseAppConfig.WP_API.host;
            }
            // 워크플로우 로드했을 경우
            if (s_body['wf_regUserno'] !== undefined && s_body['wf_regUserno'] !== null) {
                if (s_body['wf_regUserno'] == req.decodedUser.USER_NO) {
                  if (req.decodedUser.USER_MODE === 'USER') {
                    s_body['data']['filepath'] = prependUserPath(String(req.decodedUser.USER_NO), s_body['data']['filepath']);
                  }
                } else {
                  let s_regUsermode = await s_metaDb.select('DP_USER_PROFILE', ['USER_MODE'], { USER_NO: s_body['wf_regUserno'] });
                  if (s_regUsermode[0]?.USER_MODE === 'USER') {
                    s_body['data']['filepath'] = prependUserPath(String(s_body['wf_regUserno']), s_body['data']['filepath']);
                  }
                }
              } else {
                if (req.decodedUser.USER_MODE === 'USER') {
                  s_body['data']['filepath'] = prependUserPath(String(req.decodedUser.USER_NO), s_body['data']['filepath']);
                }
              }
        }
        if (s_body.method == 'I-HIVE') {
            if (!s_body['data']['dbhost']) {
                s_body['data']['dbhost'] = "wp-spark-master";
            }
        }
    }
    if (s_body.method == "feature-importance") {
        // UI쪽에서는 USERNO가 없는 group_id + 이전 job_id 형태여서 USER_NO를 붙여줘야 함.
        let sTempUseTable = s_body['data']['tempUseTable'];
        let sGroupId = sTempUseTable.split('_')[0];
        let sJobId = Number(sTempUseTable.split('_')[1]);
        s_body['groupId'] = sGroupId;
        s_body['jobId'] = (sJobId+1).toString();
        s_body['data']['usetable'] = `${req.decodedUser.USER_NO}_${sGroupId}_${sJobId}`;
        delete s_body['data']['tempUseTable'];
    }

    let s_today = moment().format('YYYY-MM-DD HH:mm:ss');
    let s_jobId = wpUid();
    let s_jobMstr = {
        ID: s_jobId,
        NAME: 'DATA-MNG-SELECT',
        STATUS: 20,
        ST_DT: s_today,
        DESC: '',
        LOCATION: s_body['location'].toUpperCase(),
        // USER_NO: '1000',
        USER_NO: req.decodedUser.USER_NO,
        ERROR_MSG: ''
    };

    let s_jobSubMstr = {
        ID: s_jobId,
        JOB_ID: "0",
        P_JOB_ID: '["0"]',
        COM_ID: 'DATA-MNG-SELECT',
        STATUS: 20,
        ST_DT: s_today,
        DATA: JSON.stringify(s_body),
        ERROR_MSG: ''
    };

    s_metaDb.getConnection().transaction(async pT=>{
        try {
            await s_metaDb.insert('JOB_MSTR',s_jobMstr,false);
            await s_metaDb.insert('JOB_SUB_MSTR',s_jobSubMstr, false);
            s_userAppConfig = await req.decodedUser.AppConfig;
            return true;
        } catch (error) {
            pT.rollback();
        }
    }).then(p_insertResult=>{

        let s_sparkApiMng = new WpSparkApiManager(s_userAppConfig);
        s_sparkApiMng.onCallApi('/job/input',
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(async p_result => {
                                let s_today = moment().format('YYYY-MM-DD HH:mm:ss');
                                await s_metaDb.update('JOB_MSTR',{STATUS: 40, END_DT: s_today},{ID: s_jobId});
                                await s_metaDb.update('JOB_SUB_MSTR',{STATUS: 40, END_DT: s_today},{ID: s_jobId});
                                res.json(p_result);
                            }).catch(async p_err => { 
                                let s_today = moment().format('YYYY-MM-DD HH:mm:ss');
                                await s_metaDb.update('JOB_MSTR',{STATUS: 99,ERROR_MSG:p_err.message, END_DT: s_today},{ID: s_jobId});
                                await s_metaDb.update('JOB_SUB_MSTR',{STATUS: 99,ERROR_MSG:p_err.message, END_DT: s_today},{ID: s_jobId});
                                next(p_err) 
                            });
    }).catch(async p_err => { 
        let s_today = moment().format('YYYY-MM-DD HH:mm:ss');
        await s_metaDb.update('JOB_MSTR',{STATUS: 99,ERROR_MSG:p_err, END_DT: s_today},{ID: s_jobId});
        await s_metaDb.update('JOB_SUB_MSTR',{STATUS: 99,ERROR_MSG:p_err, END_DT: s_today},{ID: s_jobId});
        next(p_err) 
    });
});

pyApiRoute.post('/page',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    let s_apiUrl:any = req.decodedUser.AppConfig;
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_body['userno'] = req.decodedUser.USER_NO;
    s_body['userId'] = req.decodedUser.USER_ID;
    s_body['usermode'] = req.decodedUser.USER_MODE;
    if (s_body['groupId'] != 'hive') {
        s_body.data['usetable'] = s_body['data']['dataUserno'] + "_" + s_body.data['usetable']
    }

    if(req.decodedUser.USER_NO != s_body.data['dataUserno']){
        s_apiUrl = {
            WP_API: {
                host:  s_body.data.APP_SVC_IP,
                port: s_body.data.APP_SVC_PORT,
                monitoring_port:30095
            },
        };
    }
    

    let s_sparkApiMng = new WpSparkApiManager(s_apiUrl);

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/correlation',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    let s_apiUrl:any = req.decodedUser.AppConfig;
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    if(req.decodedUser.USER_NO != s_body.data['dataUserno']){
        s_apiUrl = {
            WP_API: {
                host:  s_body.data.APP_SVC_IP,
                port: s_body.data.APP_SVC_PORT,
                monitoring_port:30095
            },
        };
    }
    let s_sparkApiMng = new WpSparkApiManager(s_apiUrl);

    // workflow 상관관계
    if(s_body.userno == undefined) {
        s_body.userno = req.decodedUser.USER_NO;
        s_body.data.usetable = String(req.decodedUser.USER_NO) + "_" + s_body.data.usetable;
    }
    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/upload',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});


// 20211208 모니터링에서 job 또는 stage 정지시키기
pyApiRoute.post('/kill',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

    s_sparkApiMng.onCallApi(`/spark/kill`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/hive',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    s_body['userno'] = req.decodedUser.USER_NO;
    s_body['usermode'] = req.decodedUser.USER_MODE;
    s_body['userid'] = req.decodedUser.USER_ID;
    s_body['location'] = 'data manager'
    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/datasetHive',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

    let s_param = {
        action: 'hive',
        method: 'DATASET',
        groupId: 'datasetHive',
        jobId: '1',
        userId: req.decodedUser.USER_ID,
        userno: req.decodedUser.USER_NO,
        usermode: req.decodedUser.USER_MODE,
        location: 'data manager',
        data: s_body
    };

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

// #67 실행중인 spark job 중지
pyApiRoute.post('/cancel',async (req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    // if (!s_body['realtime']) {
    //     let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    //     let s_param = {
    //         action: "manage",
    //         method: "KILL",
    //         userno: req.decodedUser.USER_NO,
    //         userId: req.decodedUser.USER_ID,
    //         usermode: req.decodedUser.USER_MODE,
    //         groupId: "manage",
    //         jobId: 1,
    //         location: "data manager",
    //         data: {
    //             jobGroup: `${req.decodedUser.USER_NO}_${s_body['viewname']}`
    //         }
    //     };

    //     s_sparkApiMng.onCallApi(`/job`,
    //         JSON.stringify(s_param),
    //         {
    //             'Content-Type': 'application/json',
    //             'groupId': s_body.groupId,
    //             'jobId': s_body.jobId
    //         }).then(pResult => {
    //             res.json(pResult);
    //         }).catch(pErr => { next(pErr) });
    // }

    if (s_body['realtime']){
        // let s_schMng = new WpScheduleManagement(req.decodedUser);
        // for await (const s_jobId of s_body['jobId']) {
        //     await s_schMng.stopRealtimeJob(`${req.decodedUser.USER_NO}_${s_body['groupId']}_${s_jobId}`);
        // }
        res.json({isSuccess:true, result:'실시간 수집 종료'});
    } else {
        res.json({isSuccess:true, result:'워크플로우 종료'});
    }
});


pyApiRoute.post('/schedule',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    // s_body data param 에 svcIp, svcPort 들어오는거 확인
    let s_appSvcParam = JSON.parse(s_body.data.param)
    let s_userAppConfig : WP_CONFIG =  {
        WP_API: {
            "use": true,
            "host": s_appSvcParam.svcIp,
            "port": s_appSvcParam.svcPort,
            "monitoring_port": 30095
        },
        NODE: undefined,
        PY: undefined,
        META_DB: undefined,
        HIVE_DB: undefined,
        KAFKA: undefined,
        LDAP: undefined,
        JUPYTER: undefined,
        LOAD_BALANCER: false,
        LANG: '',
        BACKGROUND: false,
        PLATFORM_ID: 0,
        ADVANCE: false,
        CLOUD: false,
        CRON: false,
        CRYPTO_TYPE: '',
        LICENSE: '',
        STORAGE_TYPE: '',
        LIB_PATH: '',
        CONFIG: undefined,
        API_TYPE: '',
        ML_PATH: '',
        DS_ID: 0,
        DBLIST: undefined,
        KEY_PATH: '',
        LIVY: undefined,
        FILE_FORMAT:undefined,
        APP_NO: global.WiseAppConfig.APP_NO
    }
    let s_sparkApiMng = new WpSparkApiManager(s_userAppConfig);

    s_sparkApiMng.onCallApi(`/schedule`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { 
                                next(pErr) });
});


pyApiRoute.post('/chart',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    s_body['userno'] = req.decodedUser.USER_NO;
    s_body['usermode'] = req.decodedUser.USER_MODE;
    s_body['userid'] = req.decodedUser.USER_ID;

    s_body['data'].usetable =  `${String(s_body['userno'])}_${s_body['data'].usetable}`
    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/modelDeploy',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);


    let s_param:any = {

    }
    s_param['action'] = 'resource-model-deploy';
    s_param['userno'] = req.decodedUser.USER_NO;
    s_param['usermode'] = req.decodedUser.USER_MODE;
    s_param['userid'] = req.decodedUser.USER_ID;
    s_param['location'] = 'resource-manager'
    s_param['data'] = s_body['p_param']
    s_param['jobId'] = 1
    s_param['groupId'] = 1
    console.log(s_param)
    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});




pyApiRoute.post('/getModelInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    let s_param:any = {
        action: 'model-info',
        method: s_body.method,
        location: s_body.location,
        groupId: 'model-info',
        jobId: 1,
        data: {
            MODEL_ID: s_body.MODEL_ID? s_body.MODEL_ID : null,
            MODEL_IDX: s_body.MODEL_IDX? s_body.MODEL_IDX : null,
            CUSTOM_YN: s_body.CUSTOM_YN? s_body.CUSTOM_YN : null,
            PARAMETER: s_body.PARAMETER? s_body.PARAMETER : null,
            PYTHON_CODE: s_body.PYTHON_CODE? s_body.PYTHON_CODE : null,
            FRAMEWORK_TYPE: s_body.FRAMEWORK_TYPE? s_body.FRAMEWORK_TYPE : null,
        }
      }
    s_param['userno'] = req.decodedUser.USER_NO;
    s_param['usermode'] = req.decodedUser.USER_MODE;
    s_param['userid'] = req.decodedUser.USER_ID;

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_param.groupId, 
                                'jobId': s_param.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});


pyApiRoute.post('/getModelPerformanceHistory',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_param:any = {
        action: 'model-history',
        method: 'model-history',
        location: 'model-manager',
        groupId: 'model-history',
        jobId: 1,
        data: {
            MODEL_ID: s_body.modelId,
        }
      }
    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    s_param['userno'] = req.decodedUser.USER_NO;
    s_param['usermode'] = req.decodedUser.USER_MODE;
    s_param['userid'] = req.decodedUser.USER_ID;

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});


pyApiRoute.post('/setCustomModel',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    let s_param:any = {
        action: 'model-custom',
        method: 'model-custom',
        location: 'model-manager',
        groupId: 'model-custom',
        jobId: 1,
        data: s_body
      }
    s_param['userno'] = req.decodedUser.USER_NO;
    s_param['usermode'] = req.decodedUser.USER_MODE;
    s_param['userid'] = req.decodedUser.USER_ID;

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_param.groupId, 
                                'jobId': s_param.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});
pyApiRoute.post('/runChat',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {

    oToken = '';
    oClientId = '';

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_param:any = {
        action: 'model-predict-lang',
        location: '',
        groupId: 'model-predict-lang',
        jobId: 1,
        data: {
            modelId: s_body.modelId,
            modelIdx: s_body.modelIdx,
            inputText: s_body.inputText,
            clientId: s_body.clientId
        }
    }
    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    s_param['userno'] = req.decodedUser.USER_NO;

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

// (스트리밍1) 파이썬이 보낸 토큰 수신 + UI로 전송
let oToken: any = '';
let oClientId: any = '';
pyApiRoute.post('/token',(req: Request, res: Response,next:NextFunction) => {
    let sToken = req.body.token;
    let sClientId = req.body.clientId;
    console.log('(/token) ID:', sClientId, '| /token 받은 토큰:', sToken);

    if (sToken) {
        oToken = sToken;
        oClientId = sClientId;
    }

    res.status(200).json({ clientId: String(oClientId), message: String(oToken) });

});

const prependUserPath = (userNo: string, filepath: string | string[]) => {
    if (Array.isArray(filepath)) {
      return filepath.map(path => `${userNo}/${path}`);
    } else {
      return `${userNo}/${filepath}`;
    }
  };

pyApiRoute.post('/readImageBase64',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    let s_param = s_body
    s_param['userno'] = req.decodedUser.USER_NO;
    s_param['usermode'] = req.decodedUser.USER_MODE;
    s_param['userid'] = req.decodedUser.USER_ID;

    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_param.groupId, 
                                'jobId': s_param.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

pyApiRoute.post('/readLabelJson',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
    let s_param = s_body

    s_body['userno'] = req.decodedUser.USER_NO;
    s_body['userId'] = req.decodedUser.USER_ID;
    s_body['usermode'] = req.decodedUser.USER_MODE;
    s_sparkApiMng.onCallApi(`/job`,
                            JSON.stringify(s_param),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_param.groupId, 
                                'jobId': s_param.jobId
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});

// 잡다한 기능 있는 job 실행
pyApiRoute.post('/function',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_body['userno'] = req.decodedUser.USER_NO;
    s_body['userId'] = req.decodedUser.USER_ID;
    s_body['usermode'] = req.decodedUser.USER_MODE;

    let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

    s_sparkApiMng.onCallApi(`/job/function`,
                            JSON.stringify(s_body),
                            {   
                                'Content-Type': 'application/json', 
                                'groupId': s_body.groupId, 
                                'jobId': s_body.jobId 
                            }).then(pResult => {
                                res.json(pResult);
                            }).catch(pErr => { next(pErr) });
});
