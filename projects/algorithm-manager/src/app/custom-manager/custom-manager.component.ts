import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';




import { TranslateService } from '@ngx-translate/core';
import { CustomManagerService } from './custom-manager.service';
import { WpPopupUploadComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-upload.component';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { HttpHeaders, HttpEventType } from '@angular/common/http';
import { AlgorithmAppService } from '../app.service';
import { WpPythonPopupComponent } from 'projects/workflow/src/app/components/popup/wp-python-popup.component';


@Component({
  selector: 'wp-custom-manager',
  templateUrl: './custom-manager.component.html',
  styleUrls: ['./custom-manager.component.css']
})
export class CustomManagerComponent implements OnInit {

  oGridData: any;
  oGridCol: any;
  oGridRowEvt = true;
  oGridheader = { btnNm: '커스텀 모델 추가', filterCol: ['MODEL_NM', 'FRAMEWORK_TYPE'] };
  oComptNm = ''
  oDisplayedColumnNms: string[] = [
    '모델 ID',
    '모델 명',
    '프레임워크 타입',
    '알고리즘 타입',
    '모델 파일명',
    '사용 스케일러',
    // '인코더 파일명',
    // '예시 데이터명',
    '소유자',
    '등록일'
  ];
  oDisplayedColumns: string[] = [
    'MODEL_ID',
    'MODEL_NM',
    'FRAMEWORK_TYPE',
    'ARG_TYPE',
    'MODEL_FILE',
    'SCALE_FILE',
    // 'ENCODER_FILE',
    // 'EXAMPLE_FILE',
    'USER_ID',
    'REG_DATE'
  ];
  oFunctionList: string[] = ['modify', 'trash'];
  oHoverEffect = true;


  oServerList: any = [];
  o_serverFormData: any[];
  oWpPopData: any = {};
  oSocketSubscribe: Subscription;
  oWpPopupDialogRef: any;
  oServerURL = this.cAppConfig.getServerPath("NODE");

  
  uploadStatus: string | null = null; // 업로드 상태 메시지

  h_uploadProgress: number | null = null; // 업로드 진행률
  h_isUploading: boolean = false; // 업로드 중 여부
  h_uploadFile = '';
  h_uploadStatus = '업로드';
  h_currentFileSize = '0B';
  h_totalFileSize = '0B';

  private o_uploadSubscription: Subscription | null = null; // 업로드 Subscription

  constructor(public cDialog: MatDialog,
    private cMainAppSvc: MainAppService,
    private cWpLibSvc: WpLoadingService,
    private cCustomMngSvc: CustomManagerService,
    private cTransSvc: TranslateService,
    private cAppConfig: WpAppConfig,
    private cAppSvc: AlgorithmAppService,
  ) { }

  ngOnDestroy(): void {
    // this.oSocketSubscribe.unsubscribe();
  }
  ngOnInit(): void {

    this.cWpLibSvc.showProgress(true, "wdspin");
    this.getCustomModelList();
  }

  resetFormData(p_data?: any) {

    this.o_serverFormData = [{
      vname: '모델 명',
      name: 'MODEL_NM',
      value: '',
      type: 'text',
      fvalue: this.oServerList,
      visible: true,
      edit: true,
      callbak: null,
      validation: true
    }, {
      vname: '프레임워크 타입',
      name: 'FRAMEWORK_TYPE',
      value: ['Scikit-learn', 'PyTorch', 'TensorFlow/Keras'],
      type: 'select',
      fvalue: ['Scikit-learn', 'PyTorch', 'TensorFlow/Keras'],
      visible: true,
      edit: true,
      callbak: {name:'selectFrameWork'},
      validation: true
    }, {
      vname: '알고리즘 타입',
      name: 'ARG_TYPE',
      value: ['Classification', 'Regression', 'Clustering', 'Reinforcement', 'LSTM'],
      type: 'select',
      fvalue: ['Classification', 'Regression', 'Clustering', 'Reinforcement', 'LSTM'],
      visible: true,
      edit: true,
      callbak: null,
      validation: true
    }, {
      vname: '사용 스케일러',
      name: 'SCALE_FILE',
      value: ['StandardScaler', 'RobustScaler', 'MinMaxScaler', 'MaxAbsScaler', 'Normalizer', 'No Scale'],
      type: 'select',
      fvalue: ['StandardScaler', 'RobustScaler', 'MinMaxScaler', 'MaxAbsScaler', 'Normalizer', 'No Scale'],
      visible: true,
      edit: true,
      callbak: null,
      validation: true
    }, {
      vname: '모델 파일',
      name: 'MODEL_FILE',
      value: null,
      type: 'file',
      fvalue: null,
      visible: true,
      edit: true,
      callbak: null,
      validation: true
    },
    {
      vname: '모델파일정보',
      name: 'MODEL_FILE_INFO',
      value: null,
      type: 'input',
      fvalue: null,
      visible: false,
      edit: true,
      callbak: null,
      validation: true
    },
    {
      vname: '모델 Class 코드 작성',
      name: 'MODEL_CLASS_CODE',
      value: '',
      type: 'button',
      fvalue: '',
      visible: false,
      edit: true,
      callbak: {name:'openPythonCode'},
      validation: false
  }
      // {
      //   vname: '접속 확인',
      //   name: 'CONNECT_STATUS',
      //   value: '',
      //   type: 'button',
      //   fvalue: null,
      //   visible: true,
      //   edit: true,
      //   callbak:{name:'onServerCheck'},
      //   validation: true
      // }, {
      //   vname: '호스트명',
      //   name: 'HOSTNAME',
      //   value: '',
      //   type: 'text',
      //   fvalue: null,
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }, {
      //   vname: 'OS명',
      //   name: 'OS_VERSION',
      //   value: '',
      //   type: 'text',
      //   fvalue: null,
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }, {
      //   vname: '총 코어',
      //   name: 'CORE',
      //   value: '',
      //   type: 'number',
      //   fvalue: '',
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }, {
      //   vname: '총 메모리(GB)',
      //   name: 'MEMORY_GB',
      //   value: '',
      //   type: 'number',
      //   fvalue: '',
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }, {
      //   vname: '총 디스크(GB)',
      //   name: 'HDD_GB',
      //   value: '',
      //   type: 'number',
      //   fvalue: '',
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }, {
      //   vname: '서버 설명',
      //   name: 'SERVER_DESC',
      //   value: null,
      //   type: 'text-area',
      //   fvalue: null,
      //   visible: true,
      //   edit: false,
      //   callbak: null,
      //   validation: false
      // }
    ];
    this.oWpPopData = {
      'title': '커스텀 모델 업로드',
      'flag': true,
      'type': 'custom-model',
      'service': this.cMainAppSvc,
      'formdata': this.o_serverFormData,
    }
    this.oWpPopData.scroll = true;
    if (p_data) {
      this.oWpPopData.componentData = p_data;
      this.o_serverFormData.forEach(item => {
        if (item.name === 'SERVER_NAME') {
          item.fvalue = this.oServerList.filter((server: any) => server.toLowerCase() != p_data.SERVER_NAME.toLowerCase());
        }
      });
      this.oWpPopData.title = '서버 수정';
    }
  }
  getCustomModelList() {
    this.cCustomMngSvc.getCustomModelList().subscribe(pData => {
      this.oGridData = pData.result;
      let sColInfo = [];
      this.oServerList = [];
      if (pData.result.length > 0) {
        for (let sIdx in pData.result) {
          this.oServerList.push((pData.result[sIdx].MODEL_NM).toLowerCase());
        }
        for (let sCol of Object.keys(pData.result[0])) {
          // this.oServerList.push((pData[sIdx].DS_VIEW_NM).toLowerCase());
          let sIndex = this.oDisplayedColumns.findIndex(pVal => pVal === sCol);
          if (sIndex == -1) {
            sColInfo.push({
              'NAME': sCol,
              'VISIBLE': false,
              'VNAME': sCol,
              'TYPE': 'string'
            });
          } else {
            sColInfo.push({
              'NAME': sCol,
              'VISIBLE': true,
              'VNAME': this.oDisplayedColumnNms[sIndex],
              'TYPE': 'string'
            });
          }
        }
        sColInfo.push({
          'NAME': 'FUNCTION',
          'VISIBLE': true,
          'VNAME': '',
          'VALUE': this.oFunctionList,
          'TYPE': 'text'
        });
        this.oGridCol = sColInfo;
      }
      // console.log("this.oGridCol : ", this.oGridCol);
      this.cWpLibSvc.showProgress(false, "wdspin");
    });
  }





  connectSeleted(pDsData: any) {
    // if (pDsData != undefined) {
    // this.oSelectedDs = pDsData;
    //   if(this.o_SelectedFormData.CONNECTION_TYPE != 'db'){
    //     this.resetSelectedForm(this.o_SelectedFormData.CONNECTION_TYPE);

    //     const dialogRef = this.cDialog.open(DmHdfsPopUpComponent, {data:pDsData.DS_ID});
    //     dialogRef.afterClosed().subscribe(pRes => {
    //       if (pRes) {
    //         if (pRes.result) {
    //           let sResult = pRes.data;
    //           this.oSelectedFile = sResult;
    //           // console.log(sResult)
    //           // this.oWpPopupDialogRef.componentInstance.patchValue({ 'TABLE_INFO': sResult });
    //           this.oWpPopupDialogRef.componentInstance.patchValue({ 'TBL_NM': sResult.name });
    //         }
    //       }
    //     });

    //   } else {
    //     this.resetSelectedForm(this.o_SelectedFormData.CONNECTION_TYPE);
    //     this.cWpLibSvc.showProgress(true, "wdspin");

    //     this.cMetaSvc.getTableInfo(pDsData['DS_ID']).pipe(
    //     ).subscribe(pTblData => {
    //       this.cWpLibSvc.showProgress(false, "wdspin");
    //       // this.oTblList = pTblData;
    //       let sTmpFvalue: any = [];
    //       for (let sIdx of pTblData) {
    //         sTmpFvalue.push(sIdx['TBL_NM']);
    //       }
    //       this.setSelectOption('TABLE_INFO',sTmpFvalue,sTmpFvalue,false)

    //     }, error => {
    //       this.cWpLibSvc.showProgress(false, "wdspin");
    //       throw error;
    //     });
    //   }
    // }
  }

  addCustomModel() {
    this.resetFormData();
    const dialogRef = this.cDialog.open(WpPopupUploadComponent, {
      data: this.oWpPopData,
    });
    const s_dialogSubmitSub = dialogRef.componentInstance.selectionChanged
      .subscribe(pRes => {
        if (pRes.eventNm == "selectFrameWork") {
          this.selectFrameWork(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
        }
        if (pRes.eventNm == "openPythonCode") {
          this.openPythonCode(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
        }
      });

    let s_dialogSub = dialogRef.afterClosed().subscribe(async pRes => {
      s_dialogSubmitSub.unsubscribe();
      s_dialogSub.unsubscribe();
      if (pRes) {
        if (pRes.result) {
          let s_result = pRes.data;
          this.h_isUploading = true;
          this.h_uploadProgress = 0;
          this.h_uploadFile = s_result['MODEL_FILE'];
          this.h_totalFileSize = this.formatBytes(s_result['MODEL_FILE_INFO'].size);

          let s_insertResult = await this.cCustomMngSvc.addCustomModel(s_result).toPromise();
          // let header = {
          //   "filepath": encodeURIComponent('/'), // 파일 저장 경로
          //   "token": JSON.parse(localStorage.getItem("currentUser")), // 인증 토큰
          // }
          let s_customId = s_insertResult.result.CUSTOM_ID;
          const s_headers = new HttpHeaders({
            "filepath": encodeURIComponent(`/custom/${s_customId}/`), // 파일 저장 경로
            "token": JSON.parse(localStorage.getItem("currentUser")), // 인증 토큰
            "personalpath": "Y"
          });
          // // FileUploadService를 사용하여 파일 업로드
          this.o_uploadSubscription = this.cCustomMngSvc.uploadFile(s_headers, s_result['MODEL_FILE_INFO']).subscribe({
            next: (event) => {
              if (event.type === HttpEventType.UploadProgress) {
                // 업로드 진행률 계산 및 업데이트
                this.h_uploadProgress = Math.round((100 * (event.loaded || 0)) / (event.total || 1));
                this.h_currentFileSize = this.formatBytes(event.loaded || 0);
              } else if (event.type === HttpEventType.Response) {
                console.log("finish: ");
                // 업로드 완료 상태 업데이트
                this.h_uploadProgress = 100;
                this.h_uploadStatus = '완료';
                this.h_isUploading = false;
                this.cWpLibSvc.showProgress(true, 'algorithmspin');
                let s_param = {
                  'filepath': `/custom/${s_customId}/`,
                  'CUSTOM_ID': s_insertResult.result.CUSTOM_ID,
                  'MODEL_FILE': s_insertResult.result.MODEL_FILE,
                  'SCALE_FILE': s_insertResult.result.SCALE_FILE,
                  'ARG_TYPE': s_insertResult.result.ARG_TYPE,
                  'FRAMEWORK_TYPE': s_insertResult.result.FRAMEWORK_TYPE,
                  'MODEL_NM': s_insertResult.result.MODEL_NM,
                  'MODEL_CLASS_CODE': s_result.MODEL_CLASS_CODE
                }
                this.cCustomMngSvc.setCustomModel(s_param).toPromise()
                  .then(pResult => {
                      this.getCustomModelList();
                      this.cMainAppSvc.showMsg('커스텀 모델 등록이 완료되었습니다.', true);
                      // Object.assign(p_event, JSON.parse(pResult)['data']);
                      // console.log("p_event : ", p_event);
                      // 상세 페이지 로직
                      // this.cAppSvc.changeTab('model-profile', p_event);
                  })
                  .catch(error => {
                      console.error("커스텀 모델 등록 중 오류 발생:", error);
                      this.cMainAppSvc.showMsg('커스텀 모델 등록에 실패했습니다.', false);
                  })
                  .finally(() => {
                      this.cWpLibSvc.showProgress(false, 'algorithmspin');
                  });
              }
            },
            error: (err) => {
              console.error('업로드 실패:', err);
              this.h_uploadProgress = 0;
              this.h_uploadStatus = '실패';
            }
          });
        }
      }

    });
  }


  onGridCallback(pEv: any) {
    if (pEv.eventNm == 'trash')
      this.updateCustomModel(pEv.element, 'trash');
    else if (pEv.eventNm == 'headBtnEvt')
      this.addCustomModel();
    else if (pEv.eventNm == 'modify')
      this.updateCustomModel(pEv.element, 'modify');
    else if (pEv.eventNm == 'rowClick')
      this.showModelPage(pEv.element);
  }

  showModelPage(p_event: any) {
    console.log(p_event);
    this.cWpLibSvc.showProgress(true, 'algorithmspin');
    // 실행결과, 파라미터 정보 넘겨서 모델 메트릭스랑 파라미터 정보 가져온다.
    let s_param = {
            method: 'MODEL-INFO',
            location: 'model-manager',
            MODEL_ID: p_event.MODEL_ID,
            MODEL_IDX: p_event.MODEL_IDX,
            CUSTOM_YN: p_event.CUSTOM_YN
        }
      

    this.cCustomMngSvc.getModelInfo(s_param).toPromise().then(pResult => {
        Object.assign(p_event, JSON.parse(pResult)['data']);
        // 상세 페이지 로직
        this.cAppSvc.changeTab('model-profile', p_event);
    }).catch(error => {
      this.cMainAppSvc.showMsg('모델 정보를 가져오는데 실패하였습니다.', false);
    }).finally(() => {
          this.cWpLibSvc.showProgress(false, 'algorithmspin');
      })

}

  updateCustomModel(pEl: any, p_type: string) {
    let s_data;
    if (p_type == 'trash') {
      s_data = {
        'title': '알림',
        'flag': true,
        'service': this.cMainAppSvc,
        'message': `커스텀모델 '${pEl.MODEL_NM}'을 삭제하시겠습니까?`,
        'colWidthOption': 'tight'
      }
    } else {
      this.resetFormData(pEl);
      console.log("this.o_serverFormData : ", this.o_serverFormData);
      s_data = this.oWpPopData
    }
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: s_data
    });
    const s_dialogSubmitSub = dialogRef.componentInstance.selectionChanged
      .subscribe(pRes => {
        // if (pRes.eventNm == "openPythonCode") {
        //   this.openPythonCode(pRes.selectedVal, dialogRef.componentInstance.oFormcontrol);
        // }
      });
    let s_dialogSub = dialogRef.afterClosed().subscribe(pRes => {
      s_dialogSubmitSub.unsubscribe();
      s_dialogSub.unsubscribe();
      if (pRes) {
        if (pRes.result) {
          let s_param;
          let s_cond;
          let s_msg: string;
          if (p_type == 'trash') {
            s_param = { DEL_YN: 'Y' };
            s_cond = { CUSTOM_ID: pEl.CUSTOM_ID };
            s_msg = '삭제되었습니다.';
          } else {
            s_param = pRes.data;
            s_cond = { CUSTOM_ID: pEl.CUSTOM_ID };
            s_msg = '수정되었습니다.';
          }
          let s_serviceSub = this.cCustomMngSvc.updateCustomModel(s_param, s_cond).pipe(
            map(pResult => {
              if (pResult.result) {
                this.getCustomModelList();
                this.cMainAppSvc.showMsg(s_msg, true);

              } else {
                this.cMainAppSvc.showMsg("error", false);
              }
              s_serviceSub.unsubscribe();
            })
          ).subscribe();
        }
      }
    });

  }




  // 업로드 취소 처리
  onCancelUpload(): void {
    if (this.o_uploadSubscription) {
      this.o_uploadSubscription.unsubscribe(); // 업로드 요청 취소
    this.h_uploadProgress = 0; // 진행률 초기화
    this.h_uploadStatus = '취소';
    this.h_isUploading = false; 
    }

  }


  // 바이트 단위 포맷팅
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + sizes[i];
  }

  // 바이트 단위 포맷팅
  selectFrameWork(p_param: any, p_form: any): any {
    console.log("p_param : ", p_param);
    console.log("this.p_form : ", p_form);
  }

  async openPythonCode(p_param: any, p_form: any) {
      let s_data = {
              schema: {},
              code: p_form['MODEL_CLASS_CODE'].value,
              usetable: '',
              result: {},
              jobId: 1,
              excuteFlag: false,
              popupType: "pytorch-class",
              param: {}
          };
      const dialogRef2 = this.cDialog.open(WpPythonPopupComponent, {
              width: '1400px',
              data: s_data,
              id: 'wp-python-popup'
            });

      dialogRef2.afterClosed().subscribe(pRes => {
      if (pRes && pRes.result) {
          console.log("pRes : ", pRes.code);
          // 팝업에서 입력한 코드 값.
          // this.oWpData.pythonCode = pRes.code;
          p_form['MODEL_CLASS_CODE'].setValue(pRes.code);
      }
      });
  }
}