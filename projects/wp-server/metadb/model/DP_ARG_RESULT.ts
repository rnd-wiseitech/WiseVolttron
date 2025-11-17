
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_ARG_RESULT extends Model {
        
    @Column
    RUSELT_SEQ?: number;                        
    
    @Column
    PROJ_ID?: number;                        
    
    @Column
    MODEL_ID?: number;                        
    
    @Column
    ARG_ID?: number;                        
    
    @Column
    RESULT_NM?: string;                        
    
    }
    
    export interface DP_ARG_RESULT_ATT {
        RUSELT_SEQ: number;
    PROJ_ID: number;
    MODEL_ID: number;
    ARG_ID: number;
    RESULT_NM?: string;
    
    }
    