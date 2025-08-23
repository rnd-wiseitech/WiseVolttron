import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { WpComponentViewerService } from 'projects/workflow/src/app/components/wp-component-viewer.service';

declare const $: any;

@Component({
    selector: 'wp-lib-dx-bar-chart',
    templateUrl: './wp-lib-dx-bar-chart.component.html',
    styleUrls: ['./wp-lib-dx-bar-chart.component.css']
})
export class WpDxBarChartComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() chartData: any;
    @Input() targetId: any;


    myChart: any;
    oData: any;

    h_data: any;
    h_groupColumn: any;
    h_calColumn: any;
    customizeTooltip:any = ((p_text: any) => {
        let s_value = p_text.originalValue;
        let s_argue = p_text.argument;
        if (typeof s_value === 'number' && !isNaN(s_value)) {
            if (s_value > 1 || s_value < -1) {
                s_value = s_value.toFixed(2);
            }
        }
        if (typeof s_argue === 'number' && !isNaN(s_argue)) {
            if (s_argue > 1 || s_argue < -1) {
                s_argue = s_argue.toFixed(2);
            }
        }
        return { text: `${p_text.seriesName} : ${s_value}\n${this.h_groupColumn} : ${s_argue}`, fontColor: 'white' };
    });
    constructor(private cWpComViewerSvc: WpComponentViewerService,) {
        
    }

    ngOnChanges(changes: SimpleChanges) {
        let chartData: SimpleChange = changes.chartData;
        this.h_data = this.chartData['data'].map((item: any) => JSON.parse(item));
        this.h_groupColumn = this.chartData['groupColumn'][0];
        this.h_calColumn = this.chartData['schema'].filter((item: any) => item.name !== this.h_groupColumn).map((item: any) => item.name);
        this.cWpComViewerSvc.showProgress(false);

    }
    ngOnInit() {

    }
    ngAfterViewInit() {

    }
    drawChart() {

    }





    setFormat(p_label: any): any {
        if (typeof p_label === 'number' && !isNaN(p_label)) {
            if (p_label > 1 || p_label < -1) {
                p_label = p_label.toFixed(2);
            }
        }

        return p_label
    }
    legendClick({ target: series }: any) {
    series.isVisible()
      ? series.hide()
      : series.show();
  }

}
