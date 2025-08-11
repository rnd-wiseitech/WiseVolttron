import { Injectable,Output,EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { IWkDataset } from './wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';

@Injectable({providedIn: 'root'})
export class WorkflowAppService {
    @Output() changProgressMsgEmit: EventEmitter<any> = new EventEmitter();
    
    oWpDataSet: IWkDataset = {
        WorkFlowId:'',
        Datas :{},
        CurrentDataId:'' 
    };
    
    constructor(
        public cDialog: MatDialog,
    ) { }

    setProgressMsg(pMsg:any){
        this.changProgressMsgEmit.emit(pMsg);
    }
    getWpData(){
        return this.oWpDataSet;
    }
    getComData(pId: string) {
        return this.oWpDataSet.Datas[pId];
    }
    setCurrentDataId(pDataId:string){
        this.oWpDataSet.CurrentDataId = pDataId;
    }
    getWkId(){
        return this.oWpDataSet.WorkFlowId;
    }
    setWkId(pId:string){
        this.oWpDataSet.WorkFlowId = pId;
    }
    setWpData(pData: WpComData) {
        this.oWpDataSet.Datas[pData.id] = pData;                      
    }
    initWpData(){
        this.oWpDataSet.Datas = {}
    }
    initWpSchema(pId: string) {
        if (this.oWpDataSet.Datas[pId]) {
            this.oWpDataSet.Datas[pId].data = [];
            this.oWpDataSet.Datas[pId].schema = [];
        }
    }
    showMsg(pMsg:string, pFlag:boolean){
        const dialogRef = this.cDialog.open(WpPopupComponent, {
            data : {
                'title':'Message',
                'flag':pFlag,
                'message':pMsg,
                'colWidthOption':'tight'
            }
        });
    }
}