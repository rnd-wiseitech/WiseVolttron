import { COM_DERV_ATT, COM_DERV_COND_ATT, COM_GROUP_ATT } from "../../../wp-type/WP_COM_ATT";
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
export class WpDerivedData extends WpComponentProperty {
    constructor(p_data:Array<COM_DERV_ATT>){
        super('/job', p_data, 'transform', 'derived');        
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema = this.o_data.map((sWpData:any) =>{
            // 파생열 표현식 중 사용자가 입력한 컬럼명
            let sInputColumnName = [...sWpData.value.matchAll(/\`{1}[^\`]+\`{1}/g)].map(sText => sText[0].replaceAll('`',''))
            let sTpye = "double";
            // 선택한 컬럼중 하나라도 string이 있으면 string 으로 바꿈.
            pSchema.forEach((sCol:any) => {
                if (sInputColumnName.includes(sCol.name)){
                    if (sCol.type === 'string' || sCol.type === 'text'){
                        sTpye = 'string';
                    }
                }
            });
            // 사용자가 입력한 컬럼명이 확인되지 않아도 string 타입으로 변경.
            if (sInputColumnName.length === 0){
                sTpye = 'string';
            }
            if (sWpData.derivedColumn.trim().length>0){ // 파생열명 비어있을 경우는 제외
                return {
                    "name": sWpData.derivedColumn,
                    "type" : sTpye,
                    "nullable" : true,
                    "metadata":{}
                };
            } else {
                return undefined;
            }
        }).filter(Boolean);
        return pSchema.concat(sDerivedSchema);
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dataArray: this.o_data
            }
        }

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        let s_userParam: any = {};
        let sMatchValueList: any = [];
        // 사용자 파라미터가 있는지 체크할 입력값 (array형태 체크) 
        (this.o_data as COM_DERV_ATT[]).forEach(s_col => {
            let s_matchValue = s_col.value.match(/@[0-9a-zA-Zㄱ-힣_]*/g);
            if (s_matchValue) {
                sMatchValueList = sMatchValueList.concat(s_matchValue);
            }
        });

        sMatchValueList.forEach((s_match: string) => {
            let s_param: any = p_data['user_param'].find((s_param: any) => s_param.PARAM_NM == s_match);
            s_userParam[s_param['PARAM_NM']] = { value: JSON.parse(s_param['PARAM_VALUE']), format: JSON.parse(s_param['PARAM_FORMAT']) };
        })

        if (Object.values(s_userParam).length > 0) {
            sParam['data']['user_param'] = s_userParam;
        }

        return sParam;
    }
}


export class WpDerivedCondData extends WpComponentProperty {
    constructor(p_data:COM_DERV_COND_ATT){
        super('/job', p_data, 'transform', 'derived-condition');
    }
    getColumnInfo(pSchema:any){
        let sDerivedSchema = this.o_data.derivedColumnArray.map((sWpData:any) =>{
            // [TODO] 파생열 조건부 CASE 문에서 변환되는 값 타입체크해서 파생열 타입으로 넣음.
            if (sWpData.derivedColumn.trim().length>0){ // 파생열명 비어있을 경우는 제외
                return {
                    "name": sWpData.derivedColumn,
                    "type" : "string",
                    "nullable" : true,
                    "metadata":{}
                };
            } else {
                return undefined;
            }
        }).filter(Boolean);
        return pSchema.concat(sDerivedSchema);
    }
    getUserDataParams(){
        let sParam:any = {
            transform_value: []
        };
        for (let sDervColumn of this.o_data.derived_column) {
            let sTransformValue = JSON.parse(sDervColumn.transform_value).transform_value
            sParam.transform_value.push(sTransformValue);
        }
        return sParam;
    }
    hasEmptyValue() {
        let sFlag = false;
        this.o_data.derivedColumnArray.forEach((sCol: any) => {
            if (super.isEmpty(sCol.derivedColumn) || super.isEmpty(sCol.value) ) {
                sFlag = true;
            }
        });
        return sFlag;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data:any) {
        // colInfo를 제거한 나머지 파생열 조건부 정보
        let sDerivedColumnArray = (this.o_data as COM_DERV_COND_ATT).derivedColumnArray.map(({ colInfo, ...rest }) => rest);

        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dataArray: sDerivedColumnArray
            }
        }

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        let s_userParam: any = {};
        let sMatchValueList: any = [];
        // 사용자 파라미터가 있는지 체크할 입력값 (array형태 체크) 
        (this.o_data as COM_DERV_COND_ATT).derivedColumnArray.forEach(s_col => {
            let s_matchValue = s_col.value.match(/@[0-9a-zA-Zㄱ-힣_]*/g)
            if (s_matchValue) {
                sMatchValueList = sMatchValueList.concat(s_matchValue)
            }
        });

        sMatchValueList.forEach((s_match: string) => {
            let s_param: any = p_data['user_param'].find((s_param: any) => s_param.PARAM_NM == s_match);
            s_userParam[s_param['PARAM_NM']] = { value: JSON.parse(s_param['PARAM_VALUE']), format: JSON.parse(s_param['PARAM_FORMAT']) };
        })

        if (Object.values(s_userParam).length > 0) {
            sParam['data']['user_param'] = s_userParam;
        }

        return sParam;
    }
}