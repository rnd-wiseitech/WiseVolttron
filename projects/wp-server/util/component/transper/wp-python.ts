import { COM_PYTHON_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * Python 코드를 실행한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpPythonData extends WpComponentProperty {    
    constructor(p_data:COM_PYTHON_ATT){
        super('/job', p_data, 'transform', 'python');        
    }

    getColumnInfo(pSchema:any){
        if (this.o_data.popup_data.result && this.o_data.popup_data.result.schema && this.o_data.popup_data.result.schema.length > 0) {
            return this.o_data.popup_data.result.schema;
        } else {
            return pSchema;
        }
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                value: this.o_data.value
            }
        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}