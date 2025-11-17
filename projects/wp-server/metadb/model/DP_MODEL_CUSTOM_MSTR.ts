
import {Table, Model,Column } from "sequelize-typescript";
@Table
export class DP_MODEL_CUSTOM_MSTR extends Model {
    
@Column({
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
})
get CUSTOM_ID(): number {
    return this.getDataValue('CUSTOM_ID');
}

@Column
MODEL_ID?: number; 

@Column
MODEL_NM?: string;                        

@Column
ARG_TYPE?: string;                        

@Column
MODEL_FILE?: string;                        

@Column
SCALE_FILE?: string;                        

@Column
ENCODER_FILE?: string;             

@Column
EXAMPLE_FILE?: string;                        

@Column
REG_USER_NO?: string;                        

@Column
DEL_YN?: string;                       

@Column
REG_DATE?: string; 

@Column
MODEL_DESC?: string; 

@Column
FRAMEWORK_TYPE?: string; 

}

export interface DP_MODEL_CUSTOM_MSTR_ATT {
    CUSTOM_ID?: number;
    MODEL_ID?: number;
    MODEL_NM?: string;
    ARG_TYPE?: string;
    MODEL_FILE?: string;
    SCALE_FILE?: string;
    ENCODER_FILE?: string;
    EXAMPLE_FILE?: string;      
    REG_USER_NO?: string;     
    DEL_YN?: string;     
    REG_DATE?: string; 
    MODEL_DESC?: string; 
    FRAMEWORK_TYPE?: string;
}
 