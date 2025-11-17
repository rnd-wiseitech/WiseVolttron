
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_VIEW_COL_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get DS_VIEW_ID(): number {
        return this.getDataValue('DS_VIEW_ID');
    }
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get VIEW_IDX(): number {
        return this.getDataValue('VIEW_IDX');
    }
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get TBL_NM(): string {
        return this.getDataValue('TBL_NM');
    }
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get COL_NM(): string {
        return this.getDataValue('COL_NM');
    }
    @Column
    COL_CAPTION?: string;                        
    
    @Column
    DATA_TYPE?: string;                        
    
    @Column
    LENGTH?: string;                        
    
    @Column
    PK_YN?: string;                        
    
    @Column
    COL_DESC?: string;                        
    
    @Column
    COL_EXPRESS?: string;                        
    
    @Column
    ALLOW_NULL?: number;                        
    
    @Column
    COL_ID?: number;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    UPD_USER_NO?: number;                        
    
    @Column
    UPD_DT?: string;                        
    
    @Column
    POPUP?: string;                        
    
    @Column
    COL_CNT?: number;                        
    
    @Column
    COL_UNI_CNT?: number;                        
    
    @Column
    COL_MISS_CNT?: number;                        
    
    @Column
    COL_OUT_CNT?: number;                        
    
    @Column
    COL_MIN?: number;                        
    
    @Column
    COL_MAX?: number;                        
    
    @Column
    COL_MEAN?: number;                        
    
    @Column
    COL_STD_DEV?: number;                        
    
    @Column
    COL_1Q?: number;                        
    
    @Column
    COL_2Q?: number;                        
    
    @Column
    COL_3Q?: number;                        
    
    @Column
    COL_DISTRIBUTION?: string;                        
    
    }
    
    export interface DS_VIEW_COL_MSTR_ATT {
        DS_VIEW_ID: number;
    VIEW_IDX: number;
    TBL_NM: string;
    COL_NM: string;
    COL_CAPTION?: string;
    DATA_TYPE?: string;
    LENGTH?: string;
    PK_YN?: string;
    COL_DESC?: string;
    COL_EXPRESS?: string;
    ALLOW_NULL?: number;
    COL_ID?: number;
    REG_USER_NO?: number;
    REG_DT?: string;
    UPD_USER_NO?: number;
    UPD_DT?: string;
    POPUP?: string;
    COL_CNT?: number;
    COL_UNI_CNT?: number;
    COL_MISS_CNT?: number;
    COL_OUT_CNT?: number;
    COL_MIN?: number;
    COL_MAX?: number;
    COL_MEAN?: number;
    COL_STD_DEV?: number;
    COL_1Q?: number;
    COL_2Q?: number;
    COL_3Q?: number;
    COL_DISTRIBUTION?: string;
    
    }
    