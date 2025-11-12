import { Component, OnInit, ViewChild  ,Input, Output, EventEmitter} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DxFileManagerComponent } from 'devextreme-angular';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider'; 
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { HistoryItem, HistoryService } from 'projects/wp-lib/src/lib/wp-history/wp-history.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { map } from 'rxjs/operators';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { WpFileViewerService } from './wp-file-viewer.service';
import { WpLibService } from '../wp-lib.service';
import { DefaultLangChangeEvent, TranslateService } from '@ngx-translate/core';
import { WpPopupProphetComponent } from '../wp-popup/wp-popup-prophet.component';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';

export class FileItem {
  name: string;
  isDirectory: boolean;
  owner?: string;
  size?: number;
  dateModified?: string;
  items?: FileItem[];
}
@Component({
  selector: 'wp-file-viewer',
  templateUrl: './wp-file-viewer.component.html',
  styleUrls: ['./wp-file-viewer.component.css']
})
export class WpFileViewerComponent implements OnInit {
  
  @Input() iService:any=null;
  @Input() iModalService:any=null;  
  @Input() iProjectName:any='wpplatform';   // wpplatform or wiseprophet
  @Input() iRootPath: string=null;  // root 폴더 지정하는 변수 추가
  @ViewChild("hFileMng", { static: false }) hFileMng: DxFileManagerComponent;
  @Output() wpDataUploader: EventEmitter<any> = new EventEmitter();
  @Output() wpSelectFile: EventEmitter<any> = new EventEmitter();
  
  oCustomFileProvider: CustomFileSystemProvider;
  newFileMenuOptions:any;
  selectFileMenuOptions:any;
  // refreshOptions:any;
  oSelectedRows:any = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
  h_popup = {flag:false, uploadType:''};
  oCurrPath:string = '';
  h_SearchWord:any ='';
  h_displayPath:any = 'root';
  oCurrFileList:any;
  h_searchFlag = false;
  oRefreshFlag = false;
  h_showBtn = false;
  h_ctxtMenuList:any = [];
  oDelCheck:any =null;
  o_platformMenu = [{
    text: "데이터베이스",
    options: {
        uploadType: "Database",
    }
  },{
    text: "파일",
    options: {
        uploadType: "File",
    }
  }];
  constructor(public cDialog: MatDialog,
    public cMetaSvc:WpMetaService,
    private cHdfsViewSvc: WpFileViewerService,
    private cHistorySvc: HistoryService,
    private cLibSvc: WpLibService,
    private cTransSvc: TranslateService,
    public cAppConfig: WpAppConfig
    ) { }

  ngOnInit(): void {      
    this.cTransSvc.onDefaultLangChange.subscribe((event: DefaultLangChangeEvent) => {
      this.cTransSvc.use(event.lang);
      this.initFileManager();
    });
    this.cLibSvc.setService(this.iService);
    // this.cTransSvc.setDefaultLang(this.iService.getLang());
    this.initFileManager();
  }
  ngAfterViewInit(){    
    $('.dx-filemanager-toolbar .dx-toolbar-before .dx-toolbar-button:eq(2)').removeClass('dx-toolbar-text-auto-hide');    
  }
  initFileManager(){
    this.oCustomFileProvider = new CustomFileSystemProvider({
      // Function to get file system items
      getItems: this.getItems.bind(this),
      // // Functions to handle file operations
      createDirectory: this.createDirectory.bind(this),
      deleteItem: this.deleteItem.bind(this),
      renameItem: this.renameItem.bind(this),
      moveItem: this.moveItem.bind(this),
      downloadItems: this.downloadItems.bind(this),
      copyItem: this.copyItem.bind(this)             
    });

    this.newFileMenuOptions = {
        items: [{
                text: this.cTransSvc.instant("DATA-MANAGER.CREATE-FILE"),
                icon: "plus",
                type: "newFile",
                items: this.iProjectName=='wpplatform'? this.o_platformMenu : []
            }],
        onItemClick: this.onItemClick.bind(this)
    };
    this.selectFileMenuOptions = {
        items: [{
                text: this.cTransSvc.instant("DATA-MANAGER.SELECT-FILE"),
                icon: "check",
                type: "selectFile",
                items: []
            }],
        onItemClick: this.onItemClick.bind(this)
    };
    // this.refreshOptions = {
    //   icon: "refresh",
    //   onClick: this.onApplyFilter.bind(this)
    // };    
  }
  onToolbarItemClick(pEv:any){
    if(pEv.itemData.name=='refresh'){
      this.hFileMng.instance.resetOption('focusedItemKey');
      this.onApplyFilter(pEv);
    }else if(pEv.itemData.name=='clearSelection'){
      this.hFileMng.instance.resetOption('focusedItemKey');
    }else if(pEv.itemData.name=='create'){
      $(".dx-filemanager-dialog-name-editor-popup.dx-overlay-shader").css('z-index',999999);
    }
  }

  unix_timestamp(pTime:any, pType:any){
    let sTime = '';
    var date = new Date(pTime);
    var year = date.getFullYear();
    var month = "0" + (date.getMonth()+1);
    var day = "0" + date.getDate();
    var hour = "0" + date.getHours();
    var minute = "0" + date.getMinutes();
    var second = "0" + date.getSeconds();
    if(pType == 'long')
      sTime = year + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hour.substr(-2) + ":" + minute.substr(-2) + ":" + second.substr(-2);
    else
      sTime = year.toString().substr(-2) + "-" + month.substr(-2) + "-" + day.substr(-2) + " " + hour.substr(-2) + ":" + minute.substr(-2);
    return sTime;
  }
  insertHistory(pParam:HistoryItem){
    this.cHistorySvc.insert(pParam).subscribe(pHisRes => {
      console.log(pHisRes.message);
      // this.oDtUploadForm.reset();
    });
  }  
  showDuplictDialog(){
    return new Promise((resolve, reject) => {
      let sPopupCompt:any = WpPopupComponent;
      if(this.iProjectName=='wiseprophet')
        sPopupCompt = WpPopupProphetComponent;
      const dialogRef = this.cDialog.open(sPopupCompt, {
        data: {
          'title': '알림',
          'flag': true,
          'message': this.cTransSvc.instant("DATA-MANAGER.DUPLICATE"),
          'colWidthOption': 'tight'
        }
      }); 
      dialogRef.afterClosed().subscribe(pRes => {
        if(pRes){
          if(pRes.result){
            resolve(true);
          }else{
            resolve(false);
          }
        }else{
          resolve(false);
        }
      });
    });   
  }
  onItemClick({ itemData, viewArea, fileSystemItem }:any) {
    if(this.iProjectName=='wpplatform'){
      const uploadType = itemData.options ? itemData.options.uploadType : undefined;
      // const category = itemData.options ? itemData.options.category : undefined;
      if(uploadType) {
          this.h_popup.flag = true;
          this.h_popup.uploadType = uploadType;
      }
    }else{
      //prophet
      if(itemData.type=='newFile'){
        this.wpDataUploader.emit(this.oCurrPath);
      }else{
        this.wpSelectFile.emit(this.hFileMng.instance.getSelectedItems());
      }
    }
  }
  onApplyFilter(pEv?:any){
    if(pEv){
      this.h_SearchWord = "";
    }
    else{
      this.h_searchFlag = true;
    }
    this.hFileMng.instance.refresh();  
  }
  async getItems(parentDirectory:FileSystemItem) {       
    console.log("getitems")
    let sFileList:any[]= [];
    let sFileResult:any = await this.getFileList(parentDirectory);
    if(this.h_searchFlag && parentDirectory.path == this.oCurrPath){
      sFileResult = sFileResult.filter((sIdx:any)=>sIdx.name.includes(this.h_SearchWord));   
      this.h_searchFlag = false;
    }
    sFileList = sFileResult;
    $('.dx-drawer-wrapper').children('.dx-drawer-panel-content:eq(0)').css('display','none');
    $('.dx-filemanager-notification-container').css('display','none');
    return sFileList;
  }
  // parentDirectory.path 경로의 파일 목록을 보여줌
  getFileList(parentDirectory:any){    
    return new Promise((resolve, reject) => {
      // let sFilePath = parentDirectory.path;      
      let sFilePath = this.iRootPath? this.iRootPath+parentDirectory.path: parentDirectory.path;
      // if(parentDirectory.path != this.oCurrPath)
      //   sFilePath = this.oCurrPath
    // this.cMetaSvc.getUserList(false).subscribe(pUserResult=>{      
    //   let temsss:any = pUserResult;

      this.cMetaSvc.getDataLake(sFilePath).subscribe(pResult=>{
        
        let sHdfsList = JSON.parse(pResult).FileStatuses.FileStatus;
        let sTmpFileItems: Array<FileItem> = new Array<FileItem>();

        for(let sHdfs of sHdfsList){
          let sFileItem:FileItem = new FileItem();

          if(sHdfs.type == "DIRECTORY"){
            sFileItem.isDirectory = true;
            if(sHdfs.pathSuffix == 'wp_dataset' && parentDirectory.path == '' && parentDirectory.name==''){
              continue;
            }
            // temsss.filter((pVal:any) => {
            //   if(pVal.USER_NO.toString() === sHdfs.pathSuffix){                
            //     sFileItem.owner = pVal.USER_ID;
            //   }
            // }); 
          }else{
            sFileItem.isDirectory = false;
          }
          
          sFileItem.name = sHdfs.pathSuffix;
          sFileItem.owner = String(sHdfs.owner);
          sFileItem.size = sHdfs.length;
          sFileItem.dateModified = this.unix_timestamp(sHdfs.modificationTime, 'long');
          sTmpFileItems.push(sFileItem);        
        }
        if($('.dx-filemanager-i-done').length!=0){
          $('.dx-filemanager-i-done').removeClass('dx-filemanager-i-done').addClass('dx-filemanager-i-refresh');
        }
        resolve(sTmpFileItems);
      });
    // }); 
    }); 
  }
  downloadItems(items:any) {         
    // items: Array<FileSystemItem>
    this.cHdfsViewSvc.getUserData().subscribe(async pUserResult=>{
      
      let s_rootPath = pUserResult.USER_MODE=='ADMIN'? '' : '/'+pUserResult.USER_NO+'/';      
      s_rootPath = this.iRootPath? s_rootPath+this.iRootPath: s_rootPath;
      
      for(let idx in items){
        const filePath = s_rootPath + items[idx].path;
        // 브라우저 네이티브 방식 
        // 다운로드 url을 받아옴.
        const response:any = await this.cHdfsViewSvc.getDownloadUrl(filePath).toPromise();
        // 새로운 <a> 태그 생성
        const anchor = document.createElement('a');
        anchor.href = response.url;
        anchor.download = items[idx].path.split('/').pop(); // 파일 이름 설정
        anchor.target = '_blank'; // 새 창에서 다운로드 처리

        // <a> 태그 클릭 및 제거
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
          let param:any = {
            DS_VIEW_ID: null,
            OPERATION: 'download',
            PRE_VALUE: items[idx].path,
            CUR_VALUE: items[idx].path,
          };      
          this.insertHistory(param);
        // });

      }
    });
  }
  deleteItem(item:any) {
    // item: FileSystemItem
    let sDeletePath = item.path
    sDeletePath = this.iRootPath? this.iRootPath+sDeletePath: sDeletePath;
    // if(this.iRootPath == 'un-analytic-model') {
    //   sDeletePath = 'tmp_upload/' + item.path;
    // }
    let sFileList = this.oSelectedRows.fileNm
    let sIsDirectory = this.oSelectedRows.fileList.map((pFileSystemItem : any) =>{
      return pFileSystemItem['isDirectory']
    })
    if (!this.oDelCheck) {
      this.oDelCheck = setTimeout(() => {
        this.cHdfsViewSvc.removePath(sFileList, sIsDirectory).subscribe(pResult=>{
          // #92
          
          if(pResult.success){
            let param:any = {
              DS_VIEW_ID: null,
              OPERATION: 'delete',
              PRE_VALUE: sDeletePath,
              CUR_VALUE: null,
            };      
            this.insertHistory(param);
            this.hFileMng.instance.refresh();  
          } 
        });
        this.oDelCheck = null  
      }, 300);
    }
  }
  // 파일만 가능
  copyItem(item:any, destinationDirectory:any) {         
    // item: FileSystemItem, destinationDirectory: FileSystemItem  
    this.checkSelectedFiles(item, destinationDirectory, 'copy').then(e=>{
      this.hFileMng.instance.refresh();
      console.log(e);
    }).catch(pErr=>{
      this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
      throw pErr;
    });  
  }
  moveItem(item:any, destinationDirectory:any) {   
    // item: FileSystemItem, destinationDirectory: FileSystemItem     
    this.checkSelectedFiles(item, destinationDirectory, 'move').then(e=>{
      this.hFileMng.instance.refresh();
      console.log(e);
    }).catch(pErr=>{
      this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
      throw pErr;
    });  
  }
  checkSelectedFiles(item:any, destinationDirectory:any, pType:any){
    return new Promise((resolve, reject) => { 
      if(!this.oSelectedRows.flag){        
        this.oSelectedRows = {total_cnt:0, cnt:0, flag:true, fileNm:[], fileList:[]};
        this.oSelectedRows.total_cnt = this.hFileMng.instance.getSelectedItems().length;  
        this.oSelectedRows.cnt++;
        this.oSelectedRows.fileNm.push(item.name); 
        this.oSelectedRows.fileList.push(item);
        if(this.oSelectedRows.cnt == this.oSelectedRows.total_cnt){
          this.chkDuplicateFiles(destinationDirectory, pType).then(pResult=>{
            resolve(pResult);
          }).catch(pErr=>{
            reject(pErr);
          });
        }else{
          resolve(true);
        }
      }else{
        this.oSelectedRows.cnt++;
        this.oSelectedRows.fileNm.push(item.name); 
        this.oSelectedRows.fileList.push(item);
        if(this.oSelectedRows.cnt == this.oSelectedRows.total_cnt){
          this.chkDuplicateFiles(destinationDirectory,pType).then(pResult=>{
            resolve(pResult);
          }).catch(pErr=>{
            reject(pErr);
          });
        }else{
          resolve(true);
        }
      } 
    });    
  }
  chkDuplicateFiles(destinationDirectory:any, type:any){
    return new Promise((resolve, reject) => {
      this.cMetaSvc.chkFilelist(this.oSelectedRows.fileNm,this.iRootPath?this.iRootPath+destinationDirectory.path:destinationDirectory.path).subscribe(async pResult=>{
        if(pResult['success']){
          if(pResult['result'].length != 0){    
            let sFileList = pResult['result']; 
            let sFlag= await this.showDuplictDialog();   
            if(sFlag && type == 'copy')  
              this.copyProgress(this.oSelectedRows.fileList, destinationDirectory, type);   
            else if(sFlag && type == 'move')  
              this.moveProgress(this.oSelectedRows.fileList, destinationDirectory, type); 
            else if(!sFlag)
              this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]}; 
            resolve(true);
          }else{
            if(type == 'copy'){
              this.copyProgress(this.oSelectedRows.fileList, destinationDirectory, type);   
            }else{
              this.moveProgress(this.oSelectedRows.fileList, destinationDirectory, type);                
            }
            resolve(true);
          }   
        }
      }, error =>{
        this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
        reject(error);
      });  
    }); 
    
  }
  async copyProgress(item:any, destinationDirectory:any, type:any){
    for(let idx in item){
      await new Promise((resolve, reject)=>{
        this.cHdfsViewSvc.copyPath(item[idx], destinationDirectory, this.iRootPath).subscribe(pResult=>{
          console.log(idx)
          if(pResult.success){
            let param:any = {
              DS_VIEW_ID: null,
              OPERATION: type,
              PRE_VALUE: item[idx].path,
              CUR_VALUE: destinationDirectory.path + '/' + item[idx].name,
            };      
            this.insertHistory(param);
          } 
          if(Number(idx)+1 == this.oSelectedRows.total_cnt){
            this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
            this.hFileMng.instance.refresh();
          }
          resolve(true);
        }, error =>{
          this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
          throw error;
        });
      });
    }
  }
  async moveProgress(item:any, destinationDirectory:any, type:any){
    for(let idx in item){
      let sMovePath = item[idx].path
      sMovePath = this.iRootPath? this.iRootPath+sMovePath: sMovePath;
      // if(this.iRootPath == 'un-analytic-model') {
      //   sMovePath = 'tmp_upload/' + item[idx].path;
      // }
      await new Promise((resolve, reject)=>{
        this.cHdfsViewSvc.movePath(item[idx], destinationDirectory, this.iRootPath).subscribe(pResult=>{
          console.log(idx)
          if(pResult.success){
            let param:any = {
              DS_VIEW_ID: null,
              OPERATION: type,
              PRE_VALUE: sMovePath,
              CUR_VALUE: destinationDirectory.path + '/' + item[idx].name,
            };      
            this.insertHistory(param);
          } 
          if(Number(idx)+1 == this.oSelectedRows.total_cnt){
            this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
            this.hFileMng.instance.refresh();
          }
          resolve(true);
        }, error =>{
          this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
          throw error;
        });
      });
    }
  }
  
  async renameItem(item:any, newName:any) {      
    let sRenamePath = ''
    if (item.pathKeys.length > 1){
      sRenamePath = item.pathKeys[0]
    }
    sRenamePath = this.iRootPath? this.iRootPath+sRenamePath: sRenamePath;
    // if(this.iRootPath == 'un-analytic-model') {
    //   sRenamePath = 'tmp_upload/' + item.path;
    // }
    // item: FileSystemItem, newName: string
    // 교체할 이름이 현재 이름과 다를 경우에만 실행
    if (newName != item.name){
      // newName = 새로 지정할 이름, sRenamePath = 새로 지정할 이름이 있는 경로
      let sDuplicateFlag = await this.chkDuplicateSingleFile([newName],sRenamePath);
      // true일 경우 (중복이 없을 경우) 이름 교체
      if(sDuplicateFlag){
        this.cHdfsViewSvc.renamePath(sRenamePath, item.name, newName).subscribe(pResult=>{
          // #92
          if(pResult.success) {
            let path = (sRenamePath).slice(0, (sRenamePath).lastIndexOf(item.name));
            let param:any = {
              DS_VIEW_ID: null,
              OPERATION: 'rename',
              PRE_VALUE: path + item.name,
              CUR_VALUE: path + newName,
            };      
            this.insertHistory(param);
          } 
        });
      }
    }
    // 교체할 이름이 현재 이름과 같을 경우 오류창
    else {
      this.cLibSvc.showMsg('선택한 항목과 같은 이름입니다.\n다른 이름을 입력해주세요.', false);     
    }
  }
  async createDirectory(parentDirectory:any, name:any) {      
    let sNewDirPath = parentDirectory.path
    sNewDirPath = this.iRootPath? this.iRootPath+sNewDirPath: sNewDirPath;
    // if(this.iRootPath == 'un-analytic-model') {
    //   sNewDirPath = 'tmp_upload/' + parentDirectory.path;
    // }
    // parentDirectory: FileSystemItem, name: string 
    let sDuplicateFlag = await this.chkDuplicateSingleFile([name],sNewDirPath,true);       
    if(sDuplicateFlag){  
      this.cHdfsViewSvc.makeDir(sNewDirPath, name).subscribe(pResult=>{   
        // #92
        if(pResult.success){
          let param:any = {
            DS_VIEW_ID: null,
            OPERATION: 'create',
            PRE_VALUE: null,
            CUR_VALUE: sNewDirPath + '/' + name,
          };      
          this.insertHistory(param);
        } 
      });
    }else{
      this.cLibSvc.showMsg('동일한 폴더명이 이미 존재합니다.', false);     
    }
  }
  chkDuplicateSingleFile(fileList:any, pathInfo:any, folderFlag=false){
    return new Promise((resolve, reject) => {
      this.cMetaSvc.chkFilelist(fileList,pathInfo,folderFlag).pipe(
        map(async pResult=>{
          if(pResult['success']){
            if(pResult['result'].length != 0){   
              let sFileList = pResult['result']; 
              let sFlag:any = false;
              if(!folderFlag)
                sFlag= await this.showDuplictDialog();               
              if(sFlag)  
                resolve(true);
              else 
                resolve(false);
            }else{
              resolve(true);
            }   
          }
        })
      ).subscribe();  
    });
  }
  onSelectionChanged(pEv:any){
    this.oSelectedRows = {total_cnt:0, cnt:0, flag:false, fileNm:[], fileList:[]};
    let sDirFlag = false;
    for(let idx in pEv.selectedItems){
      this.oSelectedRows.fileNm = pEv.selectedItemKeys
      this.oSelectedRows.fileList = pEv.selectedItems
      if(pEv.selectedItems[idx].isDirectory){
        sDirFlag = true;
      }
    }
    this.h_showBtn = !sDirFlag;
    // dx-drawer-wrapper
    // dx-drawer-panel-content
    // dx-filemanager-progress-panel
    // if(sDirFlag){ 
    //   // setTimeout(() => {
    //   //   $('.dx-filemanager-file-toolbar').find(".dx-button[aria-label='Copy to']").parents(".dx-toolbar-item").addClass('dx-state-invisible');
    //   //   $('.dx-filemanager-file-toolbar').find(".dx-button[aria-label='Copy to']").parents(".dx-toolbar-item").next().addClass('dx-state-invisible');
    //   // }, 50);
    // }else{
    //   // $('.dx-filemanager-file-toolbar').find(".dx-button[aria-label='Copy to']").parents(".dx-toolbar-item").removeClass('dx-state-invisible');
    //   // $('.dx-filemanager-file-toolbar').find(".dx-button[aria-label='Copy to']").parents(".dx-toolbar-item").next().removeClass('dx-state-invisible');
    // }
  }  
  onSetDirectory(pEv:any){
    console.log("onSetDirectory")
    this.oCurrPath = pEv.directory.path;
    // #13
    if(this.h_SearchWord != ''){
      this.h_SearchWord = '';
      this.hFileMng.instance.refresh();
    }
    if(this.oCurrPath=='')
      this.h_displayPath = 'root';
    else
      this.h_displayPath = this.oCurrPath;
  }
  onRefresh(pEv?:any){
    this.h_popup.flag = false;
    this.hFileMng.instance.refresh();
  }

}