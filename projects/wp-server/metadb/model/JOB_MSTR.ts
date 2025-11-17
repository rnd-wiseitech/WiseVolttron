
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class JOB_MSTR extends Model {
                             
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get ID(): string {
        return this.getDataValue('ID');
    }              
    @Column
    NAME?: string;                        
    
    @Column
    STATUS?: number;                        
    
    @Column
    ST_DT?: string;                        
    
    @Column
    END_DT?: string;                        
    
    @Column
    DESC?: string;                        
    
    @Column
    USER_NO?: string;                        
    
    @Column
    ERROR_MSG?: string;                        
    
    @Column
    PROCESS_ID?: number;       

    @Column
    LOCATION?: string;

    @Column
    SCH_ID?: number;       

    @Column
    LOG_ID?: number;

    }
    
    export interface JOB_MSTR_ATT {
        ID?: string;
        NAME?: string;
        STATUS?: number;
        ST_DT?: string;
        END_DT?: string;
        DESC?: string;
        USER_NO?: string;
        ERROR_MSG?: string;
        PROCESS_ID?: number;
        LOCATION?: string;
        SCH_ID?: number;  
        LOG_ID?: number;
    }
    