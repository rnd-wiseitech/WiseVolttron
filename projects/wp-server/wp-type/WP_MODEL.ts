import { DP_ARG_MSTR_ATT } from "../metadb/model/DP_ARG_MSTR";
import { DP_ARG_PARAM_ATT } from "../metadb/model/DP_ARG_PARAM";
import { DP_MODEL_MSTR_ATT } from "../metadb/model/DP_MODEL_MSTR";
import { DP_VAR_MSTR_ATT } from "../metadb/model/DP_VAR_MSTR";

export interface WP_OBJ_LABEL_INFO {
    labelNm:string;
    id:number ;
    orgHeight: number;
    orgWidth: number;
    height: number;
    width: number;
    x: number;
    y: number;
}
export interface WP_TEXT_LABEL_INFO {
    labelNm:string;
    id:number ;
    color: string;
    text: string;
};

export interface WP_LABEL_FILE_INFO {
    NAME:string;
    LABEL_NAME:string | Array<WP_OBJ_LABEL_INFO> | Array<WP_TEXT_LABEL_INFO>;
    CHECK_INDEX: string | Array<number>;
    REAL_TEXT?:string;
};

export interface WP_LABEL_INFO {
    uuid:string;
    name:string | Array<string>;
    fileType: string;
    importFileNm?: string;
    infos?: Array<WP_LABEL_FILE_INFO> ;
    videoMode?: boolean;
    bertUse?: boolean;
    dictionary?: object;
};

export interface WP_UN_PRE_AUGMENT {
    embedding_input: number,
    max_len: number,
    nb_class: number,
    rotate:number,
    displaceX:number,  // 현재 사용안함
    displaceY:number,  // 현재 사용안함
    shear:number,
    magnify:number,
    minify:number,
    flip:boolean,  // vertical
    flop:boolean,  // horizontal
    resizeX:number,
    resizeY:number,
    use:boolean
};


export interface WP_VAR_INFO {
    NAME: string,
    TYPE: string,
    MIN: number,
    MAX:number,
    Q1:number,
    Q3:number,
    UNIQUE_VALUE:number,
    DUPLICATE:number,
    MISSING:number,
    MEAN:number,
    STDDEV:number,
    SUMMURY:object,
    BOXPLOTDATA:WP_BOXPLOT,
    FORMAT:string,
    CHANG:boolean,
    TARGET:boolean,
    CLEANDATA:WP_CLEAN,
    TOTAL_COUNT:number,
    USE:boolean
};
export interface WP_BOXPLOT {
    boxdata:Array<number>,
    outlier:Array<any>,
    outliers_index:Array<any>,
};
export interface WP_CLEAN {
    duplication:{
        value: string,
        delete: boolean,
        use: boolean
    },
    missing:{
        value: string,
        delete: boolean,
        use: boolean
    },
    outlier:{
        value: string,
        delete: boolean,
        use: boolean
    },
}

export interface WP_ALGORITHM{
    algorithm:DP_ARG_MSTR_ATT,
    parameter:Array<DP_ARG_PARAM_ATT>,
    layerInfos?:Array<any>,
    argResult?:string,
    optimizer: boolean,      
    smote: boolean,
    imbalance: boolean
}
export interface WP_FEATURE_INFO{
    featureList: Array<WP_FEATURE>,
    labelData: {
        label: {},
        labelVal: {}
    },
    featureDataSummury:Array<any>
}

export interface WP_FEATURE{
    ID: number,
    IMPORTANCE: number,
    FEATURE: string,
    USE: boolean
}

export interface WP_PARTITION{
    type: string,
    value: number,
    option: number | WP_TIME_PARTITION 
}
export interface WP_TIME_PARTITION{
    name:string,
    start:Date,
    end:Date,
    range:Date,
    window_Size:number
}

export interface WP_IMPORT_DATA{
    
    dataType:string,
    dataId:string,
    dataRefId:string,
    dataSetName:string,
    dataFileName: Array<any>,
    scaleFileName:string,
    orgDataFileName:string,
    dsMstrInfo?: object,
    reload: false,
    labelCol?:string,
    textCol?:string,
    lang?:string,
    objectInfo?:string,
    label_data?: Array<any>,
    label_data_ex?: Array<any>,
    dbType?:string,
    path?:string,
    dbName?:string        
}
export interface WP_REINFOCE_DATA{
    
    actionData:Array<any>,
    reward:string
        
}

export interface WP_MODEL_INFO{
    modelMstr:DP_MODEL_MSTR_ATT,
    varInfo:Array<DP_VAR_MSTR_ATT>,
    featureInfo:Array<WP_FEATURE_INFO>,
    algorithmInfo?: WP_ALGORITHM,
    wkModelFlag:boolean,
    wkModelSaveFlag:boolean,
}


export interface WP_MODEL {
    MODEL_ID?:number,
    MODEL_IDX?:number,
    labelInfos?: WP_LABEL_INFO ,
    dateColYn?: boolean,
    uuid: string,
    savedYn: boolean,
    unPreAugmentInfo?: WP_UN_PRE_AUGMENT,
    analyticType: string,
    modelModified: boolean,
    targetCol: string,
    targetType: string,
    varInfo?: Array<WP_VAR_INFO>,
    algorithmInfo?: WP_ALGORITHM,
    featureInfo?: WP_FEATURE_INFO,
    partitionInfo: WP_PARTITION,
    saveModelName?: string,
    pythonUniqueId: string,
    importData: WP_IMPORT_DATA,
    scaleInfo?: string,

    // #50. 20210629
    deepLearn?: boolean,
    // #50. 20210705 lstm 여부
    // #180 rnn과 공용사용위해 이름 변경
    recurrentModel?: boolean,

    // #50. 20210705
    // lstm 가능한 partion 범위 저장
    dateRange?: object,

    
    // #204 앙상블 파라미터.
    ensembleModel?:Array<any>,

    // #20 앙상블 모델 수정할때 선택한 모델 제대로 불러오도록
    ensemble? : boolean,

    // #211 강화학습 파라미터
    reinforcement?: boolean,
    reinforcementData?:WP_REINFOCE_DATA,

    // WP-155 모델 실행 결과
    excuteResult? : object,
    wkModelFlag:boolean,
    wkModelSaveFlag:boolean,

    modelRunType?:string,
    dbscanCluster?:any,
    userPreprocessing?:string
}