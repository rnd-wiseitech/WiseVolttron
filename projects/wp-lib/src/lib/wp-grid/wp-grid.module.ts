import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { WpGridComponent } from './wp-grid.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { MaterialModule } from '../meterial-module/material-module';
import { DxDateBoxModule } from 'devextreme-angular';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    WpGridComponent
  ],
  imports: [
    BrowserModule,
    MaterialModule,
    FormsModule,
    DxDateBoxModule,
    NgxPaginationModule,
    TranslateModule
  ],
  providers: [],
  exports:[WpGridComponent],
  bootstrap: [WpGridComponent]
})
export class WpGridModule { }
@NgModule({})
export class WpGridSharedModule{
  static forRoot(): ModuleWithProviders<WpGridModule> {
    return {
      ngModule: WpGridModule,
      providers: []
    }
  }
}