import { COM_NULL_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpNullData } from 'projects/wp-server/util/component/transper/wp-null';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - NULL 변환 컴포넌트 클래스
 * 
 * NULL 변환 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpNullData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 이상치 변환 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpNullData | WpNullData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpNullComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpNullComponent extends WpComponent {
    oWpData: Array<COM_NULL_ATT>;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpNullData) { 
        super(pComViewerSvc,pWpData);
        this.cTransSvc = pTransSvc;
        this.setFormData([{ 
        vname:'Operators',
        name:'operators',
        value:'',
        type:'tab',
        fvalue:[
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"),
                name:'column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true
            },
            { // #WPLAT-6 날짜 표현식 추가
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info37"),
                name: 'type',
                value: '',
                type: 'select',
                fvalue: ['remove', 'replace', 'dateexp'],
                visible:true,
                edit:true,
                callbak:this.onColTypeChange.bind(this)
            },
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info38"),
                name:'value',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:this.onColValueChange.bind(this)
            }, { // #WPLAT-6 날짜 표현식 추가
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button7"),
                name: 'dateexp',
                value: '',
                type: 'select',
                fvalue: ["yyyy-mm-dd", "yyyymmdd", "yyyymmddHHMMss", "yyyy-mm-dd HH:MM:ss"],
                visible: true,
                edit: true,
                callbak: null
            },
            { // WPLAT-362
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info39"),
                name: 'replaceType',
                value: ["input", "min(value)", "max(value)", "avg(value)", "median(value)"],
                type: 'select',
                fvalue: [pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info41"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info42"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info43"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info44")],
                visible: true,
                edit: true,
                callbak: this.onReplaceTypeChange.bind(this)
            }],
            visible:true,
            edit:true,
            callbak:null
        }]);
        // #216 처리 방법 remove일 때 대체값 입력 form 숨김
        setTimeout(() => {
            for (let sTabIdx = 0; sTabIdx < this.oWpData.length; sTabIdx++) {
                this.setFormByTransformType(sTabIdx);
            }
        }, 100);
    }
    setFormByTransformType(pTabIdx: any) {
        // 1. (결측값 제거) 대체값, 날짜 표현식 숨김
        if (this.oWpData[pTabIdx].type == 'remove') {
            this.onHideForm(pTabIdx, 'value');
            this.onHideForm(pTabIdx, 'dateexp');
            this.onHideForm(pTabIdx, 'replaceType');
        }
        // 2. (결측값 대체) 대체값 표시, 날짜 표현식 숨김
        else if (this.oWpData[pTabIdx].type == 'replace') {
            // WPLAT-380
            let s_column = this.oWpData[pTabIdx].column;
            let s_colType = this.oSchema['schema'].find((item:any) => item.name === s_column).type;
            if (s_colType == 'string') {
                this.onShowForm(pTabIdx, 'value');
                this.onHideForm(pTabIdx, 'replaceType');
            } else {
                if(this.oWpData[pTabIdx].value == ' ') {
                    console.log("this.oWpData[pTabIdx].replaceType : ", this.oWpData[pTabIdx].replaceType);
                    if(this.oWpData[pTabIdx].replaceType !=this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40")) {
                        this.onShowForm(pTabIdx, 'replaceType');
                        this.onHideForm(pTabIdx, 'value');
                    } else {
                        this.onShowForm(pTabIdx, 'value');
                        this.onHideForm(pTabIdx, 'replaceType');
                    }
                } else {
                    if(this.oWpData[pTabIdx].replaceType !=this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40")) {
                        let sElem = document.getElementById(`${pTabIdx}_value`);
                        sElem.style.display = 'none';
                    } else {
                        let sElem = document.getElementById(`${pTabIdx}_replaceType`);
                        sElem.style.display = 'none';
                    }
                }

            }

            this.onHideForm(pTabIdx, 'dateexp');
            
        }
        // 3. (날짜표현식) 대체값 숨김, 날짜 표현식 표시
        else if (this.oWpData[pTabIdx].type == 'dateexp') {
            this.onHideForm(pTabIdx, 'value');
            this.onHideForm(pTabIdx, 'replaceType');
            this.onShowForm(pTabIdx, 'dateexp');
        }
        else {
            this.onHideForm(pTabIdx, 'dateexp');
        }
    }

    onColTypeChange(pEvent:any){
        let {sComId, sTabIdx} = this.oComViewerSvc.getCurrentTabInfo(pEvent);
        // column을 선택하지 않고 처리 방법을 선택하려 하는 경우 메세지 띄움
        if (this.oWpData[sTabIdx].column == ''){
            this.oComViewerSvc.showMsg('NULL 변환 컬럼을 선택해주세요',false);
            this.oWpData[sTabIdx].type = '';
            pEvent.component._clearValue();
            // pEvent.target.selectedIndex = -1;
            return false;
        }
        // event 발생한 component와 동일한 component에만 적용
        if (sComId == this.oComId) {
            this.setFormByTransformType(sTabIdx);
        }
        return undefined;
    }
    
    // 다른 component 선택후 돌아왔을 때 type이 remove이면 입력하지 못하게 함
    onColValueChange(pEvent:any){
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent); // 공통으로 사용하는 기능 수정
        let sComId = sCurrentTabInfo.sComId;
        let sTabIdx = sCurrentTabInfo.sTabIdx;
        
        if (sComId == this.oComId && this.oWpData[sTabIdx].type == 'remove'){
            this.oWpData[sTabIdx].value = ' ';
            document.getElementById(sTabIdx+'_value').getElementsByTagName('input')[0].setAttribute( 'disabled', 'true' );
        } else {
            return;
        }
    }
    // #12 component validation
    onKeyUp(pEvent:any, pName:string){
        let {sComId, sTabIdx} = this.oComViewerSvc.getCurrentTabInfo(pEvent,`#${pEvent.target.id}`);
        let sRangeValue = pEvent.srcElement.value;
        let sTargetColumn = this.oWpData[sTabIdx]['column'];
        let sIsValidInput;
        // NULL 대체 validation 주석 처리
        // // NULL 변환 컬럼의 컬럼 타입을 확인
        // if (sTargetColumn == ""){
        //     this.oComViewerSvc.showMsg('NULL 변환 컬럼을 선택해주세요',false);
        //     pEvent.srcElement.value = "";
        // }
        // else {
        //     sIsValidInput = this.isTargetColumnType(sTargetColumn, sRangeValue);
        //     // 입력값이 유효하지 않을 경우
        //     if (!sIsValidInput.isValid){
        //         this.oComViewerSvc.showMsg(`대체값에 유효한 값(${sIsValidInput.type})을 입력하세요`,false);
        //         this.oWpData.operators[sTabIdx]['value'] = sIsValidInput.result;
        //         pEvent.srcElement.value = sIsValidInput.result;
        //     }
        // }
    }
    onShowForm(pTabIdx:any, pTargetName:string){
        let sElem = document.getElementById(`${pTabIdx}_${pTargetName}`);
        sElem.style.display = 'block';
    }
    onHideForm(pTabIdx: any, pTargetName: 'column' | 'type' | 'value' | 'dateexp' | 'replaceType') {
        let sElem = document.getElementById(`${pTabIdx}_${pTargetName}`);
        if (pTargetName === 'value') {
            this.oWpData[pTabIdx][pTargetName] = ' ';
        } else {
            this.oWpData[pTabIdx][pTargetName] = '';
        }
        sElem.style.display = 'none';
    }

    // WPLAT-380
    onReplaceTypeChange(p_event: any) {
        let {sComId, sTabIdx} = this.oComViewerSvc.getCurrentTabInfo(p_event);
        if(p_event.value == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40")) {
            this.onShowForm(sTabIdx, 'value');
            this.onHideForm(sTabIdx, 'replaceType');
            this.oWpData[sTabIdx].replaceType = this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40");
        } else if (p_event.value == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info41")) {
            this.oWpData[sTabIdx].value = 'min(value)';
        } else if (p_event.value == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info42")) {
            this.oWpData[sTabIdx].value = 'max(value)';
        } else if (p_event.value == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info43")) {
            this.oWpData[sTabIdx].value = 'avg(value)';
        }else if (p_event.value == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info44")) {
            this.oWpData[sTabIdx].value = 'median(value)';
        }
    }
}
