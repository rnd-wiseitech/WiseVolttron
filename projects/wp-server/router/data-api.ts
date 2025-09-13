import express, { NextFunction, Request, Response } from 'express';;
import { Op, QueryTypes, Transaction } from 'sequelize';
import { WpError, WpHttpCode } from '../exception/WpError';
import { DS_VIEW_TBL_MSTR_ATT } from '../metadb/model/DS_VIEW_TBL_MSTR';
import { WpDataSourceManager } from '../util/data-source/WpDataSourceManager';
import { DatabaseManagement } from '../util/database-mng/database-mng';
import { WpSparkApiManager } from '../util/spark-api/spark-api-mng';
import { WP_DATASET_ATT, getWpConnectInfo } from '../wp-type/WP_DATASET_ATT';
import { WP_MANIFEST } from '../wp-type/WP_MANIFEST';
import { getCOM_IDListByCategory } from '../../wp-lib/src/lib/wp-meta/com-id';

const moment = require('moment');

export const dataMngRoute = express.Router();

// #205 mssql, mysql
dataMngRoute.post('/TableSearch',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_tableNm = s_body.TableName;

    let s_RootPath = global.WiseStorage['DEFAULT_PATH'];
    let s_remoteFilePath = '';
    let s_storageType = global.WiseAppConfig.STORAGE_TYPE;
    // let s_remoteFilePath = "/user";
    
    if(req.decodedUser.USER_MODE != 'ADMIN')
        s_remoteFilePath += `/${req.decodedUser.USER_NO}`;    
    if (s_body.path != '' && s_body.path != undefined) 
        s_remoteFilePath += '/' + s_body.path;
    s_remoteFilePath += "/" + s_tableNm + ".csv"

    s_metaDbMng.select('DS_MSTR',[],{ DS_ID: s_body.DsId }).then(async (p_dsInfo:any)=>{
            let ip = p_dsInfo[0].IP
            let port = p_dsInfo[0].PORT
            let user = p_dsInfo[0].USER_ID;
            let password = p_dsInfo[0].PASSWD;
            let dbmsType = p_dsInfo[0].DBMS_TYPE.toLowerCase();
            let dbNm = p_dsInfo[0].DB_NM;
            let owner = p_dsInfo[0].OWNER_NM;
           
            let s_param:any = {
                action: "upload",
                method: "RDBMS",
                userno: req.decodedUser.USER_NO,
                userId: req.decodedUser.USER_ID,
                usermode: req.decodedUser.USER_MODE,
                groupId: "upload",
                jobId: 1,
                location: "data manager",
                data: {
                    dbtype: dbmsType,
                    dbhost: ip,
                    dbport: port,
                    dbname: dbNm,
                    tablename: s_body.TableName,
                    dbuser: user,
                    owner: owner,
                    dbpassword: password,
                    filepath: s_remoteFilePath,
                    type: "table",
                    filename: null
                }
            };  

            let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

            s_sparkApiMng.onCallApi(`/job`,
                                    JSON.stringify(s_param),
                                    {   
                                        'Content-Type': 'application/json', 
                                        'groupId': s_body.groupId, 
                                        'jobId': s_body.jobId 
                                    }).then(pResult => {
                                        res.json(pResult);
                                    }).catch(pErr => { next(pErr) });

    }).catch(function (p_err:any) { // select('DS_MSTR'
        next(p_err);
    });
});

dataMngRoute.post('/searchColmnHistory',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_comIds = getCOM_IDListByCategory('data_input', 'data_output').join(',');
    let s_query = `
        select 	a.WF_ID,
        a.WF_NM,
        a.STATUS,
        a.REG_DT as 'WF_REG_DT',
        a.REG_USER as 'WF_USER_NO',
        e.USER_NAME as 'WF_USER_NAME',
        a.WF_TYPE,
        b.COM_ID,
        c.DS_VIEW_ID,
        c.DS_VIEW_IDX,
        d.TBL_NM,
        d.TBL_CAPTION,
        d.REG_USER_NO as 'DS_VIEW_USER_NO',
        f.USER_NAME as 'DS_VIEW_USER_NAME',				
        d.REG_DT as 'DS_VIEW_REG_DT'
        from WF_MSTR  a 
            inner join WF_COM_MSTR b on a.WF_ID = b.WF_ID
            inner join WF_USE_DATASET c on b.WF_ID = c.WF_ID
            inner join DS_VIEW_TBL_MSTR d on c.DS_VIEW_ID = d.DS_VIEW_ID and c.DS_VIEW_IDX = d.VIEW_IDX
            inner join DP_USER_MSTR e on a.REG_USER = e.USER_NO
            inner join DP_USER_MSTR f on d.REG_USER_NO = f.USER_NO
        where 
            a.WF_TYPE ='save'
            and json_extract(b.WF_DATA, '$.wp-data') like '%${s_body.colNm}%'
            and c.OUTPUT_YN = 'Y'
            and a.DEL_YN = 'N'
            and d.DEL_YN = 'N'
            and b.COM_ID not in (${s_comIds})
    `;
            // (25.4.22) s_comIds는 아래 두 조건을 대체함
            // and not b.COM_TYPE like 'I_%'
            // and not b.COM_TYPE like 'O_%'
    s_metaDbMng.getConnection().query(s_query,{ type: QueryTypes.SELECT }).then(p_selectData=>{
        res.json(p_selectData);
    }).catch(function (pErr) {
        next(pErr);
    });
});

dataMngRoute.post('/updateDsMstr',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_dsDataParam = {};
    let s_dsData = s_body.dbData;

    if(s_body.type == 'update')
        s_dsDataParam = {
            // DS_ID: null,
            DS_NM: s_dsData.connection_name,
            DB_NM: s_dsData.database_name,
            TYPE: s_dsData.connection_type,
            IP: s_dsData.ip,
            USER_ID: s_dsData.username,
            PASSWD: s_dsData.password,
            PORT: s_dsData.port,
            DBMS_TYPE: s_dsData.database,
            OWNER_NM: s_dsData.ownername,
            DS_DESC: s_dsData.description,
            UPD_DT:moment().format('YYYY-MM-DD HH:mm:ss'),
            REG_USER_NO: req.decodedUser.USER_NO,
            DEL_YN:'N'
            // UPD_DT: 'N',
            // UPD_USER_NO: 'N'
        };
    else
        s_dsDataParam = {
            UPD_DT:moment().format('YYYY-MM-DD HH:mm:ss'),
            DEL_YN:'Y'
        };
    s_metaDbMng.update('DS_MSTR',s_dsDataParam,{ DS_ID: s_dsData.ds_id }).then((p_result:any)=>{
        if(p_result.length > 0)
            res.json({ success: true, result: p_result });
        else
            throw new WpError({httpCode:WpHttpCode.INTERNAL_SERVER_ERROR,message:'삭제실패.'});
    }).catch(function (p_err:any) {
        next(p_err);
    });
});

dataMngRoute.post('/addDsMstr',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_dsData = s_body.dbData;
    let s_dsDataParam = {
        // DS_ID: null,
        DS_NM: s_dsData.connection_name,
        DB_NM: s_dsData.database_name,
        TYPE: s_body.type,
        IP: s_dsData.ip,
        USER_ID: s_dsData.username,
        PASSWD: s_dsData.password,
        PORT: s_dsData.port,
        DBMS_TYPE: s_dsData.database? s_dsData.database : s_body.type,
        OWNER_NM: s_dsData.ownername,
        DS_DESC: s_dsData.description,
        REG_DT:moment().format('YYYY-MM-DD HH:mm:ss'),
        REG_USER_NO: req.decodedUser.USER_NO,
        DEL_YN:'N'
        // UPD_DT: 'N',
        // UPD_USER_NO: 'N'
    };

    s_metaDbMng.insert('DS_MSTR',s_dsDataParam,false).then((p_result:any)=>{
        res.json( {result: true, message: '등록완료' });
    }).catch(function (p_err:any) {
        next(p_err);
    });
});

dataMngRoute.post('/toHiveUpdate',async (req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    s_metaDbMng.getConnection().transaction(async (pT:Transaction)=>{
        try {
            let s_result:any;
            if(s_body.mode == 'overwrite') {
                s_result = await s_metaDbMng.update('DS_VIEW_TBL_MSTR',{ HIVE_TABLE: null, HIVE_DB: null }, { HIVE_TABLE: s_body.tablename, HIVE_DB: s_body.database });
                if(s_result.length > 0){
                    s_result = await s_metaDbMng.update('DS_VIEW_TBL_MSTR',{ HIVE_TABLE: s_body.tablename, HIVE_DB: s_body.database }, { DS_VIEW_ID: s_body.dsViewId });
                }
            }
            else if(s_body.mode == 'delete') {
                s_result = await s_metaDbMng.update('DS_VIEW_TBL_MSTR',{ HIVE_TABLE: null, HIVE_DB: null }, { HIVE_TABLE: s_body.tablename, HIVE_DB: s_body.database });
            }
            else{
                s_result = await s_metaDbMng.update('DS_VIEW_TBL_MSTR',{ HIVE_TABLE: s_body.tablename, HIVE_DB: s_body.database }, { DS_VIEW_ID: s_body.dsViewId });
            }

            return s_result;

        } catch (p_error) {
            pT.rollback();
        }
    }).then(p_result=>{
        res.json(p_result);
    }).catch(function (p_err:any) {
        next(p_err);
    });
});
dataMngRoute.post('/dsMstr',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    let s_selectOption:any = {}
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    // FTP 접속 정보도 포함해서 조회하는 case 추가, 관리자는 모든 접속 정보 확인 가능
    // WP-100 : 플랫폼에는 하이브 접속정보 안나오도록(자동으로 연결이 됨 WP만 사용)
    if (req. decodedUser.USER_MODE === 'ADMIN') {
        // s_selectOption = { DEL_YN: 'N', DBMS_TYPE: {[Op.ne]:'hive'}, [Op.or]: [{ TYPE: 'db' }, { TYPE: 'hdfs' }, { TYPE: 'local' }] };
        // if (req.body.includeFtp) {
        //     s_selectOption = { DEL_YN: 'N',  DBMS_TYPE: {[Op.ne]:'hive'}, [Op.or]: [{ TYPE: 'db' }, { TYPE: 'ftp' }, { TYPE: 'sftp' }, { TYPE: 'hdfs' }, { TYPE: 'local' }, { TYPE: 'object' }] };
        // }
        // if(s_body.DBMS_TYPE){
        //     s_selectOption = { DEL_YN: 'N',  DBMS_TYPE: s_body.DBMS_TYPE}
        // }
        // // 사용하는 것만 가져옴
        s_selectOption = {  DEL_YN: 'N' };
        if (req.body.includeFtp) {
            s_selectOption['DBMS_TYPE'] = {[Op.or]:{[Op.ne]: 'hive', [Op.is] : null}}
            s_selectOption['TYPE'] = {[Op.or]:['db', 'ftp', 'sftp','local', 'hdfs','object']};
        }
        else if(s_body.TYPE != undefined && s_body.TYPE.length > 0 ){
            s_selectOption['TYPE'] = s_body.TYPE
        }
        else if(s_body.DBMS_TYPE != undefined && s_body.DBMS_TYPE.length > 0 ){
            s_selectOption['DBMS_TYPE'] = s_body.DBMS_TYPE
        }
        else{
            s_selectOption['DBMS_TYPE'] = {[Op.or]:{[Op.ne]: 'hive', [Op.is] : null}}
            s_selectOption['TYPE'] = {[Op.or]: ['db', 'hdfs', 'local']}
        }
    }
    if (req.decodedUser.USER_MODE === 'USER') {

        s_selectOption = {  DEL_YN: 'N', REG_USER_NO : req.decodedUser.USER_NO};
        if(req.body.includeHdfs != null && !req.body.includeFtp){
            s_selectOption['DBMS_TYPE'] = {[Op.or]:{[Op.ne]: 'hive', [Op.is] : null}};
            s_selectOption['TYPE'] = {[Op.or]:['db', 'hdfs', 'object']};
        }
        else if (req.body.includeFtp) {
            s_selectOption['DBMS_TYPE'] = {[Op.or]:{[Op.ne]: 'hive', [Op.is] : null}};
            s_selectOption['TYPE'] = {[Op.or]:['db', 'ftp', 'sftp', 'local','hdfs', 'object']};
        }
        else if(s_body.DBMS_TYPE != undefined && s_body.DBMS_TYPE.includes('mysql')){
            s_selectOption['DBMS_TYPE'] = s_body.DBMS_TYPE
        }
        else if(s_body.TYPE != undefined && s_body.TYPE.includes('local')){
            s_selectOption['TYPE'] = s_body.TYPE;
            s_selectOption['DS_ID'] = global.WiseAppConfig.DS_ID;
        }
        else{
            s_selectOption['DBMS_TYPE'] =  {[Op.or]:{[Op.ne]: 'hive', [Op.is] : null}};
            s_selectOption['TYPE'] = {[Op.or]: ['db', 'hdfs', 'local']}
        }
    }
    
    if(s_body.TYPE != undefined) {
        s_selectOption = {
            TYPE: req.body.TYPE,
            DEL_YN: 'N'
        };
        if(s_body.DBMS_TYPE != undefined && s_body.DBMS_TYPE.length > 0 ){
            s_selectOption['DBMS_TYPE'] = s_body.DBMS_TYPE
        }
    }

    if(s_body.DS_ID != undefined) {
        s_selectOption = {
            DS_ID: s_body.DS_ID,
            DEL_YN: 'N'
        }
        if(s_body.DBMS_TYPE != undefined && s_body.DBMS_TYPE.length > 0 ){
            s_selectOption['DBMS_TYPE'] = s_body.DBMS_TYPE
        }
    }
    s_metaDbMng.select('DS_MSTR',[],s_selectOption).then((p_result:any)=>{
        res.json(p_result);
        // if(p_result.length > 0)
        //     res.json(p_result);
        // else
        //     throw new WpError({httpCode:WpHttpCode.INTERNAL_SERVER_ERROR,message:'조회 실패.'});
    }).catch(function (p_err:any) {
        next(p_err);
    });
});


// 데이터베이스 선택 테이블 리스트
dataMngRoute.post('/dsViewTblMstr',async(req: Request, res: Response,next:NextFunction) => {
    // req.body -> DS_ID 값만 받아옴

    let s_body = req.body;

    let s_dsId = s_body.DS_ID;

    let s_metaDb = global.WiseMetaDB;

    
    s_metaDb.select('DS_MSTR',[],{ DS_ID : s_dsId, DEL_YN:'N' }).then(async p_result=>{

        let s_dbMng = new DatabaseManagement(p_result[0]);
        await s_dbMng.onInit();
        s_dbMng.getTableInfo(p_result[0].DB_NM, s_dsId, req.decodedUser.USER_MODE, String(req.decodedUser.USER_NO)).then(p_queryResult=>{
            res.json(p_queryResult);
        }).catch((p_error) => {
            next(p_error);
        });;

    }).catch((p_error) => {
        next(p_error);
    });
});

// #106
// dataview
dataMngRoute.post('/getPipelist',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    // save한 것 말고  가장 최근에 실행시킨 워크플로우 가져오게 살졍
    let s_query =` SELECT MAX(A.WF_ID), A.*
                    FROM WF_MSTR A
                    INNER JOIN WF_USE_DATASET B ON A.WF_ID = B.WF_ID
                    WHERE A.REG_USER = '${s_body.datasetInfo.REG_USER_NO}' 
                    AND B.DS_VIEW_ID= '${s_body.datasetInfo.DS_VIEW_ID}' 
                    AND B.OUTPUT_YN = 'Y' order by A.REG_DT DESC`;

    s_metaDbMng.getConnection().query(s_query,{ type: QueryTypes.SELECT }).then(p_result=>{
        let s_result:any[]= [];
        p_result.forEach( (p_flowData:Object) => {
            if (Object.values(p_flowData).some(x => (x !== null && x !== ''))) // 워크플로우 데이터 값이 다 null 값인지 확인
                s_result.push(p_flowData) // 값이 있을 경우에만 추가
        })
        res.json({ success: true, result: s_result });
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #58
// datalist
dataMngRoute.post('/delFile',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    let s_dsViewData:DS_VIEW_TBL_MSTR_ATT = {
        DS_VIEW_ID:s_body.DS_VIEW_ID,
        TBL_NM:''
    }
    
    s_wpDsMng.onDeleteDataSource([s_dsViewData]).then(p_result=>{
        res.json({ success: true, result: '삭제되었습니다.' });
    }).catch(function (pErr) {
        next(pErr);
    });
});

dataMngRoute.post('/dataViewList',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    else{
        s_body = null
    }
    
    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    
    s_wpDsMng.getDataSetList(s_body).then(p_result=>{
        res.json(p_result.result);
    }).catch(function (pErr) {
        next(pErr);
    });
});

// 안쓰는듯
dataMngRoute.post('/sharedDataViewList',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    
    s_wpDsMng.getDataSetList().then(p_result=>{
        res.json(p_result.result);
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #37
// 환경설정 dataset 권한관리 //이것도 안씀
dataMngRoute.post('/getUserDatasetList',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    
    s_wpDsMng.getDataSetList().then(p_result=>{
        res.json(p_result.result);
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #96
// dataview
dataMngRoute.post('/chkDatasetlist',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    
    s_wpDsMng.isExists(req.decodedUser.USER_NO,s_body.filename).then(p_result=>{
        res.json({ success: true, result: p_result.result });
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #96
// dataview
dataMngRoute.post('/renameDataset',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    
    s_wpDsMng.onReNameDataSource(s_body.datasetInfo.DS_VIEW_ID,s_body.newNm).then(p_result=>{
        res.json({ success: true, result: p_result.result });
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #1 통계오류 재실행
// #13
dataMngRoute.post('/reStatistic',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_viewTblParam:DS_VIEW_TBL_MSTR_ATT = {
        DS_VIEW_ID: s_body.ds_view_id,
        VIEW_IDX: s_body.view_idx,
        TBL_TYPE: 'WD',
        REG_USER_NO: s_body.userno,
        // TBL_NM:s_body.tbl_nm
    };

    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    let s_apiMng = new WpSparkApiManager(req.decodedUser.AppConfig);



    let s_statisParam = {
        action: "statistics",
        method: "",
        userno: req.decodedUser.USER_NO,
        userId: req.decodedUser.USER_ID,
        usermode: req.decodedUser.USER_MODE,
        groupId: `statistics_${s_viewTblParam.DS_VIEW_ID}`,
        jobId: "1",
        location: "data manager",
        data: {
            usetable: `${s_viewTblParam.REG_USER_NO}_${s_viewTblParam.DS_VIEW_ID}`,
            DS_VIEW_ID: s_body.ds_view_id,
            VIEW_IDX: s_body.view_idx,
            // WPLAT-356
            REG_USER_NO: s_body.userno
        }
    };

    let sReSultMsg = {
        view_id: s_viewTblParam.DS_VIEW_ID,
        code: 20,
        desc: '',
        log: '',
        // #121 
        idx: s_body.view_idx
      };

    s_wpDsMng.onStatistics(s_statisParam,s_viewTblParam,s_apiMng).then(p_statistic=>{
        sReSultMsg.code = 40;
        // sReSultMsg.desc = JSON.stringify(p_statistic.result);
        global.WiseSocketServer.sendClientMsg(s_body.socket_id,'statusStati', sReSultMsg);
        res.json({ success: true, result: p_statistic.result });
    }).catch(function (pErr) {
        sReSultMsg.code = 90;
        sReSultMsg.log = pErr;
        global.WiseSocketServer.sendClientMsg(s_body.socket_id, 'statusStati', sReSultMsg)
        next(pErr);
    });
        
});

// 새로 변경된 함수, manifest 파일에서 정보 가져옴
dataMngRoute.post('/getColList',(req: Request, res: Response,next:NextFunction) => {    
    
    let s_body = req.body;
    let s_apiUrl:any = req.decodedUser.AppConfig;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }   

    if(s_body.REG_USER_NO != req.decodedUser.USER_NO){
        s_apiUrl = {
            WP_API: {
                host:  s_body.APP_SVC_IP,
                port: s_body.APP_SVC_PORT,
                monitoring_port:30095
            },
        };
    }
    let s_manifestAtt:Partial<Record<keyof WP_MANIFEST, any>> = {
        DS_VIEW_ID:s_body.DS_VIEW_ID,
        VIEW_IDX:s_body.VIEW_IDX,
        // WPLAT-356
        REG_USER_NO: s_body.REG_USER_NO
    }
                                                    
    let s_manifestParam = {
        action: "manifest",
        method: "read",
        userno: s_body.REG_USER_NO ,
        userId: '',
        usermode: s_body.USER_MODE,
        groupId: "manifest",
        jobId: 1,
        location: "data manager",
        data: s_manifestAtt
    }      
    
    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);

    s_wpDsMng.setManifest(s_manifestParam,s_apiUrl).then(pManifestResult=>{
        if(pManifestResult.result.data == 0){            
            res.json({ success: false, result: 'empty' });
        }else{
            res.json({ success: true, result: pManifestResult.result.data });
        }
        // if (pManifestResult.isSuccess) {
        // } else {
        //     res.json({ success: false, result: 'empty' });
        // }
    }).catch(function (pErr) {
        next(pErr);
    });
});

// #29 현재 mysql, mssql만 가능
// #41 진행중
// #79. token 사용.
// add-dataset
// #115 데이터셋 프로세스 변경으로 max(view_id) 조회하여 업로드 데이터 hdfs에 저장후 insertttttt
//  #1 api 호출로 변경
//  #13 /uploadDataInfo -> /addDataset 으로 이름 변경 및 #115 적용했던것 제거
// wpviewmanager -> hdfs에 파일 저장 -> savedataset(wpviewmanager tbl_mstr 업데이트 및 통계분석 실행)
dataMngRoute.post('/addDataset',async (req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let sWpDataset:WP_DATASET_ATT = s_body.dataInfo;        
    let s_wpDsMng = new WpDataSourceManager(req.decodedUser);
    await s_wpDsMng.onInit();
    // # 파일 형식
    sWpDataset.DS_FILE_FORMAT = global.WiseAppConfig.FILE_FORMAT;

    s_wpDsMng.onWriteDataSource(req.decodedUser.USER_NO,sWpDataset).then(p_result=>{
        let sConnectType:any = sWpDataset.CONNECTION_TYPE;
        let s_result = p_result.result.insertInfo;
        let sConnectInfo = getWpConnectInfo(sWpDataset.TBL_TYPE,sConnectType);
        if(sConnectInfo.statistics){
            console.log("통계 실행함")            
            let s_dsviewId = s_result.DS_VIEW_ID;
            let s_dsviewIdx = s_result.VIEW_IDX;
            // let s_tblNm = p_result.result.insertInfo.TBL_NM;
            let s_viewTblParam:DS_VIEW_TBL_MSTR_ATT = {
                DS_VIEW_ID: s_dsviewId,
                VIEW_IDX: s_dsviewIdx,
                REG_USER_NO: req.decodedUser.USER_NO,
                // TBL_NM:p_result.result.insertInfo.TBL_NM
            };

           
        
            let s_statisParam = {
                    action: "statistics",
                    method: "",
                    userno: req.decodedUser.USER_NO,
                    userId: req.decodedUser.USER_ID,
                    usermode: req.decodedUser.USER_MODE,
                    groupId: `statistics_${s_result.DS_VIEW_ID}`,
                    jobId: "1",
                    location: "data manager",
                    data: {
                        // WPLAT-361 2번
                        REG_USER_NO: req.decodedUser.USER_NO,
                        usetable: `${req.decodedUser.USER_NO}_${s_result.DS_VIEW_ID}`,
                        DS_VIEW_ID: s_dsviewId,
                        VIEW_IDX: s_dsviewIdx,
                    }
            };

            let s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);

            s_wpDsMng.onStatistics(s_statisParam,s_viewTblParam,s_sparkApiMng).then(p_statiResult=>{            
                if(p_statiResult.isSuccess){
                    console.log("통계 성공");
                    res.json({ success: true, message: '등록완료', result: { view_id: s_result.DS_VIEW_ID, filenm:s_result.TBL_NM }});
                }
                else{
                    res.json({ success: false, message: '등록완료', result: { view_id: s_result.DS_VIEW_ID, filenm:s_result.TBL_NM }});
                }
            }).catch(function (pErr) {         
                console.log("통계 실패")                    
                next(pErr);
            });
        }else{
            console.log("통계 실행 안함")
            res.json({ success: true, message: '등록완료', result: { view_id: s_result.DS_VIEW_ID, filenm:s_result.TBL_NM } });
        }
        
    }).catch(function (p_err) {
        next(p_err);
    });
});

dataMngRoute.post('/datasetHistory',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_metaDbMng.select('DS_VIEW_HISTORY',s_body, { DS_VIEW_ID: s_body.viewId, H_TYPE: { [Op.ne]: 'SCHEDULE' } }).then(p_result => {
        // console.log(p);
        res.json({ success: true, result: p_result });
    }).catch(function (err) {
        next(err);
    });
});


dataMngRoute.post('/addDatasetHistory',(req: Request, res: Response,next:NextFunction) => {    
    let s_body = req.body;
    let s_metaDbMng = global.WiseMetaDB;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    // #115
    let sType = 'HDFS';
    if (s_body.DS_VIEW_ID) {
        sType = 'WD';
    }

    let s_insParam = {
        H_TYPE: sType,
        DS_VIEW_ID: s_body.DS_VIEW_ID,
        OPERATION: s_body.OPERATION,
        PRE_VALUE: s_body.PRE_VALUE,
        CUR_VALUE: s_body.CUR_VALUE,
        UPD_USER_ID: req.decodedUser.USER_NO,
        UPD_DT: moment().format('YYYY-MM-DD HH:mm:ss')
    };

    s_metaDbMng.insert('DS_VIEW_HISTORY',s_insParam,false).then(p_result => {
        // console.log(p);
        res.json({ success: true, message: 'history insert'});
    }).catch(function (err) {
        next(err);
    });
});


