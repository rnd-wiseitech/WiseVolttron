import express, { NextFunction, Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { WK_SCH_MSTR_ATT } from '../metadb/model/WK_SCH_MSTR';
import { WpScheduleManagement } from '../util/schedule/schedule-mng';
import { wpUid } from '../util/wp-uuid';
import { WF_COM_MSTR_ATT } from '../metadb/model/WF_COM_MSTR';
import { getCOM_ID } from '../../wp-lib/src/lib/wp-meta/com-id';

const moment = require('moment');
const COM_ID: Record<string, number> = getCOM_ID();

export const schRoute = express.Router();

schRoute.post('/log',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_query = `
                    SELECT A.*, B.SCH_NM FROM DS_VIEW_HISTORY A
                    INNER JOIN WK_SCH_MSTR B ON A.SCH_ID = B.SCH_ID
                    WHERE A.DS_VIEW_ID=${s_body.viewId} AND H_TYPE='SCHEDULE'`;

    s_metaDbMng.getConnection().query(s_query,{ type: QueryTypes.SELECT }).then(p_result => {
        // console.log(p);
        res.json({ success: true, result: p_result });
    }).catch(function (err) {
        next(err);
    });
});


schRoute.post('/schList',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);

    s_schMng.getSchList().then(p_result => {
        // console.log(p);
        if(p_result.isSuccess)
            res.json({ success: true, result: p_result.result });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/logList',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);

    s_schMng.getWkLogList(s_body.SCH_ID).then(p_result => {
        // console.log(p);
        if(p_result.isSuccess)
            res.json({ success: true, result: p_result.result });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/schNmList',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_query = ` SELECT SCH_NM
                    FROM WK_SCH_MSTR 
                    WHERE DEL_YN='N' AND REG_USER_NO = ${req.decodedUser.USER_NO}
                    GROUP BY SCH_ID 
                    ORDER BY SCH_ID DESC`;

    s_metaDbMng.query(s_query,'',true).then(p_result => {
        res.json({ success: true, result: p_result });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/wkNmList',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_query = '';
    if (!s_body.realtime){
        s_query = `  SELECT 
                        WF_ID,
                        WF_NM
                    FROM WF_MSTR 
                    WHERE 1 = 1
                    ${req.decodedUser.USER_MODE == 'ADMIN' ? `` : ` AND REG_USER=${req.decodedUser.USER_NO}`} 
                    AND WF_TYPE='save' 
                    AND DEL_YN='N'
                    AND WF_ID NOT IN
                    (SELECT WF_ID FROM WK_SCH_MSTR 
                        WHERE 1=1
                        ${req.decodedUser.USER_MODE == 'ADMIN' ? `` : ` AND REG_USER=${req.decodedUser.USER_NO}`}
                        AND DEL_YN='N')
                    ORDER BY 
                    REG_DT DESC`;
    } else {
        s_query = `
        SELECT A.WF_ID, A.WF_NM, A.REG_USER, B.COM_UUID, B.COM_ID, B.COM_TYPE FROM WF_MSTR A
        INNER JOIN WF_COM_MSTR B ON A.WF_ID = B.WF_ID
        WHERE 1=1
        AND A.REG_USER=${req.decodedUser.USER_NO}
        AND A.DEL_YN = 'N'
        AND A.WF_TYPE = 'save' 
        AND ( B.COM_TYPE = 'I-STREAMING' OR B.COM_ID = ${COM_ID['I-STREAMING']} )
        AND A.WF_ID NOT IN (SELECT WF_ID FROM WK_SCH_MSTR WHERE DEL_YN = 'N')
        `; // (25.4.22) COM_TYPE 삭제 예정
    }
    s_metaDbMng.query(s_query,'',true).then(p_result => {
        res.json({ success: true, result: p_result });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/insert',async (req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_cronParam: Partial<WK_SCH_MSTR_ATT>;
    let s_metaDbMng = global.WiseMetaDB;
    
    // 일반 스케줄 등록
    if (!s_body.realtime) {
        s_cronParam = {
            SCH_NM: s_body.SCH_NM,
            // DS_VIEW_ID: params.DS_VIEW_ID,
            DEL_YN: 'N',
            SCH_STATUS: 'BATCH_10',
            ST_DT: moment(s_body.ST_DT).format('YYYY-MM-DD HH:mm:ss'),
            ED_DT: moment(s_body.ED_DT).format('YYYY-MM-DD HH:mm:ss'),
            CRON_PARAM: s_body.CRON_PARAM,
            CRON_INFO: s_body.CRON_INFO,
            REG_USER_NO: req.decodedUser.USER_NO,
            REG_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
            WF_ID: s_body.WF_ID,
            USE_CORE: s_body.USE_CORE,
            USE_MEMORY: s_body.USE_MEMORY
        };
    } else {
    // 실시간 수집 스케줄 등록
        let s_groupId = wpUid();
        // let s_streamingComList:WF_COM_MSTR_ATT[] = await s_metaDbMng.select('WF_COM_MSTR', [], { WF_ID: s_body.WF_ID, COM_TYPE: 'I-STREAMING' });
        let s_query = `
            SELECT * FROM WF_COM_MSTR
            WHERE WF_ID = ${s_body.WF_ID}
                AND ( COM_TYPE = 'I-STREAMING' OR COM_ID = ${COM_ID['I-STREAMING']} )
        `;
        let s_streamingComList:WF_COM_MSTR_ATT[] = await s_metaDbMng.query(s_query, 'WF_COM_MSTR');
        let s_streamingJobId = s_streamingComList.map(s_streamCom => JSON.parse(s_streamCom['WF_DATA'])['jobId']);
        s_cronParam = {
            SCH_NM: s_body.SCH_NM,
            // DS_VIEW_ID: params.DS_VIEW_ID,
            DEL_YN: 'N',
            SCH_STATUS: 'REALTIME_10',
            REG_USER_NO: req.decodedUser.USER_NO,
            REG_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
            WF_ID: s_body.WF_ID,
            REALTIME_INFO: JSON.stringify({ groupId: s_groupId, jobId: s_streamingJobId })
        };
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);

    s_schMng.saveWkSchedule(s_cronParam).then(p_result => {
        res.json({ success: true, result: 'insert success' });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/delete',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);

    s_schMng.deleteWkSchedule(s_body.SCH_ID).then(p_result => {
        global.WiseCronJobMng.delete(s_body, 'delete');
        res.json({ success: true, result: 'delete success' });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/pause',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);
    let s_status = 'BATCH_30';
    if (s_body.REALTIME_INFO) {
        s_status = 'REALTIME_30';
    }
    s_schMng.changeWkStatus(s_body.SCH_ID, s_status).then(p_result => {
        if (!s_body.REALTIME_INFO) {
            global.WiseCronJobMng.pause(s_body);
        }
        res.json({ success: true, result: 'pause success' });
    }).catch(function (err) {
        next(err);
    });
});

schRoute.post('/run',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_schMng = new WpScheduleManagement(req.decodedUser);
    let s_status = 'BATCH_20';
    if (s_body.REALTIME_INFO) {
        s_status = 'REALTIME_20';
    }
    s_schMng.changeWkStatus(s_body.SCH_ID, s_status).then(p_result => {
        if (!s_body.REALTIME_INFO) {
            s_body.ST_DT = moment().format('YYYY-MM-DD HH:mm:ss');
            global.WiseMetaDB.update('WK_SCH_LOG', { LOG_STATUS: '99', ERROR_MSG: '스케줄 또는 서버 재시작' }, { SCH_ID: s_body['SCH_ID'], LOG_STATUS: '20' }).then(result => {
                global.WiseCronJobMng.run(s_body);
            });
            res.json({ success: true, result: 'run success' });
        }
        if (s_body.REALTIME_INFO) {
            let s_realtimeInfo = JSON.parse(s_body['REALTIME_INFO']);
            global.WiseCronJobMng.o_schMng.executeRealtimeJob(req.decodedUser, s_body['WF_ID'], s_body['SCH_ID'], s_realtimeInfo['groupId']).then(p_result => {
                res.json({ success: true, result: 'run success' });
            })
        }
        
    }).catch(function (err) {
        next(err);
    });
});


schRoute.post('/edit',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_nowDate = moment().format('YYYY-MM-DD HH:mm:ss');
    let SCH_STATUS = s_body.SCH_STATUS;

    if((new Date(s_body.ED_DT) > new Date(s_nowDate))) {
        SCH_STATUS = 'BATCH_10';
    }

    let s_updateParam = {
        SCH_NM: s_body.SCH_NM,
        SCH_STATUS: SCH_STATUS,
        ST_DT:  moment(s_body.ST_DT).format('YYYY-MM-DD HH:mm:ss'),
        ED_DT:  moment(s_body.ED_DT).format('YYYY-MM-DD HH:mm:ss'),
        CRON_PARAM: s_body.CRON_PARAM,
        CRON_INFO: s_body.CRON_INFO,
        REG_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
        WF_ID: s_body.WF_ID,
        USE_CORE: s_body.USE_CORE,
        USE_MEMORY: s_body.USE_MEMORY
    };
    let s_schMng = new WpScheduleManagement(req.decodedUser);
    s_schMng.updateWkSchedule(s_updateParam,{ SCH_ID: s_body.SCH_ID }).then(p_result => {
        global.WiseCronJobMng.delete(s_body, 'edit');
        res.json({ success: true, result: 'run success' });
    }).catch(function (err) {
        next(err);
    });
});