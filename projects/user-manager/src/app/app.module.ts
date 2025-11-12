import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { DxDropDownBoxModule, DxSelectBoxModule, DxSortableModule, DxTreeViewModule } from 'devextreme-angular';
import { MaterialModule } from 'projects/wp-lib/src/lib/meterial-module/material-module';
import { JwtInterceptor } from 'projects/wp-lib/src/lib/wp-auth/jwt-interceptor';
import { WpGridSharedModule } from 'projects/wp-lib/src/lib/wp-grid/wp-grid.module';
import { WpLoadingSharedModule } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.module';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';

import { AppRoutingModule } from './app-routing.module';
import { UserManagerAppComponent } from './app.component';
import { UmLoginHistoryComponent } from './um-history/um-login/um-login.component';
import { UmMngComponent } from './um-mng/um-mng.component';

@NgModule({
  declarations: [
    UserManagerAppComponent,
    UmMngComponent,
    UmLoginHistoryComponent
  ],
  imports: [
    CommonModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    CommonModule,
    DxTreeViewModule,
    DxDropDownBoxModule,
    DxSelectBoxModule,
    ReactiveFormsModule,
    MaterialModule,
    FormsModule,
    DxSortableModule,
    WpGridSharedModule.forRoot(),
    WpLoadingSharedModule.forRoot(),
    WpTranslateSharedModule.forRoot(),
  ],
  providers: [{
    provide: HTTP_INTERCEPTORS,
    useClass: JwtInterceptor,
    multi: true
  }],
  bootstrap: [UserManagerAppComponent]
})
export class UserManagerAppModule { }

@NgModule({})
export class UserManagerSharedModule{
  static forRoot(): ModuleWithProviders<UserManagerAppModule> {
    return {
      ngModule: UserManagerAppModule,
      providers: []
    }
  }
}
