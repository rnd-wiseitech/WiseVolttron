import {Table, Model,Column } from "sequelize-typescript";
@Table
export class WF_COM_MSTR extends Model {
    
@Column({
    allowNull: false,
    primaryKey: true
})
get WF_ID(): number {
    return this.getDataValue('WF_ID');
}
@Column({
    allowNull: false,
    primaryKey: true,
    
})
get COM_ID(): string {
    return this.getDataValue('COM_UUID');
}
    @Column
    COM_UUID?: string;

    @Column
    COM_TYPE?: string;

    @Column
    WF_DATA?: string;

    @Column
    REG_DT?: string;

    @Column
    REG_USER?: number;

}

export interface WF_COM_MSTR_ATT {
    WF_ID: number;
    COM_UUID: string;
    COM_ID: string;
    COM_TYPE?: string;
    WF_DATA?: string;
    REG_DT?: string;
    REG_USER?: number;

}