import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';

import { TranslateService } from '@ngx-translate/core';
import { DataSetSerivce } from 'projects/data-manager/src/app/dataset/dataset.service';

declare const $: any;
@Component({
  selector: 'wp-popup-authority',
  templateUrl: './wp-popup-authority.component.html',
  styleUrls: ['./wp-popup-authority.component.css']
})
export class WpPopUpAuthorityComponent implements OnInit {
  oGridData:any = [];
  oDisplayedColumnNms: string[] = [this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup12"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup13")];
  // oDisplayedColumns: string[] = ['SELECT', 'USER_ID', 'USER_NAME'];
  oDisplayedColumns: string[] = ['USER_ID', 'USER_NAME'];
  oSelectMode='multiple';
  oHoverEffect = true;
  oGridRowEvt=true;
  oGridCol:any;
  oGridheader={filterCol: ['USER_ID', 'USER_NAME'] };

  // oUserList:any = [];
  // h_dataTreeList:any;
  oSelection = new SelectionModel<any>(true, []);
  // oSelectList:any = [];
  // 기존의 권한 부여된 유저 리스트
  oPrevAuthList:any = [];
  h_title = '';
  oActiveTab = 'user';
  constructor(private cMainAppSvc: MainAppService,
    private cMetaSvc: WpMetaService,
    private cDtsetSvc: DataSetSerivce,
    private cTransSvc: TranslateService,
    @Inject(MAT_DIALOG_DATA) public oData: {
      dataset?:any, 
      type?: string
    },
    public dialogRef: MatDialogRef<WpPopUpAuthorityComponent>) { }

  ngOnInit(): void {
    $('.scrollbar').scrollbar();
    this.oActiveTab = 'user';
    if(this.oData.type =='dataset') {
      this.h_title =`${this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup11")} - ${this.oData.dataset.DS_VIEW_NM}`;
    } else if(this.oData.type=='model') {
      this.h_title =`모델 권한 설정 - ${this.oData.dataset.MODEL_NM}`;
    } else if(this.oData.type=='workflow') {
      this.h_title =`워크플로우 권한 설정 - ${this.oData.dataset.WF_NM}`;
    }
    this.getAutUserList(this.oData.type); 
    
  }

  getAutUserList(p_type: string){
    this.cMetaSvc.getAuthUserList().subscribe(pUserResult=>{     
              // this.oUserList = pUserResult;
              let sColInfo:any = [];
              let sTmpAuthList:any = [];
              
              if(pUserResult.result.length!=0){        
                sColInfo.push({
                  'NAME':'SELECT',
                  'VISIBLE':true,
                  'VNAME':'',
                  // 'VALUE':['trash','download','share'],
                  'TYPE':'string'
                });
                for(let sCol of Object.keys(pUserResult.result[0])){
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
                this.oGridCol = sColInfo;       
              }

              this.cMetaSvc.getUserAuth(this.oData.dataset, p_type).subscribe(pResult=>{

                // this.oSelectList = this.oGridData;
                this.oGridData = pUserResult.result;
                pResult.result.forEach((resultItem:any) => {
                  const matchingIndex = this.oGridData.findIndex((gridItem:any) => gridItem.USER_NO === resultItem.SHARER_USER_NO);
                  console.log("matchingIndex : ", matchingIndex);
                  if (matchingIndex !== -1) {
                    // 2. 같으면 해당 USER_NO를 sTmpAuthList에 추가
                    sTmpAuthList.push(this.oGridData[matchingIndex].USER_NO);
                    
                    // 3. 해당 json을 this.oGridData에서 맨 앞으로 이동
                    const [matchedItem] = this.oGridData.splice(matchingIndex, 1);
                    this.oGridData.unshift(matchedItem);
                  }
                });
                this.oPrevAuthList = sTmpAuthList;
                console.log("this.oPrevAuthList : ", this.oPrevAuthList);
        
              });

    });
  }
  onUpdateAuth(){
    let sAddList:any = [];
    let sTmpRmvList:any = [];
    let sRemoveList:any = [];
    // let sRemoveList = this.oPrevAuthList;
    // let intersect = arr1.filter(x=>arr2.includes(x))
    // let difference = arr1.filter(x=>!arr2.includes(x))

    if(this.oActiveTab =='user') {
      this.oSelection.selected.forEach((pSelectIdx) => {    
        if(!this.oPrevAuthList.includes(pSelectIdx.USER_NO))
          sAddList.push(pSelectIdx.USER_NO);            
        else
          // 이전, 현재 동일하게 체크
          sTmpRmvList.push(pSelectIdx.USER_NO);            
          // sRemoveList.splice(sRemoveList.indexOf(pSelectIdx.USER_NO),1);
      });   
  
      console.log("sTmpRmvList ; ", sTmpRmvList);
          // 차집합
      sRemoveList = this.oPrevAuthList.filter((x:any)=>!sTmpRmvList.includes(x));
    } else {
      this.oSelection.selected.forEach((pSelectIdx) => {    
        if(!this.oPrevAuthList.includes(pSelectIdx.GROUP_ID))
          sAddList.push(pSelectIdx.GROUP_ID);            
        else
          // 이전, 현재 동일하게 체크
          sTmpRmvList.push(pSelectIdx.GROUP_ID);            
          // sRemoveList.splice(sRemoveList.indexOf(pSelectIdx.USER_NO),1);
      });   
  

          // 차집합
      sRemoveList = this.oPrevAuthList.filter((x:any)=>!sTmpRmvList.includes(x));
    }

      


    if(sAddList.length == 0 && sRemoveList.length == 0){
      console.log("데이터 권한 변경된것 없음")
      this.cMainAppSvc.showMsg('변경된 권한이 없습니다.', true);
      this.closePopup(true);
      // alert("똑같")
    }else{

      if(this.oActiveTab =='user') {
      this.cDtsetSvc.updateUserAuth(this.oData.dataset, this.oData.type, sAddList, sRemoveList).subscribe((pResult:any)=>{
        if(pResult.isSuccess){         
          this.cMainAppSvc.showMsg('권한이 변경되었습니다.', true);
          this.closePopup(true);
          // this.showUserAuthList();   
        }     
      });
    } else if(this.oActiveTab =='group') {
      this.cDtsetSvc.updateGroupAuth(this.oData.dataset, this.oData.type, sAddList, sRemoveList).subscribe((pResult:any)=>{
        if(pResult.isSuccess){         
          this.cMainAppSvc.showMsg('권한이 변경되었습니다.', true);
          this.closePopup(true);
          // this.showUserAuthList();   
        }     
      });
    }
    }    

  }

  closePopup(pData:any = false){
    this.dialogRef.close({result:pData});
  }  
  onGridCallback(pEv:any){
    if(pEv.eventNm == 'checkboxChanged'){
      this.oSelection = pEv.selection;
    }
      // this.onSelectTblChanged(pEv.element);
  }

  onTabClick(p_type:any) {
    this.oActiveTab = p_type;
    if(p_type == 'group') {
      this.oDisplayedColumns = ['GROUP_NAME', 'GROUP_DESC'];
      this.oGridheader={filterCol: ['GROUP_NAME', 'GROUP_DESC'] };
      this. oDisplayedColumnNms = ['그룹명', '그룹 설명'];
      this.getAutGroupList(this.oData.type);
    } else {
      this.oDisplayedColumns = ['USER_ID', 'USER_NAME'];
      this.oGridheader = {filterCol: ['USER_ID', 'USER_NAME'] };
      this. oDisplayedColumnNms = [this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup12"), 
        this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup13")];
      this.getAutUserList(this.oData.type);
    }

  }

  getAutGroupList(p_type: string){
    this.cMetaSvc.getAuthGroupList().subscribe(pUserResult=>{     
              // this.oUserList = pUserResult;
              let sColInfo:any = [];
              let sTmpAuthList:any = [];
              
              if(pUserResult.result.length!=0){        
                sColInfo.push({
                  'NAME':'SELECT',
                  'VISIBLE':true,
                  'VNAME':'',
                  // 'VALUE':['trash','download','share'],
                  'TYPE':'string'
                });
                for(let sCol of Object.keys(pUserResult.result[0])){
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
                this.oGridCol = sColInfo;       
              }

              this.cMetaSvc.getGroupAuth(this.oData.dataset, p_type).subscribe(pResult=>{
                // this.oSelectList = this.oGridData;
                this.oGridData = pUserResult.result;
                pResult.result.forEach((resultItem:any) => {
                  const matchingIndex = this.oGridData.findIndex((gridItem:any) => gridItem.GROUP_ID === resultItem.SHARER_GROUP_ID);
                  if (matchingIndex !== -1) {
                    // 2. 같으면 해당 USER_NO를 sTmpAuthList에 추가
                    sTmpAuthList.push(this.oGridData[matchingIndex].GROUP_ID);
                    
                    // 3. 해당 json을 this.oGridData에서 맨 앞으로 이동
                    const [matchedItem] = this.oGridData.splice(matchingIndex, 1);
                    this.oGridData.unshift(matchedItem);
                  }
                });
                this.oPrevAuthList = sTmpAuthList;
        
              });

    });
  }
}
