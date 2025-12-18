import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { ScheduleService } from './volttron.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { MainAppService } from 'projects/main/src/app/app.service';
// @ts-ignore
import * as schFormat from "assets/resource/json/sch_format.json";
import { VolttronSchedulePopupComponent } from './log-popup/volttron-log-popup.component';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { Subscription } from 'rxjs';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
@Component({
  selector: 'dm-volttron',
  templateUrl: './volttron.component.html',
  styleUrls: ['./volttron.component.css']
})


export class VolttronComponent implements OnInit {
  o_gridData: any;
  o_schNmList: any[] = [];
  o_displayColNms: string[] = [
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid1"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid2"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid3"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid4"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid5"),  
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid10"),  
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid9")];
  o_displayCols: string[] = ['SCH_NM', 'WF_NM', 'SCH_STATUS','USE_CORE', 'USE_MEMORY', 'ANALYTIC_RESULT','REG_DT'];
  o_gridCol: any;
  o_gridRowEvt = true;
  o_gridHeader = { btnNmList: [this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button2")], 
    filterCol: ['SCH_NM'] };

  o_ScheduleForm: any[];
  o_realtimeForm: any[];

  o_schFormat: any = {};
  oWpPopData: any = {};

  o_hoverEffect = true;
  o_rowEvt = true;
  o_workflowList: any = {
    VALUE: [],
    FVALUE: []
  }
  o_apiType = 'SPARK';
  o_socketSubscribe: Subscription;
  o_lang = this.cTransSvc.currentLang;
  o_volttronUse = false;
  constructor(public cDialog: MatDialog,
    private cWpSocket: WpSocket,
    private cSchSvc: ScheduleService,
    private cMainAppSvc: MainAppService,
    private cWpLibSvc: WpLoadingService,
    private cWpAppConfig: WpAppConfig,
  private cTransSvc: TranslateService) { }

  ngOnInit() {
    // COMMON일 경우에는 CORE 관련내용 빼야함.
    this.o_apiType = this.cWpAppConfig.getConfig('API_TYPE');
    this.o_volttronUse = this.cWpAppConfig.getConfig('VOLTTRON')['use'];

    // if(this.o_volttronUse == true) {
    //   this.o_gridHeader.btnNmList.push(this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button2"))
    // }

    if(this.o_apiType == 'COMMON') {
      this.o_displayColNms = this.o_displayColNms.filter((element) => !['사용 코어 수', '사용 메모리 (MB)'].includes(element));
      this.o_displayCols = this.o_displayCols.filter((element) => !['USE_CORE', 'USE_MEMORY'].includes(element));
    }
    // 소켓
    this.o_socketSubscribe = this.cWpSocket.statusCron().subscribe((p_message: any) => {
      this.o_gridData.filter((p_val: any) => {
        if (p_val['SCH_ID'] === p_message['SCH_ID']) {
          if (p_message['SCH_STATUS'] == 'REALVOLTTRON_20') {
            p_val.SCH_FUNC[0] = 'last';
          };
          if (p_message['SCH_STATUS'] == 'REALVOLTTRON_30') {
            p_val.SCH_FUNC[0] = 'play';
          };
          p_val['SCH_STATUS'] = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.${p_message['SCH_STATUS']}`);
        };
      });
    });

    this.o_schFormat = schFormat['default'];
    this.drawWkList();
  }

  ngOnDestroy(): void {    
    this.o_socketSubscribe.unsubscribe();
  }
  // 현재 스케줄리스트 불러오기
  drawWkList() {
    this.cSchSvc.getVolttronList().subscribe(
      pSchResult => {
        this.o_gridData = pSchResult['result'].filter((item: any) => item['REALTIME_INFO']);
        // #28. JSON_DS_VIEW_NM에 INPUT_DATA, OUTPUT_DATA 파라미터로 JSON만듬(UI에서 보여주기 위해)
        
        if(this.o_gridData.length != 0){
          for (var i in this.o_gridData) {
            if (JSON.parse(this.o_gridData[i]['INPUT_DATA']) != null) {
              this.o_gridData[i]['INPUT_DATA'] = JSON.parse(this.o_gridData[i]['INPUT_DATA']).toString().replace(/,/g, "\n")
            }
            if (JSON.parse(this.o_gridData[i]['OUTPUT_DATA']) != null) {
              this.o_gridData[i]['OUTPUT_DATA'] = JSON.parse(this.o_gridData[i]['OUTPUT_DATA']).toString().replace(/,/g, "\n")
            }
            
            if (this.o_gridData[i]['SCH_STATUS'] == 'REALVOLTTRON_20') {
              this.o_gridData[i].SCH_FUNC = ['last', 'modify', 'trash'];
            } else {
              this.o_gridData[i].SCH_FUNC = ['play', 'modify', 'trash'];
            }
            if(this.o_gridData[i]['REALTIME_INFO'] != null) {
              this.o_gridData[i].SCH_FUNC =  this.o_gridData[i].SCH_FUNC.filter((item:any) => item !== 'modify');
            }
            try {
              this.o_gridData[i]['CRON_INFO'] = cronstrue.toString(this.o_gridData[i]['CRON_PARAM'], {locale:this.o_lang});
            } catch(e) {
              
            }
            this.o_gridData[i]['SCH_STATUS'] = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.${this.o_gridData[i]['SCH_STATUS']}`)
          }

          let s_gridCol = [];
          for (var s_col of Object.keys(this.o_gridData[0])) {
            let s_index = this.o_displayCols.findIndex(p_val => p_val === s_col);
            if (s_index == -1) {
              s_gridCol.push({
                'NAME': s_col,
                'VISIBLE': false,
                'VNAME': s_col,
                'TYPE': 'string'
              });
            } else {
              s_gridCol.push({
                'NAME': s_col,
                'VISIBLE': true,
                'VNAME': this.o_displayColNms[s_index],
                'TYPE': 'string'
              });
            }
          }

          s_gridCol.push({
            'NAME': 'SCH_FUNC',
            'VISIBLE': true,
            'VNAME': '',
            'TYPE': 'array'
          });

          this.o_gridCol = s_gridCol;
        }
        this.cWpLibSvc.showProgress(false, 'wdspin');
      },
      error => {
        this.cWpLibSvc.showProgress(false, 'wdspin');
        throw error;
      }
    )
  }

  onGridCallback(p_ev: any) {
    if (p_ev.eventNm == 'play') {
      this.playSch(p_ev);
    } else if (p_ev.eventNm == 'last') {
      this.pauseSch(p_ev);
    } else if (p_ev.eventNm == 'trash') {
      this.delSch(p_ev.element);
    } else if (p_ev.eventNm == 'rowClick') {
      this.openLog(p_ev.element);
    } else if (p_ev.eventNm == this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button2")) {
      this.addRealtimeSch();
    } 
  }


  playSch(p_ev: any) {
    let p_item = p_ev.element;
    p_item['volttron'] = true;
    let p_msg = "";
    // 일반 배치 실행
    // 종료날짜가 현재날짜보다 작을 경우.
    // let s_groupId = Math.random().toString(32);    
    // p_item['REALTIME_INFO'] = `{\"groupId\":\"${s_groupId}\",\"jobId\":[]}`
    this.cSchSvc.runCron(p_item).pipe()
      .subscribe(
        pResult => {
          p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.REALVOLTTRON_20`);
          p_ev.element.SCH_FUNC[0] = 'last';
          p_msg = `'${p_item.SCH_NM}'가 정상적으로 시작되었습니다.`;
          this.cMainAppSvc.showMsg(p_msg, true);
        },
        error => {
          this.cWpLibSvc.showProgress(false, "wdspin");
          throw error;
        })
  }

  pauseSch(p_ev: any) {
    let p_item = p_ev.element;
    p_item['volttron'] = true;
    this.cSchSvc.pauseCron(p_item).pipe()
      .subscribe(
        pResult => {
          p_ev.element.SCH_FUNC[0] = 'play';
          p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.REALVOLTTRON_30`);
          this.cMainAppSvc.showMsg(`'${p_item.SCH_NM}'가 정상적으로 중지되었습니다.`, true);
        },
        error => {
          this.cWpLibSvc.showProgress(error, "wdspin");
          throw error;
        })

  }
  openLog(p_item: any) {
    this.cWpLibSvc.showProgress(true, "wdspin");
    const dialogRef = this.cDialog.open(VolttronSchedulePopupComponent, {
      panelClass: 'log-popup-dialog',
      data: {
        title: `${p_item.SCH_NM} ${this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup12")}`,
        sch_id: p_item.SCH_ID,
        sch_nm: p_item.SCH_NM
      }
    });
  }
  delSch(p_item: any) {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': '알림',
        'flag': true,
        'service': this.cMainAppSvc,
        'message': `${p_item.SCH_NM}을 삭제하시겠습니까?`,
        'colWidthOption': 'tight'
      }
    });
    dialogRef.afterClosed().subscribe(pRes => {
      if(pRes){      
        if (pRes.result) {
          this.cWpLibSvc.showProgress(true, "wdspin");
          // cron에서 먼저 제거.
          this.cSchSvc.deleteCron(p_item).pipe()
            .subscribe(
              pResult => {
                if (this.cWpAppConfig.getConfig('API_TYPE') == 'SPARK') {
                  var s_executeJobParam:any = {
                    "groupId": `${p_item['SCH_ID']}SCHEDULE`,
                    "jobId": 0,
                    "viewname": `${p_item['REG_USER_NO']}_${p_item['SCH_ID']}SCHEDULE_0`
                  }
                  if (p_item['SCH_STATUS'].includes('실시간')){
                    s_executeJobParam['realtime'] = true;
                    let s_realtimeInfo = JSON.parse(p_item['REALTIME_INFO']);
                    s_executeJobParam['jobId'] = s_realtimeInfo['jobId'];
                    s_executeJobParam['groupId'] = s_realtimeInfo['groupId'];
                  }
                  
                  this.cSchSvc.cancelSparkJob(s_executeJobParam).subscribe(
                    pCancelResult => {
                      const message = `${p_item.SCH_NM}가 삭제되었습니다.`;
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      this.cMainAppSvc.showMsg(message, true);
                      this.drawWkList();
                    },
                    error => {
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      throw error;
                    }
                  );
                } else {
                  const message = `${p_item.SCH_NM}가 삭제되었습니다.`;
                  this.cWpLibSvc.showProgress(false, "wdspin");
                  this.cMainAppSvc.showMsg(message, true);
                  this.drawWkList();
                }
                
              },
              error => {
                this.cWpLibSvc.showProgress(false, "wdspin");
      
                throw error;
              })
        }
      }
    });

  }


  addSch() {
    // 초기화
    this.o_schNmList = [];
    this.o_workflowList['FVALUE'] = [];
    this.o_workflowList['VALUE'] = [];
    // popup 데이터 초기화

    //스케줄리스트의 스케줄명을 array로 만듬. 스케줄이름 validate 위해
    this.cSchSvc.getSchNmList().subscribe(pSchResult => {
      for (var sch of pSchResult['result']) {
        this.o_schNmList.push(sch['SCH_NM']);
      }
      // 워크플로우 목록
      this.cSchSvc.getWkNmList().subscribe(pWfList => {

        for (var wf of pWfList['result']) {
          this.o_workflowList['VALUE'].push(wf['WF_ID']);
          this.o_workflowList['FVALUE'].push(wf['WF_NM']);
        }
    
        this.o_workflowList['VALUE']
     
        const dialogRef = this.cDialog.open(WpPopupComponent, {
          data: this.oWpPopData
        });

        dialogRef.afterClosed().subscribe(pRes => {
          if(pRes){
            // validation 추가해야함.
            if (pRes.result) {
              this.cWpLibSvc.showProgress(true, "wdspin");
              let s_item = pRes.data;
              s_item['CRON_PARAM'] = `${s_item['SET_MINUTE']} ${s_item['SET_HOUR']} ${s_item['SET_DAY']} ${s_item['SET_MONTH']} ${s_item['SET_WEEK']}`
              // s_item['CRON_PARAM'] = `${s_item['SET_SECOND']} ${s_item['SET_MINUTE']} ${s_item['SET_HOUR']} ${s_item['SET_DAY']} ${s_item['SET_MONTH']} ${s_item['SET_WEEK']}` // WPLAT-412 초 단위 추가 위의 s_item['CRON_PARAM'] 대신 이걸로 사용
              this.cSchSvc.insertCron(s_item).pipe()
                .subscribe(
                  pResult => {
                    this.drawWkList();
                    this.cWpLibSvc.showProgress(false, "wdspin");
                    this.cMainAppSvc.showMsg(`스케줄 '${pRes.data.SCH_NM}'이 추가되었습니다.`, true);

                  },
                  error => {
                    this.cWpLibSvc.showProgress(false, "wdspin");
                    throw error;
                  })
            }
          }
        });
      })
    });

  }
  addRealtimeSch() {
    this.o_schNmList = [];
    this.o_workflowList['FVALUE'] = [];
    this.o_workflowList['VALUE'] = [];
    //스케줄리스트의 스케줄명을 array로 만듬. 스케줄이름 validate 위해
    this.cSchSvc.getVolttronList().subscribe(pSchResult => {
      for (var sch of pSchResult['result']) {
        this.o_schNmList.push(sch['SCH_NM']);
      }
      this.cSchSvc.getWkNmList(true).subscribe(pWfList => {
        for (var wf of pWfList['result']) {
          this.o_workflowList['VALUE'].push(wf['WF_ID']);
          this.o_workflowList['FVALUE'].push(wf['WF_NM']);
        }
        this.o_realtimeForm = [{
          vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup2"),
          name: 'SCH_NM',
          value: '',
          type: 'text',
          fvalue: this.o_schNmList,
          visible: true,
          edit: true,
          callbak: null,
          default: this.o_schNmList
        }, {
          vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup3"),
          name: 'WF_ID',
          value: this.o_workflowList['VALUE'],
          type: 'select',
          fvalue: this.o_workflowList['FVALUE'],
          visible: true,
          edit: true,
          callbak: null
        }];

        this.oWpPopData = {
          'title': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button2"),
          'flag': true,
          'type': 'schedule',
          'formdata': this.o_realtimeForm,
          'componentData': {
            WF_ID: ""
          }
        }

        const dialogRef = this.cDialog.open(WpPopupComponent, {
          data: this.oWpPopData
        });

        dialogRef.afterClosed().subscribe(pRes => {
          if (pRes && pRes.result) {
            this.cWpLibSvc.showProgress(true, "wdspin");
            let s_item = pRes.data;
            s_item['realtime'] = true;
            s_item['volttron'] = true;

            this.cSchSvc.insertCron(s_item).pipe()
              .subscribe(
                pResult => {
                  this.drawWkList();
                  this.cWpLibSvc.showProgress(false, "wdspin");
                  this.cMainAppSvc.showMsg(`스케줄 '${pRes.data.SCH_NM}'이 추가되었습니다.`, true);
                },
                error => {
                  this.cWpLibSvc.showProgress(false, "wdspin");
                  throw error;
                })
          }
        });

      })

    });



  }


}