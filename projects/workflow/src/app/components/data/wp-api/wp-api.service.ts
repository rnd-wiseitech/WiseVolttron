import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';


@Injectable({ providedIn: 'root' })
export class WpApiService extends WpSeriveImple {
    constructor(
    private cHttp: HttpClient,
    private cAppConfig:WpAppConfig) { 
        super(cAppConfig); 
    }
    oUrl = this.cAppConfig.getServerPath("NODE");
    excuteApi(pParam:any){
        return this.cHttp.post(this.oUrl + '/jobexcute/select', pParam).toPromise().then((pResult:any)=>{
            return pResult;
        });      
    }
}