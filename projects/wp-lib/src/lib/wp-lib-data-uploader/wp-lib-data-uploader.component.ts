
import { Component, Input, OnInit,  ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core';
import {  map } from 'rxjs/operators';
import ArrayStore from 'devextreme/data/array_store'
// import * as $ from 'jquery';
declare const $: any;

import {  DxTooltipComponent } from 'devextreme-angular';
import { WpMetaService } from '../wp-meta/wp-meta.service';
// import { MainAppService } from 'projects/main/src/app/app.service';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from '../wp-popup/wp-popup.component';
import { WpLibDataUploaderService } from './wp-lib-data-uploader.service';
// import Dropzone from "dropzone/dist/dropzone-amd-module"
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';
import Dropzone from "dropzone";
import { WpLibService } from '../wp-lib.service';
import { SelectionModel } from '@angular/cdk/collections';
import { WpLoadingService } from '../wp-lib-loading/wp-lib-loading.service';
@Component({
  selector: 'wp-lib-data-uploader',
  templateUrl: './wp-lib-data-uploader.component.html',
  styleUrls: ['./wp-lib-data-uploader.component.css']
})
// #63
export class WpLibDataUploaderComponent implements OnInit, OnDestroy {
  @Input() iService:any=null;
  @Input() iType: string;
  @Input() iPath: string;
  @Input() iSingleUpload: boolean = false;
  @Input() iBtnText: string = '';
  @Input() iFileType: any = null;
  @Input() iModelURL: any = null;
  @Output() callBack: EventEmitter<any> = new EventEmitter();

  // Database 관련 var
  h_ComptData:any={};
  oDsList:any=[];
  oSelectTable:any = {};
  oSelection = new SelectionModel<any>(true, []);
  
  oGridheader=false;
  oSelectMode='single';
  oGridData:any=[];
  oGridCol:any;
  oGridRowEvt=true;
  oDisplayedColumnNms: string[] = ['테이블명', '설명'];
  oDisplayedColumns: string[] = ['TBL_NM', 'TBL_DESC'];
  oHoverEffect = true;

  // File 관련 var
  @ViewChild(DxTooltipComponent, { static: false }) oTooltip: DxTooltipComponent;  
  oDropzone:any;
  oServerURL = this.cAppConfig.getServerPath("NODE");
  oDrpznClickable = true;
  oDuplChk = false;
  oDuplFileList:any = [];
  h_Btn = 'Close';
  tmpWeight = 0;
  oUploadFileNms:any = [];
  oProcessedFileNms:any = [];
  oTotalCnt = 0;
  oCnt = 0;
  h_tooltipVisible = false;
  oProgressStatus = 'ready';
  uploadStartTime = 0;




  
  // @ViewChild(DxTooltipComponent, { static: false }) oTooltip: DxTooltipComponent;  
  // // #205 db datagrid, selectbox
  // @ViewChild("h_dataTable") oDataGrid: DxDataGridComponent
  // @ViewChild("h_dsSelectBx") oDsSelectInst: DxSelectBoxComponent

  constructor(private cMetaSvc: WpMetaService,
    // private cMainAppSvc: MainAppService,
    public cDialog: MatDialog,
    private cLibDtUploadSvc: WpLibDataUploaderService,
    private cAppConfig:  WpAppConfig,
    private cWpLibSvc: WpLoadingService,
    private cLibSvc: WpLibService) {
  }

  ngOnDestroy(): void {
    console.log('============ngOnDestroy===============');
  }
  ngAfterViewInit(): void {
    this.initData();
  }
  ngOnInit(): void {
    this.cLibSvc.setService(this.iService);
  }
  // File  
   // File  
   initDropzone() {
   
    const that = this;
    let s_acceptFileType: string | null = null;
    // 파일타입
    if (that.iFileType === 'csv') {
      s_acceptFileType = '.csv';
    } else if (that.iFileType === 'image') {
      s_acceptFileType = '.png,.jpg,.jpeg';
    }
    let sDropzoneEl: any = document.getElementsByClassName("dropzone-multiple")[0];
    let sDropzonePrevContain: any = document.getElementsByClassName("dz-preview")[0];
  
    // 전체 진행률 바 선택
    const overallProgressBar = document.getElementById("progress_bar");
    const progressBar = overallProgressBar?.getElementsByClassName("progress-bar ui-progress")[0] as HTMLElement;
    const progressValue = overallProgressBar?.getElementsByClassName("progress-val ui-label")[0] as HTMLElement;
  
    let totalUploaded = 0; // 업로드된 총 바이트
    let totalSize = 0; // 전체 파일 크기 (바이트)
  
    this.oDropzone = new Dropzone(sDropzoneEl, {
      // params: { path: this.iPath,  },
      paramName: "uploadfile",
      url: this.oServerURL + "/hdfs/upload",
      headers: {
        "filepath": encodeURIComponent(this.iPath), // 파일 저장 경로
        "token": JSON.parse(localStorage.getItem("currentUser")), // 인증 토큰
    },
      thumbnailWidth: null,
      thumbnailHeight: null,
      autoProcessQueue: false, // 수동으로 큐 처리
      clickable: ".dz-message",
      previewsContainer: sDropzonePrevContain,
      previewTemplate: sDropzonePrevContain.innerHTML,
      maxFiles: that.iSingleUpload ? 1 : null,  // ✅ 여기 추가
      parallelUploads: 10, // 하나씩 순차적으로 업로드,
      maxFilesize: null,
      acceptedFiles: s_acceptFileType,  // ✅ 여기만 바뀜
      init: function () {
        this.on("sending", function (file, xhr, formData) {
        if (that.iModelURL != null) {
          console.log("that.iModelURL : ", that.iModelURL);
          formData.append("modelURL", that.iModelURL);
        }
      });
        const submitButton = document.querySelector("#uploadBtn");
  
        // 업로드 버튼 클릭 이벤트
        submitButton.addEventListener("click", () => {
          if (this.getQueuedFiles().length > 0) {
            totalUploaded = 0;
            totalSize = this.getQueuedFiles().reduce((sum, file) => sum + file.size, 0); // 총 파일 크기 합산
            that.uploadStartTime = new Date().getTime(); // 업로드 시작 시간 초기화
            this.processQueue(); // 첫 파일 업로드 시작
          } else {
            that.cLibSvc.showMsg("업로드할 파일이 없습니다.", false);
          }
        });
  
        // 파일 추가 시 총 크기 업데이트
        this.on("addedfile", (file) => {
          totalSize += file.size;
        });
  
        // 개별 파일 진행률 업데이트
        this.on("uploadprogress", (file, progress, bytesSent) => {
          const progressElement = file.previewElement.getElementsByClassName("progress-bar-status")[0] as HTMLElement;
          if (progressElement) {
            progressElement.style.width = `${progress}%`; // 파일 개별 진행률 업데이트
          }
  
          // 전체 진행률 업데이트
          const overallProgress = ((totalUploaded + file.upload.bytesSent) / totalSize) * 100;
          if (progressBar) {
            progressBar.style.width = `${overallProgress}%`; // 전체 진행률 업데이트
          }
          if (progressValue) {
            progressValue.textContent = `${overallProgress.toFixed(1)}%`;
          }
        });
  
        // 파일 업로드 완료 시
        this.on("success", (file) => {
          totalUploaded += file.size; // 업로드 완료된 파일 크기 추가
          const successElement = file.previewElement.getElementsByClassName("dz-success-mark")[0] as HTMLElement;
          if (successElement) {
            successElement.style.display = "block"; // 성공 표시
          }
  
          // 다음 파일 업로드
          if (this.getQueuedFiles().length > 0) {
            this.processQueue();
          }
        });
  
        // 파일 업로드 실패 시
        this.on("error", (file, response) => {
          const errorElement = file.previewElement.getElementsByClassName("dz-error-mark")[0] as HTMLElement;
          if (errorElement) {
            errorElement.style.display = "block"; // 에러 표시
          }
  
          // 다음 파일 업로드
          if (this.getQueuedFiles().length > 0) {
            this.processQueue();
          }
        });
  
        // 전체 업로드 완료 시
        this.on("queuecomplete", async () => {
          if (progressBar) {
            progressBar.style.width = "100%"; // 전체 진행률 100%로 설정
          }
          if (progressValue) {
            progressValue.textContent = "업로드 완료!";
          }
          that.uploadStartTime = null; // 업로드 타이머 초기화
          totalUploaded = 0;
          totalSize = 0;
          that.cLibSvc.showMsg("모든 파일 업로드가 완료되었습니다!", true); // 완료 메시지 출력

          if (that.iModelURL != null) {
            const s_uploadedFiles = this.getAcceptedFiles().filter(file => file.status === "success");
            const s_filelist = s_uploadedFiles.map(file => file.name);
            this.removeAllFiles(true); // true: 업로드 성공 여부와 관계없이 전부 제거
            await that.cLibDtUploadSvc.downloadPredict(that.iModelURL, s_filelist);
          }
        });
  
        // 파일 제거 시 총 크기 업데이트
        this.on("removedfile", (file) => {
          totalSize -= file.size;
        });
      },
    });
  
    sDropzonePrevContain.innerHTML = "";
  }
  processQueue(){    
    $('.dz-message').css('pointer-events','none');
    this.oDropzone.options.autoProcessQueue = true;
    this.oDrpznClickable = false;
    this.h_Btn = 'Cancel';
    // this.chkProgress();
    this.oDropzone.processQueue();
    // this.showLoading(true); 
    // this.progressBar = true;
  }
  chkProgress(){    
    $('#progress_bar .ui-progress').css('width', '0');
    let sInterval = setInterval(() =>{
      let sWidth = $('#progress_bar .ui-progress').width();
      if(sWidth == 0){
        this.oDropzone.processQueue();
        this.oProgressStatus = 'start';
        this.showLoading('start');
        clearInterval(sInterval);
      }else{
        console.log(sWidth);
      }
    }, 500);
    // 0.5초
  }
  stopQueue(pStatus:any){    
    $('.dz-message').css('pointer-events','auto');
    this.oDropzone.options.autoProcessQueue = false;
    this.oDrpznClickable = true;
    // this.oUploadFileNms = [];
    this.oDuplChk = false;
    this.h_Btn = this.iBtnText? this.iBtnText: 'Close';
    // this.showLoading(false); 
    this.showLoading(pStatus); 
    // this.cLibDtUploadSvc.showMsg('업로드가 완료되었습니다.', false);
  }
  toggleDefault(pTarget:any, pMsg:any, pFlag:any) {
    this.h_tooltipVisible = pFlag;    
    this.oTooltip.target = pTarget;
    this.oTooltip.contentTemplate = pMsg;
  }
  showLoading(pStatus:any) {
    // // 20190823 progress bar 추가. 파일사이즈 200MB 기준씩 1증가. tmpWeight에 저장
    // // if(pFilesize >= 200)  {
    // //   this.tmpWeight = parseInt(String(pFilesize/200));
    // // }
    // // 기본 가중치 + 파일가중치
    // var fileWeight = 1 + this.tmpWeight;

    // $.fn.animateProgress = function (progress:any, pDuration:any, callback:any) {
    //   return this.each(()=>{
    //     this.realProgress = progress;
    //     $(this).animate({
    //       width: progress + '%'
    //     }, {
    //       duration: pDuration * fileWeight,
    //       easing: 'easeOutExpo',
    //       step: (progress:any, fx:any)=> {
    //         var labelEl = $('.ui-label', this),
    //           valueEl = $('.value', labelEl);
    //         this.realProgress = progress;
    //         // console.log("duration", fx.options.duration);
    //         if (Math.ceil(progress) < 20 && $('.ui-label', this).is(":visible")) {
    //         } else {
    //           if (labelEl.is(":hidden")) {
    //             labelEl.fadeIn();
    //           };
    //         }

    //         if (Math.ceil(progress) == 100) {
    //           labelEl.text('');
    //           setTimeout(function () {
    //             labelEl.fadeOut();
    //           }, 1000);
    //         } else {
    //           $(".ui-label").text(progress.toFixed(2) + '%');
    //         }
    //       },
    //       complete: (scope:any, i:any, elem:any) =>{
    //         if (callback) {
    //           callback.call(this, i, elem);
    //         };
    //       }
    //     });
    //   });
    // };
    // $('#progress_bar .ui-progress .ui-label').hide();
    //   if (pStatus == 'start') {
    //     console.log("start1111")
    //     // this.oProgressStatus = 'start';
    //     // // this.progressBar = true;
    //     // $('#progress_bar .ui-progress').css('width', '0');
    //     // $('.data2-load').fadeIn();
    //     // $('#progress_bar .ui-progress').animateProgress(21, 1000);
    //     // $('#progress_bar .ui-progress').animateProgress(31, 62000);
    //     // $('#progress_bar .ui-progress').animateProgress(41, 91000);
    //     // $('#progress_bar .ui-progress').animateProgress(51, 151000);
    //     // $('#progress_bar .ui-progress').animateProgress(61, 191000);
    //     // $('#progress_bar .ui-progress').animateProgress(71, 281000);
    //     // $('#progress_bar .ui-progress').animateProgress(81, 461000);
    //     // $('#progress_bar .ui-progress').animateProgress(91, 781000);
    //     $('#progress_bar .ui-progress').animateProgress(100, 1888000);
    //   }
    //   else {
    //     console.log("elseeeeee")
    //     if(pStatus == 'finish' && this.oProgressStatus == 'start'){
    //       console.log("elseeeeee11111")
    //       this.oProgressStatus = pStatus;
    //       $('#progress_bar .ui-progress').clearQueue(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').stop(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').animateProgress(100, 1000, function () {
    //         // $('.data2-load').fadeOut();
    //         // this.progressBar = false;
    //       });
    //     }else if(pStatus == 'finish' && this.oProgressStatus == 'stop'){
    //       console.log("elseeeeee2222")
    //       $('#progress_bar .ui-progress').clearQueue(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').stop(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //     }else if(pStatus == 'stop'){
    //       console.log("elseeeeee3333")
    //       this.oProgressStatus = pStatus;
    //       $('#progress_bar .ui-progress').clearQueue(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').stop(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').css('width', '0');
    //       $('#progress_bar .ui-progress .ui-label').hide();
    //     }else{
    //       console.log("whattheeeeeeeee")
    //       $('#progress_bar .ui-progress').clearQueue(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //       $('#progress_bar .ui-progress').stop(); // 실행중인 애니메이션을 멈춘다 (버튼 연타에 대비한 중복실행 방지)
    //     }
    //     // this.progressBar = false;
    //   }

  }
  // 여기까지

  // 공통
  initData(){
    if(this.iType=='Database'){
      this.cMetaSvc.getDsInfo().pipe(
        ).subscribe(pDsData=>{
          this.oDsList = pDsData.filter((sIdx:any)=>sIdx.TYPE=='db');  
      });
    }else{
      this.initDropzone();
    }
  }
  showDuplictDialog(){
    return new Promise((resolve, reject) => {
      const dialogRef = this.cDialog.open(WpPopupComponent, {
        data: {
          'title': '알림',
          'flag': true,
          'message': `이미 존재하는 파일이 있습니다. 덮어씌우시겠습니까?`,
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
  checkFileList() {
    // #205 db 추가
    let sChkFileList;
    if (this.iType == 'File') {
      // #166
      sChkFileList = this.oUploadFileNms.filter((x:any) => !this.oProcessedFileNms.includes(x));
    }else{
      sChkFileList = [`${this.oSelectTable['TBL_NM']}.csv`];      
    }
    this.cMetaSvc.chkFilelist(sChkFileList, this.iPath).pipe(
      map(async pResult => {
        if (pResult['success']) {
          // 중복파일 있을경우
          if (pResult['result'].length != 0) {
            let sFileList = pResult['result'];            
            let sFlag= await this.showDuplictDialog();   
            if(sFlag){
              if (this.iType == 'File') {
                this.oDuplChk = true;
                this.oDuplFileList = sFileList;
                this.processQueue();
              }else{
                this.dbUploadProgress();
              }
            }  
          } else {
            if (this.iType == 'File') {
              this.oDuplChk = true;
              this.processQueue();
            }else{
              this.dbUploadProgress();
            }
          }
        } else {
          this.cLibSvc.showMsg(pResult['message'], false);
        }
      })
    ).subscribe();
  }
  onSubmit(){
    if(this.iType=='Database'){      
      if(this.oSelection.selected.length == 0){
      // if(Object.keys(this.oSelectTable).length ==0){
        this.cLibSvc.showMsg("테이블을 선택해 주십시오.", false);
      }else{
        this.oSelectTable = this.oSelection.selected[0];
        this.checkFileList();
      }      
    }
  }
  onClose() {
    if(!this.oDrpznClickable && this.iType == 'File'){
      this.stopQueue('stop'); 
    }
    else{
      this.callBack.emit(this.oProcessedFileNms);
    }
  }




  // Database 관련 여기부터
  dbUploadProgress() {
    // #48. 20210623
    let sParams = {
      TableName: this.oSelectTable['TBL_NM'],
      // DbmsType: 'mssql',
      DsId: this.oSelectTable['DS_VIEW_ID'],
      path: this.iPath
    };
    this.cWpLibSvc.showProgress(true, 'mainspin');
    this.cLibDtUploadSvc.getDsViewData(sParams).pipe(
      map((pDsViewData) => {
        if (pDsViewData.count == 0) {
          // #43. 20210616
          // 테이블에 데이터가 하나도 없을 경우 에러모달처리.
          this.cLibSvc.showMsg("테이블에 데이터가 없습니다.", false);
        } else {
          this.cLibSvc.showMsg("업로드가 완료되었습니다.", true);
          this.onClose();
          // setTimeout(function () {
          //   this.onClose();
          // }.bind(this), 1000);

        }
      })).subscribe(
        // #48. 20210623
        // 업로드 중 에러 날 경우에는 경고모달 + 로딩 off
        (result) => {            
          this.cWpLibSvc.showProgress(false, 'mainspin');
          console.log("database data upload success")
        },
        (error) => {
          this.cWpLibSvc.showProgress(false, 'mainspin');
          this.cLibSvc.showMsg(error.message, false);
      } 
      );
  }
  onGridCallback(pEv:any){
    if(pEv.eventNm == 'checkboxChanged')
      this.oSelection = pEv.selection;
    
    // if(pEv.eventNm == 'checkboxChanged')
    //   this.onSelectTblChanged(pEv.element);
  }
  onSelectTblChanged(pEl:any){
    this.oSelectTable = pEl;
  }
  getTblList(pEv:any){
    this.h_ComptData = pEv.selectedItem;
    this.oGridData = [];
    this.oSelectTable = {};
    this.cWpLibSvc.showProgress(true, 'mainspin');
    this.cMetaSvc.getTableInfo(this.h_ComptData['DS_ID']).pipe(
      ).subscribe(pTblData=>{
        this.cWpLibSvc.showProgress(false, 'mainspin');
        console.log(pTblData)
        this.oGridData = pTblData;
        let sColInfo = [];
        if(pTblData.length!=0){
          sColInfo.push({
            'NAME':'SELECT',
            'VISIBLE':true,
            'VNAME':'',
            // 'VALUE':['trash','download','share'],
            'TYPE':'string'
          });
          for(let sCol of Object.keys(pTblData[0])){
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
    }, error =>{
      this.cWpLibSvc.showProgress(false, "mainspin");
      throw error;
    });
  }
  // 여기까지
}
