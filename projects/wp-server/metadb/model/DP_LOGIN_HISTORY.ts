
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_LOGIN_HISTORY extends Model {

    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get LOG_ID(): number {
        return this.getDataValue('LOG_ID');
    }
    @Column
    USER_NO?: number;                        
    
    @Column
    TYPE?: string;                        
    
    @Column
    IP?: string;                        
    
    @Column
    REG_DT?: string;                        
    
    }
    
    export interface DP_LOGIN_HISTORY_ATT {
        USER_NO?: number;
    TYPE?: string;
    IP?: string;
    REG_DT?: string;
    
    }
    