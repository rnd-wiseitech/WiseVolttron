import { COM_ANOMAL_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";

/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼의 이상치 데이터를 추출한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpAnomalyData extends WpComponentProperty {
    constructor(p_data:Array<COM_ANOMAL_ATT>){
        super('/job', p_data, 'transform', 'outlier');
    }
    hasEmptyValue(){
        let sFlag = false;
        this.o_data.forEach((sCol:COM_ANOMAL_ATT) => {
            if (sCol.type == 'remove'){
                if (super.isEmpty(sCol.column)){
                    sFlag = true;
                }
            }
            else {
                if (super.isEmpty(sCol.column)||super.isEmpty(sCol.type)||super.isEmpty(sCol.value)){
                    sFlag = true;
                }
            }
        });
        return sFlag;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dataArray: this.o_data
            }
        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        let s_userParam: any = {};
        let sMatchValueList:any = [];
        // 사용자 파라미터가 있는지 체크할 입력값 (array형태 체크)
        (this.o_data as COM_ANOMAL_ATT[]).forEach(s_col => {
            let s_matchValue = s_col.value.match(/@[0-9a-zA-Zㄱ-힣_]*/g);
            if (s_matchValue) {
                sMatchValueList = sMatchValueList.concat(s_matchValue);
            }
        });

        sMatchValueList.forEach((s_match:string) => {
            let s_param: any = p_data['user_param'].find((s_param: any) => s_param.PARAM_NM == s_match);
            s_userParam[s_param['PARAM_NM']] = { value: JSON.parse(s_param['PARAM_VALUE']), format: JSON.parse(s_param['PARAM_FORMAT']) }
        })

        if (Object.values(s_userParam).length > 0) {
            sParam['data']['user_param'] = s_userParam;
        }

        return sParam;
    }
}