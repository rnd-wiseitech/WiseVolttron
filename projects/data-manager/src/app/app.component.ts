import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DmAppService } from './app.service';
import { map } from 'rxjs/operators';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
@Component({
  selector: 'dm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class DMAppComponent implements OnInit {
  title = 'data-manager';
  oActiveTab = 'dm-';
  oTabClickSubscribe:Subscription;
  oProfileData:any
  oUserMode = '';
  o_apiType = 'SPARK';
  o_hiveCheck = false;
  constructor(
    private cDmAppSvc: DmAppService, 
    private cWpAppConfig: WpAppConfig){
  }
  ngOnDestroy():void{
    this.oTabClickSubscribe.unsubscribe();
  }
  ngOnInit(): void {
    this.o_apiType = this.cWpAppConfig.getConfig('API_TYPE');
    this.oActiveTab = this.oActiveTab + 'dataset';
    this.oTabClickSubscribe = this.cDmAppSvc.changeTabEmit.subscribe(pRes=>{
      this.onTabClick(pRes.tabNm);
      if(pRes.tabNm =='dm-dataset-profile' && pRes.element)
        this.oProfileData = pRes.element;
        // this.cDmAppSvc.showProfile(pRes.element);
    });

    // dataset-history ADMIN일떄만 보이기위해 token풀어서 usermode가져옴
    this.cDmAppSvc.getUserInfo().pipe(
      map((pResult: any)  => {
        this.oUserMode = pResult['USER_MODE'];
      })
    ).subscribe();
    
  }
  onTabClick(pTabNm:string){
    this.oActiveTab = pTabNm;
  }
  onLoadingCallback(pEv:any){
    if(pEv.spinNm == 'wdspin'){
      console.log("callback!!!!!!!!!")
      // if(pEv.jobNm == 'executeQuery'){

      // }
    }
  }
}
