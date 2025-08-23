import { DS_MSTR_ATT } from "../metadb/model/DS_MSTR";

// var o_appconfig = new WiseAppConfig();
export interface FileSystemItem {
    name: string,
    pathInfo: {key:string,name:string}[]
    parentPath: string,
    relativeName: string,
    key: string,
    path: string,
    pathKeys: Array<string>,
    isDirectory: boolean,
    size: number,
    dateModified: string,
    thumbnail: string,
    tooltipText: string,
    dataItem: {isDirectory:boolean, name:string, size: number}
}

export interface WP_DATASET_ATT {
    DS_VIEW_NM:string;
    DS_FILE_FORMAT:string;
    
    TBL_TYPE:keyof typeof WP_DATASET_TYPE_ATT;
    TBL_NM:string;  // 원본 데이터명, disable
    TBL_CAPTION:string;

    CONNECTION_TYPE:'db'|'file'|'folder';
    CONNECTION:DS_MSTR_ATT;
    TABLE_INFO:string; // DB 테이블명 or 
    FILE_INFO:FileSystemItem; //  파일객체
}

export const WP_CONNECT_TYPE_ATT = {
    DatabaseManagement: ['mysql', 'mssql', 'oracle', 'postgresql'],
    WiseStorageManager: ['sftp', 'ftp', 'local', 'hdfs','object','aws']
} as const;

export enum WP_DATASET_TYPE {
    structure = 'structure',
    image = 'image',
    document = 'document'
}

export interface WP_STATISTIC_DATA {
    row_count: number; // 데이터 개수
    column_count: number; // 컬럼 개수
    // 아래는 통계 돌았을때 값이 있음.
    cell_count: number; // 셀 개수
    cell_null_count: number;  // 셀 null 개수
    cell_outlier_count: number; // 셀 outlier 개수
}

export const WP_DATASET_TYPE_ATT = {
    structure: {
        db: {
            extension: ['table'],
            dsMstrType: WP_CONNECT_TYPE_ATT['DatabaseManagement'],
            statistics: true,
            // selectionMode:null,
        },
        file: {
            extension: ['csv', 'parquet', 'txt', 'xlsx'],      
            dsMstrType: WP_CONNECT_TYPE_ATT['WiseStorageManager'],
            statistics: true,
            selectionMode:'single',
        },
    },
    image: {
        file: {
            extension: ['jpg','png'],
            dsMstrType: WP_CONNECT_TYPE_ATT['WiseStorageManager'],
            statistics: false,
            selectionMode:'multiple'
        },
        folder: {
            extension: ['directory'],
            dsMstrType: WP_CONNECT_TYPE_ATT['WiseStorageManager'],
            statistics: false,
            selectionMode:'single'            
        }
    },
    document: {
        file: {
            extension: ['jpg','png'],
            dsMstrType: WP_CONNECT_TYPE_ATT['WiseStorageManager'],
            statistics: false,
            selectionMode:'multiple'
        },
        folder: {
            extension: ['directory'],
            dsMstrType: WP_CONNECT_TYPE_ATT['WiseStorageManager'],
            statistics: false,
            selectionMode:'single'            
        }
    },
} as const  ;

export function getWpDatasetType() {
    return Object.keys(WP_DATASET_TYPE_ATT);
}

export function getWpConnectType(pKey: keyof typeof WP_DATASET_TYPE_ATT) {
    return WP_DATASET_TYPE_ATT[pKey];
}

export function getWpConnectInfo<K extends keyof typeof WP_DATASET_TYPE_ATT>(pKey: K, pKey2:keyof typeof WP_DATASET_TYPE_ATT[K]) {
    return WP_DATASET_TYPE_ATT[pKey][pKey2];
}

export function getWpConnectTypeList<K extends keyof typeof WP_CONNECT_TYPE_ATT>(pKey: K){
    return WP_CONNECT_TYPE_ATT[pKey];
}