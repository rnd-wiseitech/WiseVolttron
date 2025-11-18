import { COM_ENSEMBLE_MODEL_ATT, COM_FILTER_MODEL_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * 앙상블 모델 컴포넌트
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpEnsembleModelData extends WpComponentProperty {
    constructor(p_data: COM_ENSEMBLE_MODEL_ATT) {
        super('/job', p_data, 'model-train', 'train');
    }
    getColumnInfo(pSchema: any): any[] {
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
    }

    getBodyData(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_workflowId = p_data['workflowId'];
        let s_modelName = this.o_data.modelName != '' ? this.o_data.modelName : `${this.o_data.argName}_${s_workflowId}`;

        let s_filename = `ensemble_temp_${p_jobId}`;

        // let s_partitionType = this.o_data.partitionType == '학습-평가 데이터 분할' ? 't-holdout' : 't-cv';
        let s_partitionType = 't-holdout';
        if(this.o_data.partitionType == '교차 검증 (LOOCV)') {
            s_partitionType = 't-loocv';
        } else if(this.o_data.partitionType == '교차 검증 (K-Fold)') {
            s_partitionType = 't-cv';
        }
        let s_targetColumn = this.o_data.target_column.replace(/[-=+,#/\?:^$.@*\"※~&%ㆍ!』\\‘|\(\)\[\]\<\>`\'…》 \t\n\r\f\v]/g);

        let sDatasetInfo = {
            uploadType: "API",
            fileType: "SPARK_VIEW",
            fileName: `${s_filename}_${p_groupId.slice(8, 12)}.parquet`,
            reload: true,
            path: `/user/${p_userInfo.USER_NO}/wiseprophet/temp/${s_filename}_${p_groupId.slice(8, 12)}.parquet`,
            usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
            groupId: p_groupId,
            jobId: p_jobId,
            comId: this.o_data.comId,
            workflowId: s_workflowId,
            USER_ID: p_userInfo.USER_ID,
            USER_NO: p_userInfo.USER_NO,
            dsId: 0
        };

        if (this.hasOwnProperty('filter_data')) {
            sDatasetInfo['usetable'] = `${sDatasetInfo['usetable']}_${this.o_data.filter_data[0].split('_')[0]}`;
        }

        let s_tmpModel:any;
        if (this.o_data.modelType == 'Classification'){
            s_tmpModel = {
                "argId": -2,
                "argType": "Classification",
                "argNm": "Ensemble",
                "argFunc": "ensemble"
            };
        }

        if (this.o_data.modelType == 'Regression') {
            s_tmpModel = {
                "argId":-1,
                "argType":"Regression",
                "argNm":"Ensemble",
                "argFunc":"ensemble"
            };
        }
        s_tmpModel['ARG_ID'] = s_tmpModel['argId'];
        s_tmpModel['ARG_TYPE'] = s_tmpModel['argType'];
        s_tmpModel['ARG_NM'] = s_tmpModel['argNm'];
        s_tmpModel['ARG_FILE_NAME'] = s_tmpModel['argFunc'];

        let o_model: any = {
            uuid: '',
            savedYn: true,
            labelInfos: {
                uuid: '',
                name: '',
                fileType: '',
            },
            algorithmInfo: {
                parameter: this.o_data.parameter,
                optimizer: this.o_data.optimizer,
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
            ensembleModel: this.o_data.parameter,
            ensemble: true, // 앙상블 모델
            wkModelFlag: true,
            wkModelSaveFlag: this.o_data.modelSave,
            predictProba : this.o_data.predictProba
        };

        if (this.o_data.modelType == 'Classification') {
            o_model.targetType = 'categorical';
        }
        if (this.o_data.modelType == 'Regression' ) {
            o_model.targetType = 'numerical';
        }


        let s_result = {
            fileName: JSON.stringify(sDatasetInfo),
            parameter: JSON.stringify(o_model),
            analysisColInfo: JSON.parse(this.o_data.analysisColInfo),
            wkModelFlag: 'true',
            wkModelSaveFlag: String(this.o_data.modelSave),
            wkPredictSaveFlag: String('true'),
            callType: 'workflow',
            // 배치 결과 저장할때는 이것들이 있어야 모델 save 과정 할 수 있음.
            modelname: s_modelName,
            workflowId: s_workflowId,
            modelId: p_data['modelId'],
            usetable: sDatasetInfo['usetable']
        };

        return s_result;
    }
    
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_data = this.getBodyData(p_userInfo, p_groupId, p_jobId, p_parentId, p_data);
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: s_data
        };

        return sParam;
    }
}