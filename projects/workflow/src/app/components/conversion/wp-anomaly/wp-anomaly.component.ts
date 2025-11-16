import { COM_ANOMAL_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpAnomalyData } from 'projects/wp-server/util/component/transper/wp-anomaly';
import { dxSelectChangeEvent } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 이상치 변환 컴포넌트 클래스
 * 
 * 이상치 변환 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpAnomalyData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 이상치 변환 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpAnomalyData | WpAnomalyData}
 * 
 * @example
 * ```ts
 *  this.oComponent = new WpAnomalyComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpAnomalyComponent extends WpComponent {
    oWpData: Array<COM_ANOMAL_ATT>;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpAnomalyData) { 
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
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info37"),
                name:'type',
                value:'',
                type:'select',
                fvalue:['remove','replace'],
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
                },
                { // #WPLAT-6 날짜 표현식 추가
                    vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info39"),
                    name: 'replaceType',
                    value: ["input", "min(value)", "max(value)", "avg(value)", "median(value)"],
                    type: 'select',
                    fvalue: [
                        pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40"),
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
                if (this.oWpData[sTabIdx]['type'] == 'remove'){
                    // WPLAT-380
                    this.onHideForm(sTabIdx, 'value');
                    this.onHideForm(sTabIdx, 'replaceType');
                } else {
                    let s_column = this.oWpData[sTabIdx].column;
                    if (s_column  != '') {
                        let s_colType = this.oSchema['schema'].find((item:any) => item.name === s_column).type;
                        if (s_colType == 'string') {
                            this.onShowForm(sTabIdx, 'value');
                            this.onHideForm(sTabIdx, 'replaceType');
                        } else {
                            if(this.oWpData[sTabIdx].value == '') {
                                if(this.oWpData[sTabIdx].replaceType !=this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40")) {
                                    this.onShowForm(sTabIdx, 'replaceType');
                                    this.onHideForm(sTabIdx, 'value');
                                } else {
                                    this.onShowForm(sTabIdx, 'value');
                                    this.onHideForm(sTabIdx, 'replaceType');
                                }
                            } else {
                                if(this.oWpData[sTabIdx].replaceType !=this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40")) {
                                    let sElem = document.getElementById(`${sTabIdx}_value`);
                                    sElem.style.display = 'none';
                                } else {
                                    let sElem = document.getElementById(`${sTabIdx}_replaceType`);
                                    sElem.style.display = 'none';
                                }
                            }
                        }
                    }

                }
            }
        }, 100);
    }
    onColTypeChange(pEvent:dxSelectChangeEvent, pTabIdx: number){
        // column을 선택하지 않고 처리 방법을 선택하려 하는 경우 메세지 띄움
        if (this.oWpData[pTabIdx].column == ''){
            this.oComViewerSvc.showMsg('이상치 변환 컬럼을 선택해주세요',false);
            this.oWpData[pTabIdx].type = '';
            pEvent.component._clearValue();
            // pEvent.target.selectedIndex = -1;
            return false;
        }
        // #216 처리 방법 remove일 때 대체값 입력 form 숨김
        if (this.oWpData[pTabIdx].type == 'remove') {
            // WPLAT-380
            this.onHideForm(pTabIdx, 'value');
            this.onHideForm(pTabIdx, 'replaceType');
        } else {
            this.onHideForm(pTabIdx, 'value');
            let s_column = this.oWpData[pTabIdx].column;
            let s_colType = this.oSchema['schema'].find((item:any) => item.name === s_column).type;
            if (s_colType == 'string') {
                this.onShowForm(pTabIdx, 'value');
                this.onHideForm(pTabIdx, 'replaceType');
            } else {
                if(this.oWpData[pTabIdx].value == '') {
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
        }
        return undefined;
    }
    onKeyUp(pEvent: any, pName: string, pTabIdx: number){
        let sRangeValue = pEvent.srcElement.value;
        let sTargetColumn = this.oWpData[pTabIdx]['column'];
        let sIsValidInput;
        // 이상치 변환 대상 컬럼의 컬럼 타입을 확인
        if (sTargetColumn == ""){
            this.oComViewerSvc.showMsg('이상치 변환 컬럼을 선택해주세요',false);
            pEvent.srcElement.value = "";
        } else {
            // 사용자 매개변수 사용으로 validation 주석
            // sIsValidInput = this.isTargetColumnType(sTargetColumn, sRangeValue);
            // // 입력값이 유효하지 않을 경우
            // if (!sIsValidInput.isValid){
            //     this.oComViewerSvc.showMsg(`대체값에 유효한 값(${sIsValidInput.type})을 입력하세요`,false);
            //     pEvent.srcElement.value = sIsValidInput.result;
            // }
        }
    }
    onShowForm(pTabIdx:any, pTargetName:string){
        let sElem = document.getElementById(`${pTabIdx}_${pTargetName}`);
        sElem.style.display = 'block';
    }
    onHideForm(pTabIdx: any, pTargetName: 'column' | 'type' | 'value' | 'replaceType') {
        let sElem = document.getElementById(`${pTabIdx}_${pTargetName}`);
        this.oWpData[pTabIdx][pTargetName] = '';
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
