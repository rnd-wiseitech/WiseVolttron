
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_WF_JOB_PARAM_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get DS_VIEW_ID(): number {
        return this.getDataValue('DS_VIEW_ID');
    }                       
    
    @Column
    JOB_INFO?: string;                        
    
    @Column
    GROUP_ID?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    REG_DT?: string;                        
    
    }
    
    export interface DS_WF_JOB_PARAM_MSTR_ATT {
        DS_VIEW_ID?: number;
    JOB_INFO?: string;
    GROUP_ID?: string;
    REG_USER_NO?: number;
    REG_DT?: string;
    
    }
    