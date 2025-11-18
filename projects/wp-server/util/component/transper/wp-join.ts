import { COM_JOIN_ATT, WpComSchema } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
/**
 * WorkFlow에서 사용하는 데이터 변환 컴포넌트
 * 선택한 두개의 데이터를 특정 컬럼기준으로 합친다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpJoinData extends WpComponentProperty {    
    constructor(p_data:COM_JOIN_ATT){
        super('/job', p_data, 'transform', 'join');
    }

    // 중복 컬럼 처리 수정(transform table의 job_id를 붙여서 중복컬럼명 처리함.)
    getColumnInfo(p_leftSchema: Array<WpComSchema>, p_rightSchema?: Array<WpComSchema>, p_rightJobId?: any) {
        let sDerivedSchema: Array<WpComSchema> = [];

        let sColList_l = p_leftSchema.map(sCol => { return sCol.name; }).filter(Boolean);
        for (let sCom of p_leftSchema) {
            sDerivedSchema.push(sCom);
        }
        p_rightSchema.forEach(sCol => {
            // transform_value(right)에 usetable(left)의 컬럼이 포함되어 있을 경우
            if (sColList_l.includes(sCol.name)) {
                sDerivedSchema.push({
                    name: `${sCol.name}_${p_rightJobId}`,
                    type: sCol.type,
                    nullable: sCol.nullable,
                    metadata: sCol.metadata
                });
            }
            else {
                sDerivedSchema.push(sCol);
            }
        });
        return sDerivedSchema;
    }
    hasEmptyValue(){
        if (super.isEmpty(this.o_data.type) || super.isEmpty(this.o_data.usetable_jobId) || super.isEmpty(this.o_data.jointable_jobId)){
            return true;
        }
        let sFlag = false;
        this.o_data.joinKey.forEach((sCol:any) => {
            if ( super.isEmpty(sCol.useColumn) || super.isEmpty(sCol.joinColumn) ){
                sFlag = true;
            }
        })
        return sFlag;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + this.o_data.usetable_jobId,
                type: this.o_data.type,
                joinTable: p_userInfo.USER_NO + '_' + p_groupId + '_' + this.o_data.jointable_jobId,
                dataArray: this.o_data.joinKey,
            }
        }

        if (p_data.filter) {
            // filter : true_2 : filter값_filter컴포넌트 jobId
            p_data.filter.forEach((filter: string) => {
                let sFilterTag = filter.split('_')[0]; //parent의 filter 데이터의 true/false
                let sFilterJobId = filter.split('_')[1]; //parent ItemKey(not parentId)
                if (this.o_data.usetable_jobId == sFilterJobId)
                    sParam.data.usetable = sParam.data.usetable + '_' + sFilterTag;
                if (this.o_data.jointable_jobId == sFilterJobId)
                    sParam.data.joinTable = sParam.data.joinTable + '_' + sFilterTag;
            });
        }
        return sParam;

    }
}