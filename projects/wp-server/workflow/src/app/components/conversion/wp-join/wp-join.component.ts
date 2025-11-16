import { COM_JOIN_ATT, WpComSchema } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComData, WpNodePro } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpJoinData } from 'projects/wp-server/util/component/transper/wp-join';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
;
/**
 * 데이터 변환 - 조인 컴포넌트 클래스
 * 
 * 조인 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpJoinData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 조인 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpJoinData | WpJoinData}
 * @params {@link WpNodePro[] | WpNodePro[]}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpJoinComponent(this.cComViewSvc, this.oComponentData, sNodes);
 * ```
 */
export class WpJoinComponent extends WpComponent {
    oColNmList_1: any[];
    oColNmList_2: any[];
    oWpNodes: any;
    oWpData: COM_JOIN_ATT;
    oJobIdList: string[];
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpJoinData, 
        pNodes: any) {
        super(pComViewerSvc, pWpData);
        this.oWpNodes = pNodes;
        this.setFormData([{ 
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info21"),
            name:'usetable_name',
            value:'',
            type:'select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:this.onUseTableChange.bind(this)
        },
        { 
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info23"),
            name:'jointable_name',
            value:'',
            type:'select',
            fvalue:[],
            visible:true,
            edit:true,
            callbak:this.onJoinTableChange.bind(this)
        },
        {
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info24"),
            name:'type',
            value:'',
            type:'select',
            fvalue:['inner','left_outer','right_outer'],
            visible:true,
            edit:true,
            callbak:null
        },
        { 
            vname:'Target Column',
            name:'joinKey',
            value:'',
            type:'tab',
            fvalue:[{ 
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info25"),
                name:'useColumn',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:null
            },
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info26"),
                name:'joinColumn',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:null
            }],
            visible:true,
            edit:true,
            callbak:null
        }]);
    }
    
    public onUseTableChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        this.oWpData.usetable_jobId = this.oJobIdList[sIndex]; // [usetable] 선택된 파일 jobId 변경
        if (sIndex == 0){ // 첫번째 데이터 선택할 경우
            this.oFormData.map(e=>{
                if (e.name == 'joinKey')
                    e.fvalue[0].fvalue = this.oColNmList_1; // [usetable] 컬럼 리스트 변경
            });
        }
        else { // 두번째 데이터 선택할 경우
            this.oFormData.map(e=>{
                if (e.name == 'joinKey')
                    e.fvalue[0].fvalue = this.oColNmList_2;
            })
        }
    }

    public onJoinTableChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        this.oWpData.jointable_jobId = this.oJobIdList[sIndex]; // [join_table] 선택된 파일 jobId 변경
        if (sIndex == 0){ // 첫번째 데이터 선택할 경우
            this.oFormData.map(e=>{
                if (e.name == 'joinKey')
                    e.fvalue[1].fvalue = this.oColNmList_1; // [join_table] 컬럼 리스트 변경
            })
        } else {
            this.oFormData.map(e=>{
                if (e.name == 'joinKey')
                    e.fvalue[1].fvalue = this.oColNmList_2;
            })
        }
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
        // 저장된 워크플로우를 불러올 때
        if (sTmpData.length < 10){
            if (sTmpData.length!==0)
                sMergeData.push(JSON.stringify(Object.assign(sTmpData[0],sTmpData[1])));
        }
        else {
            for(let sIdx=0; sIdx < 6; sIdx++){
                sMergeData.push(JSON.stringify(Object.assign(sTmpData[sIdx],sTmpData[sIdx + 20])));
        }
        }
        this.oColNmList_1 = this.oSchema[0].schema.map((sCol: WpComSchema) => sCol.name);
        this.oColNmList_2 = this.oSchema[1].schema.map((sCol: WpComSchema) => sCol.name);
        this.oJobIdList = sJobIdList;
        this.oFormData.map(e=>{
            if (e.name == 'usetable_name' || e.name == 'jointable_name')
                e.fvalue = sFileNmList;
            else if (e.name == 'joinKey')
                e.fvalue.map((e1:any) => {
                    if (e1.name == 'useColumn'){
                        e1.fvalue = this.oColNmList_1;
                    } else {
                        e1.fvalue = this.oColNmList_2;
                    }
                })
        });
        let sNewDataSet = {
            data: sMergeData,
            id: "",
            name: "조인데이터.csv",
            schema: sTmpSchema,
            type: COM_ID['T-JOIN'],
            text: 'T-JOIN'
        }
        this.oComViewerSvc.selectData(sNewDataSet);
    }
    
}
