
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class JOB_SUB_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get ID(): string {
        return this.getDataValue('ID');
    }                               
    
    @Column
    JOB_ID?: string;                        
    
    @Column
    P_JOB_ID?: string;                        
    
    @Column
    COM_ID?: string;                        
    
    @Column
    STATUS?: number;                        
    
    @Column
    ST_DT?: string;                        
    
    @Column
    END_DT?: string;                        
    
    @Column
    DATA?: string;                        
    
    @Column
    ERROR_MSG?: string;                        
    
    @Column
    SCH_ID?: number;                        
    
    @Column
    LOG_ID?: number;                        
    
    }
    
    export interface JOB_SUB_MSTR_ATT {
        ID: string;
    JOB_ID?: string;
    P_JOB_ID?: string;
    COM_ID?: string;
    STATUS?: number;
    ST_DT?: string;
    END_DT?: string;
    DATA?: string;
    ERROR_MSG?: string;
    SCH_ID?: number;
    LOG_ID?: number;
    
    }
    