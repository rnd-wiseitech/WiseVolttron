import { COM_ANALYTIC_ATT, COM_PREDICT_MODEL_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { DP_MODEL_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_MODEL_MSTR';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpTrainModelService } from '../wp-train-model/wp-train-model.service';
import { DP_VAR_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_VAR_MSTR';
import { WpPredictModelData } from 'projects/wp-server/util/component/analytic/wp-predict-model';
import { TranslateService } from '@ngx-translate/core';
import { WpToggleEvent } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
export interface IWkPredictModelData extends Pick<DP_MODEL_MSTR_ATT, "ARG_ID" | "MODEL_ID" | "MODEL_IDX" | "MODEL_NM" | "ARG_TYPE" | "REG_DATE" | "CUSTOM_YN" | "FRAMEWORK_TYPE"> {
    COM_ID?: string
};
/**
 * 모델 예측 - 모델 예측 컴포넌트 클래스
 * 
 * 모델 예측 컴포넌트를 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpPredictModelData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 모델 필터 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpPredictModelData | WpPredictModelData}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * @params {@link WpDiagramService | WpDiagramService}
 * @params {@link WpTrainModelService | WpTrainModelService}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpPredictModelComponenet(this.cComViewSvc, this.oComponentData, this.cWpAppSvc, this.cWpDiagramSvc, this.cWpTrainModelSvc);
 * ```
 */
export class WpPredictModelComponenet extends WpComponent {
    oWpData: COM_PREDICT_MODEL_ATT;
    oWpAppSvc: WorkflowAppService;
    oWpDiagramSvc: WpDiagramService;
    oWpTrainModelSvc: WpTrainModelService;
    oModelType: string;
    oTrainModelComIdList: number[];
    oColNameList: string[]
    o_customModelList:any = []
    o_wppModelList:any = []
    h_predictModelList: {
        ARG_ID?:number;
        MODEL_NM?: string;
        MODEL_ID?: number;
        MODEL_IDX?: number;
        COM_ID?: string;
        MODEL_EVAL_TYPE?:string;
        CUSTOM_YN?: string;
        ARG_TYPE?: string;
        FRAMEWORK_TYPE?:string;
    }[];
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpPredictModelData,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramSvc: WpDiagramService,
        pWpTrainModelSvc: WpTrainModelService
    ) {
        super(pComViewerSvc, pWpData);
        this.oWpData.comId = this.oComId;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpTrainModelSvc = pWpTrainModelSvc;
        this.setFormData([
            {
                // #37 공유 데이터 선택 추가
                vname: "모델 옵션",
                name:'modelOpt',
                value:'',
                type:'button_toggle',
                fvalue:["WPP 모델", "사용자 모델"],
                visible:true,
                edit:true,
                callbak:this.onChangeModelOpt.bind(this)
            },{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"),
            name: 'modelName',
            value: '',
            type: 'select',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: this.onChangeModel.bind(this)
        },{
            vname: '신뢰도 기준값',
            name: 'confidence',
            value: '',
            type: 'text',
            fvalue: '',
            visible: false,
            edit: true,
            callbak: this.onChangeValue.bind(this)
        },
        {
                vname: '재학습 판단여부',
                name: 'checkRelearn',
                value: '',
                type: 'checkbox',
                fvalue: [],
                visible: false,
                edit: true,
                callbak: this.onCheckRetrain.bind(this),
        },
        {
                vname: '재학습 기준값(학습대비 변화율)',
                name: 'threshold',
                value: '',
                type: 'text',
                fvalue: [],
                visible: false,
                edit: true,
                callbak: this.onChangeValue.bind(this),
        }]);
        console.log("this.oWpData.modelOpt : ", this.oWpData.modelOpt);
        if (this.oWpData.modelOpt == ''){
            this.oWpData.modelOpt = 'WPP 모델';
        }
        this.oTrainModelComIdList = this.oWpDiagramSvc.getTrainModelComIdList();
        if(this.oWpData.modelType == 'Image') {
            this.oFormData.forEach(item => {
                if (item.name === 'confidence') {
                    item.visible = true;
                }
            });
        } else {
            this.oFormData.forEach(item => {
                if (item.name === 'confidence') {
                    item.visible = false;
                }
            });
        }

        if(this.oWpData.frameworkType == 'Scikit-learn') {
            this.oFormData.forEach(item => {
                if (item.name === 'checkRelearn') {
                    item.visible = true;
                }
            });
            if(this.oWpData.checkRelearn == true) {
                this.oFormData.forEach(item => {
                if (item.name === 'threshold') {
                    item.visible = true;
                }
            });
            }
        } else {
            this.oFormData.forEach(item => {
                if (item.name === 'checkRelearn') {
                    item.visible = false;
                }
            });
        }
    }

    public async onChangeModelOpt(pEvent: WpToggleEvent) {
        console.log("pEvent : ", pEvent);
            this.oWpData[pEvent.name] = pEvent.value;
            if(this.oWpData.modelOpt == '사용자 모델') {
                this.h_predictModelList = this.o_customModelList;
            } else {
                this.h_predictModelList = this.o_wppModelList;
            }
            await this.setCompareModelList();
            this.oWpData['modelName'] = undefined;
        }
        
    onChangeModel(pEvent: any) {
        this.oComViewerSvc.showProgress(true);
        let sSelectIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sSelectModel = this.h_predictModelList[sSelectIndex];
        if (sSelectModel.MODEL_ID) {
            let s_param = {
                method: 'MODEL-SCHEMA',
                location: 'workflow',
                MODEL_ID: sSelectModel.MODEL_ID,
                MODEL_IDX: sSelectModel.MODEL_IDX,
                CUSTOM_YN: sSelectModel.CUSTOM_YN
            }
          
        this.oWpTrainModelSvc.getModelInfo(s_param).toPromise().then(pResult => {
            let s_result = JSON.parse(pResult);
            let s_inputSchema = s_result.data.input_schema;
            // input_schema에서 columnlist에 없는 컬럼 찾기
            let noColumnList:string[] = [];
            s_inputSchema.forEach((column:string) => {
                if (!this.oColNameList.includes(column)) {
                    noColumnList.push(column);
                }
            });
            if (noColumnList.length > 0) {
                this.oWpAppSvc.showMsg(`모델 예측에 필요한 컬럼이 없으므로 오류가 발생할 수 있습니다. 
                모델 필요 컬럼: (${noColumnList.join(", ")})`, false);
            }
            if (s_inputSchema.length < 1) {
                this.oWpAppSvc.showMsg(`모델에 대한 컬럼 정보가 없습니다. 컬럼 개수나 컬럼 타입이 맞지 않을 경우 오류가 발생할 수 있습니다.`, false);
            }
            this.oComViewerSvc.showProgress(false);
        });
        } 
        this.oWpData.checkRelearn = false;
        this.oWpData.modelType = sSelectModel.ARG_TYPE;
        this.oWpData.modelId = sSelectModel.MODEL_ID;
        this.oWpData.modelIdx = sSelectModel.MODEL_IDX;
        this.oWpData.modelComId = sSelectModel.COM_ID;
        this.oWpData.customYn = sSelectModel.CUSTOM_YN;
        this.oWpData.frameworkType = sSelectModel.FRAMEWORK_TYPE;
        this.oWpData.argId = sSelectModel.ARG_ID;

        if(this.oWpData.modelType == 'Image') {
            this.oFormData.forEach(item => {
                if (item.name === 'confidence') {
                    item.visible = true;
                }
            });
        } else {
            this.oFormData.forEach(item => {
                if (item.name === 'confidence') {
                    item.visible = false;
                }
            });
        }

        if(this.oWpData.frameworkType == 'Scikit-learn') {
            this.oFormData.forEach(item => {
                if (item.name === 'checkRelearn') {
                    item.visible = true;
                }
            });
        } else {
            this.oFormData.forEach(item => {
                if (item.name === 'checkRelearn' || item.name === 'threshold') {
                    item.visible = false;
                }
            });
        }
    }



    public setSchema(pSchema: WpComData) {
        // setSchema 이후 oSchema 를 직접 수정하므로, 상위 컴포넌트와 공유하는 pSchema 원본이 바뀌지 않게 깊은 복사
        this.oSchema = JSON.parse(JSON.stringify(pSchema));
        this.oComViewerSvc.selectData(this.oSchema);
        this.oColNameList = this.oSchema.schema.map((sCol:any) => sCol.name);
        (async () => {
            this.oComViewerSvc.showProgress(true);
            await this.setModelListData();
            await this.setCompareModelList();
            this.oComViewerSvc.showProgress(false);
        })();
    }

    async setModelListData() {
        let sTmpModelList: IWkPredictModelData[] = [];

        await this.oWpTrainModelSvc.getModelList().toPromise().then((pData: any) => {
            if (pData.result.length > 0) {
                pData.result.forEach((sModel: DP_MODEL_MSTR_ATT) => {
                        sTmpModelList.push({
                            ARG_ID: sModel.ARG_ID,
                            MODEL_ID: sModel.MODEL_ID,
                            MODEL_IDX: sModel.MODEL_IDX,
                            MODEL_NM: `${sModel.MODEL_NM} (${sModel.ARG_TYPE})`,
                            COM_ID: undefined,
                            ARG_TYPE: sModel.ARG_TYPE,
                            CUSTOM_YN: sModel.CUSTOM_YN,
                            FRAMEWORK_TYPE: sModel.FRAMEWORK_TYPE
                        });
                });
            }
        });
        this.o_customModelList = sTmpModelList.filter(model => model.CUSTOM_YN === 'Y');
        this.o_wppModelList = sTmpModelList.filter(model => model.CUSTOM_YN === 'N');

        if(this.oWpData.modelOpt == '사용자 모델') {
            this.h_predictModelList = this.o_customModelList;
        } else {
            this.h_predictModelList = this.o_wppModelList;
        }
    }

    async setCompareModelList() {
        this.oFormData.forEach(sForm => {
            if (sForm.name == 'modelName') {
                sForm.fvalue = this.h_predictModelList.map(sModel => sModel.MODEL_NM);
            }
        });
    }

    onChangeValue(pEvent: any, p_form:any) {
        const value = parseFloat(pEvent.target.value);

        if (isNaN(value) && p_form.name == 'confidence') {
            this.oComViewerSvc.showMsg("0.1에서 1 사이의 숫자 값을 입력해주세요.", false);
            this.oWpData.confidence = 0.3;
            return;
        }
        if ((value < 0.1 || value > 1) && p_form.name == 'confidence') {
            this.oComViewerSvc.showMsg("0.1에서 1 사이의 숫자 값을 입력해주세요.", false);
            this.oWpData.confidence = 0.3;
            return;
        }

        if (isNaN(value) && p_form.name == 'threshold') {
            this.oComViewerSvc.showMsg("1에서 100 사이의 숫자 값을 입력해주세요.", false);
            this.oWpData.threshold = 50;
            return;
        }
        if ((value < 1 || value > 100) && p_form.name == 'threshold') {
            this.oComViewerSvc.showMsg("1에서 100 사이의 숫자 값을 입력해주세요.", false);
            this.oWpData.threshold = 50;
            return;
        }

    }

    onCheckRetrain(p_ev: any) {
        if(p_ev == true) {
            this.oFormData.forEach(item => {
                if (item.name === 'threshold') {
                    item.visible = true;
                }
            });
        } else {
            this.oFormData.forEach(item => {
                if (item.name === 'threshold') {
                    item.visible = false;
                }
            });
        }
    }
}