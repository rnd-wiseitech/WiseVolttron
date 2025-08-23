import { WriteStream } from "fs";
import { DS_MSTR_ATT } from "../metadb/model/DS_MSTR";
import { WP_CONFIG, WP_FTP_ATT } from "./WP_CONN_ATT";
import { WP_SESSION_USER } from "./WP_SESSION_USER";
import * as csv from 'fast-csv';
export interface WP_DATASOURCE {
    connection:DS_MSTR_ATT;
    table_name:string;
    file_name:string;
    file_path:string;
    name:string;
}

export interface WiseDataStorageInterface {      
    getFileList(p_path:string,p_hideFlag:boolean, p_mode:string):Promise<WiseReturn>;
    onMakeDir(p_path:string,p_chmod:string,p_recursive:boolean):Promise<WiseReturn>;    
    onDeleteFile(p_path:string,p_recursive:boolean,p_isDirectory:boolean):Promise<WiseReturn>;
    isExists(p_path:string):Promise<WiseReturn>;
    onMoveFile(p_orgPath:string,p_newPath:string,p_overWriteFlag:boolean):Promise<WiseReturn>;
    onReName(p_orgPath:string,p_newPath:string):Promise<WiseReturn>;
    onCopyFile(p_orgPath:string,p_newPath:string,p_overWriteFlag:boolean):Promise<WiseReturn>;
    onReadFile(p_path:string,p_option?:any):Promise<WiseReturn>;
    onWriteFile(p_path:string,p_data:any,p_type:string):Promise<WiseReturn>;
    chown?(p_path:string,p_uid:string,p_gid:string):Promise<WiseReturn>;
    connect?():void;
}
