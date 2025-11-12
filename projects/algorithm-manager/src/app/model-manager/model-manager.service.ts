import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { Observable } from 'rxjs';
import { AlgorithmAppService } from '../app.service';
//@ts-ignore
import JSZip from "jszip"
import { TranslateService } from '@ngx-translate/core';
import { DataSetSerivce } from '../../../../data-manager/src/app/dataset/dataset.service';

@Injectable({ providedIn: 'root' })
export class ModelManagerService extends WpSeriveImple {
    oGridData: any = [];
    oGridCol: any = [];
    oHeaders = { 'content-type': 'application/json'};
    constructor(
        private cAppConfig: WpAppConfig,
        private cAppSvc: AlgorithmAppService,
        public cMetaSvc: WpMetaService,
        private cHttp: HttpClient,
        private cTransSvc: TranslateService
    ) {
        super(cAppConfig);
        // (async () => await this.setModelManagerGridData())();
    }

    getMlflowModelList(pModelId:any): Observable<any> {
        // console.log("getMlflowModelList : ");
        if (pModelId) {
            return this.cHttp.post(this.oNodeUrl + '/pyservice/getMlflowModelList', {modelId: pModelId});
        }
        return this.cHttp.post(this.oNodeUrl + '/pyservice/getMlflowModelList', {});
    }

    getModelInfo(p_data: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl +  '/jobexcute/getModelInfo', p_data);
    }
    getMlFlowModelInfo(p_data: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/pyservice/getMlFlowModelInfo', p_data);
    }

    async setModelManagerGridData() {
        let sModelData:any = await this.cHttp.post(this.oNodeUrl + '/pyservice/getMlflowModelList', {}).toPromise();
        let sGridData:any = sModelData.result;
        // prophet_LOCAL, prophet_HDFS 표기를 prophet으로 표기되도록 수정
        sGridData.forEach((sData: any) => {
            sData.experiment_name = sData.experiment_name.split("_")[0];
        });
        this.oGridData = sGridData;
        let sColInfo = [];

        let sDisplayColNms: string[] = [
            '권한',
            this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.GRID.grid1"), 
            this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.GRID.grid2"), 
            this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.GRID.grid3"),  
            '소유자',
             this.cTransSvc.instant("WPP_MODEL_MANAGER.MANAGE.GRID.grid4"),  
             'FUNCTION'];
        let sDisplayCols: string[] = ['AUTHORITY', 'experiment_name', 'MODEL_EVAL_TYPE', 'MODEL_NM', 'USER_ID',  'REG_DATE'];

        if (this.oGridData.length != 0) {
            for (let sCol of Object.keys(this.oGridData[0])) {
                let sIndex = sDisplayCols.findIndex(pVal => pVal === sCol);
                if (sIndex == -1) {
                    sColInfo.push({
                        'NAME': sCol,
                        'VISIBLE': false,
                        'VNAME': sCol,
                        'TYPE': 'string'
                    });
                } else {
                    sColInfo.push({
                        'NAME': sCol,
                        'VISIBLE': true,
                        'VNAME': sDisplayColNms[sIndex],
                        'TYPE': 'string'
                    });
                }
            }
            // sDisplayCols 순서대로 컬럼을 정렬
            sColInfo.sort((a, b) => {
                let sAindex = sDisplayCols.findIndex(pVal => pVal == a.NAME);
                let sBindex = sDisplayCols.findIndex(pVal => pVal == b.NAME);
                return sAindex - sBindex;
            });
            sColInfo.push({
                'NAME': 'FUNCTION',
                'VISIBLE': true,
                'VNAME': '',
                'VALUE': ['trash', 'download', 'personadd'],
                'TYPE': 'string'
            });
            this.oGridCol = sColInfo;
        }
    }
    async getGridCol() {
        return new Promise(async (resolve, reject) => {
            if (this.oGridCol.length == 0) {
                this.setModelManagerGridData().then(()=>{
                    resolve(this.oGridCol);
                })
            } else {
                resolve(this.oGridCol);
            }
        })
    }

    async getGridData() {
        return new Promise(async (resolve, reject) => {
            // if (this.oGridData.length == 0) {
                await this.setModelManagerGridData();
            // }
            resolve(this.oGridData);
        })
    }

    async initGridData(){
        this.oGridCol = [];
        this.oGridData = [];
    }

    async downloadArtifact(p_modelName:string, p_artifactPath: any) {
        try {
            // 스트리밍 방식
            await this.getArtifactExist(p_artifactPath).toPromise();
            this.cHttp.post(this.oNodeUrl + '/hdfs/getDownloadZipUrl', {path : p_artifactPath, filename : p_modelName, option: 'model' }).subscribe((response :any) => {
                const link = document.createElement('a');
                link.href = response.url;
                link.download = ``;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
        } catch (error) {
            this.cAppSvc.showMsg('모델 파일 다운로드에 실패하였습니다.', false);
        }
    }
    deleteModel(pModelId:any){
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/model/model_delete', {
            MODEL_ID: pModelId
        });
    }


    getModelList():Observable<any> {
  
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/model/getModelList', {})
    }

    getModelHistory(pModelId:any): Observable<any> {
        
        return this.cHttp.post(this.oNodeUrl + '/model/getModelHistory', {modelId: pModelId});
        
    }

    getArtifactExist(pFolderPath:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/hdfs/getArtifactExist', {path : pFolderPath});
    }
}