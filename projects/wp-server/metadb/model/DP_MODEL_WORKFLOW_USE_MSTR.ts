
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_MODEL_WORKFLOW_USE_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get MODEL_ID(): number {
        return this.getDataValue('MODEL_ID');
    }
    @Column({
        allowNull: true,        
    })
    get MODEL_IDX(): number {
        return this.getDataValue('MODEL_IDX');
    }                       
    
    @Column
    WF_ID?: string;                        
    
    @Column
    COM_UUID?: string;                        
    
    }
    
    export interface DP_MODEL_WORKFLOW_USE_MSTR_ATT {
    MODEL_ID?: number;
    MODEL_IDX?: number;
    WF_ID?: string;
    COM_ID?: string;
    COM_UUID?: string;
    }
    