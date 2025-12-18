import { Dialect } from "sequelize";

export interface WP_CONN_ATT {
    use:boolean;
    host:string;
    port:number;
    monitoring_port:number;
}
export interface WP_FTP_ATT extends WP_CONN_ATT{
    user:string;
    password:string;
}
export interface WP_SFTP_ATT extends WP_CONN_ATT{
    user:string;
    password:string;
}
export interface WP_DB_ATT extends WP_CONN_ATT{
    id:string;
    passwd:string;
    db:string;
    type: Dialect;
}
export interface WP_CONN_ATT2 extends WP_CONN_ATT{
    topics_port:number;
    connectors_port:number;
    hadoop_id:string;
    monitoring_port:number;
}
export interface WP_JUPYTER_ATT extends WP_CONN_ATT {
    token: string;
    "env-name": string;
}

export interface WP_CONFIG {
    NODE:WP_CONN_ATT;
    PY:WP_CONN_ATT;
    META_DB: WP_DB_ATT;
    HIVE_DB: WP_DB_ATT;
    WP_API: WP_CONN_ATT;
    KAFKA: WP_CONN_ATT2;
    LDAP: WP_CONN_ATT;
    JUPYTER: WP_JUPYTER_ATT;
    LOAD_BALANCER: boolean;
    LANG: string;
    BACKGROUND : boolean;
    PLATFORM_ID:number;
    ADVANCE: boolean;
    CLOUD: boolean;
    CRON: boolean;
    CRYPTO_TYPE:string;
    LICENSE:string;
    STORAGE_TYPE:string;
    // DEFAULT_DATA_PATH:string;
    LIB_PATH:string;
    CONFIG:WP_SFTP_ATT|WP_FTP_ATT;
    API_TYPE:string;
    ML_PATH:string;
    DS_ID:number;
    DBLIST: any;
    KEY_PATH: string;
    LIVY: any;
    FILE_FORMAT: string;
    APP_NO: number;
    VOLTTRON : WP_CONN_ATT;
}