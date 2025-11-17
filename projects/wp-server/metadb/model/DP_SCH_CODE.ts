
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_SCH_CODE extends Model {
        
    @Column
    SCH_STATUS_CD?: number;                        
    
    @Column
    SCH_STATUS_NM?: string;                        
    
    }
    
    export interface DP_SCH_CODE_ATT {
        SCH_STATUS_CD?: number;
    SCH_STATUS_NM?: string;
    
    }
    