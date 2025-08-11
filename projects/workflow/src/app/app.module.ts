import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { AngularSplitModule } from 'angular-split';
import { DxDiagramModule, DxSelectBoxModule, DxTagBoxModule } from 'devextreme-angular';
import { WorkflowRoutingModule } from './app-routing.module';
import { WorkflowAppComponent } from './app.component';
import { WpDiagramComponent } from './wp-diagram/wp-diagram.component';
import { ScrollDispatcher, ScrollingModule } from '@angular/cdk/scrolling';
import { WpGridSharedModule } from 'projects/wp-lib/src/lib/wp-grid/wp-grid.module';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { WpDiagramService } from './wp-diagram/wp-diagram.service';
import { WorkflowAppService } from './app.service';
import { WpLibModule } from 'projects/wp-lib/src/lib/wp-lib.module';
import { DiagramNavComponent } from './wp-menu/diagram-nav/diagram-nav.component';
import { WpComponentService } from './components/wp-component.service';
import { WpComponentViewerService } from './components/wp-component-viewer.service';
import { WpComponentPropertiesModule } from './wp-menu/wp-component-properties/wp-component-properties.module';
import { WpStreamingService } from './components/data/wp-streaming/wp-streaming.service';
import { MaterialModule } from 'projects/wp-lib/src/lib/meterial-module/material-module';
import { WpDiagramPreviewModule } from './wp-menu/wp-diagram-preview/wp-diagram-preview.module';
import { WpDiagramPreviewService } from './wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpLoadingSharedModule } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.module';
import { WpDiagramToolbarModule } from './wp-menu/wp-diagram-toolbar/wp-diagram-toolbar.module';
import { WpLoadComponent } from './wp-diagram/wp-load/wp-load.component';
import { WpUserParameterComponent } from './wp-menu/wp-user-parameter/wp-user-parameter.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { WpTrainModelService } from './components/analytic-model/wp-train-model/wp-train-model.service';
import { WpCompareModelService } from './components/analytic-model/wp-compare-model/wp-compare-model.service';
// import { WpDynamicPromptService } from './components/analytic-model/wp-dynamic-prompt/wp-dynamic-prompt.service';
import { AlgorithmSharedModule } from 'projects/algorithm-manager/src/app/app.module';
import { WpPopupDiagramModule } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-diagram.module';
import { ImageUnstructuredSharedModule } from 'projects/image-unstructured/src/app/app.module';
@NgModule({
  declarations: [
    WorkflowAppComponent,
    WpDiagramComponent,
    DiagramNavComponent,
    WpLoadComponent,
    WpUserParameterComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    WorkflowRoutingModule,
    DxDiagramModule,
    DxTagBoxModule,
    DxSelectBoxModule,
    AngularSplitModule,
    ScrollingModule,
    WpGridSharedModule.forRoot(),
    WpTranslateSharedModule.forRoot(),
    WpLibModule,
    WpComponentPropertiesModule,
    MaterialModule,
    WpDiagramPreviewModule,
    WpDiagramToolbarModule,
    WpLoadingSharedModule.forRoot(),
    AlgorithmSharedModule.forRoot(),
    ImageUnstructuredSharedModule.forRoot(),
    NgxPaginationModule,
    WpPopupDiagramModule
  ],
  providers: [
    ScrollDispatcher,
    WorkflowAppService,
    WpDiagramService,
    WpComponentService,
    WpComponentViewerService,
    WpStreamingService,
    WpDiagramPreviewService,
    WpTrainModelService,
    WpCompareModelService,
    // WpDynamicPromptService
  ],
  bootstrap: [WorkflowAppComponent]
})
export class WorkflowAppModule { }

@NgModule({})
export class WmSharedModule {
  static forRoot(): ModuleWithProviders<WorkflowAppModule> {
    return {
      ngModule: WorkflowAppModule,
      providers: [
        WpDiagramService,
        WpTrainModelService,
        WpCompareModelService,
        // WpDynamicPromptService
      ]
    }
  }
}