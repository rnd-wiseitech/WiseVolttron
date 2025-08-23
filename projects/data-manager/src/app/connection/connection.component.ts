import { Component, OnInit} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { DS_CONNECT_TYPE,DB_SUPPORT_TYPE, OBJECT_SUPPORT_TYPE,getJson } from 'projects/wp-lib/src/lib/wise-type/wise.connect';

@Component({
  selector: 'dm-connection',
  templateUrl: './connection.component.html',
  styleUrls: ['./connection.component.css']
})
export class ConectionComponent implements OnInit {
  oGridData:any;
  oGridCol:any;
  oGridheader = {btnNm:this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.BUTTON.button1"), filterCol:['DS_NM']};
  oDisplayedColumnNms: string[] = [this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid1"),  
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid2"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid3"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid4"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid5"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid6"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid7"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid8"),
    this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid9"),
    'FUNCTION'];
  oDisplayedColumns: string[] = ['DS_NM', 'DB_NM', 'TYPE', 'IP', 'USER_ID', 'PORT', 'DBMS_TYPE', 'DS_DESC', 'REG_DT',];
  oComptNm = 'dm-connection';
  oAddCnnctFormData:any[];
  oConnectionList:any = [];
  oSelectedDsId:any;

  constructor(public cDialog: MatDialog,
    public cMetaSvc:WpMetaService,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService

    // private cCnnctSvc: ConnectionSerivce
    ) { }

  ngOnInit(): void {
    this.getConnectionList();
    console.log(getJson(DS_CONNECT_TYPE));
  }
  
  getConnectionList(){
    this.cMetaSvc.getDsInfo({ includeFtp: true }).subscribe(pData => {
      this.oGridData = pData;
      let sColInfo = [];
      
      if(pData.length != 0){
        for(let sIdx in pData){
          this.oConnectionList.push((pData[sIdx].DS_NM).toLowerCase());
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
          // 'VALUE':['trash'],
          'VALUE':['trash','modify'],
          'TYPE':'string'
        });
        this.oGridCol = sColInfo;
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
    this.oSelectedDsId = pEv.DS_ID;
    this.resetFormData(pEv.TYPE, pEv.DBMS_TYPE);

    this.oAddCnnctFormData.filter((pVal:any) => {
      if(pVal.name == 'connection_name'){
        pVal.fvalue = pVal.fvalue.filter((pVal:any) => pVal != (pEv.DS_NM).toLowerCase());
      }
    });
    // WPLAT-365
    this.oAddCnnctFormData.forEach(sForm => {
      if (sForm.name == 'ownername') {
        if(pEv.DBMS_TYPE=='oracle' || pEv.DBMS_TYPE=='tibero') {
          sForm.vname = this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup12")
        } else {
          sForm.vname = this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup11")
        }
      }
    });
    // 밑에 resetFormData() 기능과 중복되어서 주석처리
    // this.onConnTypeChanged(pEv.TYPE, )
    // if(pEv.TYPE =='db') {
    //   this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectDbFormData());
    // } else  if (pEv.TYPE == 'ftp' || pEv.TYPE == 'sftp') {
    //   this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectFTPFormData());
    // } else if (pEv.TYPE == 'object') {
    //   this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectObjectFormData());
    // }

    const dialogRef = this.cDialog.open(WpPopupComponent,{
      data: {
        'title': this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup13"),
        'flag': true,
        'type': 'connection',
        'formdata': this.oAddCnnctFormData,
        'scroll':true,
        'service': this.cMainAppSvc,
        'componentData': {
          connection_name: pEv.DS_NM,
          connection_type: pEv.TYPE,
          description: pEv.DS_DESC,
          database: pEv.DBMS_TYPE,
          database_name: pEv.DB_NM,
          ip: pEv.IP,
          ownername : pEv.OWNER_NM,
          port: pEv.PORT,
          username: pEv.USER_ID,
          password: pEv.PASSWD,
        }
        // 'colWidthOption': 'tight'
      }
    });
    const dialogSubscription = dialogRef.componentInstance.selectionChanged
      .subscribe(pRes => {
        if (pRes.eventNm == "onConnTypeChanged") {
          console.log("onConnTypeChanged");
          console.log('pRes.eventNm : ', pRes.eventNm);
          this.onConnTypeChanged(pRes.selectedVal, dialogRef.componentInstance, pEv);
        }
        // WPLAT-365
        else if (pRes.eventNm == "onDbTypeChanged") {
          this.onDbTypeChanged(pRes.selectedVal, dialogRef.componentInstance, {});
        }
        else if (pRes.eventNm == "onObjectTypeChanged") {
          this.onObjectTypeChanged(pRes.selectedVal, dialogRef.componentInstance, {});
        }
      });
    dialogRef.afterClosed().subscribe(pRes => {
      dialogSubscription.unsubscribe();
      if(pRes){
        if(pRes.result){
          let sResult = pRes.data;   
          console.log(pRes.data) 
          sResult.ds_id = this.oSelectedDsId;        
          this.cMetaSvc.updateDs(sResult).pipe(
            map(pResult=>{
              if(pResult.result){
                console.log("success");   
                this.cMainAppSvc.showMsg('연결 정보가 수정되었습니다.',true)
                this.getConnectionList();
      
              }else{
                console.log("errorrrrr");          
                this.cMainAppSvc.showMsg("error",false);
              }
            })
          ).subscribe();
  
        }
      }
      
    });
  }

  addConnection(){
    this.resetFormData();
    const dialogRef = this.cDialog.open(WpPopupComponent,{
      data: {
        'title': this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.BUTTON.button1"),
        'flag': true,
        'type': 'connection',
        'formdata': this.oAddCnnctFormData,
        'service': this.cMainAppSvc,
        'scroll':true
        // 'colWidthOption': 'tight'
      }
    });
    const dialogSubscription = dialogRef.componentInstance.selectionChanged
      .subscribe(pRes => {
        if (pRes.eventNm == "onConnTypeChanged") {
          this.onConnTypeChanged(pRes.selectedVal, dialogRef.componentInstance, {});
        }
        // WPLAT-365
        else if (pRes.eventNm == "onDbTypeChanged") {
          this.onDbTypeChanged(pRes.selectedVal, dialogRef.componentInstance, {});
        }
        else if (pRes.eventNm == "onObjectTypeChanged") {
          this.onObjectTypeChanged(pRes.selectedVal, dialogRef.componentInstance, {});
        }
      });
    dialogRef.afterClosed().subscribe(pRes => {
      dialogSubscription.unsubscribe();
      // validation 추가해야함.
      if(pRes){
        if(pRes.result){
          let sResult = pRes.data;            
          console.log(sResult)
          this.cMetaSvc.connectDs(sResult, sResult.connection_type).pipe(
            map(pResult=>{
              if(pResult.result){
                console.log("success");   
                this.cMainAppSvc.showMsg('연결이 추가되었습니다.',true)
                this.getConnectionList();
      
              }else{
                console.log("errorrrrr");          
                this.cMainAppSvc.showMsg("error",false);
              }
            })
          ).subscribe();
  
        }
      }
      
    });
  }
  // 기본적으로 db form을 사용하고 pType이 있을 경우 그에 맞는 form으로 reset
    // WPLAT-365
    resetFormData(pType?: DS_CONNECT_TYPE, pDbType?:DB_SUPPORT_TYPE) {
    // this.oDsList = [];
    // this.oTblList = [];
    // this.oSelectedDs = {};
    let sFormVisible = true;
    let sObjFormVisible = false;
    let sSchMmFormVisible = false;
    this.oAddCnnctFormData = [
      {
        vname:this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.GRID.grid1"),
        name:'connection_name',
        value:'',
        type:'text',
        fvalue:this.oConnectionList,
        visible:true,
        edit:true,
        callbak:null
      },
      {
        vname:this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup3"),
        name:'description',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:null
      },
      {
        vname: this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup4"),
        name: 'connection_type',
        value: '',
        type: 'select_single',
        fvalue: getJson(DS_CONNECT_TYPE),
        visible: true,
        edit: true,
        callbak: { name: 'onConnTypeChanged' }
      }
    ];

    if(pType == DS_CONNECT_TYPE.DB){
      this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectDbFormData());      
      //ORACLE, POSTGRESQL이 있을때만 Form 변경하도록 수정, 이거 없으면 mysql 수정할 때 소유자명이나 스키마명 쓰라고 튀어나옴
      if (pDbType == DB_SUPPORT_TYPE.POSTGRESQL || pDbType == DB_SUPPORT_TYPE.ORACLE){
        let sLabelName = '';
        if (pDbType == DB_SUPPORT_TYPE.ORACLE)
          sLabelName = '소유자명';
        else if (pDbType == DB_SUPPORT_TYPE.POSTGRESQL)
          sLabelName = '스키마명';
        this.oAddCnnctFormData = this.oAddCnnctFormData.concat({
          vname:sLabelName,
          name:'ownername',
          value:'',
          type:'text',
          fvalue:'',
          visible: true,
          edit:true,
          callbak:null
        });
      }

    }      
    else if(pType == DS_CONNECT_TYPE.FTP || pType == DS_CONNECT_TYPE.SFTP){
      this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectFTPFormData());
    }
    else if(pType == DS_CONNECT_TYPE.OBJECT){
      this.oAddCnnctFormData = this.oAddCnnctFormData.concat(this.getConnectObjectFormData());
    }
  }
  delConnection(pEl:any){   
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': '알림',
        'flag': true,
        'service': this.cMainAppSvc,
        'message': `${pEl.DS_NM} 을 삭제하시겠습니까?`,
        'colWidthOption': 'tight'
      }
    }); 
    dialogRef.afterClosed().subscribe(pRes => {
      if(pRes){
        if(pRes.result){
          this.cMetaSvc.deleteDsInfo(pEl.DS_ID).subscribe(pResult=>{
            if(pResult.success){
              this.cMainAppSvc.showMsg("삭제되었습니다.",true);
              this.getConnectionList();
            }
          })
        }
      }
    });    
  }
  // ftp, sftp 는 db, db이름 미사용
  onConnTypeChanged(pValue: string, pCompInstance: any, pEv: any) {
    let sTemp:any = [];
    // 여기 this.oAddCnnctFormData를 필요한것만 때야한다 
    let sTempConnctFormData = this.oAddCnnctFormData.filter(val => {
      if (['connection_name', 'connection_type', 'description'].includes(val.name)){
        return val;
      }
    });
    for(let sForm of sTempConnctFormData){
      sForm.value = pCompInstance.oFormcontrol[sForm.name].value;
    }

    if(pValue == DS_CONNECT_TYPE.DB)
      sTemp = sTempConnctFormData.concat(this.getConnectDbFormData());
    else if(pValue == DS_CONNECT_TYPE.FTP || pValue == DS_CONNECT_TYPE.SFTP)
      sTemp = sTempConnctFormData.concat(this.getConnectFTPFormData());    
    else if(pValue == DS_CONNECT_TYPE.OBJECT)
      sTemp = sTempConnctFormData.concat(this.getConnectObjectFormData());
    else 
      sTemp = sTempConnctFormData.concat(this.getConnectFTPFormData()); 

    pCompInstance.patchFormData(sTemp);
  }
  getConnectObjectFormData(){    
    return [{
      vname:'스토리지 종류',
      name:'database',
      value: '',
      type:'select_single',
      fvalue: getJson(OBJECT_SUPPORT_TYPE),
      visible: true,
      edit:true,
      callbak: { name: 'onObjectTypeChanged' }
    },{
      vname:'스토리지명',
      name:'ip',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }, {
      vname:'지역',
      name:'port',
      value: '',
      type:'text',
      fvalue: '',
      visible: true,
      edit:true,
      callbak: null
    },{
      vname:'접근키',
      name:'username',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:'접근비밀키',
      name:'password',
      value:'',
      type:'password',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }] as any;
  }
  getConnectFTPFormData(){    
    return [{
      vname:'아이피',
      name:'ip',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup8"),
      name:'port',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup9"),
      name:'username',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup10"),
      name:'password',
      value:'',
      type:'password',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }] as any;
  }
  getConnectDbFormData(){    
    return [{
      vname:'데이터베이스 종류',
      name:'database',
      value: '',
      type: 'select_single',
        fvalue: getJson(DB_SUPPORT_TYPE),
      visible: true,
      edit:true,
      callbak: { name: 'onDbTypeChanged' }
    },{
      vname:'데이터베이스명',
      name:'database_name',
      value:'',
      type:'text',
      fvalue:'',
      visible: true,
      edit:true,
      callbak:null
    },{
      vname:'아이피',
      name:'ip',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:'포트',
      name:'port',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:'사용자명',
      name:'username',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:'비밀번호',
      name:'password',
      value:'',
      type:'password',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }] as any;
  }
  // WPLAT-365 oracle postgresql OWNER_NM 설정할 수 있게
  onDbTypeChanged(pValue: string, pCompInstance: any, pEv: any) {
    
    if (pValue == DB_SUPPORT_TYPE.POSTGRESQL  || pValue == DB_SUPPORT_TYPE.ORACLE || pValue == DB_SUPPORT_TYPE.TIBERO) {      
      let sLabelName = '소유자명';
      
      if (pValue == DB_SUPPORT_TYPE.POSTGRESQL)
        sLabelName = '스키마명';
      pCompInstance.deleteFormData('ownername');
      pCompInstance.appendFormData({
        vname:sLabelName,
        name:'ownername',
        value:'',
        type:'text',
        fvalue:'',
        visible: true,
        edit:true,
        callbak:null
      });
    }
    else{
      pCompInstance.deleteFormData('ownername');
    }

    pCompInstance.patchValue({'database':pValue});
    
  }
  onObjectTypeChanged(pValue: string, pCompInstance: any, pEv: any) {    

    pCompInstance.patchValue({'database':pValue});
    
  }
}