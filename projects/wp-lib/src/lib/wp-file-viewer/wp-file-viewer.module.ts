import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DxFileManagerModule } from 'devextreme-angular';
// import { AppService } from 'projects/wiseprophet/src/app/app.service';
// import { ModalService } from 'projects/wiseprophet/src/app/common/modal/modal.service';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';
import { WpLibDataUploaderModule } from '../wp-lib-data-uploader/wp-lib-data-uploader.module';
import { WpMetaService } from '../wp-meta/wp-meta.service';
import { WpFileViewerComponent } from './wp-file-viewer.component';
import { WpFileViewerService } from './wp-file-viewer.service';
import { WpTranslateSharedModule } from '../wp-lib-translate/wp-lib-translate.module';

@NgModule({
  declarations: [
    WpFileViewerComponent,    
  ],
  imports: [
    CommonModule,
    FormsModule,
    DxFileManagerModule,
    BrowserModule,
    WpLibDataUploaderModule,
    BrowserAnimationsModule,
    WpTranslateSharedModule.forRoot(),
    // TranslateModule.forRoot({
    //   loader: {
    //       provide: TranslateLoader,
    //       useFactory: HttpLoaderFactory,
    //       deps: [HttpClient]
    //   }}),
  ],
  providers: [ WpMetaService,WpFileViewerService
  ],
  exports:[WpFileViewerComponent]
})
export class WpFileViewerModule { }
@NgModule({})
export class WpFileViewerSharedModule{
  static forRoot(): ModuleWithProviders<WpFileViewerModule> {
    return {
      ngModule: WpFileViewerModule,
      providers: []
    };
  }
}