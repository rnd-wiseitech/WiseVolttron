
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class WF_MSTR extends Model {
        
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
    WF_DIAGRAM?: string;                        
    
    @Column
    STATUS?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    REG_USER?: number;                        
    
    @Column
    WF_TYPE?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    WF_PATH?: string;    
    }
    
    export interface WF_MSTR_ATT {
        WF_ID: number;
    WF_NM?: string;
    WF_DIAGRAM?: string;
    STATUS?: number;
    REG_DT?: string;
    REG_USER?: number;
    WF_TYPE?: string;
    DEL_YN?: string;
    WF_PATH?: string
    
    }
    