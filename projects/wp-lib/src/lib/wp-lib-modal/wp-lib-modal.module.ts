import { ModuleWithProviders, NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { BrowserModule } from '@angular/platform-browser';
import { WpModalComponent } from './wp-lib-modal.component';


@NgModule({
  declarations: [
    WpModalComponent
  ],
  imports: [
    BrowserModule,
    MatIconModule
  ],
  providers: [],
  exports:[WpModalComponent],
  bootstrap: [WpModalComponent]
})
export class WpModalModule { }
@NgModule({})
export class WpModalSharedModule{
  static forRoot(): ModuleWithProviders<WpModalModule> {
    return {
      ngModule: WpModalModule,
      providers: []
    }
  }
}