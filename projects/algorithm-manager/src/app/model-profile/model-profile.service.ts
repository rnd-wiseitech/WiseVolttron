import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModelProfileService extends WpSeriveImple {
    constructor(
        private cAppConfig: WpAppConfig,
        private cHttp: HttpClient,
        private cTransSvc: TranslateService
    ) {
        super(cAppConfig);
    }
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
    getModelInfoFormData(pData:any){
        let sGridCol = [
            { NAME: 'NAME', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info10"), TYPE: 'string' },
            { NAME: 'VALUE', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info11"), TYPE: 'number' }
        ];
        let sGridData = [];
        let sModelInfo = pData;
        
        sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info2"), VALUE: sModelInfo.MODEL_ID});
        sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info3"), VALUE: sModelInfo.tags.version});
        if(sModelInfo.tags.scaler) {
            sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info4"), VALUE: sModelInfo.tags.scaler});
        }
        if(sModelInfo.tags.label_info) {
            sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info25"), VALUE: sModelInfo.tags.label_info});
        }
        if (sModelInfo.HADOOP_PATH){
            sGridData.push({ NAME: '사용 데이터 파일 경로', VALUE: sModelInfo.HADOOP_PATH });
        }
        // [TODO] DATASET_ID
        if (sModelInfo.startTime) {
            sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info5"), VALUE: sModelInfo.startTime });
            sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info6"), VALUE: sModelInfo.endTime });
        }
        if (sModelInfo.tags){
            if (sModelInfo.tags.model_class){
                sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info7"), VALUE: sModelInfo.tags.model_class });
                sGridData.push({ NAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info8"), VALUE: sModelInfo.tags.model_name });
            }
        }
        return {
            gridRowEvt: false,
            hoverEffect: false,
            gridData: sGridData,
            gridCol: sGridCol,
            gridCallback: (pEvent: any) => { },
        };
    }

    getModelParamFormData(pData: any, p_ensembleArg?:any ) {
        let sParamGridCol = [
            { NAME: 'NAME', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info10"), TYPE: 'string' },
            { NAME: 'VALUE', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info11"), TYPE: 'number' }
        ];
        let sParamGridData = [];
        let sModelParams = pData;
        // 앙상블일 경우 해당 알고리즘에 맞는 파라미터만
        if(p_ensembleArg) {
            sModelParams = Object.keys(sModelParams)
            .filter(key => key.startsWith(p_ensembleArg))
            .reduce((acc:any, key) => {
                const newKey = key.replace(`${p_ensembleArg}__`, ""); // Prefix 제거
                acc[newKey] = sModelParams[key];
                return acc;
            }, {});
        } 
        if (sModelParams && Object.keys(sModelParams).length > 0) {
            let sParamKeyList = Object.keys(sModelParams);
            console.log("sParamKeyList : ", sParamKeyList);
            for (const sParamKey of sParamKeyList) {
                let sParamValue = sModelParams[sParamKey];
                if (sParamValue != null) {
                    if (typeof sParamValue == 'object') {
                        sParamValue = JSON.stringify(sParamValue)
                    }
                    if (typeof sParamValue == 'number') {
                        sParamValue = sParamValue.toFixed(3);
                    }
                    // 280강화학습
                    if (sParamKey =='action_variable') {
                        let s_data:any = [];
                        for(var json of sParamValue) {
                            console.log("json  : ", json)
                            console.log("json  : ", json.USE)
                            console.log("json  : ", json.NAME)
                            if(json.USE) {
                                s_data.push(json.NAME);
                            }
                        }
                        sParamValue = s_data.join();
                    }

                    sParamGridData.push({ NAME: sParamKey, VALUE: sParamValue });
                }
            }
        }
        if (sParamGridData.length > 6) {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sParamGridData,
                gridCol: sParamGridCol,
                gridCallback: (pEvent: any) => { },
                page: true,
                pageSize: 6
            };
        } else {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sParamGridData,
                gridCol: sParamGridCol,
                gridCallback: (pEvent: any) => { },
            };
        }

    }

    getClusterCenterData(pData: any) {
        let sParamGridCol = [
            { NAME: 'NAME', VISIBLE: true, VNAME: 'Cluster No', TYPE: 'string' },
            { NAME: 'X_VALUE', VISIBLE: true, VNAME: 'X', TYPE: 'number' },
            { NAME: 'Y_VALUE', VISIBLE: true, VNAME: 'Y', TYPE: 'number' }
        ];
        let sParamGridData:any = [];
        let sCenterData = pData;
        Object.keys(sCenterData['x']).forEach(sClusterNo => {
            sParamGridData.push({ NAME: sClusterNo, X_VALUE: sCenterData['x'][sClusterNo], Y_VALUE: sCenterData['y'][sClusterNo] })
        });

        if (sParamGridData.length > 6) {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sParamGridData,
                gridCol: sParamGridCol,
                gridCallback: (pEvent: any) => { },
                page: true,
                pageSize: 6
            };
        } else {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sParamGridData,
                gridCol: sParamGridCol,
                gridCallback: (pEvent: any) => { },
            };
        }     
    }

    getInflueceChartData(pData: any) {
        let sChartInfo: any;
        if (pData && pData != "") {
            let sInfluence: any;
            
            if (typeof pData == 'string')
                sInfluence = JSON.parse(pData);
            else 
                sInfluence = pData;

            let sFeatureList = Object.keys(sInfluence);
            if (sFeatureList.length > 0) {
                let sSortedInfluece: { key: string, value: number; }[] = [];
                sFeatureList.forEach((sFeature) => {
                    sSortedInfluece.push({ key: sFeature, value: sInfluence[sFeature] });
                });
                sSortedInfluece.sort((a, b) => {
                    return b.value - a.value;
                });
                sChartInfo = {
                    ChartType: 'bar',
                    Title: "Influcence Chart",
                    TargetId: "influence",
                    Label: sSortedInfluece.map(sData => sData.key),
                    Data: sSortedInfluece.map(sData => sData.value),
                    DataOption: {
                        label: 'influence',
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    },
                    ChartOption: {
                        plugins: {
                            legend: {
                                display: false,
                            },
                            tooltip: {
                                mode: 'nearest',
                                intersect: true,
                                callbacks: {
                                    label: function (context: any) {
                                        return context.dataset.label + ":" + context.dataset.data[context.dataIndex];
                                    },
                                },
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        },
                    },
                };
            }
        }
        return sChartInfo;
    }
    getRecommendChartData(pData:any, pArgId: any) {
        let labelCount = [];
        let labelXaxis = pData['similarity_label'];
        let labelYaxis = pData['similarity_label'];
        let temCorrInfo: any = {
            Data: [],
            Layout: {
                height: 300,
                margin: {
                    // l: 50,  // 왼쪽 여백
                    // r: 50,  // 오른쪽 여백
                    // b: 50,  // 아래쪽 여백
                    t: 10   // 위쪽 여백
                },
                annotations: [],

            }
        };
        for (let rowIdx in pData['similarity']) {
            let zRowItem = [];

            for (let rowItemIdx in pData['similarity'][rowIdx]) {
                let keyVal = pData['similarity_label'][rowItemIdx];
                let zValue = pData['similarity'][rowIdx][rowItemIdx];
                let zTmp1 = [];
                zTmp1[keyVal] = zValue;
                zRowItem.push(zTmp1);
            }

            let keyVal = pData['similarity_label'][rowIdx];
            let zTmp = [];
            zTmp[keyVal] = zRowItem
            labelCount[keyVal] = zTmp;
        }
        let aClassChk = false;
        if (!isNaN(Number(pData['similarity_label'][0]))) {
            aClassChk = true;
        }

        if (aClassChk) {
            if (pArgId == 34) {
                labelXaxis = labelXaxis.map((x: any) => "user_" + x);
                labelYaxis = labelYaxis.map((x: any) => "user_" + x);
            } else {
                labelXaxis = labelXaxis.map((x: any) => "item_" + x);
                labelYaxis = labelYaxis.map((x: any) => "item_" + x);
            }
        }

        let data = [
            {
                z: pData['similarity'],
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
                var currentValue = pData['similarity'][i][j];
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
                    text: pData['similarity'][i][j],
                    font: {
                        family: 'Arial',
                        size: 12,
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
    getLanguageChartData(pData: any) {
        let sChartInfo: any;
        if (pData && pData != "") {
            let sInfluence: any;

            if (typeof pData == 'string')
                sInfluence = JSON.parse(pData);
            else 
                sInfluence = pData;

            let sFeatureList = Object.keys(sInfluence);
            if (sFeatureList.length > 0) {
                let sSortedInfluece: { key: string, value: number; }[] = [];
                sFeatureList.forEach((sFeature) => {
                    sSortedInfluece.push({ key: sFeature, value: sInfluence[sFeature] });
                });
                sSortedInfluece.sort((a, b) => {
                    return b.value - a.value;
                });
                sChartInfo = {
                    ChartType: 'pie',
                    Title: "Trainable Params Chart",
                    TargetId: "influence",
                    Label: sSortedInfluece.map(sData => sData.key),
                    Data: sSortedInfluece.map(sData => sData.value),
                    DataOption: {
                        label: 'Trainable',
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.6)',
                            'rgba(54, 162, 235, 0.6)'
                        ]
                    },
                    ChartOption: {
                        plugins: {
                            legend: {
                                position: 'right',
                                labels: {
                                    font: {
                                        size: 14
                                    }
                                }
                            },
                            tooltip: {
                                mode: 'nearest',
                                intersect: true,
                                callbacks: {
                                    label: function (context: any) {
                                        return context.label + ": " + context.dataset.data[context.dataIndex];
                                    }
                                }
                            }
                        }
                    }
                };
            }
        }
        return sChartInfo;
    }

    getPRChartData(pPRData: any) {
        if (!pPRData || !pPRData.curves || !Array.isArray(pPRData.curves)) return null;
    
        const result: any = {
            ChartType: 'line',
            TargetId: 'pr-curve',
            Label: [],  // 안 씀
            Data: [],
            ChartOption: {
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context: any) {
                                return `${context.dataset.label}: (Recall ${context.parsed.x.toFixed(3)}, Precision ${context.parsed.y.toFixed(3)})`;
                            }
                        }
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: { display: true, text: 'Recall' },
                        min: 0,
                        max: 1
                    },
                    y: {
                        title: { display: true, text: 'Precision' },
                        min: 0,
                        max: 1
                    }
                }
            }
        };
    
        const randomColor = () => {
            const r = Math.floor(Math.random() * 256);
            const g = Math.floor(Math.random() * 256);
            const b = Math.floor(Math.random() * 256);
            return `rgb(${r},${g},${b})`;
        };
    
        pPRData.curves.forEach((curve: any) => {
            const className = curve.class;
            const mAP = curve.mAP50.toFixed(3);
            const displayName = `${className} ${mAP}${className.toLowerCase() === 'all classes' ? ' mAP@0.5' : ''}`;
    
            const color = randomColor();
            const lineData = curve.recall.map((rec: number, i: number) => ({
                x: rec,
                y: curve.precision[i]
            }));
    
            result.Data.push({
                Title: displayName,
                Data: lineData,
                DataOption: {
                    label: displayName,
                    borderColor: color,
                    backgroundColor: 'rgba(0,0,0,0)',
                    pointRadius: 0,
                    tension: 0,
                    fill: false
                }
            });
        });
    
        if (result.Data.length === 0) return null;
        return result;
    }
    
    getModelWorkflow(pModelId:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/model/getModelWorkflow', { modelId: pModelId});
    }
    getModelConfig(pModelId: number): Observable<any> {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + "/model/getModelConfig", {
            modelId: pModelId
        });
    }
    getPredictResult(pUrl: string, pData: any, pFilepath?: string): Observable<any> {
        let s_body:any = {
            url: pUrl
        };
        if (pFilepath) {
            s_body['type'] = 'file';
            s_body['filepath'] = pFilepath;
        } else {
            s_body['type'] = 'raw';
            s_body['data'] = pData;
        }
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + "/model/getPredictResult", s_body);
    }
    // getModelHistory(p_modelId: string, p_mlflow: boolean): Observable<any> {
    //     return this.cHttp.post(this.oNodeUrl + '/pyservice/getModelHistory', { modelId: p_modelId, mlflow: p_mlflow });
    // }
    getModelPerformanceHistory(p_modelId: string): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/getModelPerformanceHistory', { modelId: p_modelId});
    }
    getMetricChartData(pModelIdx: number, pMetricData: any, pMetricKey: string[]) {
        let sLabel: any = []
        let sColors = [
            '#577df6',
            '#63c89b',
            '#f5c643',
            '#00cec9',
            '#8173ed',
            '#ff7675',
            '#ec8959'
        ];

        // if (pType == 'Regression') {
        //     if (pMetricData.length > 2 && pMetricData[0]['mape'] && pMetricData[0]['rmse'] && pMetricData[0]['test_score']) {
        //         // 회귀에서 mape 가 30배이상 차이나면 그래프 표시가 안되므로 제외 
        //         if (pMetricData[0]['mape'] > pMetricData[0]['rmse'] * 30 && pMetricData[0]['mape'] > pMetricData[0]['test_score'] * 30) {
        //             pMetricKey = pMetricKey.filter(sKey => sKey != 'mape');
        //         }
        //     }
        // }

        let sMetricValues: any = {};
        pMetricKey.forEach(sKey => {
            sMetricValues[sKey] = [];
        });
        // index, metrics 키값으로 데이터 정렬
        pMetricData.forEach((sMetric: any) => {
            let s_labels = [];
            let sTmpLabel = pModelIdx == sMetric['MODEL_IDX'] ? '(현재 모델) ' : '';
            sTmpLabel = `version: ${sMetric['MODEL_IDX']}`;
            s_labels.push(sTmpLabel)
            // sTmpLabel += `\n${sMetric['MODEL_NAME']}`;
            s_labels.push(`\n${sMetric['MODEL_NAME']}`)
            sLabel.push(s_labels);
            pMetricKey.forEach(sKey => {
                let sVal = sMetric[sKey] ? sMetric[sKey] : null;
                sMetricValues[sKey].push(sVal);
            });
        });

        let sChartData: any[] = [];

        pMetricKey.forEach((sKey, sIndex) => {
            let sColor = sColors[(sIndex % 7)];
            let sTmp = {
                Title: sKey,
                Data: sMetricValues[sKey],
                DataOption: {
                    label: sKey,
                    borderColor: sColor,
                    backgroundColor: "rgba(239,244,254,0.2)",
                    pointBackgroundColor: sColor,
                    pointHoverBorderColor: sColor,
                    pointHoverBackgroundColor: "#fff",
                    pointBorderColor: sColor,
                    showLine: true,
                    lineTension: 0.5,
                    pointHoverBorderWidth: 4,
                    borderDash: [2, 4]
                }
            };
            sChartData.push(sTmp);
        });

        let sResult = {
            TargetId: "test",
            Title: "Metrics History Chart",
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
            Data: sChartData
        };
        return sResult;
    }
    // 280강화학습
    getReinforcementChartData(p_data: any, p_argId: any) {
        let s_reward = p_data['reward_chain']
        let s_dataOption = {
            label: 'reward',
            // yAxisID: 'Original',
            borderColor: '#577df6',
            backgroundColor: "rgba(239,244,254,0.2)",
            pointBackgroundColor: '#577df6',
            pointHoverBorderColor: '#577df6',
            pointHoverBackgroundColor: "#fff",
            pointBorderColor: '#577df6',
            lineTension: 0.5,
            pointHoverBorderWidth: 4
          }
        let s_label = Array.from({ length: s_reward.length }, (_, index) => index + 1);
        let s_result = {
            TargetId: "test",
            Title: "Reward Chain over Step",
            Label: s_label,
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
                    text: 'Cumulative Reward'
                  },
                }
              },
              legend: {
                display: false,
              }
            },
            Data: [
              { Title: "reward", Data: s_reward, DataOption: s_dataOption }
            ]
        }
        
        return s_result
    }


    getModelResultGridData(p_modelResult: any) {
        // 분석 결과 데이터
        let sGridData = []
        // 변수 중요도 데이터
        let sFeatureGridData: any[] = []
        // 변수별 영향도 데이터
        // let sInfluenceGridData = []

        let s_evalResult = {
            MODEL_NM: p_modelResult.modelName,
            MODEL_EVAL_TYPE: p_modelResult.modelType,
            evaluateLog: p_modelResult.evaluateLog,
            featureLog: p_modelResult.featureLog
        }
        let s_modelType = p_modelResult.modelType;
        
        // // 변수 영향도 그리드 데이터
        // if (s_modelType !== 'Clustering' && s_evalResult.hasOwnProperty('featureLog') && s_evalResult.featureLog !== '') {
        //     let s_featureGrid = s_evalResult.featureLog;
        //     for (const sKey in s_featureGrid) {
        //         sInfluenceGridData.push({
        //             varNm: sKey,
        //             importance: Number(s_featureGrid[sKey]).toFixed(3)
        //         })
        //     }
        // }

        // 분석 결과 데이터
        if (s_modelType == 'Regression') {
            sGridData.push({
                // argId: sEvalResult.result.argId,
                argNm: p_modelResult.modelname,
                accuracy: p_modelResult.evaluateLog.accuracy.toFixed(3),
                mse: p_modelResult.evaluateLog.mse.toFixed(3),
                rmse: p_modelResult.evaluateLog.rmse.toFixed(3),
                r2_score: p_modelResult.evaluateLog.r2_score.toFixed(3)
            });
        }
        else if (s_modelType == 'Classification') {
            let s_modelResult = JSON.parse(p_modelResult.evaluateLog.result);
            let s_labelData = s_modelResult.columns;
            for (let idx in s_labelData) {
                let gridRow = {
                    "ClassName": s_labelData[idx],
                    "Precision": (Number(p_modelResult.evaluateLog.precision[idx])).toFixed(2),
                    "Recall": (Number(p_modelResult.evaluateLog.recall[idx])).toFixed(2),
                    "F1Score": (Number(p_modelResult.evaluateLog.fscore[idx])).toFixed(2),
                    "Support": p_modelResult.evaluateLog.support[idx],
                    "ClassCode": idx
                };
                sGridData.push(gridRow);
            }
        }
        else if (s_modelType == 'Clustering') {
            sGridData.push({
                // argId: sEvalResult.result.argId,
                argNm: p_modelResult.MODEL_NM,
                silhoutte_coef: Number(p_modelResult.evaluateLog.silhouette_coef).toFixed(4)
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

        // return sResult;

        if (sResult.gridData.length > 6) {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sResult.gridData,
                gridCol: sResult.gridCol,
                gridCallback: (pEvent: any) => { },
                page: true,
                pageSize: 6
            };
        } else {
            return {
                gridRowEvt: false,
                hoverEffect: false,
                gridData: sResult.gridData,
                gridCol:  sResult.gridCol,
                gridCallback: (pEvent: any) => { },
            };
        }
    }
}