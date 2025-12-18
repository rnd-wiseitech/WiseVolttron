import { COM_VOLTTRON_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * HDFS를 통해 폴더 및 파일을 입력데이터로 사용할 때 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpVolttron extends WpComponentProperty {
    constructor(p_data:COM_VOLTTRON_ATT) {
        super('/job', p_data, 'input', "I-VOLTTRON");
    }
    hasEmptyValue() {
        if (super.isEmpty(this.o_data.topic) ) {
            return true;
        }
        return false;
    }
    
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[]) {
            let sParam:any = {
                action: this.o_action,
                method: this.o_method,
                jobId: p_jobId,
                data : {
                    topic: this.o_data.topic,
                }
            }
            return sParam;
        }
}