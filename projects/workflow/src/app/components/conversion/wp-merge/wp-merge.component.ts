import { COM_MERGE_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpNodePro } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpMergeData } from 'projects/wp-server/util/component/transper/wp-merge';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
;
/**
 * 데이터 변환 - 병합 컴포넌트 클래스
 * 
 * 병합 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpMergeData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 병합 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpMergeData | WpMergeData}
 * @params {@link WpNodePro[] | WpNodePro[]}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpMergeComponent(this.cComViewSvc, this.oComponentData, sNodes);
 * ```
 */
export class WpMergeComponent extends WpComponent {
    oWpNodes: any;
    oWpData: COM_MERGE_ATT
    oJobIdList: string[];
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpMergeData, 
        pNodes: any) { 
        super(pComViewerSvc,pWpData);
        this.oWpNodes = pNodes;
        this.setFormData([{ 
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info21"),
            name:'usetable_name',
            value:'',
            type:'select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:this.onColTableChange.bind(this)
        },
        { 
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info22"),
            name:'mergetable_name',
            value:'',
            type:'select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:this.onColValueChange.bind(this)
        }]);
    }

    public onColTableChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        this.oWpData.usetable_jobId = this.oJobIdList[sIndex]; // [usetable] 선택된 파일 jobId 변경
    }

    public onColValueChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        this.oWpData.mergetable_jobId = this.oJobIdList[sIndex]; // [mergeTable] 선택된 파일 jobId 변경
    }

    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        let sTmpSchema = [];
        let sFileNmList:string[] = [];
        let sJobIdList = [];
        let sTmpData = [];
        let sMergeData = [];
        for (let sSchema of this.oSchema) {
            let sWpNode = this.oWpNodes.find((sItem: WpNodePro) => sItem.id === sSchema.id)
            sFileNmList.push(`${sWpNode.text} (job:${sWpNode.jobId})`);
            sJobIdList.push(sWpNode.jobId);
            for(let sCom of sSchema.schema){
                sTmpSchema.push(sCom);
            }
            for(let sData of sSchema.data){
                sTmpData.push(JSON.parse(sData));        
            }
        }
        // #80 저장된 워크플로우를 불러올 때
        if (sTmpData.length < 10){
            // I-STREAMING 데이터 추가 후 수정 예정
            if (sTmpData.length!==0)
                sMergeData.push(JSON.stringify(Object.assign(sTmpData[0],sTmpData[1])));
        } else {
            for(let sIdx=0; sIdx < 6; sIdx++){
                sMergeData.push(JSON.stringify(Object.assign(sTmpData[sIdx],sTmpData[sIdx + 20])));
            }
        }
        // for(let sIdx=0; sIdx < 6; sIdx++){
        //   sMergeData.push(JSON.stringify(Object.assign(sTmpData[sIdx],sTmpData[sIdx + 20])));
        // }
        this.oJobIdList = sJobIdList;
        this.oFormData.map(e=>{
            if (e.name == 'usetable_name' || e.name == 'mergetable_name')
                e.fvalue = sFileNmList;
        });
        let sNewDataSet = {
            data: sMergeData,
            id: "",
            name: "병합데이터.csv",
            schema: sTmpSchema,
            type: COM_ID['T-MERGE'],
            text: 'T-MERGE'
        }
        this.oComViewerSvc.selectData(sNewDataSet);
        // super.setColList(sTmpSchema);
    }
}
