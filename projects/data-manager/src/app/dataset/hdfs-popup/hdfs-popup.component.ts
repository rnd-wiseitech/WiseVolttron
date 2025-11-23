import { Component, OnInit, ViewChild, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DxFileManagerComponent } from 'devextreme-angular';
import CustomFileSystemProvider from 'devextreme/file_management/custom_provider';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';

export class FileItem {
  name: string;
  isDirectory: boolean;
  owner?: string;
  size?: number;
  items?: FileItem[];
}
@Component({
  selector: 'dm-hdfs-popup',
  templateUrl: './hdfs-popup.component.html',
  styleUrls: ['./hdfs-popup.component.css']
})
export class DmHdfsPopUpComponent implements OnInit {
  @ViewChild(DxFileManagerComponent, { static: false }) h_fileManager: DxFileManagerComponent;
  oCustomFileProvider: CustomFileSystemProvider;
  selectFileOptions: any;
  closePopupOptions: any;
  h_selectMode = 'single';
  h_showPopup = true;

  constructor(private cMainAppSvc: MainAppService,
    private cMetaSvc: WpMetaService,
    @Inject(MAT_DIALOG_DATA) public oData:any,
    public dialogRef: MatDialogRef<DmHdfsPopUpComponent>) { }

  ngOnInit(): void {
    this.initFileManager();
  }
  closePopup(pData?:any){
    if(pData)
      this.dialogRef.close({result:true, data: pData});
    else
      this.dialogRef.close({result:false});
  }  
  initFileManager() {
    this.oCustomFileProvider = new CustomFileSystemProvider({
      // Function to get file system items
      getItems: this.getItems.bind(this),
    });
    this.selectFileOptions = {
      text: "Select File",
      onClick: this.selectFile.bind(this)
    }
    this.closePopupOptions = {
      icon: "remove",
      onClick: this.closePopup.bind(this)
    }
  }  
  async getItems(parentDirectory:FileSystemItem) {
    // parentDirectory: FileSystemItem
    let sFileList:any[]= [];
    let sFileResult:any = await this.getFileList(parentDirectory);
    sFileList = sFileResult;
    $('.dx-drawer-wrapper').children('.dx-drawer-panel-content:eq(0)').css('display','none');
    $('.dx-filemanager-notification-container').css('display','none');
    return sFileList;
  }
  getFileList(parentDirectory:any){    
    return new Promise((resolve, reject) => {
      this.cMetaSvc.getDataLake(parentDirectory.path, this.oData).subscribe(pResult => {
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
          sFileItem.owner = sHdfs.owner;
          sFileItem.size = sHdfs.length;
          sTmpFileItems.push(sFileItem);
        }
        resolve(sTmpFileItems);
      });
    });
  }
  
  selectFile() {
    let sSelectedRow = this.h_fileManager.instance.getSelectedItems()[0];
    if (sSelectedRow.isDirectory) {
      this.cMainAppSvc.showMsg("파일을 선택해주세요", false);
    } else {
      // this.oDtUploadForm.controls['file_name'].setValue(sSelectedRow.name);
      // this.selectFile = this.h_fileManager.instance.getSelectedItems()[0];
      this.closePopup(this.h_fileManager.instance.getSelectedItems()[0]);
    }
  }
}
