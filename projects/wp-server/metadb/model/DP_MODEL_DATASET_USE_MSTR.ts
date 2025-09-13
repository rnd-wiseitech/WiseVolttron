
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_DATASET_USE_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get DATASET_ID(): number {
        return this.getDataValue('DATASET_ID');
    }
    @Column
    DATASET_TYPE?: string;                        
    
    @Column
    DATASET_NAME?: string;                        
    
    @Column
    DATASET_REF_ID?: number;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    MODEL_IDX?: number;                        
    
    @Column
    PROJ_ID?: number;                        
    
    @Column
    HADOOP_PATH?: string;                        
    
    }
    
    export interface DP_MODEL_DATASET_USE_MSTR_ATT {
        DATASET_ID?: number;
    DATASET_TYPE?: string;
    DATASET_NAME?: string;
    DATASET_REF_ID?: number;
    MODEL_ID?: number;
    MODEL_IDX?: number;
    PROJ_ID?: number;
    HADOOP_PATH?: string;
    
    }
    