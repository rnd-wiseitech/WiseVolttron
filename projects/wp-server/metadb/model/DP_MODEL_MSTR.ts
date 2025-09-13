
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get MODEL_ID(): number {
        return this.getDataValue('MODEL_ID');
    }
    @Column({
        allowNull: false,
        primaryKey: true,
        defaultValue:0
    })
    get MODEL_IDX(): number {
        return this.getDataValue('MODEL_IDX');
    }
    @Column
    ARG_ID?: number;                        
    
    @Column
    PROJ_ID?: number;                        
    
    @Column
    MODEL_NM?: string;                        
    
    @Column
    MODEL_PROGRESS?: number;                        
    
    @Column
    MODEL_RUN_TYPE?: string;                        
    
    @Column
    MODEL_EVAL_TYPE?: string;                        
    
    @Column
    MODEL_EVAL_RESULT?: string;                        
    
    @Column
    MODEL_USE_DATASET_ID?: number;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    MODEL_FEATURE_TYPE?: string;                        
    
    @Column
    MODEL_PART_OPTION?: string;                        
    
    @Column
    MODEL_ARG_PARAM?: string;                        
    
    @Column
    MODEL_OPTIMIZER_YN?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DATE?: string;                        
    
    @Column
    DESC?: string;                        
    
    @Column
    EXCUTE_RESULT?: string;                        
    
    @Column
    USER_PREPROCESSING?: string; 

    @Column
    DEPLOY_URL?: string; 

    @Column
    CUSTOM_YN?: string; 

    @Column
    ARG_TYPE?: string;  
    }

    
    
    export interface DP_MODEL_MSTR_ATT {
        MODEL_ID?: number;
    MODEL_IDX?: number;
    ARG_ID?: number;
    PROJ_ID?: number;
    MODEL_NM?: string;
    MODEL_PROGRESS?: number;
    MODEL_RUN_TYPE?: string;
    MODEL_EVAL_TYPE?: string;
    MODEL_EVAL_RESULT?: string;
    MODEL_USE_DATASET_ID?: number;
    DEL_YN?: string;
    MODEL_FEATURE_TYPE?: string;
    MODEL_PART_OPTION?: string;
    MODEL_ARG_PARAM?: string;
    MODEL_OPTIMIZER_YN?: string;
    REG_USER_NO?: number;
    REG_DATE?: string;
    DESC?: string;
    EXCUTE_RESULT?: string;
    USER_PREPROCESSING?: string;
    DEPLOY_URL?:string;
    CUSTOM_YN?: string; 
    ARG_TYPE?: string; 
    }
    