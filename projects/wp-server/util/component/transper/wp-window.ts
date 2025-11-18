import { COM_WINDOW_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼의 데이터를 기준으로 시계열 분석을 할 수 있는 형태로 변경한다.
 * select_col,select_col t-1,select_col t-2,.......
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpWindowData extends WpComponentProperty {
    constructor(p_data:COM_WINDOW_ATT){
        super('/job', p_data, 'transform', 'window');
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema = []
        let sSelectCol = [this.o_data.indexColumn, this.o_data.column];
        // 시계열 컴포넌트 생성된 파생변수 타입 설정
        let sColType;
        pSchema.forEach((sCol:any)=>{
            if (sCol.name == this.o_data.column ){
                sColType = sCol.type;
        }});
        // 인덱스 컬럼, 윈도우 적용 컬럼
        if ( sSelectCol.length > 0){
            pSchema.forEach((sCol:any) => {
                if (sSelectCol.includes(sCol.name)){
                    sDerivedSchema.push(sCol);
                }
            });
        }
        // t-1, t-2, ... t-(윈도우사이즈)
        let sWindowSize = parseInt(this.o_data.value)>0 ? parseInt(this.o_data.value) : 0;
        if (sWindowSize > 0){
            for (let window = 1 ; window <= sWindowSize; window ++){
                sDerivedSchema.push({
                    "name" : `t-${window}`,
                    "type" : sColType,
                    "nullable" : true,
                    "metadata":{}
                });
            }
        }
        return sDerivedSchema;
    }
    hasEmptyValue(){
        if (super.isEmpty(this.o_data.column) || super.isEmpty(this.o_data.indexColumn) || super.isEmpty(this.o_data.value)){
            return true;
        } else {
            return false;
        }
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                indexColumn: this.o_data.indexColumn,
                column: this.o_data.column,
                value: this.o_data.value
            }
        }

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}