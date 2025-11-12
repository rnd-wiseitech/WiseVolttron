import { CdkVirtualScrollViewport, ScrollDispatcher } from '@angular/cdk/scrolling';
import { Component, Input, OnInit, SimpleChanges, NgZone, ViewChild, Output, EventEmitter, OnDestroy } from '@angular/core';
import { Chart, LineController, BarController, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Title } from 'chart.js';
import { MatTableExporterDirective } from 'mat-table-exporter';
import { VarInfo } from 'projects/wp-server/wp-type/WP_MANIFEST';
declare const $: any;
@Component({
  selector: 'wp-lib-data-viewer',
  templateUrl:'./wp-lib-data-viewer.component.html',
  styleUrls: ['./wp-lib-data-viewer.component.css']
})
export class WpLibDataViewerComponent implements OnInit ,OnDestroy{
  // download csv 
  @ViewChild("exporter", { read: MatTableExporterDirective }) exporter: MatTableExporterDirective;
  // @ViewChild("tblDoughnutChart") private tblDoughnutChart: ElementRef;
  @Input() iDataSource : any = [];
  @Input() iDisplayedColumns: any = [];
  @Input() iDisplayedGraphColumns: any = [];  
  @Input() iColumnsInfo: any = [];
  @Input() iGraphColInfo:VarInfo[] = [];  
  @Input() iOption: any;
  @Input() iPageNum: Number;
  
  @Output() onScrolled: EventEmitter<any> = new EventEmitter();
  
  @ViewChild(CdkVirtualScrollViewport) vVirtualScroll: CdkVirtualScrollViewport;
  h_itemSize = 60;
  oSearchPageNumber: number;
  h_offset: number;

  // dataprofile에서 사용
  oBarDataOption = {
    backgroundColor: '#c5c7d2',
    borderWidth: 0
  };
  oLineDataOption = {      
    backgroundColor: 'transparent',
    borderColor: '#c5c7d2',
    pointBorderWidth: 1,
    borderWidth: 3,
    pointBackgroundColor: '#c5c7d2',
    tension: 0,
    fill: false,
  };
  oBarChartOption = {
    responsiveAnimationDuration: 1000,
    maintainAspectRatio: false,
    // tooltips: {
    //   enabled: false,
    // },
    plugins: {
      tooltip: {
        titleFont: {
          size: 11
        },
        bodyFont: {
          size: 11
        },
        footerFont: {
          size: 11 // there is no footer by default
        }
      }
    },
    legend: {
        display: false,
    },
    labels: {
        display: false
    },
    title: {
        display: false
    },
    // barThickness: 20,
    scales: {
      x:{
        display:false,
      },
      y:{
        display:false,
      }
    },
  };
  oLineChartOption = {
    responsiveAnimationDuration: 1000,
    // responsive: false,
    maintainAspectRatio: false,
    // responsive: true,
    layout: {
        padding: {  
        }
    },
    title: {
      display: false,
    },
    // tooltips: {
    //   enabled: false,
    // },
    plugins: {
      tooltip: {
        titleFont: {
          size: 11
        },
        bodyFont: {
          size: 11
        },
        footerFont: {
          size: 11 // there is no footer by default
        }
      }
    },
    legend: {
      display: false,
    },
    pointDot: false,
    scales: {
      x:{
        display:false,
      },
      y:{
        display:false,
      }
    }
  };
  oSetInterValArray:any = [];
  constructor(private cScrollDispatcher: ScrollDispatcher, private cZone:NgZone) { 
    this.oSearchPageNumber = 1;
    Chart.unregister(Legend, Title);
    Chart.register(LineController,BarController,CategoryScale,LinearScale,PointElement,LineElement,BarElement, Tooltip)
  }
  
  ngOnInit(): void {
    $('.scrollbar').scrollbar();
  }
  ngOnDestroy():void{
    this.exporter = null;
    // 화면전환시에 chart를 destory를 해야함. 그러지 않을 경우 load가 너무 느려짐.
    let chart_obj:any = document.getElementsByClassName('chart_obj');
    for(var canvas of chart_obj) {
      if(canvas != null) {
        let chart = Chart.getChart(canvas.getContext('2d'));
        if(typeof chart != 'undefined')
          chart.destroy();
      }
    }
    for(let sInterVal of this.oSetInterValArray){
      clearTimeout(sInterVal);
    }
    
    console.log('============ngOnDestroy===============');
  }
  ngAfterViewInit(): void {
    // #64
    this.vVirtualScroll.elementRef.nativeElement.id = this.iOption['name'];
    // style.css 파일의 .componenet-table height 적용돼서 아래코드 아무 효과없음
    // this.vVirtualScroll.elementRef.nativeElement.style.height = this.iOption['height'];
    this.cScrollDispatcher.scrolled().pipe(
      // filter(event => this.vVirtualScroll.measureScrollOffset('bottom') === 0)
      // this.virtualScroll.measureScrollOffset('bottom') === 0
    ).subscribe(event => {
      let sVirScrollEvt:any = event;
      if( (sVirScrollEvt.measureScrollOffset('bottom') === 0 || sVirScrollEvt.measureScrollOffset('bottom') === 1) && sVirScrollEvt.elementRef.nativeElement.id == this.iOption['name']){
        console.log('new result append');
        this.oSearchPageNumber++;
        this.onScrolled.emit({'pageNum':this.oSearchPageNumber, 'name':this.iOption['name']});
      }
      //this.nextSearchPage(this.searchPageNumber);
    })
  }

  // #220 그래프 그리기ㅣㅣㅣ
  drawColumnGraph() {
    // #1
    if(this.iGraphColInfo.length!=0){
      this.oSetInterValArray.push(setTimeout(() => {
        for (let idx in this.iGraphColInfo) {
          let colIdx = this.iGraphColInfo[idx];
          // if(colIdx.datatype == 'numerical'){
            
          let canvas: any = document.getElementById('h_' + colIdx.column);

          if(canvas != null){            
            if(!Chart.getChart(canvas.getContext('2d'))){
            
              if (this.iGraphColInfo[idx].datatype == 'numerical' || this.iGraphColInfo[idx].datatype == 'categorical') {
                let sLabel = [];
                let sGraphData:any = [];
                let sType:string;
                let sChartOption:any;


                let sDistribution = colIdx.distribution;
                for (let dstrbIdx in sDistribution) {
                  sLabel.push(JSON.parse(sDistribution[dstrbIdx]).interval);
                  sGraphData.push(JSON.parse(sDistribution[dstrbIdx]).count);
                  // sBackgroundColor.push('#17a2b8')
                }

                let sTmpData = {
                  data: sGraphData
                };
                
                if (colIdx.datatype == 'categorical') {
                  sType = 'bar';
                  sChartOption = this.oBarChartOption;
                  Object.assign(sTmpData, this.oBarDataOption);
                }else{
                  sType = 'line';
                  sChartOption = this.oLineChartOption;
                  Object.assign(sTmpData, this.oLineDataOption);
                }
                var sChartData = {
                  labels: sLabel,
                  datasets: [sTmpData],
                };

                if (canvas) {
                  let sOptions:any = {
                    type: sType,
                    data: sChartData,
                    options: sChartOption
                  };
                  new Chart(canvas.getContext('2d'), sOptions);
                }
              }
            }
          }
        }
        // this.chkGraph = true;
      }, 50));
    }
    // }
  }
  // #220 그래프 정보 가져오면
  ngOnChanges(changes: SimpleChanges) {
    if(changes.iGraphColInfo)
      this.drawColumnGraph();
    if(changes.iPageNum){
      this.oSearchPageNumber = changes.iPageNum.currentValue;
    }
  }
  // 스크롤 맨 위로 올려주기 기능
  scrollToTop() {
    this.vVirtualScroll.scrollToIndex(0);
  }

}
