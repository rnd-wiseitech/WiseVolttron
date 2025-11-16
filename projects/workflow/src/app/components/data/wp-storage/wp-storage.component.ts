import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { MatDialog } from '@angular/material/dialog';
import { WpStorageData } from 'projects/wp-server/util/component/data/wp-storage'; 
import { COM_STORAGE_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { TranslateService } from '@ngx-translate/core';
// export interface WkHdfsData extends WkCommonData {
//     [index: string]: any
//     filename: string;
//     filepath: string;
// }
export class WpStorageComponent implements IWpProperties {
    hide = false;
    public oFormData:WpPropertiesWrap [];
    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    oDiagramPreviewSvc: WpDiagramPreviewService;
    oWpData: COM_STORAGE_ATT;
    oDialog: MatDialog;

    o_dsStorage: any;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pComponentData: WpStorageData,
        pDiagramPreviewSvc: WpDiagramPreviewService,
        pDiaglog: MatDialog,
        p_dsStorage: any,
    ) {
        this.oComViewerSvc = pComViewerSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oWpData = (pComponentData['o_data'] as COM_STORAGE_ATT);
        this.oDialog = pDiaglog;
        this.oFormData = [{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info1"),
            name: 'filepath',
            value:'',
            type: 'button',
            fvalue:'',
            visible:true,
            edit:true,
            callbak: this.onBtnClick.bind(this)
        },
        {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info2"),
            name: 'filename',
            value: [],
            type: 'list',
            fvalue: [],
            visible: false,
            edit: false,
            callbak: null
        },
        ];
        if (this.oWpData.filepath !== '') {
            this.setFormVisible('filename', true);
        }

        this.o_dsStorage = p_dsStorage[0]
    }
    setFormVisible(pFormName: string, pVisible: boolean) {
        this.oFormData.forEach((sForm: WpPropertiesWrap) => {
            if (sForm.name == pFormName) {
                sForm.visible = pVisible;
                sForm.fvalue = [this.oWpData.filename]
            }
        })
    }
    onBtnClick(pEvent: any) {
        // LOCAL-HDFS 하드코딩
        console.log("this.o_dsStorage : ", this.o_dsStorage);
        const dialogRef = this.oDialog.open(DmHdfsPopUpComponent, {data:this.o_dsStorage['DS_ID']});
        dialogRef.beforeClosed().subscribe(pRes => {
            if (pRes) {
                if (pRes.result) {
                    let sResult = pRes.data;
                    this.oWpData.filepath = sResult.path;
                    this.oWpData.DEFAULT_PATH = this.o_dsStorage.DEFAULT_PATH;
                    this.oWpData.filename = sResult.name;
                    this.oWpData.usetable_info = {usetable: "", schema: []};
                    this.setFormVisible('filename', true);
                }
            }
        }, pErr => {
            this.oWpData.filepath = '';
            this.oWpData.filename = '';
            this.setFormVisible('filename', false);
        });
        dialogRef.afterClosed().subscribe((pRes) => {
            if (pRes) {
                if (pRes.result && pRes.data.path) { 
                    this.setSelectData();
                }
            }
        })
    }
    private setSelectData() {
        let sParam = {
            action:'input',
            method: 'I-STORAGE',
            groupId: 'Temp',
            jobId: '0',
            location: 'workflow',
            data: {
                DEFAULT_PATH: this.oWpData.DEFAULT_PATH,
                filepath: this.oWpData.filepath,
                filename: this.oWpData.filename,
            }
        };
        this.oComViewerSvc.showProgress(true);
        this.oComViewerSvc.getDataSchema(sParam).subscribe((response: any) => {
            console.log('============');
            let sSelectData = JSON.parse(response);
            this.oSelectData['name'] = this.oWpData.filename;
            if (sSelectData.hasOwnProperty('responsecode')) {
                if (sSelectData['responsecode'] == 200) {
                    this.oComViewerSvc.onInitData();
                    this.oComViewerSvc.selectData(sSelectData);
                    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
                }
                else {
                    this.oComViewerSvc.showProgress(false);
                    this.oWpData.filepath = '';
                    this.oWpData.filename = '';
                    this.setFormVisible('filename', false);
                    this.oComViewerSvc.showMsg(sSelectData['exception'], false);
                }
                this.oComViewerSvc.showProgress(false);
            }
        }, (error) => {
            this.oWpData.filepath = '';
            this.oWpData.filename = '';
            this.setFormVisible('filename', false);
            this.oComViewerSvc.showMsg(error['message'], false);
            this.oComViewerSvc.showProgress(false);
        })
    }
    public getFormData() {    
        return this.oFormData;
    }

    setComViewId(pId: string) {
        // (usetable_info) usetable:groupid_jobid, schema:컬럼정보
        if(this.oWpData.usetable_info != undefined) {
            if (this.oWpData.usetable_info.usetable !== pId) {
                this.oWpData.usetable_info.usetable = pId;
            }
        } else {
            this.oWpData.usetable_info = { usetable: '', schema: [] };
            this.oWpData.usetable_info.usetable = pId;
        }
        
    }
}
