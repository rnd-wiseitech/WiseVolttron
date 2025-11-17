
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_ARG_FEATURE_LOG extends Model {
        
    @Column
    LOG_ID?: number;                        
    
    @Column
    LOG_SEQ?: number;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    FEATURE_IMPORTANCE?: string;                        
    
    }
    
    export interface DP_MODEL_ARG_FEATURE_LOG_ATT {
        LOG_ID: number;
    LOG_SEQ: number;
    MODEL_ID: number;
    FEATURE_IMPORTANCE?: string;
    
    }
    