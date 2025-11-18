

import { COM_PREDICT_MODEL_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 모델 예측 컴포넌트
 * 선택한 모델을 사용하여 예측값을 wp_predict 컬럼으로 생성한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpPredictModelData extends WpComponentProperty {
    constructor(p_data: COM_PREDICT_MODEL_ATT) {
        super('/job', p_data, 'model-predict', 'model-predict');
    }

    getColumnInfo(pSchema: any) {
        let sDerivedSchema = [
            {
                "name": 'wp_predict',
                "type": this.o_data.modelType == 'Regression' ? 'double' : "string",
                "nullable": true,
                "metadata": {}
            }
        ];
        if (this.o_data.modelType == 'Clustering'){
            sDerivedSchema[0]['name'] = 'Cluster_Label';
        }
        let sDupCnt = 0; // sTmpColName를 포함한 컬럼명 있을 때.
        // #203 입력하려는 컬럼명과 중복된 컬럼명이 있을경우 _2, _3, .. 으로 수정해서 추가.
        let sTmpList = pSchema.filter((sCol: any) => sCol.name.includes('wp_predict'));
        sDupCnt = sTmpList.length;
        if (sDupCnt > 0)
            sDerivedSchema[0]['name'] =  'wp_predict_' + String(sDupCnt + 1);
        return pSchema.concat(sDerivedSchema);
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let s_usetable = p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0];
        if (p_data.filter) {
            s_usetable = s_usetable + '_' + p_data.filter[0].split("_")[0];
        }
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: s_usetable,
                modelId: this.o_data.modelId,
                modelIdx: this.o_data.modelIdx,
                modelComId: this.o_data.modelComId,
                customYn: this.o_data.customYn         
            }
        };

        return sParam;
    }
}