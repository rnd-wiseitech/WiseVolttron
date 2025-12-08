import express, { NextFunction, Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import { wpUid } from '../util/wp-uuid';
import multer from 'multer';
import * as csv from 'fast-csv';

import { WiseStorageManager } from '../util/data-storage/WiseStorageManager';
import { WpError, WpHttpCode } from '../exception/WpError';
import { multerConfig } from '../util/uploader/upload';

const moment = require('moment');
const upload = multer(
{ 
    storage: multerConfig(
        {
            destination:  (req, file, cb)=> {
                cb(null, '')
            }
        }) 
});

export const commonRoute = express.Router();

// image-label에서 이미지 불러오기
commonRoute.post('/readImage',async (req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body:any = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    
   
    let s_storageMng = new WiseStorageManager(req.decodedUser,global.WiseStorage);

    try {
        // 210412 "POSE-ESTIM"에서 라벨링 json 파일 업로드 여부에 따라 출력 이미지 결정(가공 이미지 or 원본 이미지)
        let s_filePath = `/${req.decodedUser.USER_NO}/tmp_upload/`;

        if (s_body.isJsonUploaded) {
            s_filePath += 'skel_' + s_body.name;
        } else {
            s_filePath += s_body.name;
        }

        let s_isExist = await s_storageMng.isExists(s_filePath);
        let s_dataArr:any = [];

        if(s_isExist.result){
            let s_result = await s_storageMng.onReadFile(s_filePath,{ encoding: 'base64' });
        
            if (!s_result.isSuccess)
                next(new WpError({ httpCode:WpHttpCode.HADOOP_DATA_ERR, message:s_result.result}));
            else{
                
                res.json(s_result.result.toString('base64'));
            }
        }
        else{
            next(new WpError({ httpCode:WpHttpCode.HADOOP_DATA_ERR, message:'파일이 없습니다.'}));
        }
    } catch (p_error) {
        next(p_error);  
    }
    
});

commonRoute.post('/readCsv',async (req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body:any = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    
    let s_path:string = '';
    let s_regUserno:string = '';

    if(s_body.type=='HDFS'){
        if(req.decodedUser.USER_MODE == 'ADMIN')
            s_path = `/` + s_body.filePath;
        else
            s_path = `/${req.decodedUser.USER_NO}/` + s_body.filePath;
        }
    else{
        // 실제 dataset을 만든 유저번호를 따라서 파일을 찾아가도록 함.
        // 어드민으로 다른계정 파일 다운로드시 에러나기 떄문
        if(Object.keys(s_body).includes('regUserno'))
            s_regUserno = s_body.regUserno;
        else
            s_regUserno = String(req.decodedUser.USER_NO);

        s_path = `/${s_regUserno}/${s_body.filePath}`;
    }
    
    let s_storageMng = new WiseStorageManager(req.decodedUser,global.WiseStorage);

    try {
        let s_isExist = await s_storageMng.isExists(s_path);
        let s_dataArr:any = [];

        if(s_isExist.result){
            let s_result = await s_storageMng.onReadFile(s_path);
        
            if (!s_result.isSuccess)
                next(new WpError({ httpCode:WpHttpCode.HADOOP_DATA_ERR, message:s_result.result}));
            else{
                csv.parseString(s_result.result,{
                    headers: true,
                    encoding: 'utf8'
                }).on('data', (data:any) => {
                    s_dataArr.push(data);
                })
                .on('end', () => {
                    res.json(s_dataArr);
                })
            }
        }
        else{
            res.json(s_dataArr);
        }
    } catch (p_error) {
        next(p_error);  
    }
    
});

// commonRoute.post('/modelSituation',(req: Request, res: Response<any>,next:NextFunction) => {
    
//     let s_metaDb = global.WiseMetaDB;
//     let s_resultHome = [];
//     let s_promises = [];

//     let selectModelMstrQuery = `(SELECT * 
//                                     FROM DP_MODEL_MSTR 
//                                     WHERE (MODEL_ID, MODEL_IDX) IN (SELECT MODEL_ID, max(MODEL_IDX) as MODEL_IDX 
//                                                                         FROM DP_MODEL_MSTR GROUP BY MODEL_ID))`;
//     let home1Query = `SELECT COUNT(A.MODEL_ID) AS MODEL_COUNT,
//                             COUNT(A.MODEL_USE_DATASET_ID) AS DATA_COUNT,
//                             COUNT(CASE WHEN C.SCH_STATUS = '20' THEN 1 END) AS LEARNING_COUNT
//                         FROM ${selectModelMstrQuery} A
//                         LEFT OUTER JOIN DP_SCH_MSTR C ON A.MODEL_ID = C.MODEL_ID
//                         INNER JOIN DP_MODEL_DATASET_USE_MSTR B ON A.MODEL_USE_DATASET_ID = B.DATASET_ID
//                         WHERE A.REG_USER_NO = ${ req.decodedUser.USER_NO } AND A.DEL_YN='N'`;

//     let home2Query = `SELECT MODEL_EVAL_TYPE,COUNT(A.MODEL_ID) AS MODEL_COUNT
//                         FROM  ${selectModelMstrQuery} A
//                         INNER JOIN DP_MODEL_DATASET_USE_MSTR B ON A.MODEL_USE_DATASET_ID = B.DATASET_ID
//                         WHERE A.REG_USER_NO = ${ req.decodedUser.USER_NO } AND A.DEL_YN='N' 
//                         AND A.MODEL_EVAL_TYPE not in ('TEXT-ANALYTIC','POSE-ESTIM-HUMAN','POSE-ESTIM-ANIMAL','TEXT-GENERATION','IMG-LABEL','IMG-CLASS','')
//                         GROUP BY MODEL_EVAL_TYPE `;

//     let home3Query = '';
//     let home4Query = '';
//     let schQuery = '';

//     // 2019.10.11 추가 mysql일 경우에
//     home3Query = 'SELECT Z.REG_DATE, SUM(Z.REG_COUNT) AS REGRESSION, SUM(Z.CLASS_COUNT) AS CLASSFICATION, SUM(Z.CLU_COUNT) AS CLUSTERING FROM (' +
//                 ' SELECT DATE_FORMAT(REG_DATE,\'%Y-%m-%d\') AS REG_DATE, ' +
//                 ' CASE WHEN A.MODEL_EVAL_TYPE = \'Regression\' THEN 1  ELSE 0 END AS REG_COUNT,' +
//                 ' CASE WHEN A.MODEL_EVAL_TYPE = \'Classification\' THEN 1  ELSE 0 END AS CLASS_COUNT, ' +
//                 ' CASE WHEN A.MODEL_EVAL_TYPE = \'Clustering\' THEN 1  ELSE 0 END AS CLU_COUNT ' +
//                 ' FROM '+ selectModelMstrQuery +' A ' +
//                 ' INNER JOIN DP_MODEL_DATASET_USE_MSTR B ON A.MODEL_USE_DATASET_ID = B.DATASET_ID ' +
//                 ' WHERE A.REG_USER_NO = ' + req.decodedUser.USER_NO +
//                 ' AND REG_DATE IS NOT NULL ' +
//                 ' AND MODEL_EVAL_TYPE != \'\') Z' +
//                 ' GROUP BY Z.REG_DATE ' +
//                 ' ORDER BY Z.REG_DATE ' ;

//     // 2019.10.11 추가 mysql일 경우에
//     home4Query = 'SELECT REG_DATE, COUNT(A.MODEL_ID) AS MODEL_COUNT,\'CURRENT\' AS COUNT_TYPE ' +
//                 ' FROM '+ selectModelMstrQuery +' A ' +
//                 ' INNER JOIN DP_MODEL_DATASET_USE_MSTR B ON A.MODEL_USE_DATASET_ID = B.DATASET_ID  ' +
//                 ' WHERE A.REG_USER_NO = ' + req.decodedUser.USER_NO +
//                 ' AND REG_DATE >= subdate(CURDATE() -1 ,date_format(curdate(),\'%w\')-1)  AND REG_DATE <= subdate(CURDATE() -1 ,date_format(curdate(),\'%w\')-7)   ' +
//                 ' GROUP BY REG_DATE ' +
//                 ' UNION ALL ' +        
//                 ' SELECT REG_DATE,COUNT(A.MODEL_ID) AS MODEL_COUNT,\'LAST\' AS COUNT_TYPE ' +
//                 ' FROM '+ selectModelMstrQuery +' A ' +
//                 ' INNER JOIN DP_MODEL_DATASET_USE_MSTR B ON A.MODEL_USE_DATASET_ID = B.DATASET_ID  ' +
//                 ' WHERE A.REG_USER_NO = ' + req.decodedUser.USER_NO +
//                 ' AND REG_DATE  >= subdate(CURDATE() -8 ,date_format(CURDATE(),\'%w\')-1)  AND REG_DATE < subdate(CURDATE() -1 ,date_format(CURDATE(),\'%w\')-1)    ' +
//                 ' GROUP BY REG_DATE ';

//     schQuery = `SELECT A.MODEL_ID,A.MODEL_NM,A.REG_USER_NO,B.SCH_ST
//                 FROM  ${selectModelMstrQuery}  A
//                 INNER JOIN DP_SCH_MSTR B ON A.MODEL_ID = B.MODEL_ID
//                 WHERE A.REG_USER_NO = ${req.decodedUser.USER_NO}
//                 AND B.SCH_STATUS IN (10,20)
//                 AND DATEDIFF(current_timestamp,B.SCH_ED) <= 0
//                 AND B.SCH_ST IS NOT NULL
//                 ORDER BY B.SCH_ST DESC  LIMIT 5`;

//     s_promises.push(s_metaDb.query(home1Query,'',true));
//     s_promises.push(s_metaDb.query(home2Query,'',true));
//     s_promises.push(s_metaDb.query(home3Query,'',true));
//     s_promises.push(s_metaDb.query(home4Query,'',true));
//     s_promises.push(s_metaDb.query(schQuery,'',true));
//     s_promises.push(s_metaDb.select('DP_CONTACT_US',[],{ REG_USER_NO: req.decodedUser.USER_NO,DEL_YN:'N' },[['REG_DATE', 'DESC']],5));
//     Promise.all(s_promises).then(p_results => {
//         // for(let idx in pResults){
//         //     sResultHome.push(pResults[idx]);
//         // }
//         res.json(p_results);
//     });
// });

commonRoute.post('/upload', upload.single('uploadfile'), (req: Request, res: Response) => {

    if(typeof req.file != 'undefined'){
        res.json({ success: true, file: req.file });
    }else{
        // next({ status:700, instance: new Error('업로드에 실패하였습니다.') })
    }
});

// commonRoute.post('/readCsvCheck',  async (req: Request, res: Response<any>,next:NextFunction) => {

//     let s_storageMng = new WiseStorageManager(req.decodedUser,global.WiseStorage);

//     let s_isExist = await s_storageMng.isExists(`${req.body.filePath}`);

//     if (s_isExist.result == true) {
//         res.json({ result: true, size: 0 });
//     } else {
//         res.json({ result: false });
//     }
// });

// commonRoute.post('/newMsgCount',(req: Request, res: Response<any>,next:NextFunction) => {
    
//     res.json([{ MSG_COUNT: 0 }]);

// });

// commonRoute.post('/setLang',(req: Request, res: Response<any>,next:NextFunction) => {
    
//     let s_metaDb = global.WiseMetaDB;
//     let s_option:any = {ADMIN_YN: 'N',VISIBLE:1};

//     if(req.decodedUser.USER_MODE == 'ADMIN'){
//         s_option = {VISIBLE:1};
//     }

//     s_metaDb.select('DP_USER_PROFILE',[],{USER_NO:req.decodedUser.USER_NO}).then(p_result=>{
//         let s_lang=JSON.parse(p_result[0].USER_INSTANCE).LANG;
//         let s_tutochk=JSON.parse(p_result[0].USER_AUTH).tutochk;
//         res.json({ result: true, lang: s_lang, tutochk:s_tutochk });
//     }).catch(p_error=>{
//         next(p_error);
//     });
// });

commonRoute.post('/getMenuList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_metaDb = global.WiseMetaDB;
    let s_option:any = {ADMIN_YN: 'N',VISIBLE:1};

    if(req.decodedUser.USER_MODE == 'ADMIN'){
        s_option = {VISIBLE:1};
    }

    // WPLAT-345 COMMON UI
    // if(global.WiseAppConfig.API_TYPE == 'COMMON') {
    //     s_option['MENU_NAME'] = {[Op.not]: ['rm', 'monitor']}
    // }

    s_metaDb.select('WF_MENU_MSTR',[],s_option).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});

commonRoute.post('/getCompntList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_metaDb = global.WiseMetaDB;
    let s_where = {};
    if(global.WiseAppConfig.API_TYPE == 'COMMON') {
        s_where = {TYPE: {[Op.notIn]:['I-HIVE', 'I-STREAMING']}}
    }
    else if(global.WiseAppConfig.HIVE_DB.use === undefined || !global.WiseAppConfig.HIVE_DB.use){
        s_where = {TYPE: {[Op.notIn]:['I-HIVE']}}
    }
    s_metaDb.select('COM_MSTR',[],s_where).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});

commonRoute.post('/saveJob',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_jobData = s_body.wpData;
    let s_jobNm = s_body.wpNm;

    let s_jobId = wpUid();
    let sJobMstr = {
        ID: s_jobId,
        NAME: s_jobNm,
        STATUS: 20,
        ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
        DESC: '',
        USER_NO: req.decodedUser.USER_NO,
        // USER_NO: '1000',
        ERROR_MSG: '',
        LOCATION:'WORKFLOW'
    };

    let sJobSubMstr:any = [];

    for (let idx in s_jobData) {
        sJobSubMstr.push({
            ID: s_jobId,
            JOB_ID: s_jobData[idx].id,
            P_JOB_ID: JSON.stringify(s_jobData[idx].parent_id),
            COM_ID: s_jobData[idx].type,
            STATUS: 10,
            ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
            DATA: JSON.stringify(s_jobData[idx].data),
            ERROR_MSG: ''
        });
    }
    s_metaDb.getConnection().transaction(async (pT:Transaction) => {
        try {
            
            let s_insertResult = await s_metaDb.insert('JOB_MSTR',sJobMstr,false);
            await s_metaDb.insert('JOB_SUB_MSTR',sJobSubMstr,true);

            return s_insertResult;
        } catch (error) {
            pT.rollback();            
        }        
    }).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});
