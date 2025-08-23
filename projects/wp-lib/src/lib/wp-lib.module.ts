import {  } from '@angular/compiler/src/core';
import { NgModule,APP_INITIALIZER,ModuleWithProviders } from '@angular/core';
import { WpChartModule } from './chart/wp-chart.module';
// import { WpFileViewerModule } from './wp-file-viewer/wp-file-viewer.module';
import { WpGridModule } from './wp-grid/wp-grid.module';
import { WpAppConfig } from './wp-lib-config/wp-lib-config';
import { WpLoadingModule } from './wp-lib-loading/wp-lib-loading.module';
import { WpModalModule } from './wp-lib-modal/wp-lib-modal.module';
import { WpLibComponent } from './wp-lib.component';
import { WpPopupModule } from './wp-popup/wp-popup.module';
// import { WpSwitchComponent } from './wp-switch/wp-switch.component';
// import { WpPopupProphetModule } from './wp-popup/wp-popup-prophet.module';


@NgModule({
  declarations: [
    WpLibComponent,
    // WpSwitchComponent,
  ],
  imports: [
    // WpFileViewerModule,
    // WpPopupDiagramSharedModule.forRoot(),
    WpPopupModule,
    // WpPopupProphetModule,
    WpModalModule,
    WpLoadingModule,
    WpGridModule,
    WpChartModule,
  ],
  providers:[WpAppConfig,{
    provide: APP_INITIALIZER, 
    useFactory: (config: WpAppConfig) => () => config.load(), 
    deps: [WpAppConfig], 
    multi: true 
  }],
  exports: [
    // WpSwitchComponent,
    // WpFileViewerModule,
    WpPopupModule,
    // WpPopupProphetModule,    
    WpModalModule,
    WpLoadingModule,
    WpGridModule,
    WpChartModule,
  ]
})
export class WpLibModule { }
@NgModule({})
export class WpLibSharedModule{
  static forRoot(): ModuleWithProviders<WpLibModule> {
    return {
      ngModule: WpLibModule,
      providers: []
    };
  }
}
