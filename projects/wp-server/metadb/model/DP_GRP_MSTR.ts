
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_GRP_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get GROUP_ID(): number {
        return this.getDataValue('GROUP_ID');
    }
    @Column
    P_GROUP_ID?: number;                        
    
    @Column
    GROUP_NAME?: string;                        
    
    @Column
    GROUP_DEPTH?: number;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    UPD_DT?: string;                        
    
    @Column
    GROUP_DESC?: string;                        
    
    }
    
    export interface DP_GRP_MSTR_ATT {
        GROUP_ID?: number;
    P_GROUP_ID?: number;
    GROUP_NAME?: string;
    GROUP_DEPTH?: number;
    DEL_YN?: string;
    REG_DT?: string;
    UPD_DT?: string;
    GROUP_DESC?: string;
    
    }
    