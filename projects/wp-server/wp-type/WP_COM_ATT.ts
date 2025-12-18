import { WpDataSourceData, WpODataSourceData } from "../util/component/data/wp-datasource";


export enum JOB_LOCATION_ATT {
    WISEPROPHET = "wiseprophet",
    WORKFLOW = "workflow",
    SCHEDULE = "schedule",
    DATAMANAGER = "datamanager"
}

export type WkCommonData = {
    [index: string]: any;
    url: string; //호출 url
    from_point: number; //상위 연결 가능한 컴포넌트 수
    action:string;
    type:string;
};

export interface WpComSchema {
    metadata: {};
    name: string;
    nullable: boolean;
    type: string;
}
export interface WpComData {
    id: string;
    name: string;
    type: number;
    text?:string;
    filter?: string[];
    data?: string[];
    parentId?: string[];
    schema?: WpComSchema[];
    jobId?: string;
    'wp-data'?: WiseComType;
    // 로드한 워크플로우일경우
    wf_regUserno?: number;
}

export interface COM_OODBC_ATT extends WkCommonData {
    dbtype: string;
    dbhost: string;
    dbport: number;
    dbname: string;
    tablename: string;
    mode: 'new' | 'append' | 'overwrite' | 'query' | '';
    transform_value: string;
    /** workflow ui param */
    partition: string;
    /** workflow ui param */
    partitionOpt: string;
    /** workflow ui param */
    partitionValue: string;
     /** workflow query param */
    query: string;
     /** workflow update pop-up param */
    usetable_info: { usetable: string, schema: { [index: string]: any; }}
    /** workflow update pop-up param */ 
    popup_data: {
        schema: WpComSchema[],
        outputschema : WpComSchema[],
        code: string,
        usetable: string,
        result: { [index: string]: any; },
        jobId: string;
    }
    /* 오라클이나 postgreSQL */
    owner: string;
    /** workflow ui param */
    dbOpt: 'DBMS' | 'HIVE' | '';
    /** workflow ui param */
    dsId?: number;
    /** workflow ui param */
    dsname?: string;
    /** workflow update pop-up param */ 
    excuteFlag?: boolean;
}

export interface COM_ODBC_ATT extends WkCommonData {
    dbtype: string;
    dbhost: string;
    dbport: number;
    dbname: string;
    tablename: string;
    dbuser: string;
    dbpassword: string;
    query: string;
    /** workflow ui param */
    dbOpt?: 'odbc' | 'hive';
    /** workflow ui param */
    selectOpt?: string;
    /** workflow ui param */
    dsId?: number;
    /** workflow ui param */
    dsname?: string;
}

// 워크플로우 입력 데이터
export interface COM_IWORKFLOW_ATT extends WkCommonData {
    workflowId: string;
    filepath: string;
    workflow: string;
}

export interface COM_STORAGE_ATT extends WkCommonData {
    filename: string;
    DEFAULT_PATH: string;
    filepath: string;
    usetable_info?: { usetable: string, schema: { [index: string]: any; }; },
}

export interface COM_DATASOURCE_ATT extends WkCommonData {
    load: string;
    filename: string;
    filetype: string;
    fileseq: string;
    dataUserno: number;
    /** workflow ui param */
    originalname: string;
    /** workflow ui param */
    dataOpt?: string;
}
export interface COM_ODATASOURCE_ATT extends WkCommonData {
    filetype: string;
    filename: string;
    dataUserno: string;
    /** workflow ui param */
    saveOpt: string;
    /** workflow ui param */
    dataOpt: string;
    /** workflow ui param */
    new_filename: string;
    /** workflow ui param */
    overwrite_filename: string;
    streamInputJobList: string[]
}
export interface COM_API_ATT extends WkCommonData {
    apiType : string;
    apiUrl: string;
    parameter?: [{name : string, value : string}];
}

export interface COM_WINDOW_ATT extends WkCommonData {
    column: string;
    indexColumn: string;
    value: string;
    /** workflow ui param */
    date_column: string;
}
export interface COM_TYPE_ATT extends WkCommonData {
    column: string;
    type: string;
}

export interface COM_SPLIT_ATT extends WkCommonData {
    column: string;
    type: string;
    value: string;
}
export interface COM_SORT_ATT extends WkCommonData {
    column: string;
    type: string;
}
export interface COM_SLICE_ATT extends WkCommonData {
    column: string;
    type: string;
    value: string;
}
export interface COM_SAMPLE_ATT extends WkCommonData {
    value: string;
}
export interface COM_NULL_ATT extends WkCommonData {
    column: string;
    value: string;
    type: string;
    /** workflow ui param */
    dateexp: string;
    replaceType: string;
}
export interface COM_MERGE_ATT extends WkCommonData {
    usetable: string;
    mergeTable: string;
    /** workflow ui param */
    usetable_name: string;
    /** workflow ui param */
    mergetable_name: string;
    /** workflow ui param */
    usetable_jobId: string;
    /** workflow ui param */
    mergetable_jobId: string;
}
export interface COM_MATH_ATT extends WkCommonData {
    derivedColumn: string;
    value: string;
    /** workflow ui param */
    derivedOption: string;
    /** workflow ui param */
    targetColumn: string;
}
export interface COM_JOIN_ATT extends WkCommonData {
    type: string;
    usetable: string;
    joinTable: string;
    joinKey: Array<{
        useColumn: string;
        joinColumn: string;
    }>;
    /** workflow ui param */
    usetable_name: string;
    /** workflow ui param */
    jointable_name: string;
    /** workflow ui param */
    usetable_jobId: string;
    /** workflow ui param */
    jointable_jobId: string;
}
export interface COM_GROUP_ATT extends WkCommonData {
    column: string;
    derivedColumn: string;
    groupby: Array<{
        minRange: string;
        maxRange: string;
        value: string;
    }>;
}
export interface COM_DERV_COND_ATT extends WkCommonData {
    derivedColumnArray: Array<{
        [index: string]: any;
        derivedColumn: string;
        value: string;
        /** workflow ui param */
        colInfo: any
    }>;
    /** workflow ui param */
    excuteFlag: boolean;
    /** workflow ui param */
    usetable_info: {
        usetable: string;
        schema: {
            [index: string]: any;
        };
    };
}
export interface COM_DERV_ATT extends WkCommonData {
    derivedColumn: string;
    value: string;
}
export interface COM_DATE_ATT extends WkCommonData {
    derivedOption: string;
    column: string;
    derivedColumn: string;
    value: [string, string];//[PYTHON 날짜 포맷, SPARK 날짜 포맷]
    /** workflow ui param */
    dateFormatText: string;
}
export interface COM_PYTHON_ATT extends WkCommonData {
    value: string;
    /** workflow ui param */
    excuteFlag: boolean;
    /** workflow ui param */
    usetable_info: { usetable: string, schema: { [index: string]: any; }; },
    /** workflow ui param */
    popup_data: {
        schema: WpComSchema[],
        code: string,
        usetable: string,
        result: { [index: string]: any; },
        jobId: string;
    };
}
export interface COM_SELECT_ATT extends WkCommonData {
    column: string[];
}
export interface COM_NAME_ATT extends WkCommonData {
    column: string;
    value: string;
}
export interface COM_ANOMAL_ATT extends WkCommonData {
    column: string;
    type: string;
    value: string;
}
export interface COM_AGG_ATT extends WkCommonData {
    usetable: string;
    groupColumn: string;
    aggKey: Array<{
        column: string;
        type: string;
    }>;
}
export interface COM_ANALYTIC_ATT extends WkCommonData {
    [index: string]: any;
    comId: string //컴포넌트 id
    modelSave: boolean; // 프로핏 모델 저장 여부
    saveOpt: string;
    target_column: string;
    scaleInfo: string;
    optimizer: boolean;
    optimizerType: string;
    partitionType: string;
    partitionValue: string;
    modelName: string;
    modelType: string;
    modelInfo: { [index: string]: any; };
    parameter: any;
    analysisColInfo: string;
    usetable_info: { usetable: string, schema: any[], viewtable?: string; };
    chkSchema: { [index: string]: any; };
    predictProba : boolean,
}

export interface COM_COMPARE_MODEL_ATT extends WkCommonData {
    modelType: string;
    comId?: string;
    compare_model: {
        h_model_name: string;
        MODEL_NM: string;
        MODEL_ID?: number;
        MODEL_IDX?: number;
        COM_UUID?: string;
        ARG_TYPE?: string;
        MODEL_SAVE?: boolean;
    }[];
}

export interface COM_ENSEMBLE_MODEL_ATT extends WkCommonData {
    modelType: string;
    modelSave: boolean;
    target_column: string;
    scaleInfo: string;
    partitionType:string;
    partitionValue:string;
    parameter: any;
    analysisColInfo:string;
    modelName:string;
    modelInfo: { [index: string]: any; };
    predictProba : boolean
}

export interface COM_FILTER_MODEL_ATT extends WkCommonData {
    comId: string; //컴포넌트 id
    filterOpt: string;
    // saveOpt: string;
    compare_model: {
        h_model_name: string;
        MODEL_NM: string;
        MODEL_ID?: number;
        MODEL_IDX?: number;
        COM_UUID?: string;
        COM_ID?: number;
        ARG_TYPE?: string;
        MODEL_SAVE?: boolean;
    }[];
    modelName: string;
    modelType: string;
}

export interface COM_FEATURE_IMPORTANCE_ATT extends WkCommonData {
    target_column: string;
    column: string[];
    value: number;
    usetable_info: { usetable: string, schema: { [index: string]: any } };
};

export interface COM_PREDICT_MODEL_ATT extends WkCommonData {
    modelOpt: string;
    /** workflow ui param */
    modelType: string;
    /** workflow ui param */
    targetColumn:string; // 타겟컬럼명
    /** workflow ui param */
    modelName:string; // 모델명
    // 상위 컴포넌트에서 학습한 모델로 예측값 붙이는 것이면 comId 값이 있다.
    modelComId: string; // 예측 실행할 모델의 componentId
    // 기존 메타db에 저장된 모델 중 선택하면 modelId, modelIdx가 있다.
    modelId: number; // 예측 실행할 modelId
    modelIdx: number; // 예측 실행할 modelIdx
    // probaData: boolean;
    limeData:boolean;
    customYn:string;
};
export interface COM_IMAGE_ATT extends WkCommonData {
    filepath: string,
    filename: string[],
    comId: string
}
export interface COM_IMG_LABEL_ATT extends WkCommonData {
    label: any;
    usetable_info?: { usetable: string, schema: { [index: string]: any; }; }
}

export interface COM_IMG_DATASOURCE_ATT extends WkCommonData {
    load: string;
    filename: string;
    filetype: string;
    fileseq: string;
    dataUserno: number;
    originalname: string;
    dataOpt?: string;
}
export interface COM_IMG_ODATASOURCE_ATT extends WkCommonData {
    filetype: string;
    filename: string;
    dataUserno: string;
    saveOpt: string;
    dataOpt: string;
    new_filename: string;
    overwrite_filename: string;
    streamInputJobList: string[]
}
export interface COM_VOLTTRON_ATT extends WkCommonData {
    topic: string;
}

export type WkSaveData = {
    wkCompData: WpComData[],
    wkDiagram: string,
    wkId: string,
    wkName?: string,
    wkType?: string,
    workflowName?: string;
    overwrite?: boolean,
    WF_ID?: number;
    wkModelIdData?: {
        [index: string]: {
            MODEL_ID: number;
            MODEL_IDX: number;
        };
    };
};

// 워크플로우 실행 데이터
export interface JOB_DATA_ATT {
    [index: string]: any;
    id: string;
    type: number;
    text: string;
    data: any; //wk-data
    filter?: string[], // filter 여부
    parent_id: string[];
    step: number;
    success?: boolean;
    // 로드한 워크플로우일경우
    wf_regUserno?: number;
}

// 모든 컴포넌트의 'o_data' 타이핑
export type WiseComData = {
    [index: string]: any;
} & (COM_OODBC_ATT | COM_ODBC_ATT | COM_API_ATT | COM_IWORKFLOW_ATT | COM_STORAGE_ATT | 
    COM_DATASOURCE_ATT | COM_ODATASOURCE_ATT | COM_WINDOW_ATT | Array<COM_TYPE_ATT> |
    Array<COM_SPLIT_ATT> | Array<COM_SORT_ATT> | Array<COM_SLICE_ATT> | COM_SAMPLE_ATT | Array<COM_NULL_ATT> | COM_MERGE_ATT |
    Array<COM_MATH_ATT> | COM_JOIN_ATT | COM_GROUP_ATT | COM_DERV_COND_ATT | Array<COM_DERV_ATT> | Array<COM_DATE_ATT> | COM_PYTHON_ATT | COM_PREDICT_MODEL_ATT |
    COM_SELECT_ATT | Array<COM_NAME_ATT> | Array<COM_ANOMAL_ATT> | COM_AGG_ATT | COM_ANALYTIC_ATT | COM_COMPARE_MODEL_ATT | COM_FILTER_MODEL_ATT | COM_FEATURE_IMPORTANCE_ATT | COM_ENSEMBLE_MODEL_ATT  |
    COM_IMAGE_ATT | COM_IMG_LABEL_ATT  | COM_IMG_DATASOURCE_ATT | COM_IMG_ODATASOURCE_ATT | COM_VOLTTRON_ATT);

// 모든 컴포넌트 타이핑
export type WiseComType = { [index: string]: any; } & ( WpDataSourceData | WpODataSourceData );