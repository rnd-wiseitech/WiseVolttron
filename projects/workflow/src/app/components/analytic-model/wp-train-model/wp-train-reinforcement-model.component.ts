import { WpComponentViewerService } from "../../wp-component-viewer.service";
import * as _ from "lodash";
import { WpComponent } from "../../wp-component";
import { WpTrainModelService } from "./wp-train-model.service";
import { WpDiagramService } from "../../../wp-diagram/wp-diagram.service";
import { WorkflowAppService } from "../../../app.service";
import { WpComponentService } from "../../wp-component.service";
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { WpPropertiesWrap } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpDiagramToolbarService } from "../../../wp-menu/wp-diagram-toolbar/wp-diagram-toolbar.service";
import { COM_ANALYTIC_ATT } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpTrainModelData } from "projects/wp-server/util/component/analytic/wp-train-model";
import { DP_ARG_PARAM_ATT } from "projects/wp-server/metadb/model/DP_ARG_PARAM";
import { MatDialog } from "@angular/material/dialog";
import { WpReinforcementActiveSetComponent } from "../../popup/wp-reinforcement-active-set.component";
import { WpReinforcementRewardSetComponent } from "../../popup/wp-reinforcement-reward-set.component";

export class WpTrainReinforcementModelComponent extends WpComponent {
    oWpData: COM_ANALYTIC_ATT;
    oModelInfo: any = [];
    oModelParamInfo: { [index: string]: any } = {};
    oWpTrainModelSvc: WpTrainModelService;
    oWpDiagramSvc: WpDiagramService;
    oWpAppSvc: WorkflowAppService;
    oWpDiagramPreviewSvc: WpDiagramPreviewService;
    oWpDiagramToolbarSvc: WpDiagramToolbarService;
    oDefaultModelTypeList: any = []; // 현재 모델 컴포넌트의 가능한 유형 (예: RandomForest : ['분류', '회귀'], Kmeans : ['군집'])
    oModelType = ''; // 선택한 모델 유형
    oArgName = ''; // 선택한 모델 이름
    oComModelType = ''; // 컴포넌트의 모델 타입 (A-[modelname])
    oDefaultHideElemList: any = [];
    h_notOptList = [12, 18, 20, 26, 27, 28, 29, 30, 31, 32, 33]; //#34 최적화 사용하지 않는 알고리즘들의 id (출처 wiseprophet model-selection.component.ts)
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
    o_actionVariable: any = [];
    o_dialog: MatDialog;
    constructor(
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpTrainModelData,
        pWpTrainModelSvc: WpTrainModelService,
        pWpDiagramSvc: WpDiagramService,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramPreviewSvc: WpDiagramPreviewService,
        pArgName: string,
        pComModelType: string,
        pWpComSvc: WpComponentService,
        pWpDiagramToolbarSvc: WpDiagramToolbarService,
        pDiaglog: MatDialog
    ) {
        super(pComViewerSvc, pWpData);
        this.oWpTrainModelSvc = pWpTrainModelSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramPreviewSvc = pWpDiagramPreviewSvc;
        this.oWpDiagramToolbarSvc = pWpDiagramToolbarSvc;
        this.oWpComSvc = pWpComSvc;
        this.oArgName = pArgName;
        this.oComModelType = pComModelType;
        this.oWpData.argName = pArgName;
        this.oWpData.comId = this.oComId;
        this.o_dialog = pDiaglog;
        this.oInfoFormData = [{
            vname: '모델 요약',
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
            vname: '모델 실행 결과',
            name: 'model_result',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: '변수 영향도',
            name: 'model_influence',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
            // }, {
            //     vname: '변수 중요도',
            //     name: 'feature_import',
            //     value: '',
            //     type: 'grid',
            //     fvalue: [],
            //     visible: true,
            //     edit: true,
            //     callbak: undefined
        }];
        // 일반 모델 form 데이터
        this.oModelFormData = [
            {
                vname: '실행 모델 저장',
                name: 'modelSave',
                value: '',
                type: 'checkbox',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onModelSave.bind(this),
            },
            {
                vname: '타겟컬럼',
                name: 'target_column',
                value: '',
                type: 'select',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onTargetColumnChanged.bind(this),
            },
            {
                vname: '표준화방식',
                name: 'scaleInfo',
                value: '',
                type: 'select',
                fvalue: [
                    'Standard Scale',
                    'MinMax Scale',
                    'Robust Scale',
                    'MaxAbs Scale',
                    'Normalize',
                    'No Scale',
                ],
                visible: true,
                edit: true,
                callbak: this.onScaleInfoChanged.bind(this),
            },
            // {
            //     vname: '최적화',
            //     name: 'optimizer',
            //     value: '',
            //     type: 'checkbox',
            //     fvalue: [],
            //     visible: true,
            //     edit: true,
            //     callbak: this.setOptimizer.bind(this),
            // },
            {
                vname: 'Param_1',
                name: 'param_1',
                value: '',
                type: 'select',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: null
            },
            {
                vname: 'Param_2',
                name: 'param_2',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null
            },
            {
                vname: 'Param_3',
                name: 'param_3',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null
            },
            {
                vname: 'Param_4',
                name: 'param_4',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null
            },
            {
                vname: 'Param_5',
                name: 'param_5',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null
            },
            {
                vname: '검증방식',
                name: 'partitionType',
                value: '',
                type: 'select',
                fvalue: ['학습-평가 데이터 분할', '교차 검증'],
                visible: true,
                edit: true,
                callbak: this.onPartitionTypeChanged.bind(this)
            },
            {
                vname: '검증비율',
                name: 'partitionValue',
                value: '',
                type: 'text',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null,
            },
            {
                vname: '모델 이름',
                name: 'modelName',
                value: '',
                type: 'text',
                fvalue: '',
                visible: false,
                edit: true,
                callbak: null,
            },
        ];

        this.setDefaultModelTypeList();
        // 사용자 정의 모델일 경우
        this.setFormData(this.oModelFormData);
        this.setHideElemList(['param_1', 'param_2', 'param_3', 'param_4', 'param_5', 'partitionType', 'partitionValue']);

        // 기존 모델 타입 존재할 경우
        if (this.oWpData.modelInfo.model) {
            this.setModelType(this.oWpData.modelInfo.model.ARG_TYPE);
            this.setModelParamInfo(this.oModelType).then(() => {
                this.setModelParamForm(this.oArgName);
            });
            this.setOptimizer(this.oWpData.optimizer);
        }
        else {
            this.onInitParamForm();
        }
        // #203 기존에 viewTable 조회한 이력이 있는 경우 -> 조회했던 테이블 결과로 할당.
        if (this.oWpData.usetable_info.viewtable && this.oWpData.usetable_info.viewtable !== "") {
            console.log('ㅎㅇㅎㅇㅎㅇㅎㅇㅎㅇㅎㅇㅎ');
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
                                            this.setComViewId(pResult['pViewId']); // 분석 컴포넌트 이전까지 실행해서 생긴 viewId
                                            this.setViewTable(this.oWpData.usetable_info.usetable, false); // viewId로 조회
                                        } else {
                                            pMsg = '분석 컴포넌트 데이터 조회 에러가 발생하였습니다.'
                                            this.initDervComViewId();
                                            this.oComViewerSvc.showMsg(pMsg, false);
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
                            this.oWpDiagramSvc.sendReinforcementResult(true);
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
        // try {
        //     let sDerivedFlag = this.oWpDiagramSvc.chkParentDerivedComponent(this.oComId)
        //     if (sDerivedFlag) {
        //         this.oComViewerSvc.showProgress(true);
        //         this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
        //     } else {
        //         this.initDervComViewId();
        //     }
        // } catch (error) {
        //     console.log('preview')
        // }
    }
    public setDefaultModelTypeList() {
        this.oDefaultModelTypeList = ['Reinforcement']
    }
    public setHideElemList(pList: any) {
        this.oDefaultHideElemList = pList;
    }
    public getHideElemList() {
        return this.oDefaultHideElemList;
    }
    public setModelType(pType: string) {
        this.oModelType = pType;
        this.oWpData.modelType = pType;
    }
    public getModelType() {
        return this.oModelType;
    }
    public onModelSave(pFlag: any) {
        this.oWpData.modelName = '';
        this.oFormData.forEach(sForm => {
            if (sForm.name == 'modelName') {
                sForm.visible = pFlag;
            }
        })
    }
    public onInitParamForm(pIndex?: any) {
        // #200 모델 검증 초기값 지정
        let sPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
                let sHideElemList = this.getHideElemList();
                this.setHideParamForm(sHideElemList);
                resolve(true);
            }, 100);
        });
        sPromise.then(() => {
            this.oWpData.partitionType = '학습-평가 데이터 분할';
            this.oWpData.partitionValue = '20';
        });
    }
    public setColList(pList: any) {
        let sColInfo: any = {};
        this.oSchema.schema.forEach((sCol: any) => sColInfo[sCol.name] = sCol.type);
        this.oWpData.analysisColInfo = JSON.stringify(sColInfo);
        let sColList = ['[미선택]', ...pList];
        this.oFormData.map((e) => {
            if (e.name == 'target_column') {
                e.fvalue = sColList;
            }
        });
    }
    public setHideParamForm(pHideElemList: any[]) {
        // WpData를 초기화하고 해당 파라미터 입력 칸을 숨긴다. #34 최적화 적용으로 value와 option으로 나누어서 설정
        pHideElemList.forEach((sElem: any) => {
            if (sElem.includes('param_')) {
                this.oWpData[sElem]['value'] = '';
                this.oWpData[sElem]['option'] = ['', ''];
            } else {
                this.oWpData[sElem] = sElem == 'optimizer' ? false : '';
            }
            let sHideElem = document.getElementById(`${this.oComModelType}_${sElem}`);
            sHideElem.style.display = 'none';
        });
    }
    public async setShowParamForm(pParamName: string, pInnerText?: string) {
        let sElemId = this.oComModelType + '_' + pParamName
        let sShowElem: any = await document.getElementById(`${sElemId}`);
        if (sShowElem) {
            sShowElem.style.display = 'block';
        }
        if (pInnerText)
            sShowElem.getElementsByTagName('mat-label')[0]['innerText'] = pInnerText;
    }
    public async setModelParamForm(pModelName: string) {
        try {
            let sSelectModel = this.oModelInfo.filter((sModel: any) => sModel.ARG_NM.includes(pModelName))[0];
            let sSelectModelParams = this.oModelParamInfo[sSelectModel.ARG_ID];
            console.log("sSelectModelParams : ", sSelectModelParams);
            this.oWpData['modelInfo']['model'] = sSelectModel;
            this.oWpData['modelInfo']['params'] = sSelectModelParams;
            let sParamSize = sSelectModelParams.length;
            let sShowParamFormList: any[] = [] // 화면에 표시할 form 리스트. ex) [{id: param_1, innerText:표시할 텍스트명 }, ... ]
            let sHideParamList: string[] = [] // 화면에서 숨길 form 리스트. ex)  [param_1, ...]
            for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
                let sParamName = 'param_' + (sIndex + 1); //param_1, param_2 ...
                sShowParamFormList.push({ id: sParamName }); // 표시대상 리스트에 push.
                let sParamInfo = sSelectModelParams[sIndex];
                this.oFormData.forEach(sForm => {
                    console.log("sForm.name : ", sForm.name);
                    console.log("sParamName : ", sParamName);
                    if (sForm.name == sParamName) {
                        let sDefaultValue = sParamInfo.PARAM_DEFAULT.VALUE; //기본 값
                        let sDefaultOption = sParamInfo.PARAM_DEFAULT.OPTION; //기본 범위 값
                        let sDefaultType = sParamInfo.PARAM_DEFAULT.TYPE; // 기본 타입
                        sForm.vname = sParamInfo.PARAM_NM; // form 표시 이름 설정
                        // form Type 설정
                        if (sDefaultType == 'STR') {
                            sForm.type = this.oWpData.optimizer ? 'multiple_select' : 'select'; // STR 타입은 최적화할 경우 다중선택 아니면 단일선택
                            sForm.fvalue = sDefaultOption;
                        } else if (sDefaultType == 'BUTTON') {
                            sForm.type = 'button'; // STR 타입은 최적화할 경우 다중선택 아니면 단일선택
                            sForm.fvalue = sDefaultOption;
                            sForm.callbak = this.onSetReinforcementParam.bind(this)
                        } else {
                            sForm.type = this.oWpData.optimizer ? 'range_input' : 'text'; // 숫자 타입은 최적화할 경우 범위로 입력 아니면 그냥 입력.
                        }
                        // 초기 값 설정
                        if (this.oWpData[sParamName]['value'] == "")
                            this.oWpData[sParamName]['value'] = sDefaultValue; // 기본값으로 초기값을 설정
                        if (sDefaultType != 'BUTTON' && this.oWpData[sParamName]['option'][0] == '' && this.oWpData[sParamName]['option'][1] == '') {
                            this.oWpData[sParamName]['option'] = sDefaultOption; // 기본옵션 범위 초기값 설정
                            // #34 프로핏 최적화 범위 rule 적용
                            if (sDefaultType == 'INT' || sDefaultType == 'FLOAT') {
                                if (sDefaultOption[1] == 'INF') {
                                    if (isNaN(Number(sDefaultValue))) {
                                        this.oWpData[sParamName]['option'] = [3, 7];
                                    } else {
                                        this.oWpData[sParamName]['option'][0] = (Math.max(Number(sDefaultValue) - 2, Number(sDefaultValue))).toString();
                                        this.oWpData[sParamName]['option'][1] = (Number(sDefaultValue) + 2).toString();
                                    }
                                } else {
                                    this.oWpData[sParamName]['option'] = sDefaultOption;
                                }
                            }
                            if (sDefaultType == 'STR') {
                                this.oWpData[sParamName]['option'] = sDefaultOption;
                            }
                        }
                    }
                    if (sForm.name == 'modelName') {
                         sForm.visible = this.oWpData.modelSave;
                    }
                })
            }
            // 검증 방법, 검증 비율 칸 표시하도록 추가(군집 제외)
            if (this.oModelType !== 'Clustering') {
                sShowParamFormList = sShowParamFormList.concat([{ id: 'partitionType' }, { id: 'partitionValue' }]);
            } else {
                sHideParamList = sHideParamList.concat(['partitionType', 'partitionValue']);
            }
            // #34 최적화 여부 표시(프로핏 기준으로 최적화 할 수 있는 모델만 최적화 체크박스 표시)
            if (!this.h_notOptList.includes(this.oModelInfo[0].ARG_ID)) {
                sShowParamFormList.push({ id: 'optimizer' });
            } else {
                sHideParamList.push('optimizer');
            }
            // (UI 반영) 모델별 파라미터 값 표시
            for await (const sForm of sShowParamFormList) {
                this.setShowParamForm(sForm.id, sForm.innerText);
            }
            // (UI 반영) 파라미터 길이 범위를 넘어가는 파라미터 form 은 숨긴다.
            for (let sHideIndex = sParamSize + 1; sHideIndex <= 5; sHideIndex++) {
                sHideParamList.push('param_' + sHideIndex);
            }
            if (sHideParamList.length > 0) {
                this.setHideParamForm(sHideParamList);
            }
        } catch (error) {
            console.log(error);
        }
    }
    // #34 모델 파라미터 검증 추가
    public onParamValueChanged(pEvent: any, pName: any) {
        let sParamValue = pEvent.srcElement.value;
        let sValidResult = { isValid: true, result: sParamValue };
        if (pName == 'modelName') {
            sValidResult = this.isValidString(sParamValue, 'tableNm');
            if (!sValidResult.isValid) {
                this.oComViewerSvc.showMsg(`모델명에 유효한 값을 입력해주세요`, false);
                pEvent.srcElement.value = sValidResult.result;
            }
        } else if (pName == 'partitionValue') {
            sValidResult = this.oWpData.partitionType == '학습-평가 데이터 분할' ? sValidResult = this.isValidNumber(sParamValue, 'integer') : sValidResult = this.isValidNumber(sParamValue, 'double');
            if (!sValidResult.isValid) {
                this.oComViewerSvc.showMsg(`검증 비율에 유효한 값을 입력해주세요`, false);
                pEvent.srcElement.value = sValidResult.result;
            }
        } else {
            // 입력 파라미터 범위 검증
            let sName = pName.includes('_max') || pName.includes('_min') ? pName.replace('_max', '').replace('_min', '') : pName;
            let sParamName = this.oFormData.filter(sForm => sForm.name == sName)[0]['vname'];
            let sParmaInfo = this.oModelParamInfo[this.oModelInfo[0].ARG_ID].filter((sParam: any) => sParam.PARAM_NM == sParamName)[0];
            console.log(sParmaInfo)
            // PARAM_DEFAULT의 1) TYPE 기준으로 체크. 
            let sType = sParmaInfo.PARAM_DEFAULT.TYPE;
            if (sType == 'INT') {
                sValidResult = this.isValidNumber(sParamValue, 'integer');
            }
            if (sType == 'FLOAT') {
                sValidResult = this.isValidNumber(sParamValue, 'double');
            }
            if (!sValidResult.isValid) {
                this.oComViewerSvc.showMsg(`${sParamName}에 유효한 ${sType} 값을 입력해주세요`, false);
                pEvent.srcElement.value = sValidResult.result;
            } else {
                // 최솟값 바인딩
                if (pName.includes('_min')) {
                    this.oWpData[sName].option[0] = sValidResult.result;
                    // 최댓값 바인딩
                } else if (pName.includes('_max')) {
                    this.oWpData[sName].option[1] = sValidResult.result;
                    // 입력값 바인딩
                } else {
                    this.oWpData[pName].value = sValidResult.result;
                }
            }
        }
    }
    public onScaleInfoChanged(pEvent: any) {

    }
    // 검증 방식 변경시 기본 검증 값 변경
    public async onPartitionTypeChanged(pEvent: any) {
        let sTmpValue = this.oWpData.partitionType;
        if (sTmpValue == '학습-평가 데이터 분할')
            this.oWpData.partitionValue = '20';
        else if (sTmpValue == '교차 검증')
            this.oWpData.partitionValue = '5';
        else
            this.oWpData.partitionValue = "";
    }
    public async onTargetColumnChanged(pEvent: any) {
        let sTmpType;
        let sSelectColumn = this.oWpData.target_column
        if (sSelectColumn == '[미선택]') {
            sTmpType = 'Clustering';
        }
        else {
            let sSelectedColumn = this.oSchema.schema.filter((sCol: any) => sCol.name == sSelectColumn)[0];
            if (sSelectedColumn.type == 'string' || sSelectedColumn.type == 'text') {
                sTmpType = 'Reinforcement';
            }
            else {
                sTmpType = 'Regression';
            }
        }
        // 선택한 컬럼으로 가능한 분석(sTmpType)이 현재 모델에서 가능한지 확인
        console.log("this.oDefaultModelTypeList : ", this.oDefaultModelTypeList);
        if (this.oDefaultModelTypeList.includes(sTmpType)) {
            // 기존에 선택했던 것과 다를 경우
            if (this.oModelType !== sTmpType) {
                this.setModelType(sTmpType);
                this.setModelParamInfo(sTmpType).then(() => {
                    this.setModelParamForm(this.oArgName);
                })
            }
        }
        else {
            this.onInitParamForm();
            this.oComViewerSvc.showMsg(`${this.oArgName} 모델은 타겟 컬럼 ${sSelectColumn} 으로 적용할 수 없습니다.`, false);
            pEvent.component._clearValue();
            this.oWpData.target_column = '';
        }
        this.setChkSchema();
        this.oComViewerSvc.showDiagramPreview(this.oComId, true);
    }
    // #203 pLoadFlag: 기존 불러온 viewtable 정보 활용할 때.
    setViewTable(pViewId: string, pLoadFlag?: boolean) {
        if (pLoadFlag) {
            let sTmpData = this.getViewTableResult();
            // this.oSchema = sTmpData;
            // this.setDervComSchema(sTmpData['schema']);
            this.setChkSchema();
        }
        else {
            this.oWpDiagramSvc.viewTable(pViewId).then((pData: any) => {

                if (pData) {
                    // this.oSchema = pData // 조회한 파생열 정보로 설정.
                    this.setViewTableResult(pData)
                    // this.setDervComSchema(pData['schema']);
                    // this.setChkSchema();
                    // this.oComViewerSvc.showDiagramPreview(this.oComId, true);
                }
            })
        }
    }
    public setModelParamInfo(pModelType: string) { // (pModelType) 분류, 회귀, 군집 중 1
        return new Promise(async (resolve, reject) => {
            try {
                // 모델 리스트 할당하기
                let sModelList: unknown[];
                sModelList = await this.oWpTrainModelSvc.getWpAlgorithmList();
                this.oModelInfo = sModelList.filter((sCol: any) => sCol['ARG_TYPE'] == pModelType && sCol['ARG_NM'].includes(this.oArgName));
                let sParamList: DP_ARG_PARAM_ATT[] = await this.oWpTrainModelSvc.getWpArgParameterList();
                let sArgIdList: number[] = [];
                this.oModelInfo.forEach((sModel: any) => {
                    sArgIdList.push(sModel.ARG_ID);
                    this.oModelParamInfo[sModel.ARG_ID] = [];
                })
                sParamList.forEach((pArgResult: any) => {
                    if (sArgIdList.includes(pArgResult['ARG_ID'])) {
                        pArgResult['PARAM_DEFAULT'] = JSON.parse(pArgResult['PARAM_DEFAULT']);
                        pArgResult['PARAM_VALUE'] = JSON.parse(pArgResult['PARAM_VALUE']);
                        this.oModelParamInfo[pArgResult['ARG_ID']].push(pArgResult);
                    }
                })
                resolve(true);
            } catch (error: unknown) {
                reject(error);
                this.oComViewerSvc.showMsg((error as string), false);
            }
        })
    }
    // #203 실행한 Job을 통해서 생긴 viewId를 WpData에 저장
    setComViewId(pId: string) {
        // (usetable_info) usetable:groupid_jobid, schema:컬럼정보
        if (this.oWpData.usetable_info.usetable !== pId) {
            this.oWpData.usetable_info.usetable = pId;
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
        console.log("sUseTableSchema : ", sUseTableSchema);
        if (sUseTableSchema.length == 0)
            this.oSchema.schema.forEach((sCol: any) => sSchema[sCol['name']] = sCol['type']);
        else {
            sUseTableSchema.forEach((sCol: any) => sSchema[sCol['name']] = sCol['type']);
        }
        this.oWpData.chkSchema = sSchema;
    }
    // #203 불러온 viewTable의 조회 결과를 json string으로 변환해서 wp-data에 할당.
    setViewTableResult(pData: any) {
        console.log("Object.keys(pData).length : ", Object.keys(pData).length);
        let s_data = pData
        if (Object.keys(pData).length !== 0) {
            this.oWpData.usetable_info.usetable = s_data.viewname.match(/_(.+)/)[1];
            this.oWpData.usetable_info.schema = s_data.schema;
            this.oWpDiagramSvc.sendReinforcementResult(true);
        } else {
            this.oWpData.usetable_info.usetable = "";
        }
    }
    getViewTableResult() {
        return JSON.parse(this.oWpData.usetable_info.viewtable);
    }
    // #34 최적화 설정 추가
    setOptimizer(pOptimize: any) {
        this.oFormData.forEach(sForm => {
            // 최적화는 모델 파라미터 form에만 적용된다.
            if (sForm.name.includes('param_')) {
                if (sForm.type == 'select' || sForm.type == 'multiple_select') {
                    sForm.type = pOptimize ? 'multiple_select' : 'select'; // select box 는 최적화할경우 mutliple select로 바꿔야함.
                }
                if (sForm.type == 'text' || sForm.type == 'range_input') {
                    sForm.type = pOptimize ? 'range_input' : 'text'; // text 는 최적화 할경우 range_input (최소, 최대값) 입력하는 형태로 바꿔야함.
                }
            }
        })
    }
    async onChangeUserModel(pEvent: any) {
        let sSelectIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sSelectModel = this.oModelInfo[sSelectIndex];
        let sSelectModelParams = this.oModelParamInfo[sSelectModel.ARG_ID];
        this.oWpData['modelInfo']['model'] = sSelectModel;
        this.oWpData['modelInfo']['params'] = sSelectModelParams;
        this.oDefaultModelTypeList = [sSelectModel.ARG_TYPE]
        for await (const sForm of ['target_column', 'scaleInfo', 'partitionType', 'partitionValue']) {
            await this.setShowParamForm(sForm);
        }
    }
    // 탭 변경시 콜백 함수 추가 
    onChangeTab(pTabName: 'Configuation' | 'Info') {
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
                    let sResult = this.oWpTrainModelSvc.getModelResultGridData(pResult[0]);
                    if (sResult.gridCol.length > 0 && sResult.gridData) {
                        // 모델 정보 form value
                        let sModelType = pResult[0].MODEL_EVAL_TYPE;
                        let sModelTypeKor: '분류' | '회귀' | '군집' = sModelType === 'Classification' ? '분류' : sModelType === 'Regression' ? '회귀' : '군집';
                        let sModelInfo = [
                            `모델명 - ${pResult[0].MODEL_NM}`,
                            `${sModelTypeKor} 알고리즘 - ${pResult[0].ARG_NM}`
                        ];
                        this.oInfoFormData.forEach(sForm => {
                            if (sForm.name == 'model_info') {
                                sForm.fvalue = sModelInfo;
                            }
                        });
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

                        this.oInfoFormData.forEach(sForm => {
                            // if (sForm.name == 'feature_import') {
                            //     sForm.visible = sFeatureFlag;
                            // }
                            if (sForm.name == 'model_influence') {
                                sForm.visible = sInflunceFlag;
                            }
                        })

                        this.oComViewerSvc.setInfoFormData(this.oInfoFormData);
                        // 차트 유형 설정
                        this.oChartArgType = pResult[0].MODEL_EVAL_TYPE;
                        // 차트 데이터 설정
                        this.oChartData = this.oWpTrainModelSvc.getModelChartData(pResult[0]);
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

    async onSetReinforcementParam(pEvent: any) {
        let s_type = pEvent.target.innerHTML;
        try {
            this.oComViewerSvc.showProgress(true);
            this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
        } catch (error) {
            console.log("error : ", error);
        } finally {
            console.log("this.o_actionVariable : ", this.o_actionVariable);
            console.log("this.oWpData : ", this.oWpData);
            let s_subscribe = this.oWpDiagramSvc.sendReinforcementResultEmit.subscribe(async (pData: any) => {
                let s_dialogRef: any;
                if (s_type == 'action_variable') {
                    console.log("click action_variable");
                    if (this.oWpData['param_4'].value.length == 0) {
                        let s_param = {
                            groupId: this.oWpData.usetable_info.usetable.split('_')[0],
                            jobId: this.oWpData.usetable_info.usetable.split('_')[1],
                            target_column: this.oWpData.target_column
                        };

                        let s_data: any = await this.oComViewerSvc.getColDistinctValue(s_param);
                        console.log("s_data : ", s_data);
                        // .then((sResponse:any) =>{
                        s_data = JSON.parse(s_data)['data'];
                        this.oWpData['param_4'].value = []
                        for await (var data of s_data) {
                            let s_json = { "NAME": JSON.parse(data)[this.oWpData.target_column], "USE": true };
                            this.oWpData['param_4'].value.push(s_json);
                        }

                    }
                    s_dialogRef = this.o_dialog.open(WpReinforcementActiveSetComponent, {
                        width: '1400px',
                        data: this.oWpData['param_4'].value,
                        id: 'wp-active-set'
                    });

                } else {
                    console.log("click reward");
                    let s_code = "";
                    if(this.oWpData['param_5'].value == "") {
                        s_code = "\tif action == true_label:\n\t\treward = 5\n\telse :\n\t\treward = 0\n"
                    } else {
                        s_code = this.oWpData['param_5'].value;
                    };

                    let s_popupData = {
                        schema: this.oWpData.usetable_info.schema,
                        code: s_code,
                        usetable: this.oWpData.usetable_info.usetable,
                        excuteFlag: false,
                        result: {},
                        target_column:  this.oWpData.target_column
                      };
                    console.log("this.oWpData : ", this.oWpData);
                    console.log("s_popupData : ", s_popupData);
                    s_dialogRef = this.o_dialog.open(WpReinforcementRewardSetComponent, {
                      width: '100%',
                      data: s_popupData,
                      id: 'wp-reward-set'
                    });
                };

                s_dialogRef.afterClosed().subscribe((pRes: any) => {
                    if (pRes) {
                        if(s_type == 'action_variable') {
                            this.oWpData['param_4'].value = pRes;
                        } else {
                            this.oWpData['param_5'].value = pRes.code;
                            console.log("pRes : ", pRes);
                        }
                        // this.oWpData.parameter = pRes;
                    }
                    s_subscribe.unsubscribe();
                });

            });
        }

    }
}