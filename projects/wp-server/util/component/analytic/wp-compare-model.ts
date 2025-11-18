import { COM_COMPARE_MODEL_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * 모델을 비교할 때 사용하는 컴포넌트
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpCompareModelData extends WpComponentProperty {
    constructor(p_data: COM_COMPARE_MODEL_ATT) {
        super('/job', p_data, 'model-compare', 'compare');
    }
    getColumnInfo(pSchema: any):any[] {
        return [];
    }
    hasEmptyValue() {
        let sFlag = false;
        this.o_data.compare_model.forEach((sModel:any) => {
            if (super.isEmpty(sModel.COM_UUID) && (super.isEmpty(sModel.MODEL_ID) || super.isEmpty(sModel.MODEL_IDX))) {
                sFlag = true;
            }
        });
        return sFlag;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                COM_ID : this.o_data.comId,
                dataArray: (this.o_data.compare_model as COM_COMPARE_MODEL_ATT['compare_model']).map(s_model => Object.assign({}, {
                    MODEL_ID: s_model.MODEL_ID, MODEL_IDX: s_model.MODEL_IDX, COM_UUID: s_model.COM_UUID, MODEL_NM: s_model.MODEL_NM, ARG_TYPE:s_model.ARG_TYPE
                })),
            }
        };
        return sParam;
    }
}