
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_VIEW_HISTORY extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get H_ID(): number {
        return this.getDataValue('H_ID');
    }
    @Column
    H_TYPE?: string;                        
    
    @Column
    DS_VIEW_ID?: number;                        
    
    @Column
    OPERATION?: string;                        
    
    @Column
    PRE_VALUE?: string;                        
    
    @Column
    CUR_VALUE?: string;                        
    
    @Column
    UPD_DT?: string;                        
    
    @Column
    UPD_USER_ID?: string;                        
    
    @Column
    HISTORY_DESC?: string;                        
    
    @Column
    SCH_ID?: number;                        
    
    @Column
    LOG_ID?: number;                        
    
    }
    
    export interface DS_VIEW_HISTORY_ATT {
        H_ID?: number;
    H_TYPE?: string;
    DS_VIEW_ID?: number;
    OPERATION?: string;
    PRE_VALUE?: string;
    CUR_VALUE?: string;
    UPD_DT?: string;
    UPD_USER_ID?: string;
    HISTORY_DESC?: string;
    SCH_ID?: number;
    LOG_ID?: number;
    
    }
    