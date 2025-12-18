import { MatDialog } from '@angular/material/dialog';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpPythonPopupComponent } from '../../popup/wp-python-popup.component';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponentService } from '../../wp-component.service';
import { COM_PYTHON_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpPythonData } from 'projects/wp-server/util/component/transper/wp-python';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
;
/**
 * 데이터 변환 - PYTHON 컴포넌트 클래스
 * 
 * PYTHON 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpPythonData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 PYTHON 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpPythonData | WpPythonData}
 * @params {@link WpDiagramService | WpDiagramService}
 * @params {@link WpComponentService | WpComponentService}
 * @params {@link WpDiagramPreviewService | WpDiagramPreviewService}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * @params {@link WpSocket | WpSocket}
 * @params {@link MatDialog | MatDialog}
 * @example
 * ```ts
 * this.oComponent = new WpPythonComponent(this.cComViewSvc, this.oComponentData, this.cWpDiagramSvc, this.cWpComSvc, this.cWpDiagramPreviewSvc, this.cWpAppSvc,this.cWpSocketSvc, this.matDialog);
 * ```
 */
export class WpPythonComponent extends WpComponent {
  oWpData: COM_PYTHON_ATT;
  oWpDiagramSvc: WpDiagramService;
  oWpComSvc: WpComponentService;
  oDiagramPreviewSvc: WpDiagramPreviewService;
  oDialog: MatDialog;
  oWpAppSvc: WorkflowAppService;
  oWpSocketSvc: WpSocket;
  oTransSvc : TranslateService;
  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pWpData: WpPythonData,
    pWpDiagramSvc: WpDiagramService,
    pWpComSvc: WpComponentService,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pWpAppSvc: WorkflowAppService,
    pWpSocketSvc: WpSocket,
    pDiaglog: MatDialog) {
    super(pComViewerSvc, pWpData);
    this.setFormData([{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info31"),
      name: 'excuteFlag',
      value: '',
      type: 'checkbox',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info58"),
      name: 'value',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: this.onBtnClick.bind(this)
    }]);
    this.oWpDiagramSvc = pWpDiagramSvc;
    this.oWpSocketSvc = pWpSocketSvc;
    this.oDialog = pDiaglog;
    this.oWpComSvc = pWpComSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oWpAppSvc = pWpAppSvc;
    this.oTransSvc = pTransSvc;
    // setSchema 이전에 타는 부분
    // if (Object.keys(this.oWpData.popup_data).length > 0) {
    //   this.oPopupData = this.oWpData.popup_data;
    // };

  }

  // 실행한 Job을 통해서 생긴 viewId를 WpData에 저장 여기서 viewid는 완전한 spark viewid가 아니라 groupid_jobid 형태임.
  setComViewId(pId: string) {
    // (usetable_info) usetable:groupid_jobid, schema:컬럼정보
    if (this.oWpData.usetable_info.usetable !== pId) {
      this.oWpData.usetable_info.usetable = pId;
      this.oWpData.popup_data.usetable = pId;
    }
  }

  excuteSelectData() {
    this.oWpDiagramSvc.excuteSelectData();
  }
  // # DI 오류수정
  chkSocketConnection() {
    if (!this.oWpSocketSvc.oSocketStatus) {
      console.log("Socket Reconnected");
      this.oWpSocketSvc.onConnection();
    }
  }
  onBtnClick(pEvent: PointerEvent) {
    try {
      // 실행 옵션이 true 일 때만 직전 연결까지 실행함.
      if (this.oWpData.excuteFlag) {
        // 현재 파이썬 컴포넌트 이전에 연결되어있는 컴포넌트까지 실행(출력X)
        this.chkSocketConnection();
        this.oComViewerSvc.showProgress(true);
        this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
        // 컴포넌트 삭제시 unSubscribe 할 수 있게 addSubscription
        let sSubsIdx = this.oWpComSvc.getSubsIdx(this.oComId);
        if (sSubsIdx == -1) {
          this.oWpComSvc.addSubscription(this.oComId, [
            this.oWpDiagramSvc.sendJobCallResultEmit.subscribe((pData: any) => {
              console.log("------send Result-------");
              if (this.oComViewerSvc.oCurrentComId == this.oComId) {
                if (pData) {
                  if (pData.mode == 'excuteBefore') {
                    setTimeout(() => {
                      this.oWpDiagramSvc.chkFinishExcute(pData.result.ID).then(async (pResult: any) => {
                        let pMsg = '';
                        if (pResult['sucsess']) {
                          // 상관관계, 시각화
                          this.o_usetable.usetable = pResult['pViewId'];
                          let s_schema: any = await this.oWpDiagramSvc.viewTable(pResult['pViewId']);
                          this.o_usetable.schema = s_schema['schema'];
                          this.o_usetable.data = s_schema['data'];
                          pMsg = this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info110");
                          this.setComViewId(pResult['pViewId']);
                        } else {
                          // 에러 발생시 조회 옵션 해제
                          this.oComViewerSvc.showMsg(this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info109"), false)
                          this.oWpData.excuteFlag = false
                          // pMsg = '파이썬 코드 조회 에러가 발생하였습니다. 입력 데이터의 컬럼 정보를 사용합니다.'
                          // this.excuteSelectData();
                        }
                        this.oComViewerSvc.showMsg(pMsg, false);
                        this.oComViewerSvc.showProgress(false);
                        // #203 파생열 조건부/ 파생열 실행 에러처리
                      }).catch(pError => {
                        this.oComViewerSvc.showMsg(pError.message, false);
                        this.oComViewerSvc.showProgress(false);
                      })
                    }, 1000);
                  }
                  // 데이터 선택만 하는 경우
                  if (pData.mode == 'selectData') {
                    this.setComViewId(`${pData.result.ID}_0`);
                    this.oComViewerSvc.showProgress(false);
                  }
                }
                else {
                  // 기존에 동일한 Job을 실행한 경우
                  this.oComViewerSvc.showProgress(false);
                }
              }
            }, error => {
              console.log(error);
              this.initPopupData();
              // this.excuteSelectData();
              // 에러 발생시 조회 옵션 해제
              this.oComViewerSvc.showMsg(this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info109"), false)
              this.oComViewerSvc.showProgress(false);
            })
          ])
        } else {
          this.oComViewerSvc.showProgress(false);
        }
      }
    } catch (error) {
      console.error(error);
      this.oWpData.excuteFlag = false;
      this.oComViewerSvc.showProgress(false);
    } finally {
      let sData: any = this.oWpData.popup_data;
      sData.excuteFlag = this.oWpData.excuteFlag;
      // let cc = await this.oWpDiagramSvc.getNodesById(this.oComId)
      //여기가 시간이 걸림;;
      const dialogRef = this.oDialog.open(WpPythonPopupComponent, {
        width: '1400px',
        data: sData,
        id: 'wp-python-popup'
      });
      dialogRef.afterClosed().subscribe(pRes => {
        if (pRes && pRes.result) {
          // 팝업에서 입력한 코드 값.
          this.oWpData.value = pRes.code;
          this.oWpData.popup_data.code = pRes.code;
          this.oWpData.popup_data.result = { ...pRes.result };
          this.oWpData.excuteFlag = pRes.excuteFlag;
          let sEndFlag = false;
          // 실행 결과 컬럼 정보 반영
          if (pRes.result.schema && pRes.result.schema.length > 0) {
            // 변경된 정보가 있으면 하단 컬럼 속성 미리보기 변경
            let sTmpComData = { ...this.oWpAppSvc.getComData(this.oComId) };
            sTmpComData.schema = pRes.result.schema;
            sTmpComData.data = pRes.result.data;
            this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sTmpComData, 'sCurrDataFlag': true });
            sEndFlag = true;
          }
          if (sEndFlag || !this.oWpData.excuteFlag) {
            this.setBtnText(this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info107"));
          }
        }
      });
    }
  }
  initPopupData() {
    // 코드입력 값 초기화
    this.oWpData.value = '';
    // popupdata 초기화
    let sTmpCom = this.oWpDiagramSvc.getWpNodes().find(sCom => sCom.id == this.oComId);
    this.oWpData.popup_data = {
      schema: this.oSchema.schema,
      code: '',
      usetable: '',
      result: {},
      jobId: sTmpCom.jobId
    };
    this.oWpData.excuteFlag = false;
    // oPopupData와 this.oWpData.popup_data 똑같은 변수 두개를 사용하지 않고 this.oWpData.popup_data 으로 체크함.
    // this.oPopupData = this.oWpData.popup_data;
    // 하단 컬럼 속성 표시 수정
    let tmpSchema = { ...this.oSchema };
    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
    this.setBtnText(this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info107"));
  }
  setBtnText(pText: string) {
    let sBtnElem = document.getElementById(COM_ID['T-PYTHON'] + '_button');
    if (sBtnElem) {
      sBtnElem.innerText = pText;
    }
  }
  public setSchema(pSchema: WpComData) {
    this.oSchema = pSchema;
    this.oComViewerSvc.selectData(pSchema);
    // 기존 팝업 데이터 있으면 그 정보로 컬럼 정보 설정
    if (Object.keys(this.oWpData.popup_data).length !== 0) {
      // 실제 실행 결과 있는 경우엔 컬럼 schema 변경 (코드 정보나 과거 viewid 정보만 들고 있는 경우도 있음.)
      let tmpSchema = { ...this.oSchema };
      if (this.oWpData.popup_data.result && this.oWpData.popup_data.result.schema && this.oWpData.popup_data.result.schema.length > 0) {
        tmpSchema.schema = this.oWpData.popup_data.result.schema;
      }
      this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
      setTimeout(() => {
        this.setBtnText(this.oTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info107"));
      }, 50);
    } else {
      // 기존 팝업 데이터 없으면 초기화
      this.initPopupData();
    }
  }
}
