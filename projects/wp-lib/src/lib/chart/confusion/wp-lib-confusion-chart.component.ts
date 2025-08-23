import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
import * as Plotly from 'plotly.js-dist-min';
declare const $: any;

@Component({
  selector: 'wp-lib-confusion-chart',
  templateUrl: './wp-lib-confusion-chart.component.html',
  styleUrls: ['./wp-lib-confusion-chart.component.css']
})
export class WpConfusionChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() chartData: any;
  @Input() targetId: any;

  h_CorrGraph: any = [];
  h_ChartId: string;
  h_height = 400;
  oData: any
  constructor() {

  }

  ngOnInit() {

  }
 // WPLAT-357
  ngOnDestroy(): void {
    Plotly.purge('h-' + this.targetId);
}
  ngAfterViewInit() {

  }
  ngOnChanges(changes: SimpleChanges) {
    let chartData: SimpleChange = changes.chartData;
    this.chartData = chartData.currentValue;
    this.oData = chartData.currentValue;
    if(this.oData['Height'] != undefined) {
      this.h_height = this.oData['Height']
    }
    if (this.oData !== undefined && this.oData["Data"].length > 0)
      this.drawChart();
  }

  drawChart() {
    let data = this.oData['Data'];


    let layout: any;
    // if (typeof this.oData['Layout'] !== 'undefined')
    //   layout = this.oData['Layout'];
    // else {
      layout = {
        // autosize:true,
        // automargin: true,
        height: this.h_height,
        annotations: [],
        xaxis: {
          ticks: '',
          automargin: true
        },
        yaxis: {
          ticks: '',
          ticksuffix: ' ',
          autosize: true,
          automargin: true
        }
      };
    // }
    this.h_CorrGraph.data = data;
    this.h_CorrGraph.layout = layout;
    let sTargetId = 'h-' + this.targetId;
    setTimeout(() => {
      Promise.resolve(
        Plotly.newPlot(sTargetId, data, layout, { displayModeBar: false })).then(() => {
        })
    }, 100);
  }
}
