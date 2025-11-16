import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
// @ts-ignore
import * as dataFormatJson from "../../../../../../../assets/resource/json/date_format.json";
import { WpComponentService } from '../../wp-component.service';
import { MatDialog } from '@angular/material/dialog';
import { WpDerivedColumnSetComponent } from '../../popup/wp-derived-column-set.component';
import { Subscription } from 'rxjs';
import { COM_DATE_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpDateData } from 'projects/wp-server/util/component/transper/wp-date';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
/**
 * 데이터 변환 - 날짜 컴포넌트 클래스
 * 
 * 날짜 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpDateData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 날짜 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpDateData | WpDateData}
 * @params {@link WpComponentService | WpComponentService}
 * @params {@link MatDialog | MatDialog}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpDateComponent(this.cComViewSvc, this.oComponentData, this.cWpComSvc, this.matDialog);
 * ```
 */
export class WpDateComponent extends WpComponent {
    oWpData: Array<COM_DATE_ATT>;
    oWpComSvc:WpComponentService;
    oSendColInfo = {};
    oDataFormatJSON = dataFormatJson['default'];
    oDataFormatObj = { ...dataFormatJson['default'].BASIC_FORMAT, ...dataFormatJson['default'].DATE_FORMAT, ...dataFormatJson['default'].TIME_FORMAT, ...dataFormatJson['default'].SEP};
    oPopupSendData:{
        value:any,
        schema:any,
        tableIndex:any,
        comId:string,
        methodText:any,
        formdata:any,
        descType:string
    };
    oPopupForm:any;
    public oDialog:MatDialog;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pWpData: WpDateData,
        pWpComSvc: WpComponentService,
        pDiaglog: MatDialog
        ) { 
        super(pComViewerSvc,pWpData);
        this.oWpComSvc = pWpComSvc;
        this.oDialog = pDiaglog;
        this.cTransSvc = pTransSvc;
        this.setFormData([{ 
            vname:'Date column',
            name:'date_column',
            value:'',
            type:'tab',
            fvalue:[{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info48"),
                name:'derivedOption',
                value:'',
                type:'button_toggle',
                fvalue:['true','false'],
                visible:true,
                edit:true,
                callbak:this.onChangeDerivedOption.bind(this)
            },{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info51"),
                name:'column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onColChange.bind(this)
                },
                // {
                //   vname:'기존 날짜 형식',
                //   name:'date_format',
                //   value:'',
                //   type:'text',
                //   fvalue:'',
                //   visible:true,
                //   edit:false,
                //   callbak:null
                // },  
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
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info52"),
                name:'dateFormatText',
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
        setTimeout(() => {
            this.oWpData.forEach((sCol:any, sIndex:number) => {
                let sDervColElem = document.getElementById(`${sIndex}_derivedColumn`);
                sDervColElem.style.display = sCol.derivedOption == 'false'? 'none': 'block'; // 파생열 생성 안하면 UI에서 파생열명 입력 부분 숨김
                let sTransFormElem = document.getElementById(`dateFormatText_${sIndex}`);
                //@ts-ignore
                sTransFormElem.setAttribute('readonly',true)
            });
        }, 50);
    }
    setDervColList(pSchema:any){
        this.oPopupForm = {
            'title': this.cTransSvc.instant("WPP_COMMON.POPUP.popup2"),
            'flag':true,
            'formdata':[
                {
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup28"),
                    name: 'basic_format',
                    value: Object.keys(this.oDataFormatJSON.BASIC_FORMAT),
                    type: 'select',
                    fvalue:Object.keys(this.oDataFormatJSON.BASIC_FORMAT),
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup29"),
                    name: 'date_format',
                    value: Object.keys(this.oDataFormatJSON.DATE_FORMAT),
                    type: 'select',
                    fvalue:Object.keys(this.oDataFormatJSON.DATE_FORMAT),
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup30"),
                    name: 'time_format',
                    value: Object.keys(this.oDataFormatJSON.TIME_FORMAT),
                    type: 'select',
                    fvalue: Object.keys(this.oDataFormatJSON.TIME_FORMAT),
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },{
                    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup31"),
                    name: 'sep',
                    value: ['-','.','/',':'],
                    type: 'select',
                    fvalue: ['-','.','/',':'],
                    visible:true,
                    edit:true,
                    callbak:{name:'onSelectValue', useData:true}
                },
            ],
            'formdataObject':{},
            userInputDervColList:[]
        };
    }
    // #141 기존 컬럼의 날짜 타입을 바꾸는 경우 (기존 컬럼과 파생열 컬럼명을 같은 값으로 할당)
    onChangeDerivedOption(pEvent:any, pRowIndex: any){
        this.oWpData[pRowIndex].derivedOption = pEvent.value;
        this.oWpData[pRowIndex].derivedColumn = '';
        this.oWpData[pRowIndex].column = '';
        let sDervColElem = document.getElementById(`${pRowIndex}_derivedColumn`);
        sDervColElem.style.display = pEvent.value == 'false'? 'none': 'block'; // 파생열 생성 안하면 UI에서 파생열명 입력 부분 숨김
        this.oComViewerSvc.showDiagramPreview(this.oComId, true);
    }
    onClick(pEvent: any, pTabIdx:number){
        let sMethodText:any = [];
        let sColNms:any = [];
        this.oSchema.schema.map((e:any)=>{
            sColNms.push(e.name);      
        });
        this.setPopupSendData(
            {
                value: this.oWpData[pTabIdx].dateFormatText,
                tableIndex : pTabIdx,
                schema:sColNms,
                comId : this.oComId,
                methodText : sMethodText,
                formdata : this.oPopupForm,
                descType: 'date'
            }
        );
        const dialogRef = this.oDialog.open(WpDerivedColumnSetComponent, {
            id: 'wp-derived-component-set-popup',
            width: '900px',
            data: this.oPopupSendData
        });
        let sDialogSubs:Subscription[] = [];
        sDialogSubs.push(
            dialogRef.componentInstance.selectionChanged
                .subscribe(pRes => {
                    if (pRes.eventNm == 'onSelectValue'){
                        this.addDerivedProp(pRes.selectedVal,dialogRef.componentInstance);
                    }
                })
        );
        dialogRef.afterClosed().subscribe(result => {
            sDialogSubs.forEach((sSub:Subscription) => {
                sSub.unsubscribe();
            })
            console.log(result);
            if (typeof result == 'undefined'){
                return null;
            }
            if (result['comId'] == this.oComId){
                this.oWpData[pTabIdx].dateFormatText = result['oMethodText'];
                // dateformat이 [PYTHON 날짜 포맷, SPARK 날짜 포맷] 형태로 API 파라미터 변경 됨.
                this.oWpData[pTabIdx].value = [
                    result['oMethodTextArr'].map((sJsFormat: string) => this.oDataFormatObj[sJsFormat]['PYTHON']).join(""),
                    result['oMethodTextArr'].map((sJsFormat: string) => this.oDataFormatObj[sJsFormat]['SPARK']).join("")
                ];
                this.oSendColInfo = result;
            }
        });
    }
    addDerivedProp(pAddText:string, pPopupInstance:any){
        pPopupInstance.setWarnMsg('');
        this.oPopupSendData.methodText.push(pAddText); // 화면에 표시할 Arr
        pPopupInstance.setViewTxt(this.oPopupSendData.methodText.join("")); // 화면에 표시할 Arr => String
        pPopupInstance.onSelectType(pPopupInstance.oDervColNameList[0],0);
        pPopupInstance.initUserInputData();
    }
    
    public onColChange(pEvent:any, pTabIdx:number){
        let sDate = JSON.parse(this.oSchema.data[0])[this.oWpData[pTabIdx].column]; //선택한 컬럼의 첫번째 value
        let sValidTargetCol = {vaild:true, msg:``};
        // if (sComId == this.oComId) {
            // "20200101" 처럼 string 타입으로 되어있을 수도 있어서 그냥 모든 변수를 변환 가능하게 함.
            // try { // 날짜 형식으로 변환 가능한 변수인지 확인
            //     let sNumDate = Number(sDate);
            //     let sValidDate = sNumDate? dateFormat(sNumDate, "isoDate") : dateFormat(sDate, "isoDate");
            //     // 변환한 dateformat 확인 dateFormat은 문자열 들어갔을때 원문을 그대로 반환하므로 datetype 체크함. dateFormat('문자', 'isoDate')->'문자'
            //     let sDateResult = this.getDateFormat(sValidDate);
            //     if (!sDate || sDateResult!=="yyyy-MM-dd"){
            //         sValidTargetCol.vaild = false ;
            //         sValidTargetCol.msg += `날짜형식으로 변환이 불가합니다. 다른 컬럼을 선택해주세요
            //         `;
            //     }
            // } catch (error) {
            //     sValidTargetCol.vaild = false ;
            //     sValidTargetCol.msg += `날짜형식으로 변환이 불가합니다. 다른 컬럼을 선택해주세요
            //     `;
            // }
        // #141 변환 컬럼 체크
        let sChkDervColResult = this.chkDerivedColumn();
        if (!sChkDervColResult.valid){
            sValidTargetCol.vaild = false;
            sValidTargetCol.msg += sChkDervColResult.msg;
        }
        if (!sValidTargetCol.vaild){
            this.oComViewerSvc.showMsg(`${sValidTargetCol.msg}다른 컬럼을 선택해주세요`, false);
            pEvent.component._clearValue();
            this.oWpData[pTabIdx].column = "";
        }
        // 대상 컬럼 validation
        if (this.oWpData[pTabIdx].derivedOption == 'false'){
            this.oWpData[pTabIdx].derivedColumn = this.oWpData[pTabIdx].column;
        }
        // }
    }
    // #141 변환 컬럼은 동일한 컬럼으로 지정할 수 없음(파생 컬럼 생성하지 않고 기존 컬럼 덮어쓰는 경우)
    chkDerivedColumn(){
        let sResult = {'valid':true, 'msg':''};
        let sChkCol:{[index: string]:any} = {};
        this.oWpData.forEach((sCol:any)=>{
        if (sChkCol[sCol.column])
            sChkCol[sCol.column].push(sCol.derivedOption);
        else
            sChkCol[sCol.column] = [sCol.derivedOption];
        })
        let sChkKey = Object.keys(sChkCol)
        sChkKey.forEach(sKey => { // derivedOption (false) : 파생컬럼을 생성하지 않을 경우에는 변환 컬럼은 중복될 수 없음
            if (sChkCol[sKey].includes('false') && sChkCol[sKey].length >= 2){
                sResult = {'valid':false, 'msg':`변환 대상 컬럼이 이미 선택되었습니다.
                `}
            }
        });
        return sResult;
    }

    getDateFormat(pDate:any){
        var sRexExp:{[index: string]:any} = {'yyyy-MM-dd': /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/,
                    'yyyyMMdd': /^(19|20)\d{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[0-1])$/,
                    'yyyy-MM-dd HH:mm:ss': /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1]) (0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/,
                    'HH:mm:ss':/^([1-9]|[01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/};
        for (let sFormat in sRexExp){
            if(sRexExp[sFormat].test(pDate)){
                return sFormat;
            }
        }
        return false;
    }

    onKeyUp(pEvent: any, pName: 'derived_column', pTabIdx: number) {
        let sDervColNm = pEvent.srcElement.value; // 입력 값
        let sIsValidInput;
        sIsValidInput = this.isValidString(sDervColNm, 'colNm');
        // 입력값이 유효하지 않을 경우
        if (!sIsValidInput.isValid){
            this.oComViewerSvc.showMsg(`유효한 컬럼명을 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData[pTabIdx][pName] = sIsValidInput.result;
            pEvent.srcElement.value = sIsValidInput.result;
        }
    }
    setPopupSendData(pData:{value:any,schema:any,tableIndex:any,comId:string,methodText:any,formdata:any,descType:string}){
        this.oPopupSendData = pData;
    }
}
