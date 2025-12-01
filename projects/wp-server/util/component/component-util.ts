import { WpTrainModelData } from "./analytic/wp-train-model";
import { WpOdbcData, WpOOdbcData } from "./data/wp-odbc";
import { WpDataSourceData, WpODataSourceData } from "./data/wp-datasource";
import { WpAnomalyData } from "./transper/wp-anomaly";
// import { WpDateData } from "./transper/wp-date";
import { WpJoinData } from "./transper/wp-join";
import { WpNameData } from "./transper/wp-name";
import { WpNullData } from "./transper/wp-null";
import { WpSelectData } from "./transper/wp-select";
import { WpSortData } from "./transper/wp-sort";
import { WpTypeData } from "./transper/wp-type";
import { WpWindowData } from "./transper/wp-window";
import { COM_ANALYTIC_ATT, COM_ANOMAL_ATT, COM_COMPARE_MODEL_ATT, COM_DATASOURCE_ATT, COM_DATE_ATT, COM_ENSEMBLE_MODEL_ATT, COM_FEATURE_IMPORTANCE_ATT, COM_FILTER_MODEL_ATT, COM_IWORKFLOW_ATT, COM_JOIN_ATT, COM_NAME_ATT, COM_NULL_ATT, COM_ODATASOURCE_ATT, COM_ODBC_ATT, COM_OODBC_ATT, COM_PREDICT_MODEL_ATT, COM_SELECT_ATT, COM_SORT_ATT, COM_STORAGE_ATT, COM_TYPE_ATT, COM_WINDOW_ATT, COM_IMAGE_ATT,COM_IMG_LABEL_ATT, COM_IMG_DATASOURCE_ATT, COM_IMG_ODATASOURCE_ATT, WiseComType } from "../../wp-type/WP_COM_ATT";
import { WpCompareModelData } from "./analytic/wp-compare-model";
import { WpFilterModelData } from "./analytic/wp-filter-model";
import { WpFeatureImporanceData } from "./analytic/wp-feature-importance";
import { WpIWorkflowData } from "./data/wp-workflow";
import { WpStorageData } from "./data/wp-storage";
import { WpEnsembleModelData } from "./analytic/wp-ensemble-model";
import { WpPredictModelData } from "./analytic/wp-predict-model";
import { getCOM_ID } from '../../../wp-lib/src/lib/wp-meta/com-id';
import { WpImgStorageData } from "./data/wp-image-stroage";
import { WpImgDataSourceData, WpImgODataSourceData} from "./data/wp-image-datasource";


export function getPropertiesData(p_type: number, p_data?:any): WiseComType {

    let COM_ID: Record<string, number> = getCOM_ID();
    let s_initData: any;

    switch (p_type) {
        case COM_ID['I-DATASOURCE']:
            if (p_data){
                return new WpDataSourceData(p_data as COM_DATASOURCE_ATT);
            }
            s_initData = {
                load: 'hdfs',
                filename: '',
                originalname: '',
                filetype: 'csv',
                fileseq: ',',
                dataUserno: 0,
                dataOpt: ""
            };
            return new WpDataSourceData(s_initData as COM_DATASOURCE_ATT);
        
        case COM_ID['I-DATABASE']:
            if (p_data) {
                return new WpOdbcData(p_data as COM_ODBC_ATT);
            }
            s_initData = {
                dbOpt: 'odbc', // 'hive', 'odbc'
                selectOpt: 'table', // table, query
                dsname: '',
                dsId: 0,
                dbtype: 'odbc',
                dbhost: '',
                dbport: '',
                dbname: '',
                tablename: '',
                dbuser: '',
                dbpassword: '',
                query: ''
            };
            return new WpOdbcData(s_initData as COM_ODBC_ATT);
        case COM_ID['I-WORKFLOW']:
            if (p_data) {
                return new WpIWorkflowData(p_data as COM_IWORKFLOW_ATT);
            }
            s_initData = {
                workflow: '',
            };
            return new WpIWorkflowData(s_initData as COM_IWORKFLOW_ATT);

        case COM_ID['I-STORAGE']:
            if (p_data) {
                return new WpStorageData(p_data as COM_STORAGE_ATT);
            }
            s_initData = {
                DEFAULT_PATH: '',
                filepath: ''
            };
            return new WpStorageData(s_initData as COM_STORAGE_ATT);

        case COM_ID['I-IMAGE-STORAGE']:
            if (p_data) {
                return new WpImgStorageData(p_data as COM_IMAGE_ATT);
            }
            s_initData = {
                filepath: '',
                filename: [],
                comId: ''
                // executeFlag: false
            };
            return new WpImgStorageData(s_initData as COM_IMAGE_ATT);

        case COM_ID['T-TYPE']:
            if (p_data) {
                return new WpTypeData(p_data as Array<COM_TYPE_ATT>);
            }
            s_initData = [{
                column : '',
                type: ''
            }];
            return new WpTypeData(s_initData as Array<COM_TYPE_ATT>);

        case COM_ID['T-SORT']:
            if (p_data) {
                return new WpSortData(p_data as Array<COM_SORT_ATT>);
            }
            s_initData = [{
                column: '',
                type: ''
            }];
            return new WpSortData(s_initData as Array<COM_SORT_ATT>);

       
        case COM_ID['T-NULL']:
            if (p_data) {
                return new WpNullData(p_data as Array<COM_NULL_ATT>);
            }
            s_initData = [{
                column: '',
                type: '',
                value: '',
                // #WPLAT-6 날짜 표현식 추가
                dateexp: ''
            }];
            return new WpNullData(s_initData as Array<COM_NULL_ATT>);

        case COM_ID['T-OUTLIER']:
            if (p_data) {
                return new WpAnomalyData(p_data as Array<COM_ANOMAL_ATT>);
            }
            s_initData = [{
                column: '',
                type: '',
                value: ''
            }];
            return new WpAnomalyData(s_initData as Array<COM_ANOMAL_ATT>);
            
       

      
        case COM_ID['T-SELECT']:
            if (p_data) {
                return new WpSelectData(p_data as COM_SELECT_ATT);
            }
            s_initData = {
                column: ''
            };
            return new WpSelectData(s_initData as COM_SELECT_ATT);

        case COM_ID['T-JOIN']:
            if (p_data) {
                return new WpJoinData(p_data as COM_JOIN_ATT);
            }
            s_initData = {
                type: '',
                usetable: '',
                joinTable: '',
                joinKey: [{
                    useColumn: '',
                    joinColumn: ''
                }],
                usetable_name: '',
                jointable_name: '',
                usetable_jobId: '',
                jointable_jobId: '',
            };
            return new WpJoinData(s_initData as COM_JOIN_ATT);
            
        case COM_ID['T-WINDOW']:
            if (p_data) {
                return new WpWindowData(p_data as COM_WINDOW_ATT);
            }
            s_initData = {
                column: '',
                indexColumn: '',
                value: '',
                date_column: ''
            };
            return new WpWindowData(s_initData as COM_WINDOW_ATT);

        case COM_ID['T-NAME']:
            if (p_data) {
                return new WpNameData(p_data as Array<COM_NAME_ATT>);
            }
            s_initData = [{
                column: '',
                value: ''
            }];
            return new WpNameData(s_initData as Array<COM_NAME_ATT>);

        case COM_ID['O-DATASOURCE']:
            if (p_data) {
                return new WpODataSourceData(p_data as COM_ODATASOURCE_ATT);
            }

            s_initData = {
                filetype: 'csv',
                filename : '',
                dataUserno: undefined,
                saveOpt: 'new',
                dataOpt: '', // #37 공유 데이터 선택 옵션 추가
                new_filename: '',
                overwrite_filename: '',
                streamInputJobList: []
            };
            return new WpODataSourceData(s_initData as COM_ODATASOURCE_ATT);
        case COM_ID['O-DATABASE']:
            if (p_data) {
                return new WpOOdbcData(p_data as COM_OODBC_ATT);
            }
            s_initData = {
                dbOpt: 'DBMS',
                mode: 'new',
                dsname: '',
                tablename: '',
                dsId: 0,
                owner:'',
                dbtype: '',
                dbhost: '',
                dbport: '',
                dbname: '',
                dbuser: '',
                dbpassword: '',
                partition: "(선택안함)",
                partitionOpt: "값 입력",
                partitionValue: "",
                query:'',
                usetable_info: {},
                popup_data: {},
                excuteFlag: false
            };
            return new WpOOdbcData(s_initData as COM_OODBC_ATT);

        case COM_ID['A-ENSEMBLE']:
            if (p_data) {
                return new WpEnsembleModelData(p_data as COM_ENSEMBLE_MODEL_ATT);
            }
            s_initData = {
                modelType: undefined,
                predictProba : false
            };
            return new WpEnsembleModelData(s_initData as COM_ENSEMBLE_MODEL_ATT);
            
        case COM_ID['A-COMPARE_MODEL']:
            if (p_data) {
                return new WpCompareModelData(p_data as COM_COMPARE_MODEL_ATT);
            }
            s_initData = {
                modelType: undefined,
                compare_model: [{
                    h_model_name: '',
                    model_name: '',
                    model_id: undefined,
                    model_idx: undefined,
                    com_uuid: '',
                }]
            };
            return new WpCompareModelData(s_initData as COM_COMPARE_MODEL_ATT);

        case COM_ID['A-FILTER_MODEL']:
            if (p_data) {
                return new WpFilterModelData(p_data as COM_FILTER_MODEL_ATT);
            }
            s_initData = {
                compare_model: [{
                    h_model_name: '',
                    model_name: '',
                    model_id: undefined,
                    model_idx: undefined,
                    com_id: '',
                }],
                filterOpt: '', // 비교 기준
                modelType: '', // 모델 유형 (Regression, Classificaition, CLustering)
                saveOpt: '최고 성능 모델 저장', // 최상 모델 저장 방법 (ovewrite-기존 모델 덮어쓰기, new-최상 모델만 저장)
                modelName: '', // 최상 모델만 저장 사용
                // overwriteModelName: '',
                // overwriteModel: { // 기존 모델 덮어쓰기시 사용
                //     h_model_name: '',
                //     model_name: '',
                //     model_id: undefined,
                //     model_idx: undefined,
                //     com_id: '',
                // }
            };
            return new WpFilterModelData(s_initData as COM_FILTER_MODEL_ATT);
        
        case COM_ID['A-PREDICT_MODEL']:
            if (p_data) {
                return new WpPredictModelData(p_data as COM_PREDICT_MODEL_ATT);
            }
            s_initData = {
                modelType: undefined,
                targetColumn: '',
                modelName: '',
                modelComId: undefined,
                modelId: undefined,
                modelIdx: undefined,
                limeData: true,
                modelOpt: '',
                customYn: 'N',
                checkRelearn: false,
                confidence: 0.3,
                threshold: 1.0,
                argId:0
            };
            return new WpPredictModelData(s_initData as COM_PREDICT_MODEL_ATT);

        case COM_ID['T-F_IMPORTANCE']:
            if (p_data) {
                return new WpFeatureImporanceData(p_data as COM_FEATURE_IMPORTANCE_ATT);
            }
            s_initData = {
                target_column: '',
                usetable_info: { usetable: undefined, schema: undefined },
                column:[],
                value: 0,
            };
            return new WpFeatureImporanceData(s_initData as COM_FEATURE_IMPORTANCE_ATT);

         case COM_ID['I-IMAGE-DATASOURCE']:
            if (p_data) {
                return new WpImgDataSourceData(p_data as COM_IMG_DATASOURCE_ATT);
            }
            s_initData = {
                load: 'hdfs',
                filename: '',
                originalname: '',
                filetype: 'image',
                fileseq: ',',
                dataUserno: 0,
                dataOpt: ""
            };
            return new WpDataSourceData(s_initData as COM_DATASOURCE_ATT);
        
        case COM_ID['O-IMAGE-DATASOURCE']:
            if (p_data) {
                return new WpImgODataSourceData(p_data as COM_IMG_ODATASOURCE_ATT);
            }
            s_initData = {
                filetype: 'image',
                filename : '',
                dataUserno: undefined,
                saveOpt: 'new',
                dataOpt: '', // #37 공유 데이터 선택 옵션 추가
                new_filename: '',
                overwrite_filename: '',
                streamInputJobList: []
            };
            return new WpImgODataSourceData(s_initData as COM_IMG_ODATASOURCE_ATT);
    
    // 나머지 케이스는 모델인 경우 (위에 컴포넌트 설정 하지 않으면 몽땅 WpTrainModelData로 되버리니 주의!!)
    default:
        if (p_data) {
            return new WpTrainModelData(p_data as COM_ANALYTIC_ATT);
        }
        s_initData = {
            target_column: '',
            scaleInfo: '',
            modelSave: false, // 프로핏 모델 저장 여부(true - DEL_YN : N, false- DEL_YN : Y)
            saveOpt: 'new',
            // predictSave: true, // 프로핏 평가데이터셋 예측값 저장 여부(true 이면 평가데이터셋 예측한 값이 predict_[타겟컬럼명] 컬럼에 생성됨.) -> 일단 default true로 함.
            optimizer: false,
            optimizerType: '',
            partitionType: '',
            partitionValue: '',
            modelName: '',
            argName: '',
            modelType: '',
            modelInfo: {},
            parameter: {},
            analysisColInfo: '',
            usetable_info: { usetable: "", schema: [], viewTable: "" },
            chkSchema: {},
            probaData : false
        };

        return new WpTrainModelData(s_initData as COM_ANALYTIC_ATT);
}
}
