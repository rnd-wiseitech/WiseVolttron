import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { WorkflowAppService } from "../../app.service";
import { WpMetaService } from "projects/wp-lib/src/lib/wp-meta/wp-meta.service";
import { TranslateService } from "@ngx-translate/core";
interface IGridData { NAME: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }
declare const $: any;
@Component({
  selector: 'wp-info-popup',
  templateUrl: './wp-info-popup.component.html',
  styleUrls: ['./wp-info-popup.component.css']
})
export class WpInfoPopupComponent implements OnInit, OnDestroy {
  oSubs: Subscription[] = [];
  h_selection = 'multiple';
  h_selectionList: any = [];
  h_corrChart: any;
  h_infoType: any;
  h_formData: any;
  h_chartData: any;
  h_chartParam: any;
  h_schema: any = [];
  h_test: any;
  h_graphType: any;
  h_graphData: any = {
    vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup40"),
    name: 'graph_infoType',
    value: '',
    type: 'select',
    fvalue: ['scatter', 'pie', 'bar', 'line'],
    visible: true,
    edit: true,
    callbak: null
  };
  h_defaultData: any;
  h_componentTabData: any;

  h_edaData: any = {
    data: [],
    column: []
  };
  constructor(@Inject(MAT_DIALOG_DATA) 
    public data: any,
    public dialogRef: MatDialogRef<WpInfoPopupComponent>,
    private cWpComViewerSvc: WpComponentViewerService,
    private cWpAppSvc: WorkflowAppService,
    public cMetaSvc: WpMetaService,
    private cTransSvc: TranslateService
  ) {

  }
  async ngOnInit() {
    try {
      console.log("wp-info-popup start");
 
      this.h_edaData = {
        data: [],
        column: []
      };
      // this.cWpComViewerSvc.showProgress(false);
      this.h_infoType = this.data.type;
      // this.h_corrChart = JSON.parse(this.data);
      let s_userInfo = await this.cMetaSvc.getUserInfo().toPromise();
      let s_userApp = s_userInfo['result'][0];
      if (this.h_infoType == 'correlation') {
        let s_param = {
          action: "correlation",
          method: "",
          groupId: "corr",
          jobId: "0",
          location: "workflow",
          data: {
            "usetable": this.data.data,
            "APP_SVC_IP" : s_userApp.APP_SVC_IP,
            "APP_SVC_PORT" : s_userApp.APP_SVC_PORT
          }
        }
        let s_corr = await this.cMetaSvc.getCorr(s_param).toPromise();
  
        this.setCorrData(JSON.parse(JSON.parse(s_corr)['data']));
      } else if (this.h_infoType == 'visualization') {
        // this.o_orgData = await this.data.data.map((s_jsonStr: string) => JSON.parse(s_jsonStr));
        this.h_schema = await this.data.schema.map((s_json: any) => s_json['name']);
        this.h_defaultData = {
          'group-single': [
            { // #WPLAT-6 날짜 표현식 추가
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup44"),
              name: 'groupColumn',
              value: '',
              type: 'select',
              fvalue: this.h_schema,
              visible: true,
              edit: true,
              callbak: null
            },
            { // #WPLAT-6 날짜 표현식 추가
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup45"),
              name: 'column',
              value: '',
              type: 'select',
              fvalue: this.h_schema,
              visible: true,
              edit: true,
              callbak: null
            },
            { // #WPLAT-6 날짜 표현식 추가
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup46"),
              name: 'type',
              value: '',
              type: 'select',
              fvalue: ['sum', 'count', 'mean'],
              visible: true,
              edit: true,
              callbak: null
            }],
  
          'group-multi': [
            { // #WPLAT-6 날짜 표현식 추가
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup44"),
              name: 'groupColumn',
              value: '',
              type: 'select',
              fvalue: this.h_schema,
              visible: true,
              edit: true,
              callbak: null
            },
            {
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup47"),
              name: 'cal_columnArray',
              value: 'tab',
              type: 'tab',
              fvalue: [{
                "col": {
                  vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup45"),
                  name: 'column',
                  value: '',
                  type: 'select',
                  fvalue: this.h_schema,
                  visible: true,
                  edit: true,
                  callbak: null
                },
                "type": {
                  vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup46"),
                  name: 'type',
                  value: '',
                  type: 'select',
                  fvalue: ['sum', 'count', 'mean'],
                  visible: true,
                  edit: true,
                  callbak: null
                }
              }],
              visible: true,
              edit: true,
              callbak: null
            }],
  
          'scatter': [
            { // #WPLAT-6 날짜 표현식 추가
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup41"),
              name: 'groupColumn',
              value: '',
              type: 'select',
              fvalue: this.h_schema,
              visible: true,
              edit: true,
              callbak: null
            },
            {
              vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup42"),
              name: 'cal_columnArray',
              value: 'tab',
              type: 'tab',
              fvalue: [{
                "col": {
                  vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup43"),
                  name: 'column',
                  value: '',
                  type: 'select',
                  fvalue: this.h_schema,
                  visible: true,
                  edit: true,
                  callbak: null
                },
                "type": {
                  vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup46"),
                  name: 'type',
                  value: 'no',
                  type: 'text',
                  fvalue: 'no',
                  visible: false,
                  edit: false,
                  callbak: null
                }
              }],
              visible: true,
              edit: true,
              callbak: null
            }],
  
        }
      } else {
        let s_param = {
          action: "eda",
          method: "",
          groupId: "eda",
          jobId: "0",
          location: "workflow",
          data: {
            "usetable": this.data.data,
            "APP_SVC_IP" : s_userApp.APP_SVC_IP,
            "APP_SVC_PORT" : s_userApp.APP_SVC_PORT
          }
        }
        let s_result = await this.cMetaSvc.getCorr(s_param).toPromise();
     
        let s_data = JSON.parse(s_result)['data'];
    
        this.h_edaData['data'] = []
        for (var data of s_data) {
          let s_data = JSON.parse(data);
          // summary 컬럼명 변경
          if (s_data.hasOwnProperty('summary')) {
            s_data[this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup75")] = s_data['summary'];  // 새로운 키에 기존 값을 할당
            delete s_data['summary'];  // 기존 키 삭제
          }
          this.h_edaData['data'].push(s_data);
        }
        // 컬럼헤더 생성
        if (this.h_edaData['data'].length > 0) {
          this.h_edaData.column = this.createGridCol(this.h_edaData['data'][0]);
        }
  
      }
    } catch (error:any) {
      console.log("error : ", error);
      this.cWpAppSvc.showMsg(`작업 중 에러가 발생했습니다.\nerror: ${error.error.message}`, false);
      this.cWpComViewerSvc.showProgress(false);
    } finally {
      this.cWpComViewerSvc.showProgress(false);
    }




  }

  ngAfterViewInit() {
    $('.scrollbar').scrollbar();
  }

  setCorrData(p_data: any) {
    let s_data = [
      {
        z: p_data['data'],
        x: p_data['columns'],
        y: p_data['index'],
        type: 'heatmap'
      }
    ];
    this.h_corrChart = {
      Data: s_data,
      Height: 800
    }
    this.cWpComViewerSvc.showProgress(false);
  }


  onClose() {
    this.dialogRef.close();
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    })
  }


  async onGraphChanged(p_event: any) {
 
    this.h_graphType = p_event.selectedItem;
    // this.h_formData = this.h_defaultData[this.h_graphType];
    if (this.h_graphType == 'pie') {
      this.h_formData = this.h_defaultData['group-single'];
    } else if (this.h_graphType == 'bar' || this.h_graphType == 'line') {
      this.h_formData = this.h_defaultData['group-multi'];
    } else {
      this.h_formData = this.h_defaultData[this.h_graphType];
    }

    // console.log("pCallbackName : ",pCallbackName);
  }
  async onFormChanged(p_form: any, p_event: any) {

    p_form.value = p_event.selectedItem;


  }


  onAddFormArray(p_form: any) {

    if (p_form.fvalue.length < 5) {
      if (this.h_graphType == 'bar' || this.h_graphType == 'line') {
        p_form.fvalue.push({
          "col": {
            vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup45"),
            name: 'column',
            value: '',
            type: 'select',
            fvalue: this.h_schema,
            visible: true,
            edit: true,
            callbak: null
          },
          "type": {
            vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup46"),
            name: 'type',
            value: '',
            type: 'select',
            fvalue: ['sum', 'count'],
            visible: true,
            edit: true,
            callbak: null
          }
        });
      } else {
        p_form.fvalue.push({
          "col": {
            vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup43"),
            name: 'column',
            value: '',
            type: 'select',
            fvalue: this.h_schema,
            visible: true,
            edit: true,
            callbak: null
          },
          "type": {
            vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup46"),
            name: 'type',
            value: 'no',
            type: 'text',
            fvalue: 'no',
            visible: false,
            edit: false,
            callbak: null
          }
        })
      }
    } else {
      this.cWpAppSvc.showMsg("계산 컬럼은 5개까지만 설정이 가능합니다.", false);
    }



  }
  onRemoveFormArray(p_form: any, p_event: Event, p_index: any) {
    if (p_form.fvalue.length > 1) {
      p_form.fvalue.splice(p_index, 1);
    }

  }
  async onDrawChart() {
    this.h_chartParam = { usetable: this.data.data, type: '' }

    // 기본 속성값 설정 체크
    let s_formCheck = await this.h_formData.some((item: any) => item.value === '');
    if (s_formCheck) {
      this.cWpAppSvc.showMsg("속성값을 설정해주세요.", false);
      return;
    }

    for (let form of this.h_formData) {
      // groupCol
      if (form.name != 'cal_columnArray') {
        this.h_chartParam[form.name] = [form.value];
      } else {
        this.h_chartParam['dataArray'] = [];
        for (const tabItem of form.fvalue) {
          if (tabItem.col.value === '' || tabItem.type.value === '') {
            this.cWpAppSvc.showMsg("속성값을 설정해주세요.", false);
            return;
          }
          this.h_chartParam['dataArray'].push({ "column": tabItem.col.value, "type": tabItem.type.value });
        }
      }

    }

    if (this.h_graphType == 'pie') {
      this.h_chartParam['dataArray'] = [{ column: this.h_chartParam['column'][0], type: this.h_chartParam['type'][0] }];
      delete this.h_chartParam["column"]
      delete this.h_chartParam["type"]
    }
    let s_checkDuplicate = await this.checkDuplicates(this.h_chartParam['dataArray']);

    if (s_checkDuplicate) {
      this.cWpAppSvc.showMsg("동일한 속성의 계산 컬럼이 있습니다.", false);
      return;
    }
    this.cWpComViewerSvc.showProgress(true);
    let s_param = {
      action: 'chart',
      method: this.h_graphType,
      location: 'workflow',
      groupId: 'chart',
      jobId: 1,
      data: this.h_chartParam
    }
    this.h_chartData = await this.cWpComViewerSvc.getChartData(s_param).toPromise();
    this.h_chartData = JSON.parse(this.h_chartData);
    this.h_chartData.groupColumn = this.h_chartParam['groupColumn'];
    this.h_chartData.usetable = this.h_chartParam['usetable'];
  
  }


  async checkDuplicates(p_data: any) {
    let seen = new Set();
    for (let obj of p_data) {
      let key = JSON.stringify(obj);
      if (seen.has(key)) {
        return true; // 중복 발견
      }
      seen.add(key);
    }
    return false; // 중복 없음
  }

  createGridCol(p_data: any) {
    // JSON 객체의 키를 배열로 추출
    const jsonKeys = Object.keys(p_data);
    let s_gridCol: any = [];
    // 각 키에 대해 객체 생성 및 배열에 추가
    jsonKeys.forEach(col => {
      let s_col = {
        'NAME': col,
        'VISIBLE': true,
        'VNAME': col,
        'TYPE': 'string'
      };
      s_gridCol.push(s_col);
    });
    // 배열의 마지막 요소 제거
    s_gridCol.pop();
    // 통계량 컬럼을 맨앞에 추가
    s_gridCol.unshift({
      'NAME': this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup75"),
      'VISIBLE': true,
      'VNAME': this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup75"),
      'TYPE': 'string'
    })
    return s_gridCol;
  }

}
