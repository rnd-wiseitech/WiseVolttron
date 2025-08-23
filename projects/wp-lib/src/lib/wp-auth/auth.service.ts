import { EventEmitter, Injectable, Output } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// import { JwtHelperService  } from '@auth0/angular-jwt';
import {  map } from 'rxjs/operators';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';


@Injectable()
export class AuthService {
  
  TOKEN_NAME = 'currentUser';
  @Output() authStatChanged: EventEmitter<any> = new EventEmitter();

  constructor(private http: HttpClient,
              private cAppConfig:  WpAppConfig) {
    //console.log('[appUrl] ', this.appUrl);
  }

  signin(credential:any): Observable<any> {
    return this.http.post(`${this.cAppConfig.getServerPath('NODE')}/auth/signin`, credential)
      .pipe(map((res:any) => this.setToken(res['token'])));
      
  }

  signout(): void {
    this.removeToken();
  }

  setAuthentication(pFlag:any){
    this.authStatChanged.emit(pFlag);
  }
  // // 토큰 유효성 검증
  // isAuthenticated(): boolean {
  //   const token = this.getToken();

  //   return token ? !this.isTokenExpired(token) : false;
  // }

  // getToken() {
  //   if(localStorage.getItem(this.TOKEN_NAME) != null || localStorage.getItem(this.TOKEN_NAME) != undefined)
  //     return JSON.parse(localStorage.getItem(this.TOKEN_NAME));
  //   else
  //     return false;
  // }

  getToken() {
    if(localStorage.getItem(this.TOKEN_NAME) != null){
      try {
        let sToken:any = localStorage.getItem('currentUser');
        return JSON.parse(sToken);     
      } catch (error) {
        console.log(error);
        return false;
      }
    }
    else{
      return false;
    }

  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_NAME, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_NAME);
  }

  /*
    token 유효 기간 체크
    The JwtHelper class has several useful methods that can be utilized in your components:

    decodeToken
    getTokenExpirationDate
    isTokenExpired

    npm install angular2-jwt
    https://github.com/auth0/angular2-jwt
  */
  // isTokenExpired(token: string) {
  //   return this.jwtHelper.isTokenExpired(token);
  // }
  isTokenExpired() {
    let token = this.getToken();
    if(!token){
      token = '';
    }

    return new Promise((resolve, reject) => {
      this.http.post(`${this.cAppConfig.getServerPath('NODE')}/auth/tokenCheck`, {"token":token}).subscribe(
        (e:any)=> resolve(e),
        error => reject(error)
      );
    });
  }

  // getUserid(): string {
  //   return this.jwtHelper.decodeToken(this.getToken()).userid;
  // }

  getUserInfo(){
    let sToken:any = localStorage.getItem('currentUser');
    return JSON.parse(sToken);
  }
}