
import {Table, Model,Column } from "sequelize-typescript";
@Table
export class WK_SCH_LOG extends Model {
    
@Column({
    allowNull: false,
    primaryKey: true
})
get SCH_ID(): number {
    return this.getDataValue('SCH_ID');
}
                       

@Column
LOG_ID?: string;                        

@Column
LOG_STATUS?: string;                        

@Column
ST_DT?: string;                        

@Column
ED_DT?: string;                        

@Column
ERROR_MSG?: string;                        

@Column
ANALYTIC_RESULT?: string;                      

@Column
DEPLOY_RESULT?: string;
}

export interface WK_SCH_LOG_ATT {
SCH_ID?: number;
LOG_ID?: number;
LOG_STATUS?: number;
ST_DT?: string;
ED_DT?: string;
ERROR_MSG?: string;
ANALYTIC_RESULT?: string;  
DEPLOY_RESULT?: string;
}
