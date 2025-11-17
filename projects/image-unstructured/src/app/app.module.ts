import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { MatPaginatorModule } from '@angular/material/paginator';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { WpChartModule } from 'projects/wp-lib/src/lib/chart/wp-chart.module';
import { FormsModule } from '@angular/forms';
import { DxDropDownBoxModule, DxSelectBoxModule, DxSortableModule, DxTreeViewModule, DxFileManagerModule, DxTooltipModule } from 'devextreme-angular';
import { AppRoutingModule } from './app-routing.module';
import { NgxPaginationModule } from 'ngx-pagination';
// import { WpImageStorageComponent } from 'projects/workflow/src/app/components/data/wp-image/wp-image-storage.component';
// import { WpImageLabelComponent } from 'projects/workflow/src/app/components/conversion/wp-image-label/wp-image-label.component';
// import { WpImageResizeComponent } from 'projects/workflow/src/app/components/conversion/wp-image-resize/wp-image-resize.component';
// import { WpImageODataSourceComponent } from 'projects/workflow/src/app/components/data/wp-image/wp-image-odata-source.component';
import { WpImageListPopUpComponent } from 'projects/image-unstructured/src/app/image-popup/image-list-popup.component';
import { WpLoadingSharedModule } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.module';
@NgModule({
  declarations: [
    // WpImageStorageComponent,
    // WpImageLabelComponent,
    // WpImageResizeComponent,
    // WpImageODataSourceComponent,
    WpImageListPopUpComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    CommonModule,
    AppRoutingModule,
    DxTooltipModule,
    DxFileManagerModule,
    DxTreeViewModule,
    WpChartModule,
    WpTranslateSharedModule.forRoot(),
    DxDropDownBoxModule,
    DxSelectBoxModule,
    DxSortableModule,
    MatPaginatorModule,
    NgxPaginationModule,
    WpLoadingSharedModule.forRoot() ,
  ],
  providers: [],
  bootstrap: []
})
export class ImageUnstructuredModule {
  constructor() {
    
  }
}

@NgModule({})
export class ImageUnstructuredSharedModule {
  static forRoot(): ModuleWithProviders<ImageUnstructuredModule> {
    return {
      ngModule: ImageUnstructuredModule,
      providers: []
    }
  }
}