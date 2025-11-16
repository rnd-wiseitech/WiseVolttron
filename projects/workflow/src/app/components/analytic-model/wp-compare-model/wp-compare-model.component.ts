import { WpCompareModelData } from 'projects/wp-server/util/component/analytic/wp-compare-model';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpCompareModelService } from './wp-compare-model.service';
import { DP_MODEL_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_MODEL_MSTR';
import { COM_ANALYTIC_ATT, COM_COMPARE_MODEL_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpTrainModelService } from '../wp-train-model/wp-train-model.service';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { TranslateService } from '@ngx-translate/core';

export interface IWkComporeModelData extends Pick<DP_MODEL_MSTR_ATT, "MODEL_ID" | "MODEL_IDX" | "MODEL_NM" | "ARG_TYPE" | "REG_DATE"> {
    COM_UUID?: string;
    MODEL_SAVE?: boolean;
};
/**
 * 모델 관리 - 모델 비교 컴포넌트 클래스
 * 
 * 모델 비교 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpCompareModelData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 모델 비교 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpCompareModelData | WpCompareModelData}
 * @params {@link WpCompareModelService | WpCompareModelService}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * @params {@link WpDiagramService | WpDiagramService}
 * @params {@link WpTrainModelService | WpTrainModelService}
 * 
 * @example
 * ```ts
 *  this.oComponent = new WpCompareModelComponent(this.cComViewSvc, this.oComponentData, this.cWpCompareModelSvc, this.cWpAppSvc, this.cWpDiagramSvc, this.cWpTrainModelSvc);
 * ```
 */
export class WpCompareModelComponent extends WpComponent {
    oWpData: COM_COMPARE_MODEL_ATT;
    oWpCompareModelSvc: WpCompareModelService;
    oWpTrainModelSvc: WpTrainModelService;
    oModelType = ''; // 비교 모델 유형
    oModelList: IWkComporeModelData[];
    oWpAppSvc: WorkflowAppService;
    oWpDiagramSvc: WpDiagramService;
    h_compareModelList: string[] = [];
    oInfoGridDataObj: any = {};
    oInfoGridColObj: any = {};
    oInfoGridStyle: any = {};
    // 차트 데이터
    oChartData: any;
    oChartFieldData: { valueField: string, name: string }[] = [];
    oChartArgType = 'CompareModel';
    // 모델 결과 form
    oInfoFormData: WpPropertiesWrap[];
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpCompareModelData,
        pWpCompareModelSvc: WpCompareModelService,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramSvc: WpDiagramService,
        pWpTrainModelSvc: WpTrainModelService
    ) {
        super(pComViewerSvc, pWpData);
        this.oWpCompareModelSvc = pWpCompareModelSvc;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpTrainModelSvc = pWpTrainModelSvc;
        this.oWpData.comId = this.oComId;
        this.setFormData([{
            vname: 'Compare Model',
            name: 'compare_model',
            value: '',
            type: 'tab',
            fvalue: [
                {
                    vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"),
                    name: 'h_model_name',
                    value: '',
                    type: 'select',
                    fvalue: [],
                    visible: true,
                    edit: true,
                    callbak: this.onSelectModel.bind(this)
                }
            ],
            visible: true,
            edit: false,
            callbak: null
        }]);

        this.oInfoFormData = [{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info79"),
            name: 'model_params',
            value: '',
            type: 'grid',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: undefined
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info85"),
            name: 'model_result',
            value: '',
            type: 'grid',
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
        }];
    }

    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        this.oSchema.schema = [];
        this.oComViewerSvc.selectData(this.oSchema);
        this.setModelType(pSchema['wp-data']['o_data'].modelType);
        // setSchema가 다른 컴포넌트에서는 비동기 처리 안되어있기 때문에 setSchema 내부에서 비동기 함수 쓰기 위해서 즉시 실행함수 형태로 아래 함수 실행
        (async () => {
            // this.oComViewerSvc.showProgress(true);
            await this.setModelListData();
            await this.setCompareModelList();
            // this.oComViewerSvc.showProgress(false);
            // await this.setWpCompareModelData();
        })();

    }

    public setModelType(pType: string) {
        this.oModelType = pType;
        this.oWpData.modelType = pType;
    }

    async setModelListData() {
        // parentModelType 과 동일한 모델만 표기해야 함.
        // 모델 실행 이후엔 상위 컴포넌트 id로 모델 결과를 조회한다음에 비교함.
        let sTmpModelList: IWkComporeModelData[] = [];

        // 상위 컴포넌트에서 실행될 모델 리스트
        let sComData = this.oWpAppSvc.getComData(this.oComId);
        sComData.parentId.forEach(sParentComId => {
            let sParentNode = this.oWpDiagramSvc.getNodesById(sParentComId);
            let sParentComData = (sParentNode['wp-data']['o_data'] as COM_ANALYTIC_ATT);
            let sPartitionOption = {
                type: sParentComData.partitionType == "학습-평가 데이터 분할" ? "t-holdout" : "t-cv",
                option: sParentComData.partitionValue,
                value: 0
            };
            sTmpModelList.push({
                COM_UUID: sParentComId,
                MODEL_SAVE: sParentComData.modelSave,
                MODEL_ID: undefined,
                MODEL_IDX: undefined,
                // MODEL_NM: `${sParentNode.text}(job ${sParentNode.jobId})`,
                MODEL_NM: `${sParentNode['wp-data'].o_data.modelInfo.model.ARG_NM}_${sParentNode.jobId}`,
                ARG_TYPE: sParentComData.modelType
                // MODEL_FEATURE_TYPE: sParentComData.scaleInfo,
                // MODEL_PART_OPTION: JSON.stringify(sPartitionOption),
                // MODEL_ARG_PARAM: JSON.stringify(sParentComData.modelInfo.params),
                // MODEL_OPTIMIZER_YN: sParentComData.optimizer ? 'Y' : 'N',
                // REG_DATE: undefined
            });
        });

        // 기존 모델 리스트
                await this.oWpTrainModelSvc.getModelList().toPromise().then((pData: any) => {
                    // 실행결과가 존재하는 모델만 비교 가능
                    if (pData.result.length > 0) {
                        pData.result.forEach((sModel: DP_MODEL_MSTR_ATT) => {
                                sTmpModelList.push({
                                    MODEL_ID: sModel.MODEL_ID,
                                    MODEL_IDX: sModel.MODEL_IDX,
                                    MODEL_NM: `${sModel.MODEL_NM} (${sModel.ARG_TYPE})`,
                                    COM_UUID: undefined,
                                    ARG_TYPE: sModel.ARG_TYPE,
                                    MODEL_SAVE: true
                                });
                        });
                    }
                });
        this.oModelList = sTmpModelList;
    }

    // this.oModelList로 화면 표시 모델 리스트 설정
    async setCompareModelList() {
        this.h_compareModelList = this.oModelList.map(sModel => `${sModel.MODEL_NM} ${sModel.REG_DATE ? '(' + sModel.REG_DATE + ')' : ''}`);
        this.oFormData.forEach(sForm => {
            if (sForm.name === 'compare_model') {
                sForm.fvalue.forEach((sSubForm: WpPropertiesWrap) => {
                    if (sSubForm.name === 'h_model_name') {
                        sSubForm.fvalue = this.h_compareModelList;
                    }
                });
            }
        });
    }

    async setWpCompareModelData() {
        let sTmpCompareModelData: COM_COMPARE_MODEL_ATT['compare_model'] = [];
        for (const sModelIndex in this.oModelList) {
            let sModel = this.oModelList[sModelIndex];
            sTmpCompareModelData.push({
                h_model_name: this.h_compareModelList[sModelIndex],
                MODEL_NM: sModel.MODEL_NM,
                MODEL_ID: sModel.MODEL_ID,
                MODEL_IDX: sModel.MODEL_IDX,
                COM_UUID: sModel.COM_UUID,
                MODEL_SAVE: sModel.MODEL_SAVE
            });
        };
        this.oWpData.compare_model = sTmpCompareModelData;
    }
    onSelectModel(pEvent: any, sTabIdx: number) {
        let sSelectIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sModel = this.oModelList[sSelectIndex];
        let s_Valid = true;
        if (sTabIdx > 0) {
            let s_firstModelType = this.oWpData.compare_model[0].ARG_TYPE;
            if(s_firstModelType != sModel.ARG_TYPE) {
                s_Valid = false;
            }
        }
        if(s_Valid == true) {
            let sTmpModelData = {
                h_model_name: this.h_compareModelList[sSelectIndex],
                MODEL_NM: sModel.MODEL_NM,
                MODEL_ID: sModel.MODEL_ID,
                MODEL_IDX: sModel.MODEL_IDX,
                COM_UUID: sModel.COM_UUID,
                ARG_TYPE: sModel.ARG_TYPE,
                MODEL_SAVE: sModel.MODEL_SAVE
            };
            this.oWpData.compare_model[sTabIdx] = sTmpModelData;
        } else {
            pEvent.value =''
            this.oWpData.compare_model[sTabIdx] = {h_model_name: '', MODEL_NM: '', COM_UUID: '', ARG_TYPE:''}
            this.oComViewerSvc.showMsg('동일한 유형의 모델을 비교해야 합니다.', false);
        }

    }

    onChangeTab(pTabName: 'Configuation' | 'Info') {
        let sConfElem: HTMLElement = document.querySelector('wp-component-viewer > .component-configuration');
        if (pTabName == 'Info') {
            // 분석 결과 Info 탭 너비 키움.
            sConfElem.style.width = '600px';
            console.log("this.oComId : ", this.oComId);
            this.oWpDiagramSvc.getModelResult([this.oComId]).then((pResult: any) => {
                console.log("pResult : ", pResult);
                //실행하기 전에 info 들어가면 에러창 뜸
                if(pResult.length > 0) {
                    let s_compareResult = JSON.parse(pResult[0]['MODEL_RESULT']);
                    let sParamResult = this.oWpCompareModelSvc.getCompareModelParamGridData(s_compareResult);
                    this.oInfoGridColObj['model_params'] = sParamResult.gridCol;
                    this.oInfoGridDataObj['model_params'] = sParamResult.gridData;
                    this.oInfoGridStyle['model_params'] = { iPage: true };

                    // // 모델 실행 결과 grid value
                    let sExcuteResult = this.oWpCompareModelSvc.getCompareModelResultGridData(s_compareResult);
                    this.oInfoGridColObj['model_result'] = sExcuteResult.gridCol;
                    this.oInfoGridDataObj['model_result'] = sExcuteResult.gridData;
                    this.oInfoGridStyle['model_result'] = { iPage: true };

                    // 모델 실행 차트 데이터
                    let sChartData = this.oWpCompareModelSvc.getCompareChartData(s_compareResult);
                    this.oChartData = sChartData.chartDataList;
                    this.oChartFieldData = sChartData.chartFieldList;
                    this.oComViewerSvc.setInfoFormData(this.oInfoFormData);
                }
            });
            // this.oWpData.compare_model.forEach(sModel => {
            //     if (sModel.MODEL_ID) {
            //         sModelIdDataList.push({ MODEL_ID: sModel.MODEL_ID, MODEL_IDX: sModel.MODEL_IDX });
            //     } else {
            //         sComIdList.push(sModel.COM_ID);
            //     }
            // });
            // let sModelCnt = this.oWpData.compare_model.length;
            // // 모델 실행 결과가 비교 대상 모델 갯수와 동일할 때 비교 가능
            // this.oWpDiagramSvc.getModelResult(sComIdList, sModelIdDataList).then(async (pResult:DP_MODEL_MSTR_ATT[]) => {
            //     if (sModelCnt == pResult.length && sModelCnt == pResult.filter((sModel:any) => sModel.MODEL_EXCUTE_RESULT).length) {
            //         // 모델 사용 파라미터 grid value
            //         let sModelParamsList: any = await this.oWpCompareModelSvc.getModelParams(sComIdList, sModelIdDataList);
            //         let sModelEvalType = sModelParamsList[0].MODEL_EVAL_TYPE;
            //         let sModelEvalFlag = true;
            //         sModelParamsList.forEach((sModelParam: DP_MODEL_MSTR_ATT) => {
            //             if (sModelParam.MODEL_EVAL_TYPE !== sModelEvalType) {
            //                 sModelEvalFlag = false;
            //             }
            //         })
            //         if (!sModelEvalFlag) {
            //             this.initGridData();
            //             this.oComViewerSvc.showMsg('동일한 유형의 모델을 비교해야 합니다.', false);
            //             return;
            //         }
            //         let sParamResult = this.oWpCompareModelSvc.getCompareModelParamGridData(sModelParamsList);
            //         this.oInfoGridColObj['model_params'] = sParamResult.gridCol;
            //         this.oInfoGridDataObj['model_params'] = sParamResult.gridData;
            //         this.oInfoGridStyle['model_params'] = { iPage: true };

            //         // 모델 실행 결과 grid value
            //         let sExcuteResult = this.oWpCompareModelSvc.getCompareModelResultGridData(pResult);
            //         this.oInfoGridColObj['model_result'] = sExcuteResult.gridCol;
            //         this.oInfoGridDataObj['model_result'] = sExcuteResult.gridData;
            //         this.oInfoGridStyle['model_result'] = { iPage: true };

            //         // 모델 실행 차트 데이터
            //         let sChartData = this.oWpCompareModelSvc.getCompareChartData(pResult);
            //         this.oChartData = sChartData.chartDataList;
            //         this.oChartFieldData = sChartData.chartFieldList;
            //         this.oComViewerSvc.setInfoFormData(this.oInfoFormData);

            //     } else {
            //         this.initGridData();
            //         this.oComViewerSvc.showMsg('모델 실행 결과가 없습니다. 워크플로우를 실행한 후 확인해 주세요', false);
            //     }
            // }).catch((pError: any) => {
            //     this.initGridData();
            //     this.oComViewerSvc.showMsg('모델 실행 결과 조회 에러 발생', false);
            // })
        } else {
            sConfElem.style.width = '334px';
        }
    }

    initGridData() {
        this.oInfoGridColObj = {};
        this.oInfoGridDataObj = {};
        this.oInfoGridStyle = {};
        this.oComViewerSvc.setInfoFormData([]);
    }

}
