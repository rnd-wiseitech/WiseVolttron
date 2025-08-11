import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { WorkflowAppService } from "../../app.service";
interface IGridData { NAME: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

@Component({
  selector: 'wp-active-set',
  templateUrl: './wp-reinforcement-active-set.component.html',
  styleUrls: ['./wp-reinforcement-active-set.component.css']
})
export class WpReinforcementActiveSetComponent implements OnInit, OnDestroy {
  oSubs: Subscription[] = [];
  oGridData: IGridData[] = [];
  oGridCol: IGridCol[] = [];
  oDisplayCols: string[] = ['NAME'];
  oDisplayColNms: string[] = ['컬럼명'];
  h_selection='multiple';
  h_selectionList:any = [];
  o_gridSelect:any = [];
  o_getData: any = [];
  constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<WpReinforcementActiveSetComponent>,
    private cWpComViewerSvc:WpComponentViewerService,
    private cWpAppSvc : WorkflowAppService,
  ) {

  }
  ngOnInit() {
    console.log("reinforcement active-set");
    this.drawGrid(this.data);


    // this.drawGrid(this.data.schema)
    // // 결과 영역 처음에는 숨김
    // let sCodeResultElem = document.getElementById('code-result');
    // sCodeResultElem.style.display = 'none';
    // if (this.data.code && this.data.code !== '') {
    //   this.h_query.code = decodeURIComponent(atob(this.data.code));
    // }
    // if (this.data.result.code_result && this.data.result.code_result !== '') {
    //   this.h_codeResult = decodeURIComponent(atob(this.data.result.code_result));
    //   // 결과 영역 표시
    //   let sCodeResultElem = document.getElementById('code-result');
    //   sCodeResultElem.style.display = 'block';
    //   let sPopupElem = document.getElementById('wpPythonPopup');
    //   sPopupElem.className = 'modal extra-large on';
    // }

  }
  //사용가능한 컬럼 그리드 그림.
  // drawGrid(pSchema: WpComSchema[]) {
  drawGrid(p_data:any) {
    console.log("p_data  : ", p_data);
    this.o_getData = p_data;
    let sGridData: IGridData[] = [];
    // // 컬럼명 그리드 데이터 설정
    p_data.forEach((s_data:any) => {
      if(s_data.USE == true) {
        this.h_selectionList.push(s_data.NAME);
      }
      sGridData.push({ NAME: s_data.NAME });
    });
    this.oGridData = sGridData;
    let sGridCol: IGridCol[] = [];
    sGridCol.push({
      'NAME': 'SELECT',
      'VISIBLE': true,
      'VNAME': '',
      'TYPE': 'string'
    })
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

  onClose() {
    this.dialogRef.close(this.data);
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    })
  }

  onGridCallback(p_event:any) {
    console.log("p_event : ", p_event);
    console.log("selection : ", p_event.selection);
    console.log("selection : ", p_event.selection.selected);
    this.o_gridSelect = p_event.selection.selected;
  }

  onComplete(p_event:any) {
    if(this.o_gridSelect.length == 0) {
      this.cWpAppSvc.showMsg("행동변수를 설정해주세요.", false)
          return
    } else {
      let s_result = this.o_getData.map((item1:any) => ({
        ...item1,
        USE: this.o_gridSelect.some((item2:any) => item2.NAME === item1.NAME)
      }));
      this.dialogRef.close(s_result);
    }
  }
}
