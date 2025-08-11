import { Component,OnInit } from '@angular/core';
import { Event as routerEvent,Router,NavigationStart, ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'projects/wp-lib/src/lib/wp-auth/auth.service';
import { WpLoginService } from 'projects/wp-login/src/app/login/login.service';
import { Subscription } from 'rxjs';
import { MainAppService } from './app.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'main';
  oHeaderView:boolean = true;
  oAuthView:boolean = false;  // token 유효 && headerview==true
  oActiveApp = 'workflow';
  oModalMsg = '';
  oModalFlag = false;
  oModalType = false;
  oModalCallbackType = '';
  oHeaderActiveList: any = ['/dm', '/workflow', '/rm', '/monitor', '/usermng', '/modelmng', '/'];
  // oMenuList:any;
  oModalSubscribe:Subscription;
  oAuthSubscribe:Subscription;
  oLang:any;
  constructor(private cRouter:Router,
              private cActiveRoute: ActivatedRoute,
              private cTranslateSvc: TranslateService,
              private cAppSvc: MainAppService,
              private cLoginSvc: WpLoginService,
              private cAuthSvc: AuthService){
      this.setLang();
  }
  ngOnDestroy():void{
    this.oModalSubscribe.unsubscribe();
    this.oAuthSubscribe.unsubscribe();
  }
  ngOnInit() { 
    this.oModalSubscribe = this.cAppSvc.showModal.subscribe(pResult=>{
      this.oModalMsg = pResult.msg;
      // this.oModalType = pResult.type;
      this.oModalType = pResult.type? true : false;
      // this.oModalFlag = pResult.flag;      
      this.oModalFlag = pResult.flag || pResult.flag==null? true : false;
    });
    this.oAuthSubscribe = this.cAuthSvc.authStatChanged.subscribe(pResult=>{
      // 빌드테스트시 가끔 헤더부분 안나오는 경우 있어서 수정해봄..
      if(this.oHeaderActiveList.indexOf('/'+this.oActiveApp)!=-1 && pResult){
        this.oAuthView = true;
      }else{
        this.oAuthView = false;
      }
    });    
    
    // this.cMetaSvc.getMenuList().subscribe(pMenuList=>{
    //   // console.log(pMenuList);
    //   this.oMenuList = pMenuList.filter((item:any) => item.TYPE == 'TOP');
    //   // this.oMenuList = pMenuList;
    // })
    this.cRouter.events.subscribe((routerEvent:routerEvent)=>{
      if(routerEvent instanceof NavigationStart){
        if(routerEvent.url == '/dm'){
          this.oActiveApp = 'dm';
        }
        else if(routerEvent.url == '/workflow' || routerEvent.url == '/'){
          this.oActiveApp = 'workflow';
        }
        else if(routerEvent.url == '/rm'){
          this.oActiveApp = 'rm';
        }
        else if(routerEvent.url == '/monitor'){
          this.oActiveApp = 'monitor';
        }
        else if(routerEvent.url.includes('/login')){
          this.oActiveApp = 'user';
          this.cActiveRoute.queryParams
            .subscribe(params => {
              if(Object.keys(params).length > 0)
              {
                this.cLoginSvc.getLogin(Object.keys(params)[0],params[Object.keys(params)[0]],false).then(pUser => {
                  let sUser :any = pUser;
                  if (sUser.CHECK_LOGIN === 'SUCCESS') {
                  
                    this.cLoginSvc.updateLoginHistory('LOGIN').then(pResult => {
                      // console.log(pResult);
                    }).catch(pErr => {
                      console.log(pErr);
                    }).finally(() => {
                      setTimeout(() => {
                        this.cRouter.navigate(['workflow']);
                      }, 400);
                    });
                    // this.cRouter.navigate(['/workflow']);
                  }
                  else if(sUser.CHECK_MODE === 'INVALID'){                              
                    this.cAppSvc.showMsg('존재하지 않는 아이디입니다.다시 입력해 주세요.',false);
                  }
                  else if(sUser.CHECK_PWD === 'INVALID'){
                    this.cAppSvc.showMsg('비밀번호가 틀렸습니다.다시 입력해 주세요.',false);
                  }
                  else{
                    this.cAppSvc.showMsg('존재하지 않는 아이디입니다.다시 입력해 주세요.',false);
                  }
                });
                console.log(Object.keys(params)); // { orderby: "price" }
                                
              }
                
            }
          );
        }
        else if(routerEvent.url == '/forgot'){
          this.oActiveApp = 'user';
        }
        else if (routerEvent.url == '/signup') {
          this.oActiveApp = 'user';
        }
        else if (routerEvent.url == '/usermng') {
          this.oActiveApp = 'usermng';
        }
        else if (routerEvent.url == '/modelmng') {
          this.oActiveApp = 'modelmng';
        }

        if(this.oHeaderActiveList.indexOf(routerEvent.url)!=-1){
          this.oHeaderView = true;
        }else{
          this.oHeaderView = false;
          this.oAuthView = false;
        }
      }
    });
  }
  onModalClose(pEvent:any){
    this.oModalFlag = pEvent;
  }
  onSwitchEvent(pSwitchVal:boolean){
    console.log(pSwitchVal);
  }

  async setLang() {
    // 로그아웃시 인증에러로 인해 철도 한글 고정
    // let s_userInfo:any = await this.cLoginSvc.getUserInfo();
    // this.oLang = JSON.parse(s_userInfo.USER_INSTANCE).LANG;
      this.cTranslateSvc.setDefaultLang('ko');  
      this.cTranslateSvc.use('ko');
  }
}
