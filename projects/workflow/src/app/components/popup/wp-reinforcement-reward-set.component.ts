import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { MonacoEditorConstructionOptions } from '@materia-ui/ngx-monaco-editor';
import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { WpComSchema } from "projects/wp-server/wp-type/WP_COM_ATT";
import { WpTrainModelService } from "../analytic-model/wp-train-model/wp-train-model.service";
interface IGridData { COL_NAME: string, COL_TYPE: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

@Component({
  selector: 'wp-reward-set',
  templateUrl: './wp-reinforcement-reward-set.component.html',
  styleUrls: ['./wp-reinforcement-reward-set.component.css']
})
export class WpReinforcementRewardSetComponent implements OnInit, OnDestroy {
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
    code: "",
    editor: $('#wp_reward_popup_code'),
  };
  o_codeResult = '';

  o_codeError = false;

  h_modelChart: any;
  constructor(@Inject(MAT_DIALOG_DATA) public data: { schema: WpComSchema[], code: string, usetable: string, result: { [index: string]: any }, jobId: string, excuteFlag: boolean, target_column: string },
    public dialogRef: MatDialogRef<WpReinforcementRewardSetComponent>,
    private cWpModelSvc: WpTrainModelService,
    private cWpComViewSvc: WpComponentViewerService,
    private cWpSocketSvc: WpSocket
  ) {

  }
  ngOnInit() {
    this.drawGrid(this.data.schema)
    // 결과 영역 처음에는 숨김
    let sCodeResultElem = document.getElementById('code-result');
    sCodeResultElem.style.display = 'none';
    if (this.data.code && this.data.code !== '') {
      this.h_query.code = this.data.code;
    }
    if (this.data.result.code_result && this.data.result.code_result !== '') {
      this.o_codeResult = this.data.result.code_result;
      this.drawChart(this.o_codeResult);
      // 결과 영역 표시
      let sCodeResultElem = document.getElementById('code-result');
      sCodeResultElem.style.display = 'block';
      let sPopupElem = document.getElementById('wpRewardPopup');
      sPopupElem.className = 'modal extra-large on';
    }

  }
  //사용가능한 컬럼 그리드 그림.
  drawGrid(pSchema: WpComSchema[]) {
    let sGridData: IGridData[] = [];
    // 컬럼명 그리드 데이터 설정
    pSchema.forEach(sSchema => {
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
    // this.data.code = btoa(encodeURIComponent(this.h_query.code));
    this.chkSocketConnection();
    try {
      // 코드 실행시
      // if (this.data.excuteFlag) {
      this.cWpComViewSvc.showProgress(true);
      console.log("this.h_query.code: ", this.h_query.code);
      console.log("this.data.usetable : ", this.data);
      this.data.code = this.h_query.code;
      let sResult: any = await this.cWpModelSvc.getRewardResult(this.data.usetable, this.data.code, this.data.jobId, this.data.target_column);
      sResult = JSON.parse(sResult);
      this.data.result = sResult;
      console.log("sResult : ", sResult);
      console.log("sResult.code_result : ", sResult.code_result);
      this.o_codeResult = sResult.code_result;
      this.drawChart(this.o_codeResult);
      // 결과 영역 표시
      let sCodeResultElem = document.getElementById('code-result');
      sCodeResultElem.style.display = 'block';
      let sPopupElem = document.getElementById('wpRewardPopup');
      sPopupElem.className = 'modal extra-large on';
      // } 
      // else {
      // 코드 실행안하면 그냥 팝업 닫음.
      // this.dialogRef.close(this.data);
      // }
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      this.cWpComViewSvc.showMsg("파이썬 코드 실행 오류가 발생하였습니다.", false);
      this.o_codeError = true;
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

  drawChart(p_data: any) {
    let s_dataOption = {
      label: 'reward',
      // yAxisID: 'Original',
      borderColor: '#577df6',
      backgroundColor: "rgba(239,244,254,0.2)",
      pointBackgroundColor: '#577df6',
      pointHoverBorderColor: '#577df6',
      pointHoverBackgroundColor: "#fff",
      pointBorderColor: '#577df6',
      lineTension: 0.5,
      pointHoverBorderWidth: 4
    }
    let s_label = Array.from({ length: p_data.length }, (_, index) => index + 1);
    this.h_modelChart = {
      TargetId: "test",
      Title: "Reward Chain over Step",
      Label: s_label,
      ChartType: 'line',
      ChartOption: {
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        scales: {
          x: {
            display: true,
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Cumulative Reward'
            },
          }
        },
        legend: {
          display: false,
        }
      },
      Data: [
        { Title: "reward", Data: p_data, DataOption: s_dataOption }
      ]
    }

  }

  onComplete(p_event: any) {
    if (this.o_codeError == true) {
      this.cWpComViewSvc.showMsg("보상코드 실행 오류가 발생하였습니다.", false);
      return
    } else {
      this.data.code = this.h_query.code;
      this.dialogRef.close(this.data);
    }
  }
}
