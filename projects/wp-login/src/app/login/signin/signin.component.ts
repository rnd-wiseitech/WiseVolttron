import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { WpLoginComponent } from '../login.component';
import { WpLoginService } from '../login.service';
interface IWpSigninpUser { username: string; email?: string; password: string; remember: boolean; }

@Component({
  selector: 'wp-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.css']
})
export class WpSigninComponent extends WpLoginComponent {
  h_userModel: IWpSigninpUser = { username: "", password: "", remember: false };
  h_display: string;
  oSiginInForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    passwordIn: new FormControl('', [Validators.required, Validators.minLength(8)]),
    remember: new FormControl(),
  });
  oChangeForm = new FormGroup({
    tempPwd: new FormControl('', [Validators.required, Validators.minLength(8)]),
    newPwd: new FormControl('', [Validators.required, Validators.minLength(8)]),
  });
  constructor(
    private cLoginSvc: WpLoginService,
    private cCookie: CookieService,
    private cRouter: Router,
    public cDialog: MatDialog
  ) {
    super(cDialog);
  }

  ngOnInit(): void {
    this.setLoginForm(this.oSiginInForm);
    this.h_display = 'login'

    if (this.cCookie.get('cookie1') != "") {
      this.h_userModel.remember = true;
      this.h_userModel.username = this.cCookie.get('cookie1');
    }
  }
  ngOnDestroy(): void {

  }
  onChangeRememberEmail(pEvent: boolean) {
    this.h_userModel.remember = pEvent;
  }
  onFormSubmit() {
    let aUser: any;
    let email = this.h_userModel.username || this.h_userModel.email;
    aUser = this.cLoginSvc.getLogin(email, this.h_userModel.password.trim(),true);
    Promise.resolve(aUser).then(pUser => {
      if (pUser.CHECK_LOGIN === 'SUCCESS') {
        if (pUser.DEL_YN === 'E') {
          this.setLoginForm(this.oChangeForm);
          this.h_display = 'change';
          return;
        }
        if (this.h_userModel.remember === true) {
          this.cCookie.set('cookie1', this.h_userModel.username, 7);
        } else {
          this.cCookie.delete('cookie1');
        }
        this.cLoginSvc.updateLoginHistory('LOGIN').then(pResult => {
        }).catch(pErr => {
          console.log(pErr);
        }).finally(() => {
          setTimeout(() => {
            this.cRouter.navigate(['workflow']);
          }, 400);
        });
      }
      else if(pUser.CHECK_PWD === 'INVALID'){
          this.onModalShow('pwd');
      }
      else{
          this.onModalShow('id');
      }
    });
  }
  onChangePwdFormSubmit() {
    if (this.oForm.invalid) {
      return;
    } else {
      if (this.oForm.get('tempPwd').value.trim() != this.h_userModel.password.trim()) {
        this.onModalShow('pwd');
      }
      else {
        this.h_userModel.password = this.h_userModel.password.trim();
        let sTmpPwd = this.oForm.get('tempPwd').value;
        let sNewPwd = this.oForm.get('newPwd').value;
        this.oForm.get('tempPwd').setValue(sTmpPwd.trim());
        this.oForm.get('newPwd').setValue(sNewPwd.trim());
        this.cLoginSvc.changePwd(this.oForm.value, this.h_userModel).pipe(
        ).subscribe(pResponse => {
          console.log(pResponse.message);
          setTimeout(() => {
            this.cRouter.navigate(['workflow']);
          }, 400)
        });
      }
    }
  }
}
