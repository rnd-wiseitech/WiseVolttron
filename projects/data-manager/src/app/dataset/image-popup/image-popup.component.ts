import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { DxFileManagerComponent } from 'devextreme-angular';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';

export class FileItem {
  name: string;
  isDirectory: boolean;
  size?: number;
  thumbnail?: string;
  items?: FileItem[];
}
@Component({
  selector: 'dm-image-popup',
  templateUrl: './image-popup.component.html',
  styleUrls: ['./image-popup.component.css']
})
export class DmImagePopUpComponent implements OnInit {
  @ViewChild(DxFileManagerComponent, { static: false }) h_fileManager: DxFileManagerComponent;
  oCustomFileProvider: CustomFileSystemProvider;
  selectFileOptions: any;
  closePopupOptions: any;
  regExpOptions: any;
  dateExpOptions: any;
  h_searchWord = '';
  h_displayPath = '';
  h_selectMode = 'multiple';
  h_showPopup = true;
  oRootPath: string = '';
  h_moveParentDir = false; // (move to parentdir) 클릭시 true로 됨.
  oChangeRootPath: string = ''; // 사용자가 직접 최상단 .. 버튼을 눌러서 상위 폴더로 이동하는 경우에 변경된 절대 경로

  constructor(private cMainAppSvc: MainAppService,
    private cMetaSvc: WpMetaService,
    @Inject(MAT_DIALOG_DATA) public oData: {
      DS_ID: string,
      TYPE: string
    },
    public dialogRef: MatDialogRef<DmImagePopUpComponent>,
    private matDialog: MatDialog,
    private cTransSvc: TranslateService
  ) { }

  ngOnInit(): void {
    this.initFileManager();
  }
  closePopup(pData?: any) {
    if (pData)
      this.dialogRef.close(pData);
    else
      this.dialogRef.close({ result: false });
  }
  initFileManager() {
    this.oCustomFileProvider = new CustomFileSystemProvider({
      // Function to get file system items
      getItems: this.getItems.bind(this),
    });
    this.selectFileOptions = {
      text: "Select File",
      onClick: this.selectFile.bind(this)
    };
    this.closePopupOptions = {
      icon: "remove",
      onClick: this.closePopup.bind(this)
    };
  }
  async getItems(parentDirectory: FileSystemItem) {
    let sFileList: any[] = [];
    console.log("parentDirectory : ", parentDirectory);
    let sFileResult: any = await this.getFileList(parentDirectory);
    if (this.h_searchWord !== '' && parentDirectory.path == this.h_displayPath) {
      sFileResult = sFileResult.filter((sIdx: any) => sIdx.name.toLowerCase().includes(this.h_searchWord.toLowerCase()));
    }
    sFileList = sFileResult;
    $('.dx-drawer-wrapper').children('.dx-drawer-panel-content:eq(0)').css('display', 'none');
    $('.dx-filemanager-notification-container').css('display', 'none');
    return sFileList;
  }
  
  onSelectedFileOpened(pEvent: any) {
    if (pEvent.file.name === '..' && pEvent.file.thumbnail === 'parentfolder') {
      this.h_moveParentDir = true;
      this.h_fileManager.instance.refresh();
    }
  }
  getFileList(parentDirectory:any){    
    return new Promise((resolve, reject) => {
      this.cMetaSvc.getDataLake(parentDirectory.path, this.oData, 'image').subscribe(pResult => {
        let sHdfsList = JSON.parse(pResult).FileStatuses.FileStatus;
        let sTmpFileItems: Array<FileItem> = new Array<FileItem>();

        for (let sHdfs of sHdfsList) {
          let sFileItem: FileItem = new FileItem();

          if (sHdfs.type == "DIRECTORY") {
            sFileItem.isDirectory = true;
            if (sHdfs.pathSuffix == 'wp_dataset' && parentDirectory.path == '' && parentDirectory.name == '') {
              continue;
            }
          } else {
            sFileItem.isDirectory = false;
          }

          sFileItem.name = sHdfs.pathSuffix;
          sFileItem.size = sHdfs.length;
          sTmpFileItems.push(sFileItem);
        }
        resolve(sTmpFileItems);
      });
    });
  }

  selectFile() {
    let sSelectedRows: FileSystemItem | FileSystemItem[] = this.h_fileManager.instance.getSelectedItems();
    let sCurrPath = this.h_fileManager.instance.getCurrentDirectory().path;
    let sParam = { result: true, data: sSelectedRows, path: sCurrPath, rootPath: this.oRootPath, changeRootPath: this.oChangeRootPath };
    this.closePopup(sParam);
  }
}
