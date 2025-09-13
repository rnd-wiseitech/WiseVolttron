
import { Table, Model, Column } from "sequelize-typescript";
@Table
export class DP_ARG_MSTR extends Model {
        
    @Column({
        allowNull: false,
        primaryKey: true,
        
    })
    get ARG_ID(): number {
        return this.getDataValue('ARG_ID');
    }
    @Column
    ARG_TYPE?: string;                        
    
    @Column
    ARG_NM?: string;                        
    
    @Column
    ARG_DESC?: string;                        
    
    @Column
    ARG_FILE_NAME?: string;                        
    
    @Column
    USE_YN?: string;                        
    
    @Column
    STRUCTURE_YN?: string;                        

    @Column
    REG_USER_NO?: number;

    @Column
    USER_MODEL_YN?: 'Y' | 'N';

    @Column
    OPT_YN?: 'Y' | 'N';

    @Column
    ENSEMBLE_YN?: 'Y' | 'N';

    @Column
    FRAMEWORK_TYPE?: string;  
}

export interface DP_ARG_MSTR_ATT {
    ARG_ID?: number;
    ARG_TYPE?: string;
    ARG_NM?: string;
    ARG_DESC?: string;
    ARG_FILE_NAME?: string;
    USE_YN?: string;
    STRUCTURE_YN?: string;
    REG_USER_NO?: number;
    USER_MODEL_YN?: 'Y' | 'N';
    OPT_YN?: 'Y' | 'N';
    ENSEMBLE_YN?: 'Y' | 'N';
    FRAMEWORK_TYPE?: string;  
}
