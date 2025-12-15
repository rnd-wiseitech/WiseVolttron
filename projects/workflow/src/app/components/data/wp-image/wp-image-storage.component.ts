import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { MatDialog } from '@angular/material/dialog';
import { DmImagePopUpComponent } from 'projects/data-manager/src/app/dataset/image-popup/image-popup.component';
import { WpStorageData } from 'projects/wp-server/util/component/data/wp-storage'; 
import { COM_IMAGE_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { TranslateService } from '@ngx-translate/core';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { DS_MSTR_ATT } from 'projects/wp-server/metadb/model/DS_MSTR';

export class WpImageStorageComponent implements IWpProperties {
    hide = false;
    public oFormData:WpPropertiesWrap [];
    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    oDiagramPreviewSvc: WpDiagramPreviewService;
    oWpData: COM_IMAGE_ATT;
    oDialog: MatDialog;
    oReturnData : any;
    o_dsStorage: DS_MSTR_ATT;
    oWpDiagramSvc: WpDiagramService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pComponentData: WpStorageData,
        pDiagramPreviewSvc: WpDiagramPreviewService,
        pDiaglog: MatDialog,
        p_dsStorage: DS_MSTR_ATT[],
        pWpDiagramSvc: WpDiagramService
    ) {
        this.oComViewerSvc = pComViewerSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oWpData = (pComponentData['o_data'] as COM_IMAGE_ATT);
        this.oDialog = pDiaglog;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oFormData = [{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info115"),
            name: 'filepath',
            value:'',
            type: 'button',
            fvalue:'',
            visible:true,
            edit:true,
            callbak: this.onBtnClick.bind(this)
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info116"),
            name: 'filelist',
            value: '',
            type: 'list',
            fvalue: this.oWpData.filelist? this.oWpData.filelist:[],
            visible: this.oWpData.filelist? true:  false,
            edit: false,
            callbak: null
            },
        ];
        
        this.o_dsStorage = p_dsStorage[0]
    }


    onBtnClick(pEvent: any) {
        const dialogRef = this.oDialog.open(DmImagePopUpComponent, {data:this.o_dsStorage['DS_ID']});
        dialogRef.beforeClosed().subscribe(pRes => {
            if (pRes) {
                console.log("pRes : ", pRes);
                if (pRes.result) {
                    let sSelectFileList = pRes.data.map((sFile:any) => sFile.name);
                    let sSelectFilePath = pRes.data.map((sFile:any) => sFile.path);
                    let sPath = pRes.path;
                    if (sPath == ''){
                        sPath = '/';
                    }
                    // this.oWpData.usetable_info = {usetable: "", schema: []};
                    this.oWpData.filepath = sSelectFilePath;
                    this.oWpData.comId = this.oComViewerSvc.getComId();
                    this.oWpData.filename = sSelectFileList;
                    this.setSelectData();
                }
            }
        }, pErr => {
            this.oWpData.filepath = '';
            this.oWpData.filename = [];
        });
        dialogRef.afterClosed().subscribe((pRes) => {
            if (pRes) {
                if (pRes.result && pRes.data.path) { 
                    // this.setSelectData();
                }
            }
        })
    }
    private setSelectData() {
        let s_jobId = this.oWpDiagramSvc.getNodesById(this.oWpData.comId);
        let sParam = {
            action:'input',
            method: 'I-IMAGE-STORAGE',
            groupId: 'Temp',
            jobId: s_jobId.jobId,
            location: 'workflow',
            data: {
                DEFAULT_PATH: this.oWpData.DEFAULT_PATH,
                filepath: this.oWpData.filepath,
                filename: this.oWpData.filename,
                comId: this.oWpData.comId,
            }
        };
        // console.log("sParam : ", sParam);
        this.oComViewerSvc.showProgress(true);
        this.oComViewerSvc.getDataSchema(sParam).subscribe((response: any) => {
            let sSelectData = JSON.parse(response);
            this.oSelectData['name'] = this.oWpData.filename;
            if (sSelectData.hasOwnProperty('responsecode')) {
                if (sSelectData['responsecode'] == 200) {
                    this.oComViewerSvc.onInitData();
                    this.oComViewerSvc.selectData(sSelectData);
                    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
                    if(sSelectData.data.length > 0) {
                        this.oWpData.count = sSelectData.count
                        this.oWpData.filelist = sSelectData.data.map((item:any) => JSON.parse(item).filename);
                        console.log("sSelectData.viewname : ", sSelectData.viewname);
                        this.oWpData.usetable = sSelectData.viewname;
                        this.setFileName('filelist', this.oWpData.filelist);
                    }
                }
                else {
                    this.oComViewerSvc.showProgress(false);
                    this.oWpData.filepath = '';
                    this.oWpData.filename = [];
                    this.oComViewerSvc.showMsg(sSelectData['exception'], false);
                }
                this.oComViewerSvc.showProgress(false);
            }
        }, (error:any) => {
            this.oWpData.filepath = '';
            this.oWpData.filename = [];
            this.oComViewerSvc.showMsg(error['message'], false);
            this.oComViewerSvc.showProgress(false);
        })
    }
    public getFormData() {    
        return this.oFormData;
    }

    setComViewId(pId: string) {
        if(this.oWpData.usetable_info != undefined) {
            if (this.oWpData.usetable_info.usetable !== pId) {
                this.oWpData.usetable_info.usetable = pId;
            }
        } else {
            this.oWpData.usetable_info = { usetable: '', schema: [] };
            this.oWpData.usetable_info.usetable = pId;
        }
        
    }
    setFileName(pFormName: 'filelist', pValue: any) {
        let sClearFormList = ['filename', 'filelist'];
        sClearFormList.splice(sClearFormList.indexOf(pFormName), 1);

        this.oFormData.forEach((sForm: WpPropertiesWrap) => {
        if (sForm.name === pFormName) {
            sForm.visible = true;
            if (pFormName === 'filelist') {
                sForm.fvalue = pValue;
                this.oWpData.filelist = pValue;

            } else {
                sForm.value = pValue;
            }
        }
        })
    }
}
