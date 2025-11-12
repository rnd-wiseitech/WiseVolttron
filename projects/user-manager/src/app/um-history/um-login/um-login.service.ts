import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UmLoginHistoryService extends WpSeriveImple {
    constructor(private cHttp: HttpClient,
        private cAppConfig: WpAppConfig) {
        super(cAppConfig);
    }
    getLoginHistory(pParam:any) : Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/userMng/getLoginHistory',pParam);    
    }

}