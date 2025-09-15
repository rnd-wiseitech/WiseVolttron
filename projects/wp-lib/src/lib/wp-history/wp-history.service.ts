import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { WpAppConfig } from '../wp-lib-config/wp-lib-config'

export class HistoryItem {
  // H_TYPE: string;
  DS_VIEW_ID: number;
  OPERATION: string;
  PRE_VALUE: string;
  CUR_VALUE: string;
}

@Injectable({
    providedIn: 'root'
})
export class HistoryService {
  
  constructor(private http: HttpClient, 
              private cAppConfig:  WpAppConfig) {
  }

  select(pParam:any) : Observable<any>{        
    return this.http.post(this.cAppConfig.getServerPath('NODE') + '/wd/datasetHistory', {params:pParam});    
  }

  insert(pParam:any) : Observable<any>{      
    return this.http.post(this.cAppConfig.getServerPath('NODE') + '/wd/addDatasetHistory', {params:pParam});    
  }

  // #28. 스케줄 로그 불러오기.
  selectSchlog(pParam:any) : Observable<any>{        
    return this.http.post(this.cAppConfig.getServerPath('NODE') + '/sm/log', {params:pParam});    
  }


}