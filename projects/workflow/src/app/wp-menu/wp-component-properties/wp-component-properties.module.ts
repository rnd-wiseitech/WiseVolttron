
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { WpComponentPropertiesComponent } from './wp-component-properties.component';
import { WpComponentViewerComponent } from '../../components/wp-component-viewer.component';
import { WpPropertiesService } from './wp-component.properties.servie';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WpResultViewerComponent } from '../../components/resultview/wp-result-viewer.component';
import { WpResultViewerService } from '../../components/resultview/wp-result-viewer.service';
import { WpDerivedCondionalSetComponent } from '../../components/popup/wp-derived-condional-set.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MaterialModule } from 'projects/wp-lib/src/lib/meterial-module/material-module';
import { WpLibModule } from 'projects/wp-lib/src/lib/wp-lib.module';
import { NgWizardConfig, NgWizardModule, THEME } from 'ng-wizard';
import { WpGridSharedModule } from 'projects/wp-lib/src/lib/wp-grid/wp-grid.module';
import { WpTrainResultviewComponent } from '../../components/resultview/wp-train-result-viewer.component';
import { DxChartModule, DxDataGridModule, DxListModule, DxSelectBoxModule, DxTagBoxModule, DxTemplateModule, DxTextAreaModule } from 'devextreme-angular';
import { WpLoadingSharedModule } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.module';
import { MonacoEditorModule, MONACO_PATH } from '@materia-ui/ngx-monaco-editor';
import { NgxPaginationModule } from 'ngx-pagination';
import { WpChartModule } from 'projects/wp-lib/src/lib/chart/wp-chart.module';
import { WpInfoPopupComponent } from '../../components/popup/wp-info-popup.component';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';
import { WpOodbcUpdatePopupComponent } from '../../components/popup/wp-oodbc-update-popup.component';
const ngWizardConfig: NgWizardConfig = {
    theme: THEME.default
  };
@NgModule({
    declarations: [
        WpComponentPropertiesComponent,        
        WpComponentViewerComponent,
        WpDerivedCondionalSetComponent,
        // WpPythonPopupComponent,
        WpResultViewerComponent,
        WpTrainResultviewComponent,
        // WpEnsemblePopupComponenet,
        WpInfoPopupComponent,
        WpOodbcUpdatePopupComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MonacoEditorModule,
        MatFormFieldModule,
        MaterialModule,
        WpLibModule,
        DxDataGridModule,
        DxChartModule,
        NgWizardModule.forRoot(ngWizardConfig),
        WpGridSharedModule.forRoot(),
        WpLoadingSharedModule.forRoot(),
        DxListModule,
        DxTemplateModule,
        DxTagBoxModule,
        DxSelectBoxModule,
        DxTextAreaModule,
        NgxPaginationModule,
        WpChartModule,
        WpTranslateSharedModule.forRoot(),
    ],
    providers: [
        WpPropertiesService,
        WpResultViewerService,
        {
            provide: MONACO_PATH,
            useValue: 'assets/monaco-editor/min/vs'
        },
        ],
    bootstrap: [],
    exports:[
        WpComponentPropertiesComponent,
        WpComponentViewerComponent
    ],
    entryComponents:[
        WpResultViewerComponent
    ]
  })
  export class WpComponentPropertiesModule { }