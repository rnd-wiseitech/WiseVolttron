import { Component, ElementRef, OnInit, ViewChild, AfterViewInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, SimpleChange, OnDestroy } from '@angular/core';
import ArrayStore from 'devextreme/data/array_store'
import { DxDiagramComponent } from 'devextreme-angular';
import * as $ from 'jquery';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpDiagramService } from './wp-diagram.service';
import { WorkflowAppService } from '../app.service';
import { WpComponentViewerService } from '../components/wp-component-viewer.service';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import dateFormat from "dateformat";
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { WpComponentService } from '../components/wp-component.service';
import { WpResultViewerService } from '../components/resultview/wp-result-viewer.service';
import { WpTrainResultviewComponent } from '../components/resultview/wp-train-result-viewer.component';
// @ts-ignore
import { WpDiagramToolbarService } from '../wp-menu/wp-diagram-toolbar/wp-diagram-toolbar.service';
import { WpLoadComponent } from './wp-load/wp-load.component';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import {
  dxDiagramData, WpComData, WpEdgePro, WpNodePro, dxDiagramConnector, dxDiagramShape, dxDiagramChangeConnectorEvent, WkSaveData
} from '../wp-menu/wp-component-properties/wp-component-properties-wrap';
import dxDiagram, { Item } from 'devextreme/ui/diagram';
import { WpTrainModelService } from '../components/analytic-model/wp-train-model/wp-train-model.service';
import { getPropertiesData } from 'projects/wp-server/util/component/component-util';
import { WpPropertiesService } from '../wp-menu/wp-component-properties/wp-component.properties.servie';
import { WpDiagramPreviewService } from '../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { COM_JOIN_ATT, JOB_DATA_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { HiveQueryService } from 'projects/data-manager/src/app/hive-query/hive-query.service';
import { WF_MSTR_ATT } from 'projects/wp-server/metadb/model/WF_MSTR';
import { DP_MODEL_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_MODEL_MSTR';
import { WF_COM_MSTR_ATT } from 'projects/wp-server/metadb/model/WF_COM_MSTR';
import { MainAppService } from 'projects/main/src/app/app.service';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
import { TranslateService } from '@ngx-translate/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
export interface ICOM { ID: number; TYPE: string; CATEGORY: string; NAME: string; DATA: string; IMG_PATH: string; URL: string; DESC: string; DISPLAY: 'true' | 'false'; CONN_LIMIT: number; };

@Component({
  selector: 'lib-wp-diagram',
  templateUrl: './wp-diagram.component.html',
  styleUrls: ['./wp-diagram.component.css']
})
export class WpDiagramComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @Input() oComTemplateData: any;
  @Output() onChangSwitchEvent = new EventEmitter<boolean>();
  @ViewChild(DxDiagramComponent, { static: false }) hDiagram!: DxDiagramComponent;
  oSwitchEf!: ElementRef;
  oCatetory: ICOM[] = [];
  oDiagramData: ArrayStore & { _array?: WpNodePro[] };
  oDiagramLinkData: ArrayStore & { _array?: WpEdgePro[] };
  oData: Array<ICOM> = new Array();
  oTrainModelComIdList: number[] = [];
  oInputComIdList: number[] = [];
  oLLMComIdList: number[] = [];
  oOldLinkData: { [index: string]: WpEdgePro } = {};
  oTrainModelFlag: boolean = false;
  oDiagramPushFlag: boolean; // ArrayStore push로 직접 데이터 변경한 경우
  oDiagramLoadFlag: boolean; // 워크플로우 불러온 경우
  oExcutedDiagramData = {}; // 실행 버튼 눌러서 실행된 oDiagramData
  oExcutedJobGroupId = ''; // 실행된 job의 groupId
  oJobExcutedInfo: { [index: string]: any } = {}; // ResultViewer를 띄우지 않고 실행된 Job Info (comId가 key)
  oComNameMap: { [index: string]: any } = {}; // 컴포넌트 type으로 name 조회하도록 추가
  oSubs: Subscription[] = [];

  o_offerModel:any = [];
  constructor(public cMetaSvc: WpMetaService,
    public cWpDiagramSvc: WpDiagramService,
    private cAppSvc: WorkflowAppService,
    private cWpComViewerSvc: WpComponentViewerService,
    private cWpPropertiesSvc: WpPropertiesService,
    private cWpDiagramPreviewSvc: WpDiagramPreviewService,
    private cWpLibSvc: WpLoadingService,
    private cDialog: MatDialog,
    private cWpTrainSvc: WpTrainModelService,
    private cWpResultViewerSvc: WpResultViewerService,
    private cWpComSvc: WpComponentService,
    private cWpDiagramToolbarSvc: WpDiagramToolbarService,
    private cWpSocketSvc:WpSocket,
    private cHiveSvc: HiveQueryService,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService,
    private cAppConfig:  WpAppConfig
  ) {
    this.o_offerModel = this.cAppConfig.getConfig('OFFER_MODEL');
    this.oDiagramData = new ArrayStore({
      key: "id",
      data: this.cWpDiagramSvc.getWpNodes()
    });
    this.oDiagramLinkData = new ArrayStore({
      key: "id",
      data: this.cWpDiagramSvc.getWpEdges(),
      onRemoving: function (key: any) {
        // @ts-ignore
        this.chkConnectFilterText(key);
      }.bind(this)
    });
    this.oDiagramPushFlag = this.cWpDiagramSvc.getWpDiagramFlag('push')
    this.oDiagramLoadFlag = this.cWpDiagramSvc.getWpDiagramFlag('load')
  }
  ngOnDestroy(): void {
    this.cWpDiagramSvc.initWpNodes();
    this.cWpDiagramSvc.initWpEdges();
    this.cAppSvc.initWpData();
    this.cWpDiagramToolbarSvc.initTab();
    this.oSubs.forEach(sSubscription => sSubscription.unsubscribe());
  }
  ngOnInit(): void {
    this.oComTemplateData = this.cWpDiagramSvc.getComTemplateData();
    this.oSubs.push(
      // #입력 데이터 변경시 기존 연결의 속성창 초기화
      this.cWpComViewerSvc.onInitDataEmit.subscribe((pId: string) => {
        this.initDiagramData(pId);
      })
    )
    this.oSubs.push(
      // (showValidDiagPreviewEmit) 유효한 Component Data인지 확인한 후 Diagram Preview 표시
      this.cWpDiagramSvc.showValidDiagPreviewEmit.subscribe((pEmitData: WpNodePro) => {
        let pData = pEmitData.pData;
        // pData['text'] = pData['type']
        let sResult = this.isValidComponentData(pData);
        // 부모 컴포넌트 미리보기 표시
        this.cWpComViewerSvc.showDiagramPreview(pData.parentId, false);
        // 자식 컴포넌트가 유효한 컴포넌트 data이면 미리보기 표시
        if (sResult.valid) {
          this.cWpComViewerSvc.showDiagramPreview(pData.id, true);
        }
        else {
          this.cWpDiagramPreviewSvc.initDiagramPreview('curr');
        }
      })
    );
    this.oSubs.push(
      this.cWpDiagramSvc.loadWorkFlowEmit.subscribe(async pEmitData => {
        if (pEmitData.pId) {
          // ID 기준으로 워크플로우 불러오기
          this.cWpDiagramSvc.getWorkflowList({ wfId: pEmitData.pId }).toPromise().then((pResult: WF_MSTR_ATT[]) => {
            this.onLoadWorkflow({ data: pResult[0] });
          }).catch(error => {
            console.log(error);
            this.cWpLibSvc.showProgress(false, 'wkspin');
          });
        }
        if (pEmitData.pType) {
          if (pEmitData.pType == 'changeTab') {
            // type을 string으로 받을 수 있게 수정, 이거 없으면 워크플로우에 탭 변경시 invaild Format 오류 발생
            for(let sShape of pEmitData.sDiagram.shapes) {
              sShape['type'] = String(sShape['type'])
            }
            this.hDiagram.instance.import(JSON.stringify(pEmitData.sDiagram)); // set Diagram to UI
            this.setLoadWpData(pEmitData.sLoadComData);
          }
        }
        else {
          this.onLoadWorkflow((pEmitData.pData as { data: WF_MSTR_ATT }));
        }
      })
    );
    // viewid, viewidx 기준으로 워크플로우 불러오기
    this.oSubs.push(
      this.cWpDiagramSvc.loadWorkFlowByViewIdEmit.subscribe(pEmitData => {
        this.cWpDiagramSvc.getWorkflowList({ viewId: Number(pEmitData.pViewId), viewIdx: Number(pEmitData.pViewIdx) }).toPromise()
          .then(pResult => {
            this.onLoadWorkflow({ data: pResult[0], pPreviewFlag: true });
          }).catch(error => {
            console.log(error);
            this.cWpLibSvc.showProgress(false, 'wkspin');
          });
      })
    );
    this.oSubs.push(
      this.cWpDiagramSvc.excuteCurrentDiagramEmit.subscribe(pMode => {
        this.onExcute(undefined, pMode).catch(error => {
          this.cAppSvc.showMsg(error, false);
          this.cWpLibSvc.showProgress(false, 'wkspin');
        });
      }, error => {
        console.log(error);
        this.cWpLibSvc.showProgress(false, 'wkspin');
      })
    );
    this.oSubs.push(
      this.cWpDiagramSvc.excuteSelectDataEmit.subscribe(() => {
        this.onExcute(undefined, 'selectData').catch(error => {
          this.cAppSvc.showMsg(error, false);
          this.cWpLibSvc.showProgress(false, 'wkspin');
        });
      })
    );
    // 결과창 확인 버튼 눌렀을때 분석 결과 확인 viewer 표시
    this.oSubs.push(
      this.cWpResultViewerSvc.onCloseResultViewerEmit.subscribe(async () => {
        if (this.oTrainModelFlag) {
          let sAnalCompList = this.cWpDiagramSvc.getWpNodes().filter(sNode => this.oTrainModelComIdList.includes(sNode.type));
          if (sAnalCompList.length > 0) {
            let sAnalCompIdList = sAnalCompList.map(sCom => sCom.id);
            // let sAnalCompModelList = sAnalCompList.map(sCom => sCom['wp-data']['modelInfo']);
            this.onShowAnalysisResult(sAnalCompIdList);
          }
        }
      })
    );
    // check diagram link filter text 
    this.oSubs.push(
      this.cWpDiagramSvc.chkConnectFilterTextEmit.subscribe((pId: string) => {
        this.chkConnectFilterText(pId);
      })
    );
    // selectComponentById
    this.oSubs.push(
      this.cWpDiagramSvc.selectComponentByIdEmit.subscribe((pId: string) => {
        this.selectComponentById(pId);
      })
    );
    this.oSubs.push(
      this.cWpDiagramToolbarSvc.onClickBtnEmit.subscribe((pData: { eventName: string, event: PointerEvent, data: { workflowName: string } }) => {
        if (pData.eventName == 'save') {
          this.onSave(pData.event, pData.data.workflowName);
        }
        if (pData.eventName == 'load') {
          this.onDisplayLoadPopup(pData.event);
        }
        if (pData.eventName == 'excute') {
          this.onExcute(pData.event, 'excute');
        }
      })
    );
    this.oSubs.push(
      this.cWpDiagramSvc.clearWpDiagramEmit.subscribe(async () => {
        await this.clearWpDiagram();
      })
    )
    this.oSubs.push(
      this.cWpSocketSvc.getJobLog().subscribe((pMessage: any) => {
        let sJobCom = this.cWpDiagramSvc.getWpNodes().filter((sNode: WpNodePro) => sNode.jobId == pMessage.data.jobId)[0];
        // 모델 필터링 성공하였으면 필터 성공 메시지 팝업.
        if (sJobCom.type === COM_ID['A-FILTER_MODEL']) {
          let sMessage = pMessage.data.success ? this.cTransSvc.instant('WPP_WORKFLOW.COMPONENT.POPUP.popup73') : pMessage.data.msg;
          this.cWpComViewerSvc.showMsg(sMessage, false);
        }
      })
    )


    console.log('object : ', this.hDiagram);
  }
  ngOnChanges(changes: SimpleChanges) {
    console.log("ngOnChanges");
    let chartData: SimpleChange = changes.oComTemplateData;
    this.oComTemplateData = chartData.currentValue;
  }
  /**
 * diagram data 초기화 함수 
 * diagram에 연결되어있는 하위 컴포넌트를 모두 초기화한다. (pId가 없으면)
 * @params {string} [pId] - 특정 Id 의 컴포넌트의 데이터만 초기화한다.
 * 
 * @example
 * ```ts
 * this.cWpComViewerSvc.onInitData()
 * // or
 * this.cWpComViewerSvc.onInitData('component_id')
 * ```
 */
  initDiagramData(pId?: string) {
    let sInitDataFlag = true;
    // pId가 존재하면 해당 pId 컴포넌트 데이터만 초기화
    if (pId) {
      this.oDiagramData.byKey(pId).then((pData: WpNodePro) => {
        let sWpData = getPropertiesData(pData.type);
        pData['wp-data'] = sWpData;
        // 초기화시 컬럼 정보도 초기화
        let sTmpData: WpComData = { type: pData.type, id: pData.id, schema: [], name: '', data: [], parentId: pData.parentId, 'wp-data': sWpData };
        this.cAppSvc.setWpData(sTmpData);
      });
      delete this.oJobExcutedInfo[pId];
      this.cWpComSvc.removeSubscription(pId);
      this.cWpDiagramPreviewSvc.initDiagramPreview('all');
    }
    // pId가 undefined 이면 현재 선택된 컴포넌트에 연결되어 있는 하위 연결들의 데이터 초기화
    else {
      // 현재 데이터의 schema 정보 초기화
      this.cAppSvc.initWpSchema(this.cWpComViewerSvc.oCurrentComId);
      // Array to Object (key: comId, value: WpNodePro)
      let sDiagramObj: { [index: number]: WpNodePro } = Object.assign({},
        this.oDiagramData._array.filter((item) => item.hasOwnProperty('id'))
      );
      let sParentComId = [this.cWpComViewerSvc.oCurrentComId];
      let sChildComId: string[] = [];
      while (sInitDataFlag) {
        sParentComId.forEach(sParentId => {
          for (let key in sDiagramObj) {
            // (sChildComId) sParentId를 parentId로 가지고 있는 컴포넌트(초기화 대상)
            if (sDiagramObj[key].hasOwnProperty('parentId') && sDiagramObj[key].parentId.includes(sParentId))
              sChildComId.push(key);
          }
        });
        sParentComId = [];
        // 초기화 하려고 하는 diagram 
        if (sChildComId.length !== 0) {
          sChildComId.forEach((sChildId: any) => {
            let sComData = sDiagramObj[sChildId];
            this.oDiagramData.byKey(sComData.id).then((pData: WpNodePro) => {
              let sInitWpData = getPropertiesData(pData.type);
              // pData['wp-data']['o_data'] = Object.assign({}, sInitWpData['o_data']);
              pData['wp-data']['o_data'] = JSON.parse(JSON.stringify(sInitWpData['o_data']));
            });
            sParentComId.push(sComData.id); // sParentId 에 sComData.id를 push하여 이후 loop 에서 sComData.id를 parentId로 가지고 있는 컴포넌트 찾음
            delete sDiagramObj[sChildId];
            delete this.oJobExcutedInfo[sComData.id]
            this.cWpComSvc.removeSubscription(sComData.id);
          })
          sChildComId = [];
        }
        else { // 하위 연결이 더이상 없을 때
          sInitDataFlag = false;
        }
      }
      this.cWpDiagramPreviewSvc.initDiagramPreview('curr');
    }
  }
  selectComponentById(pId: string) {
    let sComItem = this.hDiagram.instance.getItemByKey(pId);
    this.hDiagram.instance.setSelectedItems([sComItem]);
    this.onComponentClick({ component: undefined, element: undefined, item: sComItem });
  }
  ngAfterViewInit() {
    console.log("ngAfterViewInit");
    this.cWpDiagramToolbarSvc.setDiagramElem(this.hDiagram);
    let sInterval = setInterval(() => {
      try {
        let tmpComNameMap: { [index: string]: string } = {};
        if (this.oData.length > 0) {
          this.hDiagram.gridSize = 0.25;
          this.hDiagram.pageColor = "white";
          this.hDiagram.zoomLevel = 1;
          this.hDiagram.units = "px";
          this.hDiagram.pageColor = "#F9FDFF";
          this.hDiagram.showGrid = false;
          this.oCatetory = this.oData.filter((com, i, arr) => arr.findIndex(t => t.CATEGORY === com.CATEGORY) === i);
          this.oData.forEach((sData: ICOM) => {
            tmpComNameMap[sData.ID] = sData.NAME;
          })
          this.cWpDiagramSvc.setComNameMap(tmpComNameMap);
          this.oComNameMap = tmpComNameMap;

          $('.dxdi-page').css({ 'display': 'block', 'opacity': 0 });
          for (let sCate of this.oCatetory) {
            console.log(sCate.CATEGORY);
            let sCateEl = $(`#${sCate.CATEGORY} .dxdi-toolbox`);
            let sComCnt = 0;
            for (let sComponent of sCateEl.children()) {
              sComCnt++;
              $(sCateEl).append(`<div class="list-flow-option-div" id="div_${sCate.CATEGORY}_${sComCnt}"></ul>`);
              // let sComponentTemplate = this.oData.filter((com, i, arr) => arr.findIndex(t =>{

              //   t.ID === $(sComponent).attr("data-tb-type")}
              // ))[0]
              let dataTbType = parseInt($(sComponent).attr("data-tb-type"), 10);
              let sComponentTemplate = this.oData.find((item:any) => item.ID === dataTbType);
              
              $(sComponent).removeClass();
              $(sComponent).empty();
              $(sComponent).addClass('option-inner');
              if(!this.o_offerModel.includes(sComponentTemplate.CATEGORY) ) {
                $(sComponent).append(`<a>
                  <img src="${sComponentTemplate.IMG_PATH}" />
                  <span>${this.cTransSvc.instant(`WPP_WORKFLOW.COMPONENT.COM.${sComponentTemplate.NAME}`)}</span>
                  </a>`);
              } else {
                $(sComponent).append(`<a>
                  <img src="${sComponentTemplate.IMG_PATH}" />
                  <span>${sComponentTemplate.NAME}</span>
                  </a>`);
              }

              $(`#div_${sCate.CATEGORY}_${sComCnt}`).append(sComponent);
              // console.log($(sComponent).attr("data-tb-type"));
            }
          }
          // 컴포넌트 리스트 잘리는 것 해결하기 위해 추가함.
          let sElem = <HTMLElement>document.querySelector('lib-diagram-nav').getElementsByClassName('scroll-wrapper scrollbar')[0]
          sElem.style.height = '95%'
          clearInterval(sInterval);
        }
      } catch (error) {
        console.log(error)
        clearInterval(sInterval);
      }
    }, 200);
  }
  async requestLayoutUpdateHandler(pEvent: { allowed: boolean, changes: dxDiagramChangeConnectorEvent[], component: dxDiagram, element: HTMLElement | JQuery, model: any }) {
    if (!this.cWpDiagramSvc.getWpDiagramFlag('load') && !this.cWpDiagramSvc.getWpDiagramFlag('push')) {
      console.log(`========= requestLayoutUpdateHandler ==========`);
      for await (const sChange of pEvent.changes) {
        let sChangeType = sChange.type;
        if (['insert', 'update'].includes(sChangeType) && sChange.data.hasOwnProperty('fromId')) {
          if (sChange.data.toId != null && sChange.data.fromId != null) {
            // connector update case
            if (sChange.type == 'update' && this.oOldLinkData[sChange.data.id]) {
              let sOldShape = this.oOldLinkData[sChange.data.id];
              await this.removeParentId(sChange, sOldShape);
              // #15 링크 연결 변경시 기존 데이터는 초기화
              this.oDiagramData.byKey(sOldShape.toId).then(pData => {
                let sTmpData = getPropertiesData(pData.type);
                pData['wp-data'] = sTmpData;
              });
              // #15 링크 연결 변경시 기존 속성창이 띄워져있다면 닫기
              if (this.cWpComViewerSvc.oCurrentComId == sOldShape.toId)
                this.cWpComViewerSvc.onCloseViewer();
            }
          }
          this.isValidConnection(sChange).then(async (result) => {
            let sFilterFlag = false;
            if (!result.valid) {
              console.log(" NOT VALID CONNECTION!!!!!!!! ");
              this.cAppSvc.showMsg(result.msg, false);
              await this.removeConnection(sChange.data.id); // 유효하지 않은 connector 제거
              // diagram preview 초기화
              this.cWpDiagramPreviewSvc.initDiagramPreview('all');
              this.cWpComViewerSvc.onCloseViewer();
            }
            else {
              // #144 필터 분할 connector 텍스트 설정
              this.oDiagramData.byKey(sChange.data.fromId).then(sFromData => {
                this.setParentId(sChange); // #199 유효한 연결에 대해서만 parentId 설정
                if (sFromData.type == COM_ID['T-SPLIT'] || sFromData.type == COM_ID['T-SLICE']) // 필터분할 또는 슬라이스
                  sFilterFlag = true;
                else {
                  // 기존 필터 분할에 있던 연결이 다른 컴포넌트로 변경되었을 경우에 텍스트 삭제
                  if (sChange.data.text !== '') {
                    this.setConnectText(sChange.data, 'init');
                    sFilterFlag = true;
                  }
                }
                // 기존 필터분할 컴포넌트 연결 텍스트 재설정
                if (sFilterFlag)
                  this.chkConnectFilterText(sChange.data.id, sFromData.type);
              });
            }
          }).then(() => {
            this.saveConnection();
          }); // 최종 Connection 정보를 oOldShape에 저장
        }
      }
    } else {
      console.log('Diagram Load // oDiagramPushFlag');
    }
  }
  async requestEditOperationHandler(pEvent: {
    allowed?: boolean, component?: dxDiagram, element?: HTMLElement | JQuery,
    args?: { connector?: Partial<dxDiagramConnector>, shape?: Partial<dxDiagramShape> },
    operation?: 'deleteConnector' | 'deleteShape' | 'changeConnectorPoints' | 'changeConnection' | 'changeShapeText' | 'addShape',
  }) {
    if (pEvent.operation === "deleteConnector" && pEvent.args.connector.dataItem) {
      let sToId = pEvent.args.connector.dataItem.toId;
      let sFromId = pEvent.args.connector.dataItem.fromId;
      this.oDiagramData.byKey(sToId).then(pData => {
        if (pData.hasOwnProperty('parentId')) {
          // 조인, 병합은 parentId에서 FromId만 제거
          if (pData.type == COM_ID['T-JOIN'] || pData.type == COM_ID['T-MERGE'] || pData.type == COM_ID['A-COMPARE_MODEL'] || pData.type == COM_ID['A-FILTER_MODEL']) {
            let sIdx = pData["parentId"].indexOf(sFromId);
            if (sIdx > -1)
              pData["parentId"].splice(sIdx, 1);
          } else {
            pData["parentId"] = [];
          }
        }
      });
      // #14 링크 삭제시 타겟 컴포넌트의 wp-data 초기화
      this.oDiagramData.byKey(sToId).then(pData => {
        let sTmpData = getPropertiesData(pData.type);
        pData['wp-data'] = sTmpData;
        delete this.oJobExcutedInfo[sToId];
      })
      // #14 링크 삭제시 타겟의 속성창이 띄워져 있을 경우 닫기
      if (this.cWpComViewerSvc.oCurrentComId == sToId) {
        this.cWpComViewerSvc.onCloseViewer();
      }
      // #10 Connection 삭제시 DiagramPreview 초기화
      this.cWpDiagramPreviewSvc.initDiagramPreview('all');
      // Connection 제거시 이후 컴포넌트 초기화
      this.initDiagramData(sToId);
      console.log('=========deleteConnector==========');
      console.log(pEvent);
      this.cWpDiagramSvc.setWpDaigramFlag('all', false);
    }
    else if (pEvent.operation === "deleteShape") {
      console.log('=========deleteShape==========');
      // #14 컴포넌트 삭제시 제거한 컴포넌트를 parentId로 가지고 있던 Component의 parentId 제거
      this.oDiagramData._array.forEach((sData: WpNodePro) => {
        if (sData.hasOwnProperty('parentId')) {
          let sIdx = sData["parentId"].indexOf(pEvent.args.shape.key);
          if (sIdx > -1)
            sData["parentId"].splice(sIdx, 1);
        }
        if (Object.keys(this.oJobExcutedInfo).includes(sData.id)) {
          delete this.oJobExcutedInfo[sData.id];
        }
      })
      // #14 컴포넌트 삭제시 타겟의 속성창이 띄워져 있을 경우 닫기
      if (this.cWpComViewerSvc.oCurrentComId == pEvent.args.shape.key) {
        this.cWpComViewerSvc.onCloseViewer();
        // #10 컴포넌트 삭제시 DiagramPreview 초기화
        this.cWpDiagramPreviewSvc.initDiagramPreview('all');
      }
      this.cWpDiagramSvc.setWpDaigramFlag('all', false);
      this.cWpComSvc.removeSubscription(pEvent.args.shape.key);
    }
    else if (pEvent.operation === "changeConnectorPoints") {
      this.cWpDiagramSvc.setWpDaigramFlag('all', false);
    }
    else if (pEvent.operation === "changeConnection") {

    }
    // 텍스트 변경 반영
    else if (pEvent.operation === "changeShapeText") {
      let sData = pEvent.args.shape.dataItem
      setTimeout(() => {
        this.cWpComViewerSvc.showDiagramPreview(sData.id, true)
      }, 100);
    // 컴퍼넌트를 추가할때 validation
    } else if (pEvent.operation === "addShape") {
      // 워크플로우에 이미 스트리밍데이터 컴퍼넌트가 있으면 드래그 안되도록
      if(Number(pEvent.args.shape.type) === COM_ID['I-STREAMING']) {
        if( this.oDiagramData._array.some(item => item.type === COM_ID['I-STREAMING'])) {
          pEvent.allowed = false;
          this.cAppSvc.showMsg('워크플로우에는 하나의 스트리밍데이터 컴퍼넌트만 가능합니다.', false);
        }
      }
      if(this.oDiagramData._array.some(item => item.type === COM_ID['I-WORKFLOW'])) {
        if(Number(pEvent.args.shape.type) != COM_ID['I-WORKFLOW']) {
          pEvent.allowed = false;
          this.cAppSvc.showMsg('워크플로우 컴퍼넌트는 다른 컴퍼넌트와 같이 사용할 수 없습니다.', false);
        }
      }
      if(Number(pEvent.args.shape.type) == COM_ID['I-WORKFLOW']) {
        if(this.oDiagramData._array.length > 0 && this.oDiagramData._array.every(item => item.type != COM_ID['I-WORKFLOW'])) {
          pEvent.allowed = false;
          this.cAppSvc.showMsg('워크플로우 컴퍼넌트는 다른 컴퍼넌트와 같이 사용할 수 없습니다.', false);
        }
      }
    }
  }
  onContentReady(e: any) {
    console.log("onContentReady");
  }
  async onInitialize(pEvent: any) {
    console.log("onInitialize");
    this.cMetaSvc.getComList().subscribe((e: ICOM[]) => {
      e = e.filter((sCom: ICOM) => sCom.DISPLAY == 'true');
      this.oData = e;
      if (this.oData.length > 0) {
        this.oCatetory = this.oData.filter((com, i, arr) => arr.findIndex(t => t.CATEGORY === com.CATEGORY) === i);
        let sTrainComponentIdList: any[] = [];
        let sInputComponentIdList: any[] = [];
        let sLLMComponentIdList: any[] = [];
        this.oData.forEach(t => {
          if (t.CATEGORY == 'data_input' || t.CATEGORY == 'image_input') {
            sInputComponentIdList.push(t.ID);
          }
          if (t.CATEGORY == 'language_model') {
            sLLMComponentIdList.push(t.ID);
          }
          if (this.o_offerModel.includes(t.CATEGORY)) {
            sTrainComponentIdList.push(t.ID);
          }
        })
        this.oTrainModelComIdList = sTrainComponentIdList;
        this.oInputComIdList = sInputComponentIdList;
        this.oLLMComIdList = sLLMComponentIdList;
        this.cWpDiagramSvc.setTrainModelComIdList(sTrainComponentIdList);
        this.cWpComViewerSvc.setViewerTrainModelComIdList(); // 서순
        // 다른 페이지 갔다가 돌아왔을때 발생하는 에러때문에 추가
        this.cWpDiagramSvc.setComTemplateData(JSON.parse(JSON.stringify(this.oData)));
      }

      for (let sToolbox of this.oCatetory) {
        // console.log("sToolbox : ", sToolbox);
        if (["data_input", "data_change", "data_output", "classification_model", 'regression_model', 'cluster_model', 'language_model', "analytic_model", "image_model", "model_management", "predict_model", "image_change", "image_input", "image_output"].includes(sToolbox.CATEGORY)) {
          if($("#" + sToolbox.CATEGORY)[0] != undefined) {
            pEvent.component._diagramInstance.createToolbox(
              $("#" + sToolbox.CATEGORY)[0],
              true,
              sToolbox.CATEGORY,
              {
                shapeIconSpacing: 8,
                shapeIconCountInRow: 1,
                shapeIconAttributes: { "data-toggle": "shape-toolbox-tooltip", "cate-id": sToolbox.CATEGORY }
              }
            );
          }
        }
      }
    });
  }
  async onComponentClick(pEvent: { component: dxDiagram, element: HTMLElement | JQuery, item: Item & Partial<WpNodePro> }) {
    if (pEvent.item.itemType == 'shape') {
      // #10 입력 데이터 컴포넌트 선택시 diagramPreview 초기화
      if (this.oInputComIdList.includes(pEvent.item.type)) {
        this.cAppSvc.setCurrentDataId(pEvent.item.dataItem.id);
        this.cWpDiagramPreviewSvc.initDiagramPreview('prev');
        if (!this.cAppSvc.getComData(pEvent.item.dataItem.id)) // 초기(선택된 데이터 없을 때)
          this.cWpDiagramPreviewSvc.initDiagramPreview('curr');
      }
      let sValidInput = true;
      let sSelectNode: WpNodePro = await this.oDiagramData.byKey(pEvent.item.dataItem.id);
      if (!sSelectNode.hasOwnProperty('wp-data')) {
        sSelectNode["wp-data"] = getPropertiesData(pEvent.item.dataItem.type);
        pEvent.item.dataItem["wp-data"] = getPropertiesData(pEvent.item.dataItem.type);
      }
      // jobId 저장
      if (!sSelectNode.jobId) {
        sSelectNode.jobId = pEvent.item.id;
      }
      if (!sSelectNode.hasOwnProperty('parentId'))
        sSelectNode["parentId"] = [];
      if (sSelectNode.parentId.length !== 0) {
        for await (const sParentId of sSelectNode.parentId) {
          let sCom = await this.oDiagramData.byKey(sParentId);
          if (sCom.type == COM_ID['T-SPLIT'] || sCom.type == COM_ID['T-SLICE']) {
            let sResult = this.isValidComponentData(sCom);
            // component viewer에 sFilterNum 속성으로 Filter TRUE / FALSE 표시
            let sLinkData: WpEdgePro[] = await this.oDiagramLinkData.load();
            for (let sLink of sLinkData) {
              if (sLink.fromId == sCom.id) {
                // #144 상위 연결 필터 분할, 슬라이스일 경우 connector text 설정
                if (sResult.valid)
                  this.setConnectText(sLink, 'filter');
              }
            }
          }
        }
      }
      let sTmp = sSelectNode;
      // #16 입력 데이터가 없는 컴포넌트를 선택하면 메시지 출력
      while (sTmp.parentId.length !== 0) {
        // 조인 or 병합은 2개의 상위 연결 필요
        let sPoint = await this.cWpDiagramSvc.getFromPoint(sTmp.type).toPromise();
        if (sPoint[0].CONN_LIMIT == 2 && sTmp.parentId.length < 2) {
          // 몇몇 오류 문구는 sTmp.text 라서 undefined 가 나옴, type으로 변경하거나 id 값에 맞는 값 넣어줘야함
          this.cAppSvc.showMsg(`${sTmp.text} 에 입력하는 컴포넌트는 2개 필요합니다.`, false);
          return;
        }
        sTmp = await this.oDiagramData.byKey(sTmp.parentId[0])
        if (!this.cAppSvc.getComData(sTmp.id) || ((sSelectNode.type != COM_ID['A-DEPLOY_MODEL'] && this.cAppSvc.getComData(sTmp.id).schema.length === 0) && ![COM_ID['A-COMPARE_MODEL'], COM_ID['A-PROMPT']].includes(sTmp.type))) {
          this.cAppSvc.showMsg(`상위 컴포넌트(${sTmp.text})를 선택하여 속성을 입력하세요`, false);
          this.cWpDiagramPreviewSvc.initDiagramPreview('all');
          this.cWpComViewerSvc.onCloseViewer();
          return;
        }
      }
      // #16 최상위 컴포넌트가 데이터 입력이 아닐 경우
      if (!this.oInputComIdList.includes(sTmp.type))
        sValidInput = false;
      if (sValidInput) {
        this.cWpPropertiesSvc.showProperties(sSelectNode);
        this.cWpComViewerSvc.onOpenViewer()
        // #10 parentId 존재할 경우 이전 연결 데이터 DiagramPreview 생성
        if (sSelectNode.parentId.length > 0) {
          this.cWpComViewerSvc.showDiagramPreview(sSelectNode.parentId, false);
        }
        // 조인 & 병합은 데이터가 선택되었을 때만 Diagram Preview 표시
        if (sSelectNode.type == COM_ID['T-JOIN'] || sSelectNode.type == COM_ID['T-MERGE']) {
          let sResult = this.isValidComponentData(sSelectNode);
          if (sResult.valid) {
            this.cWpComViewerSvc.showDiagramPreview(sSelectNode.id, true);
          }
          else {
            this.cWpDiagramPreviewSvc.initDiagramPreview('curr');
          }
        }
        // 모델 비교 컴포넌트는 상위 연결이 여러개면 여러 모델의 타입이 동일해야만 가능
        if (sSelectNode.type == COM_ID['A-COMPARE_MODEL']) {
          if (sSelectNode.parentId.length > 1) {
            let sParentModelTypeList: string[] = [];
            for await (const sParentId of sSelectNode.parentId) {
              let sParentModel = await this.oDiagramData.byKey(sParentId);
              let sParentModelType = sParentModel['wp-data']['o_data'].modelType;
              if (!sParentModelTypeList.includes(sParentModelType)) {
                sParentModelTypeList.push(sParentModelType);
              }
            }
            if (sParentModelTypeList.length > 1) {
              this.cAppSvc.showMsg(`
              비교 모델은 모두 동일한 분류 방법이어야 합니다. 모델을 다시 설정해주세요.
              ( 분류 방법 - 회귀, 분류, 군집 )
              `, false);
              this.cWpComViewerSvc.onCloseViewer();
            }
          }
          this.cWpDiagramPreviewSvc.initDiagramPreview('all');
          return;
        } else if (sSelectNode.type == COM_ID['A-FILTER_MODEL']) {
          let sValidFilterFlag = true;
          // 모델 비교 컴포넌트만 1개 연결 가능
          if (sSelectNode.parentId.length == 1) {
            let sParentComData = await this.oDiagramData.byKey(sSelectNode.parentId[0]);
            if (sParentComData.type != COM_ID['A-COMPARE_MODEL']){
              sValidFilterFlag = false;
            } else if (sParentComData['wp-data'].o_data.compare_model.some((model:any) => model.MODEL_SAVE !== true)) {
              this.cAppSvc.showMsg(`모델 필터 컴포넌트에 적용할 모델은 전부 저장되어야 합니다.`, false);
              this.cWpComViewerSvc.onCloseViewer();
            }
          }
          if (sSelectNode.parentId.length > 1) {
            let s_modelTypelist: string[] = [];
            let s_saveFlag = true;
            for await (const sParentId of sSelectNode.parentId) {
              let sParentComData = await this.oDiagramData.byKey(sParentId);
              if (!this.oTrainModelComIdList.includes(sParentComData.type)) {
                sValidFilterFlag = false;
              }
              if(sParentComData['wp-data']['o_data'].modelSave == false) {
                s_saveFlag = false;
              }
              if (!s_modelTypelist.includes(sParentComData['wp-data']['o_data'].modelType)) {
                s_modelTypelist.push(sParentComData['wp-data']['o_data'].modelType);
              }
            }
            if (s_modelTypelist.length > 1) {
              this.cAppSvc.showMsg(`
              비교 모델은 모두 동일한 분류 방법이어야 합니다. 모델을 다시 설정해주세요.
              ( 분류 방법 - 회귀, 분류, 군집 )
              `, false);
              this.cWpComViewerSvc.onCloseViewer();
              this.cWpDiagramPreviewSvc.initDiagramPreview('all');
              return;
            }
            if (s_saveFlag == false) {
              this.cAppSvc.showMsg(`모델 필터 컴포넌트에 적용할 모델은 전부 저장되어야 합니다.`, false);
              this.cWpComViewerSvc.onCloseViewer();
              this.cWpDiagramPreviewSvc.initDiagramPreview('all');
              return;
            }

          }
          if (!sValidFilterFlag) {
            this.cAppSvc.showMsg(`모델 필터 컴포넌트의 상위컴포넌트는 
              모델 비교 컴포넌트 또는 다수의 모델 학습 컴포넌트여야 합니다.`, false);
            this.cWpComViewerSvc.onCloseViewer();
          }
          this.cWpDiagramPreviewSvc.initDiagramPreview('all');
          return;
        } else if (sSelectNode.type == COM_ID['A-DEPLOY_MODEL']) {
          // 모델 학습 또는 비교 컴포넌트만 1개만 연결 가능
          let sValidDeployFlag = true;
          if (sSelectNode.parentId.length == 1 ) {
            let sParentComData = await this.oDiagramData.byKey(sSelectNode.parentId[0]);
            if (!this.oTrainModelComIdList.includes(sParentComData.type) && sParentComData.type != COM_ID['A-FILTER_MODEL']) {
              sValidDeployFlag = false;
            }
          } else {
            sValidDeployFlag = false;
          }
          if (!sValidDeployFlag) {
            this.cAppSvc.showMsg(`모델 배포 컴포넌트의 상위컴포넌트는 
              모델 비교 컴포넌트 또는 모델 학습 컴포넌트여야 합니다.`, false);
            this.cWpComViewerSvc.onCloseViewer();
          }
          this.cWpDiagramPreviewSvc.initDiagramPreview('all');
          return;
        } else {
          this.cWpComViewerSvc.showDiagramPreview(sSelectNode.id, true);
        }
      }
      else {
        this.cAppSvc.showMsg(this.cTransSvc.instant('WPP_WORKFLOW.COMPONENT.POPUP.popup71'), false);
        this.cWpDiagramPreviewSvc.initDiagramPreview('all');
      }
    }
  }
  /**
  * 
  * 컴포넌트 연결 변경시 기존에 연결되어 있던 parentId 삭제
  * diagram에 연결되어있는 하위 컴포넌트를 모두 초기화한다. (pId가 없으면)
  * @params {@link dxDiagramChangeConnectorEvent | dxDiagramChangeConnectorEvent} - 컴포넌트 연결 변경 후 이벤트
  * @params {@link WpEdgePro | WpEdgePro} - 컴포넌트 연결 변경 전 기존 연결 상태
  * 
  * @example
  * ```ts
  * this.removeParentId(sChange, sOldShape)
  * ```
  */
  async removeParentId(pChange: dxDiagramChangeConnectorEvent, pOldShape: WpEdgePro) {
    if (pChange.data.toId == pOldShape.toId && pChange.data.fromId == pOldShape.fromId) {
      console.log('CANNOT FIND OLD SHAPE');
      await this.setParentIdFull();
      return;
    }
    let sCom = await this.oDiagramData.byKey(pOldShape.toId);
    if (sCom && sCom.hasOwnProperty('parentId')) {
      let sIdx = sCom["parentId"].indexOf(pOldShape.fromId);
      sCom["parentId"].splice(sIdx, 1);
    }
  }
  isValidComponentData(pData: WpNodePro): { valid: boolean, msg: string } {
    let pComType = pData.type;
    let sValidConnectionFlag = true;
    let sUiData = pData['wp-data']['o_data'];
    // 조인 or 병합일 때 컴포넌트 속성값이 유효한지 확인
    if (pComType == COM_ID['T-JOIN'] || pComType == COM_ID['T-MERGE']) {
      // 조인
      if (pComType == COM_ID['T-JOIN']) {
        if (sUiData.usetable_name == '' || sUiData.jointable_name == '')
          sValidConnectionFlag = false;
        (sUiData.joinKey as COM_JOIN_ATT['joinKey']).forEach((sJoinKey) => {
          if (sJoinKey.useColumn.length == 0 || sJoinKey.joinColumn.length == 0)
            sValidConnectionFlag = false;
        })
      }
      // 병합
      if (pComType == COM_ID['T-MERGE']){
        if (sUiData.usetable_name == '' || sUiData.mergetable_name == '')
          sValidConnectionFlag = false;
      }
      // (병합/조인) 상위 연결 컴포넌트의 컬럼정보가 유효한지 확인
      let sValidParent = { flag: true, msg: "" }
      pData.parentId.forEach((sParentId: string) => {
        let sParentData = this.cAppSvc.getComData(sParentId)
        if (sParentData) {
          if (sParentData.schema.length == 0)
            sValidParent = { flag: false, msg: `${sParentData.text} 컴포넌트의 속성값을 설정해주세요.` };
        }
        else {
          sValidParent = { flag: false, msg: `${sParentData.text} 컴포넌트의 속성값을 설정해주세요.` };
        }
      })
      if (!sValidParent.flag) {
        return { 'valid': sValidParent.flag, 'msg': sValidParent.msg };
      }
    // #144 필터분할 조건 검증 추가
    } else if (pComType == COM_ID['T-SPLIT'] || pComType == COM_ID['T-SLICE']) {
      pData['wp-data']['o_data'].forEach((sFilter: any) => {
        let sEmptyCol = Object.values(sFilter).filter(sData => sData == "");
        if (sEmptyCol.length > 0)
          sValidConnectionFlag = false;
      })
    } else {
      return undefined;
    }
    if (sValidConnectionFlag)
      return { 'valid': sValidConnectionFlag, 'msg': "" };
    else
      return { 'valid': sValidConnectionFlag, 'msg': `${this.oComNameMap[pComType]} 컴포넌트의 속성값을 설정해주세요.` };
  }
  // #7 Connector 연결 유효성 확인
  async isValidConnection(pChange: dxDiagramChangeConnectorEvent) {
    // #89 연결 대상 컴포넌트가 없는 링크인지 확인을 isValidConnection 함수 안으로 옮김(resolve error 발생 방지)
    // #15 링크 연결 변경시 target이 없는 경우
    // #21 조인 삭제시 오류(연결 target을 제거한 후 target이 없는 link는 제거함)
    // #17 연결되어있는 다이어그램에서 중간 컴포넌트 삭제시 오류 수정 (중간 컴포넌트 제거시 기존 연결 삭제)
    let sFromCount = 0, sToCount = 0;
    let sParentId = pChange.data.fromId;
    let sChildId = pChange.data.toId;
    if (sChildId == null || sParentId == null) {
      return { 'valid': false, 'msg': this.cTransSvc.instant('WPP_WORKFLOW.COMPONENT.POPUP.popup72') };
    }
    let sFromKey = this.hDiagram.instance.getItemByKey(sParentId).id;
    let sToKey = this.hDiagram.instance.getItemByKey(sChildId).id;
    let sData = await this.oDiagramData.byKey(sChildId);
    JSON.parse(this.hDiagram.instance.export()).connectors.forEach((elem: dxDiagramConnector) => {
      if (elem.beginItemKey == sFromKey)
        sFromCount++;
      if (elem.endItemKey == sToKey)
        sToCount++;
    });
    // toId의 연결 가능한 개수
    let sPoint = await this.cWpDiagramSvc.getFromPoint(sData['type']).toPromise();
    let sFromPointCount = sPoint[0].CONN_LIMIT;
    // if (sFromPointCount > 0 && sToCount > sFromPointCount) {
    //   return {
    //     'valid': false, 'msg': `연결이 유효하지 않습니다.
    //         ${sData['text']}의 최대 연결 개수: ${sFromPointCount}`
    //   };
    // }
    // #16 입력 데이터가 없는 컴포넌트 연결시 에러
    let sParentData: WpNodePro = await this.oDiagramData.byKey(sParentId);
    // FromId에서 시작되는 connection 개수(sConnCount) 1인지 확인
    // #27 필터 분할 시 검증 추가 (필터분할의 output이 2개 이상이 되지 않도록 함)
    // 이후 컴포넌트가 모델 컴포넌트이면 여러개 연결 가능
    if (!this.oTrainModelComIdList.includes(sData.type)) {
      if (sParentData.type != COM_ID['T-SPLIT'] && sFromCount != 1)
        return { 'valid': false, 'msg': '상위 컴포넌트의 기존 연결을 제거한 후 연결해주세요' };
      if (sParentData.type == COM_ID['T-SPLIT'] && sFromCount > 2)
        return { 'valid': false, 'msg': '필터 분할의 출력은 2개입니다.' };
    }
    // 모델 비교 컴포넌트 validation
    if (sData.type == COM_ID['A-COMPARE_MODEL']) {
      if (!this.oTrainModelComIdList.includes(sParentData.type)) {
        return { 'valid': false, 'msg': '모델 비교 컴포넌트의 상위 컴포넌트는 모델 컴포넌트여야 합니다.' };
      }
    }
    // 모델 필터 컴포넌트 validation
    if (sData.type == COM_ID['A-FILTER_MODEL']) {
      // 여러개가 연결될 경우 모두 모델 컴포넌트여야 함.
      if (!this.oTrainModelComIdList.includes(sParentData.type) && sParentData.type !== COM_ID['A-COMPARE_MODEL']) {
        return { 'valid': false, 'msg': `모델 필터 컴포넌트의 상위컴포넌트는 모델 비교 컴포넌트 또는 다수의 모델 학습 컴포넌트여야 합니다.` };
      }
    }
    if (sData.type == COM_ID['A-DEPLOY_MODEL']) {
      // 여러개가 연결될 경우 모두 모델 컴포넌트여야 함.
      if (!this.oTrainModelComIdList.includes(sParentData.type) && sParentData.type !== COM_ID['A-FILTER_MODEL']) {
        return { 'valid': false, 'msg': `모델 배포 컴포넌트의 상위컴포넌트는 모델 필터링 컴포넌트 또는 모델 학습 컴포넌트여야 합니다.` };
      }
    }
    if (sData.type == COM_ID['A-PROMPT']) {
      if (!this.oInputComIdList.includes(sParentData.type)) {
        return { 'valid': false, 'msg': '프롬프트 컴포넌트의 상위 컴포넌트는 데이터 입력 컴포넌트여야 합니다.' };
      }
    }
    if (sParentData.type == COM_ID['A-PROMPT']) {
      // 프롬프트 컴포넌트는 언어모델 앞에 위치해야 하나 필수요소는 아님
      if (!this.oLLMComIdList.includes(sData.type)) {
        return { 'valid': false, 'msg': '프롬프트 컴포넌트의 하위 컴포넌트는 언어모델 컴포넌트여야 합니다.' };
      }
    }
    // #177 분석 실행 validation
    let sParentComData = this.cAppSvc.getComData(sParentId);
    console.log(sParentData, this.oInputComIdList)
    if (!sParentComData)
      return { 'valid': false, 'msg': `${sParentData.text} 컴포넌트의 속성값을 설정한 후 연결해주세요.` };
    if (this.oInputComIdList.includes(sParentData.type)) {
      if (!sParentData.hasOwnProperty('parentId') || sParentData["wp-data"].filename == "")
        return { 'valid': false, 'msg': `입력 데이터를 선택하세요` };
    }
    //열선택 아무것도 선택 안할시 오류 문구 추가
    if (sParentData.type == COM_ID['T-SELECT']){
      if (sParentData['wp-data'].o_data.column.length==0){
        return { 'valid': false, 'msg': `${sParentData.text} 컴포넌트의 열을 선택해주세요.` };
      }
    }
    // 상위 연결이 병합 or 조인일 경우 속성창 값이 비어있으면 에러 #144 필터분할 추가
    if (sParentData.type == COM_ID['T-MERGE'] || sParentData.type == COM_ID['T-JOIN'] || sParentData.type == COM_ID['T-SPLIT'] || sParentData.type == COM_ID['T-SLICE']) {
      let sValidResult = this.isValidComponentData(sParentData);
      if (!sValidResult.valid)
        return sValidResult;
    }
    // 컬럼명 변경 컴포넌트 정보 추가.
    if (sParentData.type == COM_ID['T-NAME']) {
      if (sParentData['wp-data']['o_data'].length == 0) {
        return {
          'valid': false, 'msg': `변경된 컬럼명이 없습니다.
        컬럼명 변경(job:${sParentData.jobId}) 컴포넌트 값을 설정해주세요.`
        };
      }
      let sColList = sParentComData.schema.map(sCol => sCol.name);
      let sUniqueCol = sColList.filter((elem: string, index: number) => { // 중복 제거한 컬럼리스트
        return sColList.indexOf(elem) === index;
      })
      // 컬럼명 리스트 길이와 컬럼명 중복을 제거한 리스트의 길이 비교
      if (sColList.length !== sUniqueCol.length) {
        return {
          'valid': false, 'msg': `중복된 컬럼명을 가질 수 없습니다. 
        컬럼명 변경(job:${sParentData.jobId}) 컴포넌트 값을 변경하세요.`
        };
      }
    }
    while (sParentData.parentId.length > 0) {
      sParentData = await this.oDiagramData.byKey(sParentData.parentId[0]);
    }
    // console.log("this.oInputComIdList : ", this.oInputComIdList);
    if (!this.oInputComIdList.includes(sParentData.type)) {
      return {
        'valid': false, 'msg': `${this.cTransSvc.instant('WPP_WORKFLOW.COMPONENT.POPUP.popup71')} \n현재 최상위 컴포넌트: ${this.oComNameMap[sParentData.type]}`
      };
    }
    return { 'valid': true, 'msg': '' };
  }
  // #7 유효하지 않은 connector 제거
  async removeConnection(pId: string) {
    this.oDiagramLinkData.push([{ type: "remove", key: pId }]);
    setTimeout(() => {
      this.chkConnectFilterText(pId, COM_ID['T-SPLIT']);
    }, 100);
  };
  // #7 유효한 연결에 대해서만 parentId 설정
  async setParentId(pChange: dxDiagramChangeConnectorEvent) {
    let sTmp = await this.oDiagramData.byKey(pChange.data.toId);
    if (!sTmp.hasOwnProperty('parentId'))
      sTmp["parentId"] = [];
    if (!sTmp['parentId'].includes(pChange.data.fromId))
      sTmp['parentId'].push(pChange.data.fromId);
  }
  // #7 현재 connection 을 기준으로 모든 component의 parentID를 설정
  async setParentIdFull() {
    this.oDiagramData._array.forEach((element: any) => { element.parentId = [] });
    this.oDiagramLinkData._array.forEach((sConn: any) => {
      let sData = this.cWpDiagramSvc.getNodesById(sConn.toId)
      if (sData && sConn.fromId && !sData['parentId'].includes(sConn.fromId))
        sData['parentId'].push(sConn.fromId);
    })
  }
  // #144 필터 분할 connection text 수정
  chkConnectFilterText(pId: string, pType?: number) {
    if (pType) { // (pFlag) : 필터분할 컴포넌트 찾은 후 connection 재설정
      this.cWpDiagramSvc.getNodesByType(pType).forEach(sCom => {
        this.oDiagramLinkData._array.forEach((sLink: WpEdgePro) => {
          if (sLink.fromId == sCom.id)
            this.setConnectText(sLink, 'filter');
        })
      })
    }
    else { // pId connection에 연결된 필터 분할의 connection text 수정
      this.oDiagramLinkData._array.forEach((sTargetLinkData: WpEdgePro) => {
        if (sTargetLinkData.id == pId) {
          let sFromData = this.oDiagramData._array.filter((sCom: WpNodePro) => sCom.id == sTargetLinkData.fromId)[0];
          // 여러개 삭제할 때 에러 발생 오류 수정
          if (sFromData && sFromData.type == COM_ID['T-SPLIT']) {
            this.oDiagramLinkData._array
              .filter((sLink: WpEdgePro) => sLink.fromId == sTargetLinkData.fromId && sLink.toId !== sTargetLinkData.toId)
              .map((sLink: WpEdgePro) => this.setConnectText(sLink, 'filter'));
          }
        }
      })
    }
  }
  // #144 connection 텍스트 설정 (pOption) type: filter(필터 분할 텍스트), init(텍스트 초기화)
  async setConnectText(pConnData: WpEdgePro, pOption: 'filter' | 'init') {
    let sTmpData: WpEdgePro[] = await this.oDiagramLinkData.load({ filter: ['id', '=', pConnData.id] });
    this.cWpDiagramSvc.setWpDaigramFlag('push', true);
    if (pOption == 'filter') {
      let sFilterTrueData = await this.oDiagramLinkData.load({ filter: ['fromId', '=', pConnData.fromId] });// 첫번째 연결은 조건 참 / 두번째 연결은 조건 거짓
      // #144 필터 분할 조건 텍스트 설정, 필터 분할 속성 설정 없이 이후 컴포넌트 연결시 발생하는 에러 수정
      let sFilterData: WpNodePro = await this.oDiagramData.byKey(pConnData.fromId);
      if (sFilterData['wp-data']['o_data']) {
        let sFilterFlag = sFilterTrueData[0].toId == sTmpData[0].toId;
        // 필터 텍스트
        // WPLAT-361 7번
        try {
          let sFilterText = sFilterData['wp-data']['o_data'].map((sFilterData: any) => Object.values(sFilterData).join(" ")).join(', ');
          sTmpData[0].text = { 0.5: `${sFilterText} ${sFilterFlag ? '참' : '거짓'}` };
        } catch (error) {

        }
      }
    }
    if (pOption == 'init') 
      sTmpData[0].text = {};
    this.oDiagramLinkData.push([{ type: "update", data: sTmpData[0], key: pConnData.id }]);
    // #199 필터 분할 이후 출력 연결 에러발생으로 추가
    await this.setParentIdFull();
  };
  // onExcute
  // (selectData) 현재 component와 연결되어있는 최상위 입력 데이터의 선택 실행 -- 결과 표시 X
  // (excute) 전체 job 실행 -- 결과 표시 O
  // (excuteBefore) ds에서 현재 component와 connector를 제거한 후 실행 (선택한 컴포넌트 이전까지 job 실행) -- 결과 표시 X
  // (excuteNow) 현재 연결된 지점까지 실행 -- 결과 표시 X
  async onExcute(pEvent: PointerEvent, pMode: 'selectData' | 'excute' | 'excuteBefore' | 'excuteNow') {
    let sCom: { [index: string]: JOB_DATA_ATT } = {};
    let r = this.hDiagram.instance.export();
    let ds: dxDiagramData = JSON.parse(r);
    // filter 전처리
    let sFilterResult = this.setFilterProperty(ds);
    let sMode = pMode;
    this.oTrainModelFlag = false; // 분석 컴포넌프 플래그 초기화
    // (분석 컴포넌트가 있는 경우) 분석 컴포넌트 이전 컴포넌트와 분석 컴포넌트 이후 컴포넌트를 연결시켜야 함 (분석 컴포넌트는 spark job에서 제외해야 하기 때문)
    let sAnalysisCompList = this.cWpDiagramSvc.getWpNodes().filter((sNode: WpNodePro) => this.oTrainModelComIdList.includes(sNode.type));
    // #203 prophet으로 보내기 위한 parameter 설정 부분
    if (sAnalysisCompList.length > 0) {
      this.oTrainModelFlag = true;
      // job을 실행할 때 getModelParmasByWpData를 타도록 함(배치에서도 동일하게 사용하기 위해서)
      // sAnalysisCompList.forEach(sAnayCom => {
      //   let tmpParameter = this.cWpAnalyticSvc.getModelParmasByWpData(sAnayCom['wp-data']);
      //   this.oDiagramData.byKey(sAnayCom.id).then(pData => {
      //     pData['wp-data'].parameter = tmpParameter;
      //   })
      // })
    }
    if (sMode == 'excuteBefore' || sMode == 'excuteNow') {
      // (excuteBefore) ds에서 현재 component와 connector를 제거한 후 실행 (선택한 컴포넌트 이전까지 job 실행)
      let sTmpShapes: dxDiagramShape[] = [];
      let sTmpConnector: dxDiagramConnector[] = [];
      let sCurrShape = ds.shapes.filter(sShape => sShape.dataKey == this.cWpComViewerSvc.oCurrentComId)[0]
      let sCurrShapeKey = sCurrShape.key;
      // #158 현재 컴포넌트에 연결되어 있는 컴포넌트만 실행되도록 수정
      let sEndKeys = [sCurrShapeKey];
      while (sEndKeys.length != 0) {
        let sConnectedConns = ds.connectors.filter((sCon) => (sEndKeys.includes(sCon.endItemKey)));
        sEndKeys = []; // sEndKeys를 종료 지점으로 가지고 있는 커넥터를 확인한 후 sEndKeys 초기화
        sConnectedConns.forEach((sConn)=> {
          sEndKeys.push(sConn.beginItemKey); // 커넥터 push 조인, 병합일 경우 상위 연결이 2개여서 array
          sTmpConnector.push(sConn); // 컴포넌트 push
          let sBeginShapes = ds.shapes.filter(sShape => sShape.key == sConn.beginItemKey);
          sBeginShapes.forEach((sBeginShape)=> {
            sTmpShapes.push(sBeginShape);
          })
        })
      }
      // ex) A(입력 컴포넌트)-B-C-D(현재 컴포넌트)-E-F 의 job 이면
      // excuteBefore는 A-B-C를 실행해야함
      // excuteNow는 A-B-C-D를 실행해야함
      // 현재 변수 상태 sTmpConnector(connector), sTmpShapes(shape) 는 A-B-C- 이므로 아래 작업을 수행함.

      if (sMode == 'excuteBefore') {
        // (sTmpConnector) 현재 component에 연결되어 있는 connection을 제외한 connection list가 되도록 삭제함.
        // 이 작업으로 A-B-C 상태로 됨.
        let sRemoveIdx = sTmpConnector.findIndex(sConn => sConn.endItemKey == sCurrShapeKey);
        sTmpConnector.splice(sRemoveIdx, 1);
      }
      if (sMode == 'excuteNow') {
        // 현재 컴포넌트까지 실행하도록 sTmpShapes에 현재 컴포넌트 데이터 추가해서 A-B-C-D 상태가 됨.
        sTmpShapes.unshift(sCurrShape)
      }
      ds.shapes = sTmpShapes;
      ds.connectors = sTmpConnector;
    }
    if (sMode == 'selectData') {
      // (selectData) 현재 component와 연결되어있는 최상위 입력 데이터의 선택 실행
      // 최상위 컴포넌트의 입력 데이터 선택(더이상 현재 ItemKey를 EndItem으로 가지고 있는 connector가 없을 때)
      let sEndKey = ds.shapes.filter(sShape => sShape.dataKey == this.cWpComViewerSvc.oCurrentComId)[0].key;
      let sLoopEndFlag = false;
      while (!sLoopEndFlag) {
        let sEndKeyFlag = false;
        ds.connectors.forEach(sConnector => {
          if (sConnector.endItemKey == sEndKey) {
            sEndKey = sConnector.beginItemKey;
            sEndKeyFlag = true;
          }
        })
        if (!sEndKeyFlag)
          sLoopEndFlag = true;
      }
      let sTmpShapes = ds.shapes.filter(sShape => sShape.dataKey == sEndKey);
      ds.shapes = sTmpShapes;
      ds.connectors = [];
    }
    let sStepJobCount = 0;
    console.log(ds.connectors);
    console.log(ds.shapes);
    for (let l of ds.shapes) {
      if (!(l.key in sCom)) {
        let sWkData: WpNodePro = await this.oDiagramData.byKey(l.dataKey);
        let sComData: WpComData = await this.cAppSvc.getComData(l.dataKey);

        sStepJobCount++;
        sCom[l.key] = {
          id: l.key,
          type: Number(l.type),
          text: l.text,
          data: sWkData['wp-data'],
          filter: sComData.filter,
          parent_id: [],
          step: 1
        };
        // 워크플로우 로드했을 경우
        if(sComData.wf_regUserno != undefined && sComData.wf_regUserno != null) {
          sCom[l.key]['wf_regUserno'] = sComData.wf_regUserno;
        }
      }
    }
    for (let l of ds.connectors) {
      if (l.beginItemKey in sCom) {
        sCom[l.endItemKey]['parent_id'].push(l.beginItemKey);
        if (sCom[l.endItemKey]['parent_id'].length > 1) {
          sStepJobCount--;
        }
      }
    }
    console.log(sStepJobCount);
    console.log(sCom);
    let sComId = this.cWpComViewerSvc.oCurrentComId;
    let sTmpJobExcutedInfo = JSON.stringify(sCom);
    if (sMode == 'excuteBefore' || sMode == 'excuteNow') {
      console.log("this.oJobExcutedInfo : ", this.oJobExcutedInfo);
      // 과거 동일하게 실행한 이력 확인 => 기존 실행된 경우 실행하지 않음
      if (Object.keys(this.oJobExcutedInfo).includes(sComId) && sTmpJobExcutedInfo == this.oJobExcutedInfo[sComId]) {
        this.cWpDiagramSvc.sendJobCallResult(undefined);
        return;
      }
      else
        this.oJobExcutedInfo[sComId] = sTmpJobExcutedInfo;
    }
    console.log("this.oJobExcutedInfo : ", this.oJobExcutedInfo);
    // #7 실행 버튼 눌렀을 때 connection 유효성 확인
    let sValidExcute = await this.isValidExcute(sCom, sMode);
    console.log("sValidExcute : ", sValidExcute);
    if (!sValidExcute.valid) {
      if (sMode == 'excuteBefore' || sMode == 'excuteNow') {
        // #154 유효하지 않은 실행일때 connection 제거, oJobExcutedInfo 제거
        let sRemoveConnect = this.oDiagramLinkData._array.filter(sConnector => sConnector.toId == sComId)[0];
        delete this.oJobExcutedInfo[sComId];
        await this.removeConnection(sRemoveConnect.id);
        await this.requestEditOperationHandler({ operation: "deleteConnector", args: { connector: { dataItem: sRemoveConnect } } });
      }
      if (sMode == 'excute')
        this.oExcutedDiagramData = {};
      this.cAppSvc.showMsg(sValidExcute.msg, false);
      this.cWpLibSvc.showProgress(false, 'wkspin');
      return;
    }
    else {
      // // #27, #28 필터 분할 및 슬라이스 컴포넌트 이후의 컴포넌트에 filter_data 속성 추가
      // let sFilterResult = this.setFilterProperty(ds);
      if (sFilterResult.filter_count > 0)
        sStepJobCount -= sFilterResult.filter_count
      if (sMode == 'excuteBefore' || sMode == 'excuteNow' || sMode == 'selectData') {
        // 출력 없이 job 실행만
        this.excuteWpJob(sCom, sStepJobCount, sMode);
      }
      if (sMode == 'excute') {
        // #121 출력 덮어쓰기 대상 데이터 viewId리스트 생성
        let sInputViewIdList: string[] = [];
        let sNewFileNmList: string[] = [];
        this.cWpDiagramSvc.getNodesByType(COM_ID['O-DATASOURCE']).forEach(sOutputCom => {
          let sSaveOpt = sOutputCom['wp-data']['o_data'].saveOpt;
          if (sSaveOpt == 'overwrite')
            sInputViewIdList.push(sOutputCom['wp-data']['o_data']['filename']);
          // #143 신규 생성 파일 중복 체크
          if (sSaveOpt == 'new')
            sNewFileNmList.push(`${sOutputCom['wp-data']['o_data']['new_filename']}.${sOutputCom['wp-data']['o_data']['filetype']}`);
        })
        // #143 중복 파일 체크
        if (sNewFileNmList.length > 0) {
          let sChkNewOutputResult = await this.chkNewOutputName(sNewFileNmList);
          if (!sChkNewOutputResult.valid) {
            this.cAppSvc.showMsg(sChkNewOutputResult.msg, false);
            return;
          }
        }
        // #121 (덮어쓰기) 기존 데이터를 사용중인 워크플로우가 있는지 조회
        if (sInputViewIdList.length > 0) {
          let sOption = { 'DS_VIEW_ID': sInputViewIdList };
          this.cWpDiagramSvc.getUseDataInfo(sOption).toPromise().then(sWorkFlowId => {
            if (sWorkFlowId.length > 0) {
              let sWKNmList: string[] = [];
              sWorkFlowId.forEach((sWkData: any) => {
                sWKNmList.push(sWkData.WF_NM);
              })
              this.cAppSvc.showMsg(`overwrite 데이터가 다른 워크플로우에서 사용중입니다. 덮어쓰겠습니까?
                        사용중인 워크플로우: ${sWKNmList.join()}`, true);
              $(document.querySelector('#wpPopup').querySelector('a')).off('click').on('click', (event: any) => {
                this.excuteWpJob(sCom, sStepJobCount, sMode); // 파일 중복일때 OK 누르면 Job 실행
                $(this).off(event); // 중복 실행을 막기 위해 추가
              });
            }
            else {
              this.excuteWpJob(sCom, sStepJobCount, sMode);
            }
          })
        }
        else {
          this.excuteWpJob(sCom, sStepJobCount, sMode);
        }
        return;
      }
    }
  }
  // # DI 오류수정
  chkSocketConnection(){
    if (!this.cWpSocketSvc.oSocketStatus) {
        console.log("Socket Reconnected");
        this.cWpSocketSvc.onConnection();
    }
  }
  // Workflow Job 실행
  excuteWpJob(sCom: { [index: string]: JOB_DATA_ATT }, sStepJobCount: number, pMode: string) {
    let sMode = pMode;
    // socket 연결이 끊어져있는 경우 다시 연결 후 실행해야 결과 제대로 표시 됨.
    this.chkSocketConnection();
    let s_param = { 
      wpNm : this.cWpDiagramToolbarSvc.getCurrentTitle(),
      wpData : sCom
    };
      
    this.cWpDiagramSvc.saveJob(s_param).subscribe(p => {
      let sClientId = this.cWpSocketSvc.getSocketId();
      console.log('======== sClientId ==========');
      console.log(sClientId);
      let sInitJob = {
        step_count: sStepJobCount,
        jobList: sCom
      };
      if (sMode == 'excute')
        this.cWpComViewerSvc.showResultViewer(sInitJob, this.oTrainModelFlag);
      setTimeout(() => {
        let sWpSaveData = this.onSave();
        this.cWpDiagramSvc.excuteJob(sClientId, p.ID, sCom, sWpSaveData, pMode).subscribe(p1 => {

          if (sMode == 'excuteBefore' || sMode == 'excuteNow' || sMode == 'selectData')
            this.cWpDiagramSvc.sendJobCallResult({ result: p, mode: sMode });
          // #177 워크플로우 실행되었을때 실행한 job Group Id
          if (sMode == 'excute' && p) {
            this.oExcutedJobGroupId = p.ID;
          }
        });
      }, 1000);
    });
  }
  // #143 중복 파일 체크
  async chkNewOutputName(pNewFileNmList: string[]) {
    let sDataSourceList = await this.cWpComViewerSvc.getDataSourceList();
    let sFileNmChkList = sDataSourceList.map(sData => sData.filename).filter(sNm => pNewFileNmList.includes(sNm));
    if (sFileNmChkList.length > 0)
      return { valid: false, msg: '이미 존재하는 파일이 있습니다. 다른 이름으로 설정해주세요' };
    else
      return { valid: true, msg: '' };
  }
  // #27, #28 필터 분할 및 슬라이스 컴포넌트에 연결된 컴포넌트는 filter_data 속성 추가 -> usetable(사용할 viewtable명)에서 활용
  setFilterProperty(pDs: dxDiagramData) {
    // 초기화
    this.oDiagramData._array.forEach((sCom: WpNodePro) => { 
      let sComData = this.cAppSvc.getComData(sCom.id);
      if (sComData)
        delete sComData['filter'];
    });
    let sFilterCount = 0; // 필터 분할 컴포넌트 수
    for (let sCom of this.oDiagramData._array) {
      if (sCom.type == COM_ID['T-SLICE'] || sCom.type == COM_ID['T-SPLIT']) {
        let sFilterDataFlag = true;
        for (let sLink of this.oDiagramLinkData._array) {
          if (sCom.id == sLink.fromId) {

            let sTargetCom = this.cAppSvc.getComData(sLink.toId)
            if (sTargetCom) {
              if (!sTargetCom.filter) {
                sTargetCom.filter = []; // 조인 or 병합 컴포넌트의 상위 컴포넌트 모두 필터/슬라이스인 케이스를 위해 리스트로 지정 
              }
              if (sFilterDataFlag) {
                sTargetCom.filter.push(`true_${sCom.jobId}`); // filter: filter_filterJobId
                sFilterDataFlag = false;
              } else {
                sTargetCom.filter.push(`false_${sCom.jobId}`); // filter: filter_filterJobId
                sFilterCount++;
              }
            }
          }
        }
      }
    }
    return { 'filter_count': sFilterCount };
  }
  /**
  * diagram의 현재 connector 연결 상태를 this.oOldLinkData에 저장한다. 
  * @example
  * ```ts
  * this.saveConnection()
  * ```
  */
  saveConnection() {
    let sLinkData = JSON.parse(JSON.stringify(this.oDiagramLinkData._array))
    this.oOldLinkData = sLinkData.reduce((target: { [index: string]: WpEdgePro }, key: WpEdgePro) => {
      target[key.id] = key;
      return target;
    }, {}) 
  }
  // #7 실행 button 클릭시 connection 유효성 검증 
  async isValidExcute(pCom: { [index: string]: JOB_DATA_ATT }, pMode: string) {
    let sMsg = '';
    if (Object.keys(pCom).length == 0) {
      return { valid: false, msg: '워크플로우를 생성한 후 실행해주세요.' };
    }
    for (const key of Object.keys(pCom)) {
      let sPoint = await this.cWpDiagramSvc.getFromPoint(pCom[key].type).toPromise();
      let sFromPoint = sPoint[0].CONN_LIMIT;
      if (!pCom[key].data) {
        sMsg += `${this.oComNameMap[pCom[key].type]} 컴포넌트의 속성값을 설정해야 합니다.`;
      }
      else if (sFromPoint > 0 && pCom[key].parent_id.length !== sFromPoint) {
        sMsg += `${this.oComNameMap[pCom[key].type]}의 필요 연결 개수: ${sFromPoint}`;
      }
    }
    // 컴포넌트 속성 데이터가 없는 경우 validation 과정에서 에러발생하므로 확인
    if (sMsg.length > 1)
      return { 'valid': false, 'msg': `${sMsg}` };
    // #18 출력을 지정하지 않을 경우 경고 메세지 띄움
    let sEndComponent: WpNodePro[] = [];
    let sEndComponentFileNm: string[] = [];
    let sValidGroupFlag = true;
    for await (const sCom of this.oDiagramData._array) {
      let sEndFlag = true;
      this.oDiagramLinkData._array.forEach((sLink: any) => {
        if (sCom.id == sLink.fromId)
          sEndFlag = false; //link의 fromId가 있는 component : 최종 component가 아님
      });
      if (sEndFlag)
        sEndComponent.push(sCom);
      // #25 그룹 대상 컬럼 범위 유효성 확인(transform_value_min < transform_value_max)
      if (sCom.type == COM_ID['T-GROUPING']) {
        sCom["wp-data"]['o_data'].groupby.forEach((sCol: any) => {
          if (!isNaN(Number(sCol.transform_value_min)) && !isNaN(Number(sCol.transform_value_min))) {
            if (Number(sCol.transform_value_min) > Number(sCol.transform_value_max))
              sValidGroupFlag = false;
          }
          else {
            if (sCol.transform_value_min > sCol.transform_value_max)
              sValidGroupFlag = false;
          }
        });
      }
      // #27 필터 분할 시 검증 추가 (필터분할의 출력은 2개여야 함)
      if (sCom.type == COM_ID['T-SPLIT']) {
        let sFilterCount = 0;
        this.oDiagramLinkData._array.forEach((sLink: WpEdgePro) => {
          if (sCom.id == sLink.fromId)
            sFilterCount++;
        });
        if (sFilterCount !== 2)
          sMsg += `필터 분할의 출력은 2개가 필요합니다.\n`;
      }
      // if (sCom.type == COM_ID['A-FILTER_MODEL']) {
      //   if (sCom["wp-data"]['o_data'].saveOpt === '최고 성능 모델 저장') {
      //     let sNewModelName = sCom["wp-data"].modelName;
      //     let sSearchList = await this.cWpTrainSvc.searchModel(sNewModelName).toPromise();
      //     // 중복 모델 있는지 여부
      //     let sDupFlag = false;
      //     (sSearchList as Array<DP_MODEL_MSTR_ATT>).forEach((sModel) => {
      //       if (sModel.MODEL_NM === sNewModelName) {
      //         sDupFlag = true;
      //       }
      //     });
      //     if (sDupFlag)
      //       sMsg += `모델 필터링 신규 모델명과 동일한 모델이 기존 모델에 존재합니다. 모델명을 변경해주세요.
      //           `;
      //   }
      // }
    }

    if (pMode == 'excute') {
      for (let sEndCom of sEndComponent) {
        // 모델 비교 컴포넌트 예외 추가
        if (sEndCom['type'] == COM_ID['A-COMPARE_MODEL'] || sEndCom['type'] == COM_ID['A-FILTER_MODEL'] || this.oTrainModelComIdList.includes(sEndCom['type']) || sEndCom['type'] == COM_ID['A-DEPLOY_MODEL'] || sEndCom['type'] == COM_ID['I-WORKFLOW']) {
          continue;
        } else if (sEndCom['type'] !== COM_ID['O-DATASOURCE'] && sEndCom['type'] !== COM_ID['O-DATABASE'] && sEndCom['type'] !== COM_ID['O-IMAGE-DATASOURCE']) {
          sMsg += `출력을 지정해야 합니다.
                `
          break;
        } else {
          let sConnectedComponent = this.cWpDiagramSvc.getConnectedComp(sEndCom.id);
          let sCompareModelFlag = false;
          sConnectedComponent.comIdList.forEach((sConnId: string) => {
            this.oDiagramData._array.forEach((sCom: WpNodePro) => {
              if (sCom.id === sConnId && sCom.type === COM_ID['A-COMPARE_MODEL']) {
                sCompareModelFlag = true;
              }
            })
          })
          if (sCompareModelFlag) {
            sMsg += `모델 비교 이후 출력을 연결할 수 없습니다.
                `;
            break;
          } else {
            sEndComponentFileNm.push(`${sEndCom['wp-data']['o_data']['fileNm']}.csv`);
          }
        }
      }
      // #203 분석 컴포넌트 검증 추가 (모델 파라미터 설정할 때 사용된 컬럼이 변경되었는지 체크함.)
      // 1215 데모용 주석 (원복 필요)
      // if (this.oTrainModelFlag = true) {
      //   let sAnalysisCompList = this.cWpDiagramSvc.getWpNodes().filter(sNode => this.oTrainModelComIdList.includes(sNode.type));
      //   let sAnalysisCompIdList = sAnalysisCompList.map(sComp => sComp.id);
      //   for (let sIndex = 0; sIndex < sAnalysisCompIdList.length; sIndex++) {
      //     let sChkColumnObj: { [index: string]: any } = { 'old': {}, 'new': {} } //old : 분석 설정 기준, new : 실행 시점 기준
      //     let sComId = sAnalysisCompIdList[sIndex];
      //     // (분석 파라미터 설정시점 기준) 1. 분석 컴포넌트 스키마
      //     let sComData = this.cAppSvc.getComData(sComId);
      //     sChkColumnObj['old'] = sComData['wp-data']['o_data'].chkSchema;
      //     // (실행시점 기준) 2. predict_column를 제외한 분석 컴포넌트 스키마는 상위 연결된 컴포넌트의 컬럼정보와 동일함.
      //     let sParentWpData = this.cAppSvc.getComData(sComData.parentId[0]); // 상위 컴포넌트 컬럼 정보
      //     let sParentWpDataSchema = this.cWpDiagramSvc.getDeriveSchema(sParentWpData)['schema'];
      //     sParentWpDataSchema.forEach((sCol: any) => sChkColumnObj['new'][sCol['name']] = sCol['type']);
      //     // 파생열, 파생열 조건부로 생성되는 컬럼은 제외하고 비교 -> 파생열, 파생열 조건부 이후 변환하는 경우도 체크할 수 있도록 수정해야 함...
      //     let sDervColList = this.cWpDiagramSvc.getDerivedColumnNameList(['T-DERIVED', 'T-DERIVED_COND']);
      //     if (sDervColList.length > 0) {
      //       sDervColList.forEach(sDervCol => {
      //         delete sChkColumnObj['new'][sDervCol];
      //         delete sChkColumnObj['old'][sDervCol];
      //       });
      //     }
      //     if (JSON.stringify(sChkColumnObj['old']) !== JSON.stringify(sChkColumnObj['new'])) {
      //       sMsg += `${sAnalysisCompList[sIndex].type} 컴포넌트에 사용된 컬럼 정보가 변경되었습니다. 설정값을 다시 입력해주세요.`;
      //       this.initDiagramData(sComId);
      //       break;
      //     }
      //   }
      // }
    }
    if (!sValidGroupFlag) {
      sMsg += `그룹화 변수 범위의 최소값은 최대값보다 클 수 없습니다.
            `}
    // let sDervColList = []
    if (sMsg.length == 0) {
      // #19 컬럼을 추가할 수 있는 컴포넌트의 입력값이 없을 경우 오류 발생 (각 컴포넌트별 입력값이 존재하지 않을 경우)
      let sNullFlag = false;
      for (let key of Object.keys(pCom)) {
        let sCom = pCom[key]; // 개별 컴포넌트
        // 빈값 체크 component wrap 에서 각 컴포넌트에서 확인하도록 수정
        sNullFlag = sCom.data.hasEmptyValue();
        if (sNullFlag) { // 비어있는 컴포넌트 속성이 존재할 경우
          sMsg += `${sCom.text} 컴포넌트의 속성값을 입력해주세요.
                    `;}
        sNullFlag = false;
      }
    }
    // #163 출력 파일에 중복 컬럼명 있는지 체크
    let sOutputCompList = this.cWpDiagramSvc.getNodesByType(COM_ID['O-DATASOURCE'])
    for (let index = 0; index < sOutputCompList.length; index++) {
      let sOutputCompId = sOutputCompList[index].id;
      let sOutputColumnList = this.cAppSvc.getComData(sOutputCompId).schema.map((sCol: any) => sCol.name); // 출력파일의 컬럼리스트
      let sUniqueDervCol = sOutputColumnList.filter((elem: any, index: any) => { // 중복 제거한 컬럼리스트
        return sOutputColumnList.indexOf(elem) === index;
      })
      // 컬럼명 리스트 길이와 컬럼명 중복을 제거한 리스트의 길이 비교
      if (sOutputColumnList.length !== sUniqueDervCol.length) {
        sMsg += '출력 데이터에 중복 컬럼명이 존재합니다.'
        break;
      }
    }
    // ODBC 테이블 저장 validation
    let sOOdbcCompList = this.cWpDiagramSvc.getNodesByType(COM_ID['O-DATABASE']);
    for (let index = 0; index < sOOdbcCompList.length; index++) {
      let sOdbcCompId = sOOdbcCompList[index].id;
      let sOdbcComData = this.cAppSvc.getComData(sOdbcCompId)
      // new 일 때에는 기존 테이블과 동일한 이름이면 안 됨.
      if (sOdbcComData['wp-data']['o_data'].mode == 'new') {
        let sTbNmList: any = [];
        try{
          if (sOdbcComData['wp-data']['o_data'].dbOpt == 'HIVE') {
            let sTableInfoList = await this.cHiveSvc.getHiveTableInfo().toPromise()
            for (let sIdx of sTableInfoList) {
              if (sIdx.DB_ID === sOdbcComData['wp-data']['o_data'].dsId) {
                sTbNmList.push(sIdx['TBL_NAME']);
              }
            }
          }
          if (sOdbcComData['wp-data']['o_data'].dbOpt == 'DBMS') {
            let sResult = await this.cMetaSvc.getTableInfo(sOdbcComData['wp-data']['o_data'].dsId).toPromise()
            for (let sIdx of sResult) {
              sTbNmList.push(sIdx['TBL_NM']);
            }
          }
        }
        catch (err){
          console.log(err)
        }
        if (sTbNmList.includes(sOdbcComData['wp-data']['o_data'].tablename)) {
          sMsg += `${sOdbcComData['wp-data']['o_data'].tablename} 테이블이 이미 존재합니다. 테이블명을 변경해주세요.`
        }
      }
    }
    // sMsg(경고 메세지)가 존재하면 유효한 Excute가 아님
    if (sMsg.length > 1) {
      return { 'valid': false, 'msg': `${sMsg}` };
    } else {
      return { 'valid': true, 'msg': '', 'fileNameList': sEndComponentFileNm };
    }
  }
  // 워크플로우 저장
  onSave(pEvent?: Event, pName?: string) {
    let sWkId = this.cAppSvc.getWkId();
    // 필터데이터 속성 설정 추가
    let r = this.hDiagram.instance.export();
    let ds: dxDiagramData = JSON.parse(r);
    this.setFilterProperty(ds);
    
    let sWkCompData = JSON.parse(JSON.stringify(this.cWpDiagramSvc.getWpNodes()));
    for (let sCom of sWkCompData) {
      let sWkData = this.cAppSvc.getComData(sCom.id);
      if (!sWkData) {
        if (pEvent) {
          this.cAppSvc.showMsg(`${this.oComNameMap[sCom.type]} 컴포넌트의 속성값을 설정한 후 저장해주세요`, false)
          return undefined;
        }
        else {
          sCom.data = ['{}'];
          sCom.name = '';
          sCom.schema = [];
        }
      } else {
        sCom.data = [sWkData.data[0]];
        sCom.name = sWkData.name;
        sCom.schema = sWkData.schema;
        sCom.filter = sWkData.filter;
      }
    }
    let sWkDiagram = this.hDiagram.instance.export();
    let sParams: WkSaveData = { wkId: sWkId, wkCompData: sWkCompData, wkDiagram: sWkDiagram };
    // #121 사용자가 저장 버튼을 눌러서 저장하는 경우
    if (pEvent) {
      sParams['wkType'] = 'save';
      if (pName) {
        sParams['workflowName'] = pName;
      }
      this.onDisplaySavePopup(sParams);
      return undefined;
    }
    else {
      sParams['wkType'] = 'excute';
      const sDate = new Date();
      let wkName = `WK_${dateFormat(sDate, 'yyyy-mm-dd_HH:MM:ss')}`;
      sParams['wkName'] = wkName;
      return sParams;
    }
  }
  onDisplaySavePopup(pParams: WkSaveData) {
    pParams['overwrite'] = false;
    let sWfName = pParams.workflowName ? pParams.workflowName : ''
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': '워크플로우 저장',
        'flag': true,
        'service': this.cMainAppSvc,
        'formdata': [{
          vname: '워크플로우명',
          name: 'wkName',
          value: sWfName,
          type: 'text',
          fvalue: sWfName,
          visible: true,
          edit: true
        }],
        'btnText': 'save',
      }
    });
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result && result.result) {
        let sWorkflowList: WF_MSTR_ATT[] = await this.cWpDiagramSvc.getWorkflowList().toPromise();
        // let sOldWorkflow = sWorkflowList.find(sWorkflow => sWorkflow.WF_NM === result.data.wkName && sWorkflow.DEL_YN === 'N');
        // 워크플로우 저장할 때 기존 불러오기 한 워크플로우랑 같은 경우에는 덮어쓸건지 몰어보는 팝업으로 띄워야 함.
        if (this.cWpDiagramSvc.getWpNodes().length == 0) {
          this.cAppSvc.showMsg('워크플로우를 생성한 후 저장해주세요', false);
          return;
        } else if (result.data.wkName == '') {
          this.cAppSvc.showMsg('저장할 워크플로우 이름을 입력해주세요', false);
          return;
        } else {
          let sMsg = ``
          this.cWpDiagramSvc.getWpNodes().forEach(sCom => {
            if (!sCom.hasOwnProperty('wp-data')) {
              sMsg += `${this.oComNameMap[sCom.type]} 컴포넌트의 속성값을 설정한 후 저장해주세요
                        `
            }
          });
          if (sMsg.length > 0) {
            this.cAppSvc.showMsg(sMsg, false);
            return;
          }
        }
        let sOldWorkflow = sWorkflowList.find(sWorkflow => sWorkflow.WF_NM === result.data.wkName && sWorkflow.DEL_YN === 'N');
        pParams['wkName'] = result.data.wkName;
        if (sOldWorkflow) { // 워크플로우명 중복되지 않게 함.
          // 불러온 워크플로우랑 동일한 이름으로 저장하는 경우엔 덮어쓰는지 확인
          // if (sOldWorkflow.WF_NM === this.h_loadWkTitle.title) {
            const ovewriteDialogRef = this.cDialog.open(WpPopupComponent, {
              data: {
                'title': '워크플로우 덮어쓰기',
                'flag': false,
                'service': this.cMainAppSvc,
                'message': `워크플로우 ${result.data.wkName}를 덮어쓰겠습니까?`,
                'colWidthOption': 'tight',
                'btnText': 'OK'
              }
            });
            ovewriteDialogRef.afterClosed().subscribe((pRes: any) => {
              if (pRes && pRes.result) {
                // 덮어쓰기
                pParams['overwrite'] = true;
                let sLoadWkTitle = this.cWpDiagramToolbarSvc.getLoadWkTitle();
                pParams['WF_ID'] = sLoadWkTitle.wf_id ? sLoadWkTitle.wf_id : sOldWorkflow.WF_ID;
                this.cWpDiagramSvc.saveWorkflow(pParams).toPromise().then((pResponse: any) => {
                  this.cAppSvc.showMsg('워크플로우 덮어쓰기 완료', false);
                  this.cWpDiagramToolbarSvc.setCurrentTitle(result.data.wkName); // 저장시 현재 워크플로우 탭 이름도 수정
                  this.cWpDiagramToolbarSvc.setLoadWkTitle(result.data.wkName, pResponse.workflowId); // 현재 저장한 워크플로우명으로 setLoadWkTitle 적용
                }).catch((pError: any) => {
                  this.cAppSvc.showMsg(pError.message, false);
                })
              }
            });
          // } else {
          //   this.cAppSvc.showMsg(`워크플로우 ${result.data.wkName} 가 이미 있습니다. 다른 이름으로 저장해주세요.`, false)
          // }
          return
        } else {
          this.cWpDiagramSvc.saveWorkflow(pParams).toPromise().then((pResponse: any) => {
            this.cAppSvc.showMsg('워크플로우 저장 완료', false);
            this.cWpDiagramToolbarSvc.setCurrentTitle(result.data.wkName); // 저장시 현재 워크플로우 탭 이름도 수정
            this.cWpDiagramToolbarSvc.setLoadWkTitle(result.data.wkName, pResponse.workflowId); // 현재 저장한 워크플로우명으로 setLoadWkTitle 적용
          }).catch((pError: any) => {
            this.cAppSvc.showMsg(pError.message, false);
          })
        }
      }
    });
  }
  // #80 워크플로우 불러오기
  async onDisplayLoadPopup(pEvent: Event) {
    const dialogRef = this.cDialog.open(WpLoadComponent, {
      id: 'wp-load-popup',
      width: '1200px'
    });
    dialogRef.beforeClosed().subscribe(pResult => {
      if (pResult && pResult.result && pResult.data) {
        this.onLoadWorkflow({ data: pResult.data })
      }
    })
  }

  // #80 워크플로우 불러오기
  setLoadWpData(pLoadComData: WpComData[]): void {
    pLoadComData.forEach(sCom => {
      // 불러온 json 값을 실제 component 객체로 설정
      let sTmpWpData = getPropertiesData(sCom.type, sCom['wp-data']['o_data']);
      sCom['wp-data'] = sTmpWpData;
      this.oDiagramData.byKey(sCom.id).then((pData: WpNodePro) => {
        pData['wp-data'] = sTmpWpData;
        pData['jobId'] = sCom.jobId;
        pData.parentId = sCom.parentId;
      });
      this.cAppSvc.setWpData({ data: sCom.data, id: sCom.id, name: sCom.name, parentId: sCom.parentId, schema: sCom.schema, type: sCom.type, text: sCom.text, 'wp-data': sCom['wp-data'], filter: sCom.filter, wf_regUserno: sCom['wf_regUserno'], jobId : sCom.jobId });
    });
  }
  // #114 워크플로우 불러오기 통합
  async onLoadWorkflow(pLoadData: { data?: WF_MSTR_ATT, pPreviewFlag?: boolean }) {
    try {
      this.cWpLibSvc.showProgress(true, 'wkspin');
      this.cWpDiagramSvc.setWpDaigramFlag('load', true);
      let sDiagram = JSON.parse(pLoadData.data.WF_DIAGRAM); // 불러올 diagram
      // 컴포넌트별 상세 속성 조회
      let pRes = await this.cWpDiagramSvc.getWorkflowComInfo({ wfId: pLoadData.data.WF_ID, regUser: pLoadData.data.REG_USER }).toPromise();
      let sLoadComData: WpComData[] = pRes.map((sCom: WF_COM_MSTR_ATT) => JSON.parse(sCom.WF_DATA)); // (sLoadComData) 컴포넌트별 속성값
      // 워크플로우 로드했을 경우
      for(let com of sLoadComData) {
        com['wf_regUserno'] = pLoadData.data.REG_USER
      }
      // sDiagram['shapes'][0]['type'] = String(sDiagram['shapes'][0]['type'])
      for(let shape of sDiagram['shapes']) {
        shape['type'] = String(shape['type'])
      }
      this.hDiagram.instance.import(JSON.stringify(sDiagram)); // set Diagram to UI
      this.setLoadWpData(sLoadComData); // set WpData
      // #126 dataview history 미리보기만 필요한 워크플로우는 불러오기만 함
      if (pLoadData.hasOwnProperty('pPreviewFlag')) {
        this.cWpLibSvc.showProgress(false, 'wkspin');
        // 불러오기 경고창
        this.cAppSvc.showMsg('Data History 확인용 워크플로우는 실행시 오류가 발생할 수 있습니다.', false);
        return
      }
      let sResult: { [index: string]: any } = { columnValid: true, nameVaild: true, sInputComList: [], itemCount: 0 };
      let sChkList: WpComData[] = []; // I-DATASOURCE 체크 대상

      this.oDiagramData._array.forEach((sCom: WpNodePro) => {
        if (this.oInputComIdList.includes(sCom['type']))
          sChkList.push(this.cAppSvc.getComData(sCom['id']));
      });
      // 불러오기 후 Diagram의 InputData가 유효한지 확인
      // 1) 불러온 파일명 확인
      let sFileChkResult = await this.cWpDiagramSvc.chkInputFileChanged(sChkList)
      // 파일명 변경되었을 경우 반영
      if (sFileChkResult.changedComList) {
        sChkList = sFileChkResult['changedComList'];
        sChkList.forEach(sChangeCom => {
          this.oDiagramData.byKey(sChangeCom.id).then(pData => {
            pData = sChangeCom;
          });
        });
      }
      if (!sFileChkResult['success']){
        this.cAppSvc.showMsg('기존 입력 데이터가 존재하지 않아서 워크플로우 실행시 에러가 발생할 수 있습니다.', false);
      }
      // 2) 컬럼 변경 여부 확인
      let sColumnValid = false;
      for (let sChkCom of sChkList) {
        sResult['columnValid'] = await this.cWpDiagramSvc.chkLoadFileCol(sChkCom);
        if (!sResult['columnValid']){
          sColumnValid = true;
        }
      }
      if (sColumnValid){
          this.cAppSvc.showMsg('입력 데이터의 컬럼정보가 변경되어 워크플로우 실행시 에러가 발생할 수 있습니다.', false);
      }
      this.cAppSvc.showMsg('워크플로우 불러오기 완료', false);

      // 4) DiagramPreview 초기화
      this.cWpDiagramPreviewSvc.initDiagramPreview('all');
      this.cWpComViewerSvc.onCloseViewer();
      // 5) 현재 탭 이름을 불러온 워크플로우명으로 변경.      
      this.cWpDiagramToolbarSvc.setCurrentTitle(pLoadData.data.WF_NM);
      // 불러오기한 워크플로우명 저장 (불러온 워크플로우를 같은 이름으로 저장할 때 불러오기 할 건지 확인하기 위해서 추가)
      this.cWpDiagramToolbarSvc.setLoadWkTitle(pLoadData.data.WF_NM, pLoadData.data.WF_ID);
    } catch (error: any) {
      console.log(error);
      this.oDiagramData._array.forEach((sCom: any) => {
        this.initDiagramData(sCom.id);
      });
      if (!error){
        error = { message:'워크플로우를 불러오는 중 오류가 발생했습니다' }
      }
      this.cAppSvc.showMsg(error.message, false);
    } finally {
      this.cWpLibSvc.showProgress(false, 'wkspin');
    }
  }
  clearWpDiagram() {
    let sNodeIds = this.oDiagramData._array.map((sLink: WpNodePro) => sLink.id);
    let sEgedIds = this.oDiagramLinkData._array.map((sEdge: WpEdgePro) => sEdge.id);
    this.cWpDiagramSvc.setWpDaigramFlag('push', true);
    sEgedIds.forEach((sId: string) => {
      this.oDiagramLinkData.push([{ type: "remove", key: sId }]);
    });
    sNodeIds.forEach((sId: string) => {
      this.oDiagramData.push([{ type: "remove", key: sId }]);
    });
    this.cWpComViewerSvc.onCloseViewer();
    // 워크플로우명, 기존 불러오기한 워크플로우명 초기화
    this.cWpDiagramToolbarSvc.setCurrentTitle('Untitled');
    this.cWpDiagramToolbarSvc.setLoadWkTitle('', undefined);
  }
  // pGroupId를 기준으로 실행이 완료되었는지 체크 (미사용 주석처리)
  // chkFinishExcute(pGroupId: string) {
  //   return new Promise((resolve, reject) => {
  //     let sGroupId = pGroupId;
  //     this.cWpDiagramSvc.getJobStatus(sGroupId).then((pResult: any) => {
  //       let sJobLength = pResult.length;
  //       let sFinishJob = pResult.filter((sJob: any) => sJob.STATUS == 40);
  //       let sErrorJob = pResult.filter((sJob: any) => sJob.STATUS == 99);
  //       if (sFinishJob.length == sJobLength) // 모든 job이 완료상태(40)
  //         resolve(true);
  //       else
  //         resolve(false);
  //     }).catch(error => {
  //       console.log(error);
  //       resolve(false);
  //     })
  //   })
  // }
  // 분석 실행 결과창
  onShowAnalysisResult(pAnalCompIdList: string[]) {
    this.cWpDiagramSvc.getModelResult(pAnalCompIdList).then((pResult: any) => {
      let sModelResult: any = [];
      
      pResult.forEach((sResult: any) => {
        let s_modelResult = JSON.parse(sResult['MODEL_RESULT']);
        sModelResult.push({
          result: s_modelResult.evaluateLog,
          ARG_ID: s_modelResult.argInfo.ARG_ID,
          MODEL_NM: s_modelResult.modelname,
          MODEL_EVAL_TYPE: s_modelResult.argInfo.ARG_TYPE,
          MODEL_ID: sResult['MODEL_ID'],
          MODEL_IDX: sResult['MODEL_IDX']
          // MODEL_FEATURE_IMPORTANCE: sResult.MODEL_FEATURE_IMPORTANCE !== '' ? JSON.parse(sResult.MODEL_FEATURE_IMPORTANCE) : undefined
        });
      });
      const dialogRef = this.cDialog.open(WpTrainResultviewComponent, {
        width: '1100px',
        data: sModelResult
      });
      dialogRef.afterClosed().subscribe((result: any) => {
        console.log('The dialog was closed');
        let sResult = result;
      });
    })
    return;
  }
  getCategoryList(pKey?: string, pValue?: string) {
    let sList: any;
    if (this.oData.length > 0) {
      if (pKey != undefined) {
        sList = this.oData.filter((com, i, arr) => arr.findIndex(t => t.CATEGORY === pValue) === i);
      }
      else {
        sList = this.oData.filter((com, i, arr) => arr.findIndex(t => t.CATEGORY === com.CATEGORY) === i);
      }
    }
    return sList;
  }
}