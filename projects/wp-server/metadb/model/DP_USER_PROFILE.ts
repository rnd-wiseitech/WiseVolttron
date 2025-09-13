
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_USER_PROFILE extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get USER_NO(): number {
        return this.getDataValue('USER_NO');
    }
    @Column
    USER_MODE?: string;                        
    
    @Column
    USER_INSTANCE?: string;                        
    
    @Column
    USER_AUTH?: string;                        
    
    @Column
    FOLDER_PATH?: string;   
    
    @Column
    JUPYTER_URL?: string;  
    
    @Column
    WPML_URL?: string;  
    
    @Column
    EXP_DT?: string;  
    
    @Column
    PAY_ID?: number;
    
    @Column
    APP_NO?: number; 
    
    }
    
    export interface DP_USER_PROFILE_ATT {
        [key: string]: any ;
        USER_NO?: number;
    USER_MODE?: string;
    USER_INSTANCE?: string;
    USER_AUTH?: string;
    FOLDER_PATH?: string;
    JUPYTER_URL?: string;
    EXP_DT?: string;
    PAY_ID?: string;
    APP_NO?: number;
    }
    