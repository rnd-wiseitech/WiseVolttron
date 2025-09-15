
import {Table, Model,Column } from "sequelize-typescript";
@Table
export class COM_MSTR extends Model {

    @Column
    ID?: number;                        
    
    @Column
    TYPE?: string;                        
    
    @Column
    CATEGORY?: string;                        
    
    @Column
    NAME?: string;                        
    
    @Column
    DATA?: string;                        
    
    @Column
    IMG_PATH?: string;                        
    
    @Column
    URL?: string;                        
    
    @Column
    DESC?: string;                        
    
    @Column
    DISPLAY?: string;                        

    @Column
    CONN_LIMIT?: number;
}

export interface COM_MSTR_ATT {
    ID?: number;
    TYPE?: string;
    CATEGORY?: string;
    NAME?: string;
    DATA?: string;
    IMG_PATH?: string;
    URL?: string;
    DESC?: string;
    DISPLAY?: string;
    CONN_LIMIT?: number;
}