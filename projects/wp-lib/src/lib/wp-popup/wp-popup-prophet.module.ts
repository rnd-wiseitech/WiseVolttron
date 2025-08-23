import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { DxButtonModule, DxDateBoxModule, DxDiagramModule, DxPopupModule, DxTemplateModule } from 'devextreme-angular';
import { MaterialModule } from '../meterial-module/material-module';
import { WpPopupProphetComponent } from './wp-popup-prophet.component';
import { WpTranslateSharedModule } from '../wp-lib-translate/wp-lib-translate.module';
@NgModule({
  declarations: [
    WpPopupProphetComponent    
  ],
  imports: [
    BrowserModule,
    MaterialModule,
    MatDialogModule,
    DxPopupModule,
    DxButtonModule,
    DxTemplateModule,
    FormsModule,
    ReactiveFormsModule,
    DxDateBoxModule,
    DxDiagramModule,
    WpTranslateSharedModule.forRoot(),
  ],
  providers: [],
  exports:[WpPopupProphetComponent],
  bootstrap: [WpPopupProphetComponent]
})
export class WpPopupProphetModule { }