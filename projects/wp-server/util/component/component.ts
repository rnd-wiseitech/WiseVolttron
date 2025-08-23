import { WiseComData } from "../../wp-type/WP_COM_ATT";


/**
 * WorkFlow에서 사용하는 컴포넌트들의 상위 클래스
 * 공통 함수가 정의 되어있고 각 컴포넌트별 특징이 있는 부분은 overide해서 사용한다.
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpComponentProperty {

    public o_url:string;
    public o_data:WiseComData;
    public o_action:string;
    public o_method:string;
    public o_usetable: { usetable: string, schema: any[], corr: [] }
    constructor(
        p_url:string,
        p_data:WiseComData,
        p_action: string,
        p_method: string,
        p_usetable?: { usetable: string, schema: any[], corr: [] }
    ) {
        this.o_url = p_url + '/' + p_action;
        this.o_data = p_data;
        this.o_action = p_action;
        this.o_method = p_method;
        if (p_usetable){
            this.o_usetable = p_usetable;
        } else {
            this.o_usetable = { usetable: '', schema: [], corr: [] };
        }
    }

    isEmpty(p_chk:String) {
        if(typeof p_chk == "undefined" || p_chk == null || p_chk === "")
            return true;
        else
            return false;
    }
    /**
     * 이 컴포넌트에서 생성될 컬럼 정보를 리턴함. (getDeriveSchema) 에서 사용
    */
    getColumnInfo(p_schema:any, p_rightSchema?:any, p_jobId?:any) {
        return p_schema;
    }
    /**
     * 데이터를 불러와서 직접 할당.
     */
    setComData(p_data:any){
        this.o_data = p_data;
    }
    /**
     * 빈 값이 있는지 체크
     */
    hasEmptyValue(){
        let sFlag = false;
        let s_data:any =  this.o_data;
        if (Array.isArray(this.o_data)){
            s_data.forEach((sCol:any) => {
                Object.values(sCol).forEach((sColValue:any) => {
                    if (this.isEmpty(sColValue)){
                        sFlag = true;
                    }
                });
            })
        }
        return sFlag;
    }
}


