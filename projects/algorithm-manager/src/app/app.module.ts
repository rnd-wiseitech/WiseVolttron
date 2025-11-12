import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { WpGridSharedModule } from 'projects/wp-lib/src/lib/wp-grid/wp-grid.module';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { JwtInterceptor } from 'projects/wp-lib/src/lib/wp-auth/jwt-interceptor';
import { WpChartModule } from 'projects/wp-lib/src/lib/chart/wp-chart.module';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { NgxBlocklyModule, } from 'ngx-blockly';
import * as Blockly from 'blockly';
import { AlgorithmAppComponent } from './app.component';
import { MonacoEditorModule, MONACO_PATH } from '@materia-ui/ngx-monaco-editor';
import { AlgorithmAppService } from './app.service';
import { WpLibModule } from 'projects/wp-lib/src/public-api';
import { NgxPaginationModule } from 'ngx-pagination';
import { ModelManagerComponent } from './model-manager/model-manager.component';
import { ModelManagerService } from './model-manager/model-manager.service';
import { ModelProfileComponent } from './model-profile/model-profile.component';
import { ModelProfileService } from './model-profile/model-profile.service';
import { WpPopupDiagramModule } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-diagram.module';
import { WpLibDataUploaderModule } from 'projects/wp-lib/src/lib/wp-lib-data-uploader/wp-lib-data-uploader.module';
import { ModelHistoryPopupComponent } from './model-profile/popup/history-popup.component';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [
    AlgorithmAppComponent,
    ModelManagerComponent,
    ModelProfileComponent,
    ModelHistoryPopupComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CommonModule,
    HttpClientModule,
    AppRoutingModule,
    NgxBlocklyModule,
    MonacoEditorModule,
    NgxPaginationModule,
    MatDialogModule,
    WpLibModule,
    WpChartModule,
    // WmSharedModule.forRoot(),
    WpTranslateSharedModule.forRoot(),
    WpPopupDiagramModule,
    WpLibDataUploaderModule,
    WpGridSharedModule,
  ],
  providers: [
    AlgorithmAppService,
    ModelManagerService,
    ModelProfileService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    {
      provide: MONACO_PATH,
      useValue: 'assets/monaco-editor/min/vs'
    }
  ],
  bootstrap: [AlgorithmAppComponent]
})
export class AlgorithmModule {
  constructor() {
    // Set Blockly object
    (window as any).Blockly = Blockly;
  }
}

@NgModule({})
export class AlgorithmSharedModule {
  static forRoot(): ModuleWithProviders<AlgorithmModule> {
    return {
      ngModule: AlgorithmModule,
      providers: []
    }
  }
}