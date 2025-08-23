import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ConnectionSerivce extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    
    deleteDsInfo(pDsId:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/updateDsMstr', {params:{dbData:{ds_id:pDsId}, type:'delete'}});
    }
    connectDs(pData:any, pType:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/addDsMstr', {dbData:pData, type:pType});
    }
    updateDs(pData:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/updateDsMstr', {params:{dbData:pData, type:'update'}});
    }
}