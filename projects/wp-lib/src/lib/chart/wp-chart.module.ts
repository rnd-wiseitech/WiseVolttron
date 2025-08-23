import { ModuleWithProviders, NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { MaterialModule } from "../meterial-module/material-module";
import { WpCommonChartComponent } from "./common-chart/wp-lib-common-chart.component";
import { WpConfusionChartComponent } from "./confusion/wp-lib-confusion-chart.component";
import * as PlotlyJS from 'plotly.js-dist-min';
import { PlotlyModule } from 'angular-plotly.js';
import { WpDxPieChartComponent } from "./dx-chart/wp-lib-dx-pie-chart.component";
import { DxChartModule, DxPieChartModule } from "devextreme-angular";
import { WpDxBarChartComponent } from "./dx-chart/wp-lib-dx-bar-chart.component";
import { WpDxLineChartComponent } from "./dx-chart/wp-lib-dx-line-chart.component";
import { WpDxScatterChartComponent } from "./dx-chart/wp-lib-dx-scatter-chart.component";
PlotlyModule.plotlyjs = PlotlyJS;

@NgModule({
    declarations: [
        WpConfusionChartComponent,
        WpCommonChartComponent,
        WpDxPieChartComponent,
        WpDxBarChartComponent,
        WpDxLineChartComponent,
        WpDxScatterChartComponent,
    ],
    imports: [
        BrowserModule,
        MaterialModule,
        PlotlyModule,
        DxPieChartModule,
        DxChartModule
    ],
    providers: [],
    exports: [
        WpConfusionChartComponent, 
        WpCommonChartComponent, 
        WpDxPieChartComponent,
        WpDxBarChartComponent,
        WpDxLineChartComponent,
        WpDxScatterChartComponent
    ],
    bootstrap: []
})
export class WpChartModule { }
@NgModule({})
export class WpChartSharedModule {
    static forRoot(): ModuleWithProviders<WpChartModule> {
        return {
            ngModule: WpChartModule,
            providers: []
        }
    }
}