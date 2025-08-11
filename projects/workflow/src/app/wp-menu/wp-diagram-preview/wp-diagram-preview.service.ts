import { Injectable, Output, EventEmitter } from '@angular/core';
import { WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';

@Injectable({providedIn:'root'})
export class WpDiagramPreviewService {
    constructor() { }
    @Output() sendDiagramPreviewDataEmit: EventEmitter<{ sComData: WpComData | WpComData[], sCurrDataFlag: boolean, sInputDataFlag?: boolean, sInputComId?: string }> = new EventEmitter();

    setDiagramPreviewByData(pData: { sComData: WpComData | WpComData[], sCurrDataFlag: boolean, sInputDataFlag?: boolean, sInputComId?: string }) {
        this.sendDiagramPreviewDataEmit.emit(pData);
    }
    // 다이어그램 초기화 추가(pMode: curr(현재데이터 preview), prev(이전데이터 preview), all(현재, 이전))
    initDiagramPreview(pMode:string){
        if (pMode == 'prev' || pMode == 'all')
            this.sendDiagramPreviewDataEmit.emit({'sCurrDataFlag':false, 'sComData':undefined});
        if (pMode == 'curr' || pMode == 'all')
            this.sendDiagramPreviewDataEmit.emit({'sCurrDataFlag':true, 'sComData':undefined});
    }
}