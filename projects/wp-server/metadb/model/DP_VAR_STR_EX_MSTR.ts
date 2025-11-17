
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_VAR_STR_EX_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get MODEL_ID(): number {
        return this.getDataValue('MODEL_ID');
    }                      
    
    @Column
    MODEL_IDX?: number;                        
    
    @Column
    TBL_NM?: string;                        
    
    @Column
    COL_NM?: string;                        
    
    @Column
    VAR_NM?: string;                        
    
    @Column
    VAR_TARGET_YN?: string;                        
    
    @Column
    LABEL_VAL?: number;                        
    
    }
    
    export interface DP_VAR_STR_EX_MSTR_ATT {
        MODEL_ID: number;
    MODEL_IDX?: number;
    TBL_NM: string;
    COL_NM: string;
    VAR_NM: string;
    VAR_TARGET_YN?: string;
    LABEL_VAL?: number;
    
    }
    