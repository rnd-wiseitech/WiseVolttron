import { AfterViewInit, Component, OnInit } from '@angular/core';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WorkflowAppService } from './app.service';
import { v4 as uuidv4 } from 'uuid';
import { setCOM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
export interface ICOM { ID: number; TYPE: string; CATEGORY: string;NAME: string;DATA: string;IMG_PATH: string;URL: string;DESC: string; DISPLAY: boolean; CONN_LIMIT: number; };
@Component({
  selector: 'workflow-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class WorkflowAppComponent implements OnInit, AfterViewInit {
  title = 'workflow';
  oComTemplateData:any;

  constructor(public cMetaSvc:WpMetaService,
              private cAppSvc:WorkflowAppService
              ){
  }
  ngAfterViewInit(): void {
    // resizePanel()
    $(window).on('resize', function () {
      const resizableMaxHeight = window.innerHeight - 300;
      //@ts-ignore
      $(".resizable-vertical").resizable({
        handles: 's',
        // maxWidth: 500,
        // minWidth: 0,
        maxHeight: resizableMaxHeight,
        minHeight: 300,
      })
      // 하단 component preview 사이즈 때문에 수정
      let previewElem: HTMLElement = document.querySelector('#wp-diagram-preview-before');
      let currviewElem: HTMLElement = document.querySelector('#wp-diagram-preview-current');
      let panelItem = document.querySelector('.panel-grid.resizable-vertical.ui-resizable');
      if (panelItem) {
        let previewViewerMaxHeight = window.innerHeight - panelItem.clientHeight - 100;
        if (previewElem) {
          previewElem.style.maxHeight = `${previewViewerMaxHeight}px`;
        }
        if (currviewElem) {
          currviewElem.style.maxHeight = `${previewViewerMaxHeight}px`;
        }
      }
    }).trigger('resize');
  }
  ngOnInit(): void {
    // this.sendGetRequest();
    this.cAppSvc.setWkId(uuidv4());
    this.cMetaSvc.getComList().subscribe(e=>{
      e = e.filter((sCom:any) => sCom.DISPLAY == 'true');
      this.oComTemplateData = e;

      // 컴포넌트 TYPE - ID 매핑 초기화
      this.oComTemplateData.map((c: any) => setCOM_ID(c.TYPE, c.ID, c.CATEGORY));
    });
  }
}
