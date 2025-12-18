import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';
@Injectable({ providedIn: 'root' })
export class ScheduleService extends WpSeriveImple {
    constructor(private cHttp: HttpClient,
        private cAppConfig: WpAppConfig) {
        super(cAppConfig);
    }


    getSchList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/schList', {});
    }

    getVolttronList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/volttronList', {});
    }

    getWkList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/wkList', {});
    }

    getSchNmList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/schNmList', {});
    }

    getWkNmList(pRealtime?:boolean): Observable<any> {
        if (pRealtime){
            return this.cHttp.post(this.oNodeUrl + '/sm/wkNmList', {realtime: true});
        }
        return this.cHttp.post(this.oNodeUrl + '/sm/wkNmList', {});
    }

    insertCron(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/insert', { params: pParam });
    }

    deleteCron(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/delete', { params: pParam });
    }

    cancelSparkJob(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/cancel', pParam);
    }

    getLogList(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/logList', { params: pParam });
    }

    runCron(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/run', { params: pParam });
    }

    pauseCron(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/pause', { params: pParam });
    }

    editCron(pParam: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/sm/edit', { params: pParam });
    }



}