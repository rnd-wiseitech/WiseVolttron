import { COM_GROUP_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpGroupData } from 'projects/wp-server/util/component/transper/wp-group';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';import { TranslateService } from '@ngx-translate/core';
;
/**
 * 데이터 변환 - 그룹화 컴포넌트 클래스
 * 
 * 그룹화 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpGroupData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 그룹화 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpGroupData | WpGroupData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpGroupingComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpGroupingComponent extends WpComponent {
    oWpData: COM_GROUP_ATT;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpGroupData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info54"),
            name:'column',
            value:'',
            type:'select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:null
        },{
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
            vname:'Group by',
            name:'groupby',
            value:'',
            type:'tab',
            fvalue:[
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info55"),
                name:'minRange',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true
                },
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info56"),
                name:'maxRange',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true
                },
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info57"),
                name:'value',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true
                // callbak:this.setRangeLabel.bind(this)
                }
            ],
            visible:true,
            edit:true,
            callbak:null
        }]);
    }
    // #25 그룹화 컴포넌트에서 변수 범위 검증
    onKeyUp(pEvent:any, pName:string, pTabIdx:number){
        if (pName == 'derivedColumn'){
            let sDervColNm = pEvent.srcElement.value
            let sIsValidInput;
            sIsValidInput = this.isValidString(sDervColNm, 'colNm');
            // 입력값이 유효하지 않을 경우
            if (!sIsValidInput.isValid){
                this.oComViewerSvc.showMsg(`유효한 컬럼명을 입력하세요`,false);
                // oWpData, input text 수정
                this.oWpData.derivedColumn = sIsValidInput.result;
                pEvent.srcElement.value = sIsValidInput.result;
            }
            return;
        }
        let sTargetColumn = this.oWpData['column'];
        let sIsValidInput;
        if (sTargetColumn == ""){
            this.oComViewerSvc.showMsg('그룹 대상 컬럼을 선택해주세요',false);
            pEvent.srcElement.value = "";
        }
        else {
            // 변수 범위 검증으로 수정
            if (pName == 'minRange' || pName == 'maxRange') {
                let sRangeValue = pEvent.srcElement.value;
                sIsValidInput = this.isTargetColumnType(sTargetColumn, sRangeValue);
                // 입력값이 유효하지 않을 경우
                if (!sIsValidInput.isValid) {
                    this.oComViewerSvc.showMsg(`변수 범위에 유효한 변수 타입(${sIsValidInput.type})을 입력하세요`, false);
                    this.oWpData.groupby[pTabIdx][pName] = sIsValidInput.result;
                    pEvent.srcElement.value = sIsValidInput.result;
                }        
            }
        }
    }
}
