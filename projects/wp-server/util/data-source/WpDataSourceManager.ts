import { WriteStream } from "fs";
import { QueryTypes, Transaction } from "sequelize";
import { WiseStorageManager } from "../data-storage/WiseStorageManager";
import { WpError, WpHttpCode } from "../../exception/WpError";
import { DS_MSTR_ATT } from "../../metadb/model/DS_MSTR";
import { DS_VIEW_MSTR_ATT } from "../../metadb/model/DS_VIEW_MSTR";
import { DS_VIEW_TBL_MSTR_ATT } from "../../metadb/model/DS_VIEW_TBL_MSTR";
import { WiseMetaDB } from "../../metadb/WiseMetaDB";
import { WiseDataStorageInterface, WP_DATASOURCE } from "../../wp-type/WP_DS_INFO";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import * as request from "request";
// import { DS_AUTH_USER_MSTR_ATT } from "../../metadb/model/DS_AUTH_USER_MSTR";
import { DS_VIEW_HISTORY_ATT } from "../../metadb/model/DS_VIEW_HISTORY";
import { WpSparkApiManager } from "../spark-api/spark-api-mng";
import { FileSystemItem, WP_DATASET_ATT, getWpConnectTypeList } from "../../wp-type/WP_DATASET_ATT";
import { VarInfo, WP_MANIFEST, WP_STRUCTURE_MANIFEST_ATT, getManifestAtt } from "../../wp-type/WP_MANIFEST";

/**
 * 플랫폼에 등록된 데이터소스를 관리하는 클래스.
 * 
 * 실제 물리적 저장소 {@link WiseStorageManager | WiseStorageManager}가 연결되어 있어야 하며, 
 * 
 * 데이터에 대한 메타 데이터 (기초 통계,상관 관계, 히스토리)를 관리한다.
 * 
 * @example
 * ```ts
 * let s_wpDsMng = new WpDataSourceManager(req.decodedUser);   
 *
 * s_wpDsMng.onDeleteDataSource([s_dsViewData]).then(p_result=>{
 *     res.json({ success: true, result: '삭제되었습니다.' });
 * }).catch(function (pErr) {
 *     next(pErr);
 * });
 * ```
 */
export class WpDataSourceManager {
    
    o_name: string;
    o_type: string;
    o_storageMng: WiseStorageManager;
    o_userInfo:WP_SESSION_USER;
    o_metaDbMng:WiseMetaDB;
    moment = require('moment');
    constructor(p_userInfo:WP_SESSION_USER){
        this.o_name = '';
        this.o_type = '';        
        this.o_userInfo = p_userInfo;
        this.o_metaDbMng = global.WiseMetaDB;

        this.o_storageMng = new WiseStorageManager(p_userInfo,global.WiseStorage);

    }
    async onInit() {

    }
    onLoad(): void {
        throw new Error("Method not implemented.");
    }
    getDataSetList(pParam:any = null): Promise<WiseReturn> {
        return new Promise<WiseReturn>((resolve,rejects)=>{
            let s_query = ` SELECT (CASE WHEN A.REG_USER_NO = '${this.o_userInfo.USER_NO}' THEN '소유'
                        WHEN A.REG_USER_NO != '${this.o_userInfo.USER_NO}' THEN '공유'
                        END) AS AUTHORITY,   
                        '${this.o_userInfo.USER_MODE}' AS USER_MODE, 
                        G.USER_ID,
                        C.TYPE, C.DS_NM,F.APP_SVC_IP,F.APP_SVC_PORT,
                        B.* ,
                        A.*,
                        (CASE WHEN A.REG_DT IS NULL AND A.UPD_DT IS NULL THEN NULL
                            WHEN A.REG_DT IS NULL THEN A.UPD_DT
                            WHEN A.UPD_DT IS NULL THEN A.REG_DT
                            WHEN A.REG_DT <= A.UPD_DT THEN A.UPD_DT 
                            WHEN A.UPD_DT < A.REG_DT THEN A.REG_DT
                            END) AS ORDER_DATE,                       
                        (CASE WHEN A.STATUS_CODE = 10 OR A.STATUS_CODE IS NULL THEN 'WPP_COMMON.INFO.info5'
                            WHEN A.STATUS_CODE = 20 THEN 'WPP_COMMON.INFO.info7'
                            WHEN A.STATUS_CODE = 40 THEN 'WPP_COMMON.INFO.info1'
                            WHEN A.STATUS_CODE = 99 THEN 'WPP_COMMON.INFO.info6'
                            END) AS 'DATASTATUS',
                        CONCAT(A.HIVE_DB, '.', A.HIVE_TABLE) AS 'HIVESTATUS'
                        FROM DS_VIEW_TBL_MSTR  A
                        INNER JOIN DS_VIEW_MSTR B ON A.DS_VIEW_ID = B.DS_VIEW_ID
                        INNER JOIN DS_MSTR C ON B.DS_ID = C.DS_ID
                        INNER JOIN DP_USER_PROFILE D ON B.REG_USER_NO = D.USER_NO
                        INNER JOIN SERVER_APP_INFO F ON D.APP_NO = F.APP_NO
                        INNER JOIN DP_USER_MSTR G ON B.REG_USER_NO = G.USER_NO
                        LEFT OUTER JOIN (SELECT * FROM DP_AUTH_USER_MSTR WHERE SHARE_TYPE='dataset' AND OWNER_USER_NO != ${this.o_userInfo.USER_NO}) E ON B.DS_VIEW_ID = E.DATA_ID 
                        WHERE A.DEL_YN = 'N' AND (A.REG_USER_NO = '${this.o_userInfo.USER_NO}' OR E.SHARER_USER_NO = '${this.o_userInfo.USER_NO}')
                            ${pParam ? `AND A.TBL_TYPE = \'${pParam['TBL_TYPE']}\'`: ''}
                            AND A.VIEW_IDX IS NOT NULL
                        ORDER BY AUTHORITY ASC, ORDER_DATE DESC `;

                          // ${this.o_userInfo.USER_MODE != 'ADMIN' ? 
                        //     `LEFT OUTER JOIN (SELECT * FROM DP_AUTH_USER_MSTR WHERE SHARE_TYPE='dataset' AND OWNER_USER_NO != ${this.o_userInfo.USER_NO}) E ON B.DS_VIEW_ID = E.DATA_ID 
                        //     WHERE A.DEL_YN = 'N' AND (A.REG_USER_NO = '${this.o_userInfo.USER_NO}' OR E.SHARER_USER_NO = '${this.o_userInfo.USER_NO}')` : `WHERE A.DEL_YN = 'N'` } 
            this.o_metaDbMng.query(s_query,'',{ type: QueryTypes.SELECT }).then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch(function (pErr) { 
                rejects(pErr);
            });
        });
    }

    getSharedDataSetList(): Promise<WiseReturn> {
        return new Promise<WiseReturn>((resolve,rejects)=>{
            let s_query = ` SELECT 
            C.REG_USER_NO, C.TYPE, 
            B.*, A.*, D.*,                           
            (CASE WHEN A.REG_DT IS NULL AND A.UPD_DT IS NULL THEN NULL
                WHEN A.REG_DT IS NULL THEN A.UPD_DT
                WHEN A.UPD_DT IS NULL THEN A.REG_DT
                WHEN A.REG_DT <= A.UPD_DT THEN A.REG_DT 
                WHEN A.UPD_DT < A.REG_DT THEN A.UPD_DT
                END) AS ORDER_DATE
            FROM DS_VIEW_TBL_MSTR A 
            INNER JOIN DS_VIEW_MSTR B ON A.DS_VIEW_ID = B.DS_VIEW_ID 
            INNER JOIN DS_MSTR C ON B.DS_ID = C.DS_ID
            INNER JOIN (SELECT * FROM DP_AUTH_USER_MSTR WHERE SHARE_TYPE='dataset') D ON B.DS_VIEW_ID = D.DS_VIEW_ID 
            WHERE D.DS_VIEW_AUTH_USER='${this.o_userInfo.USER_NO}' AND A.DEL_YN = 'N' AND B.REG_USER_NO != D.DS_VIEW_AUTH_USER
            ORDER BY ORDER_DATE DESC `;

            this.o_metaDbMng.query(s_query,'',{ type: QueryTypes.SELECT }).then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch(function (pErr) { 
                rejects(pErr);
            });
        });
    }

    onReadData(p_path: string): Promise<WiseReturn> {
        throw new Error("Method not implemented.");
    }
    onUpdateDsViewTblMstr(p_data:any,p_where:any){
        return new Promise<WiseReturn>((resolve,rejects)=>{
            this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',p_data,p_where).then(p_reVal=>{
                console.log('DS_VIEW_TBL_MSTR 상태 업데이트');
                resolve ({isSuccess:true,result:p_reVal});
            }).catch(p_error=>rejects(p_error));
        });
    }
    onWriteDataSource(p_userNo: number, p_data: WP_DATASET_ATT): Promise<WiseReturn> {
        return new Promise<WiseReturn>((resolve,rejects)=>{
            // 데이터셋 시작 인덱스 1 → 0으로 변경
            this.isExists(p_userNo,p_data.DS_VIEW_NM).then(p_exreVal => {
                if (p_exreVal.result.length == 0) {
                    let s_dsViewCol:DS_VIEW_MSTR_ATT = {
                        DS_ID: p_data.CONNECTION.DS_ID,
                        DS_VIEW_NM: p_data.DS_VIEW_NM,
                        DS_VIEW_DESC: `${p_data.CONNECTION.DB_NM}_${p_data.CONNECTION.DBMS_TYPE}`,
                        REG_USER_NO: Number(p_userNo),
                        // #95. 파일 형식 추가.
                        DS_FILE_FORMAT: p_data.DS_FILE_FORMAT
                    };
                    let s_dsViewTblCol:DS_VIEW_TBL_MSTR_ATT = {
                        TBL_NM: p_data.TBL_NM,
                        TBL_CAPTION: p_data.TBL_CAPTION,
                        REG_USER_NO: Number(p_userNo),
                        DS_VIEW_ID: 0,
                        VIEW_IDX:0,
                        REG_DT: this.moment().format('YYYY-MM-DD HH:mm:ss'),
                        DEL_YN: 'Y',
                        // #23 신규데이터 생성시
                        STATUS_CODE: 10,
                        TBL_TYPE: p_data.TBL_TYPE
                    };

                    this.onCreateDsViewTbl(s_dsViewCol,s_dsViewTblCol,p_data.CONNECTION,'WD').then(async (p_dsViewTblMstr) => {                          
                        s_dsViewTblCol.DS_VIEW_ID = p_dsViewTblMstr.result;
                        let s_remoteFolderPath = `/${p_userNo}/wp_dataset/` + s_dsViewTblCol.DS_VIEW_ID + '/';

                        this.o_storageMng.onMakeDir(s_remoteFolderPath,'755',true).then(p_MakeDir=>{
                            // s_remoteFolderPath = this.o_storageMng.getAbsPath(s_remoteFolderPath);
                            if(p_MakeDir.isSuccess){
                                let s_param:any = {};
                                let s_ip = p_data.CONNECTION.IP;
                                let s_port = p_data.CONNECTION.PORT;
                                let s_user = p_data.CONNECTION.USER_ID;
                                let s_password = p_data.CONNECTION.PASSWD;
                                let s_defaultPath = p_data.CONNECTION.DEFAULT_PATH;
                                let s_owner = p_data.CONNECTION.OWNER_NM;
                                if(getWpConnectTypeList('WiseStorageManager').some(sItem => p_data.CONNECTION.DBMS_TYPE == sItem)){
                                    // WPLAT-361 4번
                                    if (this.o_userInfo.USER_MODE == 'USER') {
                                        if(['LOCAL', 'HDFS'].includes(p_data.CONNECTION.DBMS_TYPE.toLocaleUpperCase())) {
                                            p_data.FILE_INFO.path = this.o_userInfo.USER_NO + '/' + p_data.FILE_INFO.path;
                                        }
                                        
                                    }
                                    s_param = {
                                        action: "upload",
                                        method: p_data.CONNECTION.DBMS_TYPE.toLocaleUpperCase(),
                                        userno: this.o_userInfo.USER_NO,
                                        userId: this.o_userInfo.USER_ID,
                                        usermode: this.o_userInfo.USER_MODE,
                                        groupId: "upload",
                                        jobId: 1,
                                        location: "data manager",
                                        data: {
                                            filepath: p_data.FILE_INFO.path,
                                            host: s_ip,
                                            port: s_port,
                                            user: s_user,
                                            password: s_password,
                                            filename: s_dsViewCol.DS_VIEW_ID,
                                            filetype: s_dsViewCol.DS_FILE_FORMAT,
                                            tbl_type: s_dsViewTblCol.TBL_TYPE,
                                            DEFAULT_PATH: s_defaultPath
                                        }
                                    }
                                } else if(getWpConnectTypeList('DatabaseManagement').some(sItem => p_data.CONNECTION.DBMS_TYPE == sItem)){
                                        if (global.WiseAppConfig.FILE_FORMAT == 'delta'){
                                            s_remoteFolderPath += s_dsViewCol.DS_VIEW_ID + `.${global.WiseAppConfig.FILE_FORMAT}` ;                                            
                                        }
                                        else{
                                            s_remoteFolderPath += s_dsViewCol.DS_VIEW_ID + `_0.${global.WiseAppConfig.FILE_FORMAT}` ;  
                                        }
                                        // let dbmsType = p_data.CONNECTION.DBMS_TYPE.toLowerCase();
                                        // let dbNm = p_data.CONNECTION.DB_NM;
                                        s_param = {
                                            action: "upload",
                                            method: "RDBMS",
                                            userno: this.o_userInfo.USER_NO,
                                            userId: this.o_userInfo.USER_ID,
                                            usermode: this.o_userInfo.USER_MODE,
                                            groupId: "upload",
                                            jobId: 1,
                                            location: "data manager",
                                            data: {
                                               dbtype:  p_data.CONNECTION.DBMS_TYPE.toLowerCase(),
                                               dbhost: s_ip,
                                               dbport: s_port,
                                               dbname: p_data.CONNECTION.DB_NM,
                                               tablename: p_data.TABLE_INFO,
                                               owner: s_owner,
                                               dbuser: s_user,
                                               dbpassword: s_password,
                                               filepath: s_remoteFolderPath,
                                               filename: s_dsViewCol.DS_VIEW_ID,
                                               type: "table",
                                               tbl_type: s_dsViewTblCol.TBL_TYPE,
                                               DEFAULT_PATH: s_defaultPath
                                            }
                                        }
                                }

                                let sSatisOption = {
                                    headers: { 
                                        'Content-Type': 'application/json',
                                        'authorization': this.o_userInfo.USER_TOKEN 
                                        },
                                    // #70 포트변경
                                    url: `http://${global.WiseAppConfig.NODE.host}:${global.WiseAppConfig.NODE.port}/jobexcute/upload`,
                                    body: JSON.stringify(s_param)
                                };
                                
                                let that = this;

                                request.post(sSatisOption, function (p_err, p_res, result) {  
                                    if(p_err){
                                        rejects(new WpError({
                                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR,
                                            message:p_err
                                        }));
                                    }
                                    else if (p_res.statusCode == 200) {   
                                     
                                        that.o_metaDbMng.update('DS_VIEW_TBL_MSTR',{DEL_YN:'N'}, { DS_VIEW_ID: s_dsViewTblCol.DS_VIEW_ID }).then(p_reVal=>{
                                            console.log('상태 업데이트');
                                            resolve({isSuccess:true,result:{insertInfo:s_dsViewTblCol,data:p_reVal}});
                                        }).catch(p_error=>rejects(p_error));
                                                                        
                                    } else {
                                        rejects(new WpError({
                                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR,
                                            message:'데이터셋 업로드 실패'
                                        }));
                                    }
                                });
                                
                            }
                        }).catch(p_error=>rejects(p_error));
                    }).catch(p_error=>rejects(p_error));
                }
                
            })
        });
    }    
    setManifest(pManifestParam:any,p_apiConfigInfo:any){
        let s_sparkApiMng = new WpSparkApiManager(p_apiConfigInfo);
        return new Promise<WiseReturn>((resolve, reject) => {
            let sOption = {
                headers: { 'Content-Type': 'application/json', 'groupId': pManifestParam.groupId, 'jobId': pManifestParam.jobId },
                // #70 포트변경
                url:'manifest',
                body: JSON.stringify(pManifestParam)
            };

            s_sparkApiMng.onCallApi('/job',sOption.body,sOption.headers).then( (p_result:any)=>{
                let sParseData;
                try {
                    sParseData = JSON.parse(p_result);
                    console.log("setManifest!!!!!!!!!!!!!!!!")
                    console.log(pManifestParam.method+"!!!!!!!!!!!!!!!!!!!")
                    console.log(sParseData)
                    resolve({isSuccess:true, result: sParseData});                    
                } catch (pErr:any) {
                    reject({ status: 320, instance: pErr});
                }
            }).catch(pErr=>{
                 reject(pErr);
            });
    
        });
    }
    onLoadMemory(p_fileFormat:string,p_dsViewTblMstr:DS_VIEW_TBL_MSTR_ATT){

        return new Promise<WiseReturn>((resolve,rejects)=>{
            // sjh 수정
            // createViewTbl에서 기존 select -> 통계량 호출을
            // 모든 아웃풋결과와 페이징에서 테이블명을 usetable: 유저번호_파일번호로 설정해서
            // createViewTbl에서는 통계량만 바로 호출함(select를 하지 않음)
            // 근데 데이터매니저에서 add할때는 select가 한번 호출이 되어야 통계량이 돌기에 
            // 기존 로직 시작전에 select를 먼저해서 setable: 유저번호_파일번호를 만듬.
            let s_param = {
                action: "select",
                method: "",
                userno: this.o_userInfo.USER_NO,
                userId: this.o_userInfo.USER_ID,
                usermode: this.o_userInfo.USER_MODE,
                groupId: "add",
                jobId: "1",
                location: "data manager",
                data: {
                    load: "hdfs",
                    filename: p_dsViewTblMstr.DS_VIEW_ID,
                    filetype: p_fileFormat,
                    fileseq: ",",
                    dataUserno: this.o_userInfo.USER_NO

                }
            };
            let s_selectOption = {
                headers: { 'Content-Type': 'application/json', 'authorization': this.o_userInfo.USER_TOKEN  },
                // #70 포트변경
                url: `http://${global.WiseAppConfig.NODE.host}:${global.WiseAppConfig.NODE.port}/jobexcute/select`,
                body: JSON.stringify(s_param)
            };
    
            request.post(s_selectOption, function (err2, res2, selectResult) {
                try {
                    if(res2.statusCode == 200){
                        resolve({isSuccess:true,result:JSON.parse(selectResult)})                        
                    }else{
                        rejects(new WpError(
                            {
                                httpCode:WpHttpCode.PY_API_UNKOWN_ERR,
                                message:new Error(JSON.parse(selectResult).message)
                            }
                        ));
                    }
                } catch (p_err) {
                    rejects(new WpError(
                        {
                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR,
                            message:p_err
                        }
                    ));
                }
            })
        });
        
    }
    onCreateDsViewTbl(p_dsViewMstr:DS_VIEW_MSTR_ATT, p_dsViewTblMstr:DS_VIEW_TBL_MSTR_ATT,p_dsMstr:DS_MSTR_ATT, p_type:string,p_overWriteFlag:boolean = false,p_schId:string='') {
        return new Promise<WiseReturn>(async (resolve, reject) =>{            
            try {
                if(p_type == 'WK') {
                    p_dsViewMstr.DS_ID = p_dsMstr.DS_ID;
                }
    
                if(p_dsViewMstr.DS_VIEW_ID == 0 || typeof p_dsViewMstr.DS_VIEW_ID == 'undefined'){
                    let s_dsViewMstrResult = await this.o_metaDbMng.insert('DS_VIEW_MSTR',p_dsViewMstr);
                    p_dsViewMstr.DS_VIEW_ID = s_dsViewMstrResult.DS_VIEW_ID;
                    p_dsViewTblMstr.DS_VIEW_ID = s_dsViewMstrResult.DS_VIEW_ID;
                }

                this.o_metaDbMng.getConnection().transaction(async (pT:Transaction)=>{

                    let s_hisParam:DS_VIEW_HISTORY_ATT = {
                        H_TYPE: p_type,
                        DS_VIEW_ID: p_dsViewMstr.DS_VIEW_ID,
                        UPD_USER_ID: String(this.o_userInfo.USER_NO),
                        UPD_DT: this.moment().format('YYYY-MM-DD HH:mm:ss'),
                    };
                    
                    if(p_type=='SCHEDULE') {
                        s_hisParam.SCH_ID = Number(p_schId);
                    }
    
                    if(!p_overWriteFlag){
                        // let s_auth:DS_AUTH_USER_MSTR_ATT = {
                        //     DS_VIEW_ID: Number(p_dsViewMstr.DS_VIEW_ID),
                        //     DS_VIEW_AUTH_USER: this.o_userInfo.USER_NO,
                        //     IS_SELECT: 1,
                        //     IS_UPDATE: 1,
                        //     IS_DELETE: 1
                        // };
    
                        
                        s_hisParam.OPERATION = 'create';
                        s_hisParam.CUR_VALUE = p_dsViewMstr.DS_VIEW_NM;
    
                        await this.o_metaDbMng.insert('DS_VIEW_TBL_MSTR',p_dsViewTblMstr);
                        await this.o_metaDbMng.insert('DS_VIEW_HISTORY',s_hisParam);    
                        // await this.o_metaDbMng.insert('DS_AUTH_USER_MSTR',s_auth); 
                    }
                    else{
                        s_hisParam.OPERATION = 'overwrite';
                        s_hisParam.PRE_VALUE = `${p_dsViewTblMstr.DS_VIEW_ID}_${Number(p_dsViewTblMstr.VIEW_IDX) - 1}` ;
                        s_hisParam.CUR_VALUE = `${p_dsViewTblMstr.DS_VIEW_ID}_${p_dsViewTblMstr.VIEW_IDX}` ;
    
                        let s_tblParam ={ 
                            // #23 데이터 업데이트시
                            STATUS_CODE: 10, 
                            TBL_DESC: '', 
                            TBL_LOG: '', 
                            UPD_DT: this.moment().format('YYYY-MM-DD HH:mm:ss')
                        };
    
                        await this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',s_tblParam,{ DS_VIEW_ID: p_dsViewTblMstr.DS_VIEW_ID });
                        await this.o_metaDbMng.insert('DS_VIEW_HISTORY',s_hisParam);
                    }
                    return p_dsViewMstr.DS_VIEW_ID
                }).then(p_result=>{
                    resolve({isSuccess:true,result:p_result});
                }).catch(p_error=>{
                    reject(p_error)
                });                    
            } catch (p_error) {
                reject(p_error);
            }
        });
    }

    onRecordHistroy(p_dsViewHistory:DS_VIEW_HISTORY_ATT){
        return new Promise<WiseReturn>((resolve, reject) =>{
            this.o_metaDbMng.insert('DS_VIEW_HISTORY',p_dsViewHistory).then(p_insertResult => { 
                resolve({isSuccess:true, result: p_insertResult.H_ID});
            }).catch(pErr=>reject(pErr));
        });
    }
    onDeleteDataSource(p_dsViewInfos:Array<DS_VIEW_TBL_MSTR_ATT>): Promise<WiseReturn> {

        return new Promise<WiseReturn>((resolve,rejects)=>{
            this.o_metaDbMng.getConnection().transaction((t:Transaction) => {
    
                let s_promises:any = [];
    
                for(let s_dsViewInfo of p_dsViewInfos){
                    s_promises.push(this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',{ DEL_YN: 'Y', UPD_DT: this.moment().format('YYYY-MM-DD HH:mm:ss') }, { DS_VIEW_ID: s_dsViewInfo.DS_VIEW_ID }));
                }
    
                return Promise.all(s_promises).then(p_updateResults=>{
    
                    let s_movePromises = [];
                    if (p_updateResults.length != 0) {
                        for(let p_updateResult of p_dsViewInfos){                            
                            s_movePromises.push(
                                this.o_storageMng.onMoveFile(
                                    `/${this.o_userInfo.USER_NO}/wp_dataset/${p_updateResult.DS_VIEW_ID}`, 
                                    `/${this.o_userInfo.USER_NO}/wp_dataset/removed/${p_updateResult.DS_VIEW_ID}`,
                                    true
                                )
                            );
                        }
                        return Promise.all(s_movePromises);
                    }
                    else{
                        t.rollback();
                        rejects(new WpError({
                            httpCode:WpHttpCode.HADOOP_DATA_ERR,
                            message:'데이터 존재하지 않음.'
                        }));
                    }
                    
                }).catch(p_error=>rejects(p_error));
            }).then(p_reVal=>{
                resolve({isSuccess:true,result:p_reVal});
            })
            .catch(p_error=>{
                rejects(p_error);
            });
        });
        
    }
    onCopyDataSource(p_orgPath: string, p_newPath: string, p_overWriteFlag: boolean): Promise<WiseReturn> {
        throw new Error("Method not implemented.");
    }
    onMoveDataSource(p_orgPath: string, p_newPath: string, p_overWriteFlag: boolean): Promise<WiseReturn> {
        throw new Error("Method not implemented.");
    }
    onReNameDataSource(p_dsViewId: string, p_newDataNm: string): Promise<WiseReturn> {
        return new Promise<WiseReturn>((resolve,rejects)=>{
            this.o_metaDbMng.update('DS_VIEW_MSTR',{ DS_VIEW_NM: p_newDataNm }, { REG_USER_NO: this.o_userInfo.USER_NO, DS_VIEW_ID:p_dsViewId}).then(p_result => {
                resolve({isSuccess:true,result:p_result});
            }).catch(p_error=>rejects(p_error));
        });        
    }
    isExists(p_userNo:number,p_dataNm: string): Promise<WiseReturn> {
        return new Promise<WiseReturn>((resolve,rejects)=>{
            let s_query = ` SELECT * FROM DS_VIEW_MSTR A
                                INNER JOIN DS_VIEW_TBL_MSTR B ON A.DS_VIEW_ID = B.DS_VIEW_ID
                            WHERE A.REG_USER_NO = ${p_userNo} 
                            AND B.DEL_YN = 'N' 
                            AND A.DS_VIEW_NM = '${p_dataNm}'`;

            this.o_metaDbMng.query(s_query,'',{ type: QueryTypes.SELECT }).then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch(function (pErr) { 
                rejects(pErr);
            });
        });
    }
    async  onStatistics(pStatisParam:any, pViewParam:DS_VIEW_TBL_MSTR_ATT,p_apiMng:WpSparkApiManager){

        let s_nowDate = this.moment().format('YYYY-MM-DD HH:mm:ss');

        await global.WiseMetaDB.update('DS_VIEW_TBL_MSTR',{ STATUS_CODE: 20}, {DS_VIEW_ID: pViewParam.DS_VIEW_ID});
        
        return new Promise<WiseReturn>((resolve, reject) => {
            let sOption = {
                headers: { 'Content-Type': 'application/json', 'groupId': pStatisParam.groupId, 'jobId': pStatisParam.jobId },
                // #70 포트변경
                url:'statistics',
                body: JSON.stringify(pStatisParam)
            };

            p_apiMng.onCallApi('/job',sOption.body,sOption.headers).then(async (hdfsResult:any)=>{
                let sParseData;
                try {
                    sParseData = JSON.parse(hdfsResult);
                    let colResult:VarInfo[] = sParseData.data;
                    let sTblParam = { STATUS_CODE: 40, VIEW_IDX: pViewParam.VIEW_IDX };
                    let c = await this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',sTblParam, {DS_VIEW_ID: pViewParam.DS_VIEW_ID});
                    resolve({isSuccess:true, result: []})

                } catch (pErr:any) {
                    this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',{ STATUS_CODE: 99, TBL_LOG: pErr.message }, {DS_VIEW_ID: pViewParam.DS_VIEW_ID,VIEW_IDX: pViewParam.VIEW_IDX}).then(function (pResult) {
                        reject({ status: 320, instance: pErr});
                    }).catch(pErr=>reject(pErr));

                    reject({ status: 320, instance: pErr});
                }
            }).catch(pErr=>{
                this.o_metaDbMng.update('DS_VIEW_TBL_MSTR',{ STATUS_CODE: 99, TBL_LOG: pErr.message}, {DS_VIEW_ID: pViewParam.DS_VIEW_ID,VIEW_IDX: pViewParam.VIEW_IDX})
                reject(pErr);
            });
    
        });
    }
}