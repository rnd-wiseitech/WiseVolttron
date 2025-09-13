
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_VAR_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get MODEL_ID(): number {
        return this.getDataValue('MODEL_ID');
    }                           
    
    @Column
    MODEL_IDX?: number;                        
    
    @Column
    VAR_NM?: string;                        
    
    @Column
    DS_VIEW_ID?: number;                        
    
    @Column
    TBL_NM?: string;                        
    
    @Column
    COL_NM?: string;                        
    
    @Column
    VAR_TARGET_YN?: string;                        
    
    @Column
    VAR_MAJOR_YN?: string;                        
    
    @Column
    VAR_CAPTION?: string;                        
    
    @Column
    VAR_TYPE?: string;                        
    
    @Column
    DATA_TYPE?: string;                        
    
    @Column
    VAR_IMPORT?: string;                        
    
    @Column
    VAR_RANK?: string;                        
    
    @Column
    VAR_UNI_CNT?: number;                        
    
    @Column
    VAR_MISS_CNT?: number;                        
    
    @Column
    VAR_MIN?: number;                        
    
    @Column
    VAR_MAX?: number;                        
    
    @Column
    VAR_MEAN?: number;                        
    
    @Column
    VAR_STD_DEV?: number;                        
    
    @Column
    VAR_1Q?: number;                        
    
    @Column
    VAR_2Q?: number;                        
    
    @Column
    VAR_3Q?: number;                        
    
    @Column
    VAR_4Q?: number;                        
    
    @Column
    VAR_DESC?: string;                        
    
    @Column
    VAR_PRE?: string;                        
    
    }
    
    export interface DP_VAR_MSTR_ATT {
        MODEL_ID: number;
    MODEL_IDX: number;
    VAR_NM: string;
    DS_VIEW_ID: number;
    TBL_NM: string;
    COL_NM: string;
    VAR_TARGET_YN?: string;
    VAR_MAJOR_YN?: string;
    VAR_CAPTION?: string;
    VAR_TYPE?: string;
    DATA_TYPE?: string;
    VAR_IMPORT?: string;
    VAR_RANK?: string;
    VAR_UNI_CNT?: number;
    VAR_MISS_CNT?: number;
    VAR_MIN?: number;
    VAR_MAX?: number;
    VAR_MEAN?: number;
    VAR_STD_DEV?: number;
    VAR_1Q?: number;
    VAR_2Q?: number;
    VAR_3Q?: number;
    VAR_4Q?: number;
    VAR_DESC?: string;
    VAR_PRE?: string;
    
    }
    