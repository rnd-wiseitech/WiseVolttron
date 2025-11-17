
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_AUTH_USER_MSTR extends Model {
        
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
    get DS_VIEW_AUTH_USER(): number {
        return this.getDataValue('DS_VIEW_AUTH_USER');
    }
    @Column
    IS_SELECT?: number;                        
    
    @Column
    IS_UPDATE?: number;                        
    
    @Column
    IS_DELETE?: number;                        
    
    }
    
    export interface DS_AUTH_USER_MSTR_ATT {
        DS_VIEW_ID: number;
    DS_VIEW_AUTH_USER: number;
    IS_SELECT?: number;
    IS_UPDATE?: number;
    IS_DELETE?: number;
    
    }
    