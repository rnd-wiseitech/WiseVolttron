import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { WpDerivedColumnSetComponent } from '../../popup/wp-derived-column-set.component';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponentService } from '../../wp-component.service';
import { COM_DERV_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpDerivedData } from 'projects/wp-server/util/component/transper/wp-derived';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
/**
 * 데이터 변환 - 파생열 컴포넌트 클래스
 * 
 * 파생열 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpDerivedData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 파생열 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpDerivedData | WpDerivedData}
 * @params {@link WpComponentService | WpComponentService}
 * @params {@link MatDialog | MatDialog}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpDerivedColumnComponent(this.cComViewSvc, this.oComponentData, this.cWpComSvc, this.matDialog);
 * ```
 */
export class WpDerivedColumnComponent extends WpComponent {
    oWpData: Array<COM_DERV_ATT>;
    oSendColInfo:{[index:string]:any} = {};
    oWpComSvc:WpComponentService;
    oColNameList:string[] = []
    oColInfoList:{name:string, type:string}[] = []
    oPopupSendData:{
        value:any,
        schema:any,
        tableIndex:any,
        comId:string,
        methodText:any,
        methodProp:any,
        formdata:any
    };
    oPopupForm:any;
    public oDialog:MatDialog;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pWpData: WpDerivedData,
        pWpComSvc: WpComponentService,
        pDiaglog: MatDialog
                ) { 
        super(pComViewerSvc,pWpData);
        this.cTransSvc = pTransSvc;
        this.oWpComSvc = pWpComSvc;
        this.oDialog = pDiaglog;
        this.setFormData([{ 
            vname:'Derived column',
            name:'derivedColumnArray',
            value:'',
            type:'tab',
            fvalue:[
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info29"),
                name:'derivedColumn',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:null
                },
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info30"),
                name:'value',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:this.onClick.bind(this)
                }
            ],
            visible:true,
            edit:true,
            callbak:null
        }]);
        setTimeout(()=>{
            this.oWpData.forEach((sCol:any, sIndex:number) => {
                let sExprElem = document.getElementById(`value_${sIndex}`);
                //@ts-ignore
                sExprElem.setAttribute('readonly',true)
            })
        }, 50)
    }
    setDervInputReadOnly(){
        setTimeout(()=>{
            this.oWpData.forEach((sCol:any, sIndex:number) => {
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
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup20"),
                    name: 'val',
                    value: ["true", "false"],
                    type: 'select',
                    fvalue:["true", "false"],
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup21"),
                    name: 'cal',
                    value: ["+", "-","*","/","%",">",">=","<","<=","==","!="],
                    type: 'select',
                    fvalue:["+", "-","*","/","%",">",">=","<","<=","==","!="],
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup22"),
                    name: 'fun',
                    value: ["isnull", "abs","round","length","lower","upper","lpad","rpad","replace"],
                    type: 'select',
                    fvalue:["isnull", "abs","round","length","lower","upper","lpad","rpad","replace"],
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
                // },
                'isnull':{
                    vname: 'isnull',
                    name: 'isnull',
                    value: this.oColNameList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'abs':{
                    vname: 'abs',
                    name: 'abs',
                    value: this.oColNameList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'round':{
                    vname: 'round',
                    name: 'round',
                    value: '',
                    type: 'tab',
                    fvalue:[{
                            vname: '컬럼명',
                            name: 'col',
                            value: this.oColNameList,
                            type: 'select',
                            fvalue:this.oColNameList,
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '반올림할 자리 수',
                            name: 'roundNo',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        }
                    ],
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'length':{
                    vname: 'length',
                    name: 'length',
                    value: this.oColNameList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'lower':{
                    vname: 'lower',
                    name: 'lower',
                    value: this.oColNameList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'upper':{
                    vname: 'upper',
                    name: 'upper',
                    value: this.oColNameList,
                    type: 'select',
                    fvalue:this.oColNameList,
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'lpad':{
                    vname: 'lpad',
                    name: 'lpad',
                    value: '',
                    type: 'tab',
                    fvalue:[{
                            vname: '컬럼명',
                            name: 'col',
                            value: this.oColNameList,
                            type: 'select',
                            fvalue:this.oColNameList,
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '총 문자 길이',
                            name: 'length',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '채울 문자',
                            name: 'fill',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        }
                    ],
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'rpad':{
                    vname: 'rpad',
                    name: 'rpad',
                    value: '',
                    type: 'tab',
                    fvalue:[{
                            vname: '컬럼명',
                            name: 'col',
                            value: this.oColNameList,
                            type: 'select',
                            fvalue:this.oColNameList,
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '총 문자 길이',
                            name: 'length',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '채울 문자',
                            name: 'fill',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        }
                    ],
                    visible:true,
                    edit:true,
                    callbak:null
                },
                'replace':{
                    vname: 'replace',
                    name: 'replace',
                    value: '',
                    type: 'tab',
                    fvalue:[{
                            vname: '컬럼명',
                            name: 'col',
                            value: this.oColInfoList,
                            type: 'select',
                            fvalue:this.oColNameList,
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '대상문자',
                            name: 'target',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        },{
                            vname: '대체문자',
                            name: 'replace',
                            value: '',
                            type: 'text',
                            fvalue:'',
                            visible:true,
                            edit:true,
                            callbak:null
                        }
                    ],
                    visible:true,
                    edit:true,
                    callbak:null
                },
            },
            userInputDervColList:['fun']
            // userInputDervColList:['fun', 'user_input']
        };
    }
    onClick(pEvent: any, pTabIdx:number){
        let sMethodText = [];
        let sMethodProp = [];
    
        //#76 파생열 기존 입력 값이 있는 경우
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
                value: pEvent.srcElement.value, //transform_value
                schema : sColNms,
                tableIndex: pTabIdx,
                comId : this.oComId,
                methodText : sMethodText,
                methodProp : sMethodProp,
                formdata : this.oPopupForm,
            }
        );
        // this.oComViewerSvc.onDisplayDerivedPopup(sColInfo);
        const dialogRef = this.oDialog.open(WpDerivedColumnSetComponent, {
            id: 'wp-derived-component-set-popup',
            width: '900px',
            data: this.oPopupSendData
        });
        setTimeout(() => {
            dialogRef.componentInstance.setWarnMsg('컬럼명은 `컬럼명`과 같이 `으로 감싸주세요')
        }, 100);
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
                this.oWpData[pTabIdx].value = result['oMethodText'];
                this.oSendColInfo = result;
            }
        });
    }

    onKeyUp(pEvent: any, pName: 'derived_column' | 'transform_value', pTabIdx: number) {
        let sDervColNm = pEvent.srcElement.value; // 입력 값
        let sIsValidInput = this.isValidString(sDervColNm, 'colNm');
        // 입력값이 유효하지 않을 경우
        if (!sIsValidInput.isValid){
            this.oComViewerSvc.showMsg(`유효한 컬럼명을 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData[pTabIdx][pName] = sIsValidInput.result;
            pEvent.srcElement.value = sIsValidInput.result;
        }
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
    // addDerivedProp(pAddText:string, pType:string, pPopupInstance:any){
    //     let sValidInput = this.isValidMethod(pType, pPopupInstance);
    //     if (sValidInput.result){
    //         pPopupInstance.setWarnMsg('');
    //         this.oPopupSendData.methodText.push(pAddText); // 화면에 표시할 Arr
    //         this.oPopupSendData.methodProp.push(pType); // 컬럼유형 정보 저장
    //         pPopupInstance.setViewTxt(this.oPopupSendData.methodText.join("")); // 화면에 표시할 Arr => String
    //         // 초기화
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
    //     if (sType == 'fun'){
    //         let sFunInputData = sUserInputData[sFunNm];
    //         if (sFunNm == 'round'){
    //             let sResult = pPopupInstance.isValidInput(sFunInputData['roundNo'],'integer');
    //             if (!sResult.isValid){
    //                 pPopupInstance.setWarnMsg('유효한 값을 입력하세요');
    //                 return;
    //             }
    //             sAddText = `round(\`${sFunInputData['col']}\`,${sFunInputData['roundNo'].trim()})`;
    //         }
    //         else if (sFunNm == 'lpad' || sFunNm == 'rpad'){
    //             let sResult = pPopupInstance.isValidInput(sFunInputData['length'],'integer');
    //             if (!sResult.isValid){
    //                 pPopupInstance.setWarnMsg('유효한 값을 입력하세요');
    //                 return;
    //             }
    //             let sFillText = pPopupInstance.isNumeric(sFunInputData['fill']).text;
    //             sAddText = `${sFunNm}(\`${sFunInputData['col']}\`,${sFunInputData['length'].trim()},${sFillText})`;
    //         }
    //         else if (sFunNm == 'replace'){
    //             let sTargetText = pPopupInstance.isNumeric(sFunInputData['target'].trim()).text;
    //             let sReplaceText = pPopupInstance.isNumeric(sFunInputData['replace'].trim()).text;
    //             sAddText = `replace(\`${sFunInputData['col']}\`,${sTargetText},${sReplaceText})`;
    //         }
    //         else {
    //             sAddText = `${sFunNm}(\`${sFunInputData}\`)`;
    //         }
    //     }
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
    //     if (pType == 'fun'){
    //         if (sUserInputData[sFunNm].type == 'tab'){
    //             // 탭 안에 키값 비어있는지 확인 (대체문자는 비어도 됨.)
    //             let sKeyList = sUserInputData[sFunNm].fvalue.map((sCol:any) => sCol.name);
    //             sKeyList.forEach((sKey:any)=>{
    //                 if ((!sUserInputData[sFunNm][sKey] || sUserInputData[sFunNm][sKey] == '') && sKey!=='replace') {
    //                     sEmptyFlag = true;
    //                 }
    //             })
    //         } else {
    //             sEmptyFlag =(!sUserInputData[sFunNm] || sUserInputData[sFunNm] == '')? true : false;
    //         }
    //     }
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
