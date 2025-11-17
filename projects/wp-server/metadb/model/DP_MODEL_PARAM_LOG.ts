
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_PARAM_LOG extends Model {
        
    @Column
    LOG_ID?: number;                        
    
    @Column
    LOG_SEQ?: number;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    ARG_ID?: number;                        
    
    @Column
    ARG_PARAMS?: string;                        
    
    @Column
    ARG_VARS?: string;                        
    
    }
    
    export interface DP_MODEL_PARAM_LOG_ATT {
        LOG_ID: number;
    LOG_SEQ: number;
    MODEL_ID: number;
    ARG_ID: number;
    ARG_PARAMS?: string;
    ARG_VARS: string;
    
    }
    