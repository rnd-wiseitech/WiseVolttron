import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponent } from '../../wp-component';
import { COM_NAME_ATT, WpComData, WpComSchema } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpNameData } from 'projects/wp-server/util/component/transper/wp-name';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
interface IGridData { COL_NAME: string; INPUT_TEXT: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

/**
 * 데이터 변환 - 컬럼명 변경 컴포넌트 클래스
 * 
 * 컬럼명 변경 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpNameData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 컬럼명 변경 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpNameData | WpNameData}
 * 
 * @example
 * ```ts
 *  this.oComponent = new WpColumnNameComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpColumnNameComponent extends WpComponent {
  oWpData: Array<COM_NAME_ATT>
  // 다른 컴포넌트에서 가져다가 쓸때 grid form이 두개 이상으로 확장될 것을 고려해서 form name을 키로 하는 grid data로 설정함.
  oGridDataObj: { [index: string]: IGridData[] } = {};
  oGridColObj: { [index: string]: IGridCol[] } = {};
  oDisplayColsObj: { [index: string]: string[] } = { 'column_names': ['COL_NAME', 'INPUT_TEXT'] };
  oDisplayColNmsObj: { [index: string]: string[] }; 
  oChangeCol: { [index: string]: string } = {};// key: 원래 컬럼명, value: 변경된 컬럼명
  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pWpData: WpNameData) {
    super(pComViewerSvc, pWpData);
    this.oDisplayColNmsObj = { 'column_names': [pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"), 
      pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info50")] };
    this.setFormData([{
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info59"),
      name: 'column_names',
      value: '',
      type: 'grid',
      fvalue: [], //o_gridData
      visible: true,
      edit: true,
      callbak: this.onColChanged.bind(this)
    }]);
    this.oWpData.forEach(sNameCol => {
      if (sNameCol.column && sNameCol.value) {
        this.oChangeCol[sNameCol.column] = sNameCol.value;
      }
    });
  }
  public setSchema(pSchema: WpComData) {
    this.oSchema = pSchema;
    this.oFormData.forEach(sForm => {
      if (sForm.type === 'grid') {
        this.drawGrid(sForm.name, pSchema.schema);
      }
    });
    this.oComViewerSvc.selectData(pSchema);
  }

  drawGrid(pFormName: string, pSchema: WpComSchema[]) {
    let sGridData: IGridData[] = [];
    // 컬럼명 그리드 데이터 설정
    let sChangeCol = Object.keys(this.oChangeCol); // 변경대상 컬럼명
    pSchema.forEach(sSchema => {
      if (sChangeCol.includes(sSchema.name)) {
        sGridData.push({ COL_NAME: sSchema.name, INPUT_TEXT: this.oChangeCol[sSchema.name] });
      } else {
        sGridData.push({ COL_NAME: sSchema.name, INPUT_TEXT: sSchema.name });
      }
    })
    this.oGridDataObj[pFormName] = sGridData;
    let sGridCol: IGridCol[] = [];
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
  }
  // { element: IGridData, eventNm: string, index: number }
  onColChanged(pEvent: any) {
    if (pEvent.eventNm == 'keyUp') {
      let sIsValidInput = this.isValidString(pEvent.element.INPUT_TEXT, 'colNm');
      if (!sIsValidInput.isValid) {
        this.oComViewerSvc.showMsg(`유효한 컬럼명을 입력하세요`, false);
        // oWpData, input text 수정
        this.oGridDataObj['column_names'][pEvent.index].INPUT_TEXT = sIsValidInput.result;
      }
      // 동일한 값이면 변경대상 컬럼에서 제외
      if (pEvent.element.COL_NAME == pEvent.element.INPUT_TEXT) {
        delete this.oChangeCol[pEvent.element.COL_NAME];
      } else {
        this.oChangeCol[pEvent.element.COL_NAME] = pEvent.element.INPUT_TEXT;
      }
      this.setColName();
    }
    if (pEvent.eventNm == 'rowClick') {
      this.oGridDataObj['column_names'].forEach(sCol => {
        if (sCol.COL_NAME === sCol.INPUT_TEXT) {
          delete this.oChangeCol[sCol.COL_NAME];
        } else {
          this.oChangeCol[sCol.COL_NAME] = sCol.INPUT_TEXT;
        }
      })
    }
    // 컬럼명 변경 시 중복 확인
    if (pEvent.eventNm == 'change') {
      let sList = [];
      let sBeforeIdx = '';
      for (let i in this.oGridDataObj['column_names']){
        if (this.oGridDataObj['column_names'][i].COL_NAME != pEvent.element.COL_NAME){
          sList.push(this.oGridDataObj['column_names'][i].INPUT_TEXT)
        }
        else {
          sBeforeIdx = i;
        }
      }
      // 컬럼명 중복되는데가 있을때
      if(sList.includes(pEvent.element.INPUT_TEXT)){
        this.oComViewerSvc.showMsg(`해당 컬럼명은 지정되어 있습니다`, false);
        this.oGridDataObj['column_names'][Number(sBeforeIdx)].INPUT_TEXT = pEvent.element.COL_NAME;
        this.oChangeCol[pEvent.element.COL_NAME] = pEvent.element.COL_NAME;
        this.setColName()
      }
    }
  }
  setColName() {
    if (this.oChangeCol) {
      let sData = Object.keys(this.oChangeCol).map(key => ({ column: key, value: this.oChangeCol[key] })) as Array<COM_NAME_ATT>;
      // 배열을 비운 후 넣는다.
      this.oWpData.splice(0, this.oWpData.length);
      Object.assign(this.oWpData, sData);
      this.oComViewerSvc.showDiagramPreview(this.oComId, true);
    }
  }
}
