import { DatabaseError, QueryTypes, Transaction } from 'sequelize';
import { Sequelize,Model, ModelCtor } from 'sequelize-typescript';
import { WpError, WpHttpCode } from '../exception/WpError';
import { WP_META_DB } from '../wp-type/WP_META_DB';
import { MetaConn } from "./dbconfig";


export class WiseMetaDB implements WP_META_DB{

    public o_mstr: ModelCtor;
    public o_connection:Sequelize;

    constructor(p_connection?:Sequelize){
        if(typeof p_connection === 'undefined')            
            this.o_connection = MetaConn;
        else
            this.o_connection = p_connection;
    }
    public async onInit() { 
    }
    getConnection():Sequelize{
        return this.o_connection;
    }
    async getDbInfo(){

        let s_result = await this.query('SHOW DATABASES','',true);
        
        return s_result;
    }

    async getTableInfo(p_dbNm:string){
        let s_query = `SELECT *
                        FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_SCHEMA =  '${p_dbNm}'`;

        let s_result = await this.query(s_query,'',true);
        
        return s_result;
    }
    async getColumnInfo(p_dbNm:string,p_tblNm:string){
        let s_query = `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE,COLUMN_KEY
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '${p_tblNm}'
                        AND TABLE_SCHEMA = '${p_dbNm}'`;

        let s_result = await this.query(s_query,'',true);
        
        return s_result;
    }
    async getRowCount(p_tableNm:string){
        let s_query = `SELECT COUNT (*) AS CNT 
                        FROM '${p_tableNm}'`;

        let s_result  = await this.query(s_query,p_tableNm);
        
        return s_result;
    }
    async getPageData(p_offset:number,p_page:number,p_tableNm:string){
        let s_offset = (p_offset - 1) * p_page;
        let s_query = `SELECT * 
                        FROM ${p_tableNm} 
                        ORDER BY 1 
                        LIMIT ${p_page} OFFSET ${s_offset} `;

        let s_result  = await this.query(s_query,p_tableNm);
        
        return s_result;
        
    }
    // #28. LIMIT 추가
    public async select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<string>=[], p_limit:any=null){ 
        let s_result:any;
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if(p_colNmArr.length==0){
                s_result = await this.o_mstr.findAll({where: p_where ,order:p_order, limit: p_limit});
            }else{
                s_result = await this.o_mstr.findAll({ attributes: p_colNmArr, where: p_where ,order:p_order, limit: p_limit});
            }
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_SELECT,
                message: p_error,
              });
        }

        return s_result;
    }
    public async insert(p_tableNm:string, p_colNmArr:any | Array<any>,pBool=false ,p_tran?:Transaction){

        let s_result:any;
        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if(pBool){
                if (typeof p_tran == 'undefined')
                    s_result = await this.o_mstr.bulkCreate(p_colNmArr);
                else
                    s_result = await this.o_mstr.bulkCreate(p_colNmArr, { transaction: p_tran });
            }else{
                if(typeof p_tran == 'undefined')
                    s_result = await this.o_mstr.create(p_colNmArr);
                else
                    s_result = await this.o_mstr.create(p_colNmArr,{transaction: p_tran});
            }            
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_INSERT,
                message: p_error,
              });
        }
        
        return s_result;
    }
    public async update(p_tableNm:string,p_colNmArr:{}={}, pWhere:{} ,p_tran?:Transaction){

        let s_result:any;
        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if (typeof p_tran == 'undefined')
                s_result = await this.o_mstr.update(p_colNmArr, { where: pWhere });
            else 
                s_result = await this.o_mstr.update(p_colNmArr, { where: pWhere, transaction: p_tran });
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_UPDATE,
                message: p_error,
              });
        }
        return s_result;
    }
    public async delete(p_tableNm: string, p_where: {}, p_tran?: Transaction){
        
        let s_result:any;

        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if (typeof p_tran == 'undefined')
                s_result = await this.o_mstr.destroy({ where: p_where });
            else
                s_result = await this.o_mstr.destroy({ where: p_where, transaction: p_tran });
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_DELETE,
                message: p_error,
              });
        }
        return s_result;
    }
    public async query(p_query: string, p_tableNm: string, p_option?: any, p_tran?: Transaction){

        let s_result:any;

        try {
            if (typeof p_tran == 'undefined'){
                if (typeof p_option == 'undefined')
                    s_result = await this.o_connection.query(p_query, { model: this.o_connection.model(p_tableNm) });
                else if (p_option == 'update')
                    s_result = await this.o_connection.query(p_query, { type: QueryTypes.UPDATE });
                else
                    s_result = await this.o_connection.query(p_query, { type: QueryTypes.SELECT });
            } else {
                if (typeof p_option == 'undefined')
                    s_result = await this.o_connection.query(p_query, { model: this.o_connection.model(p_tableNm), transaction: p_tran });
                else if (p_option == 'update')
                    s_result = await this.o_connection.query(p_query, { type: QueryTypes.UPDATE, transaction: p_tran });
                else
                    s_result = await this.o_connection.query(p_query, { type: QueryTypes.SELECT, transaction: p_tran });
            }
        } catch (p_error) {         
            throw new WpError({
                httpCode: WpHttpCode.META_DB_QUERY,
                message: p_error,
              });
        }
        return s_result;
    }
}