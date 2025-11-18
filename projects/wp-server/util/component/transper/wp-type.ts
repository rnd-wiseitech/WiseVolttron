import { COM_TYPE_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼의 데이터를 사용자가 입력한 타입으로 변경한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpTypeData extends WpComponentProperty{
    
    constructor(p_data: Array<COM_TYPE_ATT>){
        super('/job', p_data, 'transform', 'type');
    }
    getColumnInfo(p_schema:any){
        let sDerivedSchema = [];
        for (let sCol of p_schema){
            let sTypeFlag = false;
            this.o_data.forEach((sWpData:COM_TYPE_ATT) => {
                if (sCol.name == sWpData.column){
                    sDerivedSchema.push(Object.assign(JSON.parse(JSON.stringify(sCol)), {'type':sWpData.type}));
                    sTypeFlag = true ;
                }
            });
            if (!sTypeFlag)
                sDerivedSchema.push(sCol);
        }
        return sDerivedSchema;
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

        return sParam;
    }
}