import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { DP_MODEL_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_MODEL_MSTR';
@Injectable({ providedIn: 'root' })
export class WpCompareModelService extends WpSeriveImple {
    constructor(
        private cAppConfig: WpAppConfig,
        private cHttp: HttpClient,
        private cTransSvc: TranslateService
    ) {
        super(cAppConfig);
    }
    // 비교 컴포넌트 속성 창에서 표시할 정보
    // 회귀 그리드
    oRGridCol = [
        // { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'model_name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"), TYPE: 'string' },
        { NAME: 'mape', VISIBLE: true, VNAME: 'MAPE', TYPE: 'number' },
        { NAME: 'mse', VISIBLE: true, VNAME: 'MSE', TYPE: 'number' },
        { NAME: 'rmse', VISIBLE: true, VNAME: 'RMSE', TYPE: 'number' },
        { NAME: 'r2_score', VISIBLE: true, VNAME: 'R2 Score', TYPE: 'number' }
    ];
    // 분류 그리드
    oCGridCol = [
        { NAME: 'model_name', VISIBLE: true, VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"), TYPE: 'string' },
        { NAME: 'accuracy', VISIBLE: true, VNAME: 'Accuracy', TYPE: 'number' },
    ];
    // 클래스별 precision, recall, f1 score 필요시 아래 주석 해제
    // oCGridCol = [
    //     { NAME: 'model_name', VISIBLE: true, VNAME: 'MODEL NAME', TYPE: 'string' },
    //     { NAME: 'ClassName', VISIBLE: true, VNAME: '클래스명', TYPE: 'string' },
    //     { NAME: 'F1Score', VISIBLE: true, VNAME: 'F1 Score', TYPE: 'number' },
    //     { NAME: 'Precision', VISIBLE: true, VNAME: 'Precision', TYPE: 'number' },
    //     { NAME: 'Recall', VISIBLE: true, VNAME: 'Recall', TYPE: 'number' },
    //     { NAME: 'Support', VISIBLE: true, VNAME: 'Support', TYPE: 'number' },
    // ];
    // 클러스터링 그리드
    oCLGridCol = [
        { NAME: 'model_name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"), TYPE: 'string' },
        { NAME: 'silhoutte_coef', VISIBLE: true, VNAME: 'Silhoutte Coef', TYPE: 'number' },
    ];
    // 파라미터 비교 그리드
    oCompareParamGridCol = [
        { NAME: 'model_name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info72"), TYPE: 'string' },
        { NAME: 'alg_param', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info84"), TYPE: 'string' },
        { NAME: 'feature_type', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info4"), TYPE: 'string' },
        { NAME: 'optimizer_yn', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info23"), TYPE: 'string' },
    ];
    
    getModelParams(pComIdList: string[], pModelIdDataList?: { MODEL_ID: number, MODEL_IDX: number }[]) {
        return new Promise((resolve, reject) => {
            this.cHttp.post(this.oNodeUrl + '/wkservice/getModelParams', { analComIdList: pComIdList, modelIdDataList: pModelIdDataList ? pModelIdDataList : [] })
                .toPromise().then((pResult: any) => {
                    pResult.result.forEach((sResult: any) => {
                        // (파라미터) key: 파라미터명, value: 설정값 으로 매핑
                        let sParamInfo: any = {};
                        let sModelArgParam = JSON.parse(sResult.MODEL_ARG_PARAM);
                        sModelArgParam.forEach((sParam: any) => {
                            sParamInfo[sParam.PARAM_NM] = sParam.PARAM_VALUE.VALUE;
                        })
                        sResult.MODEL_ARG_PARAM = sParamInfo;

                        // (검증 데이터 분할) key: 분할 옵션명, value: 설정값 으로 매핑
                        let sPartOption: { option: string, type: string, value: number } = JSON.parse(sResult.MODEL_PART_OPTION);
                        let sPartInfo: any = {};
                        // sPartInfo[sPartOption.type === 't-holdout' ? '학습-평가 데이터 분할' : '교차 검증'] = sPartOption.option;
                        if (sPartOption.type === 't-holdout') {
                            sPartInfo[this.cTransSvc.instant("WPP_MODEL_MANAGER.INFO.info97")] = sPartOption.option;
                        } else if (sPartOption.type === 't-cv') {
                            sPartInfo[this.cTransSvc.instant("WPP_MODEL_MANAGER.INFO.info98")] = sPartOption.option;
                        } else if (sPartOption.type === 't-loocv') {
                            sPartInfo[this.cTransSvc.instant("WPP_MODEL_MANAGER.INFO.info99")] = sPartOption.option;
                        }
                        sResult.MODEL_PART_OPTION = sPartInfo;
                    });
                    resolve(pResult.result);
                }, pError => {
                    reject(pError);
                });
        });
    }

    getCompareModelResultGridData(pRawDataList: DP_MODEL_MSTR_ATT[]) {
        // 분석 결과 데이터
        let sGridData: any[] = [];
        let sModelType = '';

        pRawDataList.forEach((pRawData: any) => {
            let sEvalResult = {
                result: pRawData.evaluateLog,
                MODEL_NM: pRawData.modelname,
                MODEL_EVAL_TYPE: pRawData.ARG_TYPE,
                // MODEL_FEATURE_IMPORTANCE: pRawData.MODEL_FEATURE_IMPORTANCE !== '' ? JSON.parse(pRawData.MODEL_FEATURE_IMPORTANCE) : undefined
            };
            sModelType = sEvalResult.MODEL_EVAL_TYPE;
            let sResultData = sEvalResult.result;
            // 분석 결과 데이터
            if (sModelType == 'Regression') {
                sGridData.push({
                    // argId: sEvalResult.result.argId,
                    model_name: sEvalResult.MODEL_NM,
                    mape: sResultData.mape.toFixed(3),
                    mse: sResultData.mse.toFixed(3),
                    rmse: sResultData.rmse.toFixed(3),
                    // mape: sResultData.mape.toFixed(3),
                    r2_score: sResultData.r2_score.toFixed(3)
                });
            }
            else if (sModelType == 'Classification') {
                sGridData.push({
                    model_name: sEvalResult.MODEL_NM,
                    accuracy: sResultData.accuracy * 100,
                });
                // 클래스별 precision, recall, f1 score 필요시 아래 주석 해제
                // let pData = sEvalResult.result.reVal;
                // let pLabelMap = JSON.parse(sEvalResult.result.reVal.labelData);
                // for (let labelIdx in pLabelMap['labelVal']) {
                //     let gridRow = {
                //         model_name: sEvalResult.MODEL_NM,
                //         ClassName: pLabelMap['labelVal'][labelIdx],
                //         Precision: (Number(pData["precision"][labelIdx])).toFixed(2),
                //         Recall: (Number(pData["recall"][labelIdx])).toFixed(2),
                //         F1Score: (Number(pData["fscore"][labelIdx])).toFixed(2),
                //         Support: pData["support"][labelIdx],
                //         ClassCode: labelIdx
                //     };
                //     sGridData.push(gridRow);
                // }
            }
            else if (sModelType == 'Clustering') {
                sGridData.push({
                    // argId: sEvalResult.result.argId,
                    model_name: sEvalResult.MODEL_NM,
                    silhoutte_coef: Number(sEvalResult.result['silhouette_coef']).toFixed(4)
                });
            }
        });

        // 모델 타입에 따라서 화면에 표시하는 데이터 설정
        let sResult: any = {
            gridCol: [], gridData: sGridData,
        }
        if (sModelType == 'Regression') {
            sResult.gridCol = this.oRGridCol;
        }
        if (sModelType == 'Classification') {
            sResult.gridCol = this.oCGridCol;
        }
        if (sModelType == 'Clustering') {
            sResult.gridCol = this.oCLGridCol;
        }

        return sResult;
    }

    // 모델 파라미터 비교 그리드 데이터
    getCompareModelParamGridData(pRawDataList: any) {
        let sGridData: any[] = [];
        pRawDataList.forEach((pRawData: any) => {
            sGridData.push({
                // argId: sEvalResult.result.argId,
                model_name: pRawData.modelname,
                alg_param: Object.keys(pRawData.useParams).map(sKey => sKey + ': ' + String(pRawData.useParams[sKey])).join(', '),
                feature_type: pRawData.scaler,
                optimizer_yn: pRawData.optimizer,
            });

        })
        return { gridCol: this.oCompareParamGridCol, gridData: sGridData };
    }

    getCompareChartData(pResultDataList: any) {

        let sModelType = pResultDataList[0].ARG_TYPE;
        let sChartDataList: any[] = [];
        let sChartFieldList: any[] = [];

        // 비교 차트 표시 데이터
        if (sModelType == 'Regression') {
            sChartDataList = [
                { group_nm: 'mape' },
                { group_nm: 'mse' },
                { group_nm: 'rmse' },
                { group_nm: 'r2_score' }
            ];
        }
        else if (sModelType == 'Classification') {
            sChartDataList = [
                { group_nm: 'accuracy' }
                // 클래스별 precision, recall, f1 score 필요시 아래 주석 해제
                // { group_nm: 'precision' },
                // { group_nm: 'recall' },
                // { group_nm: 'F1 score' }
            ];
        }
        else if (sModelType == 'Clustering') {
            sChartDataList = [
                { group_nm: 'silhoutte_coef' },
            ];
        }

        pResultDataList.forEach((sResult:any) => {
            let sEvalResult = {
                result: sResult.evaluateLog,
                MODEL_NM: sResult.modelname,
                MODEL_EVAL_TYPE: sResult.ARG_TYPE,
                // MODEL_FEATURE_IMPORTANCE: sResult.MODEL_FEATURE_IMPORTANCE !== '' ? JSON.parse(sResult.MODEL_FEATURE_IMPORTANCE) : undefined
            };
            let sResultData = sEvalResult.result;

            let sModelName: any = sEvalResult.MODEL_NM;

            // sModelName = sModelName.join('_');

            if (sModelType == 'Regression') {
                sChartFieldList.push({ valueField: sModelName, name: sModelName });
                sChartDataList.forEach((sChartData: any) => {
                    if (sChartData.group_nm === 'mape') {
                        sChartData[sModelName] = Number(sResultData.mape.toFixed(3));
                    }
                    else if (sChartData.group_nm === 'mse') {
                        sChartData[sModelName] = Number(sResultData.mse.toFixed(3));
                    }
                    else if (sChartData.group_nm === 'rmse') {
                        sChartData[sModelName] = Number(sResultData.rmse.toFixed(3));
                    }
                    else if (sChartData.group_nm === 'r2_score') {
                        sChartData[sModelName] = Number(sResultData.r2_score.toFixed(3));
                    }
                });
            }
            else if (sModelType == 'Classification') {
                sChartFieldList.push({ valueField: sModelName, name: sModelName });
                sChartDataList.forEach((sChartData: any) => {
                    if (sChartData.group_nm === 'accuracy') {
                        sChartData[sModelName] = Number(sResultData.accuracy * 100)
                    }
                });
                // // 클래스별 precision, recall, f1 score 필요시 아래 주석 해제
                // let pData = sEvalResult.result.reVal;
                // let pLabelMap = JSON.parse(sEvalResult.MODEL_FEATURE_IMPORTANCE.labelData);
                // for (let labelIdx in pLabelMap['labelVal']) {
                //     let sModelClassName = sModelName + '_' + pLabelMap['labelVal'][labelIdx]

                //     sChartFieldList.push({ valueField: sModelClassName, name: sModelClassName })

                //     sChartDataList.forEach(sChartData => {
                //         if (sChartData.group_nm === 'precision') {
                //             sChartData[sModelClassName] = Number(Number(pData["precision"][labelIdx]).toFixed(2))
                //         }
                //         else if (sChartData.group_nm === 'recall') {
                //             sChartData[sModelClassName] = Number(Number(pData["recall"][labelIdx]).toFixed(2))
                //         }
                //         else if (sChartData.group_nm === 'F1 score') {
                //             sChartData[sModelClassName] = Number(Number(pData["fscore"][labelIdx]).toFixed(2))
                //         }
                //     })
                // }
            }
            else if (sModelType == 'Clustering') {
                sChartFieldList.push({ valueField: sModelName, name: sModelName });
                sChartDataList.forEach((sChartData: any) => {
                    if (sChartData.group_nm === 'silhoutte_coef') {
                        sChartData[sModelName] = Number(Number(sResultData['silhouette_coef']).toFixed(4));
                    }
                });
            }
        })

        return { chartDataList: sChartDataList, chartFieldList: sChartFieldList };
    }
}