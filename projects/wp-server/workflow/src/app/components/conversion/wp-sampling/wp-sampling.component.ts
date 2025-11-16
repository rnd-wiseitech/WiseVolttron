import { COM_SAMPLE_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpSampleData } from 'projects/wp-server/util/component/transper/wp-sample';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 비율 샘플링 컴포넌트 클래스
 * 
 * 비율 샘플링 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSampleData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 비율 샘플링 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpSampleData | WpSampleData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpSamplingComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpSamplingComponent extends WpComponent {
    oWpData: COM_SAMPLE_ATT;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpSampleData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{ 
        vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info36"),
        name:'value',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:null
        }]);
    }
    
    public isValidValue(pTarget:any, pRexExp:any){
        if (!pRexExp.test(pTarget) || !(0<=Number(pTarget) && Number(pTarget)<=1))
            return {isValid: false, result: ""};
        else
            return {isValid: true, result: pTarget};
        }
        
    public isValidNumber(pTarget:any, pType:any){
        const sRexExpArr:{[index:string]:any} = {'double': /^[0-1]*(\.?[0-9]*)$/};
        let sRexExp = sRexExpArr[pType];
        return this.isValidValue(pTarget, sRexExp);
    }
    onKeyUp(pEvent:any, pName:string){
        let sSamplingRate = pEvent.srcElement.value; // 입력 값
        // 숫자 유효성 확인
        let sIsValidFloat = this.isValidNumber(sSamplingRate,'double');
        if (!sIsValidFloat.isValid){
            this.oComViewerSvc.showMsg(`비율 샘플링에 0~1 사이의 유효한 숫자('double')를 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData.value = sIsValidFloat.result;
            pEvent.srcElement.value = sIsValidFloat.result;
        }
    }
}
