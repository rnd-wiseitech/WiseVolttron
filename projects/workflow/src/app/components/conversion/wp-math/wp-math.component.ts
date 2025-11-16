import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { WpDerivedColumnSetComponent } from '../../popup/wp-derived-column-set.component';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponentService } from '../../wp-component.service';
import { COM_MATH_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpMathData } from 'projects/wp-server/util/component/transper/wp-math';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 수식 변환 컴포넌트 클래스
 * 
 * 수식 변환 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpMathData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 수식 변환 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpMathData | WpMathData}
 * @params {@link WpComponentService | WpComponentService}
 * @params {@link MatDialog | MatDialog}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpMathComponent(this.cComViewSvc, this.oComponentData, this.cWpComSvc, this.matDialog);
 * ```
 */
export class WpMathComponent extends WpComponent {
    oSendColInfo:{[index:string]:any} = {};
    oWpComSvc:WpComponentService;
    oColNameList:string[] = [];
    oColInfoList:{name:string, type:string}[] = [];
    oPopupSendData:{
        value:any,
        schema:any,
        tableIndex:any,
        comId:string,
        methodText:any,
        methodProp:any,
        formdata:any
    };
    oPopupForm: any;
    oWpData: Array<COM_MATH_ATT>;
    public oDialog:MatDialog;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pWpData: WpMathData,
        pWpComSvc:WpComponentService,
        pDiaglog:MatDialog
            ) { 
        super(pComViewerSvc,pWpData);
        this.oWpComSvc = pWpComSvc;
        this.oDialog = pDiaglog;
        this.cTransSvc = pTransSvc;
        this.setFormData([{
            vname:'수식 변환',
            name:'math_column',
            value:'',
            type:'tab',
            fvalue: [{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info48"),
                name:'derivedOption',
                value:'',
                type:'button_toggle',
                fvalue:['true','false'],
                visible:true,
                edit:true,
                callbak:this.onChangeDerivedOption.bind(this)
            },{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info50"),
                name:'targetColumn',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onChangeTargetColumn.bind(this)
            },{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info29"),
                name:'derivedColumn',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:null
            // },{
            //     vname:'1000단위 구분기호 사용',
            //     name:'transform_type',
            //     value:'',
            //     type:'select',
            //     fvalue:["true","false"],
            //     visible:true,
            //     edit:true,
            //     callbak:null
            // },{
            //     vname:'소수점 자리수',
            //     name:'transform_value',
            //     value:'',
            //     type:'text',
            //     fvalue:'',
            //     visible:true,
            //     edit:true,
            //     callbak:null
            },{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info49"),
                name:'value',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:this.onClick.bind(this)
            }],
            visible:true,
            edit:true,
            callbak:null
        }]);
        this.setDervInputReadOnly();
    }
    setDervInputReadOnly(){
        setTimeout(()=>{
            this.oWpData.forEach((sCol:any, sIndex:number) => {
                let sDervColElem = document.getElementById(`${sIndex}_derivedColumn`);
                let sTargetColElem = document.getElementById(`${sIndex}_targetColumn`);
                sDervColElem.style.display = sCol.derivedOption == 'false'? 'none': 'block'; // 파생열 생성 안하면 UI에서 파생열명 입력 부분 숨김
                sTargetColElem.style.display = sCol.derivedOption == 'true' ? 'none': 'block'; // 파생열 생성시 변환 컬렴명은 뺀다.
                let sExprElem = document.getElementById(`value_${sIndex}`);
                //@ts-ignore
                sExprElem.setAttribute('readonly',true)
            })
        }, 50)
    }
    setDervColList(pSchema:any){
        this.oColNameList = pSchema.schema.map((sCol:any) => sCol.name);
        this.oColInfoList = pSchema.schema.map((sCol:any) => Object({'name': sCol.name, 'type':sCol.type}));
        this.oPopupForm = {
            'title': this.cTransSvc.instant("WPP_COMMON.POPUP.popup2"),
            'flag':true,
            'formdata':[
                {
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup19"),
                    name: 'col',
                    value: this.oColInfoList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup21"),
                    name: 'cal',
                    value: ["+", "-","*","/","(",")"],
                    type: 'select',
                    fvalue:["+", "-","*","/","(",")"],
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                // },{
                //     vname: '사용자입력',
                //     name: 'user_input',
                //     value: '',
                //     type: 'user_input',
                //     fvalue: '',
                //     visible:true,
                //     edit:true,
                //     callbak:null
                },
            ],
            // forUserInput
            'formdataObject':{
                // 'user_input':{
                //     vname: '사용자입력',
                //     name: 'user_input',
                //     value: '',
                //     type: 'text',
                //     fvalue: '',
                //     visible:true,
                //     edit:true,
                //     callbak:null
                // }
            },
            userInputDervColList:[]
            // userInputDervColList:['user_input']
        };
    }
    onClick(pEvent:any){
        // #76 수식변환 컬럼 파생기 수정
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent,`#${pEvent.target.id}`); // 공통으로 사용하는 기능 수정
        let {sComId , sTabIdx}  = sCurrentTabInfo;

        let sMethodText = [];
        let sMethodProp = [];
        // 파생 컬럼 기존 입력 값이 있는 경우
        if (Object.keys(this.oSendColInfo).length > 0){
            sMethodText = this.oSendColInfo['oMethodTextArr'];
            sMethodProp = this.oSendColInfo['oMethodPropArr'];
        }
        let sColNms:any = [];
        this.oSchema.schema.map((e:any)=>{
            sColNms.push(e.name);      
        });
        this.setPopupSendData(
            {
                value: this.oWpData[sTabIdx].value, //transform_value
                schema : sColNms,
                tableIndex : sTabIdx,
                comId : sComId,
                methodText : sMethodText,
                methodProp : sMethodProp,
                formdata : this.oPopupForm,
            }
        );
        const dialogRef = this.oDialog.open(WpDerivedColumnSetComponent, {
            id: 'wp-derived-component-set-popup',
            width: '900px',
            data: this.oPopupSendData
        });
        let sDialogSubs:Subscription[] = [];
        // sDialogSubs.push(
        //     dialogRef.componentInstance.selectionChanged
        //         .subscribe(pRes => {
        //             if (pRes.eventNm == 'onSelectValue'){
        //                 this.onDervClick(pRes.selectedVal,pRes.selectType,dialogRef.componentInstance)
        //             }
        //             console.log("selectionChanged!!")
        //             console.log(pRes)
        //         })
        // );
        // sDialogSubs.push(
        //     dialogRef.componentInstance.addUserInputEmit
        //         .subscribe(pRes => {
        //             if (pRes.eventNm == 'addUserInput'){
        //                 this.onAddUserInput(pRes.selectType,dialogRef.componentInstance)
        //             }
        //         })
        // );
        dialogRef.afterClosed().subscribe(result => {
            sDialogSubs.forEach((sSub:Subscription) => {
                sSub.unsubscribe();
            })
            console.log(result);
            if (typeof result == 'undefined'){
                return null;
            }
            if (result['comId'] == this.oComId){
                this.oWpData[sTabIdx].value = result['oMethodText']?result['oMethodText']:"";
                this.oSendColInfo = result;
                // let sBtnElem = document.getElementById(`MATH_button_${sTabIdx}`);
                // sBtnElem.innerText = result['oMethodText'] && result['oMethodText'].length > 0? "수식 적용 완료" : "수식 적용";
            }
        });
    }
    // #12 component validation
    onKeyUp(pEvent:any, pName: any){
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent,`#${pEvent.target.id}`);
        let { sComId, sTabIdx } = sCurrentTabInfo;
        let sDervColNm = pEvent.srcElement.value; // 입력 값
        let sIsValidInput = this.isValidNumber(sDervColNm, 'integer');
        // 입력값이 유효하지 않을 경우
        if (!sIsValidInput.isValid){
            this.oComViewerSvc.showMsg(`유효한 자리수를 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData[sTabIdx][pName] = sIsValidInput.result;
            pEvent.srcElement.value = sIsValidInput.result;
        }
    }

    // #141 기존 컬럼의 숫자 타입을 바꾸는 경우 (기존 컬럼과 파생열 컬럼명을 같은 값으로 할당)
    onChangeDerivedOption(pEvent:any, pRowIndex: any){
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent, `#T-MATH_button_toggle_${pRowIndex}`);
        let {sComId , sTabIdx} = sCurrentTabInfo;
        this.oWpData[sTabIdx].derivedOption = pEvent.value;
        this.oWpData[sTabIdx].derivedColumn = '';
        this.oWpData[sTabIdx].targetColumn = '';
        let sDervColElem = document.getElementById(`${sTabIdx}_derivedColumn`);
        let sTargetColElem = document.getElementById(`${sTabIdx}_targetColumn`);
        sDervColElem.style.display = pEvent.value == 'false'? 'none': 'block'; // 파생열 생성 안하면 UI에서 파생열명 입력 부분 숨김
        sTargetColElem.style.display = pEvent.value == 'true' ? 'none': 'block'; // 파생열 생성시 변환 컬렴명은 뺀다.
        this.oComViewerSvc.showDiagramPreview(this.oComId, true);
    }
    onChangeTargetColumn(pEvent:any){
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent);
        let {sComId , sTabIdx} = sCurrentTabInfo;
        let sValidTargetCol = {vaild:true, msg:``};
        // let sSelctColumn = this.oWpData.math_column[sTabIdx]['targetColumn']
        // let sNumericValue = JSON.parse(this.oSchema.data[0])[sSelctColumn]; //선택한 컬럼의 첫번째 value
        // if (!Number(sNumericValue)){
        //     sValidTargetCol.vaild = false;
        //     sValidTargetCol.msg += `문자형 변수는 수식 변환이 불가합니다.
        // `}
        // #141 변환 컬럼 체크
        let sChkDervColResult = this.chkDerivedColumn();
        if (!sChkDervColResult.valid){
            sValidTargetCol.vaild = false;
            sValidTargetCol.msg += sChkDervColResult.msg;
        }
        if (!sValidTargetCol.vaild){
            this.oComViewerSvc.showMsg(`${sValidTargetCol.msg}다른 컬럼을 선택해주세요`, false);
            this.oWpData[sTabIdx].targetColumn  = "";
        }
        // 대상 컬럼 validation
        // if (this.oWpData.math_column[sTabIdx].derivedOption == 'false'){
        //     this.oWpData.math_column[sTabIdx].derivedColumn = sSelctColumn;
        // }
    }
    // #141 변환 컬럼은 동일한 컬럼으로 지정할 수 없음(파생 컬럼 생성하지 않고 기존 컬럼 덮어쓰는 경우)
    chkDerivedColumn(){
        let sResult = {'valid':true, 'msg':''};
        let sChkCol:{[index:string]:any} = {};
        this.oWpData.forEach((sCol:any)=>{
        if (sChkCol[sCol.targetColumn])
            sChkCol[sCol.targetColumn].push(sCol.derivedOption);
        else
            sChkCol[sCol.targetColumn] = [sCol.derivedOption];
        })
        let sChkKey = Object.keys(sChkCol);
        sChkKey.forEach(sKey => { // derivedOption (false) : 파생컬럼을 생성하지 않을 경우에는 변환 컬럼은 중복될 수 없음
        if (sChkCol[sKey].includes('false') && sChkCol[sKey].length >= 2){
            sResult = {'valid':false, 'msg':`변환 대상 컬럼이 이미 선택되었습니다.
            `}
        }});
        return sResult;
    }
    setPopupSendData(pData:{value:any,schema:any,tableIndex:any,comId:string,methodText:any,methodProp:any,formdata:any}){
        this.oPopupSendData = pData
    }
        // onDervClick(pSelectValue:any, pType:string,pPopupInstance:any){
    //     if (pType == 'col'){
    //         this.addDerivedProp(`\`${pSelectValue}\``,pType, pPopupInstance);
    //     }
    //     if (pType == 'val' || pType == 'cal' ){
    //         this.addDerivedProp(pSelectValue,pType,pPopupInstance);
    //     }
    //     if (pType == 'fun'){
    //         pPopupInstance.setFunNm(pSelectValue);
    //     }
    // }
    // 파생컬럼 내용 직접 수정할 수 있게 변경됨.
    // addDerivedProp(pAddText:string, pType:string, pPopupInstance:any){
    //     let sValidInput = this.isValidMethod(pType, pPopupInstance);
    //     if (sValidInput.result){
    //         this.oPopupSendData.methodText.push(pAddText); // 화면에 표시할 Arr
    //         this.oPopupSendData.methodProp.push(pType); // 컬럼유형 정보 저장
    //         pPopupInstance.setViewTxt(this.oPopupSendData.methodText.join("")); // 화면에 표시할 Arr => String
    //         pPopupInstance.onSelectType(pPopupInstance.oDervColNameList[0],0);
    //         pPopupInstance.initUserInputData();
    //     }
    //     else {
    //         pPopupInstance.setWarnMsg(sValidInput.msg);
    //     }
    // }
    // onAddUserInput(pSelectType:string, pPopupInstance:any){
    //     pPopupInstance.setWarnMsg('');
    //     let sType = pSelectType;
    //     let sFunNm = pPopupInstance.hFuncNm;
    //     let sUserInputData = pPopupInstance.oUserInputData;
    //     let sAddText = '';
    //     if (sType == 'user_input'){
    //         let sIntResult = pPopupInstance.isValidInput(sUserInputData[sFunNm], 'integer');
    //         if (sIntResult.isValid){
    //             sAddText = sUserInputData[sFunNm];
    //         }
    //         else {
    //             sAddText = `'${sUserInputData[sFunNm]}'`;
    //         }
    //     }
    //     this.addDerivedProp(sAddText, sType, pPopupInstance);
    // }
    // isValidMethod(pType:string,pPopupInstance:any){
    //     let sMethodProp = this.oPopupSendData.methodProp
    //     let sUserInputData = pPopupInstance.oUserInputData;
    //     let sFunNm = pPopupInstance.hFuncNm;
    //     let sEmptyFlag = false;
    //     // 값이 비어져있으면 추가하라고 메시지
    //     if (pType == 'user' && (!sUserInputData.user_input || sUserInputData.user_input.length == 0))
    //         sEmptyFlag = true;
    //     if (sEmptyFlag)
    //         return {result:false, msg:'속성 값을 채운 후 추가해주세요'};

    //     // 현재 추가하는 속성값이 유효한지 확인
    //     if (sMethodProp.length > 0){
    //         let sLength = sMethodProp.length
    //         if (pType == 'cal'){
    //             if (sMethodProp[sLength-1] !== 'fun' && sMethodProp[sLength-1] !== 'col')
    //                 return {result:false, msg:'연산자 이전에 함수 또는 컬럼을 입력해주세요'};
    //         }
    //         else {
    //             if (sMethodProp[sLength-1] !== 'cal')
    //                 return {result:false, msg:`${pPopupInstance.oColInfo[pType]} 이전에 연산자를 입력해주세요`};
    //         }
    //     }
    //     else {
    //         if (pType == 'val' || pType == 'cal')
    //             return {result:false, msg:`${pPopupInstance.oColInfo[pType]} 이전에 함수 또는 컬럼을 입력해주세요`};
    //     }
    //     return {result:true, msg:''}
    // }
}