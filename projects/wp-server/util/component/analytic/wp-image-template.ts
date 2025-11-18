import { COM_IMAGE_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 이미지 템플릿 컴포넌트.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpImageTemplateData extends WpComponentProperty {
    constructor(p_data: COM_IMAGE_ATT) {
        super('/job', p_data, 'image', 'image');
    }
    
    hasEmptyValue() {
        if (!this.o_data.fileName || !this.o_data.image_base64)
            return true;
        else 
            return false;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_data = this.getBodyData(p_userInfo, p_groupId, p_jobId, p_parentId, p_data) 
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: s_data
        };

        return sParam;
    }

    getBodyData(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_result = {
            userPrompt: this.o_data.user_prompt,
            set_var: JSON.stringify(this.o_data.set_var),
            workflowId: p_data['workflowId'],
            groupId: p_groupId,
            parentId: p_parentId,
            usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0]
        }

        return s_result
    }
}