import { COM_IWORKFLOW_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * 워크플로우 연결 입력
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpIWorkflowData extends WpComponentProperty {
    constructor(p_data: COM_IWORKFLOW_ATT) {
        super('/job', p_data, 'workflow', "I-WORKFLOW");
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                workflowId: this.o_data.workflowId,
                filepath: this.o_data.filepath,
                param: '{}'
            }
        }

        return sParam;
    }
}