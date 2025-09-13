
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_VIEW_TBL_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get DS_VIEW_ID(): number {
        return this.getDataValue('DS_VIEW_ID');
    }
    @Column
    VIEW_IDX?: number;                        
    
    @Column
    TBL_NM?: string;                        
    
    @Column
    TBL_CAPTION?: string;                        
    
    @Column
    TBL_DESC?: string;                        
    
    @Column
    TBL_TYPE?: string;                        
    
    @Column
    TBL_GRP_NM?: string;                        
    
    @Column
    TBL_LOG?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    STATUS_CODE?: number;                        
    
    @Column
    QUERY_DEFINITION?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    UPD_USER_NO?: number;                        
    
    @Column
    UPD_DT?: string;                        
    
    @Column
    TBL_CORR?: number;                        
    
    @Column
    HIVE_TABLE?: string;                        
    
    @Column
    HIVE_DB?: string;                        
    
    }
    
    export interface DS_VIEW_TBL_MSTR_ATT {
        DS_VIEW_ID: number;
    VIEW_IDX?: number;
    TBL_NM?: string;
    TBL_CAPTION?: string;
    TBL_DESC?: string;
    TBL_TYPE?: string;
    TBL_GRP_NM?: string;
    TBL_LOG?: string;
    DEL_YN?: string;
    STATUS_CODE?: number;
    QUERY_DEFINITION?: string;
    REG_USER_NO?: number;
    REG_DT?: string;
    UPD_USER_NO?: number;
    UPD_DT?: string;
    TBL_CORR?: number;
    HIVE_TABLE?: string;
    HIVE_DB?: string;
    
    }
    