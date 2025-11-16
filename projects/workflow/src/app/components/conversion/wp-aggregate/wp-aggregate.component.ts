import { COM_AGG_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpAggData } from 'projects/wp-server/util/component/transper/wp-agg';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 집계 컴포넌트 클래스
 * 
 * 집계 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpAggData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 집계 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpAggData | WpAggData}
 * 
 * @example
 * ```ts
 *  this.oComponent = new WpAggregateComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpAggregateComponent extends WpComponent {
    oWpData: COM_AGG_ATT
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpAggData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info33"),
            name:'groupColumn',
            value:'',
            type:'multiple_select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:null
        },
        {
            vname:'Group by',
            name:'aggKey',
            value:'',
            type:'tab',
            fvalue:[
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info34"),
                name:'column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true
            },
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info35"),
                name:'type',
                value:'',
                type:'select',
                fvalue:['avg','count','sum','min','max'], // #24 집계 표시 수정
                visible:true,
                edit:true
            }],
            visible:true,
            edit:true,
            callbak:null
        }]);
    }
}
