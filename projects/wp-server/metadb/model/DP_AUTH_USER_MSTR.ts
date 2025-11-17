
import {Table, Model,Column } from "sequelize-typescript";
@Table
export class DP_AUTH_USER_MSTR extends Model {
    
@Column({
    allowNull: true,
    primaryKey: true,
    autoIncrement: false
})
get DATA_ID(): number {
    return this.getDataValue('DATA_ID');
}

@Column
SHARE_TYPE?: string;       

@Column
OWNER_USER_NO?: number;                        

@Column
SHARER_USER_NO?: number;                        
}

export interface DP_AUTH_USER_MSTR_ATT {
DATA_ID?: number;
SHARE_TYPE?: string;    
OWNER_USER_NO?: number;
SHARER_USER_NO?: number;                       
}
