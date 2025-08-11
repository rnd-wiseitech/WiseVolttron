import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ILoadArgMstrData } from 'projects/algorithm-manager/src/app/layer-create/popup/load-layer-popup.component';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { DP_ARG_MSTR_ATT } from 'projects/wp-server/metadb/model/DP_ARG_MSTR';
import { DP_ARG_PARAM_ATT } from 'projects/wp-server/metadb/model/DP_ARG_PARAM';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class WpTransferModelService extends WpSeriveImple {
    constructor(
        private cAppConfig: WpAppConfig,
        private cHttp: HttpClient,
        private cTransSvc: TranslateService
        ) {
        super(cAppConfig);
    }
    private oModelType: string = '';
    // 분석 컴포넌트 속성 창에서 표시할 그리드 정보
    // 회귀 그리드
    oRGridCol = [
        // { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'argNm', VISIBLE: true, VNAME: 'ARG NM', TYPE: 'string' },
        { NAME: 'accuracy', VISIBLE: true, VNAME: 'Accuracy', TYPE: 'number' },
        { NAME: 'mse', VISIBLE: true, VNAME: 'MSE', TYPE: 'number' },
        { NAME: 'rmse', VISIBLE: true, VNAME: 'RMSE', TYPE: 'number' },
        { NAME: 'mape', VISIBLE: true, VNAME: 'mape', TYPE: 'number' },
        { NAME: 'r2_score', VISIBLE: true, VNAME: 'R2 Score', TYPE: 'number' }
    ];
    // 분류 그리드
    oCGridCol = [
        { NAME: 'ClassName', VISIBLE: true, VNAME: 'Class', TYPE: 'string' },
        { NAME: 'F1Score', VISIBLE: true, VNAME: 'F1 Score', TYPE: 'number' },
        { NAME: 'Precision', VISIBLE: true, VNAME: 'Precision', TYPE: 'number' },
        { NAME: 'Recall', VISIBLE: true, VNAME: 'Recall', TYPE: 'number' },
        { NAME: 'Support', VISIBLE: true, VNAME: 'Support', TYPE: 'number' },
    ];
    // 클러스터링 그리드
    oCLGridCol = [
        // { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'argNm', VISIBLE: true, VNAME: 'ARG NM', TYPE: 'string' },
        { NAME: 'silhoutte_coef', VISIBLE: true, VNAME: 'Silhoutte Coef', TYPE: 'number' },
    ];
    // 변수 중요도 그리드
    oFeatureImportGridCol = [
        // { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'varNm', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info83"), TYPE: 'string' },
        { NAME: 'importance', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info63"), TYPE: 'number' },
    ];
    // 변수 영향도 그리드
    oInfluenceGridCol = [
        { NAME: 'varNm', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info83"), TYPE: 'string' },
        { NAME: 'importance', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info82"), TYPE: 'number' },
    ]

    // 최적화 파라미터 그리드
    o_optParamGridCol = [
        { NAME: 'paramNm', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info16"), TYPE: 'string' },
        { NAME: 'paramValue', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info17"), TYPE: 'string' },
    ];
    // 클러스터 차트 색상
    h_ChartColors = [
        '#577df6',
        '#63c89b',
        '#f5c643',
        '#00cec9',
        '#8173ed',
        '#ff7675',
        '#ec8959'
    ];
    // 모델 유형(분류, 회귀, 군집) 설정
    setModelType(pType: string) {
        this.oModelType = pType;
    }
    getModelType() {
        return this.oModelType;
    }
    getModelList() {
        let sStorageType = this.cAppConfig.getConfig('STORAGE_TYPE')
        return this.cHttp.post(this.oNodeUrl + '/model/getModelList', {});
    }
    getVarMstrList(pModelId?:number, pModelIdx?:number) {
        return this.cHttp.post(this.oNodeUrl + '/model/getVarMstr', {
            modelId: pModelId,
            modelIdx: pModelIdx
        });
    }

    // 알고리즘 리스트
    getWpAlgorithmList(pWhere?:any): Promise<DP_ARG_MSTR_ATT[]> {
        let sWhere = pWhere ? pWhere : {};
        return new Promise((resolve, reject) => {
            this.cHttp.post<DP_ARG_MSTR_ATT[]>(this.oNodeUrl + '/model/argList', sWhere)
                .toPromise().then((response) => {
                    resolve(response);
                }, pError => {
                    reject(pError);
                });
        })
    }
    getWfAlgorithmList(pWhere?:any): Promise<any> {
        let sWhere = pWhere ? pWhere : {};
        return new Promise((resolve, reject) => {
            this.cHttp.post<any>(this.oNodeUrl + '/model/argWorkFlowList', sWhere)
                .toPromise().then((response) => {
                    resolve(response);
                }, pError => {
                    reject(pError);
                });
        })
    }
    // 사용자 알고리즘 리스트
    getWpUserAlgorithmList(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.cHttp.post(this.oNodeUrl + '/model/argList', { 'USER_MODEL_YN': 'Y' })
                .toPromise().then((response: any) => {
                    let sUserModel = (response as ILoadArgMstrData[]).filter((sModel) => sModel.LAYER_YN === 'Y');
                    resolve(sUserModel);
                }, pError => {
                    reject(pError);
                });
        })
    }
    // 모델별 파라미터 리스트
    getWpArgParameterList(pWhere?:any): Promise<DP_ARG_PARAM_ATT[]> {
        let sWhere = pWhere ? pWhere : {};
        console.log(pWhere)
        return new Promise((resolve, reject) => {
            this.cHttp.post<DP_ARG_PARAM_ATT[]>(this.oNodeUrl + '/model/parameterList', sWhere).toPromise().then((response) => {
                resolve(response);
            }, error => {
                reject(error);
            });
        })
    }
    getModelResultGridData(p_modelResult: any) {
        // 분석 결과 데이터
        let sGridData = []
        // 변수 중요도 데이터
        let sFeatureGridData: any[] = []
        // 변수별 영향도 데이터
        let sInfluenceGridData = []

        let s_evalResult = {
            MODEL_NM: p_modelResult.modelname,
            MODEL_EVAL_TYPE: p_modelResult.argInfo.ARG_TYPE,
            evaluateLog: p_modelResult.evaluateLog,
            featureLog: p_modelResult.featureLog
        }
        let s_modelType = s_evalResult.MODEL_EVAL_TYPE;
        
        // 변수 영향도 그리드 데이터
        if (s_modelType !== 'Clustering' && s_evalResult.hasOwnProperty('featureLog') && s_evalResult.featureLog !== '') {
            let s_featureGrid = s_evalResult.featureLog;
            for (const sKey in s_featureGrid) {
                sInfluenceGridData.push({
                    varNm: sKey,
                    importance: Number(s_featureGrid[sKey]).toFixed(3)
                })
            }
        }

        // 분석 결과 데이터
        if (s_modelType == 'Regression') {
            sGridData.push({
                // argId: sEvalResult.result.argId,
                argNm: s_evalResult.MODEL_NM,
                accuracy: s_evalResult.evaluateLog.accuracy.toFixed(3),
                mse: s_evalResult.evaluateLog.mse.toFixed(3),
                rmse: s_evalResult.evaluateLog.rmse.toFixed(3),
                mape: s_evalResult.evaluateLog.mape.toFixed(3),
                r2_score: s_evalResult.evaluateLog.r2_score.toFixed(3)
            });
        }
        else if (s_modelType == 'Classification') {
            let s_modelResult = JSON.parse(s_evalResult.evaluateLog.result);
            let s_labelData = s_modelResult.columns;
            for (let idx in s_labelData) {
                let gridRow = {
                    "ClassName": s_labelData[idx],
                    "Precision": (Number(s_evalResult.evaluateLog.precision[idx])).toFixed(2),
                    "Recall": (Number(s_evalResult.evaluateLog.recall[idx])).toFixed(2),
                    "F1Score": (Number(s_evalResult.evaluateLog.fscore[idx])).toFixed(2),
                    "Support": s_evalResult.evaluateLog.support[idx],
                    "ClassCode": idx
                };
                sGridData.push(gridRow);
            }
        }
        else if (s_modelType == 'Clustering') {
            sGridData.push({
                // argId: sEvalResult.result.argId,
                argNm: s_evalResult.MODEL_NM,
                silhoutte_coef: Number(s_evalResult.evaluateLog.silhouette_coef).toFixed(4)
            });
        }



        // let sModelType = ''
        // let sEvalResult = {
        //     result: JSON.parse(pRawData.MODEL_EXCUTE_RESULT),
        //     MODEL_NM: pRawData.MODEL_NM,
        //     MODEL_EVAL_TYPE: pRawData.MODEL_EVAL_TYPE,
        //     // MODEL_FEATURE_IMPORTANCE: pRawData.MODEL_FEATURE_IMPORTANCE !== '' ? JSON.parse(pRawData.MODEL_FEATURE_IMPORTANCE) : undefined
        // }
        // sModelType = sEvalResult.MODEL_EVAL_TYPE;
        // let sResultData = sEvalResult.result;

        // // 변수 영향도 그리드 데이터
        // if (sModelType !== 'Clustering' && sResultData.hasOwnProperty('featureLog') && sResultData.featureLog !== '') {
        //     let sGridData = JSON.parse(sResultData.featureLog)
        //     for (const sKey in sGridData) {
        //         sInfluenceGridData.push({
        //             varNm: sKey,
        //             importance: Number(sGridData[sKey]).toFixed(3)
        //         })
        //     }
        // }

        // // 변수 중요도 그리드 데이터
        // // sInfluenceGridData = this.getFeatureImportGridData(sEvalResult.MODEL_FEATURE_IMPORTANCE)

        // // 분석 결과 데이터
        // if (sModelType == 'Regression') {
        //     sGridData.push({
        //         // argId: sEvalResult.result.argId,
        //         argNm: sEvalResult.MODEL_NM,
        //         accuracy: sResultData.mape.toFixed(3),
        //         mse: sResultData.mse.toFixed(3),
        //         rmse: sResultData.rmse.toFixed(3),
        //         test_score: sResultData.test_score.toFixed(3)
        //     });
        // }
        // else if (sModelType == 'Classification') {
        //     let pData = sResultData;
        //     let pLabelMap = JSON.parse(sResultData.labelData);
        //     for (let labelIdx in pLabelMap['labelVal']) {
        //         let gridRow = {
        //             "ClassName": pLabelMap['labelVal'][labelIdx],
        //             "Precision": (Number(pData["precision"][labelIdx])).toFixed(2),
        //             "Recall": (Number(pData["recall"][labelIdx])).toFixed(2),
        //             "F1Score": (Number(pData["fscore"][labelIdx])).toFixed(2),
        //             "Support": pData["support"][labelIdx],
        //             "ClassCode": labelIdx
        //         };
        //         sGridData.push(gridRow);
        //     }
        // }
        // else if (sModelType == 'Clustering') {
        //     sGridData.push({
        //         // argId: sEvalResult.result.argId,
        //         argNm: sEvalResult.MODEL_NM,
        //         silhoutte_coef: Number(sResultData['silhouette_coef']).toFixed(4)
        //     });
        // }

        // 모델 타입에 따라서 화면에 표시하는 데이터 설정
        let sResult: any = {
            gridCol: [], gridData: sGridData,
            featureGridCol: this.oFeatureImportGridCol, featureGridData: sFeatureGridData,
            influenceGridCol: this.oInfluenceGridCol, influenceGridData: sInfluenceGridData,
            optParamGridCol: this.o_optParamGridCol, optParamGridData: []
        }
        if (s_modelType == 'Regression') {
            sResult.gridCol = this.oRGridCol;
        }
        if (s_modelType == 'Classification') {
            sResult.gridCol = this.oCGridCol;
        }
        if (s_modelType == 'Clustering') {
            sResult.gridCol = this.oCLGridCol;
        }
        // 최적화 모델 최종 파라미터
        // // const s_optParam = JSON.parse(sResultData['optParams']);
        let s_optParamGridData = []
        if(p_modelResult.optimizer == true) {
            for (const [key, value] of Object.entries(p_modelResult.useParams)) {
                s_optParamGridData.push({ paramNm: key, paramValue: value });
            }
        }
        sResult.optParamGridData = s_optParamGridData;

        return sResult;
    }
    getModelChartData(p_modelResult: any) {
        let s_evalResult = {
            MODEL_NM: p_modelResult.modelname,
            MODEL_EVAL_TYPE: p_modelResult.argInfo.ARG_TYPE,
            evaluateLog: p_modelResult.evaluateLog
        }
        let s_modelType = s_evalResult.MODEL_EVAL_TYPE;

        // 분류 차트 데이터 280강화학습
        if (s_modelType == 'Classification' || s_modelType == 'Reinforcement') {
            let s_modelResult = JSON.parse(s_evalResult.evaluateLog.result);
            // let pChartData = JSON.parse(s_modelResult['reVal']);
            let s_labelCap = s_modelResult.columns;
            let sConfusionData = this.getConfusionData(s_evalResult.evaluateLog, s_modelResult, s_labelCap);
            console.log("sConfusionData : ", sConfusionData);
            return sConfusionData
        }


        // MLFLOW 적용 TO DO : 회귀 클러스터 차트 적용 필요.
        // 회귀 차트 데이터
        
        else if (s_modelType == 'Regression' || s_modelType == 'Recommend') {
            let pData = typeof s_evalResult.evaluateLog.result == 'string' ? s_evalResult.evaluateLog.result : s_evalResult.evaluateLog.result.reVal;
            let sPreData = JSON.parse(pData)['predict'];
            let sOrgPreData = JSON.parse(pData)['original'];

            let sLabel = Object.keys(sPreData)
            if (pData['labelVal'] != undefined) {
                sLabel = JSON.parse(pData['labelVal']);
            }
            // 가장 끝 100개의 데이터만 보여 줌.
            let sChartDataLength = sPreData.length;
            if (sChartDataLength > 100) {
                sPreData = sPreData.slice(sChartDataLength - 100);
                sOrgPreData = sOrgPreData.slice(sChartDataLength - 100);
                sLabel = sLabel.slice(0, 100);
                if (pData['labelVal'] != undefined) {
                    sLabel = JSON.parse(pData['labelVal']);
                    sLabel = sLabel.slice(sChartDataLength - 100)
                }
            }
            let sDataOption1 = {
                label: 'Predict Data',
                borderColor: '#f5c643',
                backgroundColor: "rgba(239,244,254,0.2)",
                pointBackgroundColor: '#f5c643',
                pointHoverBorderColor: '#f5c643',
                pointHoverBackgroundColor: "#fff",
                pointBorderColor: '#f5c643',
                showLine: true,
                lineTension: 0.5,
                pointHoverBorderWidth: 4,
                borderDash: [2, 4]
            }
            let sDataOption2 = {
                label: 'Original Data',
                borderColor: '#577df6',
                backgroundColor: "rgba(239,244,254,0.2)",
                pointBackgroundColor: '#577df6',
                pointHoverBorderColor: '#577df6',
                pointHoverBackgroundColor: "#fff",
                pointBorderColor: '#577df6',
                lineTension: 0.5,
                pointHoverBorderWidth: 4
            }
            let sChartData = {
                TargetId: "test",
                Title: "Evalution Chart",
                Label: sLabel,
                ChartType: 'line',
                ChartOption: {
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        x: {
                            display: true,
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Value'
                            },
                        }
                    },
                    legend: {
                        display: false,
                    }
                },
                Data: [
                    { Title: "Precdict Data", Data: sPreData, DataOption: sDataOption1 },
                    { Title: "Origin Data", Data: sOrgPreData, DataOption: sDataOption2 }
                ]
            };
            return sChartData;
        }

        // 클러스터 이미지
        else if (s_modelType == 'Clustering') {
            let pData = s_evalResult.evaluateLog.result
            let aChartData;
            let aClusterCenter;
            try {
                aChartData = JSON.parse(pData);
            } catch (error) {
                aChartData = JSON.parse(pData['result']);
            }
            let sClusterLabelNm = [];
            var data = [];
            let clustlabel = [];
            try {
                aClusterCenter = s_evalResult.evaluateLog.cluster_center;
            } catch (error) {
                aClusterCenter = pData['cluster_center'];
            }
            let pointRadius = [];
            let pointStyle = [];
            var cluster = [{
                x: 0,
                y: 0,
            }];

            for (let idx in aChartData.x) {
                if (clustlabel.indexOf(aChartData.Cluster_Label[idx]) === -1) {
                    cluster = [{
                        x: 0,
                        y: 0,
                    }];
                    let point = [0];
                    let poStyle = ['circle'];
                    sClusterLabelNm.push('cluster' + aChartData.Cluster_Label[idx]);
                    data.push(cluster);
                    pointRadius.push(point);
                    pointStyle.push(poStyle);
                    clustlabel.push(aChartData.Cluster_Label[idx]);
                }
                data[clustlabel.indexOf(aChartData.Cluster_Label[idx])].push({ x: aChartData.x[idx], y: aChartData.y[idx] });
                pointRadius[clustlabel.indexOf(aChartData.Cluster_Label[idx])].push(3);
                pointStyle[clustlabel.indexOf(aChartData.Cluster_Label[idx])].push('circle');
            }

            for (let aCenterIdx in aClusterCenter.x) {
                let sIndex = 0;
                if (clustlabel.indexOf(Number(aCenterIdx)) != -1)
                    sIndex = clustlabel.indexOf(Number(aCenterIdx));
                data[sIndex].push({ x: aClusterCenter.x[aCenterIdx], y: aClusterCenter.y[aCenterIdx] });
                pointRadius[sIndex].push(10);
                pointStyle[sIndex].push('triangle');
            }

            let sTmpData = [];
            let sAxis = [];

            if (data.length > this.h_ChartColors.length) {
                for (let i = 0; i <= (data.length - this.h_ChartColors.length); i++) {
                    this.h_ChartColors.push(this.getRandomColor());
                }
            }

            for (let sIdx in data) {
                sTmpData.push({
                    Data: data[sIdx],
                    DataOption: {
                        label: sClusterLabelNm[sIdx],
                        backgroundColor: this.h_ChartColors[sIdx],
                        pointRadius: pointRadius[sIdx],
                        pointStyle: pointStyle[sIdx]
                    }
                });
                sAxis.push({
                    type: 'linear',
                    position: 'bottom',
                })
            }

            let sClusterChartData: any = {
                TargetId: "test",
                Title: "Evalution Chart",
                Label: "",
                ChartType: 'scatter',
                ChartOption: {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'nearest',
                            intersect: true,
                            callbacks: {
                                label: function (context: any) {
                                    let label = "";
                                    if (context.dataset.data.length - 1 == context.dataIndex) {
                                        label = context.dataset.label + ' 중심';
                                    } else {
                                        label = context.dataset.label + ' : ' + context.dataset.data.length + '개';
                                    }
                                    return label;
                                },
                            },
                        }
                    },
                    scales: {
                        x: {
                            type: 'linear',
                            position: 'bottom'
                        }
                    },
                },
                Data: sTmpData
            };
            return sClusterChartData;
        } else {
            return;
        }
    }
    // 분류 분석 결과 추가 (prophet model-evaluation 참고)
    getConfusionData(pData: any, pChartData: any, pLabelMap: any) {
        let sEvalGridData: any = [];
        for (let idx in pLabelMap) {
            let gridRow = {
                "ClassName": (pLabelMap[idx]).replace("'",'').replace("'",''),
                "Precision": (Number(pData.precision[idx])).toFixed(2),
                "Recall": (Number(pData.recall[idx])).toFixed(2),
                "F1Score": (Number(pData.fscore[idx])).toFixed(2),
                "Support": pData.support[idx],
                "ClassCode": idx
            };
            sEvalGridData.push(gridRow);
        }

        




        // for (let labelIdx in pLabelMap['labelVal']) {
        //     let gridRow = {
        //         "ClassName": (pLabelMap['labelVal'][labelIdx]).replace("'",'').replace("'",''),
        //         "Precision": (Number(pData["precision"][labelIdx])).toFixed(2),
        //         "Recall": (Number(pData["recall"][labelIdx])).toFixed(2),
        //         "F1Score": (Number(pData["fscore"][labelIdx])).toFixed(2),
        //         "Support": pData["support"][labelIdx],
        //         "ClassCode": labelIdx
        //     };
        //     sEvalGridData.push(gridRow);
        // }

        let labelCount: any[] = [];
        let labelXaxis: any[] = [];
        let labelYaxis: any[] = [];
        let temCorrInfo: any = {
            Data: [],
            Layout: {
                annotations: [],
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                margin: {
                    l: 50,
                    r: 20,
                    b: 20,
                    t: 20,
                    pad: 0
                },
            }
        };
        for (let rowIdx in pChartData['data']) {
            let zRowItem = [];

            for (let rowItemIdx in pChartData['data'][rowIdx]) {
                let keyVal = sEvalGridData[rowItemIdx]['ClassName'];
                let zValue = pChartData['data'][rowIdx][rowItemIdx];
                let zTmp1 = [];
                zTmp1[keyVal] = zValue;
                zRowItem.push(zTmp1);
            }

            let keyVal = sEvalGridData[rowIdx]['ClassName'];
            let zTmp = [];
            zTmp[keyVal] = zRowItem
            labelCount[keyVal] = zTmp;
        }
        let aClassChk = false;
        if (!isNaN(Number(sEvalGridData[0]['ClassName']))) {
            aClassChk = true;
        }

        for (let rowIdx2 in pChartData['index']) {
            if (aClassChk) {
                labelXaxis.push("Class_" + sEvalGridData[rowIdx2]['ClassName']);
                labelYaxis.push("Class_" + sEvalGridData[rowIdx2]['ClassName']);
            } else {
                labelXaxis.push(sEvalGridData[rowIdx2]['ClassName']);
                labelYaxis.push(sEvalGridData[rowIdx2]['ClassName']);
            }
        }

        let data = [
            {
                z: pChartData['data'],
                x: labelXaxis,
                y: labelYaxis,
                colorscale: [
                    [0, '#3D9970'],
                    [1, '#001f3f']
                ],
                type: 'heatmap'
            }
        ];

        for (var i = 0; i < labelYaxis.length; i++) {
            for (var j = 0; j < labelXaxis.length; j++) {
                var currentValue = pChartData['data'][i][j];
                if (currentValue != 0.0) {
                    var textColor = 'white';
                } else {
                    var textColor = 'black';
                }
                var result: any = {
                    xref: 'x1',
                    yref: 'y1',
                    x: labelXaxis[j],
                    y: labelYaxis[i],
                    textangle: 0,
                    text: pChartData['data'][i][j],
                    font: {
                        family: 'Arial',
                        size: 18,
                        color: textColor
                    },
                    showarrow: false,
                };
                temCorrInfo.Layout.annotations.push(result);
            }
        }
        temCorrInfo.Data = data;
        return temCorrInfo;
    }
    // 변수 중요도 그리드 데이터
    getFeatureImportGridData(pFeatureImportanceData: any) {
        let sFeatureGridData: any[] = [];
        for (const sKey in pFeatureImportanceData) {
            if (!['analDataPath', 'chkTextAnalytic', 'featureDataSummury', 'labelData'].includes(sKey)) {
                sFeatureGridData.push({
                    varNm: sKey,
                    importance: Number(pFeatureImportanceData[sKey]).toFixed(3)
                });
            }
        }
        return sFeatureGridData;
    }
    getRandomColor() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    // 모델명으로 검색
    searchModel(pSearchWord: string) {
        const headers = { 'content-type': 'application/json' };
        return this.cHttp.post(this.oNodeUrl + "/model/modelManagement", {
            params: {
                "storageType": "HDFS",
                "generalSearch": pSearchWord
            }
        }, { 'headers': headers });
    }
    // 280강화학습
    getRewardResult(pViewId: string, pCode: string, pJobId: string, pColumn: string) {
        let sTmp = pViewId.split('_');
        let sParams = {
            usetable_groupId: sTmp[0],
            usetable_jobId: sTmp[1],
            value: pCode,
            jobId: pJobId,
            column: pColumn
        };
        return new Promise((resolve, reject) => {
            this.cHttp.post(this.oNodeUrl + '/wkservice/getRewardResult', sParams)
                .toPromise().then(response => {
                    resolve(response);
                }, pError => {
                    reject(pError);
                });
        });
    }


    async getArgParam(p_argId: any): Promise<Observable<any>>{        
        console.log("p_argId : ", p_argId);
        let s_argParam:any = await this.cHttp.post(this.oNodeUrl + '/model/getArgParam', {ARG_ID: p_argId}).toPromise();
        return s_argParam;
    } 

    async checkModelName(p_modelname: string): Promise<Observable<any>>{        
        let s_modelName:any = await this.cHttp.post(this.oNodeUrl + '/model/checkModelName', {MODEL_NM: p_modelname}).toPromise();
        return s_modelName;
    } 

    async getEnsembleArgList(p_argType: string): Promise<Observable<any>>{        
        let s_ensembleList:any = await this.cHttp.post(this.oNodeUrl + '/model/getEnsembleArgList', {ARG_TYPE:p_argType}).toPromise();
        return s_ensembleList;
    } 
    async getOverwriteModelList(): Promise<Observable<any>>{        
        let s_overwriteList:any = await this.cHttp.post(this.oNodeUrl + '/model/getOverwriteModelList', {}).toPromise();
        s_overwriteList = s_overwriteList.map((item: any) => item.MODEL_NM);
        return s_overwriteList;
    } 

    getModelInfo(p_data: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl +  '/jobexcute/getModelInfo', p_data);
    }
}