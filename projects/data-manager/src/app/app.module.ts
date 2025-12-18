import { ModuleWithProviders, NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { DMAppComponent } from './app.component';
import { ConectionComponent } from './connection/connection.component';
import { DataSetComponent } from './dataset/dataset.component';
import { MonacoEditorModule,MONACO_PATH } from '@materia-ui/ngx-monaco-editor';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { DataSetSerivce } from './dataset/dataset.service';
import { ConnectionSerivce } from './connection/connection.service';
import { DataSetProfileComponent } from './dataset-profile/dataset-profile.component';
import { DataSetProfileSerivce } from './dataset-profile/dataset-profile.service';
import { WpLibDataViewerModule } from 'projects/wp-lib/src/lib/wp-lib-data-viewer/wp-lib-data-viewer.module';
import { DxFileManagerModule, DxTooltipModule } from 'devextreme-angular';
import { DmHdfsPopUpComponent } from './dataset/hdfs-popup/hdfs-popup.component';
import { WpLibDataUploaderModule } from 'projects/wp-lib/src/lib/wp-lib-data-uploader/wp-lib-data-uploader.module';
import {DxTreeViewModule } from 'devextreme-angular';
import { ScheduleService } from './schedule/schedule.service';
import { ScheduleComponent } from './schedule/schedule.component';
import { VolttronComponent } from './volttron/volttron.component';
import { SchedulePopupComponent } from './schedule/log-popup/log-popup.component';
import { DmImagePopUpComponent } from './dataset/image-popup/image-popup.component';
import { DataSetHistoryComponent } from './dataset-history/dataset-history.component';
import { HdfsViewerComponent } from './hdfs-viewer/hdfs-viewer.component';
import { VolttronSchedulePopupComponent } from './volttron/log-popup/volttron-log-popup.component';
import { WpLibModule } from 'projects/wp-lib/src/public-api';
import { WpPopupDiagramModule } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-diagram.module';
// import { HdfsViewerSerivce } from './hdfs-viewer/hdfs-viewer.service';
@NgModule({
  declarations: [
    DMAppComponent,
    DataSetComponent,
    ConectionComponent,
    HdfsViewerComponent,
    DataSetProfileComponent,
    DmHdfsPopUpComponent,
    DmImagePopUpComponent,
    ScheduleComponent,
    VolttronComponent,
    SchedulePopupComponent,
    VolttronSchedulePopupComponent,
    DataSetHistoryComponent
  ],    
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule ,
    HttpClientModule,
    AppRoutingModule,
    MatDialogModule,
    MonacoEditorModule,
    WpLibDataViewerModule,
    DxTooltipModule,
    DxFileManagerModule,
    WpLibDataUploaderModule,
    DxTreeViewModule,
    WpLibModule,    
    WpTranslateSharedModule.forRoot(),
    WpPopupDiagramModule
  ],
  providers: [
    {
      provide: MONACO_PATH,
      useValue: 'assets/monaco-editor/min/vs'
    },
    DataSetSerivce,
    ConnectionSerivce,
    DataSetProfileSerivce,
    ScheduleService
  ],
  bootstrap: [DMAppComponent],
  exports:[DmHdfsPopUpComponent, SchedulePopupComponent]
})
export class DMAppModule { }

@NgModule({})
export class DMSharedModule{
  static forRoot(): ModuleWithProviders<DMAppModule> {
    return {
      ngModule: DMAppModule,
      providers: []
    }
  }
}
