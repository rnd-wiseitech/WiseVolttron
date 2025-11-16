import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor } from '@materia-ui/ngx-monaco-editor';
import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { WpComSchema } from "projects/wp-server/wp-type/WP_COM_ATT";
interface IGridData { COL_NAME: string, COL_TYPE: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

@Component({
  selector: 'wp-oodbc-update-popup',
  templateUrl: './wp-oodbc-update-popup.component.html',
  styleUrls: ['./wp-oodbc-update-popup.component.css']
})
export class WpOodbcUpdatePopupComponent implements OnInit, OnDestroy {
  oSubs: Subscription[] = [];
  oGridData: IGridData[] = [];
  oGridCol: IGridCol[] = [];
  oGridOutputData: IGridData[] = [];
  oGridOutputCol: IGridCol[] = [];
  oDisplayCols: string[] = ['COL_NAME', 'COL_TYPE'];
  oDisplayColNms: string[] = ['사용가능한 변수명', '타입'];
  h_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'sql',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true,
    scrollbar: {
      vertical: 'visible',  // 세로 스크롤 항상 표시
      horizontal: 'visible', // 가로 스크롤 항상 표시
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
  }
  };
    h_query: any = {
      code: `-- 바인딩 업데이트 예시 쿼리
-- UPDATE {테이블}
-- SET
--   {업데이트할 컬럼} = {바인딩 하고 싶은 값}
--   Name = :Name,
--   Age = :Age
-- WHERE
--   PassengerId = :PassengerId;`,
      editor: $('#wp-oodbc-update-popup-code'),
    };
  h_codeResult = '';
  constructor(@Inject(MAT_DIALOG_DATA) public data: { schema: WpComSchema[],outputschema : WpComSchema[], code: string, usetable: string, result: { [index: string]: any }, jobId: string, excuteFlag: boolean, saveFlag: boolean },
    public dialogRef: MatDialogRef<WpOodbcUpdatePopupComponent>,
    private cWpComViewSvc: WpComponentViewerService,
    private cWpSocketSvc:WpSocket
  ) {

  }
  ngOnInit() {
    this.drawGrid(this.data.schema,this.data.outputschema)
    // 결과 영역 처음에는 숨김
    // let sCodeResultElem = document.getElementById('code-result');
    // sCodeResultElem.style.display = 'none';
    this.data.saveFlag = false;
    if (this.data.code && this.data.code !== '') {
      this.h_query.code = this.data.code;
    }

  }
  //사용가능한 컬럼 그리드 그림.
  drawGrid(pSchema: WpComSchema[], pSchema2: WpComSchema[]) {
    let sGridData: IGridData[] = [];
    let sGridOutputData: IGridData[] = [];

    // 첫 번째 데이터셋 (Input 데이터 컬럼 스키마)
    pSchema.forEach(sSchema => {
      sGridData.push({ COL_NAME: sSchema.name, COL_TYPE: sSchema.type });
    });

    // 두 번째 데이터셋 (Ouput table 컬럼 스키마)
    pSchema2.forEach(sSchema => {
      sGridOutputData.push({ COL_NAME: sSchema.name, COL_TYPE: sSchema.type });
    });

    this.oGridData = sGridData;
    this.oGridOutputData = sGridOutputData;
    let sGridCol: IGridCol[] = [];
    let sGridOutputCol: IGridCol[] = [];

    // Input 컬럼의 그리드 설정
    if (this.oGridData.length > 0) {
      for (const sCol of Object.keys(this.oGridData[0])) {
        let sIndex = this.oDisplayCols.findIndex(pVal => pVal === sCol);
        sGridCol.push({
          'NAME': sCol,
          'VISIBLE': sIndex !== -1,
          'VNAME': sIndex !== -1 ? this.oDisplayColNms[sIndex] : sCol,
          'TYPE': 'string'
        });
      }
    }

    // Output 컬럼의 그리드 설정
    if (this.oGridOutputData.length > 0) {
      for (const sCol of Object.keys(this.oGridOutputData[0])) {
        let sIndex = this.oDisplayCols.findIndex(pVal => pVal === sCol);
        sGridOutputCol.push({
          'NAME': sCol,
          'VISIBLE': sIndex !== -1,
          'VNAME': sIndex !== -1 ? this.oDisplayColNms[sIndex] : sCol,
          'TYPE': 'string'
        });
      }
    }

    this.oGridCol = sGridCol;
    this.oGridOutputCol = sGridOutputCol;
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
  chkSocketConnection(){
    if (!this.cWpSocketSvc.oSocketStatus) {
        console.log("Socket Reconnected");
        this.cWpSocketSvc.onConnection();
    }
  }
  async onSubmit(pEvent: any) {

    try {
      // base64 인코딩 해서 전송 --oodbc 컴포넌트에서처리
      let sQuery = this.h_query.code.replaceAll(';', '');
      this.data.code = this.h_query.code;
      this.data.saveFlag = true;
      this.chkSocketConnection();
      this.dialogRef.close(this.data);
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      this.data.code = 'UPDATE SET';
      this.cWpComViewSvc.showMsg("쿼리 실행 오류가 발생하였습니다.", false);
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
}
