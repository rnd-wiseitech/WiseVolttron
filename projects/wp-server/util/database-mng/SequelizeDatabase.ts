
import { QueryTypes } from 'sequelize';
import { Sequelize} from 'sequelize-typescript';
import { WpError, WpHttpCode } from '../../exception/WpError';
import { getType } from '../../metadb-util';
import { MetaConn } from '../../metadb/dbconfig';
import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { Db2sqlConn } from '../connector/db2';
import { MssqlConn } from '../connector/mssql';
import { MysqlConn } from '../connector/mysql';
import { PostgreConn } from '../connector/postgre';
/**
 * {@link DS_MSTR_ATT | DS_MSTR} 형식에 맞게 접속 정보를 전달하면 해당 데이터 베이스에 접근할 수 있다.
 * 
 * 모든 데이터베이스가 아니고 Sequelize 라이브러리를 이용할 수 있는 데이터베이스인 경우만 가능하다.
 * @example
 * ```ts
 * let o_dbMng = new SequelizeDatabaseManagement(DS_MSTR) ;
 *
 * o_dbMng.select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null).then(p_dbInfo=>{
 *     res.json(p_dbInfo);
 * }).catch(p_error=>{next(p_error)});  
 * ```
 */
export class SequelizeDatabaseManagement implements WP_META_DB{

    public o_mstr:any;
    public o_connection:Sequelize;
    public o_result?:any;
    constructor(p_config:DS_MSTR_ATT){
        if(p_config.DBMS_TYPE === 'mysql')            
            this.o_connection = MysqlConn(p_config.DB_NM,p_config.USER_ID,p_config.PASSWD,p_config.IP,Number(p_config.PORT));
        else if(p_config.DBMS_TYPE === 'db2')            
            this.o_connection = Db2sqlConn(p_config.DB_NM,p_config.USER_ID,p_config.PASSWD,p_config.IP,Number(p_config.PORT));
        else if(p_config.DBMS_TYPE === 'mssql')            
            this.o_connection = MssqlConn(p_config.DB_NM,p_config.USER_ID,p_config.PASSWD,p_config.IP,Number(p_config.PORT));
        else if(p_config.DBMS_TYPE === 'postgresql')
            this.o_connection = PostgreConn(p_config.DB_NM,p_config.USER_ID,p_config.PASSWD,p_config.IP,Number(p_config.PORT),p_config.OWNER_NM);
        else
            this.o_connection = MetaConn;
    }
    public async onInit() { 
    }
    
    // sequelize model define
    public async defineModel(dbNm:string,s_tableNm:string){
        let s_colResult = await this.getColumnInfo(dbNm,s_tableNm);
        let s_colInfo:any = {}
        for(let idx in s_colResult){
            let s_tmpCol:any = {}
            s_tmpCol.allowNull = s_colResult[idx].IS_NULLABLE
            s_tmpCol.type = getType(s_colResult[idx].DATA_TYPE)
            s_colInfo[s_colResult[idx].COLUMN_NAME] = s_tmpCol
        }
        this.o_connection.define(s_tableNm, s_colInfo).removeAttribute('id');
    }    
    getConnection():Sequelize{
        return this.o_connection;
    }
    // default query == mysql
    async getDbInfo(){

        this.o_result = await this.query('SHOW DATABASES','',true);
        
        return this.o_result;
    }

    async getTableInfo(p_dbNm:string,p_dsId?:number){
        // let s_query = `SELECT *
        //                 FROM INFORMATION_SCHEMA.TABLES
        //                 WHERE TABLE_SCHEMA =  '${p_dbNm}'`;
                        
        let s_query = `
        SELECT TABLE_SCHEMA AS DB_NAME, TABLE_NAME AS TBL_NM, TABLE_COMMENT AS TBL_DESC, ${p_dsId} AS DS_VIEW_ID
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = '${p_dbNm}' ORDER BY TBL_NM`;

        this.o_result = await this.query(s_query,'',true);
        
        return this.o_result;
    }
    async getColumnInfo(p_dbNm:string,p_tblNm:string){
        let s_query = `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE,COLUMN_KEY
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '${p_tblNm}'
                        AND TABLE_SCHEMA = '${p_dbNm}'`;

        this.o_result = await this.query(s_query,'',true);
        
        return this.o_result;
    }
    async getRowCount(p_tableNm:string){
        let s_query = `SELECT COUNT (*) AS CNT 
                        FROM ${p_tableNm}`;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
    }
    async getPageData(p_offset:number,p_page:number,p_tableNm:string){    
        let s_offset = (p_offset - 1) * p_page;
        let s_query = `SELECT * 
                        FROM ${p_tableNm} 
                        ORDER BY 1 
                        LIMIT ${p_page} OFFSET ${s_offset} `;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
        
    }
    // #28. LIMIT 추가
    public async select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null){        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if(p_colNmArr.length==0){
                this.o_result = await this.o_mstr.findAll({where: p_where ,order:p_order, limit: p_limit});
            }else{
                this.o_result = await this.o_mstr.findAll({ attributes: p_colNmArr, where: p_where ,order:p_order, limit: p_limit});
            }
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_SELECT,
                message: p_error,
              });
        }

        return this.o_result;
    }
    public async insert(p_tableNm:string,p_colNmArr:{} | Array<any>,pBool=false){
        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            if(pBool){
                this.o_result = await this.o_mstr.bulkCreate(p_colNmArr);
            }else{
                this.o_result = await this.o_mstr.create(p_colNmArr);
            }            
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_INSERT,
                message: p_error,
              });
        }
        
        return this.o_result;
    }
    public async update(p_tableNm:string,p_colNmArr:{}={}, pWhere:{}){
        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            this.o_result = await this.o_mstr.update(p_colNmArr, { where: pWhere });
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_UPDATE,
                message: p_error,
              });
        }
        return this.o_result;
    }
    public async delete(p_tableNm:string,p_where:{}){
        
        try {
            this.o_mstr = this.o_connection.model(p_tableNm);
            this.o_result = await this.o_mstr.destroy({ where: p_where });
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_DELETE,
                message: p_error,
              });
        }
        return this.o_result;
    }
    public async query(p_query:string,p_tableNm:string,p_option?:any){
        try {
            if(typeof p_option == 'undefined')
                this.o_result = await this.o_connection.query(p_query,{ model: this.o_connection.model(p_tableNm)});
            else
                this.o_result = await this.o_connection.query(p_query,{ type: QueryTypes.SELECT });
        } catch (p_error) {         
            throw new WpError({
                httpCode: WpHttpCode.META_DB_QUERY,
                message: p_error,
              });
        }
        return this.o_result;
    }
}