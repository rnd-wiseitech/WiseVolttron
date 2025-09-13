
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_SCH_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get SCH_ID(): number {
        return this.getDataValue('SCH_ID');
    }
    @Column
    PROJ_ID?: number;                        
    
    @Column
    SCH_NM?: string;                        
    
    @Column
    SCH_STATUS?: string;                        
    
    @Column
    SCH_CRON?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    SCH_ST?: string;                        
    
    @Column
    SCH_ED?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DATE?: string;                        
    
    @Column
    SCH_TERM?: string;                        
    
    @Column
    SCH_TERM_VALUE?: number;                        
    
    @Column
    RELEARN_YN?: string;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    DATASET_ID?: number;                        
    
    @Column
    STORAGE_NAME?: string;                        
    
    @Column
    STORAGE_FILETYPE?: string;                        
    
    @Column
    STORAGE_MODE?: string;                        
    
    @Column
    DS_ID?: number;                        
    
    @Column
    HIVE_DB_NM?: string;                        
    
    }
    
    export interface DP_SCH_MSTR_ATT {
        SCH_ID: number;
    PROJ_ID?: number;
    SCH_NM?: string;
    SCH_STATUS?: string;
    SCH_CRON?: string;
    DEL_YN?: string;
    SCH_ST?: string;
    SCH_ED?: string;
    REG_USER_NO?: number;
    REG_DATE?: string;
    SCH_TERM?: string;
    SCH_TERM_VALUE?: number;
    RELEARN_YN?: string;
    MODEL_ID?: number;
    DATASET_ID?: number;
    STORAGE_NAME?: string;
    STORAGE_FILETYPE?: string;
    STORAGE_MODE?: string;
    DS_ID?: number;
    HIVE_DB_NM?: string;
    
    }
    