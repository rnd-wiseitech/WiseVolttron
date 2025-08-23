import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { WpLoginService } from 'projects/wp-login/src/app/login/login.service';


@Injectable()
export class AuthGuard implements CanActivate {

    constructor(private cRouter: Router,
        private cAuthService: AuthService,
        private cLoginSvc: WpLoginService
    ) { }

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {     
        // return true;
        console.log('canActivate');
        let sFlag:any;
        try {
            sFlag = await this.cAuthService.isTokenExpired();
        } catch (error: any) {
            console.log(error);
            if (error.error && error.error.USER_NO) { // 토큰 만료
                this.cLoginSvc.updateLoginHistory('LOGOUT', error.error.USER_NO).then(sResult => {
                    this.cRouter.navigate(['/login']);
                })
            } else { // 토큰 없음
                this.cRouter.navigate(['/login']);
            }
            return false;
        }
        
        let expired:any = sFlag;
        let sReVal:boolean = false;
        console.log("expired : ", expired);
               if(expired == 'user') {
                    console.log("expired", expired);
                   sReVal = true;
                   await this.cLoginSvc.updateLoginHistory('ACCESS'); // 접속시 접속 이력 추가
               }else if(expired == 'test'){
                    if( state.url =='/analyticmodel/tutorial' || state.url =='/intro' || state.url =='/login' ){
                        sReVal = true;
                    }else{
                        this.cRouter.navigate(['/login']);
                        sReVal = false;
                    }
               } else {
                    console.log("expired", expired);
                    // let tmpToken = localStorage.getItem('currentUser');

                    //if ( tmpToken != null)
                    this.cRouter.navigate(['/login']);
                    sReVal = false;
               }
            
        this.cAuthService.setAuthentication(sReVal);        
        return sReVal;
    }
}