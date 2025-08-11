import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { MatDialog } from '@angular/material/dialog';
import { DmHdfsPopUpComponent } from 'projects/data-manager/src/app/dataset/hdfs-popup/hdfs-popup.component';
import { WpHdfsData } from 'projects/wp-server/util/component/data/wp-hdfs';
import {  COM_HDFS_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { DS_MSTR_ATT } from 'projects/wp-server/metadb/model/DS_MSTR';
// export interface WkHdfsData extends WkCommonData {
//     [index: string]: any
//     filename: string;
//     filepath: string;
// }
export class WpHdfsComponent implements IWpProperties {
    hide = false;
    public oFormData:WpPropertiesWrap [] = [{
        // connection info에서 고르게 함
        vname: 'Connection Name',
        name: 'dsname',
        value: '',
        type: 'select',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onHdfsChanged.bind(this)
      }, {
        vname: 'Select HDFS File',
        name: 'filepath',
        value:'',
        type: 'button',
        fvalue:'',
        visible:true,
        edit:true,
        callbak: this.onBtnClick.bind(this)
    },
    {
        vname: 'Filename',
        name: 'filename',
        value: '',
        type: 'text',
        fvalue: '',
        visible: false,
        edit: false,
        callbak: null
    },
    ];
    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    oDiagramPreviewSvc: WpDiagramPreviewService;
    oWpData: COM_HDFS_ATT;
    oDialog: MatDialog;
    oHdfsInfoList: any = [];
    constructor(pComViewerSvc: WpComponentViewerService,
        pComponentData: WpHdfsData,
        pDiagramPreviewSvc: WpDiagramPreviewService,
        pDiaglog: MatDialog
    ) {
        this.oComViewerSvc = pComViewerSvc;
        this.oDiagramPreviewSvc = pDiagramPreviewSvc;
        this.oWpData = (pComponentData['o_data'] as COM_HDFS_ATT);
        this.oDialog = pDiaglog;
        if (this.oWpData.filepath !== '') {
            this.setFormVisible('filename', true);
        }
    }
    setFormVisible(pFormName: string, pVisible: boolean) {
        this.oFormData.forEach((sForm: WpPropertiesWrap) => {
            if (sForm.name == pFormName) {
                sForm.visible = pVisible;
            }
        })
    }
    onBtnClick(pEvent: any) {
        const dialogRef = this.oDialog.open(DmHdfsPopUpComponent, {data:this.oWpData.dsId});
        dialogRef.beforeClosed().subscribe(pRes => {
            if (pRes) {
                if (pRes.result) {
                    let sResult = pRes.data;
                    console.log(sResult);
                    this.oWpData.filepath = sResult.path;
                    this.oWpData.filename = sResult.name;
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
            method: 'I-HDFS',
            groupId: 'Temp',
            jobId: '0',
            location: 'workflow',
            data: {
                filename: this.oWpData.filename,
                filepath: this.oWpData.filepath,
                host: this.oWpData.host,
                port: this.oWpData.port,
                user: this.oWpData.user,
                password: this.oWpData.password,
                DEFAULT_PATH: this.oWpData.DEFAULT_PATH
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
            this.oComViewerSvc.showProgress(false);
        })
    }
    public getFormData(){    
        return this.oFormData;
    }


    public setHdfsNmList(p_list: DS_MSTR_ATT[]) {
        let sHdfsList: Partial<COM_HDFS_ATT> = [];
        let sHdfsNmList: string[] = [];
        p_list.forEach(p_hdfs => {
            sHdfsNmList.push(p_hdfs.DS_NM);
          sHdfsList.push({
            host: p_hdfs.IP,
            port: p_hdfs.PORT,
            user: p_hdfs.USER_ID,
            password: '',
            type: p_hdfs.TYPE,
            dsId: p_hdfs.DS_ID,
            dsname: p_hdfs.DS_NM,
            DEFAULT_PATH: p_hdfs.DEFAULT_PATH
          });
        })
    
        this.oHdfsInfoList = sHdfsList;
        this.oFormData.map(e => {
          if (e.name == 'dsname')
            e.fvalue = sHdfsNmList;
        });
    }

    public getItemIndexByElem(pElem: any) {
        // pElem : pEvent.event.currentTarget
        return Array.from(pElem.parentNode.children).indexOf(pElem);
    }

    private onHdfsChanged(pEvent: any) {
    let sSelectIdx: number = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
    let sSelectHdfs = this.oHdfsInfoList[sSelectIdx];
    Object.assign(this.oWpData, sSelectHdfs);
    }
}
