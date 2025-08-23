import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';

@Component({
  template: ``
})
export class WpLoginComponent implements OnInit {
  oForm: FormGroup;
  constructor(
    public cDialog: MatDialog,
  ) { }

  ngOnInit() { 
    console.log('login');
  }
  setLoginForm(pFormGroup: FormGroup) {
    this.oForm = pFormGroup;
  }
  onKeyDownFunction(pEvent: any) {
    if (pEvent.keyCode == 13) {
      this.onFormSubmit();
    }
  }
  onFormClick() {
    if (this.oForm.invalid) {
      return;
    } else {
      this.onFormSubmit();
    }
  }
  // vaild form 일 때 실행
  onFormSubmit() {
    return;
  }
  emailValidator(control: AbstractControl): { [key: string]: boolean } | null {
    if (control.value == '')
      return { 'required': true };
    let expression = /^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?()\.?()$/i;
    if (expression.test(control.value)) {
      return { 'pattern': true };
    }
    expression = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
    if (!expression.test(control.value)) {
      return { 'email': true };
    }
    return null;
  }
  getErrorMessage(pMsg: string) {
    if (pMsg === "username" || pMsg === "email" || pMsg === "emailF") {
      if (pMsg === "username") {
        return this.oForm.get('username').hasError('required') ? '이메일을 입력해 주세요.' :
          this.oForm.get('username').hasError('email') ? '올바른 이메일 형식이 아닙니다.' : '';
      }
      else if (pMsg === "email") {
        return this.oForm.get('email').hasError('required') ? '이메일을 입력해 주세요.' :
          this.oForm.get('email').hasError('email') ? '올바른 이메일 형식이 아닙니다.' :
            this.oForm.get('email').hasError('pattern') ? '해당 도메인은 사용할 수 없습니다.' : '';
      }
      else {
        return this.oForm.get('emailF').hasError('required') ? '이메일을 입력해 주세요.' :
          this.oForm.get('emailF').hasError('email') ? '올바른 이메일 형식이 아닙니다.' : '';
      }
    }
    else if (pMsg === "fullname" || pMsg === "codeNum" || pMsg === "fullnameF" || pMsg === "compName") {
      // if(pMsg==="fullname"){
      //     return this.oForm.get('fullname').hasError('required') ? '성명을 입력해 주세요.' : '';
      // }
      if (pMsg === "codeNum") {
        return this.oForm.get('codeNum').hasError('required') ? '인증번호를 입력해 주세요.' : '';
      }
      // else if(pMsg==="compName"){
      //     return this.oForm.get('compName').hasError('required') ? '회사명을 입력해 주세요.' : '';
      // }
      else {
        return this.oForm.get('fullnameF').hasError('required') ? '성명을 입력해 주세요.' : '';
      }
    }
    else {
      if (pMsg === "passwordIn") {
        return this.oForm.get('passwordIn').hasError('required') ? '비밀번호를 입력해 주세요.' :
          this.oForm.get('passwordIn').hasError('minlength') ? '비밀번호는 최소 8자 이상입니다.' : '';
      }
      else if (pMsg === "passwordUp") {
        return this.oForm.get('passwordUp').hasError('required') ? '비밀번호를 입력해 주세요.' :
          this.oForm.get('passwordUp').hasError('minlength') ? '비밀번호는 최소 8자 이상입니다.' : '';
      }
      else if (pMsg === "rpassword") {
        return this.oForm.get('rpassword').hasError('required') ? '비밀번호를 다시 입력해 주세요.' :
          this.oForm.get('rpassword').hasError('minlength') ? '비밀번호는 최소 8자 이상입니다.' : '';
      }
      else if (pMsg === "tempPwd") {
        return this.oForm.get('tempPwd').hasError('required') ? '현재 비밀번호를 입력해 주세요.' :
          this.oForm.get('tempPwd').hasError('minlength') ? '비밀번호는 최소 8자 이상입니다.' : '';
      }
      else {
        return this.oForm.get('newPwd').hasError('required') ? '새로운 비밀번호를 입력해 주세요.' :
          this.oForm.get('newPwd').hasError('minlength') ? '비밀번호는 최소 8자 이상입니다.' : '';
      }
    }
  }
  onModalShow(pMsg: string) {
    let sMsg = '';
    if (pMsg == 'id') {
      sMsg = '존재하지 않는 아이디입니다.다시 입력해 주세요.';
    }
    else if (pMsg == 'pwd') {
      sMsg = '비밀번호가 틀렸습니다.다시 입력해 주세요.';
    }
    else if (pMsg == 'changePwd') {
      sMsg = '임시 비밀번호가 메일로 전송되었습니다.';
    }      
    else if (pMsg == 'duplicate') {
      sMsg = '이미 사용중인 이메일주소입니다.';
    }
    else if (pMsg == 'checkPwd') {
      sMsg = '비밀번호가 일치하지 않습니다.다시 입력해 주세요.';
    }
    else if (pMsg == 'user') {
      sMsg = '가입되지 않은 사용자입니다.다시 입력해 주세요.';
    }
    else if (pMsg == 'code') {
      sMsg = '코드가 일치하지 않습니다.다시 입력해 주세요.';
    }
    else if (pMsg == 'agree') {
      sMsg = '개인정보 처리 약관 동의가 필요합니다.';
    }
    else if (pMsg == 'success') {
      sMsg = '회원가입이 완료되었습니다.';
    }
    else {

    }
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': 'Message',
        'flag': false,
        'message': sMsg,
        'colWidthOption': 'tight'
      }
    });
  }
  onPasswordVisible(pEvent: any) {
    let sInputElem = pEvent.target.parentElement.getElementsByTagName('input')[0];
    let sType = sInputElem.getAttribute('type');
    if (sType == 'password') {
      sInputElem.setAttribute('type', 'text');
      pEvent.target.className = 'ico visibility';
    }
    if (sType == 'text') {
      sInputElem.setAttribute('type', 'password');
      pEvent.target.className = 'ico visibility on';
    }
  }
}
