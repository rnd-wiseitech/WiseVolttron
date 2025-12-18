import { WpComponentViewerService } from "../../wp-component-viewer.service";
import * as _ from "lodash";
import { WpComponent } from "../../wp-component";
import { WpTrainModelService } from "./wp-train-model.service";
import { WpDiagramService } from "../../../wp-diagram/wp-diagram.service";
import { WorkflowAppService } from "../../../app.service";
import { WpComponentService } from "../../wp-component.service";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { WpPropertiesWrap, WpToggleEvent } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpDiagramToolbarService } from "../../../wp-menu/wp-diagram-toolbar/wp-diagram-toolbar.service";
import { COM_ANALYTIC_ATT } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpTrainModelData } from "projects/wp-server/util/component/analytic/wp-train-model";
import { DP_ARG_PARAM_ATT } from "projects/wp-server/metadb/model/DP_ARG_PARAM";
import { TranslateService } from "@ngx-translate/core";

export class WpTrainModelComponent extends WpComponent {
    oWpData: COM_ANALYTIC_ATT;
    oWpTrainModelSvc: WpTrainModelService;
    oWpDiagramSvc: WpDiagramService;
    oWpAppSvc: WorkflowAppService;
    oWpDiagramPreviewSvc: WpDiagramPreviewService;
    oWpDiagramToolbarSvc: WpDiagramToolbarService;
    oComModelType = ''; // 컴포넌트의 모델 타입 (A-[modelname])
    oWpComSvc: WpComponentService;
    // 현재 모델 유형
    oChartArgType: string = undefined;
    oChartData: any
    oInfoGridDataObj: any = {};
    oInfoGridColObj: any = {};
    oInfoGridStyle: any = {};
    // 모델 결과 form
    oInfoFormData: WpPropertiesWrap[];
    oModelFormData: WpPropertiesWrap[];
    oUserModelFormData: WpPropertiesWrap[];
    cTransSvc: TranslateService;

    o_argInfo: any;
    o_argType: string;
    o_argId: number;
    o_optYn: string = 'N';
    o_argParam: any;
    o_overwriteList: any = null;

    o_argNm: string;
    o_customModelList:any;
    o_customOnOffForm = ['modelSave', 'target_column', 'scaleInfo', 'partitionValue'];
    o_selectedCustomModel:any;
    o_frameworkType: string;
    o_customArgParam: any;


    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpTrainModelData,
        pWpTrainModelSvc: WpTrainModelService,
        pWpDiagramSvc: WpDiagramService,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramPreviewSvc: WpDiagramPreviewService,
        p_argInfo: any,
        pWpComSvc: WpComponentService,
        pWpDiagramToolbarSvc: WpDiagramToolbarService
    ) {
        super(pComViewerSvc, pWpData);
        this.cTransSvc = pTransSvc;
        this.oWpTrainModelSvc = pWpTrainModelSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramPreviewSvc = pWpDiagramPreviewSvc;
        this.oWpDiagramToolbarSvc = pWpDiagramToolbarSvc;
        this.oWpComSvc = pWpComSvc;
        this.oWpData.comId = this.oComId;
        this.o_argInfo = p_argInfo;


        this.oInfoFormData = [{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info79"),
            name: 'model_info',
            value: '',
            type: 'list',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: '차트 영역',
            name: 'chart',
            value: '',
            type: 'chart',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info96"),
            name: 'model_parameter',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: false,
            edit: true,
            callbak: undefined
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info81"),
            name: 'model_result',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info82"),
            name: 'model_influence',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: '평가 지표',
            name: 'model_metrics',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: false,
            edit: true,
            callbak: undefined
        }];
        // 일반 모델 form 데이터
        this.oModelFormData = [
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info70"),
                name: 'modelSave',
                value: '',
                type: 'checkbox',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info66"),
                name: 'saveOpt',
                value: '',
                type: 'button_toggle',
                fvalue: ['new', 'overwrite'],
                visible: false,
                edit: true,
                callbak: this.onArgFormChanged.bind(this)
            },
            { // #37 덮어쓰기 대상 파일명
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"),
                name: 'overwrite_modelname',
                value: '',
                type: 'select',
                fvalue: [],
                visible: false,
                edit: true,
                callbak: this.onArgFormChanged.bind(this)
            },
            { // 신규 파일명
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"),
                name: 'new_modelname',
                value: '',
                type: 'text',
                fvalue: '',
                visible: false,
                edit: true,
                callbak: this.onArgFormChanged.bind(this)
            },
            // 커스텀 모델 학습일 경우
            {
                vname: '커스텀 모델 선택',
                name: 'customModelname',
                value: '',
                type: 'select',
                fvalue: [],
                visible: false,
                edit: true,
                callbak: this.onCustomFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info61"),
                name: 'target_column',
                value: '',
                type: 'select',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info100"),
                name: 'predictProba',
                value: '',
                type: 'checkbox',
                fvalue: false,
                visible: false,
                edit: true,
                callbak: this.setProbaDiagramPreview.bind(this)
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info71"),
                name: 'scaleInfo',
                value: '',
                type: 'select',
                fvalue: [
                    'StandardScaler',
                    'MinMaxScaler',
                    'RobustScaler',
                    'MaxAbsScaler',
                    'Normalizer',
                    'No Scale',
                ],
                visible: true,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info74"),
                name: 'partitionType',
                value: '',
                type: 'select',
                fvalue: [
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"),
                    pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info99")],
                visible: true,
                edit: true,
                callbak: this.onArgFormChanged.bind(this)
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info75"),
                name: 'partitionValue',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info73"),
                name: 'optimizer',
                value: '',
                type: 'checkbox',
                fvalue: [],
                visible: false,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info95"),
                name: 'optimizerType',
                value: '',
                type: 'select',
                fvalue: ['Bayesian', 'Grid', 'Random'],
                visible: false,
                edit: true,
                callbak: this.onArgFormChanged.bind(this),
            },

        ];


        this.setFormData(this.oModelFormData);
        
        // 기존 모델 타입 존재할 경우
        if (this.oWpData.modelInfo.model) {
            console.log("기존 모델 타입 존재");
            this.loadModelInfo();
        }
        // 신규 모델
        else {
            this.setModelInfo(this.o_argInfo);
        }
        // #203 기존에 viewTable 조회한 이력이 있는 경우 -> 조회했던 테이블 결과로 할당.
        if (this.oWpData.usetable_info.viewtable && this.oWpData.usetable_info.viewtable !== "") {
            this.setViewTable("", true)
        }
        // #203 파생열, 파생열 조건부 있는 경우에 실행한 job 결과 받아옴.
        let sSubsIdx = this.oWpComSvc.getSubsIdx(this.oComId);
        if (sSubsIdx == -1) {
            this.oWpComSvc.addSubscription(this.oComId, [
                this.oWpDiagramSvc.sendJobCallResultEmit.subscribe(pData => {
                    console.log("------send Result-------");
                    if (this.oComViewerSvc.oCurrentComId == this.oComId) {
                        if (pData) {
                            if (pData.mode == 'excuteBefore') {
                                // 실행한 Job의 상태 체크(모두 완료 40 상태인지 체크함)
                                setTimeout(() => {
                                    this.oWpDiagramSvc.chkFinishExcute(pData.result.ID).then((pResult: any) => {
                                        let pMsg = pResult['sucsess'] ? '분석 컴포넌트 데이터 조회 완료' : '분석 컴포넌트 데이터 조회 에러가 발생하였습니다.';
                                        if (pResult['sucsess']) {
                                            pMsg = '분석 컴포넌트 데이터 조회 완료'
                                            this.setDervComViewId(pResult['pViewId']); // 분석 컴포넌트 이전까지 실행해서 생긴 viewId
                                            this.setViewTable(this.oWpData.usetable_info.usetable, false); // viewId로 조회
                                        } else {
                                            pMsg = '분석 컴포넌트 데이터 조회 에러가 발생하였습니다.'
                                            this.initDervComViewId();
                                        }
                                        this.oComViewerSvc.showMsg(pMsg, false);
                                        this.oComViewerSvc.showProgress(false);
                                    }).catch(pError => {
                                        this.oComViewerSvc.showMsg(pError.message, false);
                                        this.oComViewerSvc.showProgress(false);
                                    })
                                }, 1000);
                            }
                            if (pData.mode == 'selectData') {
                                this.initDervComViewId();
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
                    this.initDervComViewId();
                    this.oComViewerSvc.showProgress(false);
                })
            ])
        }
        // 상위 연결에 파생열, 파생열 조건부 있을 경우 상위 연결까지 실행
        try {
            let sDerivedFlag = this.oWpDiagramSvc.chkParentDerivedComponent(this.oComId)
            if (sDerivedFlag) {
                this.oComViewerSvc.showProgress(true);
                this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
            } else {
                this.initDervComViewId();
            }
        } catch (error) {
            console.log('preview')
        }
    }

    public setProbaDiagramPreview() {
        let sComData;
        sComData = this.oWpAppSvc.getComData(this.oComId);
        sComData = this.oWpDiagramSvc.getDeriveSchema(sComData);
        this.oWpDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sComData, 'sCurrDataFlag': true });
    }

    // 모델에 맞는 컬럼 정의
    public setColList(pList: any) {
        let sColInfo: any = {};
        this.oSchema.schema.forEach((sCol: any) => sColInfo[sCol.name] = sCol.type);
        this.oWpData.analysisColInfo = JSON.stringify(sColInfo);
        let sColList: any = [];
        if (this.o_argType == 'Clustering' || this.o_argType == 'Language') {
            sColList = ['[미선택]'];
        } else {
            sColList = pList;
        }
        this.oFormData.map((e) => {
            if (e.name == 'target_column') {
                e.fvalue = sColList;
            }
        });
    }


    // #203 pLoadFlag: 기존 불러온 viewtable 정보 활용할 때.
    setViewTable(pViewId: string, pLoadFlag?: boolean) {
        if (pLoadFlag) {
            let sTmpData = this.getViewTableResult();
            this.oSchema = sTmpData;
            this.setDervComSchema(sTmpData['schema']);
            this.setChkSchema();
        }
        else {
            this.oWpDiagramSvc.viewTable(pViewId).then((pData: any) => {
                if (pData) {
                    this.oSchema = pData // 조회한 파생열 정보로 설정.
                    this.setViewTableResult(pData)
                    this.setDervComSchema(pData['schema']);
                    this.setChkSchema();
                    this.oComViewerSvc.showDiagramPreview(this.oComId, true);
                }
            })
        }
    }

    // #203 실행한 Job을 통해서 생긴 viewId를 WpData에 저장
    setDervComViewId(pId: string) {
        // (usetable_info) usetable:viewId, schema:컬럼정보
        let sInfo = this.oWpData.usetable_info;
        if (sInfo.usetable !== pId) {
            this.oWpData.usetable_info = { usetable: pId, schema: [] };
        }
    }

    setDervComSchema(pSchema: any) {
        this.oWpData.usetable_info.schema = pSchema;
    }

    initDervComViewId() {
        this.oWpData.usetable_info = { usetable: '', schema: [] };
    }

    // #203 워크플로우 실행시 검증에 활용하는 chkSchema 설정 (key: 컬럼명, value: 컬럼타입)
    setChkSchema() {
        let sSchema: any = {};
        let sUseTableSchema = this.oWpData.usetable_info.schema;
        if (sUseTableSchema.length == 0)
            this.oSchema.schema.forEach((sCol: any) => sSchema[sCol['name']] = sCol['type']);
        else {
            sUseTableSchema.forEach((sCol: any) => sSchema[sCol['name']] = sCol['type']);
        }
        this.oWpData.chkSchema = sSchema;
    }
    
    // #203 불러온 viewTable의 조회 결과를 json string으로 변환해서 wp-data에 할당.
    setViewTableResult(pData: any) {
        if (Object.keys(pData).length !== 0)
            this.oWpData.usetable_info.viewtable = JSON.stringify(pData);
        else
            this.oWpData.usetable_info.viewtable = "";
    }
    getViewTableResult() {
        return JSON.parse(this.oWpData.usetable_info.viewtable);
    }

    // 탭 변경시 콜백 함수 추가 
    onChangeTab(pTabName: 'Configuation' | 'Info') {
        console.log("this.oWpdata : ", this.oWpData);
        console.log("this.oFormData : ", this.oFormData);
        console.log("this.oModelFormData : ", this.oModelFormData);
        let sConfElem: HTMLElement = document.querySelector('wp-component-viewer > .component-configuration');
        if (pTabName == 'Info') {
            // 분석 결과 Info 탭 너비 키움.
            sConfElem.style.width = '500px';
            let sWkDiagramId = this.oWpAppSvc.getWkId();
            // 현재 워크플로우 ID, 컴포넌트 ID를 기준으로 분석 결과 조회.
            let sToolbarWkId = this.oWpDiagramToolbarSvc.getLoadWkTitle()
            let sWfId = sToolbarWkId.wf_id ? sToolbarWkId.wf_id : undefined;
            // 툴바 서비스에서 기존 워크플로우 ID 를 받아오고.. 그 워크플로우 컴포넌트 데이터랑 동일한 설정값인지 체크해서 
            // 동일하다면 그 값으로 가져오게 해야 함.
            this.oWpDiagramSvc.getModelResult([this.oComId]).then((pResult: any) => {
                if (pResult.length > 0) {
                    let s_rawResult = pResult[0];
                    let s_modelResult = JSON.parse(s_rawResult['MODEL_RESULT']);
                    let sResult = this.oWpTrainModelSvc.getModelResultGridData(s_modelResult);
                    if (sResult.gridCol.length > 0 && sResult.gridData) {
                        // 모델 정보 form value
                        let sModelType = s_modelResult.argInfo.ARG_TYPE;
                        let sModelTypeKor = sModelType === 'Classification' ? this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info80") : sModelType === 'Regression' ? this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info91") : sModelType === 'Image' ? '이미지 분석' : this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info90");
                        let sModelInfo = [
                            `${this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72")} - ${s_modelResult.modelname}`,
                            `${sModelTypeKor} - ${s_modelResult.argInfo.ARG_NM}`
                        ];
                        this.oInfoFormData.forEach(sForm => {
                            if (sForm.name == 'model_info') {
                                sForm.fvalue = sModelInfo;
                            }
                        });
                        if (sModelType == 'Image') {
                            this.oInfoFormData.forEach(sForm => {
                            if (sForm.name == 'model_metrics') {
                                sForm.visible = true;
                            }
                        });
                        }
                        // 모델 실행 결과 grid value
                        this.oInfoGridColObj['model_result'] = sResult.gridCol;
                        this.oInfoGridDataObj['model_result'] = sResult.gridData;
                        this.oInfoGridStyle['model_result'] = { iPage: true };

                        // 변수 중요도 결과 grid value
                        // let sFeatureFlag = sResult.featureGridData.length > 0;
                        // if (sFeatureFlag) {
                        //     this.oInfoGridColObj['feature_import'] = sResult.featureGridCol;
                        //     this.oInfoGridDataObj['feature_import'] = sResult.featureGridData;
                        //     this.oInfoGridStyle['feature_import'] = { iPage: true };
                        // }
                        // 변수 영향도 결과 grid value
                        let sInflunceFlag = sResult.influenceGridData.length > 0;
                        if (sInflunceFlag) {
                            this.oInfoGridColObj['model_influence'] = sResult.influenceGridCol;
                            this.oInfoGridDataObj['model_influence'] = sResult.influenceGridData;
                            this.oInfoGridStyle['model_influence'] = { iPage: true };
                        }

                        // 이미지 평가지표
                        let s_metricsFlag = sResult.metricsGridData.length > 0;
                        if (s_metricsFlag) {
                            this.oInfoGridColObj['model_metrics'] = sResult.metricsGridCol;
                            this.oInfoGridDataObj['model_metrics'] = sResult.metricsGridData;
                            this.oInfoGridStyle['model_metrics'] = { iPage: true };
                        }

                        let s_optParamFlag = sResult.optParamGridData.length > 0;
                        if (s_optParamFlag) {
                            this.oInfoGridColObj['model_parameter'] = sResult.optParamGridCol;
                            this.oInfoGridDataObj['model_parameter'] = sResult.optParamGridData;
                            // this.oInfoGridStyle['model_parameter'] = { iPage: true };
                        }

                        this.oInfoFormData.forEach(sForm => {
                            // if (sForm.name == 'feature_import') {
                            //     sForm.visible = sFeatureFlag;
                            // }
                            if (sForm.name == 'model_influence') {
                                sForm.visible = sInflunceFlag;
                            }
                            if (sForm.name == 'model_parameter') {
                                sForm.visible = s_optParamFlag;
                            }
                        })

                        this.oComViewerSvc.setInfoFormData(this.oInfoFormData);
                        // 차트 유형 설정
                        this.oChartArgType = s_modelResult.argInfo.ARG_TYPE;
                        // 차트 데이터 설정
                        this.oChartData = this.oWpTrainModelSvc.getModelChartData(s_modelResult);
                        console.log(" this.oChartData : ",  this.oChartData);
                    } else {
                        this.oInfoGridColObj = {};
                        this.oInfoGridDataObj = {};
                        this.oInfoGridStyle = {};
                        this.oComViewerSvc.setInfoFormData([]);
                    }
                }
            })
        } else {
            sConfElem.style.width = '334px';
        }
    }

    async setModelInfo(p_argInfo: any) {
        this.o_argType = p_argInfo['ARG_TYPE'];
        this.o_argNm = p_argInfo['ARG_NM'];
        this.o_argId = p_argInfo['ARG_ID'];
        this.o_optYn = p_argInfo['OPT_YN'];

        if (this.o_argType == 'Language') {
            this.oWpData.scaleInfo = 'No Scale';
        }
        // 이미지 분석
        if (this.o_argType === 'Image') {
            this.oWpData.scaleInfo = 'No Scale';
            this.oWpData.target_column = 'No Target';
            this.oModelFormData.forEach(item => {
                if (['optimizer', 'target_column', 'scaleInfo'].includes(item.name)) {
                    item.visible = false;
                }
                if (item.name === 'partitionType') {
                    item.edit = false;
                }
            });
        }

        this.oWpData.partitionType = this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97");
        this.oWpData.partitionValue = '20';
        this.oModelFormData.forEach(item => {
            if (item.name === 'optimizer') {
                item.visible = this.o_optYn === 'Y' ? true : false;
            }
        });
        this.oWpData.modelInfo['model'] = p_argInfo;
        this.oWpData.modelType = this.o_argType;

        if(this.o_argNm != 'Custom') {
            this.o_argParam = await this.oWpTrainModelSvc.getArgParam(this.o_argId);
            this.o_argParam = JSON.parse(this.o_argParam[0]['PARAM']);
            this.oWpData.modelInfo['defaultParam'] = this.o_argParam;
            await this.setParamInfo(this.o_argParam);
            this.setChkSchema();
        } else {
            this.o_customArgParam = await this.oWpTrainModelSvc.getArgParam(this.o_argId);
            this.o_customArgParam = JSON.parse(this.o_customArgParam[0]['PARAM']);
            this.o_customModelList = await this.oWpTrainModelSvc.getTrainCustomModelList();
            this.oModelFormData.forEach(item => {
                if (!['customModelname', 'modelSave'].includes(item.name)) {
                    item.visible = false;          // 나머지는 숨김
                } else {
                    item.visible = true;   
                    item.fvalue = this.o_customModelList.map((model:any) => model.MODEL_NM);
                }
            });
            this.setChkSchema();
        }
    }





    public async onArgParamChanged(p_ev: any, p_form: any, p_idx: any = null) {
        let s_formName = p_form.name;
        let s_formValue: any;
        let s_formType = p_form.type;
        if (s_formType == 'select') {
            s_formValue = p_ev.selectedItem
        } else if (s_formType == 'text') {
            s_formValue = p_form.value;
        } else if (s_formType == 'multiple_select') {
            s_formValue = p_ev.component._selectedItems
        } else if (s_formType == 'range_input') {
            s_formValue = p_form.value[p_idx];
        }
        // oWpdata에서 해당 파라미터 가져오기
        const s_wpParam = this.oWpData.parameter.find((param: any) => param.name === p_form.name);
        let s_wpParamType = s_wpParam.type;

        // 유효성 검사 함수들을 배열로 저장
        const validations = [
            () => ['integer', 'float'].includes(s_wpParamType) ? this.isValidNumber(s_formValue, s_wpParamType) : { isValid: true },
            async () => await this.isValidExtra(s_formValue, p_form, 'parameter'),
        ];
        for (const validate of validations) {
            const result: any = await validate();
            if (!result.isValid) {
                if (result['result'] == "") {
                    this.oComViewerSvc.showMsg(`${s_formName}에 유효한 ${s_wpParamType} 값을 입력해주세요`, false);
                } else {
                    this.oComViewerSvc.showMsg(result['result'], false);
                }

                if (s_formType == 'text') {
                    p_ev.target.value = s_wpParam.value;
                    p_form.value = s_wpParam.value;
                } else if (s_formType == 'multiple_select') {
                    p_ev.component._selectedItems = s_wpParam.options
                    p_form.value = s_wpParam.options;
                } else if (s_formType == 'range_input') {
                    p_ev.target.value == s_wpParam.value[p_idx];
                    p_form.value[p_idx] = s_wpParam.value[p_idx];
                }
                return; // isValid가 false이면 함수 종료/
            }
        }

        // 조건에 맞는 요소의 value를 바로 업데이트
        this.oWpData.parameter.forEach((param: any) => {
            if (param.name === s_formName) {
                if (['text', 'select', 'multiple_select'].includes(s_formType)) {
                    param.value = s_formValue;
                } else if (s_formType == 'range_input') {
                    param.value[p_idx] = s_formValue;
                }
            }
        });
    }

    async isValidExtra(p_value: any, p_form: any, p_formname: string) {
        let s_isValid = { isValid: true, result: p_value };
        if (p_formname == 'parameter') {
            if (p_form.type == 'text' || p_form.type == 'range_input') {
                if ((p_value < Number(p_form.fvalue[0])) || p_value > Number(p_form.fvalue[1])) {
                    s_isValid = { isValid: false, result: `사용 가능한 값은 ${p_form.fvalue[0]} ~ ${p_form.fvalue[1]} 사이입니다.` };
                }
            }
            if (p_form.type == 'multiple_select') {
                if (p_value.length < 1) {
                    s_isValid = { isValid: false, result: `최소 1개 이상의 값을 선택해야 합니다.` };
                }
            }

            if (p_form.type == 'range_input') {
                if (Number(p_form.value[0]) > Number(p_form.value[1])) {
                    s_isValid = { isValid: false, result: `최적화 값 범위를 제대로 지정해주십시오.` };
                }
            }
        } else if (p_formname == 'new_modelname') {
            let s_checkModelName: any = await this.oWpTrainModelSvc.checkModelName(p_value);
            if (s_checkModelName.length > 0) {
                s_isValid = { isValid: false, result: `해당 모델명이 존재합니다.` };
            }
        } else if (p_formname == 'target_column' && p_value != null) {
            let s_selectColType = JSON.parse(this.oWpData.analysisColInfo)[p_value];
            if (this.o_argType == 'Classification') {
                if (!['categorical', 'string', 'text'].includes(s_selectColType)) {
                    s_isValid = { isValid: false, result: `${this.o_argType} 모델은 타겟 컬럼 ${p_value} 으로 적용할 수 없습니다.` };
                }
            }
            if (this.o_argType == 'Regression') {
                if (['categorical', 'string', 'text'].includes(s_selectColType)) {
                    s_isValid = { isValid: false, result: `${this.o_argType} 모델은 타겟 컬럼 ${p_value} 으로 적용할 수 없습니다.` };
                }
            }
            this.setChkSchema();
            this.oComViewerSvc.showDiagramPreview(this.oComId, true);
        }

        return s_isValid;
    }
    
    public async onArgFormChanged(p_ev: any, p_form: any) {
        // 설정한 폼의 이름
        let s_formName = p_form.name;
        let s_formValue: any;
        // 설정한 폼의 타입(select, text...)
        let s_formType = p_form.type;
        // 설정한 폼의 원래 값
        let s_wpValue = this.oWpData[s_formName];

        // 설정한 폼의 값 가져오기
        if (s_formType == 'select') {
            s_formValue = p_ev.selectedItem;
        } else if (['checkbox', 'button_toggle'].includes(s_formType)) {
            s_formValue = p_ev;
        } else {
            s_formValue = p_ev.srcElement.value;
        }

        // 설정한 폼의 이름과 타입에 맞게 연관됨 폼 설정 및 기본값 설정
        if (s_formName == 'modelSave') {
            this.oFormData.forEach(form => {
                if (form.name == 'saveOpt') {
                    form.visible = s_formValue;
                }
                if (s_formValue == true) {
                    let s_overwriteFlag = this.oWpData.saveOpt == 'new' ? false : true;
                    if (form.name == 'overwrite_modelname') {
                        form.edit = s_overwriteFlag;
                        form.visible = s_overwriteFlag;
                    }
                    if (form.name == 'new_modelname') {
                        form.edit = !s_overwriteFlag;
                        form.visible = !s_overwriteFlag;
                    }
                } else {
                    if (form.name == 'overwrite_modelname') {
                        form.edit = false;
                        form.visible = false;
                    }
                    if (form.name == 'new_modelname') {
                        form.edit = false;
                        form.visible = false;
                    }
                }

            })
        } else if (s_formName == 'saveOpt') {

            let s_overwriteFlag = p_ev == 'new' ? false : true;
            if(s_overwriteFlag == true && this.o_overwriteList == null) {
                this.o_overwriteList = await this.oWpTrainModelSvc.getOverwriteModelList();
            }
            this.oFormData.forEach(sForm => {
                //#136 saveOpt에 따라 신규 파일명 입력 / 덮어쓸 파일 선택 표시
                if (sForm.name == 'overwrite_modelname') { // 기존 파일 목록
                    sForm.edit = s_overwriteFlag;
                    sForm.visible = s_overwriteFlag;
                    sForm.fvalue = this.o_overwriteList;
                }
                if (sForm.name == 'new_modelname') { // 신규 파일명 입력
                    sForm.edit = !s_overwriteFlag;
                    sForm.visible = !s_overwriteFlag;
                }
            });
        } else if (s_formName == 'scaleInfo') {
            this.oFormData.forEach(sForm => {
                if (this.o_argType == 'Language'){
                    if (sForm.name == 'scaleInfo'){
                        sForm.visible = false;
                    }
                }
            });
        } else if (s_formName == 'partitionType') {
            this.oFormData.forEach(sForm => {
                if (this.o_argType=='Clustering' || this.o_argType == 'Language'){
                    if (sForm.name == 'partitionValue' || sForm.name == 'partitionType'){
                        sForm.visible = false;
                    }
                }
                else {
                    if (sForm.name == 'partitionValue') {
                        sForm.visible = (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info99") ? false : true);
                    }
                }
            })
            if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97"))) {
                this.oWpData.partitionValue = '20'
            } else if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"))) {
                this.oWpData.partitionValue = '5'
            } else if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"))) {
                this.oWpData.partitionValue = '1'
            }
        } else if (s_formName == 'optimizer') {
            this.oFormData.forEach(async sForm => {
                if (sForm.name == 'parameter') {
                    let s_copyParam = JSON.parse(JSON.stringify(this.o_argParam));
                    if (s_formValue == true) {
                        s_copyParam.forEach((item: any) => {
                            item.value = item.options;
                            if (item.type == 'integer') {
                                item.value = [item.options[0], item.options[0] + 3]
                            } else if (item.type == 'float') {
                                item.value = [item.options[0], item.options[0] + 0.3]
                            }
                        });
                    }
                    await this.setParamInfo(s_copyParam, s_formValue);
                }
                // 최적화체크하면 최적화타입 보이게
                if (sForm.name == 'optimizerType') {
                    if (s_formValue) {
                        sForm.visible = true;
                    } else {
                        sForm.visible = false;
                    }
                }
            })
        }

        // 값 valid 리스트
        const validations = [
            () => ['new_modelname'].includes(p_form.name) ? this.isValidString(s_formValue, 'tableNm') : { isValid: true },
            () => ['partitionValue'].includes(p_form.name) ? this.isValidNumber(s_formValue, 'integer') : { isValid: true },
            () => this.isValidExtra(s_formValue, p_form, s_formName),
        ];
        // valid 리스트 돌림
        for (const validate of validations) {
            const result: any = await validate();
            // valid 통과 못할 경우 그에 맞게 알림처리
            if (!result.isValid) {
                s_wpValue = '';
                this.oWpData[s_formName] = s_wpValue;
                if (result['result'] == "") {
                    this.oComViewerSvc.showMsg(`${p_form.vname}에 유효한 값을 입력해주세요`, false);
                } else {
                    this.oComViewerSvc.showMsg(result['result'], false);
                }
                // valid 통과못하면 원래의 값으로 원복
                if (s_formType == 'text') {
                    p_ev.target.value = s_wpValue;
                    p_form.value = s_wpValue;
                } else if (s_formType == 'multiple_select') {
                    p_ev.component._selectedItems = s_wpValue
                    p_form.value = s_wpValue;
                } else if (s_formType == 'select') {
                    p_ev.component._setValue(s_wpValue);
                    p_form.value = '';

                }

                return; // isValid가 false이면 함수 종료/
            }
        }
        
        // valid 통과하면 변경된 값으로 업데이트
        this.oWpData[s_formName] = s_formValue;
        p_form.value = s_formValue;
    }

    // 모델 파라미터 폼 설정
    async setParamInfo(p_param: any, p_opt: any = false) {
        let paramList = [];
        this.oWpData.parameter = JSON.parse(JSON.stringify(p_param));
        if (p_opt == false) {
            for (let param of p_param) {
                let formType = 'text';
                if (param.type == 'string') {
                    formType = 'select'
                }
                let param_json: any = {
                    vname: param.name,
                    name: param.name,
                    value: param.value,
                    type: formType,
                    fvalue: param.options,
                    visible: true,
                    edit: true,
                    callbak: this.onArgParamChanged.bind(this)
                }
                paramList.push(param_json);
            }
        } else {
            for (let param of p_param) {
                let formType = 'multiple_select';
                let s_value: any = param.value;
                if (param.type != 'string') {
                    formType = 'range_input';
                }
                let param_json: any = {
                    vname: param.name,
                    name: param.name,
                    value: s_value,
                    type: formType,
                    fvalue: param.options,
                    visible: true,
                    edit: true,
                    callbak: this.onArgParamChanged.bind(this)
                }
                paramList.push(param_json);
            }
        }

        // name이 parameter인 객체를 찾기
        const s_index = this.oModelFormData.findIndex(item => item.name === 'parameter');

        if (s_index !== -1) {
            // name이 parameter인 객체가 존재하면 value 값을 변경
            this.oModelFormData[s_index].value = paramList;
        } else {
            let param_json: any = {
                vname: 'parameter',
                name: 'parameter',
                value: paramList,
                type: 'parameter',
                fvalue: '',
                visible: false,
                edit: true,
                callbak: null
            }
            // name이 parameter인 객체가 없으면 새 객체를 추가
            this.oModelFormData.push(param_json);
        };
    }




    async loadModelInfo() {
        this.o_argType = this.oWpData.modelInfo.model['ARG_TYPE'];
        this.o_argId = this.oWpData.modelInfo.model['ARG_ID'];
        this.o_optYn = this.oWpData.modelInfo.model['OPT_YN'];
        this.o_argNm = this.oWpData.modelInfo.model['ARG_NM'];
        this.o_argParam = this.oWpData.modelInfo.defaultParam;
        // 이미지
        if (this.o_argType === 'Image') {
            this.oWpData.scaleInfo = 'No Scale';
            this.oWpData.target_column = 'No Target';
            this.oModelFormData.forEach(item => {
                if (['optimizer', 'target_column', 'scaleInfo'].includes(item.name)) {
                    item.visible = false;
                }
                if (item.name === 'partitionType') {
                    item.edit = false;
                }
            });
        }

        if(this.o_argNm == 'Custom') {
            this.o_customArgParam = await this.oWpTrainModelSvc.getArgParam(this.o_argId);
            this.o_customArgParam = JSON.parse(this.o_customArgParam[0]['PARAM']);
            this.o_customModelList = await this.oWpTrainModelSvc.getTrainCustomModelList();
            this.oModelFormData.forEach(item => {
                if (item.name === 'customModelname') {
                    item.visible = true;   
                    item.fvalue = this.o_customModelList.map((model:any) => model.MODEL_NM);
                }
            });
            this.o_frameworkType = this.oWpData.customModelInfo.frameworkType;
            this.o_argType = this.oWpData.customModelInfo.argType;
            console.log("this.o_argType : ", this.o_argType);
        }
        this.oModelFormData.forEach(item => {
            if (item.name === 'optimizer') {
                item.visible = this.o_optYn === 'Y' ? true : false;
            }
        });
        this.setParamInfo(this.oWpData.parameter, this.oWpData.optimizer);
        if (this.oWpData.modelSave == true) {
            // this.setSaveOption(this.oWpData.saveOpt);
            let s_overwriteFlag = this.oWpData.saveOpt == 'new' ? false : true;
            this.oWpData.modelname = '';
            // this.oWpData.overwrite_modelname = '';/
            // this.oWpData.viewid = 1; //초기값 수정
            // this.oWpData.viewidx = 1;
            if(s_overwriteFlag == true && this.o_overwriteList == null) {
                this.o_overwriteList = await this.oWpTrainModelSvc.getOverwriteModelList();
            }
            this.oFormData.forEach(sForm => {
                if (sForm.name == 'saveOpt') { //덮어쓸 대상 데이터
                    sForm.edit = true;
                    sForm.visible = true;
                }
                //#136 saveOpt에 따라 신규 파일명 입력 / 덮어쓸 파일 선택 표시
                if (sForm.name == 'overwrite_modelname') { // 기존 파일 목록
                    sForm.edit = s_overwriteFlag;
                    sForm.visible = s_overwriteFlag;
                    sForm.fvalue = this.o_overwriteList;
                }
                if (sForm.name == 'new_modelname') { // 신규 파일명 입력
                    sForm.edit = !s_overwriteFlag;
                    sForm.visible = !s_overwriteFlag;
                }
            });
        }

        if(this.oWpData.optimizer == true) {
            this.oFormData.forEach(sForm => {
                if (sForm.name == 'optimizerType') { //덮어쓸 대상 데이터
                    sForm.edit = true;
                    sForm.visible = true;
                }
            });
        }
    }

    public async onCustomFormChanged(p_ev: any, p_form: any) {

        if(this.oWpData.customModelname !== p_ev.selectedItem) {
            this.oWpData.target_column = '';
            let s_selectedCustomModel = this.o_customModelList.find((model:any) => model.MODEL_NM === p_ev.selectedItem);
            this.oWpData.customModelInfo = {
                modelname: s_selectedCustomModel.MODEL_NM,
                modelId: s_selectedCustomModel.MODEL_ID,
                modelIdx: s_selectedCustomModel.MODEL_IDX,
                frameworkType: s_selectedCustomModel.FRAMEWORK_TYPE,
                argType: s_selectedCustomModel.ARG_TYPE,
                customTrain: false
            }
            this.oWpData.customModelInfo.customTrain = await this.oWpTrainModelSvc.checkCustomModelTrain(s_selectedCustomModel);
   
            this.oWpData.customModelname = this.oWpData.customModelInfo.modelname;
            this.oModelFormData.forEach(item => {
                if (this.o_customOnOffForm.includes(item.name)) {
                    item.visible = true; 
                }
            });
            this.o_frameworkType = this.oWpData.customModelInfo.frameworkType;
            this.o_argType = this.oWpData.customModelInfo.argType;

            
            
            // target컬럼 세팅
            let sColList: any = [];
            if (this.o_argType == 'Clustering') {
                sColList = ['[미선택]'];
            } else {
                sColList = Object.keys(JSON.parse(this.oWpData.analysisColInfo));
            }
            this.oFormData.map((e) => {
                if (e.name == 'target_column') {
                    e.fvalue = sColList;
                }
            });
            if (this.oWpData.customModelInfo.customTrain == false) {
                this.o_argParam = this.o_customArgParam[this.o_frameworkType][this.o_argType];
                this.oWpData.modelInfo['defaultParam'] = this.o_argParam;
                if(this.o_argParam != undefined) {
                    await this.setParamInfo(this.o_argParam);
                }
            } else {
                this.o_argParam = this.o_customArgParam[this.o_frameworkType][this.o_argType]
                .filter((it: any) => it && (it.name === 'batch_size' || it.name === 'epochs'));
                    
                this.oWpData.modelInfo['defaultParam'] = this.o_argParam;
                if(this.o_argParam != undefined) {
                    await this.setParamInfo(this.o_argParam);
                }
            }
            
        }

    }




}