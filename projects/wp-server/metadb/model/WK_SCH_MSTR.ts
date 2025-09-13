
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class WK_SCH_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get SCH_ID(): number {
        return this.getDataValue('SCH_ID');
    }
    @Column
    SCH_NM?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    SCH_STATUS?: string;                        
    
    @Column
    ST_DT?: string;                        
    
    @Column
    ED_DT?: string;                        
    
    @Column
    CRON_PARAM?: string;                        
    
    @Column
    CRON_INFO?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    WF_ID?: number;     
    
    @Column
    USE_CORE?: number;  
    
    @Column
    USE_MEMORY?: string;  

    @Column
    REALTIME_INFO?: string;  
    }
    
    export interface WK_SCH_MSTR_ATT {
        SCH_ID?: number;
    SCH_NM?: string;
    DEL_YN?: string;
    SCH_STATUS?: string;
    ST_DT?: string;
    ED_DT?: string;
    CRON_PARAM?: string;
    CRON_INFO?: string;
    REG_USER_NO?: number;
    REG_DT?: string;
    WF_ID?: number;
    USE_CORE?: number;
    USE_MEMORY?: string;
    REALTIME_INFO?: string;
    
    }
    