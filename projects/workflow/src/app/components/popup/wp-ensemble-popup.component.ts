import { Component, Inject, OnInit, QueryList, ViewChildren } from "@angular/core";
import {
    MatDialogRef,
    MAT_DIALOG_DATA
} from "@angular/material/dialog";
import { WorkflowAppService } from "../../app.service";
import { WpPropertiesWrap } from "../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpTrainModelService } from "../analytic-model/wp-train-model/wp-train-model.service";
import { DP_ARG_PARAM_ATT } from "projects/wp-server/metadb/model/DP_ARG_PARAM";
import { DxSelectBoxComponent } from "devextreme-angular";
import { TranslateService } from "@ngx-translate/core";
declare const $: any;
interface WpEnsembleFormWrap extends WpPropertiesWrap {
    callbak(p_data1:any, p_data2?:any, p_data3?:any): any;
}
@Component({
    selector: 'wp-ensemble-popup',
    templateUrl: './wp-ensemble-popup.component.html',
    styleUrls: ['./wp-ensemble-popup.component.css']
})
export class WpEnsemblePopupComponenet implements OnInit {
    @ViewChildren(DxSelectBoxComponent) h_argSelectBoxs!: QueryList<DxSelectBoxComponent>;
    h_modelType: 'Regression' | 'Classification' = 'Regression';
    h_modelFormList: WpEnsembleFormWrap[][] = [];
    oArgList: { VNAME: string, VALUE: { ARG_ID: number, ARG_TYPE: string, ARG_NM: string, ARG_FILE_NAME: string } }[] = [];
    oArgParam: { [index: string]: DP_ARG_PARAM_ATT[] } = {};
    oWpData: {[index:number]:any} = {};
    oBasicForm: any = [{
        vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup49"),
        name: 'arg',
        value: '',
        type: 'select',
        fvalue: [],
        visible: true,
        edit: true,
        callbak: this.onChangeAlg.bind(this)
    }];

    constructor(@Inject(MAT_DIALOG_DATA) public data: any,
        public dialogRef: MatDialogRef<WpEnsemblePopupComponenet>,
        private cWpAppSvc: WorkflowAppService,
        private cTrainModelSvc: WpTrainModelService,
        private cTransSvc: TranslateService
    ) {
        this.h_modelType = data.argType;
        // if (data.parameter && data.parameter.length > 0) {
        //     data.parameter.forEach((sParam:any, sIndex:number) => {
        //         this.oWpData[sIndex] = sParam;
        //     });
        // }

    }
    ngOnInit() {
        console.log("data : ", this.data);
        this.cTrainModelSvc.getEnsembleArgList(this.data.argType).then(pAlgList =>{
            let sData:any = [];
            pAlgList.forEach(sArg => {
                    sData.push({
                        VNAME: sArg.ARG_NM,
                        VALUE: {
                            ARG_ID: sArg.ARG_ID,
                            ARG_TYPE: sArg.ARG_TYPE,
                            ARG_NM: sArg.ARG_NM,
                            ARG_FILE_NAME: sArg.ARG_FILE_NAME,
                        }
                    });
            });
            this.oArgList = sData;
            
            let sArgIdList = this.oArgList.map(sModel => sModel.VALUE.ARG_ID);
            this.oBasicForm[0].fvalue = this.oArgList;
                // oWpData 있으면 그것으로 form 만들기.
                if (this.data.estimators.length < 1) { // oWpData에 값 없을때 = 선택한 모델이 없을때
                    this.h_modelFormList.push(this.oBasicForm.map((item:any) => ({ ...item })));
                    this.oWpData[0] = {}; // 이 부분 없으면 앙상블 모델 설정창에 처음 모델 설정 안한 상태에서 탭 추가하고 모델 설정하면 -infinity 값이 들어가서 오류 생김
                } else { // oWpData에 값 있을때
                    this.loadEstimatorsInfo(this.data.estimators);
                    $('.scrollbar').scrollbar(); // 여러개 들어가도 창 잘 뜨게 스크롤 설정
                }
            // this.cTrainModelSvc.getArgParam(sArgIdList).then(pParamList => {
            //     pParamList.forEach(sParam => {
            //         if (sArgIdList.includes(sParam.ARG_ID)){
            //             if (this.oArgParam[sParam.ARG_ID]){
            //                 this.oArgParam[sParam.ARG_ID].push(sParam);
            //             } else {
            //                 this.oArgParam[sParam.ARG_ID] = [sParam];
            //             }
            //         }
            //     });
            //     this.oBasicForm[0].fvalue = this.oArgList;
            //     // oWpData 있으면 그것으로 form 만들기.
            //     if (!this.oWpData[0]) {
            //         this.h_modelFormList.push([...this.oBasicForm]);
            //         this.oWpData[0] = {};
            //     } else {
            //         Object.values(this.oWpData).forEach((sData, sIndex) => {
            //             this.onChangeAlg(undefined, sData['arg']);
            //         });
            //         setTimeout(() => {
            //             this.h_argSelectBoxs.forEach((sElem: DxSelectBoxComponent) =>{
            //                 let sElemId = sElem.instance.element().id;
            //                 if (sElemId.startsWith('arg_')) {
            //                     sElem.selectedItem = { VALUE: sElem.value, VNAME: sElem.value.argNm };
            //                     sElem.instance.focus();
            //                     sElem.instance.blur();
            //                 }
            //             });

            //         }, 100);
            //     }
            // });
        });
    }
    // pModel은 직접 모델 설정할 때.
    async onChangeAlg(pEvent:any, pModel?:any) {
        let s_argParam:any = await this.cTrainModelSvc.getArgParam(pEvent.event.value.ARG_ID);
        s_argParam = JSON.parse(s_argParam[0]['PARAM']);
        // // 파라미터 초기화
 
        // 딥카피 (그냥 =으로 선언하면 값이 다 연결되서 안됨)
        let sTmpForm = this.oBasicForm.map((item:any) => ({ ...item })); // 기본 폼 복사
        sTmpForm[0].value =  pEvent.event.value; 
        this.oWpData[pEvent.model_idx] = pEvent.event.value;       
        for (let param of s_argParam) {
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
            sTmpForm.push(param_json);
        }

        // 각 모델 인덱스에 독립적인 parameter 설정
        // 딥카피
        const deepCopiedArgParam = JSON.parse(JSON.stringify(s_argParam)); // 깊은 복사
        this.oWpData[pEvent.model_idx] = {
            ...this.oWpData[pEvent.model_idx],
            parameter: deepCopiedArgParam,
        };

        // 초기 form 설정
        if (pModel) {
            this.h_modelFormList.push(sTmpForm);
        } else {
            this.h_modelFormList.splice(pEvent.model_idx, 1, sTmpForm);
        }
    }

    onAddList(pEvent?: any) {
        let sAddIndex = Math.max.apply(null, Object.keys(this.oWpData) as unknown as number[]) + 1;
        this.oWpData[sAddIndex] = {};
        // 딥카피
        this.h_modelFormList.push(this.oBasicForm.map((item:any) => ({ ...item })));
        //@ts-ignore
        $('.scrollbar').scrollbar();
    }
    onRemoveList(pIndex: any) {
        // Form 목록에서 삭제
        this.h_modelFormList.splice(pIndex, 1);
        // 바인딩 되었던 데이터도 삭제처리.
        // 원래 모델 갯수
        let sModelCnt = Object.keys(this.oWpData).length;
        for (let sIndex = pIndex + 1; sIndex < sModelCnt; sIndex++) {
            // 삭제되는 Index 부터 하나씩 앞으로 당기고 마지막 데이터를 삭제함.
            this.oWpData[sIndex-1] = this.oWpData[sIndex];
        }
        delete this.oWpData[sModelCnt-1];
    }
    setEnsembleData(pEvent:any){
        let sModelKeyList = Object.keys(this.oWpData);
        let sValid = { isSuccess: true, msg: '' };
        if (sModelKeyList.length < 2) {
            sValid = { isSuccess: false, msg: '2개 이상의 모델을 설정해주세요.' };
        } else {
            sModelKeyList.forEach((sKey:any) => {
                if (!this.oWpData[sKey]['ARG_ID']) {
                    sValid = {isSuccess:false, msg:'모델을 설정해주세요'};
                }
            })
        }
        if (sValid.isSuccess){
            this.dialogRef.close(Object.values(this.oWpData));
        } else {
            this.cWpAppSvc.showMsg(sValid.msg, false);
        }
    }
    onClose() {
        this.dialogRef.close();
    }


    public async onArgParamChanged(p_ev: any, p_form: any, p_modelIdx: any = null) {
        console.log("p_ev : ",p_ev);
        console.log("p_form : ",p_form);
        console.log("p_idx : ",p_modelIdx);
        console.log("oWpdata : ",this.oWpData);
        let s_formName = p_form.name;
        let s_formValue: any;
        let s_formType = p_form.type;
        if (s_formType == 'select') {
            s_formValue = p_ev.selectedItem
        } else if (s_formType == 'text') {
            s_formValue = p_form.value;
        } 
        // // oWpdata에서 해당 파라미터 가져오기
        const s_wpParam = this.oWpData[p_modelIdx].parameter.find((param: any) => param.name === p_form.name);
        let s_wpValue = s_wpParam.value;
        let s_wpParamType = s_wpParam.type;
        const validations = [
            () => ['integer', 'float'].includes(s_wpParamType) ? this.isValidNumber(s_formValue, s_formName, s_wpParamType) : { isValid: true },
            () => this.isValidExtra(s_formValue, p_form, s_formName)
        ];
        // // 유효성 검사 함수들을 배열로 저장
        // const validations = [
        //     () => ['integer', 'float'].includes(s_wpParamType) ? this.isValidNumber(s_formValue, s_wpParamType) : { isValid: true },
        //     async () => await this.isValidExtra(s_formValue, p_form, 'parameter'),
        // ];
        for (const validate of validations) {
            const result: any = await validate();
            if (!result.isValid) {
                    this.cWpAppSvc.showMsg(result['result'], false);
            
                if (s_formType == 'text') {
                    p_ev.target.value = s_wpValue;
                    p_form.value = s_wpValue;
                } 
                return; // isValid가 false이면 함수 종료/
            }
        }
        // valid 통과하면 변경된 값으로 업데이트
        s_wpParam.value = s_formValue;
        p_form.value = s_formValue;
        console.log(" this.oWpData : ",  this.oWpData);

        // // 조건에 맞는 요소의 value를 바로 업데이트
        // this.oWpData.parameter.forEach((param: any) => {
        //     if (param.name === s_formName) {
        //         if (['text', 'select', 'multiple_select'].includes(s_formType)) {
        //             param.value = s_formValue;
        //         } else if (s_formType == 'range_input') {
        //             param.value[p_idx] = s_formValue;
        //         }
        //     }
        // });
    }

    async isValidExtra(p_value: any, p_form: any, p_formname: string) {
        let s_isValid = { isValid: true, result: p_value };
            if (p_form.type == 'text') {
                if ((p_value < Number(p_form.fvalue[0])) || p_value > Number(p_form.fvalue[1])) {
                    s_isValid = { isValid: false, result: `사용 가능한 값은 ${p_form.fvalue[0]} ~ ${p_form.fvalue[1]} 사이입니다.` };
                }
            }


        return s_isValid;
    }

    async isValidNumber(p_value: any, p_formName: any, p_wpParamType: string) {
        let s_isValid = { isValid: true, result: p_value };
        if (p_value == '' || p_value == null || isNaN(p_value)) {
            s_isValid = { isValid: false, result: `${p_formName}에 유효한 ${p_wpParamType} 값을 입력해주세요`};
        }

        if(p_wpParamType == 'integer' && !Number.isInteger(Number(p_value)) ) {
            s_isValid = { isValid: false, result: `${p_formName}에 유효한 ${p_wpParamType} 값을 입력해주세요`};
        }
        
        
        return s_isValid;
    }

    loadEstimatorsInfo(p_estimators: any) {
        this.h_modelFormList = [];
        p_estimators.forEach((estimator:any , index:any) => {
            this.oWpData[index] = estimator;
            console.log(`Index: ${index}, Estimator: ${estimator}`);
            let sTmpForm = this.oBasicForm.map((item:any) => ({ ...item }));
            let cleanedEstimator = { ...estimator }; // 원본 객체를 복사
            delete cleanedEstimator['parameter'];
            sTmpForm[0].value = cleanedEstimator
            for(var param of estimator.parameter) {
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
                sTmpForm.push(param_json);
            }
            this.h_modelFormList.push(sTmpForm);
        });
        //로드한 알고리즘 선택되도록.
        setTimeout(() => {
            this.h_argSelectBoxs.forEach((sElem: DxSelectBoxComponent) =>{
                let sElemId = sElem.instance.element().id;
                if (sElemId.startsWith('arg_')) {
                    sElem.selectedItem = { VALUE: sElem.value, VNAME: sElem.value.ARG_NM };
                    sElem.instance.focus();
                    sElem.instance.blur();
                }
            });

        }, 100);
    }
}
