import { COM_STORAGE_ATT } from "../../../wp-type/WP_COM_ATT";
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
export class WpStorageData extends WpComponentProperty {
    constructor(p_data:COM_STORAGE_ATT) {
        super('/job', p_data, 'input', "I-STORAGE");
    }
    hasEmptyValue() {
        if (super.isEmpty(this.o_data.DEFAULT_PATH) || super.isEmpty(this.o_data.filepath)) {
            return true;
        }
        return false;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {

        let s_filepath = this.o_data.filepath;
        // 로드한 워크플로우일 경우
        if(p_data.wf_regUsermode != undefined) {
            if(p_data.wf_regUserno == p_userInfo.USER_NO) {
                if(p_userInfo.USER_MODE == 'USER') {
                    s_filepath = `${p_userInfo.USER_NO}/${this.o_data.filepath}`
                }
            } else {
                if (p_data.wf_regUsermode == 'USER') {
                    s_filepath = `${String(p_data.wf_regUserno)}/${this.o_data.filepath}`
                }
            }
        // 아닐 경우
        } else {
            if(p_userInfo.USER_MODE == 'USER') {
                s_filepath = `${String(p_userInfo.USER_NO)}/${this.o_data.filepath}`
            }
        }

        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                filename: this.o_data.filename,
                DEFAULT_PATH: this.o_data.DEFAULT_PATH,
                filepath: s_filepath,
            }
        }

        return sParam;
    }
}