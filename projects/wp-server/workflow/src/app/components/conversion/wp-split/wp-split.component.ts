import { COM_SPLIT_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpSplitData } from 'projects/wp-server/util/component/transper/wp-split';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 필터 분할 컴포넌트 클래스
 * 
 * 필터 분할 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSplitData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 필터 분할 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpSplitData | WpSplitData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpSliceComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpSplitComponent extends WpComponent {
    oWpData: COM_SPLIT_ATT;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpSplitData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{ 
            vname:'Filters',
            name:'filters',
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
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info27"),
                name:'type',
                value:'',
                type:'select',
                fvalue:['==','>','<','>=','<=','!='],
                visible:true,
                edit:true
                },
                {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info28"),
                name:'value',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true
                },],
            visible:true,
            edit:true,
            callbak:null
            },
        ]);
    }
    onKeyUp(pEvent:any, pName:string){
        let {sComId, sTabIdx} = this.oComViewerSvc.getCurrentTabInfo(pEvent,`#${pEvent.target.id}`);
        let sRangeValue = pEvent.srcElement.value; // 입력 값
        let sIsValidInput;
        if (sTabIdx == -1) {
            this.oComViewerSvc.showMsg('필터 분할 컬럼을 선택해주세요',false);
            pEvent.srcElement.value = "";
        }
        // else {
        //     let sTargetColumn = this.oWpData.filters[(sTabIdx as number)]['target_column'];
        //     sIsValidInput = this.isTargetColumnType(sTargetColumn, sRangeValue);
        //     // 입력값이 유효하지 않을 경우
        //     if (!sIsValidInput.isValid){
        //         this.oComViewerSvc.showMsg(`기준값에 유효한 변수 타입(${sIsValidInput.type})을 입력하세요`,false);
        //         this.oWpData.filters[(sTabIdx as number)]['transform_value'] = sIsValidInput.result;
        //         pEvent.srcElement.value = sIsValidInput.result;
        //     }
        // }
    }
}
