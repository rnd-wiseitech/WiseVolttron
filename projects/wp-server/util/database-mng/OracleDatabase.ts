import { Sequelize,Model } from 'sequelize-typescript';
import { WpError, WpHttpCode } from '../../exception/WpError';
import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { OracleConn } from '../connector/oracle';
const oracledb = require('oracledb');

/**
 * Oracle 데이터베이스에 접근 할 수 있는 클래스.
 * 
 * {@link WP_META_DB | WP_META_DB} 인터페이스를 구현해야 DatabaseManagement를 이용하여 플랫폼 내에서 사용을 할 수 있다.
 * 
 * {@link OracleConn | OracleConn} 에서 instantclient_21_3를 다운 받아 lib 폴더안에 넣어야 하며 OS 타입에 맞는 라이브러리가 필요하다.
 * 
 * @example
 * ```ts
 * let s_oracleMng = new OracleDatabaseManagement() ;
 *
 * s_oracleMng.select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null).then(p_dbInfo=>{
 *     res.json(p_dbInfo);
 * }).catch(p_error=>{next(p_error)});  
 * ```
 */
export class OracleDatabaseManagement implements WP_META_DB{

    public o_mstr:any;
    public o_connection:Sequelize | any; // string(poolAlias)
    public o_result?:any;
    public o_query:string;
    public o_config:DS_MSTR_ATT;

    constructor(p_config:DS_MSTR_ATT){
        this.o_config = p_config;
    }
    public async onInit() { 
        await this.connect();
    }
    async connect(){
        let s_connectString = `${this.o_config.IP}:${this.o_config.PORT}/${this.o_config.DB_NM}`;
        this.o_connection = await OracleConn(this.o_config.USER_ID,this.o_config.PASSWD,s_connectString, this.o_config.DB_NM);
    }
    getConnection():Sequelize{
        return this.o_connection;
    }
    async getDbInfo(){
        this.o_result = await this.query('SELECT NAME FROM v$database');   
        
        return this.o_result;
    }

    async getTableInfo(p_dbNm:string, p_dsId?:number){
        
        let s_query = `
            SELECT  '${p_dbNm}' AS DB_NAME, A.TABLE_NAME TBL_NM, B.COMMENTS TBL_DESC, '${p_dsId}' AS DS_VIEW_ID
            FROM    ALL_TABLES A, ALL_TAB_COMMENTS B
            WHERE   A.OWNER = B.OWNER
            AND     A.TABLE_NAME = B.TABLE_NAME
            AND     A.OWNER = '${this.o_config.OWNER_NM}'
            UNION ALL
            SELECT  '${p_dbNm}' AS DB_NAME, A.VIEW_NAME TBL_NM, B.COMMENTS TBL_DESC, '${p_dsId}' AS DS_VIEW_ID
            FROM    ALL_VIEWS A, ALL_TAB_COMMENTS B
            WHERE   A.OWNER = B.OWNER
            AND     A.VIEW_NAME = B.TABLE_NAME
            AND     A.OWNER = '${this.o_config.OWNER_NM}'
            UNION ALL
            SELECT '${p_dbNm}' AS DB_NAME, A.MVIEW_NAME TBL_NM, B.COMMENTS TBL_DESC, '${p_dsId}' AS DS_VIEW_ID
            FROM ALL_MVIEWS A, USER_MVIEW_COMMENTS B
            WHERE  A.MVIEW_NAME = B.MVIEW_NAME
            AND     A.OWNER = '${this.o_config.OWNER_NM}'
            ORDER BY 1
        `;

        this.o_result = await this.query(s_query);
        
        return this.o_result;
    }
    async getColumnInfo(p_dbNm:string,p_tblNm:string){
        // select * from all_ind_columns where table_name='테이블명'
        let s_query = `SELECT COLUMN_NAME, DATA_TYPE, CASE WHEN NULLABLE = 'Y' THEN 'YES' ELSE 'NO' END AS IS_NULLABLE FROM ALL_TAB_COLUMNS WHERE TABLE_NAME='${p_tblNm}' AND OWNER = '${this.o_config.OWNER_NM}'`;

        this.o_result = await this.query(s_query);
        
        return this.o_result;
    }
    async getRowCount(p_tableNm:string){
        // 수정 및 체크
        let s_query = `SELECT COUNT (*) AS CNT 
                        FROM ${p_tableNm}`;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
    }
    async getPageData(p_offset:number,p_page:number,p_tableNm:string){
        // 수정 및 체크
        let s_offset = (p_offset - 1) * p_page;
        let s_page = p_page * p_offset;
        let s_query = `SELECT * 
                        FROM (
                            SELECT 
                              ROWNUM AS ORACLE_TEMP_NUM,
                              A.*
                            FROM 
                              ${p_tableNm} A
                            ORDER BY 1
                        )
                        WHERE ORACLE_TEMP_NUM > ${s_offset} AND ORACLE_TEMP_NUM <= ${s_page}`;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
        
    }
    // #28. LIMIT 추가
    public async select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where:any={},p_order:Array<any>=[], p_limit:any=null){        
        try {
            let s_select = 'SELECT ';
            let s_insert = 'INSERT ';
            let s_value = ' VALUES ( ) ';
            let s_delete = 'DELETE  ';
            let s_from = `FROM ${p_tableNm}`;
            let s_where = ` `;
            let s_order = ' ';
            let s_firstExe = true;
            this.o_query = '';

            if(Object.keys(p_where).length > 0){
                s_where += ` WHERE `;
                for(let s_keyNm of Object.keys(p_where)){
                    if(typeof p_where[s_keyNm] == 'number')
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = ${p_where[s_keyNm]}`;
                    else
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = '${p_where[s_keyNm]}'`;
                }
            }
            if(p_order.length > 0){
                s_order += ` ORDER BY `;                 
                for(let s_colNm of p_order){
                    s_order += ` ${s_firstExe ? '':','}${s_colNm} `;                    
                }
            }
            
            if(p_colNmArr.length==0){
                s_select += ' * ';                
            }else{
                for(let s_colNm of p_colNmArr){
                    s_select += ` ${s_firstExe ? '':','}${s_colNm} `;                    
                }
            }
            
            this.o_query = s_select + s_from + s_where + s_order;
            this.o_result = await this.query(this.o_query);
            
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_SELECT,
                message: p_error,
              });
        }

        return this.o_result;
    }
    public async insert(p_tableNm:string,p_colNmArr:any,pBool=false){
        
        try {
            let s_insert = 'INSERT ';
            let s_value = 'VALUES ( ) ';
            let s_firstExe = true;
            let s_promises = [];
            let s_insertValue:any = {};
            let s_insertOption:any = {
                autoCommit: true,
                lobMetaInfo:{},
            };

            if(typeof p_colNmArr == 'object'){
                s_promises.push(
                    new Promise((resolve,rejects)=>{
                        let p_tmpWhere:any = p_colNmArr;

                        for(let s_keyNm of Object.keys(p_tmpWhere)){
                            s_insert += ` ${s_firstExe ? '':','} ${s_keyNm}`;
                            if(typeof p_tmpWhere[s_keyNm] == 'number')
                                s_value += ` ${s_firstExe ? '':','} :${p_tmpWhere[s_keyNm]}`;                    
                            else
                                s_value += ` ${s_firstExe ? '':','} EMPTY_CLOB()'${p_tmpWhere[s_keyNm]}'`;

                            s_insertValue[s_keyNm] = p_tmpWhere[s_keyNm];
                            s_insertOption.lobMetaInfo[s_keyNm] = s_keyNm;
                            s_firstExe = false;
                        }

                        this.o_query = `${s_insert}  ${p_tableNm}  ${s_value} `;

                        this.o_connection.insert(this.o_query,s_insertValue,s_insertOption).then((p_insertResult:any)=>{
                            resolve(p_insertResult);
                        }).catch((p_error:any)=>{
                            rejects(p_error);
                        });
                    })
                );
            }
            else{
                for(let s_values of p_colNmArr){
                    s_promises.push(
                        new Promise((resolve,rejects)=>{
                            let p_tmpWhere:any = s_values;
    
                            for(let s_keyNm of Object.keys(p_tmpWhere)){
                                s_insert += ` ${s_firstExe ? '':','} ${s_keyNm}`;
                                if(typeof p_tmpWhere[s_keyNm] == 'number')
                                    s_value += ` ${s_firstExe ? '':','} :${p_tmpWhere[s_keyNm]}`;                    
                                else
                                    s_value += ` ${s_firstExe ? '':','} EMPTY_CLOB()'${p_tmpWhere[s_keyNm]}'`;
    
                                s_insertValue[s_keyNm] = p_tmpWhere[s_keyNm];
                                s_insertOption.lobMetaInfo[s_keyNm] = s_keyNm;
                                s_firstExe = false;
                            }
    
                            this.o_query = s_insert + s_value ;
    
                            this.o_connection.insert(this.o_query,s_insertValue,s_insertOption).then((p_insertResult:any)=>{
                                resolve(p_insertResult);
                            }).catch((p_error:any)=>{
                                rejects(p_error);
                            });
                        })
                    );
                }

            }
            this.o_result = await Promise.all(s_promises);            
        
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_INSERT,
                message: p_error,
              });
        }
        
        return this.o_result;
    }
    public async update(p_tableNm:string,p_colNmArr:any={}, p_where:any){
        
        try {
            let s_update = `UPDATE ${p_tableNm}`;
            let s_value = 'SET ';
            let s_where = ' WHERE ';
            let s_firstExe = true;
            let s_updateValue:any = {};
            let s_updateOption:any = {
                autoCommit: true,
                lobMetaInfo:{},
            };


            if(Object.keys(p_where).length > 0){
                for(let s_keyNm of Object.keys(p_where)){
                    if(typeof p_where[s_keyNm] == 'number')
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = ${p_where[s_keyNm]}`;
                    else
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = '${p_where[s_keyNm]}'`;                    
                }
            }


            for(let s_keyNm of Object.keys(p_colNmArr)){
                s_value += ` ${s_firstExe ? '':','}${s_keyNm} = :${s_keyNm} `;

                s_updateValue[s_keyNm] = p_colNmArr[s_keyNm];
                s_updateOption.lobMetaInfo[s_keyNm] = s_keyNm;
                s_firstExe = false;
            }

            this.o_query = `${s_update}  ${p_tableNm}  ${s_value} `;

            this.o_result = await this.o_mstr.update(this.o_query,s_updateValue,s_updateOption)
        
        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_INSERT,
                message: p_error,
              });
        }
        
        return this.o_result;
    }
    public async delete(p_tableNm:string,p_where:any){
        let s_delete = `DELETE FROM ${p_tableNm}`;
        let s_where = ' WHERE ';
        let s_firstExe = true;

        try {

            if(Object.keys(p_where).length > 0){
                for(let s_keyNm of Object.keys(p_where)){
                    if(typeof p_where[s_keyNm] == 'number')
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = ${p_where[s_keyNm]}`;
                    else
                        s_where += ` ${s_firstExe ? '':'AND'} ${s_keyNm} = '${p_where[s_keyNm]}'`;                    
                }
            }

            this.o_query = s_delete + s_where;
            this.o_result = await this.query(this.o_query);

        } catch (p_error) {
            throw new WpError({
                httpCode: WpHttpCode.META_DB_DELETE,
                message: p_error,
              });
        }
        return this.o_result;
    }
    public async query(p_query:string,p_tableNm?:string,p_option?:any){
        let s_tmpConnection;
        try {
            let s_pool = oracledb.getPool(this.o_connection);
            s_tmpConnection = await s_pool.getConnection();  // get connection from the pool and use it   
            this.o_result = await s_tmpConnection.query(p_query);            
          
        } catch (p_error) {         
            throw new WpError({
                httpCode: WpHttpCode.META_DB_QUERY,
                message: p_error,
            });        
        } finally {
            if (s_tmpConnection) {
                try {
                    await s_tmpConnection.close(); // Put the connection back in the pool
                } catch (p_error) {         
                    throw new WpError({
                        httpCode: WpHttpCode.META_DB_QUERY,
                        message: p_error,
                    }); 
                }
            }
        }
        return this.o_result;
    }
}