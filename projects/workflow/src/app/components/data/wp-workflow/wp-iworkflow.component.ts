import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { IWpProperties, WpPropertiesWrap } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { WpComponentViewerService } from "../../wp-component-viewer.service";
import { COM_IWORKFLOW_ATT, WpComData } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpDataSourceData } from "projects/wp-server/util/component/data/wp-datasource";
import { WpDiagramService } from "../../../wp-diagram/wp-diagram.service";
import { TranslateService } from "@ngx-translate/core";

export class WpIWorkflowComponent implements IWpProperties {
    hide = false;
    public oFormData: WpPropertiesWrap[];

    public oSelectData: any = {};
    public oProcess: boolean = false;
    public oComViewerSvc: WpComponentViewerService;
    public oDiagramPreviewSvc: WpDiagramPreviewService;
    public oDiagramSvc: WpDiagramService;
    oWpData: COM_IWORKFLOW_ATT;
    oWpSocketSvc: WpSocket;
    oWorkFlowList: any[];
    
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pComponentData: WpDataSourceData,
        pDiagramPreviewSvc: WpDiagramPreviewService,
        pWpSocketSvc: WpSocket,
        pDiagramSvc: WpDiagramService
    ) {
        this.oFormData = [
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info14"),
                name: 'workflow',
                value: '',
                type: 'select',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onChangeWorkflow.bind(this)
            }];
        this.oComViewerSvc = pComViewerSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oWpSocketSvc = pWpSocketSvc;
        this.oDiagramSvc = pDiagramSvc;
        this.oWpData = (pComponentData['o_data'] as COM_IWORKFLOW_ATT);
    }
    cTransSvc: TranslateService;

    // 워크플로우 리스트 설정.
    public setWorkflowList(p_data: any){
        this.oWorkFlowList = p_data;
        let s_wfNameList:any = [];
        this.oWorkFlowList.forEach(p_workflow => {
            s_wfNameList.push(p_workflow.WF_NM);
        })
        this.oFormData.map(e=>{
                e.fvalue = s_wfNameList;
        });
    }

    public async onChangeWorkflow(pEvent: any) {
        let sSeletecIdx: number = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let s_selectWf = this.oWorkFlowList[sSeletecIdx];
        let s_workflowId = s_selectWf['WF_ID']
        // this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': [], 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
        // this.oComViewerSvc.onInitData();
        // console.log("this.oSelectData : ", this.oSelectData);

        let s_workflowInfo:any = await this.oComViewerSvc.getInputWorkflowInfo({workflowId : s_workflowId});
        console.log("s_workflowInfo : ", s_workflowInfo);
        let s_sortInfo:any = [];
        for(var i in s_workflowInfo) {
            s_sortInfo.push(JSON.parse(s_workflowInfo[i]['WF_DATA']))
        }
        this.oWpData['workflowId'] = s_workflowId;
        this.oWpData['filepath'] = s_selectWf['WF_PATH'];
        let s_schema = []
        let s_data:any = {}
        for(var j in s_sortInfo) {
            console.log("s_sortInfo[j] : ", s_sortInfo[j]);
            let s_action = s_sortInfo[j]['wp-data']['o_action'];
            let s_type = s_sortInfo[j]['type']
            let data = {}
            let s_temp = {
                "metadata": {},
                "name": s_action,
                "nullable": true,
                "type": s_type
            }
            s_data[s_action] = 'a'
            s_schema.push(s_temp)
        };
        let s_datalist = [JSON.stringify(s_data)]
        console.log("s_schema : ", s_schema);
        this.oSelectData = {
            "schema": s_schema,
            "data": s_datalist
        }
        this.oComViewerSvc.onInitData();
        this.oComViewerSvc.selectData(this.oSelectData);
        this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': this.oSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
        // this.oComViewerSvc.selectData({});
        // let sParam = {
        //     action: "input",
        //     method: "I-WORKFLOW",
        //     groupId: 'Temp',
        //     jobId: '0',
        //     location: 'workflow',
        //     data: {
        //         workflow: this.oWorkFlowList[sSeletecIdx]
        //     }
        // };
        // this.chkSocketConnection();
        // this.oComViewerSvc.showProgress(true);
        // // 1. 워크플로우로 생성된 데이터의 스키마 정보 조회
        // this.oComViewerSvc.getDataSchema(sParam).subscribe((response: any) => {
        //     console.log('============');
        //     this.oSelectData = JSON.parse(response);
        //     if (this.oSelectData.hasOwnProperty('responsecode')) {
        //         if (this.oSelectData['responsecode'] == 200) {
        //             this.oSelectData['name'] = this.oWorkFlowList[sSeletecIdx].filename;
        //             // 2. 데이터 조회를 해야 다음 연결 컴포넌트에서 컬럼 정보 확인할 수 있음.
        //             // 조회 완료 후 기존 연결의 속성창 초기화
        //             this.oComViewerSvc.onInitData();
        //             this.oComViewerSvc.selectData(this.oSelectData);
        //             this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': this.oSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
        //         }
        //         else {
        //             this.oComViewerSvc.showMsg(this.oSelectData['exception'], false);
        //         }
        //         this.oComViewerSvc.showProgress(false);
        //     }
        // }, (error: any) => {
        //     this.oComViewerSvc.showProgress(false);
        //     this.oComViewerSvc.showMsg(error['message'], false);
        // });
        // console.log(pEvent);
    }

    public getItemIndexByElem(pElem: any) {
        // pElem : pEvent.event.currentTarget
        return Array.from(pElem.parentNode.children).indexOf(pElem);
    }
    public getFormData() {
        return this.oFormData;
    }
    chkSocketConnection() {
        if (!this.oWpSocketSvc.oSocketStatus) {
            console.log("Socket Reconnected");
            this.oWpSocketSvc.onConnection();
        }
    }

    public setSchema(pSchema: WpComData) {
        // this.oWpData.schema = pSchema;
        let sTmpSchema = [];
        // let sFormTypeList = this.oFormData[0].fvalue.filter((sForm: any) => sForm.name === 'type')[0].fvalue;
        // for (let sCom of  this.oWpData.schema.schema) {
        //     sTmpSchema.push(sCom.name);
        //     if (!sFormTypeList.includes(sCom.type)) {
        //         sFormTypeList.push(sCom.type)
        //     }
        // }
        // this.oComViewerSvc.selectData(pSchema);
    }
}
