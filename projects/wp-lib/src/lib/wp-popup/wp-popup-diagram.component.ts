import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DxDiagramComponent } from 'devextreme-angular';
import { WpComponentViewerService } from 'projects/workflow/src/app/components/wp-component-viewer.service';
import { WpMetaService } from '../wp-meta/wp-meta.service';

@Component({
  selector: 'wp-popup-diagram',
  templateUrl: './wp-popup-diagram.component.html',
  styleUrls: ['./wp-popup-diagram.component.css']
})
export class WpPopupDiagramComponent implements OnInit, AfterViewInit {
  @ViewChild(DxDiagramComponent, { static: false }) hDiagramPopup!: DxDiagramComponent;
  oComTemplateData: any;
  oComponentData: any;
  oCurrentType: string = '';
  oSelectData: any;
  constructor(
    @Inject(MAT_DIALOG_DATA) public oData: {
      title: string,
      diagramData: any,
      componentData: any,
      comTempleteData: any,
    },
    public dialogRef: MatDialogRef<WpPopupDiagramComponent>,
    public cMetaSvc: WpMetaService,
    public cComViewerSvc: WpComponentViewerService
  ) { }
  ngOnInit(): void {
    this.oComTemplateData = this.oData.comTempleteData;
    this.oComponentData = this.oData.componentData;
    if (this.oComponentData) {
      this.oComponentData.forEach((sComData: any) => {
        sComData.WF_DATA = JSON.parse(sComData.WF_DATA);
      });
    }
  }
  ngAfterViewInit(): void {
    this.oData.diagramData = JSON.parse(this.oData.diagramData);
    for(var i of  this.oData.diagramData.shapes) {
      i.type = String(i.type)
    }
    this.oData.diagramData = JSON.stringify(this.oData.diagramData)
    this.hDiagramPopup.instance.import(this.oData.diagramData)
    //@ts-ignore
    $('.scrollbar').scrollbar();
    this.cComViewerSvc.setEditFlag(false);
  }
  onComponentClick(pEvent: any) {
    if (pEvent.item.itemType == "shape") {
      let sComponent = this.oData.componentData.filter((sComData: any) => sComData.COM_ID === pEvent.item.key);
      if (sComponent.length > 0) {
        this.oCurrentType = sComponent[0].WF_DATA.type;
        this.oSelectData = sComponent[0].WF_DATA;
      } else {
        this.oCurrentType = '';
        this.oSelectData = undefined;
      }
    }
  }
  onClose() {
    this.dialogRef.close();
  }
}
