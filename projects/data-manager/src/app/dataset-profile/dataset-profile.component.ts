import { Component, ElementRef, OnInit, ViewChild, Input} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ArcElement, Chart, DoughnutController } from 'chart.js';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpDiagramService } from 'projects/workflow/src/app/wp-diagram/wp-diagram.service';
import { HistoryItem, HistoryService } from 'projects/wp-lib/src/lib/wp-history/wp-history.service';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { Subscription } from 'rxjs';
import { DmAppService } from '../app.service';
import { DataSetProfileSerivce } from './dataset-profile.service';
import { WP_STATISTIC_DATA } from 'projects/wp-server/wp-type/WP_DATASET_ATT';
import { VarInfo } from 'projects/wp-server/wp-type/WP_MANIFEST';
import { TranslateService } from '@ngx-translate/core';
import { WpLibDataViewerComponent} from 'projects/wp-lib/src/lib/wp-lib-data-viewer/wp-lib-data-viewer.component'
declare const $: any;

@Component({
  selector: 'dm-dataset-profile',
  templateUrl: './dataset-profile.component.html',
  styleUrls: ['./dataset-profile.component.css']
})
export class DataSetProfileComponent implements OnInit {
  // @ViewChild(DxTooltipComponent, { static: false }) oTooltip: DxTooltipComponent;
  @ViewChild("tblDoughnutChart") private tblDoughnutChart: ElementRef;
  @ViewChild('wpLibDataViewer') oWpLibDataViewer!: WpLibDataViewerComponent;
  oDoughnutChart: any;
  @Input() oProfileData:any;
  oDisplayedColumns: string[] = [];
  // 그래프 컬럼
  oDisplayedGraphColumns:any;
  oSelectData:any;
  oUsetable:any;
  oRecentViewIdx:any;
  oSchema:any;
  oColInfo:VarInfo[] = [];
  oCurrPageNum:Number = 0;
  h_Pipelist:any = [];
  h_Historylist:any = [];
  h_Warnlist:any = [];
  h_Noticelist:any = [];
  h_Loglist:any = [];
  // #220 화면에 뿌릴것들
  oRowCnts:WP_STATISTIC_DATA = {
    row_count: 0,
    column_count: 0,
    cell_count: 0,
    cell_null_count: 0,
    cell_outlier_count: 0
  };
  oImageRowCnts:any = {
    row_count : 0,
  };
  h_ImageCount = 1;
 
  h_typeCnts = {
    numeric: 0,
    categoric: 0,
    text: 0
  };
  h_graphRates:any = {}
  h_graphRatesMessage : any = {}
  h_graphType:string = ''
  // h_chkoutList:any = [];
  oHighCorrColmn = {};
  o_settimeId:any;
  // h_tooltipVisible = false;
  // #1 통계분석 재실행 버튼
  h_reStatisticBtn = false;
  // #2 통계분석 진행중 여부
  h_reStatisticFlag = false;
  // #3 icon
  h_icon = 'refresh';
  oVirtualOption = { 'height': '620px', 'name': 'dm-dataset-profile'};
  h_TooltipMsgArr:any = {};
  // oGridCol:any;
  // oGridRowEvt = true;
  // oGridheader = {btnNm:'DataSet Added', filterCol:'DS_VIEW_NM'};
  // oDisplayedColumnNms: string[] = ['권한', '데이터명',  '원본 데이터명', '만든이', '만든 날짜', '수정 날짜', '통계 상태', 'FUNCTION'];
  // oDisplayedColumns: string[] = ['AUTHORITY', 'DS_VIEW_NM',  'TBL_CAPTION', 'REG_USER_NO', 'REG_DT', 'UPD_DT', 'DATASTATUS'];
  // oAddDtsetFormData:any[];

  // oShowProfileSubscribe:Subscription;
  oSocketSubscribe:Subscription;
  oSparkApiSubscribeArray:Array<Subscription> = [];
  constructor(public cDialog: MatDialog,
    public cMetaSvc:WpMetaService,
    private cMainAppSvc: MainAppService,
    private cHistorySvc: HistoryService,
    private cWpSocket:WpSocket,
    public cDmAppSvc: DmAppService,
    private cDtProfileSvc: DataSetProfileSerivce,
    private cWpLibSvc: WpLoadingService,
    private cWpDiagramSvc: WpDiagramService,
    private cTransSvc: TranslateService
    ) { 
      Chart.register(DoughnutController,ArcElement)
    }

  ngOnDestroy():void{
    // 화면전환시에 chart를 destroy해야함.
    // 다른 페이지로 이동할때 도넛차트 있을 때만 destroy
    if (this.oDoughnutChart)
      this.oDoughnutChart.destroy();
    this.oSocketSubscribe.unsubscribe();
    clearTimeout(this.o_settimeId);
    // this.oShowProfileSubscribe.unsubscribe();
  }
  ngOnInit(): void {
    this.oSocketSubscribe = this.cWpSocket.statusStati().subscribe((pData:any) => {
      if (pData.view_id == this.oProfileData.DS_VIEW_ID) {
        this.oProfileData['STATUS_CODE'] = pData['code']; 
        // this.oProfileData['TBL_DESC'] = pData['desc']; 
        if(pData['code'] == 99){
          this.oProfileData['TBL_LOG'] = pData['log'];  
        }else if(pData['code'] == 40){
          this.oProfileData['VIEW_IDX'] = pData['idx']; 
        }
        // #1 공통이라 함수로 뺌
        this.setViewIdx();
        // #15
        if (this.oProfileData.VIEW_IDX == this.oRecentViewIdx) {
          this.drawColInfo();
        }        
        this.cWpLibSvc.showProgress(false, 'wdspin');
      }
    });
    $('.scrollbar').scrollbar();
  
    // this.oShowProfileSubscribe = this.cDmAppSvc.showProfileEmit.subscribe(pData=>{
      // console.log(pData)
      // this.oProfileData = pData;
      this.getProfileData();
    // });
  }  
  onEditName() {
    this.cMetaSvc.getDsInfo().subscribe(p_result=>{
      let s_tmp = [];
      let s_tmp2 = [];

      for (let s_dsInfo of p_result) {
        s_tmp.push(s_dsInfo['DS_ID']);
        s_tmp2.push(s_dsInfo['DS_NM']);
      }
      
      const dialogRef = this.cDialog.open(WpPopupComponent,{
        data: {
          'title': '데이터셋정보 변경',
          'flag': true,
          'service': this.cMainAppSvc,
          'formdata':  [{
            vname:'데이터셋 명',
            name:'DS_VIEW_NM',
            value:'',
            type:'text',
            fvalue:'',
            visible:true,
            edit:true,
            callbak:null
          },
          // WPLAT-361 1번 수정
          // {
          //   vname: '연결 방법',
          //   name: 'CONNECTION',
          //   value: s_tmp,
          //   type: 'select',
          //   fvalue: s_tmp2,
          //   visible: true,
          //   edit: true,
          //   callbak: { name: 'connectSeleted' }
          // }
        ],
          'scroll':true,
          // 'componentData': {
          //   CONNECTION: 1            
          // }
          // 'colWidthOption': 'tight'
        }
      });
  
      dialogRef.afterClosed().subscribe(pRes => {
        if(pRes){
          // validation 추가해야함.
          if(pRes.result){
            let sResult = pRes.data;   
            if (sResult.DS_VIEW_NM == this.oProfileData.DS_VIEW_NM) {
              this.cMainAppSvc.showMsg('현재 데이터셋 명과 동일합니다.',false);
            } else if (sResult.DS_VIEW_NM != '' && sResult.DS_VIEW_NM != undefined) {
              this.cDtProfileSvc.chkDatasetlist(sResult.DS_VIEW_NM).subscribe(pDatasetChkResult => {
                // #113
                if (pDatasetChkResult.result.length != 0) {
                  this.cMainAppSvc.showMsg('이미 존재하는 데이터셋 명입니다. 다시 설정해 주세요.',false);
                } else {
                  this.cWpLibSvc.showProgress(true, 'wdspin');
                  this.cDtProfileSvc.renameDataset(this.oProfileData, sResult.DS_VIEW_NM).subscribe(pRenameRes => {
                    this.cWpLibSvc.showProgress(false, 'wdspin');
                    if (pRenameRes.success) {
                      let param: HistoryItem = {
                        DS_VIEW_ID: this.oProfileData.DS_VIEW_ID,
                        OPERATION: 'rename',
                        PRE_VALUE: this.oProfileData.DS_VIEW_NM,
                        CUR_VALUE: sResult.DS_VIEW_NM,
                      }
                      this.cHistorySvc.insert(param).subscribe(pHisRes => {
                        // this.oDtUploadForm.reset();
                      });
                      this.cMainAppSvc.showMsg('수정되었습니다.',true);
                      this.cDmAppSvc.changeTab('dm-dataset');
                    }
                  });
                }
  
              });
            }
  
          }
        }
        
      });
    });
    
  }
  togglePanel(pEv:any){
    $(pEv.currentTarget).addClass('on').siblings().removeClass('on');
    $(pEv.currentTarget).find('.ico').addClass('active');
    $(pEv.currentTarget).siblings().find('.ico').removeClass('active');
    $('.'+pEv.currentTarget.attributes.rel.value).addClass('on').siblings().removeClass('on');
  }
  onRestatistic(p_ev:any) {
    if(!p_ev) {
      this.h_icon = 'refresh'
      this.h_reStatisticFlag = true;
      let sParam = {
        ds_view_id: this.oProfileData.DS_VIEW_ID,
        view_idx: this.oRecentViewIdx,
        socket_id: this.cWpSocket.getSocketId(),
        userno: this.oProfileData.REG_USER_NO,
        // #13
        // tbl_nm: this.oProfileData.TBL_NM
      }
      if(this.oProfileData.STATUS_CODE == 99) {
        this.cMainAppSvc.showMsg('기존 통계분석에서 오류가 발생한 상태입니다.\n반복해서 에러가 발생할 경우 관리자에게 문의하세요.',true);
      }
      this.cDtProfileSvc.reStatistic(sParam).subscribe(pResult => {
        if (pResult.success) {
          this.cWpLibSvc.showProgress(false, 'wdspin');
        }
      }, error => {
        this.h_reStatisticFlag = false;
        this.h_icon = 'sync_problem';
        throw error;
      });
    } else {
      this.cMainAppSvc.showMsg('현재 통계분석이 진행 중입니다.',true);
    }

  }
  drawColInfo() {
    this.cDtProfileSvc.getColInfo(this.oProfileData).subscribe(pResult => {
      this.h_graphType = ''; 
      if (pResult.success) {
        // #220
        let tmpColInfo:any = [];
        this.oDisplayedColumns.forEach(function (colIdx) {
          //데이터 셋에 statistic 다 되기 전에 키면 statistics 부분이 없어서 오류가 나는듯
          if(Object.keys(pResult.result).includes('statistics')){
            pResult.result.statistics.filter((pVal:any) => {
              if (pVal['column'] === colIdx) {
                tmpColInfo.push(pVal)
              }
            });
          };
        });
        // 이미지 일때
        if(this.oProfileData.TBL_TYPE=='image'){
          // 임시로 false 처리, 저장할 때 status_code 40으로 전환할 것
          this.h_reStatisticBtn = false;
          this.oImageRowCnts['row_count'] = pResult.result['COUNT'];
          
          //이미지만 있을 경우 INVALID 100%로 지정 (라벨이 없으니까)
          this.h_ImageCount = Object.keys(this.oImageRowCnts).length;
          this.h_graphType = 'total';
          this.h_graphRates = {
            valid : 100,
            invalid: 0
          };
          this.h_graphRatesMessage = {
            valid : '이미지 데이터',
          };

          let sManifestKey = Object.keys(pResult.result);

          //이미지값이 있을 경우 라벨 갯수도 같이 넣어줌
          if (sManifestKey.includes('LABEL_COUNT')){
            this.oImageRowCnts['label_count'] = pResult.result['LABEL_COUNT'];
          
          //   this.h_graphRates['valid'] = this.oImageRowCnts.label_count
          //   this.h_graphRates['invalid'] = this.oImageRowCnts.row_count - this.oImageRowCnts.label_count

          //   Object.keys(this.h_graphRates).forEach((pValue:any) => {
          //     this.h_graphRates[pValue] = this.h_graphRates[pValue] / this.oImageRowCnts.row_count *100
          //   });
          }
          if (sManifestKey.includes('PREDICT_COUNT')){
            this.oImageRowCnts['predict_count'] = pResult.result['PREDICT_COUNT'];      
          }
          this.o_settimeId = setTimeout(() => {
            this.h_Warnlist = [];
            this.h_Noticelist = [];
            this.drawMainGraph();
            // this.addChkoutList();
            // this.getCorr();
          }, 200); 
        }
        // 이미지 아닐 때 (정형 데이터 structure 일 때)
        else{
          this.oColInfo = tmpColInfo;
          // #107
          if (!this.h_reStatisticBtn) {
            Object.keys(this.oRowCnts).forEach((pKey)=> {
              if (pKey in pResult.result) {
                  this.oRowCnts[pKey as keyof WP_STATISTIC_DATA] = pResult.result[pKey];
              }
            });
            this.h_graphRates = {      
              valid: this.oRowCnts.cell_count - this.oRowCnts.cell_null_count - this.oRowCnts.cell_outlier_count,
              invalid: this.oRowCnts.cell_outlier_count,
              missing: this.oRowCnts.cell_null_count
            }
            Object.keys(this.h_graphRates).forEach((pValue:any) => {
              this.h_graphRates[pValue] = this.h_graphRates[pValue] / this.oRowCnts.cell_count *100
            });
            this.o_settimeId = setTimeout(() => {
              // this.h_chkoutList = [];
              this.h_Warnlist = [];
              this.h_Noticelist = [];
              this.drawMainGraph();
              this.addChkoutList();
              this.getCorr();
            }, 200);  //mimic API time delay
          }
        }
      } else {
        // 매니페스트 없는 파일
        if(this.oProfileData['STATUS_CODE']==40)
          this.h_reStatisticBtn = true;        
        this.cWpLibSvc.showProgress(false, 'wdspin');
      }
    });
  }
  drawMainGraph(){
    console.log("drawMainGraph")
    let sOpt:any = {
      responsiveAnimationDuration: 1000,
      maintainAspectRatio: false,
      tooltips: {
          enabled: false,
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
    }
    // const tblDoughnutChartCtx:any = document.getElementById('tblDoughnutChart');
    if(this.oDoughnutChart)
      this.oDoughnutChart.destroy();
    // let chartStatus = Chart.getChart("tblDoughnutChart");
    // this.oDoughnutChart.clear();
    this.oDoughnutChart = new Chart(this.tblDoughnutChart.nativeElement, {
        type: 'doughnut',
        data: {
            labels: ['','',''],
            datasets: [{              
                data: Object.values(this.h_graphRates),
                backgroundColor: [
                    '#3751FF',
                    '#FF8080',
                    '#C5C7D2'
                ]
            }]
        },
        options: sOpt
    });
  }
  addChkoutList(){
    let sTmpCnt = {
      numeric: 0,
      categoric: 0,
      text: 0
    };
    for (let sCol of this.oColInfo) {
      if (sCol.datatype == 'categorical') {
        let sUniRate = sCol.distinct_count / sCol.count;
        if (sUniRate == 1) {
          this.h_Noticelist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info14"), type: 'info' });
        } else if (sUniRate >= 0.7 && sCol.distinct_count > 10) {
          // this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info13", {value: 1})`has a high cardinality: ${sCol.distinct_count} distinct values.`, type: 'warn' });
          this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info13", {value: sCol.distinct_count}), type: 'warn' });
        } else if (sCol.distinct_count > 10) {
          this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info13", {value: sCol.distinct_count}), type: 'warn' });
        } else if (sCol.distinct_count == 1) {
          this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info13", {value: 1}), type: 'warn' });
        }
      }
      if (sCol.null_count != 0) {
        if (sCol.null_count == 1) {
          this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info12", {value: 1}), type: 'warn' });
        } else {
          this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info12", {value: sCol.null_count}), type: 'warn' });
        }
      }
      // if (sCol.outlier_count != null) {
      //   if (sCol.outlier_count == 1) {
      //     this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info24", {value: 1}), type: 'warn' });
      //   } else {
      //     this.h_Warnlist.push({ col: sCol.column, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info24", {value: sCol.outlier_count}), type: 'warn' });
      //   }
      // }
      if (sCol.datatype == 'categorical') {
        sTmpCnt.categoric++;
      } else if (sCol.datatype == 'numerical') {
        sTmpCnt.numeric++;
      } else {
        sTmpCnt.text++;
      }
    }
    this.h_typeCnts = sTmpCnt;
  }
  getCorr(){
    let sParams = {
      action: "correlation",
      method: "",
      groupId: "corr",
      jobId: "0",
      userno: this.oProfileData.REG_USER_NO,
      location: "data manager",
      data: {
        usetable: this.oUsetable,
        page: "1",
        filename: this.oProfileData.DS_VIEW_ID,
        filetype: this.oProfileData.DS_FILE_FORMAT,
        fileseq: ",",
        index: this.oRecentViewIdx,
        dataUserno: this.oProfileData.REG_USER_NO,
        update: this.oProfileData.UPDATE_YN,
        APP_SVC_IP : this.oProfileData.APP_SVC_IP,
        APP_SVC_PORT : this.oProfileData.APP_SVC_PORT
      }
    };
    this.cMetaSvc.getCorr(sParams).subscribe(response => {
      // let sCorr = JSON.parse(response).data;
      // // column별 corr값
      // let sTmpCorrList:any = {};
      // // tooltip msg
      // let sTooltipArr:any = {};
      // for (let idx in sCorr) {
      //   sCorr[idx] = JSON.parse(sCorr[idx]);
      //   if (!Object.keys(sTmpCorrList).includes(sCorr[idx].item_from))
      //     sTmpCorrList[sCorr[idx].item_from] = [];
      //   if (Math.abs(sCorr[idx].Correlation) > 0.6 && Math.abs(sCorr[idx].Correlation) != 1)
      //     sTmpCorrList[sCorr[idx].item_from].push(sCorr[idx].item_to)
      // }
      // 책임님 코드 나중에 원복
      if(JSON.parse(response).data[0]){
        let sCorr = JSON.parse(JSON.parse(response).data[0]);
        console.log("sCorr : ", sCorr);
        let sTooltipArr:any = {};
        let sTmpCorrList :{ [key: string]: any } = {};
  
        for (let i = 0; i < sCorr['data'].length; i++){
          for (let j = 0; j < sCorr['data'][i].length; j++){
            if(Math.abs(sCorr['data'][i][j]) > 0.2 && Math.abs(sCorr['data'][i][j]) != 1)
              if (Array.isArray(sTmpCorrList[sCorr['columns'][i]])) {
                sTmpCorrList[sCorr['columns'][i]].push(sCorr['index'][j]);
              } else {
                sTmpCorrList[sCorr['columns'][i]] = [sCorr['index'][j]];
              }
          }
        }
  
  
        this.oHighCorrColmn = sTmpCorrList;
        for (let idx in sTmpCorrList) {
          let sTmpIdx = sTmpCorrList[idx];
          if (sTmpIdx.length == 1) {
            this.h_Noticelist.push({ col: idx, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info15", {value: sTmpIdx[0]}), type: 'info' });
          } else if (sTmpIdx.length > 1) {
            this.h_Noticelist.push({ col: idx, msg: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info16", {value: sTmpIdx[0]}), type: 'info', tooltip: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info17", {value: sTmpIdx.length - 1}) });
            let sMsg = sTmpIdx.slice(1).join(', ');
            sTooltipArr[idx] = sMsg;
            // sTooltipArr.push({ col: idx, msg: sMsg });
          }
        }
        this.h_TooltipMsgArr =  sTooltipArr;

      }
      // setTimeout(() => {
      //   for (let idx in sTooltipArr) {
      //     if($(`.${sTooltipArr[idx].col}_tooltip`).length!=0){
      //       $(`.${sTooltipArr[idx].col}_tooltip`)[0].addEventListener("mouseenter", (e:any) => {
      //         this.toggleTooltip($(`.${sTooltipArr[idx].col}_tooltip`)[0], sTooltipArr[idx].msg, true);
      //       });
      //       $(`.${sTooltipArr[idx].col}_tooltip`)[0].addEventListener("mouseleave", (e:any) => {
      //         this.toggleTooltip($(`.${sTooltipArr[idx].col}_tooltip`)[0], sTooltipArr[idx].msg, false);
      //       });
      //     }
      //   }
      // }, 500);
    });
  }
  // toggleTooltip(pTarget:any, pMsg:any, pFlag:any) {
  //   this.h_tooltipVisible = pFlag;
  //   this.oTooltip.target = pTarget;
  //   this.oTooltip.contentTemplate = pMsg;
  // }
  nextData(pEvent:any) {// #64
    if (pEvent.name == this.oVirtualOption.name) {
      // sjh 수정

      let s_param = {
        action: "page",
        method: "",
        groupId: "page",
        jobId: "1",
        location: "data manager",
        data: {
          usetable: this.oProfileData.DS_VIEW_ID,
          page: pEvent.pageNum,
          filename: this.oProfileData.DS_VIEW_ID,
          filetype: this.oProfileData.DS_FILE_FORMAT,
          fileseq: ",",
          index: this.oRecentViewIdx,
          dataUserno: this.oProfileData.REG_USER_NO,
          update: this.oProfileData.UPDATE_YN,
          dataType: this.oProfileData.TBL_TYPE
  
        }
      }
      // 맨 밑까지 내리면 오류 로그 떠서 수정
      this.cMetaSvc.getPageData(s_param).subscribe(pagedResults => {
        try{
          let sData = JSON.parse(pagedResults).data;
          for (let idx in JSON.parse(pagedResults).data) {
            sData[idx] = JSON.parse(JSON.parse(pagedResults).data[idx]);
          }
          this.oSelectData = this.oSelectData.concat(sData);
        }
        catch{
          console.log('end of data')
        }
      });
    }
  }
  setViewIdx() {
    let sViewIdx = this.oProfileData.VIEW_IDX;
    if (this.oProfileData.STATUS_CODE != 40) {
      this.h_reStatisticBtn = true;
      if (this.oProfileData.STATUS_CODE == 20) {
        this.h_reStatisticFlag = true;
      }
      if (this.oProfileData.STATUS_CODE == 99) {
        this.h_icon = 'sync_problem';
      }
      if (this.oProfileData.VIEW_IDX) {
        // sViewIdx = Number(sViewIdx) + 1;
        sViewIdx = Number(sViewIdx);
      } else {
        sViewIdx = 0;
      }
    } else {
      this.h_reStatisticBtn = false;
    }
    this.oRecentViewIdx = sViewIdx;
  }
  // 페이징 시작 번호 초기화
  resetPageIdx(){
    this.oCurrPageNum = 0;
  }

  getProfileData(pInit = true) {
    // sjh 수정
    // 기존 로직: 스키마 call -> page call (2번 호출)
    // 변경 로직: page(1페이지) call 하면서 스키마까지 하도록 함. (1번 호출)
    // workflow 최종데이터 view테이블을 유저번호_파일번호로 하도록함.
    // 그래서 그걸 바로 사용.
    // 만약 유저번호_파일번호 테이블이 없을 경우 새로 데이터를 load하여
    // 유저번호_파일번호 테이블을 만든 후에 페이징 실행됨.
    let sLoad = 'hdfs';
    // 처음 불러올때, 현재 데이터셋의 마지막 인덱스 설정
    let sDsViewId = this.oProfileData.DS_VIEW_ID
    if (pInit){
      this.setViewIdx();
    }
    // 아닐 경우, 선택한 데이터셋의 인덱스를 설정
    else {
      this.oProfileData.VIEW_IDX = this.oRecentViewIdx;
      sDsViewId = this.oProfileData.DS_VIEW_ID+'_'+this.oRecentViewIdx
    }

    let s_param = {
      action: "page",
      method: "",
      groupId: "page",
      jobId: "1",
      location: "data manager",
      data: {
        usetable: sDsViewId,
        page: "1",
        filename: this.oProfileData.DS_VIEW_ID,
        filetype: this.oProfileData.DS_FILE_FORMAT,
        fileseq: ",",
        index: this.oRecentViewIdx,
        dataUserno: this.oProfileData.REG_USER_NO,
        update: this.oProfileData.UPDATE_YN,
        APP_SVC_IP : this.oProfileData.APP_SVC_IP,
        APP_SVC_PORT : this.oProfileData.APP_SVC_PORT,
        dataType: this.oProfileData.TBL_TYPE
      }
    }
    this.cWpLibSvc.showProgress(true, 'wdspin');

    this.cMetaSvc.getPageData(s_param).subscribe(pagedResults => {
        this.oProfileData.UPDATE_YN = 'N';
        let sSchema = JSON.parse(pagedResults).schema;
        // #79. viewname을 저장. page처리에서 사용하기 위해.
        this.oUsetable = this.oProfileData.REG_USER_NO + "_" + this.oProfileData.DS_VIEW_ID;
        let sTmpDisplayCols: any = [];
        let sTmpDisplayGraghCols: any = [];
        for (let idx in sSchema) {
          sTmpDisplayCols.push(sSchema[idx].name);
          sTmpDisplayGraghCols.push(sSchema[idx].name + "_graph");
        }
        console.log('================================');
        let sData = JSON.parse(pagedResults).data;
        for (let idx in JSON.parse(pagedResults).data) {
          sData[idx] = JSON.parse(JSON.parse(pagedResults).data[idx]);
        }

        this.oSchema = sSchema;
        this.oDisplayedColumns = sTmpDisplayCols;
        this.oDisplayedGraphColumns = sTmpDisplayGraghCols;
        this.oSelectData = sData;

        // #1 #13 최신 데이터가 통계분석 성공했을때만
        if (this.oProfileData.VIEW_IDX == this.oRecentViewIdx)
          this.drawColInfo();
        // else
        this.cWpLibSvc.showProgress(false, 'wdspin');
      
    }, error => {
      this.cWpLibSvc.showProgress(false, 'wdspin');
      this.cDmAppSvc.changeTab('dm-dataset');
      throw error;
    });
    // 데이터셋 목록에서 데이터셋을 선택했을 때 만 히스토리랑 워크플로우 리스트 가져옴
    if (pInit){
      this.cDtProfileSvc.getPipelist(this.oProfileData).subscribe(pResult => {
        if (pResult.success) {
          this.h_Pipelist = pResult.result
        }
      });
      // #126
      this.cHistorySvc.select({ column: [], viewId: this.oProfileData.DS_VIEW_ID }).subscribe(pResult => {
        if (pResult.success) {
          for (let idx in pResult.result) {
            // #210 schedule를 제외한 history 모두 표시
            if (pResult.result[idx]['OPERATION'] == 'create') {
              pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info21");
              pResult.result[idx]['VALUE'] = pResult.result[idx].CUR_VALUE;
            } else if (pResult.result[idx]['OPERATION'] == 'overwrite') {
              pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_COMMON.INFO.info8");
              pResult.result[idx]['VALUE'] = "버전 : " + pResult.result[idx].CUR_VALUE.split('_')[1];
            } else if (pResult.result[idx]['OPERATION'] == 'download') {
              pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_COMMON.INFO.info9");
              pResult.result[idx]['VALUE'] = '';
            } else if (pResult.result[idx]['OPERATION'] == 'rename') {
              pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info22");
              pResult.result[idx]['VALUE'] = pResult.result[idx].CUR_VALUE;
            } else if (pResult.result[idx]['OPERATION'] == 'schema') {
              pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info23");
              // pResult.result[idx]['VALUE'] = `(${pResult.result[idx].HISTORY_DESC})`;
            }
            this.h_Historylist.push(pResult.result[idx]);
          }
          // #28 히스토리에서 스케줄관련 로그 가져오기
          this.cHistorySvc.selectSchlog({ column: [], viewId: this.oProfileData.DS_VIEW_ID }).subscribe(pResult => {
            if (pResult.success) {
              for (let idx in pResult.result) {
                if (pResult.result[idx]['OPERATION'] == 'create') {
                  pResult.result[idx]['CAPTION'] = this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.INFO.info21");
                  pResult.result[idx]['VALUE'] = pResult.result[idx].CUR_VALUE;
                } else if (pResult.result[idx]['OPERATION'] == 'edit') {
                  pResult.result[idx]['CAPTION'] = '스케줄러 변경';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                } else if (pResult.result[idx]['OPERATION'] == 'start') {
                  pResult.result[idx]['CAPTION'] = '스케줄러 시작';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                } else if (pResult.result[idx]['OPERATION'] == 'pause') {
                  pResult.result[idx]['CAPTION'] = '스케줄러 정지';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                } else if (pResult.result[idx]['OPERATION'] == 'finish') {
                  pResult.result[idx]['CAPTION'] = '스케줄러 종료';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                } else if (pResult.result[idx]['OPERATION'] == 'delete') {
                  pResult.result[idx]['CAPTION'] = '스케줄러 삭제';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                } else if (pResult.result[idx]['OPERATION'] == 'overwrite') {
                  pResult.result[idx]['CAPTION'] = '작업 완료';
                  pResult.result[idx]['VALUE'] = pResult.result[idx].SCH_NM;
                }
                this.h_Loglist.push(pResult.result[idx]);
              }
            }
          });
        }
      });
    }
  }
  async onLoadWorkFlow(pWfId:any, pType:any) {
    if (pType == 'workflow') {
      await this.cWpDiagramSvc.loadWorkFlowPopup({ wfId: pWfId }, 'wkId');
    //
    } else if (pType == 'output' && (pWfId.OPERATION == 'overwrite' || pWfId.OPERATION == 'create')) {
      if (pType == 'output' && this.oRecentViewIdx != pWfId.CUR_VALUE.split('_')[1]){
        if (pWfId.OPERATION == 'create'){
          this.oRecentViewIdx = 0
        }
        else {
          this.oRecentViewIdx = pWfId.CUR_VALUE.split('_')[1]
        }
        this.oColInfo = []
        this.resetPageIdx();
        this.getProfileData(false);
        this.oWpLibDataViewer.scrollToTop();
      }
      else{
        await this.cWpDiagramSvc.loadWorkFlowPopup({ viewId: pWfId.CUR_VALUE.split('_')[0], viewIdx: pWfId.CUR_VALUE.split('_')[1] }, 'viewId');
      }
    } else {
      console.log("nope");
    }
  }
  clickEvent(pType : string){
    if (this.h_graphType != pType){
      this.h_graphType = pType
      if (pType == 'total'){
        this.h_graphRates = {
          valid : 100,
        }
        this.h_graphRatesMessage = {
          valid : '이미지 데이터',
        }
      }
      else if(pType == 'label'){
        this.h_graphRates['valid'] = this.oImageRowCnts.label_count
        this.h_graphRates['invalid'] = this.oImageRowCnts.row_count - this.oImageRowCnts.label_count
        this.h_graphRatesMessage = {
          valid : '라벨 적용',
          invalid : '라벨 미적용'
        }
        Object.keys(this.h_graphRates).forEach((pValue:any) => {
          this.h_graphRates[pValue] = this.h_graphRates[pValue] / this.oImageRowCnts.row_count *100
        });
      }
      else if(pType == 'predict'){
        this.h_graphRates['valid'] = this.oImageRowCnts.predict_count
        this.h_graphRates['invalid'] = this.oImageRowCnts.row_count - this.oImageRowCnts.predict_count
        this.h_graphRatesMessage = {
          valid : '예측 성공',
          invalid : '예측 실패'
        }
        Object.keys(this.h_graphRates).forEach((pValue:any) => {
          this.h_graphRates[pValue] = this.h_graphRates[pValue] / this.oImageRowCnts.row_count *100
        });
      }
      this.drawMainGraph();
    }
  }
}
