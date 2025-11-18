import { COM_FILTER_MODEL_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 컴포넌트
 * 성능이 좋은 모델을 필터해서 저장하기 위해 사용하는 컴포넌트
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpFilterModelData extends WpComponentProperty {
    constructor(p_data: COM_FILTER_MODEL_ATT){
        super('/job', p_data, 'model-filter', 'filter');
    }
    getColumnInfo(pSchema: any): any[] {
        return [];
    }
    hasEmptyValue() {
        let sFlag = false;
        // if (this.o_data.filterOpt === '' && this.o_data.saveOpt === '') {
        //     sFlag = true;
        // }
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
                filterOpt: this.o_data.filterOpt,
                modelType: this.o_data.modelType,
                // overwriteModel: this.o_data.overwriteModel,
                dataArray: [],
                // saveOpt: this.o_data.saveOpt == '최고 성능 모델 저장' ? 'new' : 'overwrite',
                modelName: this.o_data.modelName,
                comId: this.o_data.comId,
                workflowId: p_data['workflowId']
            }
        };

        (this.o_data.compare_model as COM_FILTER_MODEL_ATT['compare_model']).forEach(s_model => {
            if (s_model.COM_UUID){
                sParam.data.dataArray.push({
                    COM_UUID: s_model.COM_UUID
                });
            } else {
                sParam.data.dataArray.push({
                    MODEL_ID: s_model.MODEL_ID,
                    MODEL_IDX: s_model.MODEL_IDX,
                });
            }
        })

        return sParam;
        
    }
}