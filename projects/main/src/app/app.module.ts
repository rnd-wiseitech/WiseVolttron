import { APP_INITIALIZER, ErrorHandler, Injectable, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AuthGuard } from 'projects/wp-lib/src/lib/wp-auth/authguard';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DxDiagramModule } from 'devextreme-angular';
import { MatDialogModule } from '@angular/material/dialog';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { HeaderComponent } from './header/header-layout.component';
import { CommonModule } from '@angular/common';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { MONACO_PATH } from '@materia-ui/ngx-monaco-editor';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from 'projects/wp-lib/src/lib/wp-auth/auth.service';
import { CryptoService } from 'projects/wp-lib/src/lib/wp-lib-common/crypto/crypto.service';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { JwtInterceptor } from 'projects/wp-lib/src/lib/wp-auth/jwt-interceptor';
import { MaterialModule } from 'projects/wp-lib/src/lib/meterial-module/material-module';
import { MainAppService } from './app.service';
// import { WpPopupSharedModule } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.module';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { SocketIoModule } from 'ngx-socket-io';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorsHandler } from 'projects/wp-lib/src/lib/wp-error/errors-handler';
import { WpLoadingSharedModule } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.module';
import { NgxPaginationModule } from 'ngx-pagination';
import { WpLibModule } from 'projects/wp-lib/src/public-api';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    DxDiagramModule,
    MatDialogModule,
    HttpClientModule,
    NgxPaginationModule,
    WpLibModule,
    // WpModalSharedModule, WpLoadingSharedModule 는 main에서 사용하므로 import해야함
    WpLoadingSharedModule.forRoot(),
    WpTranslateSharedModule.forRoot(),
    MaterialModule,
    SocketIoModule
  ],
  providers: [
    AuthGuard,
    WpMetaService,
    MainAppService,
    WpAppConfig,{
      provide: APP_INITIALIZER, 
      useFactory: (config: WpAppConfig) => () => config.load(), 
      deps: [WpAppConfig], 
      multi: true 
    },
    {
      provide: MONACO_PATH,
      useValue: 'assets/monaco-editor/min/vs'
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    AuthService,
    CryptoService,
    WpSocket,{
      provide: ErrorHandler, 
      useClass: ErrorsHandler
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
