import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { IWpProperties, WpPropertiesWrap, WpToggleEvent } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { WpComponentViewerService } from "../../wp-component-viewer.service";
import { COM_DATASOURCE_ATT } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpDataSourceData } from "projects/wp-server/util/component/data/wp-datasource";
import { TranslateService } from "@ngx-translate/core";

// export interface WkDataSourceData extends WkCommonData {
//     [index: string]: any;
//     filename: string;
//     filetype: string;
//     fileseq: string;
//     viewid: number;
//     viewidx: number;
//     dataOption: string;
//     userno: number;
// }
export class WpDataSourceComponent implements IWpProperties {
    hide = false;
    public oFormData:WpPropertiesWrap [];

    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    public oDiagramPreviewSvc:WpDiagramPreviewService;
    oWpData: COM_DATASOURCE_ATT;
    oWpSocketSvc:WpSocket;
    oFileList: any[];
    oSharedFileList : any[];
    cTransSvc: TranslateService
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pComponentData:WpDataSourceData,
        pDiagramPreviewSvc:WpDiagramPreviewService,
        pWpSocketSvc:WpSocket
        ) { 
        this.cTransSvc = pTransSvc;
        this.oFormData = [
            {
                // #37 공유 데이터 선택 추가
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info7"),
                name:'dataOpt',
                value:'',
                type:'button_toggle',
                fvalue:[pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9"), pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")],
                visible:true,
                edit:true,
                callbak:this.onChangedataOpt.bind(this)
            },
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info8"),
                name:'originalname',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onFilenameChange.bind(this)
            }];
        this.oComViewerSvc = pComViewerSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oWpSocketSvc = pWpSocketSvc;
        this.oWpData = (pComponentData['o_data'] as COM_DATASOURCE_ATT);
        this.oFileList = [];
        this.oSharedFileList = [];
        // default option : 내 데이터셋
        if (this.oWpData.dataOpt == ''){
            this.oWpData.dataOpt = pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9");
        }
    }
    // # DI 오류수정
    chkSocketConnection(){
        if (!this.oWpSocketSvc.oSocketStatus) {
            console.log("Socket Reconnected");
            this.oWpSocketSvc.onConnection();
        }
    }
    public onFilenameChange(pEvent:any){
        // #95. 파일 형식 추가.
        // json형식으로 filename과 filetype이 들어가있기 때문에 여기서 구분함.
        // selectbox에서 선택한 matOptionIdx 기준으로 filename과 filetype 구분
        let sSeletecIdx:number = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        // #37 공유 데이터 선택 추가
        let sFileList:any;
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")){
            sFileList = this.oFileList;
        }
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")){
            sFileList = this.oSharedFileList;
        }

        let sParam = {
            action: "input",
            method: "I-DATASOURCE",
            groupId: 'Temp',
            jobId: '0',
            location: 'workflow',
            data: {
                // load: 'hdfs',
                filename: sFileList[sSeletecIdx]['viewid'],
                filetype: sFileList[sSeletecIdx]['filetype'],
                fileseq: ',',
                dataUserno: sFileList[sSeletecIdx]['userno']
            }
        };
        // socket 연결이 끊어져있는 경우 다시 연결 후 실행해야 결과 제대로 표시 됨.
        this.chkSocketConnection();
        this.oComViewerSvc.showProgress(true);
        this.oComViewerSvc.getDataSchema(sParam).subscribe((response:any) => {
            console.log('============');
            this.oSelectData = JSON.parse(response); 
            if (this.oSelectData.hasOwnProperty('responsecode')){
                if (this.oSelectData['responsecode'] == 200){
                    this.oSelectData['name'] = sFileList[sSeletecIdx].filename;
                    this.oWpData['originalname'] = sFileList[sSeletecIdx].filename;
                    this.oWpData['filename'] = sFileList[sSeletecIdx].viewid;
                    this.oWpData['filetype'] = sParam.data.filetype;
                    this.oWpData['dataUserno'] = sFileList[sSeletecIdx].userno;
                    // #65 입력 데이터 변경시 기존 연결의 속성창 초기화
                    this.oComViewerSvc.onInitData();
                    this.oComViewerSvc.selectData(this.oSelectData);
                    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': this.oSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
                }
                else {
                    this.oComViewerSvc.showMsg(this.oSelectData['exception'], false);
                }
                this.oComViewerSvc.showProgress(false);
            }
        }, (error:any) => {
            this.oComViewerSvc.showProgress(false);
            this.oComViewerSvc.showMsg(error['message'], false);
        });
        console.log(pEvent);
    }
    // #37 공유 데이터 선택 추가
    public onChangedataOpt(pEvent: WpToggleEvent) {
        this.oWpData[pEvent.name] = pEvent.value;
        this.setFileNmList(pEvent.value);
        this.oWpData['originalname'] = undefined;
        this.oWpData['filename'] = undefined;
    }
    public getFormData(){
        return this.oFormData;
    }
    public setFileNm(pFileList:any, pSharedFileList:any){
        // 모든 데이터셋에서 공유 데이터셋은 빼고 진행
        let sMyFileList:any = pFileList.filter((pDataSet:any) => {
            return !pSharedFileList.some((pSharedDataSet:any) => pSharedDataSet.userno === pDataSet.userno)
        });
        this.oFileList = sMyFileList;
        this.oSharedFileList = pSharedFileList;
        this.setFileNmList(this.oWpData.dataOpt);
    }
    public setFileNmList(pdataOpt: any) {
        let sFileList = [];
        if (pdataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")){
            sFileList = this.oFileList;
        }
        if (pdataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")){
            sFileList = this.oSharedFileList;
        }
        let sFileNmList:any = [];
        sFileList.forEach(pFileInfo => {
            sFileNmList.push(pFileInfo.filename);
        })
        this.oFormData.map(e=>{
            if(e.vname == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info8"))
                e.fvalue = sFileNmList;
        });
    }
    public getSelectData(){
        return this.oSelectData;
    }
    public getItemIndexByElem(pElem:any){
        // pElem : pEvent.event.currentTarget
        return Array.from(pElem.parentNode.children).indexOf(pElem);
    }
}
