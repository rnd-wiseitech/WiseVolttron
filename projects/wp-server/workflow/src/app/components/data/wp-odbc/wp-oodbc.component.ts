import { dxSelectChangeEvent, WpComData, WpPropertiesWrap, WpToggleEvent } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { WpComponentViewerService } from "../../wp-component-viewer.service";
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpComponent } from "../../wp-component";
import { HiveQueryService } from "projects/data-manager/src/app/hive-query/hive-query.service";
import { WorkflowAppService } from "../../../app.service";
// @ts-ignore
import * as dataFormatJson from "../../../../../../../assets/resource/json/date_format.json";
import { COM_OODBC_ATT } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpOOdbcData } from "projects/wp-server/util/component/data/wp-odbc";
import { TranslateService } from "@ngx-translate/core";
import { DS_CONNECT_TYPE,DB_SUPPORT_TYPE,getEnumKeys,getEnumValues } from 'projects/wp-lib/src/lib/wise-type/wise.connect';
import { MatDialog } from '@angular/material/dialog';
import {WpOodbcUpdatePopupComponent} from '../../popup/wp-oodbc-update-popup.component'
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpComponentService } from '../../wp-component.service';
// export interface WkOOdbcData extends WkCommonData {
//   [index: string]: any
//   dbOpt: 'DBMS' | 'HIVE' | '';
//   dbname: string;
//   tablename: string;
//   selectDb: {
//     DBMS_TYPE: 'db' | 'hive' | '',
//     DB_NM: string,
//     DS_ID: string,
//     IP: string,
//     PORT: string
//   };
//   saveOpt: 'new' | 'append' | 'overwrite' | '';
//   partition: string;
//   tableList?: string[];
//   partitionOpt: string;
//   partitionValue: string;
// }
export class WpOOdbcComponent extends WpComponent {
  oWpData: COM_OODBC_ATT; //type override
  oDataFormatJSON = dataFormatJson['default'];
  oFormData: WpPropertiesWrap[];
  public oComViewerSvc: WpComponentViewerService;
  public oDiagramPreviewSvc: WpDiagramPreviewService;
  public oMetaSvc: WpMetaService;
  oDbInfoList: any[] = []; // RDBMS DB List
  oHiveDbInfoList: any = []; // 하이브 DB List
  oDsInfoList: any[] = []; // 선택한 DB의 List
  oHiveSvc: HiveQueryService;
  oWpAppSvc: WorkflowAppService;
  o_apiType = 'SPARK';
  cTransSvc: TranslateService;
  oDialog: MatDialog;
  oWpSocketSvc: WpSocket;
  oWpDiagramSvc: WpDiagramService;
  oWpComSvc: WpComponentService;
  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pWpData: WpOOdbcData,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pMetaSvc: WpMetaService,
    pHiveSvc: HiveQueryService,
    pWpAppSvc: WorkflowAppService,
    pWpComSvc: WpComponentService,
    pWpSocketSvc: WpSocket,
    pWpDiagramSvc: WpDiagramService,
    pDiaglog: MatDialog
  ) {
    super(pComViewerSvc, pWpData);
    this.cTransSvc = pTransSvc;
    this.oFormData = [
      {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info65"),
        name: 'dbOpt',
        value: '',
        type: 'button_toggle',
        fvalue: ['DBMS', 'HIVE'],
        visible: false,
        edit: true,
        callbak: this.ondbOptChanged.bind(this)
      },
      {
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info66"),
        name: 'mode',
        value: '',
        type: 'button_toggle',
        fvalue: ['new', 'append', 'overwrite'],
        visible: true,
        edit: true,
        callbak: this.onSaveOptionChange.bind(this)
      }, {
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
        // 파티션 컬럼 추가
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info67"),
        name: 'partition',
        value: '',
        type: 'select',
        fvalue: '',
        visible: false,
        edit: true,
        callbak: this.onPartitionChanged.bind(this)
      }, {
        // 파티션 옵션 추가
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info92"),
        name: 'partitionOpt',
        value: '',
        type: 'button_toggle',
        fvalue: [
          pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info40"),
          pTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button7")],
        visible: false,
        edit: true,
        callbak: this.onPartitionOptionChanged.bind(this)
      }, {
        // 파티션 옵션 추가
        vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info93"),
        name: 'partitionValue',
        value: '',
        type: 'text',
        fvalue: '',
        visible: false,
        edit: true,
        callbak: this.onPartitionValueChanged.bind(this)
      },
      // 고용노동부 주석(임시주석) 개발완료 시 패치
      {
        vname: "쿼리 실행 설정",
        name: 'query',
        value: '',
        type: 'button',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onBtnClick.bind(this)
      }
    ];
    this.oComViewerSvc = pComViewerSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oMetaSvc = pMetaSvc;
    this.oHiveSvc = pHiveSvc;
    this.oWpAppSvc = pWpAppSvc;
    this.oDialog = pDiaglog;
    this.oWpSocketSvc = pWpSocketSvc;
    this.oWpComSvc = pWpComSvc;
    this.oWpDiagramSvc = pWpDiagramSvc;
    // hive와 dbms의 테이블 정보를 받아온 후 form value 설정하기 위해 비동기처리
    let sOriginWpData: any = Object.assign({}, pWpData['o_data']);
    this.o_apiType = this.oComViewerSvc.o_apiType;
    if(this.o_apiType == 'COMMON' || !this.oComViewerSvc.o_hiveCheck) {
      this.oFormData[0].visible=false;
    }

    (async () => {
      this.oComViewerSvc.showProgress(true);
      // get HIVE LIST
      // WPLAT-361 6번
      if(this.o_apiType != 'COMMON' && this.oComViewerSvc.o_hiveCheck) { // 하이브 사용 여부추가
        let sDbInfoList = await this.oHiveSvc.getHiveDbInfo().toPromise()
        this.setHiveDbInfoList(sDbInfoList);
      }
      // let sDbInfoList = await this.oHiveSvc.getHiveDbInfo().toPromise()
      // this.setHiveDbInfoList(sDbInfoList);
      // get DBMS LIST
      let sDsData = await this.oMetaSvc.getDsInfo().toPromise()
      let sDbList = sDsData.filter((sDs: any) => sDs.TYPE === 'db' && getEnumValues(DB_SUPPORT_TYPE).includes(sDs.DBMS_TYPE));
      this.setDbInfoList(sDbList);
      // db명 목록 설정
      this.setDbNmList();
      
      this.setFormTableName(this.oWpData.mode);
      // 1) 초기 db 유형 설정
      this.ondbOptChanged({ name: 'dbOpt', value: this.oWpData.dbOpt });
      // 2) DB 명 설정
      if (sOriginWpData.dsname != '') {
        this.oWpData.dsname = sOriginWpData.dsname;
        this.onDbChanged(undefined);
      }
      // 3) 테이블명 설정
      this.oWpData.excuteFlag = false; //update select 정상 체크 flag
      if (sOriginWpData.tablename != '') {
        this.oWpData.tablename = sOriginWpData.tablename;
        // 테이블 생성 옵션이 new 일때에는 form만 채움.
        if (sOriginWpData.mode != 'new') {
          this.onTableChange(undefined);
        }
      }
      this.oComViewerSvc.showProgress(false);
    })()
  }

  setComViewId(pId: string) {
    // (usetable_info) usetable:groupid_jobid, schema:컬럼정보(쿼리 반영할 데이터가 있는 테이블)
    if (this.oWpData.usetable_info.usetable !== pId) {
      this.oWpData.usetable_info.usetable = pId;
      this.oWpData.popup_data.usetable = pId;
    }
  }

  // # DI 오류수정
  chkSocketConnection(){
    if (!this.oWpSocketSvc.oSocketStatus) {
        console.log("Socket Reconnected");
        this.oWpSocketSvc.onConnection();
    }
  }

  initPopupData() {
    // 코드입력 값 초기화
    this.oWpData.query = '';
    // popupdata 초기화
    let sTmpCom = this.oWpDiagramSvc.getWpNodes().find(sCom => sCom.id == this.oComId);
    this.oWpData.popup_data = {
      schema: this.oSchema.schema,
      outputschema: [],
      code: '',
      usetable: '',
      result: {},
      jobId: sTmpCom.jobId
    };
    // this.oWpData.excuteFlag = false;
    // oPopupData와 this.oWpData.popup_data 똑같은 변수 두개를 사용하지 않고 this.oWpData.popup_data 으로 체크함.
    // this.oPopupData = this.oWpData.popup_data;
    // 하단 컬럼 속성 표시 수정
    let tmpSchema = { ...this.oSchema };
    this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
    // this.setBtnText('전처리 코드 설정');
  }

  // 쿼리 실행 설정 버튼 클릭
  onBtnClick(pEvent: PointerEvent) {
    try {
      // 아웃풋 내기전까지 컴포넌트 실행  - 출력 테이블 선택하지않으면 선택하라고(TableInfo 가 Null이아니면?)
      // if (this.oWpData.excuteFlag) {
      //   // 현재 컴포넌트 이전에 연결되어있는 컴포넌트까지 실행(출력X)
      //   this.chkSocketConnection();
      //   this.oComViewerSvc.showProgress(true);
      //   this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
      //   // 컴포넌트 삭제시 unSubscribe 할 수 있게 addSubscription
      //   let sSubsIdx = this.oWpComSvc.getSubsIdx(this.oComId);
      //   if (sSubsIdx == -1) {
      //     this.oWpComSvc.addSubscription(this.oComId, [
      //       this.oWpDiagramSvc.sendJobCallResultEmit.subscribe((pData: any) => {
      //         console.log("------send Result-------");
      //         if (this.oComViewerSvc.oCurrentComId == this.oComId) {
      //           if (pData) {
      //             if (pData.mode == 'excuteBefore') {
      //               setTimeout(() => {
      //                 this.oWpDiagramSvc.chkFinishExcute(pData.result.ID).then(async (pResult: any) => {
      //                   let pMsg = '';
      //                   if (pResult['sucsess']) {
      //                     // viewtable 안해도 이전 데이터 가져옴? 스키마만 가져오고 데이터는 안들고오고 스파크 viewtable형태로 가지고있음
      //                     // this.o_usetable.usetable = pResult['pViewId'];
      //                     // let s_schema: any = await this.oWpDiagramSvc.viewTable(pResult['pViewId']);
      //                     // this.o_usetable.schema = s_schema['schema'];
      //                     // this.o_usetable.data = s_schema['data'];
      //                     pMsg = '데이터 조회 완료';
      //                     this.setComViewId(pResult['pViewId']);
      //                   } else {
      //                     // 에러 발생시 조회 옵션 해제
      //                     this.oComViewerSvc.showMsg('데이터 조회 에러가 발생하였습니다.', false)
      //                     // this.oWpData.excuteFlag = false
      //                     // pMsg = '파이썬 코드 조회 에러가 발생하였습니다. 입력 데이터의 컬럼 정보를 사용합니다.'
      //                     // this.excuteSelectData();
      //                   }
      //                   this.oComViewerSvc.showMsg(pMsg, false);
      //                   this.oComViewerSvc.showProgress(false);
      //                   // #203 파생열 조건부/ 파생열 실행 에러처리
      //                 }).catch(pError => {
      //                   this.oComViewerSvc.showMsg(pError.message, false);
      //                   this.oComViewerSvc.showProgress(false);
      //                 })
      //               }, 1000);
      //             }
      //             // 데이터 선택만 하는 경우
      //             if (pData.mode == 'selectData') {
      //               this.setComViewId(`${pData.result.ID}_0`);
      //               this.oComViewerSvc.showProgress(false);
      //             }
      //           }
      //           else {
      //             // 기존에 동일한 Job을 실행한 경우
      //             this.oComViewerSvc.showProgress(false);
      //           }
      //         }
      //       }, (error:any) => {
      //         console.log(error);
      //         this.initPopupData();
      //         // this.excuteSelectData();
      //         // 에러 발생시 조회 옵션 해제
      //         this.oComViewerSvc.showMsg('쿼리 데이터 조회 에러가 발생하였습니다.', false)
      //         this.oComViewerSvc.showProgress(false);
      //       })
      //     ])
      //   }
      // }
    } catch (error) {
      console.error(error);
      this.oComViewerSvc.showMsg('쿼리 데이터 조회 에러가 발생하였습니다.', false)
      this.oComViewerSvc.showProgress(false);
    } finally {
      if(!this.oWpData.excuteFlag) {
        this.oComViewerSvc.showMsg(`해당 쿼리를 반영할 테이블을 선택해주세요.`, false);
      }
      else {
        let sData: any = this.oWpData.popup_data;
        const dialogRef = this.oDialog.open(WpOodbcUpdatePopupComponent, {
          width: '1400px',
          data: sData,
          id: 'wp-oodbc-update-popup'
        });
        dialogRef.afterClosed().subscribe(pRes => {
          console.log("팝업창 닫음 결과");
          if (pRes.code && pRes.saveFlag) {
            // 팝업에서 입력한 쿼리값을 저장버튼으로 저장한경우
            // base 64 인코딩해서 값 전달
            let sQuery = pRes.code.replaceAll(';', '');
            this.oWpData.query = btoa(encodeURIComponent(sQuery));
  
            this.oComViewerSvc.showMsg(`입력한 쿼리가 성공적으로 저장되었습니다.`, false);
            // this.oComViewerSvc.showProgress(true);
          }
          // 쿼리가 정상 저장 안됬을경우
          else {
            this.oComViewerSvc.showMsg("입력한 쿼리가 저장되지 않았습니다.\n다시 저장해 주세요.", false);
          }
        });
      }
    }
  }
  ondbOptChanged(pEvent: any) {
    this.oWpData.dbOpt = pEvent.value;
    //초기값 수정
    this.oWpData.dsname = '';
    this.oWpData.tablename = '';

    if (pEvent.value == 'HIVE') {
      this.oDsInfoList = this.oHiveDbInfoList;
      // 일반 사용자는 자신의 HIVE DB만 보유하고 있기 때문에 아래와 같이 적용
      if (this.oDsInfoList.length === 1) {
        this.oWpData.dsname = this.oDsInfoList[0].NAME;
        this.onDbChanged(undefined)
        this.setFormValue('dsname', [{ key: 'visible', value: false }]);
      } else {
        this.setFormValue('dsname', [{ key: 'visible', value: true }]);
      }
      this.setFormValue('partition', [{ key: 'visible', value: true }]);
    }
    if (pEvent.value == 'DBMS'){
      this.oDsInfoList = this.oDbInfoList;
      this.setFormValue('dsname', [{ key: 'visible', value: true }]);
      this.setFormValue('partition', [{ key: 'visible', value: false }]);
    }
    
    this.setHivePartitionOption()
    this.setDbNmList()
    
    this.setFormValue('tablename', [{ key: 'fvalue', value: [] }, { key: 'edit', value: true }]);
    this.setFormValue('dsname', [{ key: 'edit', value: true }]);
    this.setFormValue('button_toggle', [{ key: 'edit', value: true }]);
  }
  onSaveOptionChange(pEvent: WpToggleEvent) {
    let sOption:any = pEvent.value;
    if (sOption != this.oWpData.mode) {
      Object.assign(this.oWpData, { mode: sOption, tablename: '', partition: '(선택안함)' });
      this.setFormTableName(sOption);
      this.setHivePartitionOption()

      // 워크플로우 여러번 재실행시 데이터 셋명 표시
      if (sOption == 'append' || sOption == 'overwrite' || sOption == 'query') {
        if (this.oWpData.dbOpt == 'DBMS' && this.oWpData.dsId!=0) {
          this.oMetaSvc.getTableInfo(this.oWpData.dsId).pipe(
          ).subscribe(pTblData => {
            this.oComViewerSvc.showProgress(false);
            let sTmpFvalue: any = [];
            for (let sIdx of pTblData) {
              sTmpFvalue.push(sIdx['TBL_NM']);
            }
            this.setFormValue('tablename', [{ key: 'fvalue', value: sTmpFvalue }]);
          }, error => {
            this.oComViewerSvc.showProgress(false);
            this.oWpData.dsname = '';
            this.oWpData.tablename = '';
            this.setFormValue('tablename', [{ key: 'fvalue', value: [] }]);
            throw error;
          });
        }
      }
      if (this.oWpData.dbOpt == 'HIVE') {
        this.setFormValue('partition', [{ key: 'edit', value: true }]);
      }
    }
  }
  setFormTableName(sOption: string) {
    if (sOption == 'new') { // 신규 파일명 입력
      this.setFormValue('tablename', [{ key: 'type', value: 'text' }, { key: 'callbak', value: null }]);
      this.setFormValue('query', [{ key: 'visible', value: false }]);
    }
    else if (sOption == 'query') { //DB 업데이트 시 폼 형식
      this.setFormValue('tablename', [{ key: 'type', value: 'select' }, { key: 'callbak', value: this.onTableChange.bind(this) }]);
      this.setFormValue('query', [{ key: 'visible', value: true }]);
    }
    else {
      this.setFormValue('tablename', [{ key: 'type', value: 'select' }, { key: 'callbak', value: this.onTableChange.bind(this) }]);
      this.setFormValue('query', [{ key: 'visible', value: false }]);
    }
  }
  public getFormData() {
    return this.oFormData;
  }
  // DBMS
  public setDbInfoList(pDbList: any) {
    let sDsInfoList: Partial<COM_OODBC_ATT>[] = [];
    pDbList.forEach((sConnInfo: any) => {
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
    this.oDbInfoList = sDsInfoList;
  }
  // HIVE
  setHiveDbInfoList(pDbList: any) {
    let sDsInfoList: Partial<COM_OODBC_ATT>[] = [];
    pDbList.forEach((sConnInfo: any) => {
      sDsInfoList.push({
        dsId: sConnInfo.DB_ID,
        dbtype: 'hive',
        dsname: sConnInfo.NAME,
        dbname: sConnInfo.NAME,
        dbhost: '',
        dbport: 0,
        dbuser: '',
        owner: '',
        dbpassword: '',
      });
    });
    //WPLAT-337 일반사용자 HIVE
    if(sDsInfoList.length == 1) {
      Object.assign(this.oWpData, sDsInfoList[0]);
    }
    this.oHiveDbInfoList = sDsInfoList;
  }
  setDbNmList() {
    let sDbNmList: any = [];
    this.oDsInfoList.forEach((sDbInfo: any) => {
      sDbNmList.push(sDbInfo.dsname);
    });
    this.setFormValue('dsname', [{ key: 'fvalue', value: sDbNmList }]);
  }
  // 공통
  private async onDbChanged(pEvent: any) {
    this.oComViewerSvc.showProgress(true);
    let sTmpFvalue: any = [];
    try {
      let sSeletecIdx: number = pEvent ? this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget) : this.oDsInfoList.findIndex((sDs:any) => sDs.dsId == this.oWpData.dsId);
      let sSelectedDb = this.oDsInfoList[sSeletecIdx];
      Object.assign(this.oWpData, sSelectedDb);

      if (this.oWpData.dbOpt == 'HIVE') {
        let sTableInfoList = await this.oHiveSvc.getHiveTableInfo().toPromise()
        for (let sIdx of sTableInfoList) {
          if (sIdx.DB_ID === this.oDsInfoList[sSeletecIdx].dsId) {
            sTmpFvalue.push(sIdx['TBL_NAME']);
          }
        }
      }
      if (this.oWpData.dbOpt == 'DBMS') {
        let sResult = await this.oMetaSvc.getTableInfo(this.oDsInfoList[sSeletecIdx].dsId).toPromise()
        for (let sIdx of sResult) {
          sTmpFvalue.push(sIdx['TBL_NM']);
        }
      }
      this.setFormValue('tablename', [{ key: 'fvalue', value: sTmpFvalue }]);
    } catch (pErr) {
      Object.assign(this.oWpData, {
        dbtype: '', dbhost: '', dsname: '', dbname: '', dbport: '', tablename:'', dsId: 0
      });
      pEvent ? pEvent.component._clearValue() : undefined;
      this.setFormValue('tablename', [{ key: 'fvalue', value: [] }]);
      throw pErr;
    } finally {
      this.oComViewerSvc.showProgress(false);
    }
  }
  onTableChange(pEvent: dxSelectChangeEvent) {
    if (this.oWpData.mode == 'overwrite') {
      return
    }

    let s_method = this.oWpData.dbOpt == 'HIVE' ? 'I-HIVE' : 'I-DATABASE';

    let sParam: any = {
      action: 'input',
      method: s_method,
      groupId: 'Temp',
      jobId: '0',
      location: 'workflow',
      data : {
        type: 'table',
        dsId: this.oWpData.dsId, // node_param py-api.ts
        dbtype: this.oWpData.dbtype,
        dbhost: this.oWpData.dbhost,
        dbport: this.oWpData.dbport,
        dbname: this.oWpData.dbname,
        owner : this.oWpData.owner,
        tablename: this.oWpData.tablename,
      }
    };
    this.oComViewerSvc.showProgress(true);
    this.oComViewerSvc.getDataSchema(sParam).subscribe(async (response: any) => {
      console.log('============');
      let sSelectData = JSON.parse(response);
      if (sSelectData.hasOwnProperty('responsecode')) {
        if (sSelectData['responsecode'] == 200) {
          if (this.oWpData.mode === 'append') {
            // append일 경우 입력 데이터의 컬럼명과 기존 테이블 컬럼명이 일치하는지 체크
            // O-DATABASE 컴포넌트 컬럼명 리스트
            let sComColNmList = this.oWpAppSvc.getComData(this.oComId).schema.map((sCol: any) => sCol.name);
            sComColNmList.sort();
            // 실제 테이블 컬럼명 리스트
            let sDbColNmList = sSelectData.schema.map((sCol: any) => sCol.name);
            sDbColNmList.sort();
            if (JSON.stringify(sComColNmList) != JSON.stringify(sDbColNmList)) {
              this.oComViewerSvc.showMsg(`출력 데이터의 컬럼명이 append 대상 테이블 컬럼명과 일치하지 않습니다.
              다른 테이블을 선택하거나 신규 테이블을 생성해주세요`, false);
              this.oWpData.tablename = '';
              pEvent ? pEvent.component._clearValue() : undefined
            } else {
              // hive는 partition column 조회
              if (this.oWpData.dbOpt == 'HIVE') {
                let sParam = {
                  action: 'hive',
                  method: 'QUERY',
                  groupId: 'Temp',
                  jobId: '0',
                  location: 'workflow',
                  data: {
                    dataArray: [
                      { query: `DESCRIBE ${this.oWpData.dsname}.${this.oWpData.tablename}` }
                    ]
                  }
                };
                let sTableInfo = await this.oHiveSvc.getHiveQueryExecute(sParam).toPromise();
                let sColumnInfo = JSON.parse(sTableInfo)['data'][0]['result'].map((sRes: any) => JSON.parse(sRes));
                let sPartitionIndex: number = sColumnInfo.findIndex((sCol: { col_name: string, data_type: string }) => sCol.col_name == "# Partition Information");
                if (sPartitionIndex == -1) {
                  // 파티션 하지 않는 경우
                  this.oWpData.partition = '(선택안함)';
                } else {
                  // 파티션 하는 경우
                  // { col_name: '# Partition Information', data_type: '', comment: '' }
                  // { col_name: '# col_name', data_type: 'data_type', comment: 'comment' }
                  // { col_name: '파티션 컬럼명', data_type: '파티션 컬럼 타입' }
                  let sPartitionInfo = sColumnInfo.splice(sPartitionIndex);
                  let sPartitionCol = '';
                  if (sPartitionInfo[1].col_name == '# col_name') {
                    sPartitionCol = sPartitionInfo[2].col_name;
                  }
                  this.oWpData.partition = sPartitionCol;
                }
                this.setHivePartitionOption()
                // this.setFormValue('partition', [{ key: 'edit', value: false }]);
              }

            }
          }
          else if (this.oWpData.mode === 'query') {
            this.oWpData.popup_data.outputschema = sSelectData.schema;
            // OutPut 테이블 Select 정상적으로 된경우 executeFlag 사용
            this.oWpData.excuteFlag = true;
          }
        }
        else {
          this.oComViewerSvc.showProgress(false);
          this.oWpData.tablename = '';
          pEvent ? pEvent.component._clearValue() : pEvent;
          this.oComViewerSvc.showMsg(sSelectData['exception'], false);
        }
        this.oComViewerSvc.showProgress(false);
      }
    }, (error) => {
      console.log(error)
      this.oWpData.tablename = '';
      this.setHivePartitionOption('init')
      pEvent ? pEvent.component._clearValue() : undefined;
      this.oComViewerSvc.showProgress(false);
    })
  }
  onPartitionChanged(pEvent: dxSelectChangeEvent) {
    this.setHivePartitionOption()
  }
  onPartitionOptionChanged(pEvent: WpToggleEvent) {
    let sOption = pEvent.value;
    if (sOption !== this.oWpData[pEvent.name]) {
      this.oWpData[pEvent.name] = sOption;
      this.setHivePartitionOption()
    }
  }
  setHivePartitionOption(pOption?: 'init') {
    if (this.oWpData.dbOpt == 'DBMS' || pOption == 'init') {
      this.oWpData.partitionOpt == '값 입력'
      this.oWpData.partitionValue == ''
      this.setFormValue('partitionOpt', [{ key: 'visible', value: false }, { key: 'edit', value: true }]);
      this.setFormValue('partitionValue', [{ key: 'visible', value: false }]);
    } else {
      if (this.oWpData.partition != '(선택안함)' && this.oWpData.partition != '') {
        this.setFormValue('partitionOpt', [{ key: 'visible', value: true }]);
        if (this.oWpData.partitionOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button7")) {
          this.setFormValue('partitionValue', [{ key: 'type', value: 'select' }, { key: 'visible', value: true }, { key: 'fvalue', value: Object.keys(this.oDataFormatJSON.BASIC_FORMAT) }]);
        } else {
          this.setFormValue('partitionValue', [{ key: 'type', value: 'text' }, { key: 'visible', value: true }, { key: 'fvalue', value: '' }]);
          setTimeout(() => {
            let sElem = document.getElementById('partitionValue')
            sElem.setAttribute('placeholder', this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info94"));
          }, 50);
        }
      } else {
        this.setFormValue('partitionOpt', [{ key: 'visible', value: false }]);
        this.setFormValue('partitionValue', [{ key: 'visible', value: false }]);
      }
      if (this.oWpData.mode == 'append') {
        this.setFormValue('partition', [{ key: 'edit', value: false }]);
      } else {
        this.setFormValue('partition', [{ key: 'edit', value: true }]);
      }
    }
  }
  onPartitionValueChanged(pEvent: dxSelectChangeEvent) {

  }
  public setSchema(pSchema: WpComData) {
    this.oSchema = pSchema;
    let sTmpSchema: string[] = [];
    sTmpSchema.push('(선택안함)')
    for (let sCom of this.oSchema.schema) {
      sTmpSchema.push(sCom.name);
    }
    this.oFormData.forEach(sForm => {
      if (sForm.name == 'partition') {
        sForm.fvalue = sTmpSchema;
      }
    })
    this.oComViewerSvc.selectData(pSchema);
    // query tab 누를 떄 사용 popup_data 있을때
    if (Object.keys(this.oWpData.popup_data).length !== 0) {
      // 실제 실행 결과 있는 경우엔 컬럼 schema 변경 (코드 정보나 과거 viewid 정보만 들고 있는 경우도 있음.)
      let tmpSchema = { ...this.oSchema };
      if (this.oWpData.popup_data.result && this.oWpData.popup_data.result.schema && this.oWpData.popup_data.result.schema.length > 0) {
        tmpSchema.schema = this.oWpData.popup_data.result.schema;
      }
      // query tab diagram  현재 꺼로 보여줄 필요없이 주석처리
      // this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': tmpSchema, 'sCurrDataFlag': true });
    } else {
      // 기존 팝업 데이터 없으면 초기화
      this.initPopupData();
    }
  }
  onKeyUp(pEvent: any, pName: string) {
    let sOutFileNm = pEvent.srcElement.value; // 입력 값
    // 파일명 유효성 확인
    let sIsValidFloat = this.isValidString(sOutFileNm, 'tableNm');
    if (!sIsValidFloat.isValid) {
      this.oComViewerSvc.showMsg(`유효한 테이블명을 입력하세요`, false);
      // oWpData, input text 수정
      this.oWpData.transform_value = sIsValidFloat.result;
      pEvent.srcElement.value = sIsValidFloat.result;
    }
  }
  // pValueList : 변경할 form value 리스트 [{key:'visible', value:true}, {key: 'edit', value: false}] 
  public setFormValue(pFormName: string, pValueList: { key: string, value: any }[]) {
    this.oFormData.forEach((sForm: any) => {
      if (sForm.name == pFormName) {
        pValueList.forEach(pValue => {
          sForm[pValue.key] = pValue.value;
        })
      }
    })
  }
  public setFileNm() {

  }
}
