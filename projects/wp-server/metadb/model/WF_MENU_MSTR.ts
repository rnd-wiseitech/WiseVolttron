
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class WF_MENU_MSTR extends Model {
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get MENU_ID(): number {
        return this.getDataValue('MENU_ID');
    }              
    
    @Column
    P_MENU_ID?: number;                        
    
    @Column
    MENU_NAME?: string;                        
    
    @Column
    MENU_VNAME?: string;                        
    
    @Column
    VISIBLE?: number;                        
    
    @Column
    TYPE?: string;                        
    
    @Column
    URL?: string;                        
    
    @Column
    ADMIN_YN?: string;                        
    
    @Column
    CLASS_NAME?: string;    
    }
    
    
    export interface WF_MENU_MSTR_ATT {
        MENU_ID: number;
    P_MENU_ID?: number;
    MENU_NAME?: string;
    MENU_VNAME?: string;
    VISIBLE?: number;
    TYPE?: string;
    URL?: string;
    ADMIN_YN?: string;
    CLASS_NAME?: string;
    
    }
    