
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DS_VIEW_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get DS_VIEW_ID(): number {
        return this.getDataValue('DS_VIEW_ID');
    }
    @Column
    DS_ID?: number;                        
    
    @Column
    DS_VIEW_NM?: string;                        
    
    @Column
    DS_VIEW_DESC?: string;                        
    
    @Column
    REG_USER_NO?: number;                        
    
    @Column
    DS_FILE_FORMAT?: string;                        
    
    }
    
    export interface DS_VIEW_MSTR_ATT {
        DS_VIEW_ID?: number;
    DS_ID: number;
    DS_VIEW_NM?: string;
    DS_VIEW_DESC?: string;
    REG_USER_NO?: number;
    DS_FILE_FORMAT?: string;
    
    }
    