import { Component, OnInit } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';

@Component({
  selector: 'usermanager-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class UserManagerAppComponent implements OnInit {
  oActiveTab:string = 'um-mng';
  o_apiType = 'SPARK';
  constructor(
    private cWpAppConfig: WpAppConfig
  ){
  }
  ngOnDestroy():void{
  }
  ngOnInit(): void {
    this.o_apiType = this.cWpAppConfig.getConfig('API_TYPE');
  }
  onTabClick(pTabNm:string){
    this.oActiveTab = pTabNm;
  }
}
