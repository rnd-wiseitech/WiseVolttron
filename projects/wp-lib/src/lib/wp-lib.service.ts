import { Injectable } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
@Injectable({
  providedIn: 'root'
})
export class WpLibService extends WpSeriveImple{

  // mainappservice(platform) or appservice(wiseprophet)
  o_currentService:any;

  constructor(private cSpinner: NgxSpinnerService,
    private cHttp: HttpClient,
    private cAppConfig: WpAppConfig) {
    super(cAppConfig);
  }
  
  // 메인 project modal.show 위해 service set
  setService(pService:any) {
    this.o_currentService = pService;
  }
  // appservice.showmsg
  showMsg(pMsg:string, pType:boolean) {
    if(this.o_currentService)
      this.o_currentService.showMsg(pMsg, pType);   
  }



  // showProgress(pStatus: boolean, pName: string) {
  //   if (pStatus)
  //     this.cSpinner.show(pName);
  //   else
  //     this.cSpinner.hide(pName);
  // }

  // // 하이브에서 사용. 스파크잡 취소
  // cancelSparkJob(pParam: any): Observable<any> {
  //   return this.cHttp.post(this.oNodeUrl + '/jobexcute/cancel', pParam);
  // }
}
