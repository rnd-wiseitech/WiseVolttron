import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { WpDiagramService } from "../wp-diagram.service";
import { WorkflowAppService } from "../../app.service";
import { Subscription } from "rxjs";
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WF_MSTR_ATT } from 'projects/wp-server/metadb/model/WF_MSTR';
import { MainAppService } from 'projects/main/src/app/app.service';
import { TranslateService } from '@ngx-translate/core';
import { WpPopUpAuthorityComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-authority.component';
declare const $: any;

interface IGridData extends WF_MSTR_ATT { FUNCTION: string[]; }
interface IGridCol { NAME: string; VISIBLE: boolean; VALUE?: any, VNAME: string; TYPE: string; }
interface ILoadEvent { element: IGridData, event: PointerEvent, eventNm: 'download' | 'trash' | 'modify'  }
@Component({
  selector: 'wp-load',
  templateUrl: './wp-load.component.html',
  styleUrls: ['./wp-load.component.css']
})
export class WpLoadComponent implements OnInit, OnDestroy {
  o_subs: Subscription[] = [];
  o_gridData: IGridData[];
  o_gridCol: IGridCol[];
  o_hoverEffect: boolean = true;
  o_rowEvt: boolean = true;
  o_gridHeader = { filterCol: ['WF_NM'] };
  o_displayColNms: string[] = [
    '권한',
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup67"),
    '소유자', 
    this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup62")];
  o_displayCols: string[] = ['AUTHORITY', 'WF_NM', 'USER_ID', 'REG_DT'];
  oComptNm = 'wp-authority'
  constructor(
    public cDialog: MatDialog,
    private cWkAppSvc: WorkflowAppService,
    private cWpDiagramSvc: WpDiagramService,
    private cWpLibSvc: WpLoadingService,
    public dialogRef: MatDialogRef<WpLoadComponent>,
    private cMainAppSvc: MainAppService,
    private cTransSvc: TranslateService
  ) { }

  ngOnDestroy(): void {
    this.o_subs.forEach(s_subscription => {
      s_subscription.unsubscribe();
    })
  }

  ngOnInit(): void {
    // this.cWpLibSvc.showProgress(true, 'wkspin');
    this.drawWkList();
    // $('.scrollbar').scrollbar();
  }

  drawWkList() {
    this.o_subs.push(this.cWpDiagramSvc.getWorkflowList().subscribe((pWkResult: WF_MSTR_ATT[]) => {
      let s_gridData: IGridData[] = []
      pWkResult
        .filter(sWkData => sWkData.WF_TYPE === 'save' && sWkData.DEL_YN === 'N')
        .forEach(sWkData => s_gridData.push({ ...sWkData, FUNCTION: ['download', 'modify', 'trash', 'personadd'] }));
      if (s_gridData.length == 0) {
        this.dialogRef.close();
        return this.cWkAppSvc.showMsg('불러울 워크플로우가 없습니다.', false);
      }
      this.o_gridData = s_gridData;
      let s_gridCol: IGridCol[] = [];
      for (const s_col of Object.keys(this.o_gridData[0])) {
        let s_index = this.o_displayCols.findIndex(p_val => p_val === s_col);
        if (s_index == -1) {
          s_gridCol.push({
            'NAME': s_col, 'VISIBLE': false, 'VNAME': s_col, 'TYPE': 'string'
          });
        } else {
          s_gridCol.push({
            'NAME': s_col, 'VISIBLE': true, 'VNAME': this.o_displayColNms[s_index], 'TYPE': 'string'
          });
        }
      }
      s_gridCol.forEach(s_col => {
        if (s_col.NAME == 'FUNCTION') {
          s_col.VNAME = '';
          s_col.VALUE = ['download', 'modify', 'trash', 'personadd'];
          s_col.VISIBLE = true;
          s_col.TYPE = 'string';
        }
      });
      this.o_gridCol = s_gridCol;
      this.cWpLibSvc.showProgress(false, 'wkspin');
    }, pError => {
      console.log(pError)
      this.cWpLibSvc.showProgress(false, 'wkspin');
    }))

  }

  onGridCallback(p_ev: ILoadEvent) {
    if (p_ev.eventNm == 'download') {
      this.loadWorkflow(p_ev);
    } else if (p_ev.eventNm == 'trash') {
      this.delWokrflow(p_ev);
    } else if (p_ev.eventNm == 'modify') {
      this.modifyWokrflow(p_ev);
    } else if (p_ev.eventNm == 'personadd') {
      this.authWorkflow(p_ev.element);
    } 
  }

  loadWorkflow(p_ev: ILoadEvent) {
    this.dialogRef.close({
      result: true,
      data: p_ev.element
    });
  }

  delWokrflow(p_ev: ILoadEvent) {
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: {
        'title': '알림',
        'flag': true,
        'message': `${p_ev.element.WF_NM}을 삭제하시겠습니까?`,
        'colWidthOption': 'tight'
      }
    });
    dialogRef.afterClosed().subscribe(pRes => {
      if (pRes) {
        if (pRes.result) {
          this.cWpDiagramSvc.removeWorkflow(p_ev.element.WF_ID).subscribe((p_res) => {
            this.cWkAppSvc.showMsg('삭제 완료', false);
            this.drawWkList();
          });
        }
      }
    })
  }

  modifyWokrflow(p_ev: ILoadEvent) {
    let p_data = p_ev.element
    let s_wfNm = "";
    let s_formData: any = [{
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup67"),
      name: 'WF_NM',
      value: '',
      type: 'text',
      fvalue: s_wfNm,
      visible: true,
      edit: true,
      callbak: null
    }];

    let s_popupData = {
      'title': this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup68"),
      'flag': true,
      'service': this.cMainAppSvc,
      'formdata': s_formData,
      'componentData': {
        WF_NM: s_wfNm
      },
      'colWidthOption': 'tight'
    };
    const dialogRef = this.cDialog.open(WpPopupComponent, {
      data: s_popupData
    });
    dialogRef.afterClosed().subscribe(pRes => {
      if (pRes) {
        if (pRes.result && pRes.data.WF_NM !== p_data.WF_NM) {
          // 실제 파일명 변경 기능 때문에 p_data.WF_PATH 파라미터 추가
          this.cWpDiagramSvc.changeWorkflowName(p_data.WF_ID, pRes.data.WF_NM, p_data.WF_PATH).subscribe(() => {
            this.cWkAppSvc.showMsg('수정 완료', false);
            this.drawWkList();
          });
        }
      }
    })
  }

  onClose() {
    this.dialogRef.close();
  }

  authWorkflow(p_el: any) {
    const dialogRef = this.cDialog.open(WpPopUpAuthorityComponent, { data: { 'dataset': {WF_ID: p_el.WF_ID, REG_USER_NO: p_el.REG_USER, WF_NM: p_el.WF_NM}, type: 'workflow' }, id: 'wp-popup-authority' });
  }

}
