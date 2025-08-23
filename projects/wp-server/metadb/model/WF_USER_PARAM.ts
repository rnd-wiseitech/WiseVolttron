
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class WF_USER_PARAM extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get PARAM_ID(): number {
        return this.getDataValue('PARAM_ID');
    }
    @Column
    PARAM_NM?: string;                        
    
    @Column
    PARAM_VALUE?: string;                        
    
    @Column
    PARAM_FORMAT?: string;                        
    
    @Column
    REG_USER?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    REG_DT?: string;                        
    
    }
    
    export interface WF_USER_PARAM_ATT {
        PARAM_ID: number;
    PARAM_NM?: string;
    PARAM_VALUE?: string;
    PARAM_FORMAT?: string;
    REG_USER?: string;
    DEL_YN?: string;
    REG_DT?: string;
    PARAM_JSON?: string;
    
    }
    