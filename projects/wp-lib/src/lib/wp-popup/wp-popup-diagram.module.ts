import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserModule } from '@angular/platform-browser';
import { DxButtonModule, DxDateBoxModule, DxDiagramModule, DxPopupModule, DxTemplateModule } from 'devextreme-angular';
import { WpComponentPropertiesModule } from 'projects/workflow/src/app/wp-menu/wp-component-properties/wp-component-properties.module';
import { MaterialModule } from '../meterial-module/material-module';
import { WpPopupDiagramComponent } from './wp-popup-diagram.component';
@NgModule({
  declarations: [
    WpPopupDiagramComponent
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
    WpComponentPropertiesModule
  ],
  providers: [],
  exports:[WpPopupDiagramComponent],
  bootstrap: [WpPopupDiagramComponent]
})
export class WpPopupDiagramModule { }
@NgModule({})
export class WpPopupDiagramSharedModule{
  static forRoot(): ModuleWithProviders<WpPopupDiagramModule> {
    return {
      ngModule: WpPopupDiagramModule,
      providers: []
    }
  }
}