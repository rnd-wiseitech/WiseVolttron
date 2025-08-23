import { Component, OnInit} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { DataSetHistorySerivce } from './dataset-history.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'dm-history',
  templateUrl: './dataset-history.component.html',
  styleUrls: ['./dataset-history.component.css']
})
export class DataSetHistoryComponent implements OnInit {
  oGridData:any;
  oGridCol:any;
  oGridheader = {filterCol:this.seachColNm};
  oDisplayedColumnNms: string[] = [
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid1"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid6"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid2"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid4"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid3"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid5"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid7"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid8")
  ];
  oDisplayedColumns: string[] = [ 'WF_NM','TBL_CAPTION', 'STATUS', 'WF_USER_NAME', 'WF_REG_DT', 'COM_TYPE', 'DS_VIEW_USER_NAME','DS_VIEW_REG_DT'];
  oComptNm = 'dm-history';
  oAddCnnctFormData:any[];
  oConnectionList:any = [];
  oSelectedDsId:any;

  constructor(public cDialog: MatDialog,
    public cMetaSvc:WpMetaService,
    private cDSHistorySvc:DataSetHistorySerivce,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService) { }

  ngOnInit(): void {
    this.getHistoryList('');
  }
  seachColNm(p:any){
    this.getHistoryList(p);
  }
  getHistoryList(pColNm:any){
    this.cDSHistorySvc.searchColmn(pColNm).subscribe(pData => {
      let sColInfo = [];
      
      if(pData.length != 0){
        for(let sIdx in pData){
          this.oConnectionList.push(pData[sIdx].WF_NM);
          if(pData[sIdx].STATUS == 10){
            pData[sIdx].STATUS = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid9")
          }
          else if (pData[sIdx].STATUS == 40){
            pData[sIdx].STATUS = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid10")
          }
          else if (pData[sIdx].STATUS == 99){
            pData[sIdx].STATUS = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET_HISTORY.GRID.grid11")
          }
        }
        for(let sCol of Object.keys(pData[0])){
          let sIndex = this.oDisplayedColumns.findIndex( pVal => pVal === sCol );
          if(sIndex == -1){
            sColInfo.push({
              'NAME':sCol,
              'VISIBLE':false,
              'VNAME':sCol,
              'TYPE':'string'
            });
          }else{
            sColInfo.push({
              'NAME':sCol,
              'VISIBLE':true,
              'VNAME':this.oDisplayedColumnNms[sIndex],
              'TYPE':'string'
            });
          }
        }
        sColInfo.push({
          'NAME':'FUNCTION',
          'VISIBLE':true,
          'VNAME':'',
          'VALUE':['trash','modify'],
          'TYPE':'string'
        });
        this.oGridCol = sColInfo;
        this.oGridData = pData;
      }
    });
  }
  onGridCallback(pEv:any){
    if(pEv.eventNm == 'trash')
      this.delConnection(pEv.element);
    else if(pEv.eventNm == 'modify')
      this.editConnection(pEv.element);
    else if(pEv.eventNm == 'headBtnEvt')
      this.addConnection();
  }
  editConnection(pEv:any){

  }

  addConnection(){
  }
  // 기본적으로 db form을 사용하고 pType이 있을 경우 그에 맞는 form으로 reset
  resetFormData() {
  }
  delConnection(pEl:any){
  }
  // ftp, sftp 는 db, db이름 미사용
  onConnTypeChanged(pValue: string, pCompInstance: any, pEv: any) {
  }
}
