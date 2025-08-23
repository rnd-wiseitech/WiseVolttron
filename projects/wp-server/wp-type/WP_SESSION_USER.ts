import { WP_CONFIG } from "./WP_CONN_ATT";
export interface WP_SESSION_USER {
    exp?:number,
    iat?:number,
    USER_ID?:string,
    USER_MODE?:string,
    USER_INSTANCE?:string,
    USER_NO:number,
    USER_TOKEN?:string,
    HDFS_TOKEN?:string,
    AppConfig?:WP_CONFIG,
    USER_IP?:string | string []
}
