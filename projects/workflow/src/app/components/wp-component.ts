import { WiseComType, WpComData } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpPropertiesWrap } from "../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpComponentViewerService } from "./wp-component-viewer.service";

/**
 * 워크플로우 속성 컴포넌트의 부모 클래스
 * 
 * 속성창에 표시하기 위해서 각 컴포넌트는 {@link WpComponent | WpComponent} 를 상속하여 사용한다.
 * 
 * 컴포넌트에서 공통으로 사용하는 메서드를 정의한다.

 * @example
 * ```ts
 *  export class WpAggregateComponent extends WpComponent {
 *     constructor(pComViewerSvc: WpComponentViewerService, pWpData: WiseComType) { 
 *          super(pComViewerSvc,pWpData);
 *     }
 * }
 * ```
 */
export class WpComponent {
    oSchema:any;
    oWpData: WiseComType['o_data'];
    hide = false;
    oComViewerSvc;
    oFormData:WpPropertiesWrap [];
    oComId:string = '';
    o_usetable: any = {usetable: "", schema: [], corr: []};
    constructor(pComViewerSvc: WpComponentViewerService, pWpData: WiseComType) { 
        this.oComViewerSvc = pComViewerSvc;
        this.oWpData = pWpData['o_data'];
        this.o_usetable = pWpData['o_usetable'];
        this.oComId = this.oComViewerSvc.getComId();
    }
    public setFormData(pFormData:WpPropertiesWrap []){
        this.oFormData = pFormData;
    }
    public getFormData(){
        return this.oFormData;
    }
    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        let sTmpSchema = [];
        for(let sCom of this.oSchema.schema){
            sTmpSchema.push(sCom.name);
        }
        this.oComViewerSvc.selectData(pSchema);
        this.setColList(sTmpSchema);
    }
    public setColList(pList: string[]) {
        let sColnameList = ['column', 'targetColumn', 'target_column',  'groupColumn', 'group_column', 'date_column'];
        this.oFormData.map(e => {
            if (Array.isArray(e.fvalue) && typeof e.fvalue[0] == 'object' && e.fvalue[0].hasOwnProperty('fvalue')) {
                e.fvalue.map((e1: any) => {
                    if (sColnameList.includes(e1.name) && (e1.type == 'select' || e1.type == 'multiple_select')) {
                        e1.fvalue = pList;
                    } else if (e1.name == 'type') {
                        e1.value = '';
                    }
                });
            }
            if ((e.type == 'select' || e.type == 'multiple_select') && sColnameList.includes(e.name)) {
                e.fvalue = pList;
            }
        });
    }
    // #25 변수 범위 검증
    public isValidNumber(pTarget: any, pType: 'double' | 'numeric' | 'natural' | 'integer' | 'long' | 'float') {
        const sRegExpArr:{[key:string]:any} = {
            'double': /^[+-]?[0-9]*(\.?[0-9]*)$/,
            'numeric': /^[+-]?[0-9]*(\.?[0-9]*)$/,
            'natural': /^([1-9]{1}[0-9]*)$/, // #164 자연수 정규식 수정
            'integer': /^(0|[1-9]{1}[0-9]*)$/, // #164 정수 정규식 수정
            'long': /^(0|[1-9]{1}[0-9]*)$/,
            'float': /^[+-]?[0-9]*(\.?[0-9]*)$/
        };
        let sRegExp = sRegExpArr[pType];
        return this.isValidValue(pTarget, sRegExp);
    }
    public isValidString(pTarget: any, pType: 'Eng' | 'Kor' | 'EngNum' | 'KorNum' | 'EngKor' | 'EngKorNum' | 'colNm' | 'fileNm' | 'tableNm') {
        const sRegExpArr:{[key:string]:any} = {
            'Eng': /^[a-zA-Z]*$/, //영어
            'Kor': /^[ㄱ-ㅎㅏ-ㅣ가-힣]*$/, //한글
            'EngNum' : /^[a-zA-Z0-9]*$/, //영문+숫자
            'KorNum' : /^[ㄱ-ㅎㅏ-ㅣ가-힣0-9]*$/, //한글+숫자
            'EngKor' : /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]*$/, //영문+한글
            'EngKorNum' : /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9]*$/, //영문+한글+숫자
            'colNm': /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]+[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9_]*$/, //컬럼명 #137 영문 한글 숫자 _ 허용으로 수정 (시작은 한글 또는 영문)
            'fileNm': /^((?![\/:\*\?"<>\|\.\\]).)*$/, //파일명
            'tableNm': /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]+[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9_]*$/, //테이블명 영문 한글 숫자 _ 허용
        };
        let sRegExp = sRegExpArr[pType];
        return this.isValidValue(pTarget, sRegExp);
    }
    public isValidValue(pTarget: any, pRexExp: RegExp) {
        // const sReducer = (acc, curr) => (pRexExp.test(acc) && pRexExp.test(acc+curr))? acc + curr: acc  
        if (pTarget.trim() == "")
            return {isValid: true, result: ""};
        const sReducer = (acc:any, curr:any) => {
            if (pRexExp.test(acc) && pRexExp.test(acc+curr))
                return acc + curr;
            else if (pRexExp.test(acc))
                return acc;
            else 
                return "";
        };
        if (!pRexExp.test(pTarget)){
            if (pTarget.length > 1){
                let sTmpList = pTarget.split("");
                return {isValid: false, result: sTmpList.reduce(sReducer)}; // result 기존의 유효한(test 통과한) 문자까지
            }
            else {
                return {isValid: false, result: ""};
            }
        }
        else {
            return {isValid: true, result: pTarget};
        }
    }
    public isTargetColumnType(pTargetColNm:string, pCheckValue:any){ //pTargetColNm의 type과 pCheckValue의 type이 일치하는지 검증
        let sTargetType ;
        let sIsValidInput;
        this.oSchema.schema.forEach((sCol:any) => {
            if (sCol.name == pTargetColNm)
                sTargetType = sCol.type;
        });
         // 대상 컬럼 타입이 숫자일 경우
        if (["integer", "double", "float", "numeric", "long"].includes(sTargetType))
            sIsValidInput = this.isValidNumber(pCheckValue,sTargetType); // 숫자 유효성 확인
        // 대상 컬럼 타입이 문자일 경우
        if (sTargetType == "string")
            sIsValidInput = this.isValidString(pCheckValue,"EngKorNum"); // 문자 유효성 확인
        return Object.assign(sIsValidInput, {'type':sTargetType});
    }
    public getItemIndexByElem(pElem: Element) {
        return Array.from(pElem.parentNode.children).indexOf(pElem);
    }
}