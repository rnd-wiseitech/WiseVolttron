import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { ScheduleService } from './volttron.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { MainAppService } from 'projects/main/src/app/app.service';
// @ts-ignore
import * as schFormat from "assets/resource/json/sch_format.json";
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
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid6"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid7"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid8"), 
    this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.GRID.grid9")];
  o_displayCols: string[] = ['SCH_NM', 'WF_NM', 'SCH_STATUS','USE_CORE', 'USE_MEMORY', 'ST_DT', 'ED_DT', 'CRON_INFO', 'REG_DT'];
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
          if (p_message['SCH_STATUS'] == 'BATCH_20' || p_message['SCH_STATUS'] == 'REALTIME_20') {
            p_val.SCH_FUNC[0] = 'last';
          };
          if (p_message['SCH_STATUS'] == 'BATCH_40' || p_message['SCH_STATUS'] == 'REALTIME_30') {
            p_val.SCH_FUNC[0] = 'play';
          };
          p_val['SCH_STATUS'] = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.${p_message['SCH_STATUS']}`);
        };
      });
    });

    this.cWpLibSvc.showProgress(true, 'wdspin');
    this.o_schFormat = schFormat['default'];
    // this.drawWkList();
  }

  ngOnDestroy(): void {    
    this.o_socketSubscribe.unsubscribe();
  }
  // 현재 스케줄리스트 불러오기
  drawWkList() {
    this.cSchSvc.getSchList().subscribe(
      pSchResult => {
        this.o_gridData = pSchResult['result'];
        // #28. JSON_DS_VIEW_NM에 INPUT_DATA, OUTPUT_DATA 파라미터로 JSON만듬(UI에서 보여주기 위해)
        
        if(this.o_gridData.length != 0){
          for (var i in this.o_gridData) {
            if (JSON.parse(this.o_gridData[i]['INPUT_DATA']) != null) {
              this.o_gridData[i]['INPUT_DATA'] = JSON.parse(this.o_gridData[i]['INPUT_DATA']).toString().replace(/,/g, "\n")
            }
            if (JSON.parse(this.o_gridData[i]['OUTPUT_DATA']) != null) {
              this.o_gridData[i]['OUTPUT_DATA'] = JSON.parse(this.o_gridData[i]['OUTPUT_DATA']).toString().replace(/,/g, "\n")
            }
            
            if (this.o_gridData[i]['SCH_STATUS'] == 'BATCH_20' || this.o_gridData[i]['SCH_STATUS'] == 'REALTIME_20') {
              this.o_gridData[i].SCH_FUNC = ['last', 'modify', 'trash'];
            } else {
              this.o_gridData[i].SCH_FUNC = ['play', 'modify', 'trash'];
            }
            if(this.o_gridData[i]['REALTIME_INFO'] != null) {
              console.log('실시간~~~');
              this.o_gridData[i].SCH_FUNC =  this.o_gridData[i].SCH_FUNC.filter((item:any) => item !== 'modify');
            }
            // let test = cronstrue.toString(this.o_gridData[i]['CRON_PARAM'], {locale:this.o_lang});
            // console.log("test : ", test);
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
    } else if (p_ev.eventNm == this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button1")) {
      this.addSch();
    } else if (p_ev.eventNm == this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.BUTTON.button2")) {
      this.addRealtimeSch();
    } else if (p_ev.eventNm == 'modify') {
      this.modifySch(p_ev);
    }
  }


  playSch(p_ev: any) {
    console.log('p_ev : ', p_ev);
    let p_item = p_ev.element;
    let p_msg = "";
    // 일반 배치 실행
    // 종료날짜가 현재날짜보다 작을 경우.
    if ((new Date(p_item.ED_DT) < new Date()) && !p_item.REALTIME_INFO) {
      p_msg = `'${p_item.SCH_NM}'의 종료날짜가 현재 시간보다 작습니다. 종료날짜를 수정해주세요.`;
      this.cMainAppSvc.showMsg(p_msg, false);
    } else {
      this.cSchSvc.runCron(p_item).pipe()
        .subscribe(
          pResult => {
            // this.drawWkList();
            if (!p_item.REALTIME_INFO) 
              p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.BATCH_20`);
            else 
              p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.REALTIME_20`);
            p_ev.element.SCH_FUNC[0] = 'last';
            p_msg = `'${p_item.SCH_NM}'가 정상적으로 시작되었습니다.`;
            this.cMainAppSvc.showMsg(p_msg, true);
          },
          error => {
            this.cWpLibSvc.showProgress(false, "wdspin");
            throw error;
          })

    }

  }

  pauseSch(p_ev: any) {
    let p_item = p_ev.element;
    this.cSchSvc.pauseCron(p_item).pipe()
      .subscribe(
        pResult => {
          p_ev.element.SCH_FUNC[0] = 'play';
          if (!p_item.REALTIME_INFO) 
            p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.BATCH_30`);
          else 
            p_item.SCH_STATUS = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.REALTIME_30`);
          this.cMainAppSvc.showMsg(`'${p_item.SCH_NM}'가 정상적으로 중지되었습니다.`, true);
        },
        error => {
          this.cWpLibSvc.showProgress(error, "wdspin");
          throw error;
        })

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
                  // 그다음 돌아가고있는 spark job 제거
                  // spark cancel  파라미터
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

  resetFormData(p_item: any, p_type: string) {
    // COMMON일 경우 리소스 설정 안보이게
    let s_resource = true;
    if(this.o_apiType == 'COMMON') {
      s_resource = false;
    };

    this.o_ScheduleForm = [{
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
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup4"),
      name: 'ST_DT',
      value: '',
      type: 'date',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup5"),
      name: 'ED_DT',
      value: '',
      type: 'date',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup6"),
      name: 'SET_CRON',
      value: 'true',
      type: 'array',
      // { // WPLAT-412 초 단위 추가, 초 단위 쓰면 밑에 SET_~~ 변수들 1 씩 추가해줄 것
      //   vname: '매초',
      //   name: 'SET_SECOND',
      //   value: this.o_schFormat['SECOND']['VALUE'],
      //   type: 'select',
      //   fvalue: this.o_schFormat['SECOND']['FVALUE']['ko'],
      //   visible: true,
      //   edit: true,
      //   callbak: null
      // },
      array: [{
        vname: this.o_schFormat['MINUTE']['FVALUE'][this.o_lang][0],
        name: 'SET_MINUTE',
        value: this.o_schFormat['MINUTE']['VALUE'],
        type: 'select',
        fvalue: this.o_schFormat['MINUTE']['FVALUE'][this.o_lang],
        visible: true,
        edit: true,
        callbak: null
      }, {
        vname: this.o_schFormat['HOUR']['FVALUE'][this.o_lang][0],
        name: 'SET_HOUR',
        value: this.o_schFormat['HOUR']['VALUE'],
        type: 'select',
        fvalue: this.o_schFormat['HOUR']['FVALUE'][this.o_lang],
        visible: true,
        edit: true,
        callbak: null
      }, {
        vname: this.o_schFormat['DAY']['FVALUE'][this.o_lang][0],
        name: 'SET_DAY',
        value: this.o_schFormat['DAY']['VALUE'],
        type: 'select',
        fvalue: this.o_schFormat['DAY']['FVALUE'][this.o_lang],
        visible: true,
        edit: true,
        callbak: null
      }, {
        vname: this.o_schFormat['MONTH']['FVALUE'][this.o_lang][0],
        name: 'SET_MONTH',
        value: this.o_schFormat['MONTH']['VALUE'],
        type: 'select',
        fvalue: this.o_schFormat['MONTH']['FVALUE'][this.o_lang],
        visible: true,
        edit: true,
        callbak: null
      }, {
        vname: this.o_schFormat['WEEK']['FVALUE'][this.o_lang][0],
        name: 'SET_WEEK',
        value: this.o_schFormat['WEEK']['VALUE'],
        type: 'select',
        fvalue: this.o_schFormat['WEEK']['FVALUE'][this.o_lang],
        visible: true,
        edit: true,
        callbak: null
      }],
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup7"),
      name: 'CRON_INFO',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup8", {value1:1, value2: 4}),
      name: 'USE_CORE',
      value: '',
      type: 'text',
      fvalue: '',
      visible: s_resource,
      edit: s_resource,
      callbak: null,
      default: [1, 4]
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup9", {value1:256, value2: 4096}),
      name: 'USE_MEMORY',
      value: '',
      type: 'text',
      fvalue: '',
      visible: s_resource,
      edit: s_resource,
      callbak: null,
      default: [256, 4096]
    }];
    if (p_type == 'modify') {
      let s_cronArray = p_item.CRON_PARAM.split(' ');
      this.oWpPopData = {
        'title': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup11"),
        'flag': true,
        'type': 'schedule',
        'formdata': this.o_ScheduleForm,
        'service': this.cMainAppSvc,
        'componentData': {
          SCH_NM: p_item.SCH_NM,
          WF_ID: p_item.WF_ID,
          // SET_SECOND: s_cronArray[0], // WPLAT-412 초 단위 추가, 초 단위 쓰면 밑에 SET_~~ 변수들 1 씩 추가해줄 것
          SET_MINUTE: s_cronArray[0],
          SET_HOUR: s_cronArray[1],
          SET_DAY: s_cronArray[2],
          SET_MONTH: s_cronArray[3],
          SET_WEEK: s_cronArray[4],
          CRON_INFO: p_item.CRON_PARAM,
          ST_DT: new Date(p_item.ST_DT),
          ED_DT: new Date(p_item.ED_DT),
          USE_CORE: p_item.USE_CORE,
          USE_MEMORY: p_item.USE_MEMORY
        }
      }

    } else {
      this.oWpPopData = {
        'title': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup1"),
        'flag': true,
        'type': 'schedule',
        'service': this.cMainAppSvc,
        'formdata': this.o_ScheduleForm,
        'componentData': {
          WF_ID: "",
          // SET_SECOND: "*", // WPLAT-412 초 단위 추가, 초 단위 쓰면 밑에 SET_~~ 변수들 1 씩 추가해줄 것
          SET_MINUTE: "*",
          SET_HOUR: "*",
          SET_MONTH: "*",
          SET_DAY: "*",
          SET_WEEK: "*",
          CRON_INFO: "* * * * *",
          //CRON_INFO: "* * * * * *" // WPLAT-412 초 단위 추가 위의 CRON_INFO 대신 이걸로 사용
          ST_DT: new Date(),
          ED_DT: new Date(new Date().getTime() + 10 * 60000),
          USE_CORE: 2,
          USE_MEMORY: 1024
        }
      }
    }

  }

  addSch() {
    // 초기화
    this.o_schNmList = [];
    this.o_workflowList['FVALUE'] = [];
    this.o_workflowList['VALUE'] = [];
    // popup 데이터 초기화
    this.resetFormData(null, "add");

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
    this.cSchSvc.getSchNmList().subscribe(pSchResult => {
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


  modifySch(p_ev: any) {
    // 초기화
    let p_el = p_ev.element;
    let s_cronArray = p_el.CRON_PARAM.split(' ');
    let p_before = {
      SCH_NM: p_el.SCH_NM,
      WF_ID: p_el.WF_ID,
      ST_DT: new Date(p_el.ST_DT),
      ED_DT: new Date(p_el.ED_DT),
      SET_CRON: "true",
      //SET_SECOND: s_cronArray[0],  // WPLAT-412 초 단위 추가, 초 단위 쓰면 밑에 SET_~~ 변수들 1 씩 추가해줄 것
      SET_MINUTE: s_cronArray[0],
      SET_HOUR: s_cronArray[1],
      SET_DAY: s_cronArray[2],
      SET_MONTH: s_cronArray[3],
      SET_WEEK: s_cronArray[4],
      CRON_INFO: p_el.CRON_INFO
    }
    this.o_schNmList = [];
    this.o_workflowList['FVALUE'] = [p_el['WF_NM']];
    this.o_workflowList['VALUE'] = [p_el['WF_ID']];
    // popup 데이터 초기화
    this.resetFormData(p_el, "modify");

    //스케줄리스트의 스케줄명을 array로 만듬. 스케줄이름 validate 위해
    this.cSchSvc.getSchNmList().subscribe(pSchResult => {
      for (var sch of pSchResult['result']) {
        // 현재스케줄명은 validate리스트에서 제거
        if (p_el.SCH_NM != sch['SCH_NM']) {
          this.o_schNmList.push(sch['SCH_NM']);
        }
      }
      // 워크플로우 목록
      this.cSchSvc.getWkNmList().subscribe(pWfList => {

        for (var wf of pWfList['result']) {
          this.o_workflowList['VALUE'].push(wf['WF_ID']);
          this.o_workflowList['FVALUE'].push(wf['WF_NM']);
        }
        const dialogRef = this.cDialog.open(WpPopupComponent, {
          data: this.oWpPopData
        });

        dialogRef.afterClosed().subscribe(pRes => {
          if(pRes){
            let s_item = pRes.data;
            
            // validation 추가해야함.
            if (pRes.result) {
              this.cWpLibSvc.showProgress(true, "wdspin");
              // 변경된게 있으면
              if (JSON.stringify(p_before) != JSON.stringify(s_item)) {
                s_item['BEFORE_WF_ID'] = p_before['WF_ID'];
                s_item['SCH_ID'] = p_el['SCH_ID'];
                s_item['CRON_PARAM'] = `${s_item['SET_MINUTE']} ${s_item['SET_HOUR']} ${s_item['SET_DAY']} ${s_item['SET_MONTH']} ${s_item['SET_WEEK']}`;
                // s_item['CRON_PARAM'] = `${s_item['SET_SECOND']} ${s_item['SET_MINUTE']} ${s_item['SET_HOUR']} ${s_item['SET_DAY']} ${s_item['SET_MONTH']} ${s_item['SET_WEEK']}`;
                // WPLAT-412 초단위 하려면 s_item['CRON_PARAM'] 교체
                this.cSchSvc.editCron(s_item).pipe()
                  .subscribe(
                    pResult => {
                      this.drawWkList();
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      this.cMainAppSvc.showMsg(`스케줄 '${pRes.data.SCH_NM}'이 수정되었습니다.`, true);
                    },
                    error => {
                      this.cWpLibSvc.showProgress(false, "wdspin");
                      throw error;
                    })


              }
            }
          }
        });
      })
    });

  }

}