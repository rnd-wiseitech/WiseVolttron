import { Component, OnInit, Input, OnChanges, SimpleChanges} from '@angular/core';
import { Router } from '@angular/router';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WpLoginService } from 'projects/wp-login/src/app/login/login.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'header-layout',
  templateUrl: './header-layout.component.html',
  styleUrls: ['./header-layout.component.css']
})
export class HeaderComponent implements OnInit,OnChanges {
  @Input() oActiveApp:any;
  // @Input() oMenuList:any;
  oMenuList:any;
  h_name:string;
  h_SocketStatusFill:string = 'rgb(255 69 0 / 0.8)';
  h_lang: string;
  constructor(
    private cRouter: Router,
    private cLoginSvc:WpLoginService,
    private cWpSocketSvc:WpSocket,
    private cMetaSvc:WpMetaService,
    private cTranslateSvc: TranslateService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    for(let sChangeKey of Object.keys(changes)){
      let that:any = this;
      if(typeof changes.currentValue != undefined)
        that[sChangeKey] = changes[sChangeKey].currentValue;
    }
  }
  async ngOnInit(): Promise<void> {
    let s_userInfo:any =  await this.cLoginSvc.getUserInfo();
    this.h_name = s_userInfo.USER_ID;
    this.h_lang = JSON.parse(s_userInfo.USER_INSTANCE).LANG;
    this.cTranslateSvc.setDefaultLang(this.h_lang);  
    this.cTranslateSvc.use(this.h_lang);

    this.cMetaSvc.getMenuList().subscribe(pMenuList=>{
      this.oMenuList = pMenuList.filter((item:any) => item.TYPE == 'TOP');
    })
    this.cWpSocketSvc.socketStatusEmit.subscribe(pStatus=>{
      if(pStatus)
        this.h_SocketStatusFill = 'rgb(124 221 113/ 0.8)';
      else 
        this.h_SocketStatusFill = 'rgb(255 69 0 / 0.8)';
    });
  }
  onClick(pEvent:Event){
    
  }
  onLogout() {
    // WPLAT-34 로그아웃 이력 추가. 로그아웃 이력 업데이트 후 실제 로그아웃
    this.cLoginSvc.updateLoginHistory('LOGOUT').then((pResult) => {
      // console.log(pResult);
    }).catch(pErr => {
      console.log(pErr)
    }).finally(() => {
      localStorage.removeItem('currentUser');
      this.cRouter.navigate(['/login']);
    });
  }
  onLangChange(pEvent: any, pType:any) {
    event.stopPropagation();
    pEvent.preventDefault();
    if (pEvent.target.innerText == 'ko') {
      this.h_lang = 'en'
    } else {
      this.h_lang = 'ko'
    }
    this.cLoginSvc.changeLang(this.h_lang).pipe(
    ).subscribe((pResponse:any) => {
      window.location.reload();
    });

  }
}
