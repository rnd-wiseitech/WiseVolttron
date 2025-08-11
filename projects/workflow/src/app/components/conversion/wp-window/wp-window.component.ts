import { COM_WINDOW_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpWindowData } from 'projects/wp-server/util/component/transper/wp-window';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 시계열 컴포넌트 클래스
 * 
 * 시계열 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpWindowData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 시계열 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpTypeData | WpWindowData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpWindowComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpWindowComponent extends WpComponent {
    oWpData: COM_WINDOW_ATT; //type override
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpWindowData) {  
    super(pComViewerSvc,pWpData);
    this.setFormData([{ 
        vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info45"),
        name:'column',
        value:'',
        type:'select',
        fvalue:[],
        visible:true,
        edit:true,
        callbak:null
    },
    { 
        vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info46"),
        name:'indexColumn',
        value:'',
        type:'select',
        fvalue:[],
        visible:true,
        edit:true,
        callbak:this.onColChange.bind(this)
    },
    {
        vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info47"),
        name:'value',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:null
    }]);
    }
    public setColList(pList:string[]){
        this.oFormData.map(e=>{
            if(e.name=='column' || e.name=='indexColumn'){
                e.fvalue = pList;
            }
            // if(e.name=='group_column'){
            //   e.fvalue = ['선택 안함'].concat(pList);
            // }
            });         
    };
    // #26 시계열 컴포넌트 변수 검증
    public onColChange(pEvent:any){
        let sDate = JSON.parse(this.oSchema.data[0])[this.oWpData.indexColumn];//선택한 컬럼의 첫번째 value
        let sDateFormat:any = this.getDateFormat(sDate);
        // this.setDateFormat(pEvent, sDateFormat);
    }
    getDateFormat(pDate:any){
        var sRexExp:{[index:string]:any} = {'yyyy-MM-dd': /^(19|20)\d{2}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[0-1])$/,
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
    setDateFormat(pEvent:any, pDateFormat:string){
        if (!pDateFormat){
            // #26 시계열 컴포넌트 변수 검증
            this.oComViewerSvc.showMsg('날짜 타입의 변수를 선택해주세요',false);
            // 날짜 변수 아닐 경우 선택한 인덱스(시간) 컬럼 초기화
            this.oWpData.indexColumn = "";
            pEvent.component._clearValue()
            // pEvent.target.value = null;
        }
    }
    // #26 시계열 컴포넌트 변수 검증(윈도우 사이즈) integer
    onKeyUp(pEvent:any, pName:string){
        let sWindowSize = pEvent.srcElement.value; // 입력 값
        // 숫자 유효성 확인
        let sIsValidFloat = this.isValidNumber(sWindowSize,'integer');
        if (!sIsValidFloat.isValid){
            this.oComViewerSvc.showMsg(`윈도우 사이즈에 유효한 숫자('integer')를 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData.value = sIsValidFloat.result;
            pEvent.srcElement.value = sIsValidFloat.result;
        }
    }
}
