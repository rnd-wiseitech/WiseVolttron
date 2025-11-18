import { COM_SELECT_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 컬럼을 선택 한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpSelectData extends WpComponentProperty {    
    constructor(p_data:COM_SELECT_ATT){
        super('/job', p_data, 'transform', 'select');        
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema:any = [];
        if (this.o_data.column.length > 0) {
            pSchema.forEach((sCol:any) => {
                if (this.o_data.column.includes(sCol.name)) {
                    sDerivedSchema.push(sCol);
                }
            });
        }
        return sDerivedSchema;
    }

    hasEmptyValue(){
        if (this.o_data.column.length == 0){
            return true;
        }
        return false;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                column: this.o_data.column
            }
        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }

    // getUserDataParams() {
    //     return this.o_data;
    // }
}