import { EventEmitter, Injectable, Output } from '@angular/core';
import { DxDiagramComponent } from 'devextreme-angular';
import { IWkDataset } from '../wp-component-properties/wp-component-properties-wrap';

@Injectable({
    providedIn: 'root'
})
export class WpDiagramToolbarService {
    oTabList: { name: string, show: boolean, data: { sDiagram: string, sWpDataset: IWkDataset }, loadWkTitle: { title: string, wf_id: number } }[] = [];
    oTabIndex: number = 0;
    hDiagram: DxDiagramComponent;
    @Output() onClickBtnEmit: EventEmitter<{ eventName: string, event: Event, data: { workflowName: string } }> = new EventEmitter();

    constructor() {
        this.oTabList.push({
            name: 'Untitled',
            show: true,
            data: undefined,
            loadWkTitle: { title: '', wf_id: undefined }
        });
    }

    onClickBtn(pEventName: string, pEvent: any, pData?:any){
        this.onClickBtnEmit.emit({ eventName: pEventName, event: pEvent, data: pData });
    }
    getDiagramElem() {
        return this.hDiagram;
    }
    setDiagramElem(pElem: DxDiagramComponent) {
        this.hDiagram = pElem;
    }
    setCurrentTitle(pTitle: string) {
        this.oTabList[this.oTabIndex].name = pTitle;
    }
    getCurrentTitle() {
        return this.oTabList[this.oTabIndex].name;
    }
    setCurrentData(pData: any) {
        this.oTabList[this.oTabIndex].data = pData;
    }
    getCurrentData() {
        return this.oTabList[this.oTabIndex].data;
    }
    // 불러오기 한 워크플로우명 입력 (불러온 워크플로우를 다시 같은 이름으로 저장할 때 덮어쓰기 할 건지 물어보기 위해서)
    setLoadWkTitle(pTitle: string, pId: number) {
        this.oTabList[this.oTabIndex].loadWkTitle.title = pTitle;
        this.oTabList[this.oTabIndex].loadWkTitle.wf_id = pId;
    }
    getLoadWkTitle() {
        return this.oTabList[this.oTabIndex].loadWkTitle;
    }
    addTab(pTabData: { name: string, show: boolean, data: { sDiagram: string, sWpDataset: IWkDataset }, loadWkTitle: { title: string, wf_id: number } }) {
        this.oTabList.push({
            name: 'Untitled',
            show: false,
            data: undefined,
            loadWkTitle: { title: '', wf_id: undefined }
        });
    }
    removeTab(pIndex: number) {
        this.oTabList.splice(pIndex, 1);
        if (pIndex < this.oTabIndex) {
            this.oTabIndex--;
        }
    }
    initTab(){
        this.oTabList = [];
        this.oTabList.push({
            name: 'Untitled',
            show: true,
            data: undefined,
            loadWkTitle: { title: '', wf_id: undefined }
        }); 
    }
    getTabIndex() {
        return this.oTabIndex;
    }
    setTabIndex(pIndex: number) {
        this.oTabList.forEach((sTab: any, sTabIndex: number) => {
            if (sTabIndex == pIndex) {
                sTab.show = true;
            }
            else {
                sTab.show = false;
            }
        });
        this.oTabIndex = pIndex;
    }
}
