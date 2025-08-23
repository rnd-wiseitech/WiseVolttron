import { DP_VAR_MSTR } from "../metadb/model/DP_VAR_MSTR";
import { DS_VIEW_MSTR_ATT } from "../metadb/model/DS_VIEW_MSTR";
import { DS_VIEW_TBL_MSTR_ATT } from "../metadb/model/DS_VIEW_TBL_MSTR";
import { WP_DATASET_TYPE, WP_STATISTIC_DATA } from "./WP_DATASET_ATT";

export type WP_MANIFEST = WP_STRUCTURE_MANIFEST_ATT | WP_IMAGE_MANIFEST_ATT | WP_DOCUMENT_MANIFEST_ATT;

// tbl_nm, tbl_desc???
// 일단 tbl_nm tbl_desc삭제

interface WP_MANIFEST_ATT extends Pick<DS_VIEW_MSTR_ATT, "DS_VIEW_ID">, Pick<DS_VIEW_TBL_MSTR_ATT, "VIEW_IDX" | "TBL_TYPE"> {
    REG_DT: string; // 파일 생성일자
    REG_USER_NO: number;    // 파일 생성자 id
    UPD_DT: string;
}

export interface WP_STRUCTURE_MANIFEST_ATT extends WP_MANIFEST_ATT, WP_STATISTIC_DATA {
    schema: SchemaInfo[]; // 컬럼 정보
    statistics: VarInfo[]; // 통계량

}

export interface WP_IMAGE_MANIFEST_ATT extends WP_MANIFEST_ATT {
    fileInfo: FileInfo; // 업로드 파일 정보
    labelInfo: LabelInfo; // 라벨 리스트, 라벨 파일 등 라벨 관련 정보
}

export interface WP_DOCUMENT_MANIFEST_ATT extends WP_MANIFEST_ATT {
    fileInfo: FileInfo; // 업로드 파일 정보
    labelInfo: LabelInfo; // 라벨 리스트, 라벨 파일 등 라벨 관련 정보
}

interface SchemaInfo {    
    metadata:{},
    name:string,
    nullable:string,
    type: string
}

// db 컬럼명을 ㅗ할 경우
// ds_view_col_mstr 사용안하는 컬럼 
// PK_YN,  LENGTH, COL_ID,       
// DP_VAR_MSTR 컬럼으로 통일 컬럼
// TBL_NM, COL_NM, DATA_TYPE COL_UNI_CNT COL_MISS_CNT COL_MIN COL_MAX COL_MEAN COL_STD_DEV COL_1Q COL_2Q COL_3Q
// dp_view_col_mstr 에서 추가 컬럼
// REG_DT, REG_USER_NO -> manifest 공통
// VAL_CNT: number,
// VAL_OUT_CNT: number,
// VAL_DISTRIBUTION: {"interval":string,"count":number}[]
export interface VarInfo {        
    // job statistic과 동일
    column : string,
    datatype : string,
    count: number,
    mean: number,
    stddev: number,
    min: number,
    q1: number,
    q2: number,
    q3: number,
    // 10PER: number,
    // 90PER:number,
    max: number,
    null_count: number,
    total_count: number,
    duplicate_count:number,
    distinct_count: number,
    outlier_count: number,
    outliers: number[],
    distribution: []
}

// 파일 정보를 위한 인터페이스
interface FileInfo {
    // 파일 정보에 관련된 속성들을 정의
}

// 라벨 정보를 위한 인터페이스
interface LabelInfo {
    // 라벨 정보에 관련된 속성들을 정의
}

export const wp_structure_att:WP_STRUCTURE_MANIFEST_ATT = {
    DS_VIEW_ID:null,
    VIEW_IDX:null,
    TBL_TYPE:null,
    // TBL_NM:null,
    // TBL_DESC:null,
    REG_DT:null,
    REG_USER_NO:null,
    UPD_DT:null,
    schema: null,
    // [{        
    //     metadata:{},
    //     name:null,
    //     nullable:null,
    //     type: null
    // }],
    row_count: null,
    column_count: null, 

    cell_count: null,
    cell_null_count: null,
    cell_outlier_count: null,
    statistics: null
    // [{        
    //     // job statistic과 동일
    //     column : null,
    //     datatype : null,
    //     count: null,
    //     mean: null,
    //     stddev: null,
    //     min: null,
    //     q1: null,
    //     q2: null,
    //     q3: null,
    //     // 10PER: number,
    //     // 90PER:number,
    //     max: null,
    //     null_count: null,
    //     total_count: null,
    //     duplicate_count:null,
    //     distinct_count: null,
    //     outlier_count: null,
    //     outliers: null,
    //     distribution: null
    // }]
}

// 타입에 따라 다른 인터페이스를 반환하는 함수
export function getManifestObj(type:  keyof typeof WP_DATASET_TYPE): WP_MANIFEST {
    switch (type) {
        case WP_DATASET_TYPE.structure:
            return { ...wp_structure_att };
        case WP_DATASET_TYPE.image:
            return {
                DS_VIEW_ID:null,
                VIEW_IDX:null,
                TBL_TYPE:null,
                // TBL_NM:null,
                // TBL_DESC:null,
                REG_DT:null,
                UPD_DT:null,
                REG_USER_NO:null,
                fileInfo: {},
                labelInfo: {},
                // create_time: new Date()
            };
        case WP_DATASET_TYPE.document:
            return {
                DS_VIEW_ID:null,
                VIEW_IDX:null,
                TBL_TYPE:null,
                // TBL_NM:null,
                // TBL_DESC:null,
                REG_DT:null,
                UPD_DT:null,
                REG_USER_NO:null,
                fileInfo: {},
                labelInfo: {},
                // create_time: new Date()
            };
        default:
            return { ...wp_structure_att };
    }
}

export function getManifestAtt<T extends keyof WP_MANIFEST>(pDatasetype:  keyof typeof WP_DATASET_TYPE, pValues: Partial<Record<T, any>>) {
    let s_manifestAtt: WP_MANIFEST = getManifestObj(pDatasetype);
    for (const sKey in pValues) {
        s_manifestAtt[sKey] = pValues[sKey];
    }
    return s_manifestAtt;
}