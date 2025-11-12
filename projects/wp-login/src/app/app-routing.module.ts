import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// import { WpForgotPasswdComponent } from './login/forgot-passwd/forgot-passwd.component';
// import { WpSignupComponent } from './login/signup/signup.component';

const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full',outlet:'aaa'},
  // { path: 'forgot', component: WpForgotPasswdComponent },
  // { path: 'signup', component: WpSignupComponent },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class WploginRoutingModule { }
