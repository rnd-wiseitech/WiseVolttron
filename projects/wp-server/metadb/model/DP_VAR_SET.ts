
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_VAR_SET extends Model {
        
    @Column
    VAR_SET_ID?: number;                        
    
    }
    
    export interface DP_VAR_SET_ATT {
        VAR_SET_ID: number;
    
    }
    