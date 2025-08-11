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
export interface IWkPredictModelData extends Pick<DP_MODEL_MSTR_ATT, "MODEL_ID" | "MODEL_IDX" | "MODEL_NM" | "ARG_TYPE" | "REG_DATE" | "CUSTOM_YN"> {
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
        MODEL_NM?: string;
        MODEL_ID?: number;
        MODEL_IDX?: number;
        COM_ID?: string;
        MODEL_EVAL_TYPE?:string;
        CUSTOM_YN?: string;
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
        }]);
        // default option : 내 데이터셋
        console.log("this.oWpData.modelOpt : ", this.oWpData.modelOpt);
        if (this.oWpData.modelOpt == ''){
            this.oWpData.modelOpt = 'WPP 모델';
        }
        this.oTrainModelComIdList = this.oWpDiagramSvc.getTrainModelComIdList();
    }

    public async onChangeModelOpt(pEvent: WpToggleEvent) {
        console.log("pEvent : ", pEvent);
            this.oWpData[pEvent.name] = pEvent.value;
            // this.setFileNmList(pEvent.value);
            // this.oWpData['originalname'] = undefined;
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
        // 모델 VAR MSTR 조회해서 지금 데이터와 컬럼 목록이 맞는지
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
        this.oWpData.modelType = sSelectModel.MODEL_EVAL_TYPE;
        this.oWpData.modelId = sSelectModel.MODEL_ID;
        this.oWpData.modelIdx = sSelectModel.MODEL_IDX;
        this.oWpData.modelComId = sSelectModel.COM_ID;
        this.oWpData.customYn = sSelectModel.CUSTOM_YN;
    }



    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        this.oComViewerSvc.selectData(this.oSchema);
        this.oColNameList = this.oSchema.schema.map((sCol:any) => sCol.name);
        // setSchema가 다른 컴포넌트에서는 비동기 처리 안되어있기 때문에 setSchema 내부에서 비동기 함수 쓰기 위해서 즉시 실행함수 형태로 아래 함수 실행
        (async () => {
            this.oComViewerSvc.showProgress(true);
            await this.setModelListData();
            await this.setCompareModelList();
            this.oComViewerSvc.showProgress(false);
            // await this.setWpCompareModelData();
        })();
    }

    async setModelListData() {
        // parentModelType 과 동일한 모델만 표기해야 함.
        // 모델 실행 이후엔 상위 컴포넌트 id로 모델 결과를 조회한다음에 비교함.
        let sTmpModelList: IWkPredictModelData[] = [];



        // 기존 모델 리스트
        await this.oWpTrainModelSvc.getModelList().toPromise().then((pData: any) => {
            // 실행결과가 존재하는 모델만 비교 가능
            if (pData.result.length > 0) {
                pData.result.forEach((sModel: DP_MODEL_MSTR_ATT) => {
                        sTmpModelList.push({
                            MODEL_ID: sModel.MODEL_ID,
                            MODEL_IDX: sModel.MODEL_IDX,
                            MODEL_NM: `${sModel.MODEL_NM} (${sModel.ARG_TYPE})`,
                            COM_ID: undefined,
                            ARG_TYPE: sModel.ARG_TYPE,
                            CUSTOM_YN: sModel.CUSTOM_YN
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
}