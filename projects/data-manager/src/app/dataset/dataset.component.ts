import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MainAppService } from 'projects/main/src/app/app.service';
import { HistoryItem, HistoryService } from 'projects/wp-lib/src/lib/wp-history/wp-history.service';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { DmAppService } from '../app.service';
import { DataSetSerivce } from './dataset.service';
import { DmHdfsPopUpComponent } from './hdfs-popup/hdfs-popup.component';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { FileSystemItem, WP_DATASET_ATT, WP_DATASET_TYPE_ATT, getWpConnectType, getWpConnectInfo } from 'projects/wp-server/wp-type/WP_DATASET_ATT';
import { TranslateService } from '@ngx-translate/core';
import { WpPopUpAuthorityComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-authority.component';
interface formData{
  TBL_TYPE: keyof typeof WP_DATASET_TYPE_ATT
  CONNECTION_TYPE: 'db'|'file'|'folder'
}

@Component({
  selector: 'dm-dataset',
  templateUrl: './dataset.component.html',
  styleUrls: ['./dataset.component.css']
})
export class DataSetComponent implements OnInit {

  oGridData: any;
  oGridCol: any;
  oGridRowEvt = true;
  oGridheader = { btnNm: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.BUTTON.button1"), filterCol: ['DS_VIEW_NM', 'USER_ID'] };
  oComptNm = 'wp-authority'
  // 밑에 oDispalyedColumns 변수랑 순서 맞춰야됨
  oDisplayedColumnNms: string[] = [
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid1"), //권한
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid9"), //저장 방식
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid3"), //데이터명
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid4"), //원본 데이터명
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid10"), //데이터 타입
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid2"), //만든이
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid5"), //만든 날짜
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid6"), //수정 날짜
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid7"), //통계 상태
    // // this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid8"), // 하이브 (제거)
   ];
  // ======== 241028 식약처 설치 시 주석 해제 시작 ========
  // oDisplayedColumns: string[] = ['AUTHORITY', 'USER_ID', 'DS_VIEW_NM', 'TBL_CAPTION', 'REG_DT', 
  //   // 하이브 제거
  //   // 'UPD_DT', 
  //   'DATASTATUS', 'HIVESTATUS'];
  // ======== 241028 식약처 설치 시 주석 해제 끝 ========
  oDisplayedColumns: string[] = ['AUTHORITY', 'TYPE', 'DS_VIEW_NM', 'TBL_CAPTION', 'TBL_TYPE', 'USER_ID', 'REG_DT', 'UPD_DT', 'DATASTATUS', 'HIVESTATUS'];
  oFunctionList: string[] = ['trash', 'download', 'share', 'hiveadd', 'personadd'];
  oHoverEffect = true;
  // 일단 아래 3개 따로 사용은 안함
  // oDsList: [] = [];
  // oSelectedDs: any = {};
  // oTblList: [] = [];
  
  oDataList: any = [];
  oAddDtsetFormData: any[];
  oWpPopData: any = {};
  oSocketSubscribe: Subscription;
  oWpPopupDialogRef: any;
  o_addHiveForm: any[];
  o_hiveTableList: any[];
  o_apiType = 'SPARK';
  o_SelectDefaultVal = {
    value: [''],
    fvalue: ['옵션을 선택해 주세요.']
  }
  oSelectedFile: FileSystemItem;
  // oSelectedDatatype
  o_SelectedFormData: formData={
    TBL_TYPE: null,
    CONNECTION_TYPE: null,
  }

  


  constructor(public cDialog: MatDialog,
    public cMetaSvc: WpMetaService,
    private cDtsetSvc: DataSetSerivce,
    private cMainAppSvc: MainAppService,
    private cHistorySvc: HistoryService,
    private cWpSocket: WpSocket,
    private cDmAppSvc: DmAppService,
    private cWpLibSvc: WpLoadingService,
    private cWpAppConfig: WpAppConfig,
    private cTransSvc: TranslateService
  ) { }

  ngOnDestroy(): void {    
    this.oSocketSubscribe.unsubscribe();
  }
  ngOnInit(): void {
    // COMMON일 경우나 HIVE 사용 안할 때에는 HIVE 관련내용 빼야함.
    this.o_apiType = this.cWpAppConfig.getConfig('API_TYPE');
    let sHiveCheck = this.cWpAppConfig.getUseConfig('HIVE_DB');
    if(this.o_apiType == 'COMMON' || !sHiveCheck) {
      this.oDisplayedColumnNms = this.oDisplayedColumnNms.filter((element) => element !== this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid8"));
      this.oDisplayedColumns = this.oDisplayedColumns.filter((element) => element !== 'HIVESTATUS');
      this.oFunctionList = this.oFunctionList.filter((element) => element !== 'hiveadd');
    }
    
    this.cWpLibSvc.showProgress(true, "wdspin");
    this.getDataSetList();
    this.oSocketSubscribe = this.cWpSocket.statusStati().subscribe((message: any) => {
      this.oGridData.filter((pVal: any) => {
        if (pVal['DS_VIEW_ID'] === message['view_id']) {
          pVal['STATUS_CODE'] = message['code'];
          // pVal['TBL_DESC'] = message['desc'];
          if (message['code'] == 99) {
            pVal['TBL_LOG'] = message['log'];
            pVal['DATASTATUS'] = this.cTransSvc.instant("WPP_COMMON.INFO.info6") ;
          } else if (message['code'] == 40) {
            pVal['VIEW_IDX'] = message['idx'];
            pVal['DATASTATUS'] = this.cTransSvc.instant("WPP_COMMON.INFO.info1") ;
          } else if (message['code'] == 20) {
            pVal['DATASTATUS'] = this.cTransSvc.instant("WPP_COMMON.INFO.info7") ;
          } else if (message['code'] == 10) {
            pVal['DATASTATUS'] = this.cTransSvc.instant("WPP_COMMON.INFO.info5") ;
          }
        }
      });
    })
  }

  resetFormData() {
    // this.oDsList = [];
    // this.oTblList = [];
    // this.oSelectedDs = {};
    this.oSelectedFile = null;    
    this.o_SelectedFormData={
      TBL_TYPE: null,
      CONNECTION_TYPE: null,
    }
    this.oAddDtsetFormData = [{
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup2"),
      name: 'DS_VIEW_NM',
      value: '',
      type: 'text',
      fvalue: this.oDataList,
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup3"),
      name: 'TBL_TYPE',
      // WPLAT-361 3번 수정
      value: ['structure'],
      // value: ['structure', 'image', 'document'],
      type: 'select',
      fvalue: ['structure'],
      // fvalue: ['structure', 'image', 'document'],
      visible: true,
      edit: true,
      callbak: { name: 'datasetTypeSeleted' }
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup4"),
      name: 'CONNECTION_TYPE',
      value: this.o_SelectDefaultVal.value,
      type: 'select',
      fvalue: this.o_SelectDefaultVal.fvalue,
      visible: true,
      edit: true,
      callbak: { name: 'connectTypeSeleted' }
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup5"),
      name: 'CONNECTION',
      value: this.o_SelectDefaultVal.value,
      type: 'select',
      fvalue: this.o_SelectDefaultVal.fvalue,
      visible: true,
      edit: true,
      callbak: { name: 'connectSeleted' }
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup15"),
      name: 'TABLE_INFO',
      value: this.o_SelectDefaultVal.value,
      type: 'select',
      fvalue: this.o_SelectDefaultVal.fvalue,
      visible: false,
      edit: true,
      callbak: { name: 'tableSeleted' }
    }, {
      // #82
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.GRID.grid4"),
      name: 'TBL_NM',
      value: '',
      type: 'text',
      fvalue: '',
      visible: false,
      edit: false,
      callbak: null,
      validation: true
    }];
    this.oWpPopData = {
      'title': this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup1"),
      'flag': true,
      'type': 'dataset',
      'service': this.cMainAppSvc,
      'formdata': this.oAddDtsetFormData,
      // 'componentData': {file_name:''},
      // 'formControl': {
      //   dataset_name: new FormControl('', [Validators.required]),
      //   connection: new FormControl('', [Validators.required]),
      //   // type: new FormControl('', [Validators.required]),
      //   table_name: new FormControl('', [Validators.required]),
      //   // #82
      //   file_name: new FormControl({value:'',disabled:true}, [Validators.required])
      // }    
      // 'colWidthOption': 'tight'
    }
  }

  getDataSetList() {
    this.cMetaSvc.getDataSetList().subscribe(pData => {
      // console.log("pData : ",pData);
      this.oGridData = pData;
      let sColInfo = [];
      this.oDataList = [];
      if (pData.length != 0) {
        for (let sIdx in pData) {
          if (pData[sIdx].AUTHORITY == '소유')
            this.oDataList.push((pData[sIdx].DS_VIEW_NM).toLowerCase());
          pData[sIdx].DATASTATUS  = this.cTransSvc.instant(pData[sIdx].DATASTATUS)
        }
        for(let idx in this.oDisplayedColumns) {
          
          sColInfo.push({
            'NAME': this.oDisplayedColumns[idx],
            'VISIBLE': true,
            'VNAME': this.oDisplayedColumnNms[idx],
            'TYPE': 'string'
          });
        }
        for (let sCol of Object.keys(pData[0])) {
          let sIndex = this.oDisplayedColumns.findIndex(pVal => pVal === sCol);
          if (sIndex == -1) {
            sColInfo.push({
              'NAME': sCol,
              'VISIBLE': false,
              'VNAME': sCol,
              'TYPE': 'string'
            });
          } 
        }
        sColInfo.push({
          'NAME': 'FUNCTION',
          'VISIBLE': true,
          'VNAME': '',
          'VALUE': this.oFunctionList,
          'TYPE': 'string'
        });
        this.oGridCol = sColInfo;
      }
      this.cWpLibSvc.showProgress(false, "wdspin");
    });
  }

  setSelectOption(pFormNm:string, pVal?:any, pFval?:any, pFlag:boolean=true){
    if(pVal){
      this.oAddDtsetFormData.filter(pVal => pVal.name === pFormNm)[0].value = this.o_SelectDefaultVal.value.concat(pVal);
      this.oAddDtsetFormData.filter(pVal => pVal.name === pFormNm)[0].fvalue = this.o_SelectDefaultVal.fvalue.concat(pFval); 
    }else{
      this.oAddDtsetFormData.filter(pVal => pVal.name === pFormNm)[0].value = this.o_SelectDefaultVal.value;
      this.oAddDtsetFormData.filter(pVal => pVal.name === pFormNm)[0].fvalue = this.o_SelectDefaultVal.fvalue;      
    }
    let sObject:any = {};
    sObject[pFormNm] = '';
    this.oWpPopupDialogRef.componentInstance.patchValue(sObject);
    if(pFlag){
      this.oAddDtsetFormData.filter(pVal => pVal.name === 'TABLE_INFO')[0].visible = false;
      this.oAddDtsetFormData.filter(pVal => pVal.name === 'TBL_NM')[0].visible = false;
    }
  }

  resetSelectedForm(pConnType:string){
    this.setSelectOption('TABLE_INFO');
    this.setSelectOption('TBL_NM');
    if(pConnType=='db')
      this.oAddDtsetFormData.filter(pVal => pVal.name === 'TABLE_INFO')[0].visible = true;   
    this.oAddDtsetFormData.filter(pVal => pVal.name === 'TBL_NM')[0].visible = true;         
  }
  
  onPopupCallback(pResult:any){       
    if (pResult.eventNm == "datasetTypeSeleted"){
      // console.log(pResult)
      let sDatasetType : keyof typeof WP_DATASET_TYPE_ATT = pResult.selectedVal;
      this.o_SelectedFormData.TBL_TYPE = sDatasetType;
      let sConnectType = Object.keys(getWpConnectType(sDatasetType));     
      this.setSelectOption('CONNECTION_TYPE',sConnectType,sConnectType);
      this.setSelectOption('CONNECTION');
      
    }else if (pResult.eventNm == "connectTypeSeleted"){
      // console.log( pResult.selectedVal)
      if(pResult.selectedVal!=''){
        let sConnectType = pResult.selectedVal;
        this.o_SelectedFormData.CONNECTION_TYPE = sConnectType;
        let sDsMstrType = getWpConnectInfo(this.o_SelectedFormData.TBL_TYPE, sConnectType).dsMstrType;

        let sParam : any = { DBMS_TYPE: [], TYPE:[]}
        let sDBList = this.cWpAppConfig.getConfig('DBLIST');
        
        sDsMstrType.forEach((pDsType) => {
          if (sDBList.includes(pDsType)){
            sParam['DBMS_TYPE'].push(pDsType);
            sParam['TYPE'].push(sConnectType);
          }
          else{
            sParam['TYPE'].push(pDsType);
          }
        })
        
        this.cMetaSvc.getDsInfo(sParam).pipe(
          map(pDsData => {
            // this.oDsList = pDsData;
            let sTmpFvalue: any = [];
            for (let sIdx of pDsData) {
              sTmpFvalue.push(sIdx['DS_NM']);
            }
            this.setSelectOption('CONNECTION',pDsData,sTmpFvalue);       
          })
        ).subscribe();
      }else{
        this.o_SelectedFormData.CONNECTION_TYPE = null;
      }
      
    }else if (pResult.eventNm == "connectSeleted"){
      // console.log(pResult.selectedVal)
      if(pResult.selectedVal!='')
        this.connectSeleted(pResult.selectedVal)      
    }else if (pResult.eventNm == "tableSeleted"){
      this.oWpPopupDialogRef.componentInstance.patchValue({ 'TBL_NM': pResult.selectedVal });
    }

  }

  connectSeleted(pDsData: any) {
    // if (pDsData != undefined) {
      // this.oSelectedDs = pDsData;
      if(this.o_SelectedFormData.CONNECTION_TYPE != 'db'){
        this.resetSelectedForm(this.o_SelectedFormData.CONNECTION_TYPE);

        const dialogRef = this.cDialog.open(DmHdfsPopUpComponent, {data:pDsData.DS_ID});
        dialogRef.afterClosed().subscribe(pRes => {
          if (pRes) {
            if (pRes.result) {
              let sResult = pRes.data;
              this.oSelectedFile = sResult;
              // console.log(sResult)
              // this.oWpPopupDialogRef.componentInstance.patchValue({ 'TABLE_INFO': sResult });
              this.oWpPopupDialogRef.componentInstance.patchValue({ 'TBL_NM': sResult.name });
            }
          }
        });

      } else {
        this.resetSelectedForm(this.o_SelectedFormData.CONNECTION_TYPE);
        this.cWpLibSvc.showProgress(true, "wdspin");

        this.cMetaSvc.getTableInfo(pDsData['DS_ID']).pipe(
        ).subscribe(pTblData => {
          this.cWpLibSvc.showProgress(false, "wdspin");
          // this.oTblList = pTblData;
          let sTmpFvalue: any = [];
          for (let sIdx of pTblData) {
            sTmpFvalue.push(sIdx['TBL_NM']);
          }
          this.setSelectOption('TABLE_INFO',sTmpFvalue,sTmpFvalue,false)

        }, error => {
          this.cWpLibSvc.showProgress(false, "wdspin");
          throw error;
        });
      }
    // }
  }

  addDtsetPopup() {
    this.resetFormData();
    // this.cMetaSvc.getDsInfo().pipe(
    //   map(pDsData => {
    //     this.oDsList = pDsData;
    //     let sTmpFvalue: any = [];
    //     for (let sIdx of this.oDsList) {
    //       sTmpFvalue.push(sIdx['DS_NM']);
    //     }
    //     this.oAddDtsetFormData.filter(pVal => pVal.name === 'connection')[0].value = this.oDsList;
    //     this.oAddDtsetFormData.filter(pVal => pVal.name === 'connection')[0].fvalue = sTmpFvalue;
        const dialogRef = this.cDialog.open(WpPopupComponent, {
          data: this.oWpPopData
        });
        this.oWpPopupDialogRef = dialogRef;
        const dialogSubmitSubscription = dialogRef.componentInstance.selectionChanged
          .subscribe(pRes => {
            // console.log("selectionChanged!!")
            this.onPopupCallback(pRes);
          });

        dialogRef.afterClosed().subscribe(pRes => {
          dialogSubmitSubscription.unsubscribe();
          if (pRes) {
            // console.log(`Dialog result: ${pRes}`);
            // validation 추가해야함.
            if (pRes.result) {
              let sResult = pRes.data;
              this.cDtsetSvc.chkDatasetlist(sResult.DS_VIEW_NM).pipe(
                map(pResult => {
                  if (pResult['success']) {
                    if (pResult['result'].length != 0) {
                      // let sFileList = pResult['result'];
                      this.cMainAppSvc.showMsg('이미 존재하는 데이터셋 명입니다. 다시 설정해 주세요.', false);
                    } else {
                      this.addDatasetProgress(sResult);
                    }
                  }
                })
              ).subscribe();
            }
          }

        });
    //   })
    // ).subscribe();
  }

  addDatasetProgress(pData: WP_DATASET_ATT) {
    let sData: WP_DATASET_ATT = pData;
    sData.TBL_CAPTION = pData.TBL_NM;
    // if(pData.CONNECTION_TYPE == 'db'){
    //   sData.DS_FILE_FORMAT = 'csv';
    // }else{
    //   sData.DS_FILE_FORMAT = pData.TBL_NM.split('.').pop();
    // }
    // sData.DS_FILE_FORMAT = 'parquet'
    sData.FILE_INFO = this.oSelectedFile;
    // if (sData.TBL_NM)
    //   sData.TBL_NM = this.oSelectedFile;
    // console.log(pData)
    this.cWpLibSvc.showProgress(true, "wdspin");
    this.cDtsetSvc.addDataset(pData, this.cWpSocket.getSocketId()).subscribe(pResult => {
      this.cWpLibSvc.showProgress(false, "wdspin");
      // #92
      if (pResult['success']) {
        this.cMainAppSvc.showMsg('데이터셋이 추가되었습니다.', true)
        this.getDataSetList();
      }
    }, error => {
      console.log("error : ", error);
      this.getDataSetList();
      this.cWpLibSvc.showProgress(false, "wdspin");
      throw error;
    });
  }

  onGridCallback(pEv: any) {
    if (pEv.eventNm == 'trash')
      this.delFile(pEv.element);
    else if (pEv.eventNm == 'download')
      this.downloadFile(pEv.element);
    else if (pEv.eventNm == 'share')
      this.restApi(pEv.element);
    else if (pEv.eventNm == 'personadd')
      this.showAuthorityPopup(pEv.element);
    else if (pEv.eventNm == 'headBtnEvt')
      this.addDtsetPopup();
    else if (pEv.eventNm == 'rowClick')
      this.showProfilePage(pEv.element);
    else if (pEv.eventNm == 'hiveadd')
      this.addHive(pEv.element);
    else if (pEv.eventNm == 'hiveedit')
      this.editHive(pEv.element);
  }
  showProfilePage(pEl: any) {
    this.cDmAppSvc.changeTab('dm-dataset-profile', pEl);
    // this.cDmAppSvc.showProfile(pEl);
  }
  showAuthorityPopup(pEl: any) {
    const dialogRef = this.cDialog.open(WpPopUpAuthorityComponent, { data: { 'dataset': pEl, type: 'dataset'}, id: 'wp-popup-authority' });
  }

  delFile(pEl: any) {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': '알림',
        'flag': true,
        'service': this.cMainAppSvc,
        'message': this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup6", {value: pEl.DS_VIEW_NM}),
        'colWidthOption': 'tight'
      }
    });
    dialogRef.afterClosed().subscribe(pRes => {
      if (pRes) {
        if (pRes.result) {
          this.cDtsetSvc.delFile(pEl).pipe(
          ).subscribe(pResult => {
            if (pResult.success) {
              let param: HistoryItem = {
                DS_VIEW_ID: pEl.DS_VIEW_ID,
                OPERATION: 'delete',
                PRE_VALUE: pEl.DS_VIEW_NM,
                CUR_VALUE: null,
              };
              this.cHistorySvc.insert(param).subscribe(pHisRes => {
                console.log(pHisRes.message);
              });
              this.getDataSetList();
              this.cMainAppSvc.showMsg(pResult.result, true);
            } else {
              this.cMainAppSvc.showMsg(pResult.message, false);
            }
          });
        }
      }
    });
  }

  async downloadFile(pEl: any) {
    try{
      
      
      let sViewIdx = pEl.VIEW_IDX;
      if (!sViewIdx) {
        sViewIdx = 1;
      }
      //  else if (pEl.STATUS_CODE != 40) {
      //   sViewIdx += 1;
      // }
      let s_filePath = `/${pEl.REG_USER_NO}/wp_dataset/${pEl.DS_VIEW_ID}/`
      let s_fileName = ``
      // deltalake 데이터셋은 파일명에 VIEW_IDX가 안붙음
      if (pEl.DS_FILE_FORMAT =='delta'){
        s_fileName = `${pEl.DS_VIEW_ID}.${pEl.DS_FILE_FORMAT}`
      }
      else{
        s_fileName = `${pEl.DS_VIEW_ID}_${sViewIdx}.${pEl.DS_FILE_FORMAT}`
      }
      // 파일이 있는지 먼저 체크, 다운로드일 때는 python에서 경로 안붙히고 찾게 파라미터 추가해줌
      let s_checkFile = await this.cMetaSvc.chkFilelist([s_fileName], s_filePath, false, true).toPromise();
      // 파일 없으면 에러 던져서 밑에 catch문에 걸리게 함, 다운로드 진행 안됨
      if (s_checkFile.result.length==0){
        throw new Error
      }
      // 이미지 아닌 정형데이터셋 다운로드
      if(pEl.TBL_TYPE != 'image'){    
        // 파일 있으면 밑에 다운로드 진행
        s_filePath = s_filePath + s_fileName
        this.cDtsetSvc.getDownloadUrl(s_filePath,  pEl.DS_VIEW_NM).subscribe((response:any) => {
          const anchor = document.createElement('a');
          anchor.href = response.url;
          // anchor.target = '_blank'; // 새 창에서 다운로드 처리
          // anchor.download = ''; // 파일 이름은 서버에서 설정
          anchor.download = pEl.DS_VIEW_NM + '.csv';
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          let param: HistoryItem = {
            DS_VIEW_ID: pEl.DS_VIEW_ID,
            OPERATION: 'download',
            PRE_VALUE: `${pEl.DS_VIEW_ID}_${sViewIdx}.csv`,
            CUR_VALUE: `${pEl.DS_VIEW_ID}_${sViewIdx}.csv`,
          };
          this.cHistorySvc.insert(param).subscribe(pHisRes => {
            console.log(pHisRes.message);
          });
        });
    // 이미지 데이터셋 다운로드
    } else {
      s_filePath = `/${pEl.REG_USER_NO}/wp_dataset/${pEl.DS_VIEW_ID}/${sViewIdx}`
      await this.cDtsetSvc.downloadZipFile(pEl.DS_VIEW_NM, s_filePath);
    }
    }
    catch (error){
      this.cMainAppSvc.showMsg('데이터셋 다운로드에 실패하였습니다.', false);
    }
    // reg_user_no를 보낸다.
    // 어드민 계정으로 다른 계정의 파일을 다운로드하면
    // 자꾸 해당 어드민 계정의 유저번호 경로를 따서 파일이 없다고 나오기 때문.
    // this.cDtsetSvc.downloadFile(`wp_dataset/${pEl.DS_VIEW_ID}/${pEl.DS_VIEW_ID}_${sViewIdx}.csv`, 'WD', pEl.REG_USER_NO).subscribe(pResult => {
    //   let type = "text/csv";
    //   var blob = new Blob([pResult], { type: type });
    //   let link = document.createElement('a');
    //   link.href = window.URL.createObjectURL(blob);
    //   link.download = pEl.DS_VIEW_NM + '.csv';
    //   link.click();
    //   let param: HistoryItem = {
    //     DS_VIEW_ID: pEl.DS_VIEW_ID,
    //     OPERATION: 'download',
    //     PRE_VALUE: `${pEl.DS_VIEW_ID}_${sViewIdx}.csv`,
    //     CUR_VALUE: `${pEl.DS_VIEW_ID}_${sViewIdx}.csv`,
    //   };
    //   this.cHistorySvc.insert(param).subscribe(pHisRes => {
    //     console.log(pHisRes.message);
    //   });
    // });
  }

  restApi(pEl: any) {
    // this.cDtsetSvc.getRestUrl().pipe(
    //   map(pResult => {
    //     // 실제 데이터셋을 만든 유저번호(REG_USER_NO)로 해야 다른 계정꺼도 제대로 나옴(ADMIN 계정)
        
    //   })
    // ).subscribe();

    // WPLAT-355 실제 데이터셋을 만든 유저번호(REG_USER_NO)로 해야 다른 계정꺼도 제대로 나옴(ADMIN 계정)
    this.cMainAppSvc.showMsg(`${this.cWpLibSvc.oNodeUrl}/hdfs/getApiData/${pEl.REG_USER_NO}/${pEl.DS_VIEW_ID}/startRow/endRow\n${this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup7")}`, true);
  }

  // 하이브 등록 데이터 폼.
  resetFormHiveData(p_type:any) {
    console.log("p_type : ", p_type);
    let s_mode = {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup9"),
      name: 'MODE',
      value: ['new', 'overwrite', 'append'],
      type: 'select',
      fvalue: ['new', 'overwrite', 'append'],
      visible: true,
      edit: true,
      callbak: { name: 'hiveCallbak' }
    }

    let s_defaultMode = 'new';

    let s_title = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup8");

    if(p_type == 'edithive') {
      s_mode.value = ['rename', 'delete'];
      s_mode.fvalue = [this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup17"), 
        this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup18")];
      s_defaultMode = 'rename';
      s_title = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup16");
    }


    this.o_addHiveForm = [s_mode, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup10"),
      name: 'HIVE_TABLE',
      value: '',
      type: 'text',
      fvalue: this.o_hiveTableList,
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup10"),
      name: 'HIVE_TABLE_SELECT',
      value: this.o_hiveTableList,
      type: 'select',
      fvalue: this.o_hiveTableList,
      visible: false,
      edit: true,
      callbak: null
    }];
    this.oWpPopData = {
      'title': s_title,
      'flag': true,
      'type': 'sethive',
      'formdata': this.o_addHiveForm,
      'service': this.cMainAppSvc,
      'componentData': {
        MODE: s_defaultMode,
        HIVE_TABLE: "",
        HIVE_TABLE_SELECT: ""
      }
    }
  }


  // 하이브 등록
  addHive(p_ev: any) {
    this.o_hiveTableList = [];
    this.oWpPopData = {};
    this.resetFormHiveData('addhive');
    this.cDtsetSvc.getHiveTableList({ userno: p_ev.REG_USER_NO }).pipe()
      .subscribe(
        pHiveResult => {
          for (var sTbl of pHiveResult) {
            this.o_hiveTableList.push(sTbl['TBL_NAME']);
          }

          const dialogRef = this.cDialog.open(WpPopupComponent, {
            data: this.oWpPopData
          });

          dialogRef.afterClosed().subscribe(async pRes => {
            if (pRes) {
              // validation 추가해야함.
              if (pRes.result) {
                let s_tablename = ""
                let s_mode = pRes.data.MODE;
                if (s_mode == 'new') {
                  s_tablename = pRes.data.HIVE_TABLE;
                } else {
                  s_tablename = pRes.data.HIVE_TABLE_SELECT;
                }
                let s_dbname = `${p_ev.REG_USER_NO}_db`

                let s_param = {
                  'mode': s_mode,
                  'beforename': '',
                  'tablename': s_tablename,
                  "load": "hdfs",
                  "filename": p_ev.DS_VIEW_ID,
                  "filetype": p_ev.DS_FILE_FORMAT,
                  "fileseq": ",",
                  "dataUserno": p_ev.REG_USER_NO,
                  "index": p_ev.VIEW_IDX,
                  "dbname": s_dbname
                }
                let s_flag: any = false;

                if (s_mode != 'overwrite') {
                  s_flag = true;
                } else {
                  s_flag = await this.showSetHiveWarnDialog(s_tablename, s_mode);
                }
                if (s_flag == true) {
                  this.cWpLibSvc.showProgress(true, "wdspin");
                  this.cDtsetSvc.datasetHive(s_param).subscribe(
                    p_convertResult => {
                      let p_param = {
                        "mode": s_mode,
                        "tablename": s_tablename,
                        "dsViewId": p_ev.DS_VIEW_ID,
                        "database": s_dbname
                      };
                      this.cDtsetSvc.updateDpViewTblMstr(p_param).subscribe(
                        p_updateResult => {
                          if (s_mode != "append") {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_tablename}'이 생성되었습니다.`, true);
                          } else {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_tablename}'에 데이터를 적재하였습니다.`, true);
                          }
                          this.getDataSetList();
                          this.cWpLibSvc.showProgress(false, "wdspin");
                        },
                        error => {
                          this.cWpLibSvc.showProgress(false, "wdspin");
                          throw error;
                        }
                      )
                    },

                    error => {
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      throw error;
                    }
                  )
                }
              }
            }
          });

        },
        error => {
          this.cWpLibSvc.showProgress(false, "wdspin");
          throw error;
        })
  }
  hiveCallbak(pData: any) {
  }

  // overwrite(덮어쓰기) 시에는 경고표시
  showSetHiveWarnDialog(p_table: any, p_mode: any) {
    return new Promise((resolve, reject) => {
      let s_messeage = "";
      if(p_mode == 'overwrite') {
        s_messeage = `덮어쓰기를 하면 기존 '${p_table}' 테이블과 연계된 작업들이 작동하지 않을 수도 있습니다.\n 진행하시겠습니까?`
      } else if (p_mode == 'rename') {
        s_messeage = `테이블명을 변경하면 기존 '${p_table}' 테이블과 연계된 작업들이 작동하지 않을 수도 있습니다.\n 진행하시겠습니까?`
      } else {
        s_messeage = `테이블을 삭제하면 기존 '${p_table}' 테이블과 연계된 작업들이 작동하지 않을 수도 있습니다.\n 진행하시겠습니까?`
      }
      const dialogRef = this.cDialog.open(WpPopupComponent, {
        data: {
          'title': '알림',
          'flag': true,
          'service': this.cMainAppSvc,
          'message': s_messeage,
          'colWidthOption': 'tight'
        }
      });
      dialogRef.afterClosed().subscribe(pRes => {
        if (pRes) {
          if (pRes.result) {
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      });
    });
  }

  // 하이브 수정
  editHive(p_ev: any) {
    this.o_hiveTableList = [];
    this.oWpPopData = {};
    this.resetFormHiveData('edithive');
    this.cDtsetSvc.getHiveTableList({ userno: p_ev.REG_USER_NO }).pipe()
      .subscribe(
        pHiveResult => {
          for (var sTbl of pHiveResult) {
            this.o_hiveTableList.push(sTbl['TBL_NAME']);
          }

          const dialogRef = this.cDialog.open(WpPopupComponent, {
            data: this.oWpPopData
          });

          dialogRef.afterClosed().subscribe(async pRes => {
            if (pRes) {
              // validation 추가해야함.
              if (pRes.result) {
                let s_tablename = ""
                let s_beforename = ""
                let s_mode = pRes.data.MODE;
                if (s_mode == 'rename') {
                  s_beforename = p_ev.HIVE_TABLE;
                  s_tablename = pRes.data.HIVE_TABLE;
                } else {
                  s_tablename = p_ev.HIVE_TABLE;
                }
                let s_dbname = p_ev.HIVE_DB
                let s_param = {
                  'mode': s_mode,
                  'beforename': s_beforename,
                  'tablename': s_tablename,
                  "load": "hdfs",
                  "filename": p_ev.DS_VIEW_ID,
                  "filetype": p_ev.DS_FILE_FORMAT,
                  "fileseq": ",",
                  "dataUserno": p_ev.REG_USER_NO,
                  "index": p_ev.VIEW_IDX,
                  "dbname": s_dbname
                }


                let s_flag = await this.showSetHiveWarnDialog(s_tablename, s_mode);
                
                if (s_flag == true) {
                  this.cWpLibSvc.showProgress(true, "wdspin");
                  this.cDtsetSvc.datasetHive(s_param).subscribe(
                    p_convertResult => {
                      let p_param = {
                        "mode": s_mode,
                        "tablename": s_tablename,
                        "dsViewId": p_ev.DS_VIEW_ID,
                        "database": s_dbname
                      };
                      this.cDtsetSvc.updateDpViewTblMstr(p_param).subscribe(
                        p_updateResult => {
                          if (s_mode == "overwrite" || s_mode == "new") {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_tablename}'이 생성되었습니다.`, true);
                          } else if (s_mode == "append") {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_tablename}'에 데이터를 적재하였습니다.`, true);
                          } else if (s_mode == "rename") {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_beforename}'를 '${s_tablename}'로 변경하였습니다.`, true);
                          } else {
                            this.cMainAppSvc.showMsg(`하이브 테이블 '${s_tablename}'를 삭제하였습니다.`, true);
                          }
                          this.getDataSetList();
                          this.cWpLibSvc.showProgress(false, "wdspin");
                        },
                        error => {
                          this.cWpLibSvc.showProgress(false, "wdspin");
                          throw error;
                        }
                      )
                    },

                    error => {
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      throw error;
                    }
                  )
                }
              }
            }
          });

        },
        error => {
          this.cWpLibSvc.showProgress(false, "wdspin");
          throw error;
        })
  }

}
