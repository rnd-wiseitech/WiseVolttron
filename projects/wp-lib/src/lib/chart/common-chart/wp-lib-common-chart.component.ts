import { Component, OnInit, Input, AfterViewInit, OnChanges, SimpleChanges, SimpleChange } from '@angular/core';
declare const $: any;
import { Chart, LinearScale, ScatterController, PointElement, LineElement, Legend, Title, Tooltip, LineController, CategoryScale, BarElement, BarController, PieController, ArcElement } from 'chart.js';

@Component({
    selector: 'wp-lib-common-chart',
    templateUrl: './wp-lib-common-chart.component.html',
    styleUrls: ['./wp-lib-common-chart.component.css']
})
export class WpCommonChartComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() chartData: any;
    @Input() targetId: any;

    h_ChartId: string;
    h_ChartColors = {
        primary: '#577df6',
        secondary: '#63c89b',
        third: '#00cec9',
        fourth: '#8173ed',
        fifth: '#ff7675',
        sixth: '#ec8959',
        seventh: '#f5c643'
    };
    myChart: any;
    oData: any;
    constructor() {
        Chart.register(ScatterController, LineController, BarController, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Legend, Title, Tooltip, PieController, ArcElement)
    }
    ngOnChanges(changes: SimpleChanges) {
        // Chart.register(ScatterController, LineController, BarController, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Legend, Title, Tooltip)
        let chartData: SimpleChange = changes.chartData;
        this.chartData = chartData.currentValue;
        this.oData = chartData.currentValue;
        if (this.oData !== undefined && this.oData["Data"].length)
            this.drawChart();
    }
    ngOnInit() {
        this.h_ChartId = this.targetId;
    }
    // WPLAT-354
    ngOnDestroy(): void {
        this.myChart.destroy();
        // Chart.unregister(LineController,BarController,CategoryScale,LinearScale,PointElement,LineElement,BarElement,  Legend, Title, Tooltip);
    }
    ngAfterViewInit() {

    }
    drawChart() {
        this.h_ChartId = this.oData['TargetId'];
        let sDataSet = [];
        let sLabels = this.oData['Label'];
        let sChartType = this.oData['ChartType'];
        let sChartOption: any;
        if (typeof this.oData['Data'][0]['Data'] !== 'undefined') {
            for (let sData of this.oData['Data']) {
                let sTmp: { [index: string]: any } = {};
                if (sData['DataOption'] != undefined) {
                    for (let sKey in sData['DataOption']) {
                        sTmp[sKey] = sData['DataOption'][sKey];
                    }
                }
                else {
                    sTmp['backgroundColor'] = this.h_ChartColors['primary'];
                }
                sTmp['data'] = sData['Data'];
                sDataSet.push(sTmp);
            }
        }
        else {
            let sTmp: { [index: string]: any } = {};
            if (this.oData['DataOption'] != undefined) {
                for (let sKey in this.oData['DataOption']) {
                    sTmp[sKey] = this.oData['DataOption'][sKey];
                }
            }
            else {
                sTmp['backgroundColor'] = this.h_ChartColors['primary'];
            }
            sTmp['data'] = this.oData['Data'];
            sDataSet.push(sTmp);
        }

        var barSubChartData = {
            labels: sLabels,
            datasets: sDataSet
        };
        var tooltipStyle = {
            mode: 'index',
            intersect: false,
            backgroundColor: '#57638f',
            titleFontStyle: 'light',
            xPadding: 20,
            yPadding: 20,
        };
        if (this.oData['ChartOption'] != undefined) {
            sChartOption = this.oData['ChartOption'];
            if (sChartOption.tooltips == undefined) {
                sChartOption['tooltips'] = tooltipStyle;
            }
        }
        else {
            sChartOption = {
                maintainAspectRatio: false,
                barRoundness: 0.5,
                tooltips: tooltipStyle,
                scales: {
                    // maxBarThickness: 5,
                    xAxes: [{
                        stacked: true,
                        barPercentage: 0.5,
                        gridLines: {
                            display: false
                        },
                    }]
                },
                legend: {
                    display: false,
                }
            };
        }

        setTimeout(() => {

            $('#h-' + this.targetId).remove();
            if (this.targetId == "h-TypeModelChart") {
                $('#h-ChartContainer-' + this.targetId).append('<canvas id="h-' + this.targetId + '" style="width:auto; height:auto;margin-top:7%"><canvas>');
            } else {
                $('#h-ChartContainer-' + this.targetId).append('<canvas id="h-' + this.targetId + '"><canvas>');
            }
            let canvas: any = document.querySelector('#h-' + this.targetId);
            this.myChart = new Chart(canvas.getContext('2d'), {
                type: sChartType,
                data: barSubChartData,
                options: sChartOption,
            });
            this.myChart.update({
                duration: 100,
                easing: 'easeOutCirc'
            })
        }, 100);
    }
}
