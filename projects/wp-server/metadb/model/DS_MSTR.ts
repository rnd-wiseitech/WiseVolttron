
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get DS_ID(): number {
        return this.getDataValue('DS_ID');
    }
    @Column
    DS_NM?: string;                        
    
    @Column
    DB_NM?: string;
    
    @Column
    TYPE?: string;                        
    
    @Column
    IP?: string;                        
    
    @Column
    USER_ID?: string;                        
    
    @Column
    PASSWD?: string;                        
    
    @Column
    PORT?: string;                        
    
    @Column
    DBMS_TYPE?: string;                        
    
    @Column
    OWNER_NM?: string;                        
    
    @Column
    DS_DESC?: string;                        
    
    @Column
    DS_CONNSTR?: string;                        
    
    @Column
    REG_DT?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    UPD_DT?: string;                        
    
    @Column
    UPD_USER_NO?: number;                        
    
    @Column
    RACIP?: string;                        
    
    @Column
    RACPORT?: string;                        
    
    @Column
    WF_YN?: string;                        
    
    @Column
    USER_AREA_YN?: string;                        
    
    @Column
    DEL_YN?: string;                        
    
    @Column
    DEFAULT_PATH?: string;  
    }
    
    export interface DS_MSTR_ATT {
        DS_ID: number;
    DS_NM?: string;
    DB_NM?: string;
    TYPE?: string;
    IP?: string;
    USER_ID?: string;
    PASSWD?: string;
    PORT?: string;
    DBMS_TYPE?: string;
    OWNER_NM?: string;
    DS_DESC?: string;
    DS_CONNSTR?: string;
    REG_DT?: string;
    REG_USER_NO?: number;
    UPD_DT?: string;
    UPD_USER_NO?: number;
    RACIP?: string;
    RACPORT?: string;
    WF_YN?: string;
    USER_AREA_YN?: string;
    DEL_YN?: string;
    DEFAULT_PATH?: string; 
    
    }
    