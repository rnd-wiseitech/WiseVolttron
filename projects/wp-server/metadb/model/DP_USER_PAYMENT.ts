    // 사용 안하는 테이블
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class DP_USER_PAYMENT extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    })
    get USER_NO(): number {
        return this.getDataValue('USER_NO');
    }                        
    
    @Column
    INTENT?: string;                        
    
    @Column
    ORDERID?: string;                        
    
    @Column
    PAYERID?: string;                        
    
    @Column
    PAYMENTID?: string;                        
    
    @Column
    PAYMENTTOKEN?: string;                        
    
    }
    
    export interface DP_USER_PAYMENT_ATT {
        USERNO?: number;
    INTENT?: string;
    ORDERID?: string;
    PAYERID?: string;
    PAYMENTID?: string;
    PAYMENTTOKEN?: string;
    
    }
    