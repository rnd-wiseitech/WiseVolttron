import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';


@Injectable({ providedIn: 'root' })
export class WpDataSourceService extends WpSeriveImple {
    constructor(
    private cHttp: HttpClient,
    private cAppConfig:WpAppConfig) { 
        super(cAppConfig); 
    }
    oUrl = this.cAppConfig.getServerPath("NODE");
    getTestList(){
        // #70 포트변경
        return this.cHttp.get(this.oUrl + '/jobexcute/select').toPromise().then(p=>{        
            return p;
        });      
    }
}