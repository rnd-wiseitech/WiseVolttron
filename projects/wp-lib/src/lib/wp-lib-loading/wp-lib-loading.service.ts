import { EventEmitter, Injectable, Output } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
@Injectable({
  providedIn: 'root'
})
export class WpLoadingService extends WpSeriveImple{
  oJobName = '';
  @Output() cancelJob = new EventEmitter<any>();
  oJobsArray:Array<string> = [] ;
  constructor(private cSpinner: NgxSpinnerService,
    private cHttp: HttpClient,
    private cAppConfig: WpAppConfig) {
    super(cAppConfig);
  }
  showProgress(pStatus: boolean, pName: string, pJobNm: string='') {
    this.oJobName = pJobNm;
    this.oJobsArray.push(pJobNm);
    if (pStatus)
      this.cSpinner.show(pName);
    else
      this.cSpinner.hide(pName);
  }

  // // 하이브에서 사용. 스파크잡 취소
  // cancelSparkJob(pParam: any): Observable<any> {
  //   return this.cHttp.post(this.oNodeUrl + '/jobexcute/cancel', pParam);
  // }
}
