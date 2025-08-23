import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class DataSetProfileSerivce extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    
    getColInfo(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/getColList', pParam);    
    }
    reStatistic(pParam:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/reStatistic', pParam);
    }
    getPipelist(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/getPipelist', {datasetInfo:pParam});    
    }
    chkDatasetlist(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/chkDatasetlist', {filename:pParam});    
    }
    renameDataset(pDatasetInfo:any, pNewNm:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/renameDataset', {datasetInfo:pDatasetInfo, newNm:pNewNm});    
    }
    getLabelFile(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/getPipelist', {datasetInfo:pParam});    
    }
}