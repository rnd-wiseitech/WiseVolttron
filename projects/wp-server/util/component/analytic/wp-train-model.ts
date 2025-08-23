import { COM_ANALYTIC_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * AI 서버에 전달될 데이터를 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpTrainModelData extends WpComponentProperty {
    constructor(p_data:COM_ANALYTIC_ATT){
        super('/job', p_data, 'model-train', 'train');
    }
    getColumnInfo(pSchema:any){
        if (this.o_data.predictProba){
            let sDerivedSchema:any = []
            let sDerviedProbaData = pSchema.filter((pColumn:any) => { return pColumn.name === this.o_data.target_column})[0]
            for (let pDerivedProba of sDerviedProbaData.metadata.probaColumn){
                sDerivedSchema.push({
                    "name": pDerivedProba,
                    "type" : "float",
                    "nullable" : true,
                    "metadata":{}
                });
            }
            pSchema = pSchema.concat(sDerivedSchema)
        }
        return pSchema;
        // let sDerivedSchema = [];
        // let sTmpColName = '';
        // if (["K-means","DBSCAN","Gaussian Mixture","K-Medoids"].includes(this.o_data.modelName)) {
        //     sTmpColName = 'predict_cluster';
        // } else {
        //     let sTargetColumn = this.o_data.target_column;
        //     if (sTargetColumn !== ''){
        //         sTmpColName = `predict_${sTargetColumn}`;
        //     }
        // }
        // // #203 직전 연결까지 실행한 결과 있을 때는 실행한 view의 컬럼 정보 이용
        // let tmpSchema = this.o_data.usetable_info.schema.length==0 ? pSchema : this.o_data.usetable_info.schema
        // if (this.o_data.predictSave && sTmpColName !== '') {
        //     sDerivedSchema = [
        //         {"name" : sTmpColName, //클러스터링 모델 종류는 predict_cluster, 나머지는 predict_y => predict_[타겟컬럼명] 으로 변경
        //         "type" : this.o_data.modelType == 'Regression'? 'double':"string",
        //         "nullable" : true,
        //         "metadata":{}}
        //     ];
        //     let sDupCnt = 0; // sTmpColName를 포함한 컬럼명 있을 때.
        //     // #203 입력하려는 컬럼명과 중복된 컬럼명이 있을경우 _2, _3, .. 으로 수정해서 추가.
        //     let sTmpList = pSchema.filter((sCol: any) => sCol.name.includes(sTmpColName));
        //     sDupCnt = sTmpList.length;
        //     if (sDupCnt > 0)
        //         sDerivedSchema[0]['name'] = sTmpColName + '_' + String(sDupCnt+1);
        //     return tmpSchema.concat(sDerivedSchema);
        // } else {
        //     return tmpSchema;
        // }
    }

    hasEmptyValue(){
        let sFlag = false;
        // let sParamNmList = JSON.parse(this.parameter)['params'].PARAM_NM_LIST;
        // let sParamValueList = JSON.parse(this.parameter)['params'].PARAM_VALUE_LIST;
        let s_parameter =  this.o_data.parameter;
        for(let param of s_parameter) {
            // 값이 0 이어도 빈 문자열 ""에 해당됨, 그래서 파라미터 값을 0으로 설정해도 param.value == "" 인 조건에 걸려서 설정 안했다고 오류 뜨니 주의!!
            if(param.value == "" && param.value != 0) {
                sFlag = true;
            }
        }
        if(this.o_data.optimizer == true) {
            if(this.o_data.optimizerType == '') {
                sFlag = true;
            }
        }
        // if (this.o_data.argName != 'USER_MODEL') {
        //     if (this.o_data.optimizer) { // 최적화 일때는 범위 내 빈 값이 있는지
        //         for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
        //             let sParam = this.o_data[`param_${sIndex + 1}`];
        //             if (sParam.option.includes("")) {
        //                 sFlag = true;
        //             }
        //             // [TODO] 범위 검증
        //             // if (!isNaN(Number(sParamOption[0]))){
        //             //     if (Number(sParamOption[0]) > Number(sParamOption[1])) {
        //             //     sMsg += `${sCom.type} 컴포넌트 ${sParamNmList[sIndex]} 값은 min값이 max값보다 작아야합니다.
        //             //     `;
        //             //     }
        //             // }
        //         }
        //     }
        //     else { // 최적화 아닐 때에는 빈 값이 있는지
        //         for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
        //             let sParam = this.o_data[`param_${sIndex + 1}`];
        //             if (super.isEmpty(sParam.value)) {
        //                 sFlag = true;
        //             }
        //         }
        //     }
        // }
        // 공통 빈값 체크(분할, 표준화 값)
        let sChkParamList =  this.o_data.modelType == "Clustering"? ["scaleInfo"] : ["partitionType", "partitionValue" , "scaleInfo", "target_column"]
        for (let sParamName of sChkParamList){
            if (super.isEmpty( this.o_data[sParamName])){
                sFlag = true;
            }
        }
        if (this.o_data.modelSave){
            if (this.o_data.saveOpt == 'new' && super.isEmpty(this.o_data.new_modelname)){
                sFlag = true;
            }
            if (this.o_data.saveOpt == 'overwrite' && super.isEmpty(this.o_data.overwrite_modelname)){
                sFlag = true;
            }
        } 
        
        return sFlag;
    }
    /** 
     * wp-data로 프로핏에 요청할 형태로 변경함 (기존에 ui단에서 있었는데 분석컴포넌트클래스 내부로 이동.)
     */
    // getModelParmasByWpData() {
    //     let { modelInfo, partitionType, partitionValue, scaleInfo, target_column, modelName, optimizer } = this.o_data;
    //     // 파라미터 할당 
    //     let modelCallParams:any = {
    //         model: {
    //             ARG_NM: "",
    //             ARG_ID: "",
    //             ARG_TYPE: ""
    //         },
    //         params: {
    //             PARAM_NM_LIST: [],
    //             PARAM_VALUE_LIST: []
    //         },
    //         partitionType: "",
    //         partitionValue: "",
    //         scaleInfo: "",
    //         // analysisColInfo: "",
    //         target_column: "",
    //         optimizer: false
    //     };
    //     if (modelInfo) {
    //         if (Object.keys(modelInfo).length !== 0) {
    //             // 모델 파라미터를 할당
    //             let sParamSize = modelInfo.params.length;
    //             let sParamNameList = [];
    //             let sParamValueList = [];
    //             if (this.o_data.modelName !== 'USER_MODEL') {
    //                 for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
    //                     let sParamName = 'param_' + (sIndex + 1); //param_1 부터 시작.
    //                     modelInfo.params[sIndex].PARAM_VALUE.VALUE =  this.o_data[sParamName];
    //                     sParamNameList.push(modelInfo.params[sIndex].PARAM_NM); // 파라미터 명 list
    //                     // 파라미터 값 list
    //                     if (optimizer) { // 최적화일때
    //                         sParamValueList.push( this.o_data[sParamName]['option']);
    //                     } else {
    //                         sParamValueList.push( this.o_data[sParamName]['value']);
    //                     }
    //                 }
    //             }
    //             // 모델파라미터명
    //             modelCallParams.model = { ARG_NM: modelName, ARG_ID: modelInfo.model.ARG_ID, ARG_TYPE: modelInfo.model.ARG_TYPE, USER_MODEL_YN: modelInfo.model.USER_MODEL_YN };
    //             modelCallParams.params = { PARAM_NM_LIST: sParamNameList, PARAM_VALUE_LIST: sParamValueList };
    //             let sPartitionType = partitionType == '학습-평가 데이터 분할' ? 't-holdout' : 't-cv';
    //             let sTargetColumn = target_column == "[미선택]" ? "" : target_column;
    //             modelCallParams = { ...modelCallParams, optimizer, partitionType: sPartitionType, partitionValue, scaleInfo, target_column: sTargetColumn };
    //         }
    //     }
    //     return modelCallParams;
    // }
    
    getBodyData(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_workflowId = p_data['workflowId']
        let s_modelName = this.o_data.modelName != '' ? this.o_data.modelName : `${this.o_data.argName}_${s_workflowId}`;

        let s_filename = `${this.o_data.modelName.replace(" ", "")}`
        
        // 모델 파라미터를 할당
        let sParamSize = this.o_data.modelInfo.params.length;
        if (this.o_data.argName !== 'USER_MODEL' || this.o_data.modelInfo.model.BLOCK_YN=='N') {
            for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
                let sParamName = 'param_' + (sIndex + 1); //param_1 부터 시작.

                // 프로핏 사용자 모델은 PARAM_DEFAULT, PARAM_VALUE가 JSON string 처리 되어있어서 추가.
                let s_paramValue
                let s_paramDefault
                try {
                    s_paramValue = JSON.parse(this.o_data.modelInfo.params[sIndex].PARAM_VALUE);
                    s_paramDefault = JSON.parse(this.o_data.modelInfo.params[sIndex].PARAM_DEFAULT);
                } catch (error) {
                    s_paramValue = this.o_data.modelInfo.params[sIndex].PARAM_VALUE;
                    s_paramDefault = this.o_data.modelInfo.params[sIndex].PARAM_DEFAULT;
                } 
                s_paramValue.VALUE = this.o_data[sParamName]['value'];
                s_paramValue.OPTION = this.o_data[sParamName]['option'];

                this.o_data.modelInfo.params[sIndex].PARAM_VALUE = s_paramValue;
                this.o_data.modelInfo.params[sIndex].PARAM_DEFAULT = s_paramDefault;
            }
        }
        let s_partitionType = 't-holdout';
        if(this.o_data.partitionType == '교차 검증 (LOOCV)') {
            s_partitionType = 't-loocv';
        } else if(this.o_data.partitionType == '교차 검증 (K-Fold)') {
            s_partitionType = 't-cv';
        }

        let s_targetColumn = this.o_data.target_column == "[미선택]" ? "" : this.o_data.target_column;

        s_targetColumn = s_targetColumn.replace(/[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》 \t\n\r\f\v]/g);

        let sDatasetInfo = {
            uploadType: "API",
            fileType: "SPARK_VIEW",
            // fileName: `${s_filename}_${p_groupId.slice(8, 12)}.parquet`
            fileName: `${s_workflowId}_${p_jobId}.parquet`,
            reload: true,
            // path: `/user/${p_userInfo.USER_NO}/wiseprophet/temp/${s_filename}_${p_groupId.slice(8, 12)}.parquet`,
            path: `/user/${p_userInfo.USER_NO}/wiseprophet/temp/${s_workflowId}_${p_jobId}.parquet`,
            usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
            groupId: p_groupId,
            jobId: p_jobId,
            comId: this.o_data.comId,
            workflowId: s_workflowId,
            USER_ID: p_userInfo.USER_ID,
            USER_NO: p_userInfo.USER_NO,
            dsId: 0
        }

        if (this.hasOwnProperty('filter_data')) {
            sDatasetInfo['usetable'] = `${sDatasetInfo['usetable']}_${this.o_data.filter_data[0].split('_')[0]}`
        }

        //DP_ARG_MSTR_ATT
        let s_tmpModel = this.o_data.modelInfo.model;
        let s_userModelYn = s_tmpModel.USER_MODEL_YN ? s_tmpModel.USER_MODEL_YN : 'N';
        let s_layerModelYn = s_tmpModel.LAYER_YN ? s_tmpModel.LAYER_YN : 'N';
        let s_blockModelYn = s_tmpModel.BLOCK_YN ? s_tmpModel.BLOCK_YN : 'N';
        Object.assign(s_tmpModel, { argId: s_tmpModel.ARG_ID, argType: s_tmpModel.ARG_TYPE, argNm: s_tmpModel.ARG_NM, argFunc: s_tmpModel.ARG_FILE_NAME, userModelYn: s_userModelYn, layerModelYn: s_layerModelYn, blockModelYn: s_blockModelYn})

        //DP_ARG_PARAM
        let s_tmpModelParams = this.o_data.modelInfo.params;

        let o_model:any = {
            uuid: '',
            savedYn: true,
            labelInfos: {
                uuid: '',
                name: '',
                fileType: '',
            },
            algorithmInfo: {
                parameter: s_tmpModelParams,
                optimizer: this.o_data.optimizer,
                optimizerType: this.o_data.optimizerType,
                smote: false,
                imbalance: false,
                algorithm: s_tmpModel
            },
            dateColYn: false,
            analyticType: '',
            modelModified: false,
            targetCol: s_targetColumn,
            targetType: "",
            partitionInfo: {
                type: s_partitionType,
                value: 0,
                option: this.o_data.partitionValue
            },
            featureInfo: {
                featureList: [],
                labelData: {
                    label: {},
                    labelVal: {}
                },
                featureDataSummury: [],
            },
            saveModelName: "",
            pythonUniqueId: "",
            importData: {
                dataType: sDatasetInfo.fileType,
                dataId: "",
                dataRefId: sDatasetInfo.dsId,
                dataSetName: sDatasetInfo.fileName,
                dataFileName: sDatasetInfo.fileName,
                orgDataFileName: sDatasetInfo.fileName,
                dsMstrInfo: {},
                scaleFileName: '',
                reload: false
            },
            scaleInfo: this.o_data.scaleInfo,
            ensemble: false,
            wkModelFlag: true,
            wkModelSaveFlag: this.o_data.modelSave,
            predictProba : this.o_data.predictProba
        };

        if (s_tmpModel.ARG_NM == 'LSTM')
            o_model.recurrentModel = true;

        if (s_tmpModel.ARG_TYPE == 'Classification' || s_tmpModel.ARG_TYPE =='Reinforcement') {
            o_model.targetType = 'categorical'
        }
        else if (s_tmpModel.ARG_TYPE == 'Regression' || s_tmpModel.ARG_TYPE == 'Timeseries') {
            o_model.targetType = 'numerical'
        }
        else {
            o_model.targetType = '';
        }

        let s_result = {
            fileName: JSON.stringify(sDatasetInfo),
            parameter: JSON.stringify(o_model),
            analysisColInfo: JSON.parse(this.o_data.analysisColInfo),
            wkModelFlag: 'true',
            wkModelSaveFlag: String(this.o_data.modelSave),
            wkPredictSaveFlag: String(this.o_data.predictSave),
            callType: 'workflow',
            // 배치 결과 저장할때는 이것들이 있어야 모델 save 과정 할 수 있음.
            modelname: s_modelName,
            workflowId: s_workflowId,
            modelId: p_data['modelId'],
            usetable: sDatasetInfo['usetable']
        }

        return s_result
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        
        let s_optimizer = {use: this.o_data.optimizer, type:(this.o_data.optimizer==false)?"":this.o_data.optimizerType};
        let s_partitionType = 't-holdout';
        if(this.o_data.partitionType == '교차 검증 (LOOCV)') {
            s_partitionType = 't-loocv';
        } else if(this.o_data.partitionType == '교차 검증 (K-Fold)') {
            s_partitionType = 't-cv';
        }
        let s_usetable = p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0];
        if (p_data.filter) {
            s_usetable = s_usetable + '_' + p_data.filter[0].split("_")[0];
        }
        let s_modelname = ""
        if(this.o_data.modelSave == true) {
            if(this.o_data.saveOpt =='new') {
                s_modelname = this.o_data.new_modelname;
            } else {
                s_modelname = this.o_data.overwrite_modelname;
            }
        }
        // let s_data = this.getBodyData(p_userInfo, p_groupId, p_jobId, p_parentId, p_data) 
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                modelname: s_modelname,
                parameter: this.o_data.parameter,
                optimizer: s_optimizer,
                scaler: this.o_data.scaleInfo,
                modelInfo: this.o_data.modelInfo.model,
                targetCol: this.o_data.target_column,
                partition: {type: s_partitionType, value: this.o_data.partitionValue},
                use_schema: this.o_data.chkSchema,
                usetable: s_usetable,
                comId: this.o_data.comId
            },
            workflowId: p_data['workflowId']
        };

        return sParam;
    }
}