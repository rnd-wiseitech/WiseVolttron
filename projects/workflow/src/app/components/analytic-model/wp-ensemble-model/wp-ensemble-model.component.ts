import { COM_ENSEMBLE_MODEL_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpEnsembleModelData } from 'projects/wp-server/util/component/analytic/wp-ensemble-model';
import { MatDialog } from '@angular/material/dialog';
import { WpPropertiesWrap, dxSelectChangeEvent } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpEnsemblePopupComponenet } from '../../popup/wp-ensemble-popup.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpTrainModelService } from '../wp-train-model/wp-train-model.service';
import { TranslateService } from '@ngx-translate/core';
import { WpDiagramPreviewService } from "../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service";
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
/**
 * 모델 학습 - 앙상블 모델 컴포넌트 클래스
 * 
 * 앙상블 모델 학습 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpEnsembleModelData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 앙상블 모델 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpEnsembleModelData | WpEnsembleModelData}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * @params {@link WpDiagramService | WpDiagramService}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpEnsembleModelComponent(this.cComViewSvc, this.oComponentData, this.cWpAppSvc, this.cWpDiagramSvc, this.matDialog);
 * ```
 */
export class WpEnsembleModelComponent extends WpComponent {
    oWpData: COM_ENSEMBLE_MODEL_ATT;
    oWpAppSvc: WorkflowAppService;
    oWpDiagramSvc: WpDiagramService;
    oDialog: MatDialog;
    oWpDiagramPreviewSvc: WpDiagramPreviewService;
    oWpTrainModelSvc: WpTrainModelService;
    oInfoFormData: WpPropertiesWrap[];
    oInfoGridDataObj: any = {};
    oInfoGridColObj: any = {};
    oInfoGridStyle: any = {};
    oChartArgType: string = undefined;
    oChartData: any;
    cTransSvc: TranslateService;


    o_argInfo: any;
    o_argType: string;
    o_argId: number;
    o_optYn: string = 'N';
    o_overwriteList: any = null;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpEnsembleModelData,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramSvc: WpDiagramService,
        pDiaglog: MatDialog,
        p_wpTrainModelSvc: WpTrainModelService,
        pWpDiagramPreviewSvc: WpDiagramPreviewService,
        p_argInfo: any
    ) {
        super(pComViewerSvc, pWpData);
        this.cTransSvc = pTransSvc;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramPreviewSvc = pWpDiagramPreviewSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpData.comId = this.oComId;
        this.oDialog = pDiaglog;
        //WPLAT-362
        this.oWpTrainModelSvc = p_wpTrainModelSvc;
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
        this.setFormData([{
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
        {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info61"),
            name: 'target_column',
            value: '',
            type: 'select',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: this.onArgFormChanged.bind(this),
        },{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info100"),
            name: 'predictProba',
            value: '',
            type: 'checkbox',
            fvalue: '',
            visible: false,
            edit: true,
            callbak: this.setProbaDiagramPreview.bind(this)
        },{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info71"),
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
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info75"),
            name: 'partitionValue',
            value: '',
            type: 'text',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: this.onArgFormChanged.bind(this),
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info76"),
            name: 'modelBtn',
            value: '',
            type: 'button',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: this.onBtnClick.bind(this),
        },
    
        ]);
        // new Promise((resolve, reject) => {
        //     setTimeout(() => {
        //         this.setShowProba('None');
        //         resolve(true);
        //     }, 100);
        // });

        if (this.oWpData.modelInfo.model) {
            console.log("기존 모델 타입 존재");
            this.loadModelInfo();
        }
        else {
            console.log("기존 모델 타입 없음");
            console.log("this.oFormData : ", this.oFormData);
            // this.onInitParamForm();
            this.setModelInfo(this.o_argInfo);
        }
    }
    // 검증 방식 변경시 기본 검증 값 변경
    public async onPartitionTypeChanged(pEvent: any) {
        let sHideElem = document.getElementById(COM_ID['A-ENSEMBLE'] + '_partitionValue');
            sHideElem.style.display = '';
        let sTmpValue = this.oWpData.partitionType;
        if (sTmpValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97"))
            this.oWpData.partitionValue = '20';
        else if (sTmpValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"))
            this.oWpData.partitionValue = '5';
        else {
            let sHideElem = document.getElementById(COM_ID['A-ENSEMBLE'] + '_partitionValue');
            sHideElem.style.display = 'none';
            this.oWpData.partitionValue = "";
        }
        
    }
    onBtnClick(){
        if (this.oWpData.target_column) {
            const dialogRef = this.oDialog.open(WpEnsemblePopupComponenet, {
                id: 'wp-ensemble-popup',
                width: '1000px',
                data: { 
                    argType: this.oWpData.modelType,
                    estimators: this.oWpData.parameter,
                }
            });
            dialogRef.afterClosed().subscribe(pRes => {
                if (pRes) {
                    this.oWpData.parameter = pRes;
                }
            });
        } else {
            this.oWpAppSvc.showMsg('타겟 컬럼을 설정해주세요', false);
        }

    }
    onScaleInfoChanged(pEvent: any) {

    }    
    public setProbaDiagramPreview() {
        let sComData;
        sComData = this.oWpAppSvc.getComData(this.oComId);
        sComData = this.oWpDiagramSvc.getDeriveSchema(sComData); 
        this.oWpDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sComData, 'sCurrDataFlag': true });
    }
    public setShowProba(pModelType:string) {
        let sElem = document.getElementById(COM_ID['A-ENSEMBLE'] + '_predictProba');
        if (pModelType == 'Classification'){ 
            sElem.style.display = ''; 
        }
        else{ 
            sElem.style.display = 'none';
            this.oWpData.predictProba = false
            this.setProbaDiagramPreview()
        }        
    }
    onModelSave(pFlag: any){
        this.oWpData.modelName = '';
        this.oFormData.forEach(sForm => {
            if (sForm.name == 'modelName') {
                sForm.visible = pFlag;
            }
        })
    }
    onTargetColumnChanged(pEvent: dxSelectChangeEvent){
        let sSelectColumn = this.oWpData.target_column;
        // let sSelectedColumn = this.oSchema.schema.filter((sCol: any) => sCol.name == sSelectColumn)[0];
        //     if (sSelectedColumn.type == 'string' || sSelectedColumn.type == 'text') {
        let sColType = this.oWpData.chkSchema[sSelectColumn];
        if (sColType == 'string' || sColType == 'text') {
        
            this.oWpData.modelType = 'Classification';
        }
        else {
            this.oWpData.modelType = 'Regression';
        }
        // this.setShowProba(this.oWpData.modelType)
    }
    public setColList(pList: any) {
        let sColInfo: any = {};
        this.oSchema.schema.forEach((sCol: any) => sColInfo[sCol.name] = sCol.type);
        // this.oWpData.analysisColInfo = JSON.stringify(sColInfo);
        this.oWpData.chkSchema = sColInfo;
        let sColList: any = [];
        if (this.o_argType == 'Clustering') {
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
    public onParamValueChanged(pEvent: any, pName: any) {
        let sParamValue = pEvent.srcElement.value;
        let sValidResult = { isValid: true, result: sParamValue };
        if (pName == 'partitionValue') {
            sValidResult = this.oWpData.partitionType == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97") ? sValidResult = this.isValidNumber(sParamValue, 'integer') : sValidResult = this.isValidNumber(sParamValue, 'double');
            if (!sValidResult.isValid) {
                this.oComViewerSvc.showMsg(`검증 비율에 유효한 값을 입력해주세요`, false);
                pEvent.srcElement.value = sValidResult.result;
            }
        } 
    }
    // WPLAT-362
    onChangeTab(pTabName: 'Configuation' | 'Info') {
        let sConfElem: HTMLElement = document.querySelector('wp-component-viewer > .component-configuration');
        if (pTabName == 'Info') {
            // 분석 결과 Info 탭 너비 키움.
            sConfElem.style.width = '500px';
            let sWkDiagramId = this.oWpAppSvc.getWkId();
            // 현재 워크플로우 ID, 컴포넌트 ID를 기준으로 분석 결과 조회.
            // let sToolbarWkId = this.oWpDiagramToolbarSvc.getLoadWkTitle()
            // let sWfId = sToolbarWkId.wf_id ? sToolbarWkId.wf_id : undefined;
            // 툴바 서비스에서 기존 워크플로우 ID 를 받아오고.. 그 워크플로우 컴포넌트 데이터랑 동일한 설정값인지 체크해서 
            // 동일하다면 그 값으로 가져오게 해야 함.
            this.oWpDiagramSvc.getModelResult([this.oComId]).then((pResult: any) => {
                if (pResult.length > 0) {
                    let s_rawResult = pResult[0];
                    let s_modelResult = JSON.parse(s_rawResult['MODEL_RESULT'])
                    let sResult = this.oWpTrainModelSvc.getModelResultGridData(s_modelResult);
                    if (sResult.gridCol.length > 0 && sResult.gridData) {
                    //     // 모델 정보 form value
                        let sModelType = s_modelResult.argInfo.ARG_TYPE;
                        let sModelTypeKor: '분류' | '회귀' | '군집' = sModelType === 'Classification' ? '분류' : sModelType === 'Regression' ? '회귀' : '군집';
                        let sModelInfo = [
                            `모델명 - ${s_modelResult.modelname}`,
                            `${sModelTypeKor} 알고리즘 - ${s_modelResult.argInfo.ARG_NM}`
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


    public async onArgFormChanged(p_ev: any, p_form: any) {
        let s_formName = p_form.name;
        let s_formValue: any;
        let s_formType = p_form.type;
        let s_wpValue = this.oWpData[s_formName];

        if (s_formType == 'select') {
            s_formValue = p_ev.selectedItem;
        } else if (['checkbox', 'button_toggle'].includes(s_formType)) {
            s_formValue = p_ev;
        } else {
            s_formValue = p_ev.srcElement.value;
        }

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
        } else if (s_formName == 'partitionType') {
            this.oFormData.forEach(sForm => {
                if (sForm.name == 'partitionValue') {
                    sForm.visible = (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info99") ? false : true);
                }
            })
            if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97"))) {
                this.oWpData.partitionValue = '20'
            } else if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"))) {
                this.oWpData.partitionValue = '5'
            } else if ((s_formValue != this.oWpData[s_formName]) && (s_formValue == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info98"))) {
                this.oWpData.partitionValue = '1'
            }
        } 
        // else if (s_formName == 'optimizer') {
        //     this.oFormData.forEach(async sForm => {
        //         if (sForm.name == 'parameter') {
        //             let s_copyParam = JSON.parse(JSON.stringify(this.o_argParam));
        //             if (s_formValue == true) {
        //                 s_copyParam.forEach((item: any) => {
        //                     item.value = item.options;
        //                     if (item.type == 'integer') {
        //                         item.value = [item.options[0], item.options[0] + 3]
        //                     } else if (item.type == 'float') {
        //                         item.value = [item.options[0], item.options[0] + 0.3]
        //                     }
        //                 });
        //             }
        //             await this.setParamInfo(s_copyParam, s_formValue);
        //         }
        //         // 최적화체크하면 최적화타입 보이게
        //         if (sForm.name == 'optimizerType') {
        //             if (s_formValue) {
        //                 sForm.visible = true;
        //             } else {
        //                 sForm.visible = false;
        //             }
        //         }
        //     })
        // }


        const validations = [
            () => ['new_modelname'].includes(p_form.name) ? this.isValidString(s_formValue, 'tableNm') : { isValid: true },
            () => ['partitionValue'].includes(p_form.name) ? this.isValidNumber(s_formValue, 'integer') : { isValid: true },
            () => this.isValidExtra(s_formValue, p_form, s_formName),
        ];
        for (const validate of validations) {
            const result: any = await validate();
            if (!result.isValid) {
                s_wpValue = '';
                this.oWpData[s_formName] = s_wpValue;
                if (result['result'] == "") {
                    this.oComViewerSvc.showMsg(`${p_form.name}에 유효한 값을 입력해주세요`, false);
                } else {
                    this.oComViewerSvc.showMsg(result['result'], false);
                }
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

        this.oWpData[s_formName] = s_formValue;
        p_form.value = s_formValue;
    }

    async isValidExtra(p_value: any, p_form: any, p_formname: string) {
        let s_isValid = { isValid: true, result: p_value };
        // if (p_formname == 'parameter') {
        //     if (p_form.type == 'text' || p_form.type == 'range_input') {
        //         if ((p_value < Number(p_form.fvalue[0])) || p_value > Number(p_form.fvalue[1])) {
        //             s_isValid = { isValid: false, result: `사용 가능한 값은 ${p_form.fvalue[0]} ~ ${p_form.fvalue[1]} 사이입니다.` };
        //         }
        //     }
        //     if (p_form.type == 'multiple_select') {
        //         if (p_value.length < 1) {
        //             s_isValid = { isValid: false, result: `최소 1개 이상의 값을 선택해야 합니다.` };
        //         }
        //     }

        //     if (p_form.type == 'range_input') {
        //         if (Number(p_form.value[0]) > Number(p_form.value[1])) {
        //             s_isValid = { isValid: false, result: `최적화 값 범위를 제대로 지정해주십시오.` };
        //         }
        //     }
        // } else 
        if (p_formname == 'new_modelname') {
            let s_checkModelName: any = await this.oWpTrainModelSvc.checkModelName(p_value);
            if (s_checkModelName.length > 0) {
                s_isValid = { isValid: false, result: `해당 모델명이 존재합니다.` };
            }
        } else if (p_formname == 'target_column' && p_value != null) {
            let s_selectColType = this.oWpData.chkSchema[p_value];
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
            // this.setChkSchema();
            // this.oComViewerSvc.showDiagramPreview(this.oComId, true);
        }

        return s_isValid;
    }

    async setModelInfo(p_argInfo: any) {
        this.o_argType = p_argInfo['ARG_TYPE'];
        this.o_argId = p_argInfo['ARG_ID'];
        this.o_optYn = p_argInfo['OPT_YN'];
        this.oWpData.partitionType = this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info97");
        this.oWpData.partitionValue = '20';
        this.oWpData.modelInfo['model'] = p_argInfo;
        this.oWpData.modelType = this.o_argType;
        this.oWpData.parameter = [];
    }

    async loadModelInfo() {
        this.o_argType = this.oWpData.modelInfo.model['ARG_TYPE'];
        this.o_argId = this.oWpData.modelInfo.model['ARG_ID'];
        this.o_optYn = this.oWpData.modelInfo.model['OPT_YN'];
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
    }

}
