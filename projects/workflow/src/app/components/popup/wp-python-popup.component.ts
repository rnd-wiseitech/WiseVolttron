import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { MonacoEditorConstructionOptions } from '@materia-ui/ngx-monaco-editor';
import { WpPythonService } from "../conversion/wp-python/wp-python.service";
import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { TranslateService } from '@ngx-translate/core';
import { MainAppService } from "projects/main/src/app/app.service";
interface IGridData { COL_NAME: string, COL_TYPE: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

@Component({
  selector: 'wp-python-popup',
  templateUrl: './wp-python-popup.component.html',
  styleUrls: ['./wp-python-popup.component.css']
})
export class WpPythonPopupComponent implements OnInit, OnDestroy {
  oSubs: Subscription[] = [];
  oGridData: IGridData[] = [];
  oGridCol: IGridCol[] = [];
  oDisplayCols: string[] = ['COL_NAME', 'COL_TYPE'];
  oDisplayColNms: string[] = ['사용가능한 변수명', '타입'];
  h_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'python',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true
  };
  h_query: any = {
    code: "print(df)",
    editor: $('#wp_python_popup_code'),
  };

  h_result_query: any = {
    code: "",
    editor: $('#wp_python_popup_result_code'),
  };

  h_result_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'python',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true,
    readOnly: true
  };
  h_pythonResult = false;
  h_codeResult = '';
  h_popup: any = null;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { schema: any, code: string, usetable: string, result: { [index: string]: any }, jobId: string, excuteFlag: boolean, popupType?: any, param?: any },
    public dialogRef: MatDialogRef<WpPythonPopupComponent>,
    private cWpPythonSvc: WpPythonService,
    private cWpComViewSvc: WpComponentViewerService,
    private cWpSocketSvc: WpSocket,
    private cTransSvc: TranslateService,
    private cMainAppSvc: MainAppService,
    public cDialog: MatDialog,
  ) {

  }
  ngOnInit() {
    this.h_popup = this.data.popupType ?? null;
    let sCodeResultElem = document.getElementById('code-result');
    sCodeResultElem.style.display = 'none';
    this.drawGrid(this.data.schema, this.h_popup);

    // 결과 영역 처음에는 숨김
    if (this.data.code && this.data.code !== '') {
      this.h_query.code = decodeURIComponent(atob(this.data.code));
    }
    if (this.data.result.code_result && this.data.result.code_result !== '') {
      this.h_codeResult = decodeURIComponent(atob(this.data.result.code_result));
      // 결과 영역 표시
      let sCodeResultElem = document.getElementById('code-result');
      sCodeResultElem.style.display = 'block';
      let sPopupElem = document.getElementById('wpPythonPopup');
      sPopupElem.className = 'modal extra-large on';
    }

  }
  //사용가능한 컬럼 그리드 그림.
  drawGrid(pSchema: any, p_type: any) {
    if (p_type == null) {
      let sGridData: IGridData[] = [];
      // 컬럼명 그리드 데이터 설정
      pSchema.forEach((sSchema:any) => {
        sGridData.push({ COL_NAME: sSchema.name, COL_TYPE: sSchema.type });
      });
      this.oGridData = sGridData;
      let sGridCol: IGridCol[] = [];
      for (const sCol of Object.keys(this.oGridData[0])) {
        let sIndex = this.oDisplayCols.findIndex(pVal => pVal === sCol);
        if (sIndex == -1) {
          sGridCol.push({
            'NAME': sCol, 'VISIBLE': false, 'VNAME': sCol, 'TYPE': 'string'
          });
        } else {
          sGridCol.push({
            'NAME': sCol, 'VISIBLE': true, 'VNAME': this.oDisplayColNms[sIndex], 'TYPE': 'string'
          });
        }
      }
      this.oGridCol = sGridCol;
    } 
  }
  // 코드 에디터 초기 설정
  editorInit(editor: any) {
    this.h_query['editor'] = editor;
    // Programatic content selection example
    editor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endColumn: 10,
      endLineNumber: 3
    });
  }
  // # DI 오류수정
  chkSocketConnection() {
    if (!this.cWpSocketSvc.oSocketStatus) {
      console.log("Socket Reconnected");
      this.cWpSocketSvc.onConnection();
    }
  }
  async onSubmit(pEvent: any) {
    // 파이썬 코드 실행 (spark로 코드, 뷰아이디 던짐)
    // base64 인코딩 해서 전송
    this.data.code = btoa(encodeURIComponent(this.h_query.code));
    this.chkSocketConnection();
    try {
      // 코드 실행시
      if (this.data.excuteFlag) {
        this.cWpComViewSvc.showProgress(true);
        let sResult: any = await this.cWpPythonSvc.getCodeResult(this.data.usetable, this.data.code, this.data.jobId);
        sResult = JSON.parse(sResult);
        this.data.result = sResult;
        this.h_codeResult = decodeURIComponent(atob(sResult.code_result));

        // 결과 영역 표시
        let sCodeResultElem = document.getElementById('code-result');
        sCodeResultElem.style.display = 'block';
        let sPopupElem = document.getElementById('wpPythonPopup');
        sPopupElem.className = 'modal extra-large on';
      } else {
        // 코드 실행안하면 그냥 팝업 닫음.
        this.dialogRef.close(this.data);
      }
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      // this.data.code = 'print(df)';
      this.cWpComViewSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info108"), false);
      this.data.excuteFlag = false;
    } finally {
      this.cWpComViewSvc.showProgress(false);
    }
  }
  onClose() {
    this.dialogRef.close(this.data);
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    })
  }

  async onPythonSubmit(p_ev: any) {
    this.cWpComViewSvc.showProgress(true);
    try {
        if(p_ev == 'check') {
          let s_param = {}
          if(this.h_popup =='transfer-model') {
            s_param = {
              'method': 'CHECK-CODE',
              'location': 'workflow',
              'MODEL_ID': this.data.param.MODEL_ID,
              'MODEL_IDX': this.data.param.MODEL_IDX,
              'PARAMETER': this.data.param.PARAMETER,
              'PYTHON_CODE': btoa(encodeURIComponent(this.h_query.code)),
              'CUSTOM_YN': this.data.param.CUSTOM_YN,
              'FRAMEWORK_TYPE': this.data.param.FRAMEWORK_TYPE
            }
          } else if(this.h_popup='pytorch-class') {
            s_param = {
              'method': 'CHECK-CLASS',
              'location': 'workflow',
              'PYTHON_CODE': btoa(encodeURIComponent(this.h_query.code))
            }
          }
          
  
          let s_modelInfo = await this.cWpPythonSvc.getModelInfo(s_param).toPromise();
          let s_summary = JSON.parse(s_modelInfo)['data'];
          this.h_result_query.code = s_summary;
          this.h_pythonResult = true;   
        } else if (p_ev == 'code') {
          this.h_pythonResult = false; 
        } else if (p_ev == 'access') {
          this.data.code = btoa(encodeURIComponent(this.h_query.code));
          this.h_pythonResult = false; 
          this.dialogRef.close(this.data);
        }
          
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      this.cWpComViewSvc.showMsg(`${this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info108")}\nerror: ${pErr.error.message}`, false);
      this.data.excuteFlag = false;
    } finally {
      this.cWpComViewSvc.showProgress(false);
    }
  }
}
