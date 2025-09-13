import { Sequelize,Model } from 'sequelize-typescript';
import { DS_MSTR_ATT } from '../../metadb/model/DS_MSTR';
import { WP_META_DB } from '../../wp-type/WP_META_DB';
import { MssqlDatabaseManagement } from './MssqlDatabase';
import { MysqlDatabaseManagement } from './MysqlDatabase';
import { OracleDatabaseManagement } from './OracleDatabase';
import { SequelizeDatabaseManagement } from './SequelizeDatabase';
import { PostgreDatabaseManagement } from './PostgreDatabase';
// 티베로 사용시 주석해제 시작
// import { TiberoDatabaseManagement } from './TiberoDatabase';
// 티베로 사용시 주석해제 끝

/**
 * 데이터베이스에 접근 할 수 있는 클래스.
 * 
 * {@link DS_MSTR_ATT | DS_MSTR} 형식에 맞게 접속 정보를 전달하면, 데이터 베이스에 접근 할 수 있다.
 * 
 * @example
 * ```ts
 * let s_dbMng = new DatabaseManagement(p_ds_mstr);
 * 
 * s_dbMng.query(s_query,'',true).then(p_queryResult=>{
 *  res.json(p_queryResult);
 * });  
 * ```
 */

export class DatabaseManagement implements WP_META_DB{
    // WP_META_DB var
    public o_mstr:any;
    public o_connection:Sequelize | any;
    public o_result?:any;

    public o_query:string;
    public o_dbMng:WP_META_DB;

    constructor(p_config:DS_MSTR_ATT){
        if(p_config.DBMS_TYPE == 'oracle'){
            this.o_dbMng = new OracleDatabaseManagement(p_config);
        }else if (['mysql','mssql','db2'].includes(p_config.DBMS_TYPE)){
            if(p_config.DBMS_TYPE == 'mysql'){
                this.o_dbMng = new MysqlDatabaseManagement(p_config);
            }else if(p_config.DBMS_TYPE == 'mssql'){
                this.o_dbMng = new MssqlDatabaseManagement(p_config);                
            }else if(p_config.DBMS_TYPE == 'db2'){
                this.o_dbMng = new SequelizeDatabaseManagement(p_config);
            }
        } else if (['postgresql'].includes(p_config.DBMS_TYPE)) {
            this.o_dbMng = new PostgreDatabaseManagement(p_config);
        } 
        // else if (['hive'].includes(p_config.DBMS_TYPE)) {
        //     this.o_dbMng = new HiveDatabaseManagement();
        // }
        else if (['postgre'].includes(p_config.DBMS_TYPE)){
            this.o_dbMng = new PostgreDatabaseManagement(p_config);
        } 
        // else if (['tibero'].includes(p_config.DBMS_TYPE)){
        //     // 티베로 사용시 주석해제 시작
        //     this.o_dbMng = new TiberoDatabaseManagement(p_config);
        //     // 티베로 사용시 주석해제 끝
        // }
        
    }
    // oracle 연결을 위해 추가
    public async onInit() { 
        await this.o_dbMng.onInit();
    }
    getConnection():Sequelize{
        return this.o_dbMng.getConnection();
    }
    async getDbInfo(p_userMode?: string, p_userNo?: string){
        return this.o_dbMng.getDbInfo(p_userMode,p_userNo);
    }

    async getTableInfo(p_dbNm:string,p_dsId?:number,p_userMode?: string, p_userNo?: string){
        return this.o_dbMng.getTableInfo(p_dbNm,p_dsId,p_userMode,p_userNo);
    }
    async getColumnInfo(p_dbNm:string,p_tblNm:string){
        return this.o_dbMng.getColumnInfo(p_dbNm,p_tblNm);
    }
    async getRowCount(p_tableNm:string){
        return this.o_dbMng.getRowCount(p_tableNm);
    }
    async getPageData(p_offset:number,p_page:number,p_tableNm:string){
        return this.o_dbMng.getPageData(p_offset,p_page,p_tableNm);
    }
    // #28. LIMIT 추가
    public async select(p_tableNm:string,p_colNmArr:Array<string>=[], p_where:any={},p_order:Array<any>=[], p_limit:any=null){                
        return this.o_dbMng.select(p_tableNm,p_colNmArr, p_where,p_order, p_limit);
    }
    public async insert(p_tableNm:string,p_colNmArr:any,pBool=false){
        return this.o_dbMng.insert(p_tableNm,p_colNmArr, pBool);
    }
    public async update(p_tableNm:string,p_colNmArr:any={}, p_where:any){
        return this.o_dbMng.update(p_tableNm,p_colNmArr, p_where);
    }
    public async delete(p_tableNm:string,p_where:any){
        return this.o_dbMng.delete(p_tableNm,p_where);
    }
    public async query(p_query:string,p_tableNm:string,p_option?:any){
        return this.o_dbMng.query(p_query,p_tableNm,p_option);
    }
    public async defineModel(dbNm:string,s_tableNm:string){
        return this.o_dbMng.defineModel(dbNm,s_tableNm);
    }
}