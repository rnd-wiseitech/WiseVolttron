import { COM_DATE_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼의 날짜 포맷을 변경한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpDateData extends WpComponentProperty {
    constructor(p_data:Array<COM_DATE_ATT>){
        super('/job', p_data, 'transform', 'date');
    }
    hasEmptyValue(){
        let sFlag = false;
        this.o_data.forEach((sCol:any) => {
            if (sCol.derivedOption == 'true'){
                if (super.isEmpty(sCol.derivedColumn) || super.isEmpty(sCol.value)) {
                    sFlag = true;
                }
            }
            if (sCol.derivedOption == 'false'){
                if (super.isEmpty(sCol.column) || super.isEmpty(sCol.value)) {
                    sFlag = true;
                }
            }
        });
        return sFlag;
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema:any = []
        this.o_data.forEach((sWpData:any) => {
            if (sWpData.derivedColumn.trim().length > 0 && sWpData.derivedOption == 'true'){
                sDerivedSchema.push({
                    "name": sWpData.derivedColumn,
                    "type" : "string",
                    "nullable" : true,
                    "metadata":{}
                });
            }
        })
        return pSchema.concat(sDerivedSchema);
    }
    
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        // dateFormatText를 제거한 나머지 파생열 조건부 정보
        let sDateColumnArray = (this.o_data as Array<COM_DATE_ATT>).map(({ dateFormatText, ...rest }) => rest);

        let sParam: any = {

            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dataArray: sDateColumnArray
            }
        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}