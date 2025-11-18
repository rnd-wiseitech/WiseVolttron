import { COM_MERGE_ATT, WpComSchema } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 두개의 데이터를 합친다.
 * 두 데이터가 컬럼이 같아야 하며 다를 경우 데이터가 늘어나며 없는 값은 null로 채워진다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpMergeData extends WpComponentProperty {
    public data:COM_MERGE_ATT;
    constructor(p_data:COM_MERGE_ATT){
        super('/job', p_data, 'transform', 'merge');
    }
    // 중복 컬럼 처리 수정(transform table의 job_id를 붙여서 중복컬럼명 처리함.)
    public getColumnInfo(p_leftSchema: Array<WpComSchema>, p_rightSchema?: Array<WpComSchema>, p_rightJobId?: any) {
        let sDerivedSchema:Array<WpComSchema> = [];
        let sColList_l = p_leftSchema.map(sCol =>{return sCol.name}).filter(Boolean);
        let sColList_r = p_rightSchema.map(sCol =>{return sCol.name}).filter(Boolean);
        for(let sCom of p_leftSchema){
            sDerivedSchema.push(sCom);
        }
        // 모든 컬럼의 구성이 같을때 (데이터가 위아래로 병합됨)
        if (JSON.stringify(sColList_l.sort()) == JSON.stringify(sColList_r.sort())){  // 병합
            return sDerivedSchema;
        }
        else { // 컬럼 구성이 다를 때 & 조인
            p_rightSchema.forEach(sCol=> {
                // transform_value(right)에 usetable(left)의 컬럼이 포함되어 있을 경우
                if (sColList_l.includes(sCol.name)){
                    sDerivedSchema.push({
                        name: `${sCol.name}_${p_rightJobId}`,
                        type : sCol.type,
                        nullable : sCol.nullable,
                        metadata: sCol.metadata
                    });
                }
                else {
                    sDerivedSchema.push(sCol);
                }
            })
            return sDerivedSchema;
        }
    }

    public hasEmptyValue(){
        if (super.isEmpty(this.o_data.usetable_jobId) || super.isEmpty(this.o_data.mergetable_jobId)){
            return true;
        }
        return false;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + this.o_data.usetable_jobId,
                mergeTable: p_userInfo.USER_NO + '_' + p_groupId + '_' + this.o_data.mergetable_jobId
            },
        }

        if (p_data.filter) {
            // filter : true_2 : filter값_filter컴포넌트 jobId
            p_data.filter.forEach((filter: string) => {
                let sFilterTag = filter.split('_')[0]; //parent의 filter 데이터의 true/false
                let sFilterJobId = filter.split('_')[1]; //parent ItemKey(not parentId)
                if (this.o_data.usetable_jobId == sFilterJobId)
                    sParam.data.usetable = sParam.data.usetable + '_' + sFilterTag;
                if (this.o_data.mergetable_jobId == sFilterJobId)
                    sParam.data.mergeTable = sParam.data.mergeTable + '_' + sFilterTag;
            });
        }

        return sParam;
    }
}