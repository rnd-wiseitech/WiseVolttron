
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_DATASET_USE_EX_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get DATASET_EX_ID(): number {
        return this.getDataValue('DATASET_EX_ID');
    }
    @Column
    DATASET_ID?: number;                        
    
    @Column
    DATASET_EX_NAME?: string;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    MODEL_IDX?: number;                        
    
    }
    
    export interface DP_MODEL_DATASET_USE_EX_MSTR_ATT {
        DATASET_EX_ID: number;
    DATASET_ID: number;
    DATASET_EX_NAME?: string;
    MODEL_ID?: number;
    MODEL_IDX?: number;
    
    }
    