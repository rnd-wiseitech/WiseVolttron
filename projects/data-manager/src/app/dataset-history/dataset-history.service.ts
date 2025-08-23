import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class DataSetHistorySerivce extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    
    searchColmn(pColNm:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/searchColmnHistory', {colNm:pColNm});
    }
}