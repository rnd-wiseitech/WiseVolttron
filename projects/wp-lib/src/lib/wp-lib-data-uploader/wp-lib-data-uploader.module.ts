import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { DxDataGridModule, DxSelectBoxModule, DxTemplateModule, DxTooltipModule } from 'devextreme-angular';
import { MaterialModule } from '../meterial-module/material-module';
import { WpGridSharedModule } from '../wp-grid/wp-grid.module';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';
import { WpMetaService } from '../wp-meta/wp-meta.service';
import { WpLibDataUploaderComponent } from './wp-lib-data-uploader.component';

// #63
@NgModule({
  declarations: [ WpLibDataUploaderComponent],
  imports: [
      BrowserModule,
      MaterialModule,
      DxTooltipModule,
      DxDataGridModule,      
      DxSelectBoxModule,
      DxTemplateModule,
      FormsModule,
      WpGridSharedModule.forRoot()
  ],
  exports: [ WpLibDataUploaderComponent],
  providers:[WpAppConfig,
    WpMetaService,{
    provide: APP_INITIALIZER, 
    useFactory: (config: WpAppConfig) => () => config.load(), 
    deps: [WpAppConfig], 
    multi: true 
  },]
})
export class WpLibDataUploaderModule { }
