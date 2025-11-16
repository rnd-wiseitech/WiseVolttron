import { COM_FILTER_MODEL_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WorkflowAppService } from '../../../app.service';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { IWkComporeModelData } from '../wp-compare-model/wp-compare-model.component';
import { WpCompareModelService } from '../wp-compare-model/wp-compare-model.service';
import { WpFilterModelData } from 'projects/wp-server/util/component/analytic/wp-filter-model';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { TranslateService } from '@ngx-translate/core';
import { WpTrainModelService } from '../wp-train-model/wp-train-model.service';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
/**
 * 모델 관리 - 모델 필터링 컴포넌트 클래스
 * 
 * 모델 필터링 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpFilterModelData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 모델 필터 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpFilterModelData | WpFilterModelData}
 * @params {@link WpCompareModelService | WpCompareModelService}
 * @params {@link WorkflowAppService | WorkflowAppService}
 * @params {@link WpDiagramService | WpDiagramService}
 * @params {@link WpTrainModelService | WpTrainModelService}
 * @example
 * ```ts
 * this.oComponent = new WpFilterModelComponent(this.cComViewSvc, this.oComponentData, this.cWpCompareModelSvc, this.cWpAppSvc, this.cWpDiagramSvc);
 * ```
 */
export class WpFilterModelComponent extends WpComponent {
    oWpData: COM_FILTER_MODEL_ATT;
    oWpCompareModelSvc: WpCompareModelService;
    oWpTrainModelSvc: WpTrainModelService;
    oModelType = ''; // 비교 모델 유형
    oModelList: IWkComporeModelData[];
    oWpAppSvc: WorkflowAppService;
    oWpDiagramSvc: WpDiagramService;
    oModelCompareTypeObj: { [index: string]: string[] } = {
        Classification: ["accuracy",],
        Regression: ["accuracy", "mse", "rmse", "mape", "r2_score"],
        Clustering: ["silhouette_coef",],
    }
    h_compareModelList: string[] = [];

    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpFilterModelData,
        pWpCompareModelSvc: WpCompareModelService,
        pWpAppSvc: WorkflowAppService,
        pWpDiagramSvc: WpDiagramService,
        pWpTrainModelSvc: WpTrainModelService
    ) {
        super(pComViewerSvc, pWpData);
        this.oWpCompareModelSvc = pWpCompareModelSvc;
        this.oWpAppSvc = pWpAppSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpData.comId = this.oComId;
        this.oWpTrainModelSvc = pWpTrainModelSvc;
        this.setFormData([{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info86"),
            name: 'model_list',
            value: '',
            type: 'list',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: null
        }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info87"),
            name: 'filterOpt',
            value: '',
            type: 'select',
            fvalue: [],
            visible: true,
            edit: true,
            callbak: null
        }, {
        //     vname: '저장 옵션',
        //     name: 'saveOpt',
        //     value: '',
        //     type: 'select',
        //     fvalue: ['최고 성능 모델 저장', '기존 모델 덮어쓰기'],
        //     visible: true,
        //     edit: true,
        //     callbak: this.onchangeSaveOption.bind(this)
        // }, {
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"),
            name: 'modelName',
            value: '',
            type: 'text',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: this.onArgFormChanged.bind(this)
        // }, {
        //     vname: '덮어쓸 모델',
        //     name: 'overwriteModelName',
        //     value: '',
        //     type: 'select',
        //     fvalue: [],
        //     visible: false,
        //     edit: true,
        //     callbak: this.onChangeOvewriteModel.bind(this)
        }]);
    }

    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        this.oSchema.schema = [];
        this.oComViewerSvc.selectData(this.oSchema);
        // form에 비교 대상 모델들 표시
        this.oFormData.forEach(sForm => {
            if (sForm.name === 'model_list') {
                sForm.fvalue = this.oWpData.compare_model.map(sModel => sModel.h_model_name);
            } else if (sForm.name === 'filterOpt') {
                sForm.fvalue = this.oModelCompareTypeObj[this.oModelType];
            }
        });
        // 모델리스트 명 가져와서 모델명 비교
        this.oWpTrainModelSvc.getModelList().toPromise().then((pData: any) => {
            if (pData.result.length > 0) {
                this.h_compareModelList = pData.result.map((pModel:any) => { return pModel['MODEL_NM'] })
            }
        });
    }

    public setModelType(pType: string) {
        this.oModelType = pType;
        this.oWpData.modelType = pType;
    }

    public setModelListData(pCompareModelList: COM_FILTER_MODEL_ATT['compare_model']) {
        this.oWpData.compare_model = pCompareModelList;
        setTimeout(() => {
            let sElem: HTMLElement = document.getElementById(COM_ID['A-FILTER_MODEL'] + '_model_list');
            // 필터링 대상 모델 리스트 height 설정(최대 200px를 넘기지 않도록 함.)
            if (sElem) {
                let sDxListElem: HTMLCollection = sElem.getElementsByTagName('dx-list');
                let sTmpHeight = pCompareModelList.length * 45;
                let sModelListHeight = sTmpHeight > 200 ? sTmpHeight : 200;
                (sDxListElem[0] as HTMLElement).style.height = `${sModelListHeight}px`;
                // 모델 저장 옵션
                // this.onchangeSaveOption({ selectedItem: this.oWpData.saveOpt, component: undefined, element: undefined });
            }
        }, 50);
    }
    //모델 저장시 모델명에 유효하지 않은 문자 확인 기능
    onKeyUp(pEvent: any, pName: string) {
        let sOutFileNm = pEvent.srcElement.value; // 입력 값
        // 파일명 유효성 확인
        let sIsValidFloat = this.isValidString(sOutFileNm, 'tableNm');
        if (!sIsValidFloat.isValid) {
            this.oComViewerSvc.showMsg(`유효한 모델명을 입력해주세요`, false);
            this.oWpData.transform_value = sIsValidFloat.result;
            pEvent.srcElement.value = sIsValidFloat.result;
        }
     }
     //모델명 중복 확인 기능
    async onArgFormChanged(p_ev: any, p_form: any){
        let s_checkModelName: any = await this.oWpTrainModelSvc.checkModelName(p_ev.target.value);
        if (s_checkModelName.length > 0) {
            this.oComViewerSvc.showMsg(`해당 모델명은 이미 있습니다.`, false);
        }
    }

    // public onchangeSaveOption(pEvent: dxSelectChangeEvent) {
    //     let sOverwriteFlag = pEvent.selectedItem === "기존 모델 덮어쓰기" ? true : false;
    //     this.oFormData.forEach(sForm => {
    //         if (sForm.name === 'overwriteModelName') {
    //             this.oWpData.overwriteModel = undefined;
    //             sForm.visible = sOverwriteFlag;
    //             if (sOverwriteFlag) {
    //                 sForm.fvalue = this.oWpData.compare_model.map(sModel => sModel.h_model_name);
    //             }
    //         } else if (sForm.name === 'modelName') {
    //             sForm.visible = !sOverwriteFlag;
    //         }
    //     })
    // }

    // public onChangeOvewriteModel(pEvent: dxSelectChangeEvent) {
    //     let sSelectIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
    //     this.oWpData.overwriteModel = this.oWpData.compare_model[sSelectIndex];
    // }

}
