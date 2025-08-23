import { ModuleWithProviders, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgxSpinnerModule } from 'ngx-spinner';
import { WpLoadingComponent } from './wp-lib-loading.component';
import { WpLoadingService } from './wp-lib-loading.service';

@NgModule({
  declarations: [
    WpLoadingComponent
  ],
  imports: [
    BrowserModule,
    NgxSpinnerModule
  ],
  providers: [WpLoadingService],
  exports:[WpLoadingComponent]
})
export class WpLoadingModule { }
@NgModule({})
export class WpLoadingSharedModule{
  static forRoot(): ModuleWithProviders<WpLoadingModule> {
    return {
      ngModule: WpLoadingModule,
      providers: []
    };
  }
}