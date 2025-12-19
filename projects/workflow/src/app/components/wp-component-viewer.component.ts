import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChange, SimpleChanges } from '@angular/core';
import { WpDataSourceComponent } from './data/wp-data-source/wp-data-source.component';
import { WpTypeComponent } from './conversion/wp-type/wp-type.component';
import { WpColumnSelectorComponent } from './conversion/wp-column-selector/wp-column-selector.component';
import { WpJoinComponent } from './conversion/wp-join/wp-join.component';
import { WpSortComponent } from './conversion/wp-sort/wp-sort.component';
import { WpComponentViewerService } from './wp-component-viewer.service';
import { WorkflowAppService } from '../app.service';
import { WpNullComponent } from './conversion/wp-null/wp-null.component';
import { MatDialog } from '@angular/material/dialog';
import { WpWindowComponent } from './conversion/wp-window/wp-window.component';
import { WpODataSourceComponent } from './data/wp-data-source/wp-odata-source.component';
import { WpDiagramService } from '../wp-diagram/wp-diagram.service';
import { Subscription } from 'rxjs';
import { WpComponentService } from './wp-component.service';
import { WpVolttronService } from './data/wp-volttron/wp-volttron.service';
import { WpDiagramPreviewService } from '../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpResultViewerComponent } from './resultview/wp-result-viewer.component';
import { WpOdbcComponent } from './data/wp-odbc/wp-odbc.component';
import { WpTrainModelComponent } from './analytic-model/wp-train-model/wp-train-model.component'
import { WpOOdbcComponent } from './data/wp-odbc/wp-oodbc.component';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpColumnNameComponent } from './conversion/wp-column-name/wp-column-name.component';
import { WpPropertiesWrap } from '../wp-menu/wp-component-properties/wp-component-properties-wrap';
import dxSelectBox from 'devextreme/ui/select_box';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WpTrainModelService } from './analytic-model/wp-train-model/wp-train-model.service';
import { WpCompareModelComponent } from './analytic-model/wp-compare-model/wp-compare-model.component';
import { WpCompareModelService } from './analytic-model/wp-compare-model/wp-compare-model.service';
import { WpDiagramToolbarService } from '../wp-menu/wp-diagram-toolbar/wp-diagram-toolbar.service';
import { WpFilterModelComponent } from './analytic-model/wp-filter-model/wp-filter-model.component';
import { COM_FILTER_MODEL_ATT, JOB_DATA_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { DS_MSTR_ATT } from 'projects/wp-server/metadb/model/DS_MSTR';
import { WpIWorkflowComponent } from './data/wp-workflow/wp-iworkflow.component';
import { WpStorageComponent } from './data/wp-storage/wp-storage.component';
import { WpImageStorageComponent } from './data/wp-image/wp-image-storage.component';
import { WpImageClassifyComponent } from './conversion/wp-image-classify/wp-image-classify.component';
import { WpImageDataSourceComponent } from './data/wp-image/wp-image-data-source.component';
import { WpImageODataSourceComponent } from './data/wp-image/wp-image-odata-source.component';
import { WpEnsembleModelComponent } from './analytic-model/wp-ensemble-model/wp-ensemble-model.component';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpPredictModelComponenet } from './analytic-model/wp-predict-model/wp-predict-model.component';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpInfoPopupComponent } from './popup/wp-info-popup.component';
import { TranslateService } from '@ngx-translate/core';
import { DB_SUPPORT_TYPE,getEnumValues } from 'projects/wp-lib/src/lib/wise-type/wise.connect';
import { COM_ID, getCOM_IDListByPrefix, setCOM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
import { WpImageListPopUpComponent } from 'projects/image-unstructured/src/app/image-popup/image-list-popup.component';
import { WpVolttronComponent } from './data/wp-volttron/wp-volttron.component';

@Component({
  selector: 'wp-component-viewer',
  templateUrl: './wp-component-viewer.component.html',
  styleUrls: ['./wp-component-viewer.component.css']
})
export class WpComponentViewerComponent implements OnInit, OnChanges, OnDestroy {

  @Input() iWpComponentData: any;
  @Input() iComponentType: string;
  COM_ID: Record<string, number> = COM_ID;
  oDisplay = false;
  oComponentData: any;
  oComponent: any;
  oSelectComId: string;
  oTrainModelComIdList: number[] = [];
  h_EditFlag: boolean = true;
  oFormData: WpPropertiesWrap[] = []; // 컴포넌트 속성 Configuation Form
  oInfoFormData: WpPropertiesWrap[] = []; // 컴포넌트 속성 Info Form
  oType: number;
  oParentCnt: number;
  oSubs: Subscription[] = [];
  oComNameMap: { [index: string]: string };
  h_Message = { "msg": "", "id": "WpComViewerModal", "flag": false };
  h_ModalId = 'WpComViewerModal';
  h_tapId = 'Configuation';
  h_componentTabData: any; // h_listKey에 따라 form이 tab 형태일때 form 데이터는 이 변수를 참조한다.
  h_infoCheck = false;
  o_transformList:any;
  o_TransformInfoForm:any;
  oComTemplateData:any;
  constructor(
    public cMetaSvc: WpMetaService,
    private cComViewSvc: WpComponentViewerService,
    private cWpDiagramSvc: WpDiagramService,
    private cWpDiagramPreviewSvc: WpDiagramPreviewService,
    private cWpDiagramToolbarSvc: WpDiagramToolbarService,
    private cWpTrainModelSvc: WpTrainModelService,
    private cWpCompareModelSvc: WpCompareModelService,
    private cWpComSvc: WpComponentService,
    private cWpAppSvc: WorkflowAppService,
    private cWpVolttronSvc: WpVolttronService,
    private matDialog: MatDialog,
    private cWpSocketSvc: WpSocket,
    private cWpAppConfig: WpAppConfig,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService,
  ) {
    this.o_TransformInfoForm = [{
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info68"),
      name: 'correlation',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    },
    {
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info69"),
      name: 'visualization',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    },
    {
      vname: this.cTransSvc.instant("탐색적데이터분석"),
      name: 'analysis',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }];
    // 상관관계/시각화 transform컴퍼넌트 리스트 가져오기
    this.cComViewSvc.getTransformList().subscribe(p_result => {
      this.o_transformList = p_result.map((obj: any) => obj.ID);
    });
    // 워크플로우 안하고 바로 데이터셋이나 모델매니저에서 워크플로우이력누르면 COM_ID를 못찾아서 여기서 세팅
    this.cMetaSvc.getComList().subscribe(e=>{
          e = e.filter((sCom:any) => sCom.DISPLAY == 'true');
          this.oComTemplateData = e;
    
          // 컴포넌트 TYPE - ID 매핑 초기화
          this.oComTemplateData.map((c: any) => setCOM_ID(c.TYPE, c.ID, c.CATEGORY));
        });
  }
  async ngOnChanges(changes: SimpleChanges) {
    let sInitSize: SimpleChange = changes.iWpComponentData;
    // comviewerSvc의 onCloseViewer에서 iWpComponentData를 undefined로 할당하기 때문에 sInitSize 를 체크해야 함. 실제로 viewer가 열렸을 때만 아래 로직을 탐.
    if (sInitSize && !sInitSize.firstChange && sInitSize.currentValue) {
      console.log("sInitSize.currentValue.text:", sInitSize.currentValue.text);
       // component가 transform컴퍼넌트일경우에는 infoCheck true로 보이게끔
      this.h_infoCheck = this.o_transformList.includes(sInitSize.currentValue.type);
      if(this.h_infoCheck) {
        this.oInfoFormData = this.o_TransformInfoForm
      }
      this.oFormData = [];
      this.oComponentData = sInitSize.currentValue['wp-data'];
      // h_componentTabData 초기화
      this.h_componentTabData = this.oComponentData['o_data'];

      this.oSelectComId = sInitSize.currentValue.id;
      this.cComViewSvc.setComId(this.oSelectComId);

      this.oDisplay = true;
      this.oType = sInitSize.currentValue.type;
      this.oParentCnt = sInitSize.currentValue.parentId.length;
      if (sInitSize.currentValue.type == COM_ID['I-DATASOURCE']) {
        this.oComponent = new WpDataSourceComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cWpSocketSvc);
        let sTableType = {params : {TBL_TYPE: 'structure'}}
        let tmp = await this.cComViewSvc.getDataSourceList(sTableType);
        let tmpShared = await this.cComViewSvc.getSharedDataList(); // #37 공유 데이터셋
        this.oComponent.setFileNm(tmp, tmpShared);
      } else if (sInitSize.currentValue.type == COM_ID['I-WORKFLOW']) {
        let s_workflowList = await this.cComViewSvc.getInputWorkflowList();
        this.oComponent = new WpIWorkflowComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cWpSocketSvc, this.cWpDiagramSvc);
        this.oComponent.setWorkflowList(s_workflowList);
      } else if (sInitSize.currentValue.type == COM_ID['I-DATABASE']) {
        let sDsData: DS_MSTR_ATT[] = await this.cMetaSvc.getDsInfo().toPromise();
        // WPLAT-365
        let sDbList = sDsData.filter(sDs => sDs.TYPE === 'db' && getEnumValues(DB_SUPPORT_TYPE).includes(sDs.DBMS_TYPE));
        this.oComponent = new WpOdbcComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cMetaSvc, 'odbc', sDbList);
      }else if (sInitSize.currentValue.type == COM_ID['I-STORAGE']) {

        let s_dsStorage: DS_MSTR_ATT[] = await this.cMetaSvc.getDsInfo({ DS_ID: this.cWpAppConfig.getConfig('DS_ID') }).toPromise();

        // console.log("sDsData : ", sDsData);
        this.oComponent = new WpStorageComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.matDialog, s_dsStorage);
      }else if (sInitSize.currentValue.type == COM_ID['I-IMAGE-STORAGE']) {
        let s_dsStorage: DS_MSTR_ATT[] = await this.cMetaSvc.getDsInfo({ DS_ID: this.cWpAppConfig.getConfig('DS_ID') }).toPromise();
        this.oComponent = new WpImageStorageComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.matDialog, s_dsStorage, this.cWpDiagramSvc);
      }else if (sInitSize.currentValue.type == COM_ID['I-IMAGE-DATASOURCE']) {
        this.oComponent = new WpImageDataSourceComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cWpSocketSvc, this.cWpDiagramSvc);
        let sTableType = {params :{TBL_TYPE: 'image'}}
        let tmp = await this.cComViewSvc.getDataSourceList(sTableType);
        let tmpShared = await this.cComViewSvc.getSharedDataList();
        this.oComponent.setFileNm(tmp, tmpShared);
      }else if (sInitSize.currentValue.type == COM_ID['T-IMAGE-CLASSIFY']) {
        this.oComponent = new WpImageClassifyComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.matDialog, this.cWpDiagramSvc, this.cMetaSvc);
      }else if (sInitSize.currentValue.type == COM_ID['I-VOLTTRON']) {
        this.oComponent = new WpVolttronComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpVolttronSvc, this.cWpComSvc, this.cWpDiagramPreviewSvc, this.matDialog, this.cMainAppSvc);
      }
      else if (sInitSize.currentValue.type == COM_ID['O-IMAGE-DATASOURCE']) {
        this.oComponent = new WpImageODataSourceComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramSvc);
        let tmp = await this.cComViewSvc.getDataSourceList();
        let tmpShared = await this.cComViewSvc.getSharedDataList();
        this.oComponent.setFileNm(tmp, tmpShared);
      }
      else if (sInitSize.currentValue.type == COM_ID['O-DATASOURCE']) {
        this.oComponent = new WpODataSourceComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramSvc, this.cWpAppSvc);
        // #148 output overwrite 데이터 리스트 수정
        let tmp = await this.cComViewSvc.getDataSourceList();
        let tmpShared = await this.cComViewSvc.getSharedDataList(); // #37 공유 데이터셋
        this.oComponent.setFileNm(tmp, tmpShared);
      }else if (sInitSize.currentValue.type == COM_ID['O-DATABASE']) {
        this.oComponent = new WpOOdbcComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cMetaSvc, this.cWpAppSvc,this.cWpComSvc,this.cWpSocketSvc,this.cWpDiagramSvc,this.matDialog);
      }else if (sInitSize.currentValue.type == COM_ID['T-TYPE']) {
        this.oComponent = new WpTypeComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData);
      } else if (sInitSize.currentValue.type == COM_ID['T-SORT']) {
        this.oComponent = new WpSortComponent(this.cComViewSvc, this.oComponentData);
      } else if (sInitSize.currentValue.type == COM_ID['T-NULL']) {
        this.oComponent = new WpNullComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData);
      }else if (sInitSize.currentValue.type == COM_ID['T-SELECT']) {
        this.oComponent = new WpColumnSelectorComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpDiagramPreviewSvc, this.cWpAppSvc);
      } else if (sInitSize.currentValue.type == COM_ID['T-JOIN']) {
        this.h_componentTabData = this.oComponentData['o_data']['joinKey']
        let sNodes = this.cWpDiagramSvc.getWpNodes();
        this.oComponent = new WpJoinComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, sNodes);
        if (this.oParentCnt > 1) {
          let sComData = [];
          let sFlag = true;
          for (let sParentId of sInitSize.currentValue.parentId) {
            if (this.cWpAppSvc.getComData(sParentId) == undefined) {
              sFlag = false;
            }
            let sTempComData = this.cWpAppSvc.getComData(sParentId);
            if (sTempComData) {
              sComData.push(this.cWpDiagramSvc.getDeriveSchema(sTempComData));
            } else {
              this.h_EditFlag = false;
            }
          }
          if (sFlag)
            this.oComponent.setSchema(sComData);
        }
      } else if (sInitSize.currentValue.type == COM_ID['T-WINDOW']) {
        this.oComponent = new WpWindowComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData);
        // 컬럼명 변경 컴포넌트 추가
      } else if (sInitSize.currentValue.type == COM_ID['T-NAME']) {
        this.oComponent = new WpColumnNameComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData);
      } else if (sInitSize.currentValue.type == COM_ID['A-COMPARE_MODEL']) {
        this.h_componentTabData = this.oComponentData['o_data']['compare_model']
        this.oComponent = new WpCompareModelComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpCompareModelSvc, this.cWpAppSvc, this.cWpDiagramSvc, this.cWpTrainModelSvc);
        let sComData = this.cWpAppSvc.getComData(sInitSize.currentValue.parentId[0]);
        this.oComponent.setSchema(sComData);
      } else if (getCOM_IDListByPrefix('A-Ensemble').includes(sInitSize.currentValue.type)) { // includes('A-Ensemble')
        let s_argId = sInitSize.currentValue.type;
        let s_argInfo = await this.getArgInfo(s_argId);
        console.log("s_argInfo: ", s_argInfo);
        // WPLAT-362
        this.oComponent = new WpEnsembleModelComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpAppSvc, this.cWpDiagramSvc, this.matDialog, this.cWpTrainModelSvc, this.cWpDiagramPreviewSvc, s_argInfo);
      } else if (sInitSize.currentValue.type == COM_ID['A-FILTER_MODEL']) {
        this.h_componentTabData = this.oComponentData['o_data']['compare_model']
        this.oComponent = new WpFilterModelComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpCompareModelSvc, this.cWpAppSvc, this.cWpDiagramSvc, this.cWpTrainModelSvc);
        if (this.oParentCnt === 1) {
          let sParentComData = this.cWpAppSvc.getComData(sInitSize.currentValue.parentId[0]);
          this.oComponent.setModelListData(sParentComData['wp-data']['o_data'].compare_model);
          this.oComponent.setModelType(sParentComData['wp-data']['o_data'].modelType);
        } else if (this.oParentCnt > 1) {
          let sNodes = this.cWpDiagramSvc.getWpNodes();
          let sFlag = true;
          let sCompareModelList: COM_FILTER_MODEL_ATT['compare_model'] = [];
          for (let sParentId of sInitSize.currentValue.parentId) {
            let sTempComData = this.cWpAppSvc.getComData(sParentId);
            if (!sTempComData) {
              sFlag = false;
              this.h_EditFlag = false;
            } else {
              let sWkData = sNodes.filter(sNode => sNode.id === sParentId)[0];

              if(sWkData === undefined){
                sWkData = sInitSize.currentValue
              }
              this.oComponent.setModelType(sWkData['wp-data']['o_data'].modelType);
              sCompareModelList.push({
                h_model_name: `${sWkData.text}(job ${sWkData.jobId})`,
                MODEL_NM: `${sWkData.text}(job ${sWkData.jobId})`,
                MODEL_ID: undefined,
                MODEL_IDX: undefined,
                COM_UUID: sWkData.id,
                COM_ID: sWkData.type,
                ARG_TYPE: sWkData['wp-data'].o_data.modelType
              });
            }
          }
          if (sFlag) {
            this.oComponent.setModelListData(sCompareModelList);
          }
        }
        let sComData = this.cWpAppSvc.getComData(sInitSize.currentValue.parentId[0]);
        this.cWpDiagramSvc.getDeriveSchema(sComData);
        this.oComponent.setSchema(sComData);
      } 
      else if (sInitSize.currentValue.type == COM_ID['A-PREDICT_MODEL']) {
        this.oComponent = new WpPredictModelComponenet(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpAppSvc, this.cWpDiagramSvc, this.cWpTrainModelSvc);
      }  // #179 알고리즘별 분석 모델 컴포넌트
      else if (getCOM_IDListByPrefix('A-').includes(sInitSize.currentValue.type)) {
        let s_argId = sInitSize.currentValue.type;
        let s_argInfo = await this.getArgInfo(s_argId);
        this.oComponent = new WpTrainModelComponent(this.cTransSvc, this.cComViewSvc, this.oComponentData, this.cWpTrainModelSvc, this.cWpDiagramSvc, this.cWpAppSvc, this.cWpDiagramPreviewSvc, s_argInfo, this.cWpComSvc, this.cWpDiagramToolbarSvc);
      }
      else {
        this.oComponent = undefined;
      }
      if (![COM_ID['I-DATASOURCE'], COM_ID['I-DATABASE'], COM_ID['T-MERGE'], COM_ID['T-JOIN'], COM_ID['A-COMPARE_MODEL'], COM_ID['A-FILTER_MODEL']].includes(sInitSize.currentValue.type)) {
        if (this.oParentCnt > 0) {
          let sComData = this.cWpAppSvc.getComData(sInitSize.currentValue.parentId[0]);
          if (sComData && this.h_EditFlag) {
            sComData = this.cWpDiagramSvc.getDeriveSchema(sComData);
            this.oComponent.setSchema(sComData);
            if (sInitSize.currentValue.type == COM_ID['T-DATE'] || sInitSize.currentValue.type == COM_ID['T-MATH'] || sInitSize.currentValue.type == COM_ID['T-DERIVED']) {
              this.oComponent.setDervColList(sComData);
            }
          } else {
            let sTmp = sInitSize.currentValue.schema ? { ...sInitSize.currentValue } : { ...sInitSize.currentValue, schema: [{}] };
            this.oComponent.setSchema(sTmp);
            if (sTmp.type == COM_ID['T-DATE'] || sTmp.type == COM_ID['T-MATH'] || sTmp.type == COM_ID['T-DERIVED']) {
              this.oComponent.setDervColList(sTmp);
            }
          }
        }
      }

      if (this.oComponent != undefined) {
        this.oFormData = await this.oComponent.getFormData();
        if (this.h_EditFlag) {
          let sType = sInitSize.currentValue.type;
          if (sType !== COM_ID['T-JOIN'] && sType !== COM_ID['T-MERGE'] && sType !== COM_ID['T-SELECT'])
            this.setDiagramPreviewById(sInitSize.currentValue.id, true);
          if (sInitSize.currentValue.parentId.length > 0) {
            this.setDiagramPreviewById(sInitSize.currentValue.parentId, false);
          }
          if (sType == COM_ID['T-JOIN'] || sType == COM_ID['T-MERGE']) {
            let sCompIdList = this.cWpDiagramSvc.getNodesByType(sType).filter(sCom => sCom.hasOwnProperty('wp-data')).map(sCom => sCom.id);
            if (sCompIdList.length > 1) {
              sCompIdList.forEach((sComId, index) => {
                let sTmpData = this.cWpAppSvc.getComData(sComId);
                sTmpData.name = `${sType}데이터_${index + 1}.csv`;
                this.cComViewSvc.selectData(sTmpData);
              })
            }
          }
        }
        if (!this.h_EditFlag) {
          this.oFormData.forEach((sForm) => {
            if (sForm.type === 'tab') {
              sForm.fvalue.forEach((sSubForm: WpPropertiesWrap) => {
                sSubForm.edit = false;
              })
            } else {
              sForm.edit = false;
            }
          })
        }
      } else {
        this.cWpAppSvc.showMsg("이 컴포넌트는 설정할 수 없습니다.", false);
        this.setDisplay(false);
      }


    }
  }
  setDisplay(pChk: boolean) {
    this.oDisplay = pChk;
  }
  ngOnInit(): void {
    this.oComNameMap = this.cWpDiagramSvc.getComNameMap();
    this.oTrainModelComIdList = this.cWpDiagramSvc.getTrainModelComIdList();
    this.oSubs.push(
      this.cComViewSvc.selectDataEmit.subscribe(p => {
        let sTmpData: any = { id: this.oSelectComId, data: p.data, schema: p.schema, name: p.name, 'wp-data': this.oComponentData, parentId: this.iWpComponentData.parentId, type: this.oType, filter: undefined }; //wp-data: id로 oComponentData에 접근할 수 있도록 추가
        this.cWpAppSvc.setWpData(sTmpData);
      })
    );
    this.oSubs.push(
      this.cComViewSvc.setViewerTrainModelComIdListEmit.subscribe(() => {
        this.oTrainModelComIdList = this.cWpDiagramSvc.getTrainModelComIdList();
      })
    )
    this.oSubs.push(
      this.cComViewSvc.onDisplayResultViewerEmit.subscribe(pEmitData => {
        this.openResultDialog(pEmitData);
      })
    );
    this.oSubs.push(
      this.cComViewSvc.onCloseViewerEmit.subscribe(() => {
        this.onClose();
      }));
    this.oSubs.push(
      this.cComViewSvc.onOpenViewerEmit.subscribe(() => {
        this.onOpen();
      }));
    this.oSubs.push(
      this.cComViewSvc.showDiagramPreviewEmit.subscribe(pData => {
        this.setDiagramPreviewById(pData.comId, pData.currDataFlag);
      })
    );
    this.oSubs.push(
      this.cComViewSvc.setEditFlagEmit.subscribe(pFlag => {
        this.h_EditFlag = pFlag;
      })
    )
    this.oSubs.push(
      this.cComViewSvc.setInfoFormDataEmit.subscribe(pFormData => {
        this.oInfoFormData = pFormData;
      })
    )
  }
  openResultDialog(pEmitData: { initJob: { jobList: { [index: string]: JOB_DATA_ATT }, step_count: number, analyiticModelFlag?: boolean }, trainModelFlag: boolean }): void {
    let sInitJob = pEmitData.initJob;
    sInitJob.analyiticModelFlag = pEmitData.trainModelFlag;
    const dialogRef = this.matDialog.open(WpResultViewerComponent, {
      width: '1000px',
      data: sInitJob
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
  }
  onClose() {
    console.log("====== onClose ======");
    this.setDisplay(false);
  }
  onOpen() {
    console.log("====== onOpen ======");
    this.setDisplay(true);
    this.setTabVisible('Configuation');
    let sConfElem: HTMLElement = document.querySelector('wp-component-viewer > .component-configuration');
    if (sConfElem) {
      sConfElem.style.width = '334px '
    }
  }
  onClickTab(pEvent: Event, pCallbackOpt: boolean) {
    console.log("pEvent : ", pEvent);
    let sTapId = (pEvent.target as Element).className;
    this.setTabVisible((sTapId as "Configuation" | "Info"), pCallbackOpt);
  }
  setTabVisible(pType: 'Configuation' | 'Info', pCallbackOpt?: boolean) {
    this.h_tapId = pType;
    let sConfElem = document.getElementById('h_tab_conf').parentElement;
    let sInfoElem = document.getElementById('h_tab_info').parentElement;
    if (pType == 'Configuation') {
      sConfElem.style['display'] = 'block';
      sInfoElem.style['display'] = 'none';
    }
    if (pType == 'Info') {
      sConfElem.style['display'] = 'none';
      sInfoElem.style['display'] = 'block';
    }
    if (pCallbackOpt) {
      if (this.oComponent.onChangeTab) {
        this.oComponent.onChangeTab(this.h_tapId);
      }
      else if(!this.h_infoCheck){
        sInfoElem.style['display'] = 'none';
      }
    }
  }
  onAddList(pName: string) {
    let aTempData;
    if (this.oType == COM_ID['T-DATE']) {
      aTempData = { column: '', derivedColumn: '', value: '', dateFormatText: '', derivedOption: "true" };
    } else if (this.oType == COM_ID['T-NULL']) {
      aTempData = { column: '', type: '', value: '', dateexp: '' };
    } else if (this.oType == COM_ID['T-JOIN']) {
      aTempData = { useColumn: '', joinColumn: '' };
    } else if (this.oType == COM_ID['A-COMPARE_MODEL']) {
      aTempData = { h_model_name: '', model_name: '', model_id: '', model_idx: '', com_id: '' };
    } else if (this.oType == COM_ID['T-TYPE'] || this.oType == COM_ID['T-SORT']) {
      aTempData = { column: '', type: '' };
    } else {
      aTempData = { column: '', type: '', value: '' };
    }

    if ( this.oType == COM_ID['T-MATH'] || this.oType == COM_ID['T-DATE']) {
      this.oComponent.setDervInputReadOnly();
    }
    this.h_componentTabData.push(aTempData);
    // #WPLAT-6 NULL 변환 날짜 변환식 추가로 수정.
    if (this.oType == COM_ID['T-NULL']) {
      setTimeout(() => {
        this.oComponent.setFormByTransformType(this.h_componentTabData.length - 1);
      }, 100)
    }
  }
  // #20 컴포넌트 속성 삭제 기능 추가
  onRemoveList(pName: string, pEvent: Event) {
    console.log(" =========== onRemoveList =========== ")
    let sRemoveIndex = (pEvent.target as Element).closest(".inputAddedItem").getAttribute('tableindex');
    if (this.h_componentTabData.length >= 2 || this.oType == COM_ID['I-API']) {
      this.h_componentTabData.splice(Number(sRemoveIndex), 1);
      let sComId = this.cComViewSvc.getComId();
      this.setDiagramPreviewById(sComId, true);
    }
  }
  // #25 그룹화 컴포넌트에서 변수 범위 검증, #26 시계열 컴포넌트 검증
  onKeyUp(pEvent: KeyboardEvent, pName: string, pTabIdx?: number) {
    // #12 input Validation
    if ((this.oType == COM_ID['T-NULL'] && pName == 'value') ||
      (this.oType == COM_ID['T-OUTLIER'] && pName == 'value') ||
      (this.oType == COM_ID['T-DATE'] && pName == 'derivedColumn') ||
      (this.oType == COM_ID['O-DATASOURCE'] && pName == 'new_filename') ||
      (this.oType == COM_ID['O-DATABASE'] && pName == 'tablename') ||
      (this.oType == COM_ID['A-FILTER_MODEL'] && pName =='modelName')
    ) {
      this.oComponent.onKeyUp(pEvent, pName, pTabIdx);
    } // #34 분석 컴포넌트 값 validation 추가
    if (this.oTrainModelComIdList.includes(this.oType)) {
      this.oComponent.onParamValueChanged(pEvent, pName);
    }
    this.setDiagramPreviewById(this.oSelectComId, true);
    return false;
  }
  // #10 (onCompViewerChanged) component-viewer에서 이벤트 발생 -> callback 함수 존재할 경우 실행 후 diagram preview 데이터 갱신
  async onCompViewerChanged(pCallbackName: any, pEvent: any, pTabIdx?: number) {
    try {
      let sCallbackName = pCallbackName ? pCallbackName.name.split(" ")[1] : undefined;
      if (pEvent.element && ['DX-SELECT-BOX', 'DX-TAG-BOX'].includes(pEvent.element.tagName)) {
        let sElemTagName = pEvent.element.tagName
        if (pEvent.component._valueChangeEventInstance && (pEvent.selectedItem || pEvent.value || pEvent.addedItems)) { // 팝업 여러번 뜨는 에러 수정
          // componenet viewer 바뀔때 이전 속성창에서 바인딩 된 컴포넌트에 데이터 바인딩 되는 문제 > selection change 발생할 때 직접 componentData에 바인딩함.
          let sFormIndex = pEvent.element.getAttribute('form-index');
          let sInnerFormIndex = pEvent.element.getAttribute('inner-form-index');
          let sFormMain;
          let sSelctedIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget)
          if (typeof pTabIdx == 'undefined') { // 단일 form
            sFormMain = this.oFormData[sFormIndex];
            let sWpData = this.oComponentData['o_data']
            // 분석 컴포넌트 데이터 바인딩
            if (this.oTrainModelComIdList.includes(this.oType)) {
              if (sElemTagName == 'DX-SELECT-BOX') {
                if (sFormMain.name.includes('param_')) {
                  sWpData[sFormMain.name]['value'] = sFormMain.fvalue[sSelctedIndex];
                } else {
                  sWpData[sFormMain.name] = sFormMain.fvalue[sSelctedIndex];
                }
              }
              else if (sElemTagName == 'DX-TAG-BOX') {
                sWpData[sFormMain.name]['option'] = pEvent.component._selectedItems;
              }
              // 변환 컴포넌트 데이터 바인딩
            } else {
              if (sElemTagName == 'DX-SELECT-BOX') {
                sWpData[sFormMain.name] = sFormMain.fvalue[sSelctedIndex];
              }
              else if (sElemTagName == 'DX-TAG-BOX') {
                sWpData[sFormMain.name] = pEvent.component._selectedItems;
              }
            }
          } else { //tab으로 구성된 form
            sFormMain = this.oFormData;
            let sFormSub = sFormMain[sFormIndex].fvalue[sInnerFormIndex];
            if (sElemTagName == 'DX-SELECT-BOX') {
              this.h_componentTabData[pTabIdx][sFormSub.name] = sFormSub.fvalue[sSelctedIndex];
            } else if (sElemTagName == 'DX-TAG-BOX') {
              this.h_componentTabData[pTabIdx][sFormSub.name] = pEvent.component._selectedItems;
            }
          }
          if (sCallbackName && sCallbackName !== 'onKeyUp') {
            this.oComponent[sCallbackName](pEvent, pTabIdx); // Callback 함수 존재할 경우 실행
          }
        } else {
          return false;
        }
      }
      else {
        if (sCallbackName && sCallbackName !== 'onKeyUp') {
          this.oComponent[sCallbackName](pEvent, pTabIdx); // Callback 함수 존재할 경우 실행
        }
      }
    }
    catch (err) {
      console.log(err);
    }
    finally {
      // 병합이나 조인이면 대상 데이터가 선택되어야 preview에 표시할 수 있도록 함
      if ( this.oType == COM_ID['T-JOIN']) {
        let pData = this.cWpAppSvc.getComData(this.oSelectComId);
        // 유효한 병합 or 조인이면 Diagram Preview 표시
        this.cWpDiagramSvc.showValidDiagPreview(pData); //pData:컴포넌트ComData
      } else if (this.oType !== COM_ID['I-DATASOURCE'] && this.oType !== COM_ID['I-HIVE'] && this.oType !== COM_ID['I-DATABASE'] && this.oType !== COM_ID['I-HDFS'] && this.oType !== COM_ID['I-FTP'] && !this.oTrainModelComIdList.includes(this.oType)) { // 분석 컴포넌트의 diagram preview도 입력데이터처럼 컴포넌트 내에서 직접 설정함.
        this.setDiagramPreviewById(this.oSelectComId, true);
      }

      return false;
    }
  }
  onFocusOutSelectBox(sEvent: { event: Event, Element: HTMLElement, component: dxSelectBox }) {
    if (sEvent.component) {
      sEvent.component.close()
    }
  }


  async getArgInfo(pModelType: string) {
    let s_result:any = await this.cComViewSvc.getArgInfo(pModelType);
    return s_result[0]
  }
  
  public getItemIndexByElem(pElem: Element) {
    return Array.from(pElem.parentNode.children).indexOf(pElem)
  }

  // #10 Id를 기준으로 Diagram Preview 생성
  setDiagramPreviewById(pCompId: string | string[], pCurrDataFlag: boolean) {
    // WPLAT-361 8번 수정
    try {
      let sComData;
      if (pCurrDataFlag && typeof pCompId === 'string') {
        // 현재 데이터 ComData
        sComData = this.cWpAppSvc.getComData(pCompId);
        if (typeof sComData == 'undefined')
          return;
        else {
          sComData = this.cWpDiagramSvc.getDeriveSchema(sComData);
        }
      } else {
        sComData = [];
        let sTmpPrevComData;
        // 연결되어있는 이전 단계 ConData
        if (pCompId.length > 0) {
          (pCompId as string[]).forEach((sPrevId: string) => {
            sTmpPrevComData = this.cWpAppSvc.getComData(sPrevId);
            sComData.push(this.cWpDiagramSvc.getDeriveSchema(sTmpPrevComData));
          })
        }
      }
      this.cWpDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sComData, 'sCurrDataFlag': pCurrDataFlag });
    } catch (error) {
      
    }
  }
  // #111 저장/불러오기/실행 팝업 여러개 뜨지 않게 unsubscribe
  ngOnDestroy() {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    })
  }
    async onBasicInfoClick(p_name: any, pEvent: any) {
    let s_type = p_name;
    this.cComViewSvc.showProgress(true);
    this.cWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
    let s_comId = this.cComViewSvc.getComId();
    // 필터 다음 컴퍼넌트에서 통계량/상관관계확인할 경우 필터 여부 확인하기 위해
    let sComData = this.cWpAppSvc.getComData(s_comId);

    let s_subsIdx = this.cWpComSvc.getSubsIdx(s_comId);
    let s_dialogRef: any;
    if (s_subsIdx == -1) {
      this.cWpComSvc.addSubscription(s_comId, [
        this.cWpDiagramSvc.sendJobCallResultEmit.subscribe(async (pData: any) => {

          if (this.cComViewSvc.oCurrentComId == s_comId) {
            if (pData && pData.mode == 'excuteBefore') {
              setTimeout(() => {
                this.cWpDiagramSvc.chkFinishExcute(pData.result.ID).then(async (pResult: any) => {
                  console.log("pResult : ", pResult);
                  if (pResult['sucsess']) {
                    // 필터 다음에 상관관계, 통계량 등을 확인할 경우 true 또는 false 붙여야됨.
                    if (sComData.hasOwnProperty('filter')) {
                      // filter 값이 "true"로 시작하면 true, "false"로 시작하면 false
                      if (sComData.filter[0].startsWith("true")) {
                        pResult['pViewId'] = pResult['pViewId'] + '_true';
                      } else if (sComData.filter[0].startsWith("false")) {
                        pResult['pViewId'] = pResult['pViewId'] + '_false';
                      }
                    }
                    // this.oComponent.setComViewId(pResult['pViewId']);
                    this.oComponent.o_usetable.usetable = pResult['pViewId'];
                    let s_schema: any = await this.cWpDiagramSvc.viewTable(pResult['pViewId']);
                    this.oComponent.o_usetable.schema = s_schema['schema'];
                    // derived-condition, python
                    if (this.oComponent.oWpData.usetable_info) {
                      this.oComponent.oWpData.usetable_info.usetable = pResult['pViewId'];
                      // python
                      if (this.oComponent.oWpData.popup_data) {
                        this.oComponent.oWpData.popup_data.usetable = pResult['pViewId'];
                      }
                    }
                    this.cComViewSvc.showMsg('컴퍼넌트 데이터 조회 완료', false);


                    s_dialogRef = this.matDialog.open(WpInfoPopupComponent, {
                      width: '1440px',
                      data: { data: this.oComponent.o_usetable.usetable, schema: this.oComponent.o_usetable.schema, type: s_type },
                      id: 'wp-info-popup'
                    });
                  } else {
                    // 에러 발생시 조회 옵션 해제
                    this.cComViewSvc.showProgress(false);
                    this.cComViewSvc.showMsg('변수 중요도 조회 에러가 발생하였습니다.', false)
                  }
                }).catch(pError => {
                  this.cComViewSvc.showProgress(false);
                  this.cComViewSvc.showMsg(pError.message, false);
                })
              }, 1000);
            } 
            // else {
            //   this.cComViewSvc.showProgress(false);
            // }
          }
        }, error => {
          console.log(error);
          // 에러 발생시 조회 옵션 해제
          this.cComViewSvc.showMsg('변수 중요도 조회 에러가 발생하였습니다.', false)
        })
      ])
    } else {
      this.cComViewSvc.showProgress(true);
      s_dialogRef = this.matDialog.open(WpInfoPopupComponent, {
        width: '1440px',
        data: { data: this.oComponent.o_usetable.usetable, schema: this.oComponent.o_usetable.schema, type: s_type },
        id: 'wp-info-popup'
      });
    }
  }
}
