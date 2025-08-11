import { WpComponent } from "../../wp-component";
import { WpComponentViewerService } from "../../wp-component-viewer.service";
import { WpStreamingService } from "./wp-streaming.service";
import { WpPropertiesWrap } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpComponentService } from "../../wp-component.service";
import { MatDialog } from "@angular/material/dialog";
import { WpPopupComponent } from "projects/wp-lib/src/lib/wp-popup/wp-popup.component";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { COM_STREAMING_ATT } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpStreamingData } from "projects/wp-server/util/component/data/wp-streaming";
import { MainAppService } from "projects/main/src/app/app.service";
import { TranslateService } from "@ngx-translate/core";
// export interface WkStreamingData extends WkCommonData {
//     [index: string]: any
//     filename: string
// }
// #119 스트리밍 컴포넌트 추가
export class WpStreamingComponent extends WpComponent {
    hide = false;
    oWpData: COM_STREAMING_ATT; //type override
    public oFormData:WpPropertiesWrap [];
    public oSelectData:any = {};
    public oComViewerSvc:WpComponentViewerService;
    public oWpStreamingSvc:WpStreamingService;
    public oComSvc:WpComponentService;
    public oDialog:MatDialog;
    private oMainAppSvc: MainAppService;
    public oDiagramPreviewSvc:WpDiagramPreviewService;
    oColumnInfo: any;
    cTransSvc: TranslateService;
    public oKafkaFormArray:any;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pWpData: WpStreamingData,
        pWpStreamingSvc:WpStreamingService,
        pComSvc:WpComponentService,
        pDiagramPreviewSvc:WpDiagramPreviewService,
        pDiaglog:MatDialog,
        pMainAppSvc: MainAppService,
    ) { 
        super(pComViewerSvc, pWpData);
        this.cTransSvc = pTransSvc;
        this.oFormData = [
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info11"),
                name:'filename',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onColChange.bind(this)
            }
        ];
        this.oKafkaFormArray = [
            [{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup2"),
                name:'type',
                value: ['mysql', 'mssql', 'postgresql'],
                type:'select',
                fvalue: ['mysql', 'mssql', 'postgresql'],
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup3"),
                name:'database',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup4"),
                name:'ip',
                value:'',
                type:'text',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup5"),
                name:'port',
                value:'',
                type:'text',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup6"),
                name:'username',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup7"),
                name:'password',
                value:'',
                type:'password',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:null
            },{
                vname:'Owner',
                name:'owner',
                value:'',
                type:'text',
                fvalue:'',
                visible:false,
                edit:true,
                callbak:null
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button4"),
                name:'dbConnect',
                value:'',
                type:'button',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:{name:'onDbConnect'}
            }],
            [{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup3"),
                name:'connection_name',
                value:[],
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:{name:'getTableNameList'}
            },{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info5"),
                name:'table_name',
                value:[],
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:{name:'onValueReset'}
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup9"),
                name:'mode',
                value:'',
                type:'select',
                fvalue:['incrementing','timestamp'],
                visible:true,
                edit:true,
                callbak:{name:'getColumnInfo'}
            },{
                vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup10"),
                name:'target_column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:null
            }]
        ];
        this.oComViewerSvc = pComViewerSvc;
        this.oWpStreamingSvc = pWpStreamingSvc;
        this.oComSvc = pComSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oDialog = pDiaglog;
        this.oMainAppSvc = pMainAppSvc;
        this.oComViewerSvc.showProgress(true);
        this.setFileNameList();
    }
    setFileNameList() {
        this.oWpStreamingSvc.getTopicList().toPromise().then(sTopicList=>{
            this.oFormData[0].fvalue = sTopicList;
            // this.oWpData.filename = '';
            this.oComViewerSvc.showProgress(false);
        }).catch(err =>{
            console.log(err);
            this.oComViewerSvc.showProgress(false);
        });
    }
    onColChange(pEvent:any){
        this.oComViewerSvc.showProgress(true);
        this.oWpStreamingSvc.getTopicSchema({filename:this.oWpData.filename}).toPromise().then(sResult=>{
            try {
                let sTopicData = JSON.parse(sResult);
                // 선택된 topic 데이터 oSelectData에 할당
                this.oSelectData['name'] = this.oWpData.filename;
                this.oSelectData['data'] = sTopicData['data'];
                this.oSelectData['schema'] = sTopicData['schema'];
                // AppSvc의 oWpDataSet의 Data에 할당
                this.oComViewerSvc.selectData(this.oSelectData);
            } catch (error) {
                this.oComViewerSvc.showMsg('다른 토픽을 선택해주세요', false);
            } finally {
                this.oComViewerSvc.showDiagramPreview(this.oComId, true);
                this.oComViewerSvc.showProgress(false);
            }
        })
    }
    // 카프카 커넥터 생성 팝업
    onKafkaConnectPopup(pEvent:any){
        const dialogRef = this.oDialog.open(WpPopupComponent, {
            data: {
                'title': this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button3")
                ,
                'flag': true,
                'service': this.oMainAppSvc,
                'formdataArray': this.oKafkaFormArray,
                'btnText':this.cTransSvc.instant("WPP_COMMON.BUTTON.button1"),
                'type': 'kafkaConnect',
                'hideLabelArray':['dbConnect']
            }
        });
        const dialogSubmitSubscription = dialogRef.componentInstance.selectionChanged
            .subscribe(pRes => {
                if (pRes.eventNm == "onDbConnect"){
                    this.onDbConnect(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
                } else if (pRes.eventNm == "getTableNameList"){
                    this.getTableNameList(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
                } else if (pRes.eventNm == "getColumnInfo"){
                    this.getColumnInfo(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
                } else if (pRes.eventNm == "onValueReset") {
                    this.onValueReset(dialogRef.componentInstance);
                }
        });
        dialogRef.afterClosed().subscribe(result => {
            dialogSubmitSubscription.unsubscribe();
            if (result && result.data) {
                this.oWpStreamingSvc.createKafkaConnector(result.data).toPromise().then(pResult => {
                    console.log("connect info");
                    this.setFileNameList();
                    this.oDiagramPreviewSvc.initDiagramPreview('all');
                    if (result){
                        this.oComViewerSvc.showMsg(`${pResult.connector_name} 생성 완료`, false);
                        this.setFileNameList();
                    }
                }).catch(e => {
                    console.log("onKafkaConnect ERROR");
                    this.oComViewerSvc.showMsg(e.message, false);
                })
            }
        });
    }
    onDbConnect(pData: any, pFormControl: any) {
        let sFormControl = pFormControl;
        let sConnectData:any = {
            ip: pData['ip'],
            port: pData['port'],
            type: pData['type'],
            database: pData['database'],
            username: pData['username'],
            password: pData['password']
        };
        for (const sKey of Object.keys(sConnectData)) {
            if (!sConnectData[sKey] || sConnectData[sKey] == ""){
                this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup11"), false);
                this.clearFormValue('connection_name', sFormControl);
                return;
            }
        }
        this.oWpStreamingSvc.getDbList(sConnectData).then((sTbList: any) => {
            this.setFormValue('connection_name', sTbList, sFormControl);
            this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup8"), false);
        }).catch(err => {
            console.log(err);
            this.clearFormValue('connection_name', sFormControl);
            this.oComViewerSvc.showMsg(err.message, false);
        });
        return;
    }
    getTableNameList(pData: any, pFormControl: any) {
        let sFormControl = pFormControl;
        let sConnectData:any  = {
            ip: pData['ip'],
            port: pData['port'],
            type: pData['type'],
            database: pData['database'],
            username: pData['username'],
            password: pData['password'],
            owner: pData['owner'],
            connection_name : pData['connection_name']
        };
        for (const sKey of Object.keys(sConnectData)) {
            if (!sConnectData[sKey] || sConnectData[sKey] == ""){
                if(sKey=='owner' && sConnectData['type']!='oracle'){
                    continue;
                }
                this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup11"), false);
                this.clearFormValue('table_name', sFormControl);
                this.clearFormValue('mode', sFormControl)
                return;
            }
        }
        this.oWpStreamingSvc.getTbList(sConnectData).then((sTbList:any) => {
            if(sTbList.length==0){
                this.oComViewerSvc.showMsg("해당 DB에 테이블이 없습니다.", false);                
            }else{
                this.setFormValue('table_name', sTbList, sFormControl);
                this.setFormValue('mode', ['incrementing', 'timestamp'], sFormControl)
            }
        }).catch(err => {
            this.clearFormValue('table_name', sFormControl);
            this.clearFormValue('mode', sFormControl);
            this.oComViewerSvc.showMsg(err.message, false);
        });
    }
    getColumnInfo(pData: any, pFormControl: any) {
        let sFormControl = pFormControl;
        let sMode:string = sFormControl['mode'].value;
        let sConnectData:any = {
            ip: sFormControl['ip'].value,
            port: sFormControl['port'].value,
            type: sFormControl['type'].value,
            database: pData['database'],
            username: sFormControl['username'].value,
            password: sFormControl['password'].value,
            owner: pData['owner'],
            connection_name : sFormControl['connection_name'].value,
            table_name : sFormControl['table_name'].value
        };
        for (const sKey of Object.keys(sConnectData)) {
            if (!sConnectData[sKey] || sConnectData[sKey] == ""){
                if(sKey=='owner' && sConnectData['type']!='oracle'){
                    continue;
                }
                this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup11"), false);
                this.clearFormValue('table_name', sFormControl);
                return;
            }
        }
        this.oWpStreamingSvc.getColInfo(sConnectData).then(sColInfo => {
            this.oColumnInfo = sColInfo;
            let sColList:any = [];
            let sNumTypeList = ['decimal','bigint', 'smallint', 'int', 'double', 'float', 'number', 'integer'];
            let sDateTypeList = ['timestamp', 'datetime', 'time', 'datetime2', 'smalldatetime', 'date'];
            this.oColumnInfo.forEach((sColInfo:any) => {
                // NULL 비허용 && 숫자형 컬럼 incrementing 모드
                if (sMode === 'incrementing') {
                    // if (sColInfo.IS_NULLABLE == 'NO' && (['bigint', 'smallint', 'int', 'double', 'float'].includes(sColInfo.DATA_TYPE) || sColInfo.DATA_TYPE.includes('decimal')))                    
                    if (sColInfo.IS_NULLABLE == 'NO' && sNumTypeList.some(sItem => sColInfo.DATA_TYPE.toLowerCase().includes(sItem)))
                        sColList.push(sColInfo.COLUMN_NAME);
                // NULL 비허용 && 시계열 컬럼 timestamp 모드
                } else if (sMode === 'timestamp') {
                    // if (sColInfo.IS_NULLABLE == 'NO' && (['timestamp', 'datetime', 'time', 'datetime2', 'smalldatetime'].includes(sColInfo.DATA_TYPE)))
                    if (sColInfo.IS_NULLABLE == 'NO' && sDateTypeList.some(sItem => sColInfo.DATA_TYPE.toLowerCase().includes(sItem)))
                        sColList.push(sColInfo.COLUMN_NAME);
                }
            })
            if (sColList.length == 0){
                pFormControl.target_column.patchValue('');
                if (sMode === 'incrementing') {
                    this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup12"), false)
                } else if (sMode === 'timestamp') {
                    this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup16"), false)
                }
            }
            else {
                this.setFormValue('target_column', sColList, sFormControl);
            }
        }).catch(err => {
          this.oComViewerSvc.showMsg(err.message, false);
        })
    }
    setFormValue(pFormName: string, pList: any, pFormControl: any) {
        let sFormControl = pFormControl;
        if (pFormName === 'connection_name') {
            sFormControl['dbConnect'].setValue(true);
        }
        this.oKafkaFormArray[1].forEach((sForm:WpPropertiesWrap) => {
            if (sForm.name == pFormName){
                sForm.edit = true;
                sForm.fvalue = pList;
                sForm.value = pList;
            }
        });
        sFormControl[pFormName].enable()
    }
    clearFormValue(pFormName: string, pFormControl: any) {
        let sFormControl = pFormControl;
        if (pFormName === 'connection_name') {
            sFormControl['dbConnect'].setValue(false);
        }
        this.oKafkaFormArray[1].forEach((sForm:WpPropertiesWrap) => {
            if (sForm.name == pFormName){
                sForm.edit = false;
                sForm.fvalue = [];
                sForm.value = [] as any;
            }
        });
        sFormControl[pFormName].disable();
    }
    onValueReset(pCompInstance: any) {
        let sCompInstance = pCompInstance;
        sCompInstance.patchValue({ 'mode': "" });
        sCompInstance.patchValue({ 'target_column': "" }); 
    }
}