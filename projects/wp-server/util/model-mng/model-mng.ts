import { Model, Op, Transaction } from "sequelize";
import { WpError, WpHttpCode } from "../../exception/WpError";
import { DP_ARG_MSTR, DP_ARG_MSTR_ATT } from "../../metadb/model/DP_ARG_MSTR";
import { DP_ARG_PARAM, DP_ARG_PARAM_ATT } from "../../metadb/model/DP_ARG_PARAM";
import { DP_MODEL_DATASET_USE_MSTR, DP_MODEL_DATASET_USE_MSTR_ATT } from "../../metadb/model/DP_MODEL_DATASET_USE_MSTR";
import { DP_MODEL_LOG_ATT } from "../../metadb/model/DP_MODEL_LOG";
import { DP_MODEL_MSTR_ATT } from "../../metadb/model/DP_MODEL_MSTR";
import { DP_VAR_MSTR_ATT } from "../../metadb/model/DP_VAR_MSTR";
// import { DP_VAR_STR_EX_MSTR_ATT } from "../../metadb/model/DP_VAR_STR_EX_MSTR";
import { WP_IMPORT_DATA, WP_MODEL, WP_MODEL_INFO } from "../../wp-type/WP_MODEL";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import { WpAlgorithmManagement } from "../analytic/algorithm-mng";
import { WiseStorageManager } from "../data-storage/WiseStorageManager";
import { Sequelize } from 'sequelize-typescript';
const moment = require('moment');

/**
 * 모델을 관리하는 클래스.
 * 
 * {@link WP_MODEL | WP_MODEL} 형태의 데이터 구조를 가진 모델정보를 관리 할 수 있다.
 * 
 * @example
 * ```ts
 *   let s_modelMng = new WpModelManagement(WP_SESSION_USER);
 * 
 *   s_modelMng.modelSave(WP_MODEL,WP_SESSION_USER,true).then(p_result=>{        
 *       res.json(p_result.result);
 *   }).catch((p_error) => {
 *       next(p_error);
 *   }); 
 * ```
 */

export class WpModelManagement {

    public o_model2:WP_MODEL_INFO;
    public o_model:WP_MODEL;
    public o_wpAlgorithmList:Array<DP_ARG_MSTR>;
    public o_wpHyperParamList:Array<DP_ARG_PARAM>;
    public o_userInfo:WP_SESSION_USER;
    moment = require('moment');
    
    constructor(p_userInfo:WP_SESSION_USER){
        this.o_userInfo = p_userInfo;
        this.o_wpAlgorithmList = new Array<DP_ARG_MSTR>();
        this.o_wpHyperParamList = new Array<DP_ARG_PARAM>();
        this.init();
        // [확인 필요] 모델 파라미터 리스트 설정하는 기능 계속 쓸데 없이 돌아가서 주석 처리 (나중에 필요하면 다시 원복)
        // (async () => {
        //     await this.setWpModelParamList();
        // })();
    }

    async setWpModelParamList(){
        let s_algorithmMng = new WpAlgorithmManagement();
        let s_algorithmList = await s_algorithmMng.getAlgorithmList();
        this.o_wpAlgorithmList = s_algorithmList.result;
        let s_hyperParamList = await s_algorithmMng.getHyperParameterList();
        this.o_wpHyperParamList = s_hyperParamList.result;
    }

    init(){
        this.o_model = {
            uuid : '',
            savedYn : true,
            labelInfos : {
                uuid : '',
                name : '',
                fileType : '',
            },
            dateColYn : false,
            analyticType : '',
            modelModified : false,
            targetCol : "",
            targetType : "",
            partitionInfo : {
                type: "",
                value: 0,
                option:0
            },
            featureInfo: {
                featureList: [],
                labelData: {
                    label: {},
                    labelVal: {}
                },
                featureDataSummury: [],
            },
            saveModelName : "",
            pythonUniqueId : "",
            importData : {
                dataType: "",
                dataId: "",
                dataRefId: "",
                dataSetName: "",
                dataFileName: [],
                scaleFileName: "",
                orgDataFileName: "",
                reload : false
            },
            scaleInfo : "",
            ensemble: false,
            wkModelFlag:false,
            wkModelSaveFlag:false
        };
    }
    setImportData(p_data:WP_IMPORT_DATA){
        this.o_model.importData = p_data;
    }

    setVarInfo(p_data:Array<DP_VAR_MSTR_ATT>){
        this.o_model2.varInfo = p_data;
    }
    getVarInfo(){
        return this.o_model2.varInfo;
    }
    parseDpModelMstr(p_dpModelMstr:DP_MODEL_MSTR_ATT,
                     p_dpModelDataSetUseMstr:DP_MODEL_DATASET_USE_MSTR_ATT,
                     p_dpVarMstrs:Array<DP_VAR_MSTR_ATT>,
                     ){

        this.o_model.MODEL_ID = p_dpModelMstr.MODEL_ID;
        this.o_model.MODEL_IDX = p_dpModelMstr.MODEL_IDX;

        this.o_model.algorithmInfo.algorithm.ARG_ID = p_dpModelMstr.ARG_ID;
        this.o_model.algorithmInfo.algorithm.ARG_TYPE = p_dpModelMstr.MODEL_EVAL_TYPE;
        this.o_model.algorithmInfo.optimizer = p_dpModelMstr.MODEL_OPTIMIZER_YN == 'Y' ? true : false ;
        this.o_model.algorithmInfo.parameter = JSON.parse(p_dpModelMstr.MODEL_ARG_PARAM);

        this.o_model.analyticType = p_dpModelMstr.MODEL_RUN_TYPE;
        if(p_dpModelMstr.MODEL_RUN_TYPE == 'workflow')
            this.o_model.wkModelFlag = true;
        else
            this.o_model.wkModelFlag = false;
            
        this.o_model.importData.dataSetName = p_dpModelDataSetUseMstr.DATASET_NAME;
        this.o_model.importData.dataRefId = String(p_dpModelDataSetUseMstr.DATASET_REF_ID);
        this.o_model.importData.dataType = p_dpModelDataSetUseMstr.DATASET_TYPE;
        
        this.o_model.scaleInfo = p_dpModelMstr.MODEL_FEATURE_TYPE;
        this.o_model.partitionInfo = JSON.parse(p_dpModelMstr.MODEL_PART_OPTION);
        this.o_model.pythonUniqueId = p_dpModelMstr.MODEL_EVAL_RESULT;
        this.o_model.featureInfo = {
            featureList: [],
            labelData: {
                label: {},
                labelVal: {}
            },
            featureDataSummury:new Array<any> ()
        };

        for(let s_dpVarMstr of p_dpVarMstrs){
            this.o_model.varInfo.push({
                NAME:s_dpVarMstr.COL_NM,
                TYPE:s_dpVarMstr.DATA_TYPE,
                MIN:s_dpVarMstr.VAR_MIN,
                MAX:s_dpVarMstr.VAR_MAX,
                Q1:s_dpVarMstr.VAR_1Q,
                Q3:s_dpVarMstr.VAR_3Q,
                UNIQUE_VALUE:s_dpVarMstr.VAR_UNI_CNT,
                DUPLICATE:s_dpVarMstr.VAR_MISS_CNT,
                MISSING:s_dpVarMstr.VAR_MISS_CNT,
                MEAN:s_dpVarMstr.VAR_MEAN,
                STDDEV:s_dpVarMstr.VAR_STD_DEV,
                SUMMURY:{},
                BOXPLOTDATA:{
                    boxdata:new Array<number> (),
                    outlier:new Array<any> (),
                    outliers_index: new Array<any> (),
                },
                FORMAT:'',
                CHANG:false,
                TARGET:s_dpVarMstr.VAR_TARGET_YN == 'Y' ? true:false,
                CLEANDATA:JSON.parse(s_dpVarMstr.VAR_PRE),
                TOTAL_COUNT:0,
                USE:s_dpVarMstr.VAR_TARGET_YN == 'Y' ? true:false,
            });

        }

        return this.o_model;

    }
    parseModelData(p_data:any){
        let s_model = p_data.model;
        let s_params = p_data.params;
        let s_partitionType = p_data.partitionType;
        let s_partitionValue = p_data.partitionValue;
        let s_scaleInfo = p_data.scaleInfo;
        let s_target_column = p_data.target_column;
        let s_optimizer = p_data.optimizer

        let s_tmpModel:DP_ARG_MSTR_ATT = this.o_wpAlgorithmList.filter((s_params:DP_ARG_MSTR_ATT) => s_params.ARG_ID == s_model.ARG_ID)[0];
        let s_tmpModelParams:Array<DP_ARG_PARAM> = this.o_wpHyperParamList.filter(s_params => s_params.ARG_ID == s_model.ARG_ID);
        let s_userModelYn = s_tmpModel.USER_MODEL_YN ? s_tmpModel.USER_MODEL_YN : 'N';
        Object.assign(s_tmpModel, { argId: s_tmpModel.ARG_ID, argType: s_tmpModel.ARG_TYPE, argNm: s_tmpModel.ARG_NM, argFunc: s_tmpModel.ARG_FILE_NAME, userModelYn: s_userModelYn })
                
        if(s_tmpModel.ARG_NM == 'LSTM')
            this.o_model.recurrentModel = true;

        if(typeof s_optimizer == 'undefined')
            s_optimizer = false;

        let sParamData:any = {}; // {eta:1, epoch:20}

        for (let sIndex = 0; sIndex < s_params.PARAM_NM_LIST.length; sIndex++) {
            sParamData[s_params.PARAM_NM_LIST[sIndex]] = s_params.PARAM_VALUE_LIST[sIndex];
        }

        // sParams 에 입력받은 param 값 할당
        for (let sIndex = 0; sIndex < s_tmpModelParams.length; sIndex++) {
            let tmpParam = s_tmpModelParams[sIndex];
            let s_paramKeyNm = tmpParam.PARAM || '';
            let tmpParamDefault = JSON.parse(tmpParam.PARAM_DEFAULT || '[]');
            // #15 최적화 적용
            if (s_optimizer){
                tmpParamDefault.OPTION = sParamData[s_paramKeyNm]?sParamData[s_paramKeyNm]:tmpParamDefault.OPTION;
            } else {
                tmpParamDefault.VALUE = sParamData[s_paramKeyNm]?sParamData[s_paramKeyNm]:tmpParamDefault.VALUE;
            }

            s_tmpModelParams[sIndex].PARAM_VALUE = tmpParamDefault;
        }

        this.o_model.algorithmInfo = {
            parameter : s_tmpModelParams,
            optimizer : s_optimizer,
            smote: false,
            imbalance: false,
            algorithm : s_tmpModel
        };

        this.o_model.partitionInfo = {
            type:s_partitionType,
            value:s_partitionValue,
            option : 0
        };

        this.o_model.scaleInfo = s_scaleInfo;
        this.o_model.targetCol = s_target_column.replace(/[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》 \t\n\r\f\v]/g);

        if (s_tmpModel.ARG_TYPE == 'Classification') {
            this.o_model.targetType = 'categorical'
        } 
        else if (s_tmpModel.ARG_TYPE == 'Regression' || s_tmpModel.ARG_TYPE == 'Timeseries') {
            this.o_model.targetType = 'numerical'
        }
        else {
            this.o_model.targetType = '';
        }
        let s_result = this.o_model;
        this.init();

        return s_result;
    }
    tmpParseModelAtt(p_Model:any){
        for(let s_keyNm of Object.keys(p_Model)){
            if(s_keyNm == 'algorithmInfo'){
                p_Model[s_keyNm].algorithm.ARG_ID = p_Model[s_keyNm].algorithm.argId;
                p_Model[s_keyNm].algorithm.ARG_TYPE = p_Model[s_keyNm].algorithm.argType;
                p_Model[s_keyNm].algorithm.ARG_NM = p_Model[s_keyNm].algorithm.argNm;
                p_Model[s_keyNm].algorithm.ARG_FILE_NAME = p_Model[s_keyNm].algorithm.argFunc;
            }
        }
        return p_Model;
    }
   
    modelSave(p_exeResult:WP_MODEL,p_userInfo:WP_SESSION_USER,p_overWriteModelChk:boolean,p_modelExeResult?:any){
        return new Promise<WiseReturn>((resolve, reject) => {
            let today = this.moment().format('YYYY-MM-DD HH:mm:ss');
        
            let s_metaDb = global.WiseMetaDB;
        
            let s_callType = p_exeResult.modelRunType;
            // WP-50 2-2 하둡데이터셋 경로저장 변경
            let s_dataType = p_exeResult.importData.dataType;
            let s_path = '';
        
            let s_score = 0;
            if (p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Regression") {
                s_score = Math.round(Number(p_exeResult.algorithmInfo.argResult));
            }
            else if (p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Classification") {
                s_score = Math.round(Number(p_exeResult.algorithmInfo.argResult) * 100);
            }
            else if (p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Clustering") {
                s_score = Math.round(Number(p_exeResult.algorithmInfo.argResult) * 100);
            }
            else if (p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Unstructured") {
                s_score = Math.round(Number(p_exeResult.algorithmInfo.argResult) * 100);
            }
            else{

            }
            // WPLAT-187 데이터 매니저 형식 바뀌어서 LOCAL이든 HDFS든 모두 HADOOP_PATH에 들어감
            s_path = p_exeResult.importData.path
            s_metaDb.getConnection().transaction(async (pT:Transaction)=>{
                try {
                    
                    let s_chkModel:any;
                    let s_delYn = 'N';
                    let s_modelDatasetUseMstrData:DP_MODEL_DATASET_USE_MSTR_ATT = {
                        DATASET_TYPE : p_exeResult.importData.dataType,   //  labelInfos.fileType
                        DATASET_NAME : p_exeResult.importData.dataSetName,    // importData.dataFileName.map(row=>row.NAME)
                        DATASET_REF_ID : Number(p_exeResult.importData.dataRefId)
                    };
                    
                    if(!p_exeResult.wkModelSaveFlag)
                        s_delYn = 'Y';

                    let s_modelMstrData:DP_MODEL_MSTR_ATT= {       
                        PROJ_ID:1000,
                        ARG_ID: p_exeResult.algorithmInfo.algorithm.ARG_ID,
                        MODEL_PROGRESS: s_score,
                        MODEL_RUN_TYPE: s_callType ? s_callType : '', //외부에서 CALL 한 경우 model_run_type에 명시
                        MODEL_EVAL_TYPE: p_exeResult.algorithmInfo.algorithm.ARG_TYPE == 'Unstructured' ? p_exeResult.algorithmInfo.algorithm.ARG_NM : p_exeResult.algorithmInfo.algorithm.ARG_TYPE,
                        MODEL_EVAL_RESULT: p_exeResult.pythonUniqueId,
                        
                        // 워크플로우 모델 저장안하는 옵션일 경우 DEL_YN을 Y로 지정
                        DEL_YN: s_delYn,
                        MODEL_FEATURE_TYPE: p_exeResult.scaleInfo,
                        REG_USER_NO: p_userInfo.USER_NO,
                        REG_DATE: today,
                        MODEL_PART_OPTION: JSON.stringify(p_exeResult.partitionInfo),
                        MODEL_ARG_PARAM: JSON.stringify(p_exeResult.algorithmInfo.parameter),    // algorithmInfo
                        MODEL_OPTIMIZER_YN: p_exeResult.algorithmInfo.optimizer ? 'Y' : 'N',
                        EXCUTE_RESULT: (typeof p_modelExeResult == 'undefined' ? '' : JSON.stringify(p_modelExeResult)),
                        USER_PREPROCESSING : p_exeResult.userPreprocessing
                    };
            
                    if (p_overWriteModelChk)
                        s_chkModel = await s_metaDb.select('DP_MODEL_MSTR',[],{MODEL_ID: p_exeResult.MODEL_ID, REG_USER_NO: p_userInfo.USER_NO });
                    else
                        s_chkModel = await s_metaDb.select('DP_MODEL_MSTR',[],{MODEL_NM: p_exeResult.saveModelName, REG_USER_NO: p_userInfo.USER_NO , DEL_YN: 'N'});
                        
                    let s_modelDatasetUseMstrResult:any;
            
                    if (s_chkModel.length >= 1 && p_overWriteModelChk){
                        let s_selectModel = s_chkModel.sort((a:DP_MODEL_MSTR_ATT, b:DP_MODEL_MSTR_ATT) => {
                            return b.MODEL_IDX - a.MODEL_IDX;
                        })[0];
                        
                        let s_modelIdx = s_selectModel.MODEL_IDX + 1;
                        let s_originModelIdx = p_exeResult.MODEL_IDX ? p_exeResult.MODEL_IDX : 1;
                        let s_modelDatasetUseMstrData: any = (await s_metaDb.select('DP_MODEL_DATASET_USE_MSTR', [], { MODEL_ID: p_exeResult.MODEL_ID, MODEL_IDX: s_originModelIdx }))[0];
                        
                        // 기존 정보에서 수정한 정보로 변경 
                        let s_tmpInsertData = {
                            MODEL_ID:p_exeResult.MODEL_ID,
                            MODEL_IDX:s_modelIdx,
                            DATASET_TYPE:s_modelDatasetUseMstrData.DATASET_TYPE,
                            DATASET_NAME:s_modelDatasetUseMstrData.DATASET_NAME,
                            DATASET_REF_ID:s_modelDatasetUseMstrData.DATASET_REF_ID
                        };
                        
                        s_modelDatasetUseMstrResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR',s_tmpInsertData,false);
            
                        // let s_modelMstrSelectData = await s_metaDb.select('DP_MODEL_MSTR',[],{ 'MODEL_ID': p_exeResult.MODEL_ID, 'MODEL_IDX': s_originModelIdx });
                        
                        s_modelMstrData['MODEL_ID'] = Number(p_exeResult.MODEL_ID);
                        s_modelMstrData['MODEL_IDX'] = s_modelIdx;
                        s_modelMstrData['MODEL_USE_DATASET_ID'] = s_modelDatasetUseMstrResult.DATASET_ID;
                        s_modelMstrData['MODEL_NM'] = s_selectModel.MODEL_NM;
                        
                        // s_modelMstrData = { ...s_modelMstrData, ...s_modelMstrSelectData[0].dataValues };
            
                        let s_insertDpModelMstr = await s_metaDb.insert('DP_MODEL_MSTR',s_modelMstrData,false);
            
                        p_exeResult.MODEL_ID = s_insertDpModelMstr.MODEL_ID;
                        p_exeResult.MODEL_IDX = s_insertDpModelMstr.MODEL_IDX;
                    }
                    else if(s_chkModel.length >= 1){
                        pT.rollback();
                        resolve({ isSuccess:false, result: '중복' });
                    }
                    else{
                        
                        s_modelDatasetUseMstrData['PROJ_ID'] = 1000;
                        s_modelDatasetUseMstrData['HADOOP_PATH'] = p_exeResult.importData.path;
                        
                        s_modelDatasetUseMstrResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR',s_modelDatasetUseMstrData,false);
            
                        s_modelMstrData['MODEL_NM'] = p_exeResult.saveModelName;
                        s_modelMstrData['MODEL_USE_DATASET_ID'] = s_modelDatasetUseMstrResult.DATASET_ID;
                        
                        let s_insertDpModelMstr = await s_metaDb.insert('DP_MODEL_MSTR',s_modelMstrData,false);
                        
                        p_exeResult.MODEL_ID = s_insertDpModelMstr.MODEL_ID;
                        p_exeResult.MODEL_IDX = s_insertDpModelMstr.MODEL_IDX;

                        s_modelDatasetUseMstrData['MODEL_ID'] = s_insertDpModelMstr.MODEL_ID;
                        s_modelDatasetUseMstrData['MODEL_IDX'] = s_insertDpModelMstr.MODEL_IDX;
                        
                        await s_metaDb.update('DP_MODEL_DATASET_USE_MSTR',s_modelDatasetUseMstrData,{DATASET_ID:s_modelDatasetUseMstrResult.DATASET_ID});
                        
                    }
                    
                    
                    
                    let selectedFeatureCols:any;
                    let featureCols;
                    let s_varInfo = p_exeResult.varInfo;
                    let s_dpVarTemp = [];
                    let s_dpVarExTemp = [];
            
                    if (Object.keys(p_exeResult.featureInfo.featureList).length == 0) {
                        selectedFeatureCols = [];
                        featureCols = [];
                    }
                    else {
                        selectedFeatureCols = p_exeResult.featureInfo.featureList.filter(pFeatures => pFeatures.USE == true);
                        featureCols = p_exeResult.featureInfo.featureList;
                    }
            
                    // 원래 USE
                    let s_cleansingList = s_varInfo.filter(pVar => pVar.USE == false);
                    let s_labelList;
                    if (typeof p_exeResult.featureInfo.labelData == 'string') {
                        s_labelList = JSON.parse(p_exeResult.featureInfo.labelData);
                    } else {
                        s_labelList = p_exeResult.featureInfo.labelData;
                    }
            
                    for (let s_varData of s_varInfo) {
                        let varItem = {
                            MODEL_ID: 0,
                            MODEL_IDX:0,
                            VAR_NM: '',
                            DS_VIEW_ID: '',
                            TBL_NM: '',
                            COL_NM: '',
                            VAR_TARGET_YN: '',
                            VAR_MAJOR_YN: '',
                            VAR_CAPTION: '',
                            VAR_TYPE: '',
                            DATA_TYPE: '',
                            VAR_IMPORT: '',
                            VAR_RANK: '',
                            VAR_UNI_CNT: 0,
                            VAR_MISS_CNT: 0,
                            VAR_MIN: 0,
                            VAR_MAX: 0,
                            VAR_MEAN: 0,
                            VAR_STD_DEV: 0,
                            VAR_1Q: 0,
                            VAR_2Q: 0,
                            VAR_3Q: 0,
                            VAR_4Q: 0,
                            VAR_DESC: '',
                            VAR_PRE: ''
                        };
            
                        varItem.MODEL_ID = p_exeResult.MODEL_ID;
                        varItem.MODEL_IDX = p_exeResult.MODEL_IDX;
                        varItem.VAR_NM = s_varData.NAME;
                        varItem.DS_VIEW_ID = '0';
                        varItem.TBL_NM = p_exeResult.importData.dataSetName;
                        varItem.COL_NM = s_varData.NAME;
            
                        if (p_exeResult.targetCol === s_varData.NAME) {
                            varItem.VAR_TARGET_YN = 'Y';                                                 
                            if (s_varData.TYPE == 'categorical') {
                                for (let lIdx in s_labelList.label) {
            
                                    let varExItem = {
                                        MODEL_ID: 0,
                                        MODEL_IDX: 0,
                                        TBL_NM: '',
                                        COL_NM: '',
                                        VAR_NM: '',
                                        VAR_TARGET_YN: 'N',
                                        LABEL_VAL: 0
                                    };
            
                                    varExItem.MODEL_ID = p_exeResult.MODEL_ID;
                                    varExItem.MODEL_IDX = p_exeResult.MODEL_IDX;
                                    varExItem.TBL_NM = p_exeResult.importData.dataSetName;
                                    varExItem.COL_NM = s_varData.NAME;
                                    varExItem.VAR_NM = s_labelList.labelVal[s_labelList.label[lIdx]];
                                    varExItem.LABEL_VAL = s_labelList.label[lIdx];
                                    varExItem.VAR_TARGET_YN = 'Y';
                                    s_dpVarExTemp.push(varExItem);
                                }
                            }
                        }
                        else
                            varItem.VAR_TARGET_YN = 'N';
            
                        if (selectedFeatureCols === undefined || selectedFeatureCols.length === 0)
                            varItem.VAR_MAJOR_YN = 'Y';
                        else
                            varItem.VAR_MAJOR_YN = 'N';
            
                        if (s_cleansingList === undefined || s_cleansingList.length === 0)
                            varItem.VAR_IMPORT = 'Y';
            
                        for (var colIdx in s_cleansingList) {
                            if (s_cleansingList[colIdx].NAME === s_varData.NAME) {
                                varItem.VAR_IMPORT = 'N';
                                break;
                            }
                            else {
                                varItem.VAR_IMPORT = 'Y';
                            }
                        }
            
                        for (let colIdx in selectedFeatureCols) {
                            if (selectedFeatureCols[colIdx].FEATURE === s_varData.NAME) {
                                varItem.VAR_MAJOR_YN = 'Y';
                                break;
                            }
                            else {
                                if (s_varData.TYPE == 'categorical') {
                                    // #170 카테고리 변수 prefix 변경
                                    let re = new RegExp("^" + s_varData.NAME + "＿");
                                    if (re.test(selectedFeatureCols[colIdx].FEATURE)) {
                                        varItem.VAR_MAJOR_YN = 'Y';
                                        let varExItem = {
                                            MODEL_ID: 0,
                                            MODEL_IDX: 0,
                                            TBL_NM: '',
                                            COL_NM: '',
                                            VAR_NM: '',
                                            VAR_TARGET_YN: 'N',
                                            LABEL_VAL: 0
                                        }
            
                                        varExItem.MODEL_ID = p_exeResult.MODEL_ID;
                                        varExItem.MODEL_IDX = p_exeResult.MODEL_IDX;
                                        varExItem.TBL_NM = p_exeResult.importData.dataSetName;
                                        varExItem.COL_NM = s_varData.NAME;
                                        varExItem.VAR_NM = selectedFeatureCols[colIdx].FEATURE;
                                        s_dpVarExTemp.push(varExItem);
                                    }
                                }
                            }
                        }
            
                        varItem.VAR_CAPTION = s_varData.NAME;
                        varItem.VAR_TYPE = s_varData.TYPE;
                        varItem.DATA_TYPE = s_varData.TYPE;
                        varItem.VAR_RANK = '';
                        varItem.VAR_UNI_CNT = s_varData.UNIQUE_VALUE;
                        varItem.VAR_MISS_CNT = s_varData.MISSING;
                        if (s_varData.TYPE == 'numerical') {
                            varItem.VAR_MIN = s_varData.MIN;
                            varItem.VAR_MAX = s_varData.MAX;
                            varItem.VAR_MEAN = s_varData.MEAN;
                            varItem.VAR_STD_DEV = s_varData.STDDEV;
                            varItem.VAR_1Q = s_varData.Q1;
                            varItem.VAR_2Q = 0;
                            varItem.VAR_3Q = s_varData.Q3;
                            varItem.VAR_4Q = 0;
                        }
                        else {
                            varItem.VAR_MIN = 0;
                            varItem.VAR_MAX = 0;
                            varItem.VAR_MEAN = 0;
                            varItem.VAR_STD_DEV = 0;
                            varItem.VAR_1Q = 0;
                            varItem.VAR_2Q = 0;
                            varItem.VAR_3Q = 0;
                            varItem.VAR_4Q = 0;
                        }
            
                        varItem.VAR_DESC = '';
                        try {
                            varItem.VAR_PRE = '{"duplication":' + JSON.stringify(s_varData.CLEANDATA.duplication) +
                                ',"missing":' + JSON.stringify(s_varData.CLEANDATA.missing) +
                                ',"outlier":' + JSON.stringify(s_varData.CLEANDATA.outlier) + '}'
                        } catch (e) {
                            varItem.VAR_PRE = '{"duplication":{"value":"clean","delete":false,"use":false},"missing":{"value":"clean","delete":false,"use":false},"outlier":{"value":"clean","delete":false,"use":false}}'
                        }
                        s_dpVarTemp.push(varItem);
                    }
                    let s_insertDpVarResult = await s_metaDb.insert('DP_VAR_MSTR',s_dpVarTemp,true);
            
                    if (p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Clustering") {
                        // 2019.11.04 dbscan 클러스터 라벨 수정. dbscan이 아닐 경우
                        if (p_exeResult.algorithmInfo.algorithm.ARG_ID != 18) {
                            let clusterLabel:Array<DP_ARG_PARAM_ATT> = p_exeResult.algorithmInfo.parameter.filter(pVar => pVar.PARAM == "n_clusters");
                            if (clusterLabel.length == 0) {
                                clusterLabel = p_exeResult.algorithmInfo.parameter.filter(pVar => pVar.PARAM == "min_samples");
                            }
                            if (clusterLabel.length == 0) {
                                clusterLabel = p_exeResult.algorithmInfo.parameter.filter(pVar => pVar.PARAM == "n_components");
                            }
                            let tmpParamValue:any = clusterLabel[0].PARAM_VALUE;
                            let clusterLabelNum = Number(tmpParamValue.VALUE);
                            for (let sIdx = 0; sIdx < clusterLabelNum; sIdx++) {
                                let varExItem = {
                                    MODEL_ID: p_exeResult.MODEL_ID,
                                    TBL_NM: p_exeResult.importData.dataSetName,
                                    COL_NM: '',
                                    VAR_NM: 'Label_' + sIdx,
                                    VAR_TARGET_YN: 'N',
                                    LABEL_VAL: sIdx
                                }
            
                                s_dpVarExTemp.push(varExItem);
                            }
                            // 2019.11.04 dbscan 클러스터 라벨 수정. dbscan일 경우
                        } else {
                            for (let idx = 0; idx < p_exeResult.dbscanCluster.length; idx++) {
                                let varExItem = {
                                    MODEL_ID: p_exeResult.MODEL_ID,
                                    MODEL_IDX: p_exeResult.MODEL_IDX,
                                    TBL_NM: p_exeResult.importData.dataSetName,
                                    COL_NM: '',
                                    VAR_NM: 'Label_' + p_exeResult.dbscanCluster[idx],
                                    VAR_TARGET_YN: 'N',
                                    LABEL_VAL: p_exeResult.dbscanCluster[idx]
                                }
                                if (!s_dpVarExTemp.some(sVarExItem => sVarExItem.COL_NM == varExItem.COL_NM && sVarExItem.LABEL_VAL == varExItem.LABEL_VAL && sVarExItem.VAR_NM == varExItem.VAR_NM )){
                                    s_dpVarExTemp.push(varExItem);
                                }
                            }
                        }
            
                    }
                    else if(p_exeResult.algorithmInfo.algorithm.ARG_TYPE == "Unstructured"){
                        if(p_exeResult.algorithmInfo.algorithm.ARG_ID == 99){
                            for (let i in p_exeResult.importData.label_data) {
                                console.log("temp_dp_var_str_ex_mstr[i]", p_exeResult.importData.label_data[i]);
                                if(p_exeResult.importData.label_data[i] != null){
                                    let varExItem = {
                                        MODEL_ID: p_exeResult.MODEL_ID,
                                        MODEL_IDX: p_exeResult.MODEL_IDX,
                                        TBL_NM: p_exeResult.importData.dataSetName,
                                        COL_NM: s_dpVarTemp[0].VAR_NM,
                                        VAR_NM: p_exeResult.importData.label_data[i]['origin'],
                                        VAR_TARGET_YN: 'Y',
                                        LABEL_VAL: p_exeResult.importData.label_data[i]['encode']
                                    };
                                    s_dpVarExTemp.push(varExItem);
                                }
                            }
                        }
                        else if([95,96,97,98].includes(p_exeResult.algorithmInfo.algorithm.ARG_ID)){
                            for (let i in p_exeResult.importData.label_data) {
                                console.log("temp_dp_var_str_ex_mstr[i]", p_exeResult.importData.label_data[i]);
                                if(p_exeResult.importData.label_data[i] != null){
                                    let varExItem = {
                                        MODEL_ID: p_exeResult.MODEL_ID,
                                        MODEL_IDX: p_exeResult.MODEL_IDX,
                                        TBL_NM: p_exeResult.importData.dataSetName,
                                        COL_NM: s_dpVarTemp[0].VAR_NM,
                                        VAR_NM: p_exeResult.importData.label_data[i],
                                        LABEL_VAL: Number(i)
                                    };
                                    s_dpVarExTemp.push(varExItem);
                                }
                            }
                        }

                        if(p_exeResult.importData.label_data_ex.length != 1){
                            let s_dtsetUseExTemp = [];
                            for(let s_idx of p_exeResult.importData.label_data_ex){
                                let sDtsetItem = {
                                    DATASET_ID: s_modelMstrData['MODEL_USE_DATASET_ID'],  
                                    DATASET_EX_NAME: s_idx, 
                                    MODEL_ID: s_modelDatasetUseMstrData['MODEL_ID'],
                                    MODEL_IDX: s_modelDatasetUseMstrData['MODEL_IDX']
                                }
                                s_dtsetUseExTemp.push(sDtsetItem);
                            }
                            await s_metaDb.insert('DP_MODEL_DATASET_USE_EX_MSTR',s_dtsetUseExTemp,true);
                        }
                    }
                    
                    let s_insertDpVarStrExResult = await s_metaDb.insert('DP_VAR_STR_EX_MSTR',s_dpVarExTemp,true);
                    let s_tmpParams = [];
            
                    for(let s_param of p_exeResult.algorithmInfo.parameter){
                        let s_dpModelLog:DP_MODEL_LOG_ATT = {
                            MODEL_ID: p_exeResult.MODEL_ID,
                            MODEL_IDX: p_exeResult.MODEL_IDX,
                            MODEL_SEQ: 1000,
                            ARG_ID: s_param.ARG_ID,
                            ARG_PARAMS:  s_param.PARAM,
                            ARG_VARS: ''
                        };
            
                        if (typeof s_param.PARAM_VALUE == 'object')
                            s_dpModelLog.ARG_VARS = JSON.stringify(s_param.PARAM_VALUE);
                        else
                            s_dpModelLog.ARG_VARS = s_param.PARAM_VALUE;
            
                        s_tmpParams.push(s_dpModelLog);
                    }
                    
                    let s_insertDpModelLogResult = await s_metaDb.insert('DP_MODEL_LOG',s_tmpParams,true);
                    return { modelId :  p_exeResult.MODEL_ID, modelIdx: p_exeResult.MODEL_IDX };
                } catch (p_error) {
                    pT.rollback();
                    reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
                }
                
            }).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch(p_error=>{
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });        
        });
    }

    getDpVarMstrData(p_varInfo: any, p_modelId: number, p_modelIdx: number, p_datasetName: string, p_targetCol: string, p_selectedFeatureCols: any) {
        let s_cleansingList = p_varInfo.filter((pVar: any) => pVar.USE == false);
        let s_dpVarTemp: any = [];
        for (let s_varData of p_varInfo) {
            let varItem = {
                MODEL_ID: p_modelId,
                MODEL_IDX: p_modelIdx,
                VAR_NM: s_varData.NAME,
                DS_VIEW_ID: '0',
                TBL_NM: p_datasetName,
                COL_NM: s_varData.NAME,
                VAR_TARGET_YN: '',
                VAR_MAJOR_YN: '',
                VAR_CAPTION: s_varData.NAME,
                VAR_TYPE: s_varData.TYPE,
                DATA_TYPE: s_varData.TYPE,
                VAR_IMPORT: '',
                VAR_RANK: '',
                VAR_UNI_CNT: s_varData.UNIQUE_VALUE,
                VAR_MISS_CNT: s_varData.MISSING,
                VAR_MIN: 0,
                VAR_MAX: 0,
                VAR_MEAN: 0,
                VAR_STD_DEV: 0,
                VAR_1Q: 0,
                VAR_2Q: 0,
                VAR_3Q: 0,
                VAR_4Q: 0,
                VAR_DESC: '',
                VAR_PRE: '',
                VAR_EX:new Array
            };

            if (s_varData.TYPE == 'numerical') {
                varItem.VAR_MIN = s_varData.MIN;
                varItem.VAR_MAX = s_varData.MAX;
                varItem.VAR_MEAN = s_varData.MEAN;
                varItem.VAR_STD_DEV = s_varData.STDDEV;
                varItem.VAR_1Q = s_varData.Q1;
                varItem.VAR_3Q = s_varData.Q3;
            }

            try {
                varItem.VAR_PRE = '{"duplication":' + JSON.stringify(s_varData.CLEANDATA.duplication) +
                    ',"missing":' + JSON.stringify(s_varData.CLEANDATA.missing) +
                    ',"outlier":' + JSON.stringify(s_varData.CLEANDATA.outlier) + '}'
            } catch (e) {
                varItem.VAR_PRE = '{"duplication":{"value":"clean","delete":false,"use":false},"missing":{"value":"clean","delete":false,"use":false},"outlier":{"value":"clean","delete":false,"use":false}}'
            }

            if (p_targetCol === s_varData.NAME)
                varItem.VAR_TARGET_YN = 'Y';
            else
                varItem.VAR_TARGET_YN = 'N';

            if (p_selectedFeatureCols === undefined || p_selectedFeatureCols.length === 0)
                varItem.VAR_MAJOR_YN = 'Y';
            else
                varItem.VAR_MAJOR_YN = 'N';

            if (s_cleansingList === undefined || s_cleansingList.length === 0)
                varItem.VAR_IMPORT = 'Y';

            for (var colIdx in s_cleansingList) {
                if (s_cleansingList[colIdx].NAME == s_varData.NAME) {
                    varItem.VAR_IMPORT = 'N';
                    break;
                }
                else {
                    varItem.VAR_IMPORT = 'Y';
                }
            }

            for (let colIdx in p_selectedFeatureCols) {
                if (p_selectedFeatureCols[colIdx].FEATURE == s_varData.NAME) {
                    varItem.VAR_MAJOR_YN = 'Y';
                    break;
                }
                else {
                    if (s_varData.TYPE == 'categorical') {
                        // #170 카테고리 변수 prefix 변경
                        let re = new RegExp("^" + s_varData.NAME + "＿");
                        if (re.test(p_selectedFeatureCols[colIdx].FEATURE)) {
                            varItem.VAR_MAJOR_YN = 'Y';
                        }
                    }
                }
            }
            s_dpVarTemp.push(varItem);
        }
        return s_dpVarTemp;
    }

    getDpVarStrExData(p_varInfo: any, p_algorithmInfo: any, p_modelId: number, p_modelIdx: number, p_datasetName: string, p_labelList: any, p_targetCol: string, p_selectedFeatureCols: any, p_data: any) {
        let s_dpVarExTemp: any = [];
        // 분류, 회귀
        if (p_algorithmInfo.algorithm.ARG_TYPE == "Classification" || p_algorithmInfo.algorithm.ARG_TYPE == "Regression" || p_algorithmInfo.algorithm.ARG_TYPE == "Reinforcement")
            for (let s_varData of p_varInfo) {
                if (p_targetCol === s_varData.NAME) {
                    if (s_varData.TYPE == 'categorical') {
                        for (let lIdx in p_labelList.label) {
                            let varExItem = {
                                MODEL_ID: p_modelId,
                                MODEL_IDX: p_modelIdx,
                                TBL_NM: p_datasetName,
                                COL_NM: s_varData.NAME,
                                VAR_NM: p_labelList.labelVal[p_labelList.label[lIdx]],
                                VAR_TARGET_YN: 'Y',
                                LABEL_VAL: p_labelList.label[lIdx]
                            };
                            s_dpVarExTemp.push(varExItem);
                        }
                    }
                }
                for (let colIdx in p_selectedFeatureCols) {
                    if (p_selectedFeatureCols[colIdx].FEATURE == s_varData.NAME) {
                        break;
                    }
                    else {
                        if (s_varData.TYPE == 'categorical') {
                            // #170 카테고리 변수 prefix 변경
                            let re = new RegExp("^" + s_varData.NAME + "＿");
                            if (re.test(p_selectedFeatureCols[colIdx].FEATURE)) {
                                let varExItem = {
                                    MODEL_ID: p_modelId,
                                    MODEL_IDX: p_modelIdx,
                                    TBL_NM: p_datasetName,
                                    COL_NM: s_varData.NAME,
                                    VAR_NM: p_selectedFeatureCols[colIdx].FEATURE,
                                    VAR_TARGET_YN: 'N',
                                    LABEL_VAL: 0
                                }
                                s_dpVarExTemp.push(varExItem);
                            }
                        }
                    }
                }
            }
        // 군집
        if (p_algorithmInfo.algorithm.ARG_TYPE == "Clustering") {
            // 2019.11.04 dbscan 클러스터 라벨 수정. dbscan이 아닐 경우
            if (p_algorithmInfo.algorithm.ARG_ID != 18) {
                let clusterLabel: Array<DP_ARG_PARAM_ATT> = p_algorithmInfo.parameter.filter((pVar: any) => pVar.PARAM_NM == "n_clusters");
                if (clusterLabel.length == 0) {
                    clusterLabel = p_algorithmInfo.parameter.filter((pVar: any) => pVar.PARAM_NM == "min_samples");
                }
                if (clusterLabel.length == 0) {
                    clusterLabel = p_algorithmInfo.parameter.filter((pVar: any) => pVar.PARAM_NM == "n_components");
                }
                let tmpParamValue: any = clusterLabel[0].PARAM_VALUE;
                let clusterLabelNum = Number(tmpParamValue.VALUE);
                for (let sIdx = 0; sIdx < clusterLabelNum; sIdx++) {
                    let varExItem = {
                        MODEL_ID: p_modelId,
                        MODEL_IDX: p_modelIdx,
                        TBL_NM: p_datasetName,
                        COL_NM: '',
                        VAR_NM: 'Label_' + sIdx,
                        VAR_TARGET_YN: 'N',
                        LABEL_VAL: sIdx
                    }

                    s_dpVarExTemp.push(varExItem);
                }
                // 2019.11.04 dbscan 클러스터 라벨 수정. dbscan일 경우
            } else {
                let s_dbscanCluster = p_data['dbscanCluster']
                for (let idx = 0; idx < s_dbscanCluster.length; idx++) {
                    let varExItem = {
                        MODEL_ID: p_modelId,
                        MODEL_IDX: p_modelIdx,
                        TBL_NM: p_datasetName,
                        COL_NM: '',
                        VAR_NM: 'Label_' + s_dbscanCluster[idx],
                        VAR_TARGET_YN: 'N',
                        LABEL_VAL: s_dbscanCluster[idx]
                    }
                    if (!s_dpVarExTemp.some((sVarExItem: any) => sVarExItem.COL_NM == varExItem.COL_NM && sVarExItem.LABEL_VAL == varExItem.LABEL_VAL && sVarExItem.VAR_NM == varExItem.VAR_NM)) {
                        s_dpVarExTemp.push(varExItem);
                    }
                }
            }
        }

        return s_dpVarExTemp;
    }

    getUnModelDpVarStrExData(p_algorithmInfo: any, p_modelId: number, p_modelIdx: number, p_datasetName: string, p_data: any) {
        let s_dpVarExTemp: any = [];
        if (p_algorithmInfo.algorithm.ARG_ID == 99) {
            for (let i in p_data['label_data']) {
                console.log("temp_dp_var_str_ex_mstr[i]", p_data['label_data'][i]);
                if (p_data['label_data'][i] != null) {
                    let varExItem = {
                        MODEL_ID: p_modelId,
                        MODEL_IDX: p_modelIdx,
                        TBL_NM: p_datasetName,
                        COL_NM: p_data['VAR_NM'],
                        VAR_NM: p_data['label_data'][i]['origin'],
                        VAR_TARGET_YN: 'Y',
                        LABEL_VAL: p_data['label_data'][i]['encode']
                    };
                    s_dpVarExTemp.push(varExItem);
                }
            }
        }
        else if ([95, 96, 97, 98].includes(p_algorithmInfo.algorithm.ARG_ID)) {
            for (let i in p_data['label_data']) {
                console.log("temp_dp_var_str_ex_mstr[i]", p_data['label_data'][i]);
                if (p_data['label_data'][i] != null) {
                    let varExItem = {
                        MODEL_ID: p_modelId,
                        MODEL_IDX: p_modelIdx,
                        TBL_NM: p_datasetName,
                        COL_NM: p_data['VAR_NM'],
                        VAR_NM: p_data['label_data'][i],
                        LABEL_VAL: Number(i)
                    };
                    s_dpVarExTemp.push(varExItem);
                }
            }
        }
        return s_dpVarExTemp;
    }

    getUnModelDpModelDatasetUseExData(p_labelDataEx: any, p_datasetId: number, p_modelId: number, p_modelIdx: number) {
        let s_dtsetUseExTemp;
        if (p_labelDataEx.length != 1) {
            let s_dtsetUseExTemp = [];
            for (let idx of p_labelDataEx) {
                let sDtsetItem = {
                    DATASET_ID: p_datasetId,
                    DATASET_EX_NAME: idx,
                    MODEL_ID: p_modelId,
                    MODEL_IDX: p_modelIdx
                }
                s_dtsetUseExTemp.push(sDtsetItem);
            }
        }
        return s_dtsetUseExTemp;
    }

    getDpModelLogData(p_algorithmInfo: any, p_modelId: number, p_modelIdx: number,p_modelResult:any) {
        let s_tmpParams = [];
        for (let s_param of p_algorithmInfo.parameter) {
            let s_dpModelLog: DP_MODEL_LOG_ATT = {
                MODEL_ID: p_modelId,
                MODEL_IDX: p_modelIdx,
                MODEL_SEQ: 1000,
                ARG_ID: s_param.ARG_ID,
                ARG_PARAMS: s_param.PARAM_NM,
                ARG_VARS: ''
            };

            if (typeof s_param.PARAM_VALUE == 'object'){
                s_param.PARAM_VALUE['VALUE'] = p_modelResult.optParams[s_param.PARAM_NM]
                s_dpModelLog.ARG_VARS = JSON.stringify(s_param.PARAM_VALUE);
            }
            else
                s_dpModelLog.ARG_VARS = s_param.PARAM_VALUE;

            s_tmpParams.push(s_dpModelLog);
        }
        return s_tmpParams;
    }

    modelDelete(p_modelId:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;

            s_metaDb.update('DP_MODEL_MSTR',{DEL_YN: 'Y'},{MODEL_ID: p_modelId}).then(p_deleteResult=>{
                resolve({isSuccess:true,result:p_deleteResult});
            }).catch(p_error=>{reject(p_error)});
        })
    }
    modelUpdate(p_model:DP_MODEL_MSTR_ATT){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;

            s_metaDb.update('DP_MODEL_MSTR',p_model,{MODEL_ID: p_model.MODEL_ID,MODEL_IDX: p_model.MODEL_IDX}).then(p_deleteResult=>{
                resolve({isSuccess:true,result:p_deleteResult});
            }).catch(p_error=>{reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));});
        })
    }
    saveModelUseData(p_type:string,p_modelDataSet:any){

        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            let s_dtsetNm = '';
            
            if(p_type == 'single'){
                s_dtsetNm = p_modelDataSet.DATASET_NAME;
            }else{            
                if(p_modelDataSet.DATASET_NAME.length >1)    
                    s_dtsetNm = `${p_modelDataSet.DATASET_NAME[0]} 외 ${p_modelDataSet.DATASET_NAME.length-1}개`;   
                else
                    s_dtsetNm = p_modelDataSet.DATASET_NAME[0];
            }

            s_metaDb.getConnection().transaction(async (pT:Transaction)=>{
                let s_insertResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR',{
                    DATASET_TYPE: p_modelDataSet.DATASET_TYPE,
                    DATASET_NAME: s_dtsetNm,
                    DATASET_REF_ID: p_modelDataSet.DATASET_REF_ID,
                    MODEL_ID:p_modelDataSet.MODEL_ID,
                    HADOOP_PATH:p_type=='single'?p_modelDataSet.HADOOP_PATH :''
                },false);
    
                if(p_type == 'multiple'){
                    let datasetId = s_insertResult.DATASET_ID;
                    let s_dtsetNmArr = p_modelDataSet.DATASET_NAME;
                    let s_dtsetUseExTemp = [];
                    for(let s_idx of s_dtsetNmArr){
                        let s_dtsetItem = {
                            DATASET_ID: datasetId,  
                            DATASET_EX_NAME: s_idx, 
                            MODEL_ID: p_modelDataSet.MODEL_ID
                        }
                        s_dtsetUseExTemp.push(s_dtsetItem);
                    }
    
                    await s_metaDb.insert('DP_MODEL_DATASET_USE_EX_MSTR',s_dtsetUseExTemp,true);
                }
    
                return {isSuccess:true,result:'등록 완료'};
            }).then(p_result=>{
                resolve(p_result);
            }).catch(p_error=>{
                // this.modelDelete(p_modelDataSet.MODEL_ID).then(p_result=>{
                    reject(p_error);
                // });
                
            });
        })
        
    }
    saveWkUseModel(p_modelInfo:any){
        return new Promise<WiseReturn>(async (resolve, reject) => {
            
            let s_metaDb = global.WiseMetaDB;

            try {
                let s_wfModelData = await s_metaDb.select('DP_MODEL_WORKFLOW_USE_MSTR',[],{ MODEL_ID:p_modelInfo.MODEL_ID, MODEL_IDX:p_modelInfo.MODEL_IDX });
            
                if (s_wfModelData.length == 0) {
                    await s_metaDb.insert('DP_MODEL_WORKFLOW_USE_MSTR',{ MODEL_ID:p_modelInfo.MODEL_ID, MODEL_IDX:p_modelInfo.MODEL_IDX, WF_ID:p_modelInfo.WF_ID, COM_UUID:p_modelInfo.COM_UUID },false);
                } else {
                    await s_metaDb.update('DP_MODEL_WORKFLOW_USE_MSTR',{ WF_ID:p_modelInfo.WF_ID, COM_UUID:p_modelInfo.COM_UUID }, { MODEL_ID:p_modelInfo.MODEL_ID, MODEL_IDX:p_modelInfo.MODEL_IDX });
                }
                resolve({isSuccess:true,result:{ MODEL_ID:p_modelInfo.MODEL_ID, MODEL_IDX:p_modelInfo.MODEL_IDX }});
            } catch (p_error) {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            }
        })
    }
    /** __[플랫폼 워크플로우 조회 조건 사용]__ 분석 컴포넌트 ID를 기준으로 모델 실행 결과 찾기 (가장 최근 결과를 찾음)
    * @example
    * ```
    * getWkModelResult(['629c5edd-ca8e-a18b-92c6-a84822d79de5','ff2535ac-68aa-b88d-b257-c5c5f7c7aa66'],
    * [{MODEL_ID:2222, MODEL_IDX:1},{MODEL_ID:2242, MODEL_IDX:2}]);
    * ```
    * @param pAnalComIdList - 실행 결과 조회할 분석 컴포넌트 id Array<string>
    * @param pModelIdDataList - 실행 결과 조회할 모델 ID와 INDEX 데이터 Array<{MODEL_ID:number, MODEL_IDX:number}> 
    * 
    * @returns 반환값을 Promise<WiseReturn>을 부여한다. 
    */
    getWkModelResult(pAnalComIdList: string[], pModelIdDataList: Array<{ MODEL_ID: number, MODEL_IDX: number }>) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_comIdString = `("${pAnalComIdList.join('","')}")`;
            // let s_sql = ''
            // 1. COM_ID 기준으로 조회한 모델 결과(COM_ID에서 가장 큰 MODEL_ID의 최신 모델)
            let s_sql = `
                SELECT * FROM DP_MODEL_RESULT WHERE UUID IN  ${s_comIdString}`;

            // 2. MODEL_ID, MODEL_IDX 기준으로 조회한 모델 결과
            // let s_modelIdString = pModelIdDataList.map((sModelData) => `(${sModelData.MODEL_ID}, ${sModelData.MODEL_IDX})`)
            // let s_modelIdQuery = `
            //     SELECT T4.MODEL_ID, T4.MODEL_IDX, T4.MODEL_NM, T4.ARG_ID, T4.MODEL_EVAL_TYPE, T4.EXCUTE_RESULT AS MODEL_EXCUTE_RESULT, NULL AS WF_ID, NULL AS COM_ID, T5.ARG_NM
            //     FROM DP_MODEL_MSTR T4 
            //     INNER JOIN DP_ARG_MSTR T5 ON T4.ARG_ID = T5.ARG_ID
            //     WHERE (MODEL_ID, MODEL_IDX) IN (${s_modelIdString})`;

            // if (pAnalComIdList.length > 0 && pModelIdDataList.length > 0){
            //     s_sql = s_comIdQuery + ' UNION ' + s_modelIdQuery;
            // } else if (pAnalComIdList.length > 0) {
            //     s_sql = s_comIdQuery;
            // } else if (pModelIdDataList.length > 0) {
            //     s_sql = s_modelIdQuery;
            // }
             
            let s_metaDb = global.WiseMetaDB;
            s_metaDb.query(s_sql, '', true).then(p_result => {
                resolve({ isSuccess: true, result: p_result });
            }).catch((p_error) => {
                reject(new WpError({ httpCode: WpHttpCode.ANALYTIC_MODEL_ERR, message: p_error }));
            });
        });
    }
   
    /** __[플랫폼 워크플로우 조회 조건 사용]__ 분석 컴포넌트 ID를 기준으로 모델 파라미터 조회
    * @example
    * ```
    * getWkModelParams(['629c5edd-ca8e-a18b-92c6-a84822d79de5','ff2535ac-68aa-b88d-b257-c5c5f7c7aa66'],
    * [{MODEL_ID:2222, MODEL_IDX:1},{MODEL_ID:2242, MODEL_IDX:2}]);
    * ```
    * @param pAnalComIdList -  모델 파라미터를 조회할 분석 컴포넌트 id Array<string>
    * @param pModelIdDataList - 모델 파라미터를 조회할 모델 ID와 INDEX 데이터 Array<{MODEL_ID:number, MODEL_IDX:number}> 
    * 
    * @returns 반환값을 Promise<WiseReturn>을 부여한다. 
    */
    getWkModelParams(pAnalComIdList: string[], pModelIdDataList: Array<{ MODEL_ID: number, MODEL_IDX: number }>) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let sAnalComIdListString = `("${pAnalComIdList.join('","')}")`;
            // 1. COM_UUID 기준으로 조회한 모델 파라미터
            let sComIdQuery = `
                SELECT MODEL_ID, MAX(MODEL_IDX) as MODEL_IDX FROM 

                ( SELECT * FROM DP_MODEL_WORKFLOW_USE_MSTR
                    WHERE MODEL_ID IN (
                        SELECT MAX(MODEL_ID) AS MODEL_ID FROM DP_MODEL_WORKFLOW_USE_MSTR
                        WHERE COM_UUID IN ${sAnalComIdListString}
                    GROUP BY COM_UUID
                )) T1
                GROUP BY MODEL_ID`;
            // 2. MODEL_ID, MODEL_IDX 기준으로 조회한 모델 결과
            let unionQuery = '';
            if (pModelIdDataList.length > 0) {
                let sModelIdString: unknown = pModelIdDataList.map((sModelData) => `(${sModelData.MODEL_ID}, ${sModelData.MODEL_IDX})`)
                let sModelFindOption = '(' + ''.concat(sModelIdString as string) + ')';
                unionQuery = `UNION 
                SELECT MODEL_ID, MODEL_NM, MODEL_EVAL_TYPE, MODEL_FEATURE_TYPE, MODEL_PART_OPTION, MODEL_ARG_PARAM, MODEL_OPTIMIZER_YN, REG_DATE 
                FROM DP_MODEL_MSTR AS T2
                WHERE (MODEL_ID, MODEL_IDX) IN ${sModelFindOption}`;
            }

            let s_metaDb = global.WiseMetaDB;
            let s_sql = `SELECT MODEL_ID, MODEL_NM, MODEL_EVAL_TYPE, MODEL_FEATURE_TYPE, MODEL_PART_OPTION, MODEL_ARG_PARAM, MODEL_OPTIMIZER_YN, REG_DATE
                FROM DP_MODEL_MSTR WHERE (MODEL_ID, MODEL_IDX) IN (${sComIdQuery})
                ${unionQuery}`;

            s_metaDb.query(s_sql, '', true).then(p_result => {
                resolve({ isSuccess: true, result: p_result });
            }).catch((p_error) => {
                reject(new WpError({ httpCode: WpHttpCode.ANALYTIC_MODEL_ERR, message: p_error }));
            });
        });
    }
    /** __[플랫폼 워크플로우 저장 후속 작업]__ 분석 결과로 MODEL_ID 생성, DP_MODEL_WORKFLOW_USE_MSTR 업데이트 작업
    * @example
    * ```
    * saveWorkflowModel(pResult)
    * ```
    * @param pResult - 분석 결과 나온 JSON 객체(키값: action, edaResult, featureImportanceResult, modelRunResult, modelParams, logId, modelname, workflowId, wkModelSaveFlag, comId)
    * 
    * @returns 반환값을 Promise을 부여한다. 
    */
    saveWorkflowModel(pResult:any){
        return new Promise<WiseReturn>(async(resolve, reject) => {
            try {

                let s_modelId = pResult.modelId;
                let s_modelIdx = pResult.modelIdx;
                // DP_MODEL_WORKFLOW_USE_MSTR INSERT
                await global.WiseMetaDB.insert('DP_MODEL_WORKFLOW_USE_MSTR', { MODEL_ID: s_modelId, MODEL_IDX: s_modelIdx, WF_ID: pResult.workflowId, COM_UUID: pResult.comId }, false);

                // #15 모델 id 생성, 호출 이력에 모델 id 업데이트
                let s_modelParams: any = pResult.modelParams;
                Object.assign(s_modelParams, { calltype: "workflow", modelRunType: "workflow", wkModelSaveFlag: pResult.wkModelSaveFlag, saveModelName: pResult.modelname })

                let s_modelExeResult = JSON.parse(pResult.modelRunResult);
                s_modelParams.pythonUniqueId = s_modelExeResult.reVal.uuid;
                if (s_modelParams.targetCol == "") {
                    s_modelParams['resultSet'] = [];
                }
                let s_overwriteFlag = false;
                if(s_modelIdx > 1) {
                    s_overwriteFlag = true;
                }
                s_modelParams['MODEL_ID'] = s_modelId;
                s_modelParams['MODEL_IDX'] = s_modelIdx;
                let s_saveResult = await this.executeModelMetaDb(s_modelParams, this.o_userInfo, s_overwriteFlag, true, s_modelExeResult.reVal);
                if (s_saveResult.isSuccess) {                    
                    resolve({ isSuccess: true, result: s_saveResult.result });
                } else {
                    reject(new WpError({ httpCode: WpHttpCode.ANALYTIC_MODEL_ERR, message: s_saveResult.result }));
                }
            } catch (error) {
                reject(new WpError({ httpCode: WpHttpCode.ANALYTIC_MODEL_ERR, message: error }));
            } 
        })
    }

    async executeModelMetaDb(p_param: WP_MODEL, p_userInfo:WP_SESSION_USER, p_overwrite: boolean, p_wkFlag: boolean, p_modelResult?: any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            let s_today = this.moment().format('YYYY-MM-DD HH:mm:ss');
            let s_callType = p_param.modelRunType;
            let s_datasetName = p_param.importData.dataSetName;
            let s_algorithmInfo = p_param.algorithmInfo;
            // 하둡데이터셋 경로저장 변경
            let s_dataType = p_param.importData.dataType;
            let s_path:string = p_param.importData.path;
            // if (s_dataType == 'HDFS') {
            //     s_path = p_param.importData.path;
            // }

            let s_argType = s_algorithmInfo.algorithm.ARG_TYPE;
            let s_fileInfo = {'storageName': p_param.importData.dataSetName, 
                     'storageMode': 'append',
                     'storageFileType': p_param.importData.dataType, 
                     'storageInfo': p_param.importData.dsMstrInfo,
                     'dbType': 'None', 
                     'dbName': 'None', 
                     'origin_file': p_param.importData.orgDataFileName, 
                     'dbInfo': p_param.importData.dsMstrInfo, 
                     'path': p_param.importData.path, 
                     'fileName': p_param.importData.dataFileName, 
                     'dataType':  p_param.importData.dataType, 
                     'USER_ID': '', 
                     'USER_NO': p_userInfo.USER_NO, 
                     'LOG_ID': 0, 
                     'reLearnTF': 'N', 
                     'partitionInfo': p_param.partitionInfo, 
                     'optimizer': p_param.algorithmInfo.optimizer ? 'Y' : 'N', 
                     'fileType': p_param.importData.dataType, 
                     'cleanInfo': new Array, 
                     'userPreprocessing': "False", 
                     'torchScale': {}
            };
            let s_score = 0;
            // 프로핏 스코어
            if (!p_wkFlag) {
                let s_argResult = s_algorithmInfo.argResult;
                if (s_argType == "Regression") {
                    s_score = Math.round(Number(s_argResult));
                }
                else if (s_argType == "Classification") {
                    s_score = Math.round(Number(s_argResult) * 100);
                }
                else if (s_argType == "Clustering") {
                    s_score = Math.round(Number(s_argResult) * 100);
                }
                else if (s_argType == "Unstructured") {
                    s_score = Math.round(Number(s_argResult) * 100);
                }
            }
            // 워크플로우 스코어
            if (p_wkFlag){
                if (s_argType == "Regression") {
                    s_score = (100 - Number(p_modelResult.mape)) < 0 ? 0 : Number((100 - Number(p_modelResult.mape)).toFixed(0));
                }
                else if (s_argType == "Classification") {
                    s_score = Math.round(Number(p_modelResult.accuracy) * 100);
                }
                else if (s_argType == "Clustering") {
                    s_score = Math.round(Number(p_modelResult.silhouette_coef) * 100);
                }
                else if (s_argType == "Unstructured") {
                    s_score = 0; // 현재 언어모델은 평가 스코어로 쓸 수 있는 게 없음
                    console.log('워크플로우 스코어:', p_modelResult);
                }
            }

            // modelId, modelIdx
            let s_modelId = 0;
            let s_modelIdx = 1;
            // useDatasetId
            let s_useDatasetId = 0;

            s_metaDb.getConnection().transaction(async (pT:Transaction)=>{
                try {
                    // DB 파라미터 설정
                    let s_DP_MODEL_DATASET_USE_MSTR: DP_MODEL_DATASET_USE_MSTR_ATT = {
                        DATASET_TYPE: s_dataType,   //  labelInfos.fileType
                        DATASET_NAME: s_datasetName,    // importData.dataFileName.map(row=>row.NAME)
                        DATASET_REF_ID: Number(p_param.importData.dataRefId),
                        PROJ_ID: 1000,
                        HADOOP_PATH: s_path
                    };
                    let s_DP_MODEL_MSTR: DP_MODEL_MSTR_ATT = {
                        PROJ_ID: 1000,
                        ARG_ID: s_algorithmInfo.algorithm.ARG_ID,
                        MODEL_PROGRESS: s_score,
                        MODEL_RUN_TYPE: s_callType ? s_callType : '', //외부에서 CALL 한 경우 model_run_type에 명시
                        MODEL_EVAL_TYPE: s_argType == 'Unstructured' ? s_algorithmInfo.algorithm.ARG_NM : s_argType,
                        MODEL_EVAL_RESULT: p_param.pythonUniqueId,
                        DEL_YN: 'N',
                        MODEL_FEATURE_TYPE: p_param.scaleInfo,
                        REG_USER_NO: p_userInfo.USER_NO,
                        REG_DATE: s_today,
                        MODEL_PART_OPTION: JSON.stringify(p_param.partitionInfo),
                        MODEL_ARG_PARAM: JSON.stringify(s_algorithmInfo.parameter),    // algorithmInfo
                        MODEL_OPTIMIZER_YN: s_algorithmInfo.optimizer ? 'Y' : 'N',
                        EXCUTE_RESULT: (typeof p_modelResult == 'undefined' ? '' : JSON.stringify(p_modelResult)),
                        MODEL_NM: p_param.saveModelName
                    };

                    // 1. workflow일 경우
                    if (p_wkFlag == true) {
                        s_modelId = p_param['MODEL_ID'];
                        s_modelIdx = p_param['MODEL_IDX'];

                        // DP_MODEL_DATASET_USE_MSTR 작업
                        s_DP_MODEL_DATASET_USE_MSTR['MODEL_ID'] = s_modelId;
                        s_DP_MODEL_DATASET_USE_MSTR['MODEL_IDX'] = s_modelIdx;
                        let s_datasetUseMstrResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR', s_DP_MODEL_DATASET_USE_MSTR, false, pT);
                        s_useDatasetId = s_datasetUseMstrResult.DATASET_ID;

                        // DP_MODEL_MSTR 작업
                        s_DP_MODEL_MSTR['MODEL_ID'] = s_modelId;
                        s_DP_MODEL_MSTR['MODEL_IDX'] = s_modelIdx;
                        if (!p_param.wkModelSaveFlag) {
                            s_DP_MODEL_MSTR['DEL_YN'] = 'Y'
                        };
                        s_DP_MODEL_MSTR['MODEL_USE_DATASET_ID'] = s_useDatasetId;
                        // (1) 중복/최초 생성 여부
                        if (p_overwrite) {
                            await s_metaDb.insert('DP_MODEL_MSTR', s_DP_MODEL_MSTR, false, pT);
                        } else {
                            await s_metaDb.update('DP_MODEL_MSTR', s_DP_MODEL_MSTR, { MODEL_ID: s_modelId, MODEL_IDX: 0 }, pT);
                        }

                        // 2. prophet일 경우
                    } else {
                        // (1) 중복일 경우
                        if (p_overwrite) {
                            s_modelId = p_param['MODEL_ID'];
                            let s_query = `SELECT MODEL_ID, MAX(MODEL_IDX) AS MODEL_IDX FROM DP_MODEL_MSTR 
                        WHERE MODEL_ID=${s_modelId}`;
                            let s_dpModelMstrResult = await s_metaDb.query(s_query, "", true, pT);

                            s_modelIdx = s_dpModelMstrResult[0].MODEL_IDX + 1;

                            // # DP_MODEL_DATASET_USE_MSTR 작업
                            s_DP_MODEL_DATASET_USE_MSTR['MODEL_ID'] = s_modelId;
                            s_DP_MODEL_DATASET_USE_MSTR['MODEL_IDX'] = s_modelIdx;
                            let s_datasetUseMstrResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR', s_DP_MODEL_DATASET_USE_MSTR, false, pT);
                            s_useDatasetId = s_datasetUseMstrResult.DATASET_ID;

                            // # DP_MODEL_MSTR 작업
                            s_DP_MODEL_MSTR['MODEL_ID'] = s_modelId;
                            s_DP_MODEL_MSTR['MODEL_IDX'] = s_modelIdx;
                            s_DP_MODEL_MSTR['MODEL_USE_DATASET_ID'] = s_useDatasetId;
                            await s_metaDb.insert('DP_MODEL_MSTR', s_DP_MODEL_MSTR, false, pT);

                            // (2) 최초 생성
                        } else {
                            let s_dpModelMstrResult = await s_metaDb.select('DP_MODEL_MSTR', [], { MODEL_NM: p_param.saveModelName, REG_USER_NO: p_userInfo.USER_NO, DEL_YN: 'N' });
                            // 모델명이 있을 경우 중복 경고 처리
                            if (s_dpModelMstrResult.length >= 1) {
                                pT.rollback();
                                resolve({ isSuccess: false, result: '중복' });
                            } else {
                                // DP_MODEL_DATASET_USE_MSTR INSERT
                                let s_datasetUseMstrResult = await s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR', s_DP_MODEL_DATASET_USE_MSTR, false, pT);
                                s_useDatasetId = s_datasetUseMstrResult.DATASET_ID;
                                // DP_MODEL_MSTR INSERT
                                s_DP_MODEL_MSTR['MODEL_USE_DATASET_ID'] = s_useDatasetId;
                                s_DP_MODEL_MSTR['MODEL_IDX'] = s_modelIdx;
                                
                                let s_modelMstrResult = await s_metaDb.insert('DP_MODEL_MSTR', s_DP_MODEL_MSTR, false, pT);
                                s_modelId = s_modelMstrResult.MODEL_ID;
                                // DP_MODEL_DATASET_USE_MSTR UPDATE
                                await s_metaDb.update('DP_MODEL_DATASET_USE_MSTR', { MODEL_ID: s_modelId }, { DATASET_ID: s_useDatasetId }, pT);
                            }
                            
                        }
                    }

                    let s_selectedFeatureCols: any;
                    let s_varInfo = p_param.varInfo;

                    if (Object.keys(p_param.featureInfo.featureList).length == 0) {
                        s_selectedFeatureCols = [];
                    }
                    else {
                        s_selectedFeatureCols = p_param.featureInfo.featureList.filter(pFeatures => pFeatures.USE == true);
                    }

                    let s_targetCol = p_param.targetCol;
                    
                    let s_labelList;
                    if (typeof p_param.featureInfo.labelData == 'string') {
                        s_labelList = JSON.parse(p_param.featureInfo.labelData);
                    } else {
                        s_labelList = p_param.featureInfo.labelData;
                    }

                    // (공통) DP_VAR_MSTR insert  p_varInfo
                    let sDpVarMstrData: any = [];
                    // WP-366 언어모델에는 변수 정보가 없음. undefined
                    if (s_varInfo) {
                        sDpVarMstrData = this.getDpVarMstrData(s_varInfo, s_modelId, s_modelIdx, s_datasetName, s_targetCol, s_selectedFeatureCols);

                        await s_metaDb.insert('DP_VAR_MSTR', sDpVarMstrData, true, pT);
                    }

                    // (비정형) DP_VAR_STR_EX_MSTR, DP_MODEL_DATASET_USE_EX_MSTR insert
                    if (s_algorithmInfo.algorithm.ARG_TYPE == "Unstructured" && s_varInfo) {
                        let s_data = { VAR_NM: sDpVarMstrData[0].VAR_NM, label_data: p_param.importData.label_data }
                        let s_dpVarStrExData = this.getUnModelDpVarStrExData(s_algorithmInfo, s_modelId, s_modelIdx, s_datasetName, s_data)
                        await s_metaDb.insert('DP_VAR_STR_EX_MSTR', s_dpVarStrExData, true, pT);    

                        let s_modelDatasetUseExData = this.getUnModelDpModelDatasetUseExData(p_param.importData.label_data_ex, s_useDatasetId, s_modelId, s_modelIdx);
                        if (s_modelDatasetUseExData)
                            await s_metaDb.insert('DP_MODEL_DATASET_USE_EX_MSTR', s_modelDatasetUseExData, true, pT);

                    } else {
                        // (정형) DP_VAR_STR_EX_MSTR insert
                        let s_data = { dbscanCluster: p_param.dbscanCluster }
                        let s_dpVarStrExData = this.getDpVarStrExData(s_varInfo, s_algorithmInfo, s_modelId, s_modelIdx, s_datasetName, s_labelList, s_targetCol, s_selectedFeatureCols, s_data);
                        await s_metaDb.insert('DP_VAR_STR_EX_MSTR', s_dpVarStrExData, true, pT);
                        for(let s_item of s_dpVarStrExData){
                            sDpVarMstrData.map((value:any)=> {
                                if(value.VAR_NM == s_item.COL_NM)
                                    value.VAR_EX.push(s_item.VAR_NM);
                            });
                        }
                    }

                    // (공통) DP_MODEL_LOG insert
                    if (s_algorithmInfo.algorithm.ARG_NM != 'Ensemble'){

                        let s_dpModelLogData = this.getDpModelLogData(s_algorithmInfo, s_modelId, s_modelIdx,p_modelResult);
                        await s_metaDb.insert('DP_MODEL_LOG', s_dpModelLogData, true, pT);
                    }
                    let s_modelType = s_DP_MODEL_MSTR['MODEL_EVAL_TYPE'];
                    let s_uuid = s_DP_MODEL_MSTR['MODEL_EVAL_RESULT'];
                    let s_argInfo = {
                        "name":s_algorithmInfo.algorithm.ARG_FILE_NAME,
                        "param":JSON.parse(s_DP_MODEL_MSTR['MODEL_ARG_PARAM']),
                        "option":JSON.parse(s_DP_MODEL_MSTR['MODEL_PART_OPTION']),
                        "scaleType": s_DP_MODEL_MSTR['MODEL_FEATURE_TYPE'], 
                        "layerModelYn": "None"
                    };
                    // let s_wpScript = new WpAnalyticScript(s_argInfo,s_uuid,s_modelType,JSON.stringify(sDpVarMstrData),'');
                    
                    // let s_code = s_wpScript.setFileInfo(JSON.stringify(s_fileInfo));
                    // console.log(s_code);

                    // let s_wpSm = new WiseStorageManager(p_userInfo,global.WiseStorage);

                    // let s_filePath = `/${p_userInfo.USER_NO}/workflow`
                    // let s_filename = s_filePath + `/${s_modelId}.py`
                    // await s_wpSm.onMakeDir(s_filePath,'755',true);
                    // await s_wpSm.onWriteFile(s_filename, s_code,'buffer');
                } catch (p_error) {
                    pT.rollback();
                    throw new WpError({ httpCode: WpHttpCode.ANALYTIC_MODEL_ERR, message: p_error });
                }
            }).then(p_result=>{
                resolve({isSuccess:true,result:{modelId: s_modelId, modelIdx: s_modelIdx}});
            }).catch(p_error=>{
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });  
        });
    }

    getModelList(p_user?: any, p_data?:any, p_data1?:any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            
            let s_where:any = {
                DEL_YN:'N'
            }
            let s_query = `
            SELECT A.*, B.USER_ID, C.ARG_NM,
            CASE WHEN A.REG_USER_NO =${p_user.USER_NO} THEN '소유' 
            ELSE '공유' END AS AUTHORITY,
            CASE WHEN A.DEPLOY_URL IS NULL THEN '' 
            ELSE '배포 중' END AS DEPLOY_STATUS
            FROM DP_MODEL_MSTR A 
            LEFT OUTER JOIN (SELECT * FROM DP_AUTH_USER_MSTR WHERE SHARE_TYPE='model' AND OWNER_USER_NO != ${p_user.USER_NO}) B
            ON A.MODEL_ID = B.DATA_ID
            INNER JOIN DP_USER_MSTR B ON A.REG_USER_NO = B.USER_NO 
            LEFT OUTER JOIN DP_ARG_MSTR C ON A.ARG_ID = C.ARG_ID
            WHERE (A.REG_USER_NO=${p_user.USER_NO} OR B.SHARER_USER_NO=${p_user.USER_NO}) AND A.DEL_YN = 'N' 
            ORDER BY A.REG_DATE DESC
            `;
            // if(p_user.USER_MODE !='ADMIN') {
            //     s_query += ` AND A.REG_USER_NO=${p_user.USER_NO}`
            // }
            
            s_metaDb.query(s_query, 'DP_MODEL_MSTR').then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });

    }


    getModelHistory(p_modelId: any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            
            let s_query = `
                SELECT 
                B.MODEL_NM,
                name AS MODEL_ID, 
                version AS MODEL_IDX, 
                B.CUSTOM_YN,
                FROM_UNIXTIME(LEFT(creation_time,10)) AS REG_DATE
                FROM
                mlflow.model_versions A
                INNER JOIN DP_MODEL_MSTR B
                ON A.name = B.MODEL_ID
                WHERE
                NAME = ${p_modelId}
                AND status = 'READY'
                ORDER BY MODEL_IDX DESC
            `;

            
            s_metaDb.query(s_query, 'DP_MODEL_MSTR').then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });

    }

    getCustomModelList(p_user: any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_metaDb = global.WiseMetaDB;
            

            let s_query = `
            SELECT A.*, B.USER_ID, C.MODEL_IDX, C.CUSTOM_YN, C.DEPLOY_URL FROM DP_MODEL_CUSTOM_MSTR A
            INNER JOIN DP_USER_MSTR B ON A.REG_USER_NO = B.USER_NO
            INNER JOIN (SELECT * FROM DP_MODEL_MSTR WHERE CUSTOM_YN='Y' AND DEL_YN='N') C ON A.MODEL_ID = C.MODEL_ID
            WHERE A.REG_USER_NO=${p_user.USER_NO} AND A.DEL_YN='N'
            ORDER BY A.REG_DATE DESC
            `;
            // if(p_user.USER_MODE !='ADMIN') {
            //     s_query += ` AND A.REG_USER_NO=${p_user.USER_NO}`
            // }
            
            s_metaDb.query(s_query, 'DP_MODEL_CUSTOM_MSTR').then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });

    }

    addCustomModel(p_user: any, p_data: any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let today = moment().format('YYYY-MM-DD HH:mm:ss');
            let s_metaDb = global.WiseMetaDB;
            
            delete p_data.MODEL_FILE_INFO;
            p_data['REG_USER_NO'] = p_user.USER_NO;
            p_data['REG_DATE'] = today;
            
            // let sReVal = await this.o_client.insert('DP_GRP_MSTR', p_data, false);
            s_metaDb.insert('DP_MODEL_CUSTOM_MSTR',p_data, false ).then((p_result) => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });

    }

    updateCustomModel(p_user: any, p_data: any, p_cond:any) {
        return new Promise<WiseReturn>((resolve, reject) => {
            let today = moment().format('YYYY-MM-DD HH:mm:ss');
            let s_metaDb = global.WiseMetaDB;
 
            
            // let sReVal = await this.o_client.insert('DP_GRP_MSTR', p_data, false);
            s_metaDb.update('DP_MODEL_CUSTOM_MSTR', p_data, p_cond).then((p_result: any) => {
                resolve({isSuccess:true,result:p_result});
            }).catch((p_error) => {
                reject(new WpError({httpCode:WpHttpCode.ANALYTIC_MODEL_ERR,message:p_error}));
            });
        });

    }
}