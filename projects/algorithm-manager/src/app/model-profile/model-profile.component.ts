import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { AlgorithmAppService } from '../app.service';
// import { WpTrainModelService } from 'projects/workflow/src/app/components/analytic-model/wp-train-model/wp-train-model.service';
import { ModelProfileService } from './model-profile.service';
import { WpDiagramService } from 'projects/workflow/src/app/wp-diagram/wp-diagram.service';
import { ModelHistoryPopupComponent } from './popup/history-popup.component';
import { ModelManagerService } from '../model-manager/model-manager.service';
import { TranslateService } from '@ngx-translate/core';
export interface IGridForm {
    comptNm?: string;
    gridRowEvt: boolean;
    hoverEffect: boolean;
    gridData: any[];
    gridCol: {
        NAME: string;
        VISIBLE: boolean;
        VNAME: string;
        TYPE: string;
    }[];
    gridHeader?: {
        btnNm: string;
        filterCol: string[];
    };
    gridCallback?(pEvent: any): void;
    page?: boolean;
    pageSize?: number;
}

@Component({
    selector: 'wp-model-profile',
    templateUrl: './model-profile.component.html',
    styleUrls: ['./model-profile.component.css']
})
export class ModelProfileComponent implements OnChanges {
    @Input() iProfileData: any;
    // 모델 유형
    oModelType: string;

    // 모델 실행 정보
    oModelInfoForm: IGridForm;
    // 모델 파라미터
    oModelParamForm: IGridForm;
    // 모델 성능
    oModelScoreForm: IGridForm;
    // 학습 사용 데이터
    oModelUseDataForm: IGridForm;
    // 학습 사용 워크플로우
    oModelUseWorkflowForm: IGridForm;
    // 클러스터 중심점
    oClusterCenterForm: IGridForm;
    // 실행 결과 그래프
    oModelResultChart: any;
    // 변수 영향도
    oModelInfluenceChart: any;
    // 배포 이력
    h_deployHistoryList: any = [];
    // 과거 모델 IDX 리스트
    h_ModelHistoryList: any = [];
    // 앙상블 파라미터 키값
    h_ensembleKeyList: string[] = [];
    h_ensembleSelectModel: any;
    h_pipelist: any = [];
    oCurrPath: string = '';
    h_popup = { flag: false, uploadType: '', fileType: 'csv', modelURL: '', singleUpload:true };
    h_btnText:string = '예측실행';
    // WPLAT-358 
    h_deepModel = false;
    o_modelCode = '';
    o_customYn = 'N';
    h_activeTab = 'model-manager';

    // 커스텀모델 UI데이터
    o_layerGridForm: IGridForm;
    o_layerParam: Object;
    h_layer = false;
    // 채팅모듈 정보
    oLangModelData: any = {
        MODEL_ID: '',
        MODEL_IDX: ''
    };
    constructor(public cDialog: MatDialog,
        public cMetaSvc: WpMetaService,
        public cAppSvc: AlgorithmAppService,
        // private cTrainModelSvc: WpTrainModelService,
        private cModelProfileSvc: ModelProfileService,
        private cWpDiagramSvc: WpDiagramService,
        private cModelManagerSvc: ModelManagerService,
        private cWpLibSvc: WpLoadingService,
        private cTransSvc: TranslateService
    ) {

    }

    ngOnDestroy(): void {

    }
    ngOnChanges(changes: SimpleChanges): void {
        // console.log(this.iProfileData);
        this.cWpLibSvc.showProgress(true, 'algorithmspin');
        setTimeout(async () => {
            try {
                this.oModelType = this.iProfileData.tags.model_type;
                this.o_customYn = this.iProfileData.CUSTOM_YN;
                if(this.o_customYn == 'N') {
                    this.h_activeTab = 'model-manager';
                } else {
                    this.h_activeTab = 'custom-manager';
                }
                // 모델 정보
                this.setModelInfoFormData();
                
                // 모델 파라미터
                // 앙상블 모델
                if (this.iProfileData.tags.ensemble == 'Y') {
                    // 파람키에서 앞에 모델부분만 유니크하게 가져와서 알고리즘 리스트만듬
                    this.h_ensembleKeyList = [...new Set(Object.keys(this.iProfileData.params).map(k => k.split('__')[0]))];
                    if (this.h_ensembleKeyList[0]){
                        this.h_ensembleSelectModel = this.h_ensembleKeyList[0];
                        this.setModelParamFormData(this.h_ensembleSelectModel);
                    }
                } else {
                    this.setModelParamFormData();
                }
                
                // 모델 평가지표
                this.setModelScoreFormData();
                // WPP모델일 경우(커스텀모델이 아닐 경우)
                if( this.o_customYn == 'N') {
                    // 검증 데이터 예측 차트
                    this.setModelResultChartData();
                    // 변수 영향도 차트
                    this.setModelInfluenceChartData();
                } else {
                    await this.drawCustomModelUI();
                }   
                
                // 채팅
                if (this.oModelType == 'Language') {
                    this.setLangModelData();
                }
                // 변수 영향도 차트
                this.setModelInfluenceChartData();
                // 사용한 워크플로우 조회
                this.cModelProfileSvc.getModelWorkflow(this.iProfileData.MODEL_ID).subscribe(p_pipeResult => {
                    if (p_pipeResult.isSuccess) {
                        this.h_pipelist = p_pipeResult.result;
                    }
                });
                // 과거 모델 IDX 데이터 조회
                this.cModelManagerSvc.getModelHistory(this.iProfileData.MODEL_ID).subscribe(p_historyList => {
                    console.log("p_historyList : ", p_historyList);
                    if (p_historyList.isSuccess) {
                        this.h_ModelHistoryList = p_historyList.result;
                    }
                });

                // db에서 모델 url 
                this.cModelProfileSvc.deployHealthCheck(this.iProfileData.MODEL_ID, this.iProfileData.MODEL_IDX).subscribe(p_healthChkResult => {
                    if (p_healthChkResult.isSucess) {
                        this.h_deployHistoryList = [{ MODEL_PORT: p_healthChkResult.result }];
                    }
                })
                this.oCurrPath = `${this.iProfileData.REG_USER_NO}/tmp_upload/${this.iProfileData.MODEL_ID}`;
                
                // WPLAT-358 사용자모델 딥러닝경우
                if(Object.keys((this.iProfileData['params'])).length == 0) {
                    $("#model-table").css("display", "none");
                    $(".modelEvaluation").css("width", "100%");
                    let s_modelParam = JSON.parse(this.iProfileData['MODEL_ARG_PARAM'])
                    this.h_deepModel = true;
                    this.o_modelCode = s_modelParam[1]['PARAM_VALUE']
                }

                this.cWpLibSvc.showProgress(false, 'algorithmspin');
            } catch (error) {
                this.cWpLibSvc.showProgress(false, 'algorithmspin');
            }

        }, 500);
    }

    togglePanel(pEvent:any){
        console.log(pEvent)
    }

    onClickHeaderBtn(pEvent: any) {
        if(this.oModelType == 'Image') {
            this.h_popup.fileType = 'image';
            this.h_popup.singleUpload = false;
        } else {
            this.h_popup.fileType = 'csv';
            this.h_popup.singleUpload = true;
        }
        this.h_popup.flag = true;
        this.h_popup.uploadType = 'File';
        this.h_popup.modelURL = this.iProfileData.DEPLOY_URL;
        console.log("h_popup : ", this.h_popup);
        setTimeout(() => {
            // API 문서 바로가기 버튼 생성
            let sElem: Element = document.querySelector('wp-model-profile wp-lib-data-uploader div.modal-footer div.grid-div div.right');
            let sModelDocBtn = Array.from(sElem.children).filter((sChild) => { sChild.id == 'model-doc-btn' })[0];
            if (!sModelDocBtn) {
                let sLinkElem = document.createElement('a');
                sLinkElem.href = `${this.iProfileData.DEPLOY_URL}`;
                sLinkElem.text = this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.POPUP.popup5");
                sLinkElem.id = "model-doc-btn";
                sLinkElem.className = "btn sm positive";
                sLinkElem.target = "_blank";
                sLinkElem.style.marginRight = "10px";
                sElem.insertBefore(sLinkElem, sElem.firstChild);
            }    
        }, 100);
    }

    onRefresh(e:any){
        console.log("e : ", e);
        if (e.length > 0) {
            let sTargetFilePath = `${this.iProfileData.REG_USER_NO}/tmp_upload/${this.iProfileData.MODEL_ID}/${e[0]}`;
            this.cModelProfileSvc.getModelConfig(this.iProfileData.MODEL_ID).subscribe(pConfigResult => {
                if (!pConfigResult.isSuccess) {
                    this.cAppSvc.showMsg(pConfigResult.result, false);
                    return;
                }

                let sUrl = pConfigResult.result.url;
                this.cModelProfileSvc.getPredictResult(sUrl, {}, sTargetFilePath).subscribe(p_result => {
                    if (typeof p_result.result == 'string') {
                        const blob = new Blob([p_result.result], { type: 'text/csv' });
                        let link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = "predict_result.csv";
                        link.click();
                    } else {
                        this.cAppSvc.showMsg('모델 예측 실행에 실패하였습니다. 모델 예측에 적합한 데이터를 업로드하세요', false);
                    }
                }, p_error => {
                    console.log(p_error)
                    this.cAppSvc.showMsg('모델 예측 실행에 실패하였습니다.', false)
                })
            });
        }
        this.h_popup.flag = false;
    }

    setModelResultChartData() {
        let sRawResultData = {
            evaluateLog: this.iProfileData.evaluateLog,
            modelname: this.iProfileData.MODEL_NM,
            argInfo: {ARG_TYPE: this.iProfileData.tags.model_type}
        };
        // let sChartData = this.cTrainModelSvc.getModelChartData(sRawResultData);
        // this.oModelResultChart = sChartData;
        console.log("setModelResultChartData : ", this.oModelResultChart);
    }
    setModelInfoFormData() {
        this.oModelInfoForm = this.cModelProfileSvc.getModelInfoFormData(this.iProfileData);
    }
    setModelParamFormData(p_ensembleArg?:string) {

        // 앙상블 모델은 세부 모델명에 해당하는 파라미터만 표시한다.
        if (p_ensembleArg){
            this.oModelParamForm = this.cModelProfileSvc.getModelParamFormData(this.iProfileData['params'], p_ensembleArg);
        } else {
            this.oModelParamForm = this.cModelProfileSvc.getModelParamFormData(this.iProfileData['params']);
        }
        console.log("this.oModelParamForm : ", this.oModelParamForm);
    }
    clickModelNmBtn(pModelNm:string){
        this.h_ensembleSelectModel = pModelNm;
        this.setModelParamFormData(pModelNm);
    }
    setModelScoreFormData() {
        // let sRawResultData = {
        //     evaluateLog: this.iProfileData.evaluateLog,
        //     modelName: this.iProfileData.MODEL_NM,
        //     modelType: this.iProfileData.tags.model_type
        // };
        // this.oModelScoreForm = this.cModelProfileSvc.getModelResultGridData(sRawResultData);
        this.oModelScoreForm = this.cModelProfileSvc.getModelParamFormData(this.iProfileData['metrics']);
        console.log("this.oModelScoreForm  : ", this.oModelScoreForm );
    }
    setLangModelData() {
        this.oLangModelData.MODEL_ID = this.iProfileData.MODEL_ID;
        this.oLangModelData.MODEL_IDX = this.iProfileData.MODEL_IDX;
    }
    setModelInfluenceChartData() {
        let sExcuteResult: any = this.iProfileData.evaluateLog;
        let sFeatureLogData: any = this.iProfileData.featureLog;
        // 군집
        if (this.oModelType == 'Clustering'){
            if (sExcuteResult.cluster_center) {
                let sCenterData = JSON.parse(sExcuteResult.cluster_center);
                let sClusterCenterData = this.cModelProfileSvc.getClusterCenterData(sCenterData);
                this.oClusterCenterForm = sClusterCenterData;
            }
         // 이미지
        } else if (this.oModelType == 'Image'){
            let sChartData: any = this.cModelProfileSvc.getPRChartData(sFeatureLogData);
            console.log("sChartData : ", sChartData);
            if (sChartData) {
                this.oModelInfluenceChart = sChartData;
            }  
        // 추천
        } else if (this.oModelType == 'Recommend'){
            let sChartData: any = this.cModelProfileSvc.getRecommendChartData(sExcuteResult, this.iProfileData.ARG_ID);
            if (sChartData) {
                this.oModelInfluenceChart = sChartData;
            }  
        // 강화학습
        }  else if (this.oModelType == 'Reinforcement'){
            let sChartData: any = this.cModelProfileSvc.getReinforcementChartData(sExcuteResult, this.iProfileData.ARG_ID);
            if (sChartData) {
                this.oModelInfluenceChart = sChartData;
            } 
        // 언어모델
        }  else if (this.oModelType == 'Language'){
            let sChartData = this.cModelProfileSvc.getLanguageChartData(sFeatureLogData);
            if (sChartData) {
                this.oModelInfluenceChart = sChartData;
            }  
        // 회귀 & 분류
        } else {
            // if (sExcuteResult.reVal && sExcuteResult.reVal.featureLog) {
            //     sFeatureLogData = sExcuteResult.reVal.featureLog;
            // } else {
            //     sFeatureLogData = sExcuteResult['featureLog'];
            // }
            let sChartData = this.cModelProfileSvc.getInflueceChartData(sFeatureLogData);
            if (sChartData) {
                this.oModelInfluenceChart = sChartData;
            }  
        }
    }
    async onLoadWorkFlow(pWfId: any, pType: any) {
        if (pType == 'workflow') {
            await this.cWpDiagramSvc.loadWorkFlowPopup({ wfId: pWfId, preview: true }, 'wkId');
        } 
    }

    showHistoryPopup(){
        // this.cWpLibSvc.showProgress(true, "algorithmspin");
        const dialogRef = this.cDialog.open(ModelHistoryPopupComponent, {
            data: {
                title: `모델 히스토리`,
                modelId: this.iProfileData.MODEL_ID,
                modelIdx: this.iProfileData.MODEL_IDX
            },
            id: "wp-model-history-popup"
        });
    }

    onClickHistoryItem(p_event:any){
        this.cWpLibSvc.showProgress(true, 'algorithmspin');
        console.log("p_event : ", p_event);
        let s_param = {
                method: 'MODEL-INFO',
                location: 'model-manager',
                MODEL_ID: p_event.MODEL_ID,
                MODEL_IDX: p_event.MODEL_IDX,
                CUSTOM_YN: p_event.CUSTOM_YN
            }
          
        this.cModelManagerSvc.getModelInfo(s_param).toPromise().then(pResult => {
            Object.assign(p_event, JSON.parse(pResult)['data']);
            // 상세 페이지 로직
            this.cAppSvc.changeTab('model-profile', p_event);
        });
    }

    async drawCustomModelUI() {
        this.h_layer = false;
        if(this.iProfileData.FRAMEWORK_TYPE =='TensorFlow/Keras' || this.iProfileData.FRAMEWORK_TYPE =='PyTorch') {
            // Layer
            if(this.iProfileData.evaluateLog.length > 0) {
                this.h_layer = true;
                let s_layerGridCol = [
                    { NAME: 'Layer Name', VISIBLE: true, VNAME: 'Layer (name)', TYPE: 'string' },
                    { NAME: 'Layer Type', VISIBLE: true, VNAME: 'Layer (type)', TYPE: 'string' },
                    { NAME: 'Input Shape', VISIBLE: true, VNAME: 'Input Shape', TYPE: 'string' },
                    { NAME: 'Output Shape', VISIBLE: true, VNAME: 'Output Shape', TYPE: 'string' },
                    { NAME: 'Activation', VISIBLE: true, VNAME: 'Activation', TYPE: 'string' },
                    { NAME: 'Param', VISIBLE: true, VNAME: 'Param #', TYPE: 'string' },
                ];
                if (this.iProfileData.FRAMEWORK_TYPE =='PyTorch') {
                    s_layerGridCol = s_layerGridCol.filter(col => col.NAME !== 'Activation');
                }

                let s_layerGridData = this.iProfileData.evaluateLog;
                this.o_layerGridForm =  {
                    gridRowEvt: false,
                    hoverEffect: false,
                    gridData: s_layerGridData,
                    gridCol:  s_layerGridCol,
                    gridCallback: (pEvent: any) => { },
                };

                this.o_layerParam = this.iProfileData.featureLog;
            }
        }
    }
    objectKeys(obj: any): string[] {
        return Object.keys(obj);
      }
}
