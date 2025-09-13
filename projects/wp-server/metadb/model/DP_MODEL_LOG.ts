
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_LOG extends Model {
        
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
        
    })
    get MODEL_IDX(): number {
        return this.getDataValue('MODEL_IDX');
    }                       
    
    @Column
    MODEL_SEQ?: number;                        
    
    @Column
    ARG_ID?: number;                        
    
    @Column
    ARG_PARAMS?: string;                        
    
    @Column
    ARG_VARS?: string;                        
    
    }
    
    export interface DP_MODEL_LOG_ATT {
        MODEL_ID: number;
    MODEL_IDX?: number;
    MODEL_SEQ: number;
    ARG_ID: number;
    ARG_PARAMS?: string;
    ARG_VARS: string;
    
    }
    