import { COM_SELECT_ATT, WpComData, WpComSchema } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpSelectData } from 'projects/wp-server/util/component/transper/wp-select';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
interface IGridData { COL_NAME: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }
/**
 * 데이터 변환 - 열 선택 컴포넌트 클래스
 * 
 * 열 선택 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSelectData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 컬럼명 변경 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpSelectData | WpSelectData}
 * @params {@link WpDiagramPreviewService | WpDiagramPreviewService}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpColumnSelectorComponent(this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cWpAppSvc);
 * ```
 */
export class WpColumnSelectorComponent extends WpComponent {
  
  oWpData: COM_SELECT_ATT;
  hSelection: string = undefined
  hSelectionList: string[] = [];
  oGridDataObj: { [index: string]: IGridData[] } = {};
  oGridColObj: { [index: string]: IGridCol[] } = {};
  oDisplayColsObj: { [index: string]: string[] } = { 'column': ['COL_NAME'] };
  oDisplayColNmsObj: { [index: string]: string[] };
  oDiagramPreviewSvc: WpDiagramPreviewService;
  oWpAppSvc: WorkflowAppService;

  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pWpData: WpSelectData,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pWpAppSvc: WorkflowAppService
  ) {
    super(pComViewerSvc, pWpData);
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oWpAppSvc = pWpAppSvc;
    this.oDisplayColNmsObj = { 'column': [pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19")] };
    // 기존에 selectbox로 하나씩 컬럼을 선택하던 것에서 체크박스로 여러개를 한번에 선택할 수 있도록 변경함.
    this.setFormData([{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info53"),
      name: 'column',
      value: '',
      type: 'grid',
      fvalue: [],
      visible: true,
      edit: true,
      callbak: this.onColChange.bind(this)
    }]);
  }
  // { element: IGridData, eventNm: string, index: number }
  onColChange(pEvent: any) {
    // hSelectionList를 직접 수정하면 랜더링이 다시 발생하므로 수정함.
    // 컴포넌트 처음 클릭했을때 이전 컴포넌트도 컬럼 선택일 경우 과거 선택 컬럼도 pEvent.selection.selected에 표시되는 문제가 발생해서 수정
    let sComData = this.oWpAppSvc.getComData(this.oComId);
    let tmpSchema = { ...sComData };
    // 일부 컬럼만 선택하고 다른 컬럼 설정하고 돌아왔을때 기존에 선택되지 않은 컬럼 추가하려하면 표시 안되는 문제 해결
    // ex) a,b,c,d 컬럼 중 c,d 선택하고 다른 컴포넌트갔다가 돌아와서 컬럼 a를 선택하면 반영 안됨. 
    if (pEvent.element) {
      let sSelection = pEvent.selection.selected.map((sCol: IGridData) => sCol.COL_NAME);
      tmpSchema.schema = this.oSchema.schema.filter((sCol: WpComSchema) => sSelection.includes(sCol.name));
      this.oWpData.column = sSelection;
      // 전체 취소
    } else if (pEvent.eventNm == 'clearAll') {
      tmpSchema.schema = [];
      this.oWpData.column = [];
      // 전체 선택
    } else if (pEvent.eventNm == 'selectAll') {
      this.oWpData.column = this.oSchema.schema.map((sCol: WpComSchema) => sCol.name);
    }
    // this.oComViewerSvc.selectData(tmpSchema);
    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
  }
  public setSchema(pSchema: WpComData) {
    this.oSchema = pSchema;
    // 선택된 값 없으면 전체 선택 부터 함.
    if (this.oWpData.column.length == 0) {
      let sAllColumnNms = this.oSchema.schema.map((sCol: WpComSchema) => sCol.name);
      this.hSelectionList = sAllColumnNms;
      this.oWpData.column = sAllColumnNms;
      // 이미 선택된 값이 있으면 그 값을 체크하도록 함.
    } else {
      this.hSelectionList = this.oWpData.column;
    }
    this.oFormData.forEach(sForm => {
      if (sForm.type === 'grid') {
        this.drawGrid(sForm.name, pSchema.schema);
      }
    });
    this.oComViewerSvc.selectData(pSchema);
    // 최초 diagram preview 설정
    let tmpSchema = { ...this.oSchema };
    tmpSchema.schema = tmpSchema.schema.filter((sCol: WpComSchema) => this.hSelectionList.includes(sCol.name));
    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
  }
  drawGrid(pFormName: string, pSchema: WpComSchema[]) {
    this.hSelection = 'multiple';
    let sGridData: IGridData[] = [];
    // 컬럼명 그리드 데이터 설정
    pSchema.forEach(sSchema => {
      sGridData.push({ COL_NAME: sSchema.name });
    });
    this.oGridDataObj[pFormName] = sGridData;
    let sGridCol: IGridCol[] = [];
    sGridCol.push({
      'NAME': 'SELECT',
      'VISIBLE': true,
      'VNAME': '',
      'TYPE': 'string'
    })
    for (const sCol of Object.keys(this.oGridDataObj[pFormName][0])) {
      let sIndex = this.oDisplayColsObj[pFormName].findIndex(pVal => pVal === sCol);
      if (sIndex == -1) {
        sGridCol.push({
          'NAME': sCol, 'VISIBLE': false, 'VNAME': sCol, 'TYPE': 'string'
        });
      } else {
        sGridCol.push({
          'NAME': sCol, 'VISIBLE': true, 'VNAME': this.oDisplayColNmsObj[pFormName][sIndex], 'TYPE': 'string'
        });
      }
    }
    this.oGridColObj[pFormName] = sGridCol;
    // if (this.oWpData.target_column.length > 0) {
    //   this.hSelectionList = this.oWpData.target_column
    // }
  }
  // 기존 selectbox형태에서 사용한 callback 함수
  // public onColChange(pEvent: any) {
  //   // #12 동일한 컬럼을 여러개 선택할 수 없음
  //   console.log('=======onColChange=========');
  //   console.log(pEvent);
  //   let { sComId, sTabIdx } = this.oComViewerSvc.getCurrentTabInfo(pEvent);
  //   let sColName = this.oWpData.selectors[sTabIdx].target_column;
  //   let sColCount = 0;
  //   this.oWpData.selectors.forEach((sCol: any) => {
  //     if (sCol.target_column == sColName)
  //       sColCount++;
  //   });
  //   if (sColCount > 1) {
  //     this.oComViewerSvc.showMsg('컬럼을 중복하여 선택할 수 없습니다', false);
  //     pEvent.component._clearValue();
  //     // pEvent.target.selectedIndex = -1;
  //     this.oWpData.selectors[sTabIdx].target_column = '';
  //   }
  // }
}
