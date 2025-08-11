import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { WorkflowAppService } from '../../app.service';
import { WpDiagramService } from '../../wp-diagram/wp-diagram.service';
import { WpDiagramPreviewService } from './wp-diagram-preview.service';
import { WpComponentViewerService } from "../../components/wp-component-viewer.service";
import { Subscription } from 'rxjs';
import { WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { TranslateService } from '@ngx-translate/core';
declare const $: any;

@Component({
  selector: 'lib-wp-diagram-preview',
  templateUrl: './wp-diagram-preview.component.html',
  styleUrls: ['./wp-diagram-preview.component.css']
})
export class WpDiagramPreviewComponent implements OnInit, OnDestroy {
  @Input() iDiagramPreviewType: string; //before : 과거 컴포넌트 preview , current : 현재 컴포넌트 preview
  @Input() iStyle: any; //Style 
  hTitle: string = '';
  oPrevDataSchema: any;
  oCurrDataSchema: any;
  oGridData: any;
  oMultiParentFlag: any;
  oPreviewFlag: any;
  oCurrFlag: boolean;
  oPrevFlag: boolean;
  oGridCol: any;
  // oDisplayedColumns:string[];
  // oDisplayedColumnNms:string[];
  oColNameMap: { [index: string]: string };
  h_EditFlag: boolean = true;
  oSubs: Subscription[] = [];
  constructor(
    private cWpDiagramPreviewSvc: WpDiagramPreviewService,
    private cWpDiagramSvc: WpDiagramService,
    private cWpComViewerSvc: WpComponentViewerService,
    private cAppSvc: WorkflowAppService,
    private cTransSvc: TranslateService) {
  }
  ngOnInit(): void {
    this.oPrevDataSchema = [];
    this.oCurrDataSchema = [];
    this.oCurrFlag = false;
    this.oPrevFlag = false;
    this.oMultiParentFlag = false;  // 데이터의 parentId가 2개 이상인 경우 true
    if (this.iDiagramPreviewType == 'before') {
      this.hTitle = 'Before';
    }
    if (this.iDiagramPreviewType == 'current') {
      this.hTitle = 'Current';
    }
    this.oSubs.push(
      this.cWpComViewerSvc.setEditFlagEmit.subscribe(pFlag => {
        this.h_EditFlag = pFlag;
      })
    );
    this.oSubs.push(
      this.cWpDiagramPreviewSvc.sendDiagramPreviewDataEmit.subscribe(pData => {
        if (this.h_EditFlag) {
          let sWpNodeArray = this.cWpDiagramSvc.getWpNodes();
          if (!this.oColNameMap) {
            this.oColNameMap = this.cWpDiagramSvc.getComNameMap();
          }
          // 현재 컴포넌트의 데이터 스키마
          if (pData.sCurrDataFlag) {
            if (typeof pData.sComData == 'undefined') {
              this.oCurrFlag = false;
              this.oCurrDataSchema = [];
            }
            else {
              let sCurrComData = JSON.parse(JSON.stringify(pData.sComData));
              // let sCurrComType = pData.sInputDataFlag? 'I-DATASOURCE' : pData.sComData.type;
              let sComId = pData.sInputDataFlag ? pData.sInputComId : (pData.sComData as WpComData).id;
              let sWpNode = sWpNodeArray.find(sItem => sItem.id === sComId)
              sCurrComData.schema.forEach((sCol: any) => {
                // sCol['component'] = this.oColNameMap[sCurrComType];
                sCol['component'] = sWpNode.text;
                sCol['jobId'] = sWpNode.jobId; // jobId 추가
              });
              this.oCurrDataSchema = sCurrComData.schema ? sCurrComData.schema : [];
              this.oCurrFlag = this.oCurrDataSchema.length !== 0 ? true : false;
            }
          }
          // 이전 컴포넌트의 데이터 스키마
          else {
            if (typeof pData.sComData == 'undefined') {
              this.oPrevFlag = false;
              this.oPrevDataSchema = [];
            }
            else {
              let sPrevComData = JSON.parse(JSON.stringify(pData.sComData));
              let sTmpPrevDataSchema: any[] = [];
              if (sPrevComData.length > 0) {
                this.oMultiParentFlag = sPrevComData.length == 2 ? true : false;

                for (let i = 0; i < sPrevComData.length; i++) {
                  let sComId = (pData.sComData as WpComData[])[i].id;
                  let sWpNode = sWpNodeArray.find(sItem => sItem.id === sComId)
                  // let sPrevComType = pData.sComData[i]['type'];
                  sPrevComData[i].schema.forEach((sCol: any) => {
                    // sCol['component'] = this.oColNameMap[sPrevComType];
                    sCol['component'] = sWpNode.text;
                    sCol['jobId'] = sWpNode.jobId; // jobId 추가
                    if (this.oMultiParentFlag) {
                      sCol['fileName'] = `${String((pData.sComData as WpComData[])[i]['name']).replace(".csv", "")}`;
                    }
                    sTmpPrevDataSchema.push(sCol);
                  });
                }
              }
              this.oPrevDataSchema = sTmpPrevDataSchema ? sTmpPrevDataSchema : [];
              this.oPrevFlag = this.oPrevDataSchema.length !== 0 ? true : false;
            }
          }
          let sColInfo: any = [];
          if (this.iDiagramPreviewType == 'before') {
            this.oGridData = this.oPrevDataSchema;
            this.oPreviewFlag = this.oPrevFlag;
            if (this.oMultiParentFlag) {
              // this.oDisplayedColumns =  ['component','fileName','name','type'];
              // this.oDisplayedColumnNms = ['컴포넌트', '파일명', this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2") ];
              sColInfo = [
                { NAME: 'name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), TYPE: 'string' },
                { NAME: 'type', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2"), TYPE: 'string' },
                { NAME: 'component', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid3"), TYPE: 'string' },
                { NAME: 'jobId', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid4"), TYPE: 'string' },
                // { NAME: 'fileName', VISIBLE: true, VNAME: '파일명', TYPE: 'string' }
              ];
            }
            else {
              // this.oDisplayedColumns =  ['component','name','type'];
              // this.oDisplayedColumnNms = ['컴포넌트', this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2")];
              sColInfo = [
                { NAME: 'name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), TYPE: 'string' },
                { NAME: 'type', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2"), TYPE: 'string' },
                { NAME: 'component', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid3"), TYPE: 'string' },
                { NAME: 'jobId', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid4"), TYPE: 'string' },
              ];
            }
          }
          else if (this.iDiagramPreviewType == 'current') {
            this.oGridData = this.oCurrDataSchema;
            this.oPreviewFlag = this.oCurrFlag;
            // this.oDisplayedColumns =  ['component','name','type'];
            // this.oDisplayedColumnNms = ['컴포넌트', this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2")];
            sColInfo = [
              { NAME: 'name', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid1"), TYPE: 'string' },
              { NAME: 'type', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid2"), TYPE: 'string' },
              { NAME: 'component', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid3"), TYPE: 'string' },
              { NAME: 'jobId', VISIBLE: true, VNAME: this.cTransSvc.instant("WPP_WORKFLOW.GRID.grid4"), TYPE: 'string' },
            ];  
          }
          this.oGridCol = sColInfo;
        }
        // 워크플로우 하단 사이즈 조절할때 표 스크롤 되도록 함.
        setTimeout(() => {
          let previewElem: HTMLElement = document.querySelector('#wp-diagram-preview-before')
          let currviewElem: HTMLElement = document.querySelector('#wp-diagram-preview-current')
          let panelItem = document.querySelector('.panel-grid.resizable-vertical.ui-resizable')
          if (panelItem) {
            let previewViewerMaxHeight = window.innerHeight - panelItem.clientHeight - 100;
            if (previewElem) {
              previewElem.style.maxHeight = `${previewViewerMaxHeight}px`
            }
            if (currviewElem) {
              currviewElem.style.maxHeight = `${previewViewerMaxHeight}px`
            }
          }
        }, 100);
      })
    );
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    });
  }
}
