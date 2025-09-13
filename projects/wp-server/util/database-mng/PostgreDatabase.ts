import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { SequelizeDatabaseManagement } from './SequelizeDatabase';

/**
 * Postgre 데이터베이스에 접근 할 수 있는 클래스.
 * 
 * {@link WP_META_DB | WP_META_DB} 인터페이스를 구현해야 DatabaseManagement를 이용하여 플랫폼 내에서 사용을 할 수 있다.
 * 
 * Sequelize 라이브러리를 이용할 수 있는 데이터베이스인 경우 {@link SequelizeDatabaseManagement | SequelizeDatabaseManagement}를 상속 받아 사용 하면 편리하다.
 * @example
 * ```ts
 * let s_PostgreMng = new PostgreDatabaseManagement() ;
 *
 * s_PostgreMng.select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where={},p_order:Array<any>=[], p_limit:any=null).then(p_dbInfo=>{
 *     res.json(p_dbInfo);
 * }).catch(p_error=>{next(p_error)});  
 * ```
 */
export class PostgreDatabaseManagement extends SequelizeDatabaseManagement implements WP_META_DB{

    public o_config:DS_MSTR_ATT;
    constructor(p_dbInfo:DS_MSTR_ATT){
        super(p_dbInfo);
        this.o_config = p_dbInfo
    }
    public async onInit() { 
    }

    override async getDbInfo(){
        let s_query = `SELECT SCHEMA_NAME AS "Database"
        FROM information_schema.schemata WHERE SCHEMA_NAME NOT IN ('information_schema', 'pg_catalog', 'pg_toast_temp_1', 'pg_temp_1', 'pg_toast');`
        this.o_result = await super.query(s_query,'',true);

        return this.o_result;
    }

    override async getTableInfo(p_dbNm:string,p_dsId?:number){
        let s_query = `
                SELECT TABLENAME AS TBL_NM, SCHEMANAME AS DB_NM, ${p_dsId} AS DS_VIEW_ID
                FROM PG_TABLES
                WHERE SCHEMANAME = '${this.o_config.OWNER_NM}' ORDER BY TBL_NM`;

        this.o_result = await super.query(s_query,'',true);
        this.o_result.forEach((p_value:any) => {
            p_value['TBL_NM'] = p_value['tbl_nm'];
            p_value['DB_NM'] = p_value['db_nm'];
            p_value['DS_VIEW_ID'] = p_value['ds_view_id'];
            delete p_value['tbl_nm']
            delete p_value['db_nm']
            delete p_value['ds_view_id']
        });
        return this.o_result;
    }
    override async getColumnInfo(p_dbNm:string,p_tblNm:string){
        let s_query = `SELECT
        C.TABLE_SCHEMA AS "TABLE_SCHEMA", 
        C.TABLE_NAME AS "TABLE_NAME",
    C.COLUMN_NAME AS "COLUMN_NAME",
    C.COLUMN_DEFAULT AS "COLUMN_DEFAULT", 
    C.IS_NULLABLE AS "IS_NULLABLE", 
    C.DATA_TYPE AS "DATA_TYPE",
    C.DATA_TYPE AS "COLUMN_TYPE",
        CASE
            WHEN p.contype = 'p' THEN 'Primary Key'
            WHEN p.contype = 'u' THEN 'Unique Key'
            WHEN p.contype = 'f' THEN 'Foreign Key'
        END AS "COLUMN_KEY"
    FROM
        information_schema.columns c
    LEFT JOIN (
        SELECT
            conname,
            connamespace,
            contype,
            conrelid,
            conkey
        FROM
            pg_constraint
    ) p ON (
        p.conrelid = (
            SELECT oid
            FROM pg_class
            WHERE relname = c.table_name
            AND relnamespace = (
                SELECT oid
                FROM pg_namespace
                WHERE nspname = c.table_schema
            )
        ) AND c.ordinal_position = ANY (p.conkey)
    )
    WHERE
        c.table_schema='${p_dbNm}' AND
        c.table_name = '${p_tblNm}'
    `
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