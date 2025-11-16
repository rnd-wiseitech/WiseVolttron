import { dxSelectChangeEvent, IWpProperties, WpPropertiesWrap, WpToggleEvent } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { HiveQueryService } from 'projects/data-manager/src/app/hive-query/hive-query.service';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor } from '@materia-ui/ngx-monaco-editor';
import { COM_ODBC_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpOdbcData } from 'projects/wp-server/util/component/data/wp-odbc';
import { TranslateService } from '@ngx-translate/core';
// export interface WkOdbcData extends WkCommonData {
//   [index: string]: any
//   dbOpt: 'RDBMS' | 'HIVE' | '';
//   selectOpt: string;
//   dbname: string;
//   tablename: string;
//   selectDb: {
//     DBMS_TYPE: 'db' | 'hive' | '',
//     DB_NM: string,
//     DS_ID: string,
//     IP: string,
//     PORT: string
//   };
//   query: string;
// }
export class WpOdbcComponent implements IWpProperties  {
  oFormData: WpPropertiesWrap[];
  public oComViewerSvc: WpComponentViewerService;
  public oDiagramPreviewSvc: WpDiagramPreviewService;
  public oMetaSvc: WpMetaService;
  oWpData: COM_ODBC_ATT;
  oHiveSvc: HiveQueryService;
  oDsInfoList: Partial<COM_ODBC_ATT>[] = [];

  oDbOpt: 'hive' | 'odbc';
  h_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'sql',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true
  };
  h_query: any = {
    code: "select * from table",
    editor: $('#workflow_query'),
  };
  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pComponentData: WpOdbcData,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pMetaSvc: WpMetaService,
    pHiveSvc: HiveQueryService,
    pType: 'hive' | 'odbc',
    pDbInfoList: any[]
  ) {
    this.oFormData = [
      {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info3"),
        name: 'selectOpt',
        value: '',
        type: 'button_toggle',
        fvalue: ['table', 'query'],
        visible: true,
        edit: true,
        callbak: this.onSelectOptChanged.bind(this)
      },
      {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info4"),
        name: 'dsname',
        value: '',
        type: 'select',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onDbChanged.bind(this)
      }, {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info5"),
        name: 'tablename',
        value: '',
        type: 'select',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onTableChange.bind(this)
      }, {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info6"),
        name: 'query',
        value: '',
        type: 'query',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onQueryBtnClick.bind(this),
      },
    ];
    this.oComViewerSvc = pComViewerSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oWpData = (pComponentData['o_data'] as COM_ODBC_ATT);
    this.oMetaSvc = pMetaSvc;
    this.oHiveSvc = pHiveSvc;
    this.oDbOpt = pType;

    // db접속정보 목록 설정
    this.setDsInfoList(pDbInfoList);
    // db명 목록 설정
    this.setDbNmList();

    // table, query 선택 옵션에 따라 ui 설정
    this.onSelectOptChanged({ value: this.oWpData.selectOpt, event: undefined, name: 'selectOpt' }).then(()=>{
      // query 값 설정
      if (this.oWpData.query != '') {
        // base64 디코딩 => uri 디코딩
        this.h_query.code = decodeURIComponent(atob(this.oWpData.query));
      }

      if (this.oDbOpt == 'hive') {
        if (this.oDsInfoList.length == 1) {
          this.oWpData.dsname = this.oDsInfoList[0].dsname;
          this.setFormValue('dsname', [{ key: 'visible', value: false }]);
        } else {
          this.setFormValue('dsname', [{ key: 'visible', value: true }]);
        }
      }
    });
  }
  public getFormData() {
    return this.oFormData;
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    this.h_query['editor'] = editor;
    // Programatic content selection example
    editor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endColumn: 10,
      endLineNumber: 3
    });
  }
  // 'table', 'query'
  async onSelectOptChanged(pEvent: WpToggleEvent) {
    this.oWpData.selectOpt = pEvent.value;
    if (pEvent.value == 'table') {
      this.setFormValue('query', [{ key: 'visible', value: false }]);
      this.setFormValue('tablename', [{ key: 'visible', value: true }]);
      if (this.oDbOpt == 'hive') {
        if (this.oDsInfoList.length == 1) {
          this.oWpData.dsname = this.oDsInfoList[0].dsname;
          this.setFormValue('dsname', [{ key: 'visible', value: false }]);
        } else {
          this.setFormValue('dsname', [{ key: 'visible', value: true }]);
        }
      }
      if (this.oWpData.dsname) {
        await this.setTbNmList();
      }
    }
    // 쿼리로 데이터 선택
    if (pEvent.value == 'query') {
      this.setFormValue('tablename', [{ key: 'visible', value: false }]);
      this.setFormValue('query', [{ key: 'visible', value: true }]);
      if (this.oDbOpt == 'hive') {
        this.setFormValue('dsname', [{ key: 'visible', value: false }]);
      }
    }
  }
  setDsInfoList(pList:any){
    let sDsInfoList:Partial<COM_ODBC_ATT>[] = [];
    if (this.oDbOpt == 'hive') {
      pList.forEach((sConnInfo: any) => {
        sDsInfoList.push({
          dsId: sConnInfo.DB_ID,
          dbtype: 'hive',
          dsname: sConnInfo.NAME,
          dbname: sConnInfo.NAME,
          dbhost: undefined,
          dbport: undefined,
          dbuser: undefined,
          dbpassword: undefined,
        });
      });
      // WPLAT-337 일반사용자 HIVE
      if(sDsInfoList.length == 1) {
        Object.assign(this.oWpData, sDsInfoList[0]);
      }
    
    }
    if (this.oDbOpt == 'odbc') {
      pList.forEach((sConnInfo:any) => {
        sDsInfoList.push({
          dsId: sConnInfo.DS_ID,
          dsname: sConnInfo.DS_NM,
          dbtype: sConnInfo.DBMS_TYPE,
          dbname: sConnInfo.DB_NM,
          dbhost: sConnInfo.IP,
          dbport: sConnInfo.PORT,
          owner: sConnInfo.OWNER_NM,
          dbuser: '',
          dbpassword: '',
        });
      });
    }
    this.oDsInfoList = sDsInfoList;
  }

  onQueryBtnClick(pEvent: any) {
    // base64 encoding 
    // spark에서 쿼리에 ; 있으면 에러남.
    let sQuery = this.h_query.code.replaceAll(';', '');
    sQuery = btoa(encodeURIComponent(sQuery)); //base64인코딩시 큰따옴표, 백틱 사용시 에러 막기 위해 추가
    this.oWpData.query = sQuery;
    this.onTableChange(undefined);
  }

  setDbNmList() {
    let sDbNmList: any = [];
    this.oDsInfoList.forEach((sDbInfo: any) => {
      sDbNmList.push(sDbInfo.dsname);
    });
    this.setFormValue('dsname', [{ key: 'fvalue', value: sDbNmList }]);
  }
  public async setTbNmList() {
    let sTmpFvalue: any = [];
    if (this.oWpData.dbOpt == 'hive') {
      let sTableInfoList = await this.oHiveSvc.getHiveTableInfo().toPromise();
      for (let sIdx of sTableInfoList) {
        if (sIdx.DB_ID == this.oWpData.dsId) {
          sTmpFvalue.push(sIdx['TBL_NAME']);
        }
      }
    }
    else {
      let sTableInfoList = await this.oMetaSvc.getTableInfo(this.oWpData.dsId).toPromise();
      for (let sIdx of sTableInfoList) {
        sTmpFvalue.push(sIdx['TBL_NM']);
      }
    }
    this.setFormValue('tablename', [{ key: 'fvalue', value: sTmpFvalue }]);
    this.oComViewerSvc.showProgress(false);
  }
  // 공통
  private async onDbChanged(pEvent: any) {
    this.oComViewerSvc.showProgress(true);
    try {
      let sSeletecIdx: number = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
      let sSelectedDb = this.oDsInfoList[sSeletecIdx];
      Object.assign(this.oWpData, sSelectedDb);
      await this.setTbNmList();
    } catch (pErr) {
      Object.assign(this.oWpData, {
        dbtype: '', dbhost: '', dsname: '',  dbname: '', dbport: '', owner:'', dsId: 0
      });
      pEvent.component._clearValue();
      this.setFormValue('tablename', [{ key: 'fvalue', value: [] }]);
      this.oComViewerSvc.showProgress(false);
      throw pErr;
    }
  }
  onTableChange(pChangeTableEvent: dxSelectChangeEvent) {
    // try {
    let s_method = this.oDbOpt == 'hive' ? 'I-HIVE' : 'I-DATABASE';
    let sParam = {
      action: 'input',
      method: s_method,
      groupId: 'Temp',
      jobId: '0',
      location: 'workflow',
      data : {
        dsId: this.oWpData.dsId, // node_param py-api.ts
        dbtype: this.oWpData.dbtype,
        dbhost: this.oWpData.dbhost,
        dbport: this.oWpData.dbport,
        dbname: this.oWpData.dbname,
        owner: this.oWpData.owner,
        tablename: this.oWpData.tablename,
        query: this.oWpData.query,
        type: this.oWpData.selectOpt
      },
    };
    // if (sParam.data.query) {
    //   sParam.data.type = 'query';
    // } 
    
    this.oComViewerSvc.showProgress(true);
    this.oComViewerSvc.getDataSchema(sParam).subscribe((response: any) => {
      console.log('============');
      let sSelectData = JSON.parse(response);
      if (sSelectData.hasOwnProperty('responsecode')) {
        if (sSelectData['responsecode'] == 200) {
          this.oComViewerSvc.onInitData();
          this.oComViewerSvc.selectData(sSelectData);
          this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() });
        }
        else {
          this.oWpData.tablename = '';
          if (pChangeTableEvent) {
            pChangeTableEvent.component._clearValue();
          }
          this.oComViewerSvc.showMsg(sSelectData['message'], false);
        }
      }
      this.oComViewerSvc.showProgress(false);
    }, (error) => {
      console.log(error)
      this.oWpData.tablename = '';
      if (pChangeTableEvent) {
        pChangeTableEvent.component._clearValue();
      }
      this.oDiagramPreviewSvc.initDiagramPreview('all');
      this.oComViewerSvc.onInitData();
      this.oComViewerSvc.showProgress(false);
      this.oComViewerSvc.showMsg(error.message, false);
    });
  }
  public getItemIndexByElem(pElem: any) {
    // pElem : pEvent.event.currentTarget
    return Array.from(pElem.parentNode.children).indexOf(pElem);
  }
  // pValueList : 변경할 form value 리스트 [{key:'visible', value:true}, {key: 'edit', value: false}] 
  public setFormValue(pFormName: string, pValueList: { key: string, value: any }[]) {
    this.oFormData.forEach((sForm: any) => {
      if (sForm.name == pFormName) {
        pValueList.forEach(pValue => {
          sForm[pValue.key] = pValue.value;
        });
      }
    })
  }
}
