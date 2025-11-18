import { COM_FEATURE_IMPORTANCE_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 변수 중요도 컴포넌트.
 * 선택한 targetColumn을 기준으로 변수 중요도를 계산한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpFeatureImporanceData extends WpComponentProperty {
    constructor(p_data: COM_FEATURE_IMPORTANCE_ATT) {
        super('/job', p_data, 'transform', 'feature-importance');
    }

    getColumnInfo(pSchema: any) {
        let sDerivedSchema: any = [];
        if (this.o_data.column.length > 0) {
            pSchema.forEach((sCol: any) => {
                if (this.o_data.column.includes(sCol.name)) {
                    sDerivedSchema.push(sCol);
                }
            });
        }
        return sDerivedSchema;
    }

    hasEmptyValue() {
        if (this.o_data.column.length == 0 || this.o_data.value==="") {
            return true;
        }
        return false;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            location: "workflow",
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                column: this.o_data.target_column,
                value: this.o_data.value
            }
        }

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}