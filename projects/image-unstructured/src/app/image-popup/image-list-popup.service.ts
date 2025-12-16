import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { TranslateService } from '@ngx-translate/core';


@Injectable({ providedIn: 'root' })
export class imageListPopupService extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig,
        private cTransSvc: TranslateService) {
        super(cAppConfig);
    }
    oUrl = this.cAppConfig.getServerPath("NODE");

    async saveImageLabel(p_param: any) : Promise<Observable<any>>{        
        let s_result:any = await this.cHttp.post(this.oNodeUrl + '/jobexcute/saveImageLabel', p_param).toPromise();    
        return s_result
    }

    async getRelearnModelList(p_param: any) : Promise<Observable<any>>{        
        let s_result:any = await this.cHttp.post(this.oNodeUrl + '/model/getRelearnModelList', {ARG_TYPE: p_param}).toPromise();    
        return s_result
    }
    async getArgParam(p_argId: any): Promise<Observable<any>>{        
        let s_argParam:any = await this.cHttp.post(this.oNodeUrl + '/model/getArgParam', {ARG_ID: p_argId}).toPromise();
        return s_argParam;
    } 
    async getModelInfo(p_data: any): Promise<Observable<any>> {
        let s_param:any = await this.cHttp.post(this.oNodeUrl +  '/jobexcute/getModelInfo', p_data).toPromise();
        return s_param
    }
    async getArgInfo(p_argId: string): Promise<Observable<any>>{        
        let s_modelInfo:any = await this.cHttp.post(this.oNodeUrl + '/model/getArgInfo', {ARG_ID: p_argId}).toPromise();
        return s_modelInfo;
    } 
    async getModelComId(p_modelId: string, p_modelIdx: string): Promise<Observable<any>>{        
        let s_modelInfo:any = await this.cHttp.post(this.oNodeUrl + '/model/getModelComId', {MODEL_ID: p_modelId, MODEL_IDX: p_modelIdx}).toPromise();
        return s_modelInfo;
    }
    async exeuteModelTrain(p_data: any): Promise<Observable<any>> {
        let s_param:any = await this.cHttp.post(this.oNodeUrl +  '/jobexcute/exeuteModelTrain', p_data).toPromise();
        return s_param
    }

    async getModelResult(pComIdList: Array<string>, pModelIdDataList?: { MODEL_ID: number, MODEL_IDX: number }[]): Promise<Observable<any>> {
        let s_result:any = await this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getModelResult', { analComIdList: pComIdList, modelIdDataList: pModelIdDataList ? pModelIdDataList : [] }).toPromise();
        return s_result
    }

    // 컨퓨전매트릭스차트 그리기
    async getConfusionChart(p_data: any) {
        const annotations = [];

        for (let i = 0; i < p_data.index.length; i++) {
            for (let j = 0; j < p_data.columns.length; j++) {
            const value = p_data.data[i][j];
            const textColor = value !== 0 ? 'white' : 'black';

            annotations.push({
                x: p_data.columns[j],   // 예측 (X축)
                y: p_data.index[i],     // 실제 (Y축)
                text: String(value),
                textangle: 0,
                xref: 'x1',
                yref: 'y1',
                font: {
                family: 'Arial',
                size: 18,
                color: textColor
                },
                showarrow: false
            });
            }
        }

        const s_chart = {
            Height: 400,
            Data: [
            {
                z: p_data.data,
                x: p_data.columns,
                y: p_data.index,
                type: 'heatmap',
                colorscale: [
                [0, '#3D9970'],
                [1, '#001f3f']
                ],
                showscale: true
            }
            ],
            Layout: {
            annotations: annotations
            }
        };

        return s_chart;
    }

    // 클래스평가지표 그리드 그리기
    async getClassGrid(p_data:any) {
        let s_gridCol = [
            { NAME: 'ClassName', VISIBLE: true, VNAME: 'Class', TYPE: 'string' },
            { NAME: 'F1Score', VISIBLE: true, VNAME: 'F1 Score', TYPE: 'number' },
            { NAME: 'Precision', VISIBLE: true, VNAME: 'Precision', TYPE: 'number' },
            { NAME: 'Recall', VISIBLE: true, VNAME: 'Recall', TYPE: 'number' },
            { NAME: 'Support', VISIBLE: true, VNAME: 'Support', TYPE: 'number' },
        ];
        let s_gridData = [];
        let s_modelResult = JSON.parse(p_data.result);
        let s_labelData = s_modelResult.columns;
        for (let idx in s_labelData) {
            let gridRow = {
                "ClassName": s_labelData[idx],
                "Precision": (Number(p_data.precision[idx])).toFixed(2),
                "Recall": (Number(p_data.recall[idx])).toFixed(2),
                "F1Score": (Number(p_data.fscore[idx])).toFixed(2),
                "Support": p_data.support[idx],
                "ClassCode": idx
            };
            s_gridData.push(gridRow);
        }

        let s_grid = {gridCol: s_gridCol, gridData: s_gridData};
        return s_grid;
    }
    // 이미지 종합평가지표 그리드 그리기
    async getMetricsGrid(p_data: any) {
        let s_gridCol = [
            { NAME: 'NAME', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info10"), TYPE: 'string' },
            { NAME: 'VALUE', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.INFO.info11"), TYPE: 'number' }
        ];
        let s_gridData = [];

        let s_paramKeyList = Object.keys(p_data);
        for (const key of s_paramKeyList) {
            let s_value = p_data[key];
            if (s_value != null) {
                if (typeof s_value == 'object') {
                    s_value = JSON.stringify(s_value)
                }
                if (typeof s_value == 'number') {
                    s_value = s_value.toFixed(3);
                }
                s_gridData.push({ NAME: key, VALUE: s_value });
            }
        }

        let s_grid = {gridCol: s_gridCol, gridData: s_gridData};
        return s_grid;
    }

    async checkModelName(p_modelname: string): Promise<Observable<any>>{        
        let s_modelName:any = await this.cHttp.post(this.oNodeUrl + '/model/checkModelName', {MODEL_NM: p_modelname}).toPromise();
        return s_modelName;
    } 

    
} 