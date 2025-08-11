import { Component, OnInit } from "@angular/core";
import { WorkflowAppService } from "../../app.service";
//@ts-ignore
import * as dataFormatJson from "../../../../../../assets/resource/json/date_format.json";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { WpPopupComponent } from "projects/wp-lib/src/lib/wp-popup/wp-popup.component";
import { WpUserParameterService } from "./wp-user-parameter.service";
import { MainAppService } from "projects/main/src/app/app.service";
import { WF_USER_PARAM_ATT } from "projects/wp-server/metadb/model/WF_USER_PARAM";
import { TranslateService } from "@ngx-translate/core";

interface IGridData { PARAM_ID: string, PARAM_NM: string, PARAM_VALUE: string, PARAM_FORMAT: string, REG_DT: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; VALUE?: string[] }

@Component({
  selector: 'lib-wp-user-parameter',
  templateUrl: './wp-user-parameter.component.html',
  styleUrls: ['./wp-user-parameter.component.css']
})
export class WpUserParameterComponent implements OnInit {
  oAddParamForm: any[];
  oComponentData: any = {};
  oDateFormat: any = dataFormatJson['default'].BASIC_FORMAT;
  oGridData: IGridData[];
  oGridCol: IGridCol[];
  oHoverEffect: boolean = true;
  oRowEvt: boolean = true;
  oGridHeader = { btnNm: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup70") };
  oDisplayedColumnNms: string[] = [
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup59"),
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup60"),
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup61"),
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup62")];
  oDisplayedColumns: string[] = ['PARAM_NM', 'PARAM_VALUE', 'PARAM_FORMAT', 'REG_DT'];

  o_formatList: any = {
    VALUE: [],
    FVALUE: []
  }

  constructor(
    public cDialog: MatDialog,
    private cAppSvc: WorkflowAppService,
    private cUserParamSvc: WpUserParameterService,
    public dialogRef: MatDialogRef<WpUserParameterComponent>,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService
  ) {
    this.oAddParamForm = [{
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup59"),
      name: 'param_nm',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null,
    }, {
      //   vname: '매개변수값',
      //   name: 'param_value',
      //   value: [],
      //   type: 'select',
      //   fvalue: [],
      //   visible: true,
      //   edit: true,
      //   callbak: { name: 'onChangeParamValue' }
      // }, {
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup63"),
      name: 'param_value',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup64"),
      name: 'format',
      value: this.o_formatList['VALUE'],
      type: 'select',
      fvalue: this.o_formatList['FVALUE'],
      visible: true,
      edit: true,
      callbak: null
    }];
  }

  ngOnInit(): void {
    this.resetFormData();
    this.drawParamList();
  }
  drawParamList() {
    this.cUserParamSvc.getUserParams().subscribe(
      pData => {
        let sColInfo: IGridCol[] = [];
        if (pData.length != 0) {
          pData.forEach((sParam: WF_USER_PARAM_ATT) => {
            sParam.PARAM_JSON = sParam.PARAM_FORMAT;
            sParam.PARAM_FORMAT = JSON.parse(sParam.PARAM_FORMAT).value;
            sParam.PARAM_VALUE = JSON.parse(sParam.PARAM_VALUE);
          });
          this.oGridData = pData;
          for (let sCol of Object.keys(pData[0])) {
            let sIndex = this.oDisplayedColumns.findIndex(pVal => pVal === sCol);
            if (sIndex == -1) {
              sColInfo.push({
                'NAME': sCol,
                'VISIBLE': false,
                'VNAME': sCol,
                'TYPE': 'string'
              });
            } else {
              sColInfo.push({
                'NAME': sCol,
                'VISIBLE': true,
                'VNAME': this.oDisplayedColumnNms[sIndex],
                'TYPE': 'string'
              });
            }
          }
          sColInfo.push({
            'NAME': 'FUNCTION',
            'VISIBLE': true,
            'VNAME': '',
            'VALUE': ['modify', 'trash'],
            'TYPE': 'string'
          });
          this.oGridCol = sColInfo;
        } else {
          this.oGridData = [];
        }
      }
    )
  }
  onClose() {
    this.dialogRef.close();
  }

  onGridCallback(pEv: any) {
    if (pEv.eventNm == 'trash')
      this.delParameter(pEv.element);
    else if (pEv.eventNm == 'modify')
      this.editParameter(pEv.element);
    else if (pEv.eventNm == 'headBtnEvt')
      this.addParameter();
  }

  editParameter(pEvent: WF_USER_PARAM_ATT) {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': this.cTransSvc.instant("WPP_COMMON.POPUP.popup2"),
        'flag': true,
        'type': 'userparams',
        'service': this.cMainAppSvc,
        'formdata': this.oAddParamForm,
        'componentData': {
          param_nm: pEvent.PARAM_NM,
          param_value: pEvent.PARAM_VALUE,
          format: pEvent.PARAM_JSON
        },
        'btnText': this.cTransSvc.instant("WPP_COMMON.INFO.info4")
      }
    });
    // const dialogSubscription = dialogRef.componentInstance.selectionChanged
    //   .subscribe(pRes => {
    //     if (pRes.eventNm == "onChangeParamFormat") {
    //       this.onChangeParamFormat(pRes.selectedVal, dialogRef.componentInstance);
    //     }
    //     if (pRes.eventNm == "onChangeParamValue") {
    //       this.onChangeParamValue(pRes.selectedVal, dialogRef.componentInstance);
    //     }
    //   });
    dialogRef.afterOpened().subscribe(() => {
      this.setTooltip();
    })
    dialogRef.afterClosed().subscribe(pRes => {
      // dialogSubscription.unsubscribe();
      if (pRes) {
        if (pRes.result) {
          let sResult = pRes.data;
          // 사용자 입력은 실제 입력값으로 value 바꿔줌.
          // if (sResult.param_value.type == 'spark_input') {
          //   sResult.param_value.value = sResult.user_input;
          // }
          // 타입 존재하는 경우 PYTHON, SPARK 포맷도 같이 저장.
          // if (sResult.format.type == 'date') {
          //   sResult.format = { ...sResult.format, ...this.oDateFormat[sResult.format.value] };
          // }
          // 기존 데이터와 변동이 있을때만 수정.
          if ((pEvent.PARAM_VALUE !== sResult.param_value.value) || (pEvent.PARAM_JSON !== sResult.format)) {
            let sUpdateParamData = {
              PARAM_ID: Number(pEvent.PARAM_ID),
              PARAM_NM: sResult.param_nm,
              PARAM_VALUE: JSON.stringify(sResult.param_value),
              PARAM_FORMAT: sResult.format,
            };
            this.cUserParamSvc.modifyUserParams(sUpdateParamData).subscribe(pRes => {
              if (pRes.success) {
                this.cAppSvc.showMsg('사용자 매개변수 수정 완료', false);
                this.drawParamList();
              }
            })
          }
        }
      }
    });
  }
  delParameter(pEvent: WF_USER_PARAM_ATT) {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': 'Message',
        'flag': true,
        'message': '사용자 매개변수를 삭제하겠습니까?',
        'colWidthOption': 'tight'
      }
    });
    dialogRef.afterClosed().subscribe(async result => {
      if (result && result.result) {
        this.cUserParamSvc.deleteUserParams(pEvent.PARAM_ID.toString()).subscribe(pResult => {
          if (pResult.success) {
            this.cAppSvc.showMsg('사용자 매개변수 삭제 완료', false);
            this.drawParamList();
          }
        })
      }
    });
  }
  addParameter() {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': this.cTransSvc.instant("WPP_COMMON.POPUP.popup2"),
        'flag': true,
        'type': 'userparams',
        'service': this.cMainAppSvc,
        'formdata': this.oAddParamForm,
        'btnText': this.cTransSvc.instant("WPP_COMMON.INFO.info3")
      }
    });
    // const dialogSubscription = dialogRef.componentInstance.selectionChanged
    //   .subscribe(pRes => {
    //     if (pRes.eventNm == "onChangeParamFormat") {
    //       this.onChangeParamFormat(pRes.selectedVal, dialogRef.componentInstance);
    //     }
    //     if (pRes.eventNm == "onChangeParamValue") {
    //       this.onChangeParamValue(pRes.selectedVal, dialogRef.componentInstance);
    //     }
    //   });
    dialogRef.afterOpened().subscribe(() => {
      this.setTooltip();
    })
    dialogRef.afterClosed().subscribe(pRes => {
      // dialogSubscription.unsubscribe();
      if (pRes) {
        if (pRes.result) {
          let sResult = pRes.data;
          // 사용자 입력은 실제 입력값으로 value 바꿔줌.
          // if (sResult.param_value.type == 'spark_input') {
          //   sResult.param_value.value = sResult.user_input;
          // }
          // // 타입 존재하는 경우 PYTHON, SPARK 포맷도 같이 저장.
          // if (sResult.format.type == 'date') {
          //   sResult.format = { ...sResult.format, ...this.oDateFormat[sResult.format.value] };
          // }
          let sAddParamData = {
            PARAM_NM: sResult.param_nm,
            PARAM_VALUE: JSON.stringify(sResult.param_value),
            PARAM_FORMAT: sResult.format
          };
          this.cUserParamSvc.getUserParams().subscribe((pUserParams: WF_USER_PARAM_ATT[]) => {
            let sParamNmList = pUserParams.map(sParam => sParam.PARAM_NM);
            if (sParamNmList.includes(sResult.param_nm)) {
              this.cAppSvc.showMsg(`동일한 이름의 사용자 매개변수를 추가할 수 없습니다.`, false);
            } else {
              this.cUserParamSvc.addUserParams(sAddParamData).subscribe(pRes => {
                if (pRes.success) {
                  this.cAppSvc.showMsg('사용자 매개변수 추가 완료', false);
                  this.drawParamList();
                }
              })
            }
          })

        }
      }
    });
  }
  // onChangeParamValue(pValue: { type: string, value: string }, pCompInstance: any) {
  //   this.oAddParamForm.forEach(sForm => {
  //     if (sForm.name == 'user_input') {
  //       if (pValue.type == "spark_input") {
  //         sForm.visible = true;
  //       } else {
  //         sForm.visible = false;
  //       }
  //       this.setTooltip();
  //     }
  //   })
  // }
  // onChangeParamFormat(pValue: string, pCompInstance: any) {

  // }
  setTooltip() {
    setTimeout(() => {
      let sElem = document.querySelector('#wp-popup-param_value');
      if (sElem && sElem.getElementsByClassName('tooltip memo').length == 0) {
        let sTooltipElem = document.createElement("div");
        sTooltipElem.innerHTML = `
            <a class="tooltip memo" style="float: right;"> 
              <img src="assets/images/ico-help.png" alt="">
              <p class="tooltip-info">단일 값으로 출력되는 PySpark Functions만 사용할 수 있습니다.<br>
              다중 값으로 출력되는 경우 가장 첫 번째 값을 사용합니다.</p>
            </a>
            `;
        (sElem.childNodes[0] as Element).prepend(sTooltipElem);
      }
    }, 50);
  }
  resetFormData() {
    let sDateFormatList = Object.keys(this.oDateFormat);
    this.o_formatList.VALUE.push(JSON.stringify({ type: '', value: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup65") }));
    this.o_formatList.FVALUE.push(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup65"));
    sDateFormatList.forEach(sDate => {
      let s_json = {
        type: 'date',
        value: sDate
      };
      s_json = Object.assign(s_json, this.oDateFormat[sDate])
      this.o_formatList.VALUE.push(JSON.stringify(s_json));
      this.o_formatList.FVALUE.push(sDate);
    })
    
    // this.oAddParamForm.forEach(sForm => {
    //   if (sForm.name == 'format') {
    //     let sFormatValue = [];
    //     let sFormatFvalue = [];
    //     sFormatValue.push({ type: '', value: '(적용 안함)' });
    //     sFormatFvalue.push('(적용 안함)');
    //     sDateFormatList.forEach(sDate => {
    //       sFormatValue.push({ type: 'date', value: sDate });
    //       sFormatFvalue.push(sDate);
    //     })
    //     sForm.value = sFormatValue;
    //     sForm.fvalue = sFormatFvalue;
    //   }
      // if (sForm.name == 'param_value') {
      //   let sParamValValue = [
      //     { type: 'date', value: 'TODAY' },
      //     { type: 'spark_input', value: '사용자 입력' }
      //   ];
      //   let sParamValFValue = [
      //     'TODAY',
      //     '사용자 입력'
      //   ];
      //   sForm.value = sParamValValue;
      //   sForm.fvalue = sParamValFValue;
      // }
    // })
  }
}