import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponent } from '../../wp-component';
import { COM_SORT_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpSortData } from 'projects/wp-server/util/component/transper/wp-sort';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';

/**
 * 데이터 변환 - 정렬 컴포넌트 클래스
 * 
 * 정렬 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSortData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 정렬 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpSortData | WpSortData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpSortComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpSortComponent extends WpComponent {
    oWpData: Array<COM_SORT_ATT>;
    constructor(pComViewerSvc: WpComponentViewerService, pWpData: WpSortData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{ 
            vname:'Sort',
            name:'sort',
            value:'',
            type:'tab',
            fvalue:[{
                vname:'컬럼명',
                name:'column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                callbak:this.onColChange.bind(this),
                edit:true
            },
            {
                vname:'정렬 방식',
                name:'type',
                value:'',
                type:'select',
                fvalue:['desc','asc'],
                visible:true,
                edit:true
            }],
            visible:true,
            edit:true,
            callbak:null
        }]);
    }
    onColChange(pEvent:any){
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent);
        let {sComId, sTabIdx} = sCurrentTabInfo;
        let sColName = this.oWpData[sTabIdx].column;
        // 동일 컬럼을 여러번 정렬 대상으로 설정할 수 없도록 막음
        let sColCount = 0;
        this.oWpData.forEach((sCol:any) => {
            if (sCol.column == sColName)
                sColCount ++;
            })
        if (sColCount > 1){
            this.oComViewerSvc.showMsg('컬럼을 중복하여 선택할 수 없습니다',false);
            pEvent.component._clearValue();
            // pEvent.target.selectedIndex = -1
            if (sComId == this.oComId){ 
                this.oWpData[sTabIdx].column  = '';
                this.oWpData[sTabIdx].type  = '';
            } 
        }
    }

    
}
