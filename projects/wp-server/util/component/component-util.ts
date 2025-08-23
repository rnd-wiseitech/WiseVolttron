import { WpTrainModelData } from "./analytic/wp-train-model";
import { WpDataSourceData, WpODataSourceData } from "./data/wp-datasource";
import {COM_DATASOURCE_ATT, COM_ODATASOURCE_ATT, COM_ANALYTIC_ATT, WiseComType} from "../../wp-type/WP_COM_ATT";
import { getCOM_ID } from '../../../wp-lib/src/lib/wp-meta/com-id';


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
