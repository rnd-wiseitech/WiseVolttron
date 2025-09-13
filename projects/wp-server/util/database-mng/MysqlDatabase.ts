import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { SequelizeDatabaseManagement } from './SequelizeDatabase';

/**
 * Mysql 데이터베이스에 접근 할 수 있는 클래스.
 * 
 * {@link WP_META_DB | WP_META_DB} 인터페이스를 구현해야 DatabaseManagement를 이용하여 플랫폼 내에서 사용을 할 수 있다.
 * 
 * Sequelize 라이브러리를 이용할 수 있는 데이터베이스인 경우 {@link SequelizeDatabaseManagement | SequelizeDatabaseManagement}를 상속 받아 사용 하면 편리하다.
 * @example
 * ```ts
 * let s_mysqlMng = new MysqlDatabaseManagement() ;
 *
 * s_mysqlMng.select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null).then(p_dbInfo=>{
 *     res.json(p_dbInfo);
 * }).catch(p_error=>{next(p_error)});  
 * ```
 */
export class MysqlDatabaseManagement extends SequelizeDatabaseManagement implements WP_META_DB{

    constructor(p_dbInfo:DS_MSTR_ATT){
        super(p_dbInfo);
    }

    override async getDbInfo(){

        this.o_result = await super.query('SHOW DATABASES','',true);
        
        return this.o_result;
    }

    override async getTableInfo(p_dbNm:string,p_dsId?:number){
        let s_query = `
            SELECT TABLE_SCHEMA AS DB_NAME, TABLE_NAME AS TBL_NM, TABLE_COMMENT AS TBL_DESC, ${p_dsId} AS DS_VIEW_ID
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = '${p_dbNm}' ORDER BY TBL_NM`;

        this.o_result = await super.query(s_query,'',true);
        
        return this.o_result;
    }
    override async getColumnInfo(p_dbNm:string,p_tblNm:string){
        let s_query = `SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE, DATA_TYPE, COLUMN_TYPE,COLUMN_KEY
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '${p_tblNm}'
                        AND TABLE_SCHEMA = '${p_dbNm}'`;

        this.o_result = await super.query(s_query,'',true);
        
        return this.o_result;
    }
    override async getPageData(p_offset:number,p_page:number,p_tableNm:string){
        let s_offset = (p_offset - 1) * p_page;
        let s_query = `SELECT * 
                        FROM ${p_tableNm} 
                        ORDER BY 1 
                        LIMIT ${p_page} OFFSET ${s_offset} `;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
        
    }
}