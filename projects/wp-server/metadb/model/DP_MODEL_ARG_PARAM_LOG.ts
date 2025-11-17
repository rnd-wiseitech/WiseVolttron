
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_ARG_PARAM_LOG extends Model {
        
    @Column
    MODEL_ID?: number;                        
    
    @Column
    LOG_ID?: number;                        
    
    @Column
    LOG_SEQ?: number;                        
    
    @Column
    ARG_ID?: number;                        
    
    @Column
    ARG_PARAMS?: string;                        
    
    @Column
    ARG_VARS?: string;                        
    
    }
    
    export interface DP_MODEL_ARG_PARAM_LOG_ATT {
        MODEL_ID: number;
    LOG_ID: number;
    LOG_SEQ: number;
    ARG_ID: number;
    ARG_PARAMS?: string;
    ARG_VARS: string;
    
    }
    