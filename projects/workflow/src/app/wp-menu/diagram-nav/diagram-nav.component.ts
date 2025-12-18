import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { Component, ElementRef, OnInit, ViewChild ,Input, Output, EventEmitter} from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
declare const $: any;
@Component({
  selector: 'lib-diagram-nav',
  templateUrl: './diagram-nav.component.html',
  styleUrls: ['./diagram-nav.component.css']
})
export class DiagramNavComponent implements OnInit {
  @Input() hLalbelNm:any;
  @Output() onChangSwitchEvent = new EventEmitter<boolean>();
  @ViewChild('hSwitchEf')
  oSwitchEf!: ElementRef;
  h_tapId: 'data' | 'model' | 'undata';
  o_offerModel:any = [];
  constructor(private cScrollDispatcher: ScrollDispatcher,
    private cAppConfig:  WpAppConfig
  ) { 
    this.o_offerModel = this.cAppConfig.getConfig('OFFER_MODEL');
  }

  ngOnInit(): void {
    this.cScrollDispatcher.scrolled().pipe(
    ).subscribe((event: any) => {
    });
    $('.scrollbar').scrollbar();
    this.h_tapId = 'data';
    this.onTabClick(this.h_tapId);
  }
  onTabClick(pTabNm: 'data' | 'model' | 'undata') {
    this.h_tapId = pTabNm;
    // 워크플로우 탭 선택시 나오는 컴포넌트 구분하는 부분
    
    let h_dataTabIdList = ["#data_input_items", "#data_change_items", "#data_output_items"];
    
    let h_modelTabIdList = [
      ...this.o_offerModel.map((model:any) => `#${model}_items`),
      "#model_management_items",
      "#model_predict_items"
    ];
    let h_undataTabIdList = ["#image_input_items", "#image_change_items", "#image_output_items"];

    h_dataTabIdList.forEach(sTabId => {
      (document.querySelector(sTabId) as HTMLElement).style['display'] = this.h_tapId == 'data'? '' : 'none';
    });
    console.log("h_modelTabIdList : ", h_modelTabIdList);
    h_modelTabIdList.forEach(sTabId => {
      (document.querySelector(sTabId) as HTMLElement).style['display'] = this.h_tapId == 'model' ? '' : 'none';
    });

    h_undataTabIdList.forEach(sTabId => {
      (document.querySelector(sTabId) as HTMLElement).style['display'] = this.h_tapId == 'undata' ? '' : 'none';
    });
  }
  getCategoryList(pKey?: string,pValue?: string){
    let sList:any;

    return sList;       
}
}
