import { COM_FEATURE_IMPORTANCE_ATT, WpComSchema } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { WpFeatureImporanceData } from 'projects/wp-server/util/component/analytic/wp-feature-importance';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpComponentService } from '../../wp-component.service';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WorkflowAppService } from '../../../app.service';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { TranslateService } from '@ngx-translate/core';
interface IGridData { COL_NAME: string, FEATURE_IMPORTACE: string, SELECT: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

/**
 * 모델 학습 - 변수 중요도 클래스
 * 
 * 변수 중요도를 계산하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSampleData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 변수 중요도 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpFeatureImporanceData | WpFeatureImporanceData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpFeatureImportanceComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpFeatureImportanceComponent extends WpComponent {
  oWpData: COM_FEATURE_IMPORTANCE_ATT;
  oWpDiagramSvc: WpDiagramService;
  oWpComSvc: WpComponentService;
  oWpAppSvc: WorkflowAppService;
  oDiagramPreviewSvc: WpDiagramPreviewService;
  oWpSocketSvc: WpSocket;
  oGridDataObj: { [index: string]: IGridData[] } = {};
  oGridColObj: { [index: string]: IGridCol[] } = {};
  oDisplayColsObj: { [index: string]: string[] } = { 'column': ['COL_NAME', 'FEATURE_IMPORTACE' ,'SELECT'] };
  oDisplayColNmsObj: { [index: string]: string[] };

  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pWpData: WpFeatureImporanceData,
    pWpDiagramSvc: WpDiagramService,
    pWpComSvc: WpComponentService,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pWpAppSvc: WorkflowAppService,
    pWpSocketSvc: WpSocket,
    ) {
    super(pComViewerSvc, pWpData);
    this.oDisplayColNmsObj = { 'column': [
      pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"), 
      pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info63"), 
      pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info64")] };
    this.setFormData([{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info61"),
      name: 'target_column',
      value: '',
      type: 'select',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: this.onChangeTargetColumn.bind(this)
    }, {
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info62"),
      name: 'value',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: this.onBtnClick.bind(this)
    },{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info28"),
      name: 'value',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null,
    },{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info53"),
      name: 'column',
      value: '',
      type: 'grid',
      fvalue: [],
      visible: true,
      edit: true,
      callbak: null
    }
    ]);
    this.oWpDiagramSvc = pWpDiagramSvc;
    this.oWpSocketSvc = pWpSocketSvc;
    this.oWpComSvc = pWpComSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oWpAppSvc = pWpAppSvc;

    if (this.oWpData.usetable_info.schema){
      this.drawGrid();
    }
  }
  onChangeTargetColumn(pEvent:any){
    this.oWpData.target_column = pEvent.selectedItem;
    this.initFeatureImportance();
    this.drawGrid();
  }
  onBtnClick() {
    if (!this.oWpData.target_column){
      this.oComViewerSvc.showMsg('타겟 컬럼을 설정해주세요', false)
    } else {
      this.oComViewerSvc.showProgress(true);
      if (this.oWpData.usetable_info.usetable){
        this.getFeatureImportance()
      } else {
        this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
        // 컴포넌트 삭제시 unSubscribe 할 수 있게 addSubscription
    let sSubsIdx = this.oWpComSvc.getSubsIdx(this.oComId);
    if (sSubsIdx == -1) {
      this.oWpComSvc.addSubscription(this.oComId, [
        this.oWpDiagramSvc.sendJobCallResultEmit.subscribe((pData: any) => {
          console.log("------send Result-------");
          if (this.oComViewerSvc.oCurrentComId == this.oComId) {
            if (pData && pData.mode == 'excuteBefore') {
              setTimeout(() => {
                this.oWpDiagramSvc.chkFinishExcute(pData.result.ID).then(async (pResult: any) => {
                  if (pResult['sucsess']) {
                    // 상관관계, 시각화
                    this.o_usetable.usetable = pResult['pViewId'];
                    let s_schema: any = await this.oWpDiagramSvc.viewTable(pResult['pViewId']);
                    this.o_usetable.schema = s_schema['schema'];
                    this.o_usetable.data = s_schema['data'];
                    this.setComViewId(pResult['pViewId']);
                    // 변수 중요도 조회
                    this.getFeatureImportance()
                  } else {
                    // 에러 발생시 조회 옵션 해제
                    this.oComViewerSvc.showProgress(false);
                    this.oComViewerSvc.showMsg('변수 중요도 조회 에러가 발생하였습니다.', false)
                  }
                }).catch(pError => {
                  this.oComViewerSvc.showProgress(false);
                  this.oComViewerSvc.showMsg(pError.message, false);
                })
              }, 1000);
            }
          }
        }, error => {
          console.log(error);
          // 에러 발생시 조회 옵션 해제
          this.oComViewerSvc.showMsg('변수 중요도 조회 에러가 발생하였습니다.', false)
        })
      ])
    }
      }
    }
  }
  onKeyUp(pEvent: any, pName: string, pTabIdx: number) {
    let sValue = pEvent.srcElement.value; // 입력 값
    let sIsValidInput = this.isValidNumber(sValue, 'numeric');
    if (!sIsValidInput.isValid) {
      this.oComViewerSvc.showMsg(`기준 값에 유효한 숫자('numeric')를 입력하세요`, false);
      // oWpData, input text 수정
      this.oWpData.value = sIsValidInput.result;
      pEvent.srcElement.value = sIsValidInput.result;
    }
    if (this.oWpData.usetable_info.schema){
      this.drawGrid();
    }
  }
  getFeatureImportance(){
    let sParam = {
      action: "transform",
      method: "feature-importance",
      location: "workflow",
      data: {
        tempUseTable: this.oWpData.usetable_info.usetable,
        column: this.oWpData.target_column
      }
    }
    this.oComViewerSvc.getDataSchema(sParam).subscribe(sResult => {
      try {
        this.oWpData.usetable_info.schema = JSON.parse(sResult)['code_result'];
        this.oComViewerSvc.showMsg(`30개 이상의 카테고리 변수의 중요도는 -1로 표시됩니다.`, false);
      } catch (error) {
        this.oComViewerSvc.showMsg('변수 중요도 조회에 실패했습니다. 다시 시도해주세요', false);
        this.initFeatureImportance();
      }
      this.oComViewerSvc.showProgress(false);
      this.drawGrid();
    },()=>{
      this.oComViewerSvc.showMsg('변수 중요도 조회에 실패했습니다. 다시 시도해주세요', false);
      this.initFeatureImportance();
      this.oComViewerSvc.showProgress(false);
    })
  }
  setComViewId(pId: string) {
    // (usetable_info) usetable:groupid_jobid, schema:컬럼정보
    if (this.oWpData.usetable_info.usetable !== pId) {
      this.oWpData.usetable_info.usetable = pId;
    }
  }
  drawGrid() {
    let sData = this.oWpData.usetable_info.schema;
    let sGridData: IGridData[] = [];
    let sGridCol: IGridCol[] = [];
    let sSelectColumn:string[] = [];
    let sComData = this.oWpAppSvc.getComData(this.oComId);
    // 컬럼명 그리드 데이터 설정
    if (sData) {
      Object.keys(sData).forEach(sCol => {
        if (sCol != this.oWpData.target_column) {
          let sSelect;
          if (this.oWpData.value <= sData[sCol]) {
            sSelect = 'O';
            sSelectColumn.push(sCol);
          } else {
            sSelect = 'X';
          }
          sGridData.push({
            COL_NAME: sCol, FEATURE_IMPORTACE: Number(sData[sCol]).toFixed(3), SELECT: sSelect
          })
        }
      });
      // 변수중요도 순서로 정렬
      sGridData.sort((a: IGridData, b: IGridData) => 
        Number(b['FEATURE_IMPORTACE']) - Number(a['FEATURE_IMPORTACE'])
      );
    } else {  
      let sParentData = this.oWpAppSvc.getComData(sComData.parentId[0]);
      sParentData.schema.forEach((sCol:WpComSchema) => {
        if (sCol.name != this.oWpData.target_column){
          sGridData.push({
            COL_NAME: sCol.name, FEATURE_IMPORTACE: '', SELECT: ''
          })
        }

      });
    }
    if (this.oWpData.target_column) {
      sSelectColumn.push(this.oWpData.target_column);
    }

    this.oGridDataObj['column'] = sGridData;
    for (const sCol of Object.keys(this.oGridDataObj['column'][0])) {
      let sIndex = this.oDisplayColsObj['column'].findIndex(pVal => pVal === sCol);
      if (sIndex == -1) {
        sGridCol.push({
          'NAME': sCol, 'VISIBLE': false, 'VNAME': sCol, 'TYPE': 'string'
        });
      } else {
        sGridCol.push({
          'NAME': sCol, 'VISIBLE': true, 'VNAME': this.oDisplayColNmsObj['column'][sIndex], 'TYPE': 'string'
        });
      }
    }
    this.oGridColObj['column'] = sGridCol;
    this.oWpData.column = sSelectColumn;

    sComData = this.oWpDiagramSvc.getDeriveSchema(sComData);
    this.oDiagramPreviewSvc.setDiagramPreviewByData({sComData, sCurrDataFlag:true});
  }
  initFeatureImportance() {
    this.oWpData.usetable_info.schema = undefined;
  }
}
