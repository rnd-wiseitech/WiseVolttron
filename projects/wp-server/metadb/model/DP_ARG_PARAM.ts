
import {Table, Model,Column } from "sequelize-typescript";
@Table
export class DP_ARG_PARAM extends Model {
    
@Column({
    allowNull: false,
    primaryKey: true,
    
})
get ARG_ID(): number {
    return this.getDataValue('ARG_ID');
}
@Column
ARG_NM?: string;                        

@Column
PARAM?: string;

@Column
PARAM_NM?: string;                        

@Column
PARAM_DEFAULT?: string;                        

@Column
PARAM_VALUE?: string;                        

@Column
PARAM_DESC?: string;                        

@Column
USE_YN?: string;                                      

}

export interface DP_ARG_PARAM_ATT {
    ARG_ID?: number;
    ARG_NM?: string;  
    PARAM?: string; 
    PARAM_DEFAULT?: string;
    PARAM_VALUE?: string;
    PARAM_DESC?: string;
    USE_YN?: string;
}