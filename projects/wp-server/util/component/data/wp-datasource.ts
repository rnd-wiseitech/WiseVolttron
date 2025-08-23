import { COM_DATASOURCE_ATT, COM_ODATASOURCE_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * Platform에 등록된 데이터셋을 입력데이터로 사용할 때 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpDataSourceData extends WpComponentProperty {
    constructor(p_data:COM_DATASOURCE_ATT){
        super('/job', p_data, 'input', "I-DATASOURCE");
    }
    hasEmptyValue(){
        if (super.isEmpty(this.o_data.filename)){
            return true;
        }
        return false;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                // load: this.o_data.load,
                filename: this.o_data.filename,
                filetype: this.o_data.filetype,
                fileseq: this.o_data.fileseq,
                dataUserno: this.o_data.dataUserno,
                workflowId: p_data['workflowId']
            },
        }
        return sParam;
    }

}
/**
 * WorkFlow에서 사용하는 컴포넌트
 * Platform에 등록된 데이터셋을 출력데이터로 사용할 때 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpODataSourceData extends WpComponentProperty {
    constructor(p_data:COM_ODATASOURCE_ATT){
        super('/job', p_data, 'output', 'O-DATASOURCE');
    }
    hasEmptyValue(){
        if (this.o_data.saveOpt == 'new' && super.isEmpty(this.o_data.new_filename)){
            return true;
        }
        if (this.o_data.saveOpt == 'overwrite' && super.isEmpty(this.o_data.overwrite_filename)){
            return true;
        }
        return false;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any){
        // deltalake 저장 옵션 추가 (append)
        let sParam: any = {

            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                filetype: this.o_data.filetype,
                filename: p_data['filename'],
                dataUserno: this.o_data.dataUserno,
                workflowId: p_data['workflowId'],
                saveOpt : this.o_data['saveOpt']
            }
        }

        if (this.o_data.saveOpt == 'new') {
            sParam.data.dataUserno = p_userInfo.USER_NO;
        } 

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        if (this.o_data.streamInputJobList.length > 0) {
            sParam.data.streamingJobId = this.o_data.streamInputJobList;
        }
        
        return sParam;
    }
}