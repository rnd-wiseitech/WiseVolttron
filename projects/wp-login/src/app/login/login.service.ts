import { Injectable, Output, EventEmitter } from "@angular/core";
import { HttpClient } from "@angular/common/http";

import { Observable } from "rxjs";
import { CryptoService } from "projects/wp-lib/src/lib/wp-lib-common/crypto/crypto.service";
import { WpSeriveImple } from "projects/wp-lib/src/lib/wp-meta/service-imple";
import { WpAppConfig } from "projects/wp-lib/src/lib/wp-lib-config/wp-lib-config";

// import { AppService } from "../app.service";


@Injectable({ providedIn: 'root' })
export class WpLoginService extends WpSeriveImple {

    @Output() changePage: EventEmitter<any> = new EventEmitter();

    constructor(
        private cHttp: HttpClient,
        private cAppConfig: WpAppConfig,
        private cCryptoService: CryptoService,
    ) {
            super(cAppConfig);
    }

    signup(pAgree:any) {
        console.log("pAgree : ", pAgree);
        this.changePage.emit(pAgree);
    }

    getLogin(pUserName: string, pPassword: string,pEncrypt:boolean) {
        return new Promise((pResolve, pReject) => {
            this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/auth/login',
                {

                    params: {
                        USER_ID: pUserName,
                        password: pEncrypt ? this.cCryptoService.encryptPwd(pPassword) : pPassword
                    },
                    observe: 'response'
                }).toPromise().then((pResponse: any) => {

                    let aUser = pResponse;
                    if (aUser.CHECK_LOGIN === 'SUCCESS') {
                        localStorage.setItem('currentUser', JSON.stringify(aUser['TOKEN']));
                    }

                    pResolve(aUser);
                });
        });
    }

    logout() {
        localStorage.removeItem('currentUser');
    }

    getCode(pAuth:any): Observable<any> {
        console.log(pAuth);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/checkCode', pAuth);
    }

    updateMode(pUserModel:any): Observable<any> {
        console.log(pUserModel);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/modMode', pUserModel);
    }

    changePwd(pPwd:any, pAuth:any): Observable<any> {
        console.log(pPwd);
        console.log(pPwd.tempPwd);
        pPwd.tempPwd = this.cCryptoService.encryptPwd(pPwd.tempPwd);
        pPwd.newPwd = this.cCryptoService.encryptPwd(pPwd.newPwd);
        console.log(pPwd);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/modPwd', { pwdNum: pPwd, auth: pAuth });
    }

    checkEmail(pAuth:any): Observable<any> {
        console.log("checkEmail pAuth : ", pAuth);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/check', pAuth);
    }

    checkUser(ptempPwd:any, pAuth:any): Observable<any> {
        ptempPwd = this.cCryptoService.encryptPwd(ptempPwd);
        console.log(ptempPwd);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/userCheck', { pwdNum: ptempPwd, auth: pAuth });
    }

    regEmail(pAuth:any): Observable<any> {
        pAuth.password2 = this.cCryptoService.encryptPwd(pAuth.password);
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/auth', pAuth);
    }

    regMode(pAuth:any, pAuthNum:any): Observable<any> {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/regMode', { email: pAuth, authNum: pAuthNum });
    }

    sendRegEmail(pEmail:any, pAuthNum:any): Observable<any> {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/userEmail', { email: pEmail, authNum: pAuthNum });
    }

    sendResetEmail(ptempPwd:any, pEmail:any): Observable<any> {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/register/pwdEmail', { pwdNum: ptempPwd, email: pEmail });
    }

    async getUserInfo():Promise<Observable<any>> {
        let sToken:any = localStorage.getItem('currentUser');
        let aCurrentUser = JSON.parse(sToken);
        let s_userInfo:any = await this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/userMng/userInfo', aCurrentUser).toPromise();

        return s_userInfo;
    }
    // WPLAT-34 접속 이력 추가
    updateLoginHistory(pType: 'LOGIN' | 'LOGOUT' | 'ACCESS', pUserNo?: number) {
        return new Promise(async (pResolve, pReject) => {
            try {
                let sUserNo = pUserNo;
                if (!sUserNo) {
                    let sResult: any = await this.cHttp.post(`${this.cAppConfig.getServerPath('NODE')}/userMng/userInfo`, {}).toPromise();
                    sUserNo = sResult['USER_NO'];
                }
                let sUpdateLoginHistory = await this.cHttp.post(`${this.cAppConfig.getServerPath('NODE')}/auth/updateLoginHistory`, { USER_NO: sUserNo, TYPE: pType }).toPromise();
                pResolve(sUpdateLoginHistory);
            } catch (pErr) {
                pReject(pErr);
            }
        });
    }

    changeLang(pLangType:any):Observable<any> {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/userMng/changeLang', {LANG:pLangType});
    }
}