
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_USER_PAY extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get PAY_ID(): number {
        return this.getDataValue('PAY_ID');
    }
    @Column
    USER_NO?: number;                        
    
    @Column
    TYPE?: string;                        
    
    @Column
    PRODUCT?: string;                        
    
    @Column
    ORDER_ID?: string;                        
    
    @Column
    RECEIPT_ID?: string;                        
    
    @Column
    CANCEL_ID?: string;                        
    
    @Column
    PRICE?: string;                        
    
    @Column
    PAY_STATUS?: string;                        
    
    @Column
    PAY_TYPE?: string;                        
    
    @Column
    TRADE_DT?: string;                        
    
    @Column
    EXP_DT?: string;                        
    
    }
    
    export interface DP_USER_PAY_ATT {
        PAY_ID: number;
    USER_NO: number;
    TYPE?: string;
    PRODUCT?: string;
    ORDER_ID: string;
    RECEIPT_ID: string;
    CANCEL_ID?: string;
    PRICE?: string;
    PAY_STATUS?: string;
    PAY_TYPE?: string;
    TRADE_DT?: string;
    EXP_DT?: string;
    
    }
    