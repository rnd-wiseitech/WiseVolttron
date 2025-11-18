import { COM_AGG_ATT, COM_GROUP_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 컬럼을 기준으로 데이터를 집계한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpAggData extends WpComponentProperty {
    constructor(p_data:COM_AGG_ATT){
        super('/job', p_data, 'transform', 'aggregate');        
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema:any = []
        // 그룹기준 컬럼
        if (this.o_data.groupColumn.length > 0){
            pSchema.forEach((sCol:any) => {
                if (this.o_data.groupColumn.includes(sCol.name)){
                    sDerivedSchema.push(sCol);
                }
            });
        }
        // 그룹화 값(적용컬럼명)
        let sTempSchema = [];
        sTempSchema = this.o_data.aggKey.map((sWpData:any) =>{
            if (sWpData['type'].length>0 && sWpData['column'].length>0){
                return {
                    "name" : `${sWpData['type']}_${sWpData['column']}`, // #24 집계 표시 수정
                    "type" : "double",
                    "nullable" : true,
                    "metadata":{}
                };
            } else {
                return undefined;
            }
        }).filter(Boolean);
        return sDerivedSchema.concat(sTempSchema);
    }
    hasEmptyValue(){
        if (super.isEmpty(this.o_data.groupColumn)) {
            return true;
        }
        let sFlag = false;
        this.o_data.aggKey.forEach((sCol:any) => {
            if (super.isEmpty(sCol.column)||super.isEmpty(sCol.type)){
                sFlag = true;
            }
        });
        return sFlag;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sAggKey: COM_AGG_ATT['aggKey'] = JSON.parse(JSON.stringify(this.o_data['aggKey']));
        sAggKey.forEach(sCol => {
            if (sCol.type == 'avg') {
                sCol.type = 'mean';
            }
        })

        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                groupColumn: this.o_data.groupColumn,
                dataArray: sAggKey
            }

        }
        
        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        return sParam;
    }
}