import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';
import { AlgorithmAppService } from '../app.service';


@Injectable({ providedIn: 'root' })
export class CustomManagerService extends WpSeriveImple { 

    oHeaders = { 'content-type': 'application/json'};
    constructor(
        private cAppConfig: WpAppConfig,
        private cAppSvc: AlgorithmAppService,
        private cHttp:HttpClient
    ) {
        super(cAppConfig);
    }
    
    getServerList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/getServerList', {'headers':this.oHeaders});
    }

    getCustomModelList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/model/getCustomModelList', {});
    }

    addServer(p_param:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/addServer', {p_param});
    }

    updateCustomModel(p_param:any, p_cond:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/model/updateCustomModel', {p_param, p_cond});
    }


    uploadFile(header:any, file: any): Observable<any> {
        // return this.cHttp.post(this.oNodeUrl + '/hdfs/upload', {file:file, header:header});/
        // const headers = new HttpHeaders(header);
        const formData = new FormData();
        formData.append('file', file);
        // 파일을 직접 전송
        return this.cHttp.post(this.oNodeUrl + '/hdfs/upload', formData, {
        headers: header,
        reportProgress: true, // 진행률 추적
        observe: 'events' // 이벤트 타입 추적
        });
    }


    addCustomModel(p_param:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/model/addCustomModel', {p_param});
    }

    setCustomModel(p_data: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl +  '/jobexcute/setCustomModel', p_data);
    }

    getModelInfo(p_data: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl +  '/jobexcute/getModelInfo', p_data);
    }
}
