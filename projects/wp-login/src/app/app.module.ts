import { HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WpLibModule } from 'projects/wp-lib/src/public-api';
import { WploginRoutingModule } from './app-routing.module';

import { WpLoginAppComponent } from './app.component';
import { AppConfig } from './app.config';
import { WpForgotPasswdComponent } from './login/forgot-passwd/forgot-passwd.component';
import { WpLoginService } from './login/login.service';
import { WpSigninComponent } from './login/signin/signin.component';
import { WpSignupComponent } from './login/signup/signup.component';

@NgModule({
  declarations: [
    WpLoginAppComponent,
    WpSigninComponent,
    WpForgotPasswdComponent,
    WpSignupComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    BrowserModule,
    WploginRoutingModule,
    WpLibModule,
    HttpClientModule,
    WpTranslateSharedModule.forRoot(),
  ],
  providers: [AppConfig,WpSocket,{
    provide: APP_INITIALIZER, 
    useFactory: (config: AppConfig) => () => config.load(), 
    deps: [AppConfig], 
    multi: true 
  }, WpLoginService],
  bootstrap: [WpLoginAppComponent]
})
export class WpLoginAppModule { }

@NgModule({})
export class WpLoginSharedModule{
  static forRoot(): ModuleWithProviders<WpLoginAppModule> {
    return {
      ngModule: WpLoginAppModule,
      providers: []
    }
  }
}