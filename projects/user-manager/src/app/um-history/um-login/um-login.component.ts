import { Component, OnDestroy, OnInit} from '@angular/core';

import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { UmLoginHistoryService } from './um-login.service';
import { TranslateService } from '@ngx-translate/core';
@Component({
    selector: 'um-login',
    templateUrl: './um-login.component.html',
    styleUrls: ['./um-login.component.css']
})
export class UmLoginHistoryComponent implements OnInit, OnDestroy {
    oComptNm:string = 'login-log';
    oGridData:any = [];
    oGridCol:any = [];
    oGridheader = {btnNm:this.cTransSvc.instant("WPP_COMMON.BUTTON.button6")
      , filterCol:['auto']};
    constructor(private cWpLibSvc: WpLoadingService,
        private cUmHLoingSvc:UmLoginHistoryService,
        private cTransSvc: TranslateService
      ) {
    }
    ngOnInit(): void {
        this.cWpLibSvc.showProgress(true, 'mainspin');
        this.cUmHLoingSvc.getLoginHistory({}).subscribe(pLoginLog=>{
            this.oGridData = pLoginLog.result;
            this.oGridCol = [{
                'NAME':'USER_NO',
                'VISIBLE':true,
                'VNAME':this.cTransSvc.instant("WPP_USER_MANAGER.USER_ACCESS.GRID.grid1"),
                'TYPE':'string'
              },{
                'NAME':'TYPE',
                'VISIBLE':true,
                'VNAME':this.cTransSvc.instant("WPP_USER_MANAGER.USER_ACCESS.GRID.grid2"),
                'TYPE':'string'
              },{
                'NAME':'IP',
                'VISIBLE':true,
                'VNAME':this.cTransSvc.instant("WPP_USER_MANAGER.USER_ACCESS.GRID.grid3"),
                'TYPE':'string'
              },{
                'NAME':'REG_DT',
                'VISIBLE':true,
                'VNAME':this.cTransSvc.instant("WPP_USER_MANAGER.USER_ACCESS.GRID.grid4"),
                'TYPE':'string'
              },];
              this.cWpLibSvc.showProgress(false, 'mainspin');
        })
    }
    ngOnDestroy() {
    }
    onGridCallback(pEv:any){
        console.log(pEv);        
    }
    
}