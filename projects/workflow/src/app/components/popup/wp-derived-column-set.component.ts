import { Component, EventEmitter, Inject, OnInit, Output } from "@angular/core";
import {
    MatDialogRef,
    MAT_DIALOG_DATA
  } from "@angular/material/dialog";
import dateFormat from "dateformat";
@Component({
    selector: 'wp-derived-column-set',
    templateUrl: './wp-derived-column-set.component.html',
    styleUrls: ['./wp-derived-column-set.component.css']
})

export class WpDerivedColumnSetComponent implements OnInit {
    @Output() selectionChanged = new EventEmitter<any>();
    @Output() addUserInputEmit = new EventEmitter<any>();
    tableIndex = '';
    comId = '';
    oMethodText:any = []; // 입력값 리스트
    oMethodProp:any = []; // 입력값 속성(fun, cal, val, user) 리스트
    oColInfo:any = {}; // 입력값 속성 설명 obj
    oViewText:string = ''; // oMethodText를 join 하여 변환한 문자
    oWarningMsg:string = ''; // 경고 메시지
    hUserInputDervColList:any[] = [];
    hSelectType:string ='';
    hSelectTypeIdx:number;
    hFuncNm:string = '';  // 선택된 함수 이름
    
    oFormData:any;
    hDervColForm:any;
    hUserInputForm:any;

    oUserInputData:{[index:string]:any} = {};
    oDervColData:{[index:string]:any} = {};
    oDervColNameList:any = [];
    oColNameList:any = [];
    oDescType:string = '';
    oDervEditFlag:boolean;
    oDate = new Date();

    constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<WpDerivedColumnSetComponent>){
        this.oViewText = '';
        this.hSelectType='';
    }
    ngOnInit(){
        this.oViewText = this.data.value;
        this.comId = this.data.comId;
        this.oMethodText = this.data.methodText;
        this.oMethodProp = this.data.methodProp;
        this.oFormData = this.data.formdata;
        this.hDervColForm = this.data.formdata.formdata;
        this.hUserInputForm = this.data.formdata.formdataObject;
        this.hUserInputDervColList = this.data.formdata.userInputDervColList;

        this.hSelectTypeIdx = 0;
        this.oUserInputData = {};
        this.oDervColData = {};
        this.oDervColNameList = this.hDervColForm.map((sCol:any) => sCol.name);

        // setUserInputData 
        this.initUserInputData();
        this.hDervColForm.forEach((sDervCol:any) => this.oColInfo[sDervCol.name]=sDervCol.vname);

        // 컬럼명 리스트
        this.oColNameList = this.data.schema;
        this.oDervEditFlag = false;
        this.oDescType = this.data.descType? this.data.descType : ''
        if (this.oDescType == 'date'){
            this.oDervEditFlag = true;
        }
    }
    ngAfterViewInit(){
        this.onSelectType(this.oDervColNameList[0], 0);
    }
    initUserInputData(){
        let sUserInputKey =  Object.keys(this.hUserInputForm);
        sUserInputKey.forEach((sUserFormName:any) => {
            let tmpForm = this.hUserInputForm[sUserFormName];
            if (tmpForm.type == 'tab'){
                this.oUserInputData[tmpForm.name] = {}
                tmpForm.fvalue.forEach((sInnerForm:any) => {
                    this.oUserInputData[tmpForm.name][sInnerForm.name] = undefined;
                });
            } else {
                this.oUserInputData[tmpForm.name] = undefined;
            }
        })
    }
    onSelectChanged(pValue:any, pCallback:any){
        if (this.oDescType == 'date') {
            this.selectionChanged.emit({selectedVal:pValue, eventNm:pCallback.name});
        }
        else {
            if (this.hSelectType == 'fun'){
                this.setFunNm(pValue);
            } else {
                this.onAddList(pValue);
            }
        }
        // if (pCallback.useData){
        //     this.selectionChanged.emit({selectedVal:pValue, eventNm:pCallback.name,selectType: this.hSelectType, data:{sUserInputData: this.oUserInputData, sDervColData: this.oDervColData}});
        // } else {
        //     this.selectionChanged.emit({selectedVal:pValue, eventNm:pCallback.name});
        // }
    }
    // 함수값, 사용자 입력 작성 후 + 누를때, 컬럼, 상수, 연산자 선택시 추가됨 
    onAddList(pValue?:any){
        let sSelectValue = ''
        if (pValue){
            sSelectValue = pValue
        } else {
            sSelectValue = this.oUserInputData[this.hFuncNm]
        }
        if (this.hSelectType == 'col'){
            sSelectValue = `\`${sSelectValue}\``
        }
        if (this.hSelectType == 'fun'){
            let sFunInputData = this.oUserInputData[this.hFuncNm];
            if (this.hFuncNm == 'round'){
                let sResult = this.isValidInput(sFunInputData['roundNo'],'integer');
                if (!sResult.isValid){
                    this.setWarnMsg('유효한 값을 입력하세요');
                    return;
                }
                sSelectValue = `round(\`${sFunInputData['col']}\`,${sFunInputData['roundNo'].trim()})`;
            }
            else if (this.hFuncNm == 'lpad' || this.hFuncNm == 'rpad'){
                let sResult = this.isValidInput(sFunInputData['length'],'integer');
                if (!sResult.isValid){
                    this.setWarnMsg('유효한 값을 입력하세요');
                    return;
                }
                let sFillText = this.isNumeric(sFunInputData['fill']).text;
                sSelectValue = `${this.hFuncNm}(\`${sFunInputData['col']}\`,${sFunInputData['length'].trim()},${sFillText})`;
            }
            else if (this.hFuncNm == 'replace'){
                let sTargetText = this.isNumeric(sFunInputData['target'].trim()).text;
                let sReplaceText = this.isNumeric(sFunInputData['replace'].trim()).text;
                sSelectValue = `replace(\`${sFunInputData['col']['name']}\`,${sTargetText},${sReplaceText})`;
            }
            else {
                sSelectValue = `${this.hFuncNm}(\`${sFunInputData}\`)`;
            }
        }

        this.setWarnMsg('');
        this.oViewText += sSelectValue
        this.onSelectType(this.oDervColNameList[0],0);
        // this.addUserInputEmit.emit({eventNm: 'addUserInput',selectType: this.hSelectType});
    }
    onRemoveList(pEvent:any){
        this.setWarnMsg('');
        if (this.oDescType == 'date'){
            this.oMethodText.pop(); // 화면에 표시할 Arr
            this.setViewTxt(this.oMethodText.join(""));
        }
        else {
            this.setViewTxt("");
        }
    }
    onSelectType(pType:string, pIndex?:number){
        this.hSelectType = pType;
        this.hSelectTypeIdx = pIndex;
        this.oWarningMsg = '';
        this.hFuncNm = '';

        this.oDervColNameList.forEach((sName:string, sIndex:number)=>{
            let sElem:any = $(`#DervCol_${sName}`);
            if (sElem) {
                if (sName == pType) {
                    sElem.hasClass('on') ? null : sElem.addClass('on')
                    // 사용자 입력 활성화 해야할 때.
                    if (this.hUserInputDervColList.includes(sName)){
                        this.hFuncNm = sName == 'user_input'? 'user_input' : ''
                    }
                } else {
                    sElem.hasClass('on') ? sElem.removeClass('on') : null
                }
            }
        })
    }
    onClose(){
        this.dialogRef.close({'oMethodText' : this.oViewText,
        //   'tableIndex' : this.tableIndex, 
          'comId' : this.comId,
          'oMethodTextArr' : this.oMethodText,
          'oMethodPropArr' : this.oMethodProp
        });
        // if (this.oMethodProp && this.oMethodProp.length>0 && this.oMethodProp[this.oMethodProp.length-1] == 'cal'){
        //     this.setWarnMsg('파생열은 연산자로 끝날 수 없습니다');
        // }
        // else {
        //     this.dialogRef.close({'oMethodText' : this.oViewText,
        //                         //   'tableIndex' : this.tableIndex, 
        //                           'comId' : this.comId,
        //                           'oMethodTextArr' : this.oMethodText,
        //                           'oMethodPropArr' : this.oMethodProp
        //                         });
        // }
    }
    isValidInput(pTarget:any, pType:any){
        const sRexExpArr:any = {
            'integer': /^[0-9]*$/,
            'string' : /^[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9]*$/
        }; //영문+한글+숫자
        let sRexExp = sRexExpArr[pType];
        return this.isValidValue(pTarget, sRexExp);
    }
    isValidValue(pTarget:any, pRexExp:any){
        // const sReducer = (acc, curr) => (pRexExp.test(acc) && pRexExp.test(acc+curr))? acc + curr: acc  
        const sReducer = (acc:any, curr:any) => {
            if (pRexExp.test(acc) && pRexExp.test(acc+curr))
                return acc + curr;
            else if (pRexExp.test(acc))
                return acc;
            else 
                return;
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
    isNumeric(pChkText:any){
        let result = $.isNumeric(pChkText); // Numeric 이면 true
        let text =  result? pChkText:"'"+pChkText+"'"; // Numeric이면 그대로, 그 외에는 앞뒤로 ' 추가
        return { result, text };
    }
    chkColName(pEvent:any){
        // `컬럼명` 체크하는 정규표현식
        // /\`{1}[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣]+[a-zA-Zㄱ-ㅎㅏ-ㅣ가-힣0-9_]*\`{1}$/
        // 1) ``안에 담긴 컬럼명이 실제 컬럼명 리스트에 존재하는 컬럼명인지 체크
        // @ts-ignore
        let sInputColumnName = [...this.oViewText.matchAll(/\`{1}[^\`]+\`{1}/g)].map(sText => sText[0].replaceAll('`',''))
        let isValid = true;
        for (const sColName of sInputColumnName) {
            if (!this.oColNameList.includes(sColName)){
                isValid = false;
                this.setWarnMsg(`${sColName} 컬럼이 존재하지 않습니다. 컬럼명을 \`컬럼명\` 형식으로 입력해주세요.`)
            }
        }
        if (isValid){
            this.setWarnMsg('')
        }
    }
    setWarnMsg(pMsg:any){
        this.oWarningMsg = pMsg;
    }
    setViewTxt(pText:string){
        this.oViewText = pText;
    }
    setFunNm(pText:string){
        this.hFuncNm = pText;
    }
    // tooltip 설명 추가
    getDescription(pType:string, pValue:any){
        if ( pType == 'date') {
            return dateFormat(this.oDate, pValue);
        }
        return "";
    }
}