import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import { WpComponentViewerService } from 'projects/workflow/src/app/components/wp-component-viewer.service';

declare const $: any;

@Component({
    selector: 'wp-lib-dx-pie-chart',
    templateUrl: './wp-lib-dx-pie-chart.component.html',
    styleUrls: ['./wp-lib-dx-pie-chart.component.css']
})
export class WpDxPieChartComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() chartData: any;
    @Input() targetId: any;


    myChart: any;
    oData: any;

    h_data: any;
    h_groupColumn: any;
    h_calColumn: any;
    
    constructor(private cWpComViewerSvc: WpComponentViewerService) {
    }

    ngOnChanges(changes: SimpleChanges) {
        let chartData: SimpleChange = changes.chartData;
        this.h_data = this.chartData['data'].map((item: any) => JSON.parse(item));
        this.h_groupColumn = this.chartData['groupColumn'][0];
        this.h_calColumn = this.chartData['schema'].filter((item: any) => item.name !== this.h_groupColumn).map((item: any) => item.name)[0];
        this.cWpComViewerSvc.showProgress(false);
    }
    ngOnInit() {

    }
    ngAfterViewInit() {

    }
    drawChart() {

    }


    customizeTooltip(p_text: any): any {
        return { text: `${p_text.argumentText} - ${p_text.percentText}`, fontColor: 'white' };
    }


    setFormat(p_label: any): any {
        if (typeof p_label === 'number' && !isNaN(p_label)) {
            if(p_label > 1 || p_label < -1) {
                p_label = p_label.toFixed(2);
            }
        }
        
        return p_label
    }

}
