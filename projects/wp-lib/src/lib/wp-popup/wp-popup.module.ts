import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { DxButtonModule, DxDateBoxModule, DxDiagramModule, DxPopupModule, DxTemplateModule } from 'devextreme-angular';
import { MaterialModule } from '../meterial-module/material-module';
import { WpPopupComponent } from './wp-popup.component';
import { WpTranslateSharedModule } from '../wp-lib-translate/wp-lib-translate.module';
import { WpPopUpAuthorityComponent } from './wp-popup-authority.component';
import { WpGridModule } from '../wp-grid/wp-grid.module';
import { WpPopupUploadComponent } from './wp-popup-upload.component';
@NgModule({
  declarations: [
    WpPopupComponent, 
    WpPopUpAuthorityComponent,
    WpPopupUploadComponent
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
    WpGridModule,
    WpTranslateSharedModule.forRoot(),
  ],
  providers: [],
  exports:[WpPopupComponent, WpPopUpAuthorityComponent, WpPopupUploadComponent],
  bootstrap: [WpPopupComponent]
})
export class WpPopupModule { }
@NgModule({})
export class WpPopupSharedModule{
  static forRoot(): ModuleWithProviders<WpPopupModule> {
    return {
      ngModule: WpPopupModule,
      providers: []
    }
  }
}