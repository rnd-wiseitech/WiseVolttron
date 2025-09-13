
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_USER_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get USER_NO(): number {
        return this.getDataValue('USER_NO');
    }
    @Column
    GRP_ID?: number;                        
    
    @Column
    USER_ID?: string;          
    
    @Column
    EMAIL?: string;                    
    
    @Column
    PASSWD?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    USER_NAME?: string;                        
    
    @Column
    COMPANY?: string;                        
    
    @Column
    AGREE_YN?: string;                        
    
    @Column
    REG_DATE?: string;                        
    
    @Column
    LOGIN_FAIL_CNT?: number;                        
    
    }
    
    export interface DP_USER_MSTR_ATT {
        USER_NO?: number;
    GRP_ID?: number;
    USER_ID?: string;
    EMAIL?: string;
    PASSWD?: string;
    DEL_YN?: string;
    USER_NAME?: string;
    COMPANY?: string;
    AGREE_YN?: string;
    REG_DATE?: string;
    LOGIN_FAIL_CNT?: number;
    
    }
    