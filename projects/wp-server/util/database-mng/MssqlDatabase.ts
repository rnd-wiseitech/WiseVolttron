import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { SequelizeDatabaseManagement } from './SequelizeDatabase';

/**
 * Mssql 데이터베이스에 접근 할 수 있는 클래스.
 * 
 * {@link WP_META_DB | WP_META_DB} 인터페이스를 구현해야 DatabaseManagement를 이용하여 플랫폼 내에서 사용을 할 수 있다.
 * 
 * Sequelize 라이브러리를 이용할 수 있는 데이터베이스인 경우 {@link SequelizeDatabaseManagement | SequelizeDatabaseManagement}를 상속 받아 사용 하면 편리하다.
 * @example
 * ```ts
 * let s_mssqlMng = new MssqlDatabaseManagement() ;
 *
 * s_mssqlMng.select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null).then(p_dbInfo=>{
 *     res.json(p_dbInfo);
 * }).catch(p_error=>{next(p_error)});  
 * ```
 */
export class MssqlDatabaseManagement extends SequelizeDatabaseManagement implements WP_META_DB{
    
    constructor(p_dbInfo:DS_MSTR_ATT){
        super(p_dbInfo);
    }
   
    override async getDbInfo(){

        this.o_result = await super.query('SELECT name FROM sys.databases','',true);
        
        return this.o_result;
    }

    override async getTableInfo(p_dbNm:string,p_dsId?:number){

        let s_query = `SELECT  N'false' AS 'Check', CAST(A.TABLE_CATALOG AS NVARCHAR(200)) AS DB_NAME, CAST(A.TABLE_NAME AS NVARCHAR(200)) AS TBL_NM, 
            CAST(B.VALUE AS NVARCHAR(200)) AS TBL_DESC, ${p_dsId} AS DS_VIEW_ID 
            FROM INFORMATION_SCHEMA.TABLES A LEFT JOIN ::FN_LISTEXTENDEDPROPERTY(DEFAULT, N'USER', N'dbo', N'TABLE',DEFAULT,DEFAULT,DEFAULT) B 
            ON A.TABLE_NAME = B.objname collate Latin1_General_CI_AI
            WHERE A.TABLE_CATALOG = '${p_dbNm}'
            UNION ALL
            SELECT  N'false' AS 'Check', CAST(A.TABLE_CATALOG AS NVARCHAR(200)) AS DB_NAME, CAST(A.TABLE_NAME AS NVARCHAR(200)) AS TBL_NM, 
            CAST(B.VALUE AS NVARCHAR(200)) AS TBL_DESC, ${p_dsId} AS DS_VIEW_ID 
            FROM INFORMATION_SCHEMA.VIEWS A LEFT JOIN ::FN_LISTEXTENDEDPROPERTY(DEFAULT, N'USER', N'dbo', N'VIEW',DEFAULT,DEFAULT,DEFAULT) B 
            ON A.TABLE_NAME = B.objname collate Latin1_General_CI_AI
            WHERE A.TABLE_CATALOG = '${p_dbNm}'
            ORDER BY     1`;
                        
        this.o_result = await super.query(s_query,'',true);
        
        return this.o_result;
    }
    override async getColumnInfo(p_dbNm:string,p_tblNm:string){
        let s_query = `SELECT TABLE_CATALOG AS TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME, IS_NULLABLE, DATA_TYPE, DATA_TYPE AS COLUMN_TYPE 
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = '${p_tblNm}'
                        AND TABLE_CATALOG = '${p_dbNm}'`;

        this.o_result = await super.query(s_query,'',true);
        
        return this.o_result;
    }
    override async getPageData(p_offset:number,p_page:number,p_tableNm:string){
        let s_offset = (p_offset - 1) * p_page;
        let s_query = `SELECT * 
                        FROM ${p_tableNm} 
                        ORDER BY 1 
                        OFFSET ${s_offset} ROW FETCH NEXT ${p_page} ROW ONLY `;

        this.o_result = await this.query(s_query,p_tableNm);
        
        return this.o_result;
        
    }
    
}