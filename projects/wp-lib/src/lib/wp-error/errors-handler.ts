import { ErrorHandler, Injectable, Injector} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MainAppService } from 'projects/main/src/app/app.service';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subscription } from 'rxjs';
declare const $: any;

@Injectable()
export class ErrorsHandler implements ErrorHandler {
  o_subscribe: Subscription
  constructor(
    private injector: Injector,
    private cMainAppSvc: MainAppService,
    private cSpinner: NgxSpinnerService
    // private cAppSvc: AppService,
    //private toastr:ToastrService
  ) {
  }

  handleError(error: any | HttpErrorResponse) {   
    
    // #162 out of memory 오류 수정
    // this.cSpinner.spinnerObservable.forEach(p=>{
    //   if (p != null && p.show) {
    //     this.cSpinner.hide(p.name);
    //   }
    // }); 
    // #162 out of memory 오류 수정
    this.o_subscribe = this.cSpinner.spinnerObservable.subscribe(async p=>{
      if (p != null && p.show) {
        await this.cSpinner.hide(p.name);
      }
    });
    this.o_subscribe.unsubscribe();       
    const router = this.injector.get(Router);    

    if(typeof error.rejection != 'undefined')
      error = error.rejection;

    if (error instanceof HttpErrorResponse) {
        // Server error happened  
        if (!navigator.onLine) {
          // No Internet connection
          console.log('No Internet Connection')
        }
        console.log(`${error.status} - ${error.message}`)
        
        this.cMainAppSvc.showMsg(this.getErrorMsg(error.status,error.error.message || error.message, error.url || ""),false);

    } else {
        // Client Error Happend      
        if(error.message.includes('ExpressionChangedAfterItHasBeenCheckedError')){
          return;
        }
        
        this.cMainAppSvc.showMsg(error.message,false);

    }
    // Log the error anyway
    console.log(error);
  }
  getErrorMsg(pCode:any,pMsg:any, pUrl:any){
    let sMsg = '';

    switch(pCode){
      case 0 :
        sMsg = `호출 Url이 잘못 되었거나
        서버가 종료되었습니다.`;
        break;
      case 320 :
        sMsg = `DB Query 실행 오류`;
        break;
      case 330 :
        sMsg = `DB Query 실행 오류`;
        break;
      case 350 :
        sMsg = `DB Query 실행 오류`;
        break;
      case 401 :
        sMsg = `인증 문제가 발생하였습니다. 다시 로그인 해주세요.`;
        break;
      case 404 :
        sMsg = `존재하지 않는 페이지입니다.`;
        break;
      case 500 :
        sMsg = `웹서버에서 오류가 발생 했습니다.`;
        break;
      case 550 :
        sMsg = `DB 서버에서 오류가 발생 했습니다.`;
        break;
      case 600 :
        sMsg = `분석 서버에서 오류가 발생 했습니다.`;
        break;
      case 601 :
        sMsg = `분석 서버에서 오류가 발생 했습니다.
        ${pMsg} 컬럼은 기존 모델이서 존재하지 않습니다.`;
        break;
      case 602 :
        sMsg = `분석 서버에서 오류가 발생 했습니다.
        데이터는 최소 2개 이상의 컬럼이 있어야 합니다.`;
        break;
      case 603 :
        sMsg = `분석 서버에서 오류가 발생 했습니다.
        엑셀 파일 형식은 xls 또는 xlsx만 가능하며 엑셀 버전이 최소 2.0 이상이어야 합니다.`;
        break;
      case 621 :
        sMsg = `실행 중인 쿼리가 정상적으로 중지되었습니다.`;
        break;
      case 622 :
        sMsg = `데이터와 테이블의 컬럼명이 일치하지 않습니다.`;
        break;
      case 623 :
        sMsg = `데이터와 테이블의 컬럼 개수가 일치하지 않습니다.`;
        break;
      case 700 :
        sMsg = `하둡 서버에서 오류가 발생 했습니다.`;
        break;
      case 333 :
        sMsg = pMsg;
        break;
    }

    if(![621,333].includes(pCode)) {
      sMsg = `${sMsg}\n위치 : ${pUrl}\n원인 : ${pMsg}`
    }

    return sMsg;
  }
}
