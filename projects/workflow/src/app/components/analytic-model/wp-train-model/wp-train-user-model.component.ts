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
import { DP_ARG_MSTR_ATT } from "projects/wp-server/metadb/model/DP_ARG_MSTR";
import { DP_ARG_PARAM_ATT } from "projects/wp-server/metadb/model/DP_ARG_PARAM";

export class WpTrainUserModelComponent extends WpComponent {
    oWpData: COM_ANALYTIC_ATT;
    oModelParamInfo: { [index: string]: any } = {};
    oWpTrainModelSvc: WpTrainModelService;
    oWpDiagramSvc: WpDiagramService;
    oWpAppSvc: WorkflowAppService;
    oWpDiagramPreviewSvc: WpDiagramPreviewService;
    oWpDiagramToolbarSvc: WpDiagramToolbarService;
    oModelType = ''; // 선택한 모델 유형
    oArgName = ''; // 선택한 모델 알고리즘명
    oComModelType = ''; // 컴포넌트의 모델 타입 (A-[modelname])
    h_maxParamSize = 5; // 파라미터 form 수
    oWpComSvc: WpComponentService;
    // 현재 모델 유형
    oChartArgType: string = undefined;
    oChartData: any
    oInfoGridDataObj: any = {};
    oInfoGridColObj: any = {};
    oInfoGridStyle: any = {};
    // 모델 결과 form
    oInfoFormData: WpPropertiesWrap[];
    oWpUserAlgorithmList:DP_ARG_MSTR_ATT[];
    oWpUserArgParamList:DP_ARG_PARAM_ATT[];
    oUserModelFormData: WpPropertiesWrap[];
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
        pWpUserAlgorithmList: DP_ARG_MSTR_ATT[],
        pWpUserArgParamList: DP_ARG_PARAM_ATT[]
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
        this.oWpUserAlgorithmList = pWpUserAlgorithmList;
        this.oWpUserArgParamList = pWpUserArgParamList;

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
        }];
        // 사용자 정의 모델 form 데이터
        this.oUserModelFormData = [
            {
                vname: '사용자 모델',
                name: 'userModel',
                value: '',
                type: 'select',
                fvalue: [],
                visible: true,
                edit: true,
                callbak: this.onChangeUserModel.bind(this),
            },
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
            {
                vname: '검증방식',
                name: 'partitionType',
                value: '',
                type: 'select',
                fvalue: ['학습-평가 데이터 분할'],
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


        this.setModelParamInfo()

        // 사용자 정의 모델일 경우
        let sHideForm = ['target_column', 'scaleInfo', 'partitionType', 'partitionValue'];

        // 가장 많은 user param 수 만큼 미리 만들어 둠.
        for (let sIndex = 0; sIndex < this.h_maxParamSize; sIndex++) {
            let sParamName = `param_${sIndex + 1}`;
            let sParamForm: any = {
                vname: `Param_${sIndex + 1}`,
                name: sParamName,
                value: '',
                type: '',
                fvalue: '',
                visible: true,
                edit: true,
                callbak: null
            }
            if (!this.oWpData[sParamName]) {
                this.oWpData[sParamName] = { value: '', option: ['', ''] }
            }
            this.oUserModelFormData.push(sParamForm)
            sHideForm.push(sParamName)
        }
        this.oWpData.partitionType = '학습-평가 데이터 분할';
        this.oWpData.partitionValue = '20';

        this.setFormData(this.oUserModelFormData);
        setTimeout(() => {
            if (!this.oWpData.modelInfo.model) {
                this.setHideParamForm(sHideForm);
            } else {
                this.setModelParamForm(false)
            }
        }, 150);
        
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
 
                        if (pData && pData.mode == 'excuteBefore') {
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
                        if (pData && pData.mode == 'selectData') {
                            this.initDervComViewId();
                            this.oComViewerSvc.showProgress(false);
                        }

                        if (!pData) {
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

    public setColList(pList: any) {
        let sColInfo: any = {};
        this.oSchema.schema.forEach((sCol: any) => sColInfo[sCol.name] = sCol.type);
        this.oWpData.analysisColInfo = JSON.stringify(sColInfo);
        let sColList = ['[미선택]', ...pList];
        if (this.oFormData){
            this.oFormData.map((e) => {
                if (e.name == 'target_column') {
                    e.fvalue = sColList;
                }
            });
        }
    }
    
    public setHideParamForm(pHideElemList: any[]) {
        // WpData를 초기화하고 해당 파라미터 입력 칸을 숨긴다.
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
        if (sShowElem){
            sShowElem.style.display = 'block';
        }
        if (pInnerText)
            sShowElem.getElementsByTagName('mat-label')[0]['innerText'] = pInnerText;
    }
    public setModelParamForm(sInitFlag:boolean) {
        try {
            let sArgId = this.oWpData.modelInfo.model.ARG_ID;
            let sSelectModel:any = this.oWpUserAlgorithmList.filter((sModel: any) => sModel.ARG_ID == sArgId)[0];
            let sSelectModelParams = this.oModelParamInfo[sSelectModel.ARG_ID];
            this.oWpData['modelInfo']['model'] = sSelectModel;
            this.oWpData['modelInfo']['params'] = sSelectModelParams;
            let sParamSize = sSelectModelParams.length;
            let sShowParamFormList: any[] = [] // 화면에 표시할 form 리스트. ex) [{id: param_1, innerText:표시할 텍스트명 }, ... ]
            let sHideParamList: string[] = [] // 화면에서 숨길 form 리스트. ex)  [param_1, ...]
            
            // 프로핏에서 만든 사용자 모델은 파라미터 설정이 가능하다.
            if (sSelectModel.BLOCK_YN == 'N') {
                // FORM 데이터 기존 파라미터 초기화
                for (let sIndex = 0; sIndex < sParamSize; sIndex++) {
                    let sParamName = 'param_' + (sIndex + 1); //param_1, param_2 ...
                    sShowParamFormList.push({ id: sParamName }); // 표시대상 리스트에 push.
                    if (sInitFlag) {
                        this.oWpData[sParamName] = { value: '', option: ['', ''] }; // 파라미터 값 초기화
                    }
                    let sParamInfo = sSelectModelParams[sIndex];

                    let sParamDefault
                    try {
                        sParamDefault = JSON.parse(sParamInfo.PARAM_VALUE)
                    } catch (error) {
                        sParamDefault = sParamInfo.PARAM_DEFAULT
                    }

                    let sDefaultValue = sParamDefault.VALUE; //기본 값
                    let sDefaultOption = sParamDefault.OPTION; //기본 범위 값
                    let sDefaultType = sParamDefault.TYPE; // 기본 타입

                    this.oFormData.forEach(sForm => {
                        if (sForm.name == sParamName) {
                            sForm.vname = sParamInfo.PARAM_NM; // form 표시 이름 설정
                            // form Type 설정
                            if (sDefaultType == 'STR') {
                                sForm.type = 'select'; // STR 타입은 최적화할 경우 다중선택 아니면 단일선택
                                sForm.fvalue = sDefaultOption;
                            } else {
                                sForm.type = 'text'; // 숫자 타입은 최적화할 경우 범위로 입력 아니면 그냥 입력.
                            }
                        }
                        if (sForm.name == 'modelName') {
                             sForm.visible = this.oWpData.modelSave;
                        }
                    })

                    // 초기 값 설정
                    if (sInitFlag){
                        this.oWpData[sParamName]['value'] = sDefaultValue; // 기본값으로 초기값을 설정
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

                // 검증 방법, 검증 비율 칸 표시하도록 추가(군집 제외)
                if (this.oWpData.modelType !== 'Clustering') {
                    sShowParamFormList = sShowParamFormList.concat([{ id: 'partitionType' }, { id: 'partitionValue' }]);
                } else {
                    sHideParamList = sHideParamList.concat(['partitionType', 'partitionValue']);
                }

                // (UI 반영) 파라미터 길이 범위를 넘어가는 파라미터 form 은 숨긴다.
                this.oFormData.forEach(sForm => {
                    if (sForm.name.includes('param_') && Number(sForm.name.replace('param_', '')) > sParamSize){
                        sHideParamList.push(sForm.name);
                    }
                })
            } 
            // 플랫폼에서 만든 모델.
            if (sSelectModel.BLOCK_YN == 'Y') {
                //플랫폼 레이어 모델은 사용자가 파라미터 추가로 수정할 수 없다.
                this.oFormData.forEach(sForm => {
                    if (sForm.name.includes('param_')) {
                        sHideParamList.push(sForm.name);
                        this.oWpData[sForm.name] = { value: '', option: ['', ''] }; 
                    }
                    if (sForm.name == 'modelName') {
                         sForm.visible = this.oWpData.modelSave;
                    }
                })
                sShowParamFormList = [{ id: 'partitionType' }, { id: 'partitionValue' }]
            }

            setTimeout(async () => {
                if (sHideParamList.length > 0) {
                    this.setHideParamForm(sHideParamList);
                }
                // (UI 반영) 모델별 파라미터 값 표시
                for await (const sForm of sShowParamFormList) {
                    await this.setShowParamForm(sForm.id, sForm.innerText);
                }
            }, 100);

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
            let sParamName = this.oFormData.filter(sForm => sForm.name == pName)[0]['vname'];
            let sParamInfo = this.oModelParamInfo[this.oWpData.modelInfo.model.ARG_ID].filter((sParam: any) => sParam.PARAM_NM == sParamName)[0];
            console.log(sParamInfo)
            // PARAM_DEFAULT의 1) TYPE 기준으로 체크. 
            let sParamDefault
            try {
                sParamDefault = JSON.parse(sParamInfo.PARAM_DEFAULT)
            } catch (error) {
                sParamDefault = sParamInfo.PARAM_DEFAULT
            }
            let sType = sParamDefault.TYPE;
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
                this.oWpData[pName].value = sValidResult.result;
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

        let sSelectedColumn = this.oSchema.schema.filter((sCol: any) => sCol.name == sSelectColumn)[0];
        
        if (sSelectColumn == '[미선택]') {
            sTmpType = 'Clustering';
        }
        else if (sSelectedColumn.type == 'string' || sSelectedColumn.type == 'text') {
            sTmpType = 'Classification';
        }
        else {
            sTmpType = 'Regression';
        }
        // 기존에 선택했던 것과 다를 경우
        if (this.oModelType !== sTmpType) {
            this.oComViewerSvc.showMsg(`${this.oModelType} 유형 모델에서 선택 불가능한 컬럼입니다. 다른 컬럼을 선택해주세요`, false);
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
    public setModelParamInfo() { 
        this.oUserModelFormData.forEach(sForm => {
            if (sForm.name === 'userModel') {
                sForm.fvalue = this.oWpUserAlgorithmList.map((sModel: DP_ARG_MSTR_ATT) => `${sModel.ARG_NM} (${sModel.ARG_TYPE})`);
            }
        })
        let sArgIdList: number[] = [];
        this.oWpUserAlgorithmList.forEach((sModel: any) => {
            sArgIdList.push(sModel.ARG_ID);
            this.oModelParamInfo[sModel.ARG_ID] = [];
        })
        this.oWpUserArgParamList.forEach((pArgResult: any) => {
            if (sArgIdList.includes(pArgResult['ARG_ID'])) {
                pArgResult['PARAM_DEFAULT'] = pArgResult['PARAM_DEFAULT'];
                pArgResult['PARAM_VALUE'] = pArgResult['PARAM_VALUE'];
                this.oModelParamInfo[pArgResult['ARG_ID']].push(pArgResult);
            }
        })
        Object.values(this.oModelParamInfo).forEach(sVal => {
            if (sVal.length > this.h_maxParamSize) {
                this.h_maxParamSize = sVal.length;
            }
        })
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

    async onChangeUserModel(pEvent: any) {
        let sSelectIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sSelectModel = this.oWpUserAlgorithmList[sSelectIndex];
        let sSelectModelParams = this.oModelParamInfo[sSelectModel.ARG_ID];
        this.oWpData['modelInfo']['model'] = sSelectModel;
        this.oWpData['modelInfo']['params'] = sSelectModelParams;
        this.setModelType(sSelectModel.ARG_TYPE)
        this.setModelParamForm(true)
        let showFormNameList = this.oFormData.map(sForm => sForm.name);
        for await (const sForm of showFormNameList) {
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
}