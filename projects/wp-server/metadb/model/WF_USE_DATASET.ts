
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class WF_USE_DATASET extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get WF_ID(): number {
        return this.getDataValue('WF_ID');
    }                        
    
    @Column
    WF_NM?: string;                        
    
    @Column
    DS_VIEW_ID?: number;                        
    
    @Column
    DS_VIEW_IDX?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    REG_USER?: number;                        
    
    @Column
    OUTPUT_YN?: string;                        
    
    }
    
    export interface WF_USE_DATASET_ATT {
        WF_ID: number;
    WF_NM: string;
    DS_VIEW_ID: number;
    DS_VIEW_IDX: number;
    REG_DT?: string;
    REG_USER?: number;
    OUTPUT_YN?: string;
    
    }
    