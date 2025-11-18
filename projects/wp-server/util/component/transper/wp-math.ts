import { COM_ANOMAL_ATT, COM_MATH_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼의 데이터를 사용자가 입력한 계산식에 맞게 데이터를 변경한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpMathData extends WpComponentProperty {
    constructor(p_data:Array<COM_MATH_ATT>){
        super('/job', p_data, 'transform', 'numeric');
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
                if (super.isEmpty(sCol.targetColumn) || super.isEmpty(sCol.value)) {
                    sFlag = true;
                }
            }
        });
        return sFlag;
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema:any = []
        let sSchema = pSchema;
        this.o_data.forEach((sWpData:any) => {
            if (sWpData.derivedOption == 'true' && sWpData.derivedColumn.trim().length>0){
                sDerivedSchema.push({
                    "name": sWpData.derivedColumn,
                    "type" : "double",
                    "nullable" : true,
                    "metadata":{}
                });
            }
            if (sWpData.derivedOption == 'false'){
                sSchema.forEach((sCol:any) => {
                    if (sCol.name == sWpData.targetColumn){
                        sCol.type = 'double';
                    }
                })
            }
        });
        return sSchema.concat(sDerivedSchema);
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sDataArray:any = [];
        this.o_data.forEach((sMathCol: COM_MATH_ATT) => {
            sDataArray.push({
                derivedColumn: sMathCol.derivedOption == 'true' ? sMathCol.derivedColumn : sMathCol.targetColumn,
                value: sMathCol.value
            });
        });

        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dataArray: sDataArray
            }
        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}