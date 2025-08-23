import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

export interface WP_META_DB {
    o_mstr:any;
    o_connection:Sequelize;
    o_result?:any;
    onInit():Promise<void>;
    getConnection():Sequelize;
    getDbInfo(p_userMode?:string,p_userNo?:string):Promise<any>;
    getTableInfo(p_dbNm:string,p_dsId?:number, p_userMode?:string,p_userNo?:string):Promise<any>;
    getColumnInfo(p_dbNm:string,p_tblNm:string):Promise<any>;
    getRowCount(p_tableNm:string):Promise<any>;
    getPageData(p_offset:number,p_page:number,p_tableNm:string):Promise<any>;
    select(p_tableNm:string,p_colNmArr:Array<any>, p_where:{},p_order?:Array<any>, p_limit?:any):Promise<any>;
    insert(p_tableNm:string,p_colNmArr:{} | Array<any>,pBool:boolean,p_tran?:Transaction):Promise<any>;
    update(p_tableNm:string,p_colNmArr:{}, pWhere:{},p_tran?:Transaction):Promise<any>;
    delete(p_tableNm:string,p_where:{},p_tran?:Transaction):Promise<any>;
    query(p_query:string,p_tableNm:string,p_option?:any,p_tran?:Transaction):Promise<any>;
    // bigTableSave?(pRowCount:any,pConn:WP_META_DB,pTableNm:string,pPath:string):Promise<any>;
    defineModel?(dbNm:string,s_tableNm:string):void;
    
}
