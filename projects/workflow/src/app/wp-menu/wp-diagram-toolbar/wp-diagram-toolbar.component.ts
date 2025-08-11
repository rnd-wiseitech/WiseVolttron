import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { WorkflowAppService } from '../../app.service';
import { WpComponentViewerService } from '../../components/wp-component-viewer.service';
import { WpDiagramService } from '../../wp-diagram/wp-diagram.service';
import { IWkDataset, WpNodePro } from '../wp-component-properties/wp-component-properties-wrap';
import { WpUserParameterComponent } from '../wp-user-parameter/wp-user-parameter.component';
import { WpDiagramToolbarService } from './wp-diagram-toolbar.service';
import { MainAppService } from 'projects/main/src/app/app.service';

@Component({
    selector: 'lib-wp-diagram-toolbar',
    templateUrl: './wp-diagram-toolbar.component.html',
    styleUrls: ['./wp-diagram-toolbar.component.css']
})
export class WpDiagramToolbarComponent implements OnInit {
    h_tabList: { name: string, show: boolean, data: { sDiagram: string, sWpDataset: IWkDataset }, loadWkTitle: { title: string, wf_id: number } }[] = [];
    constructor(
        public cWpDiagramSvc: WpDiagramService,
        private cAppSvc: WorkflowAppService,
        private cWpComViewerSvc: WpComponentViewerService,
        private cDialog: MatDialog,
        private cWpDiagramToolbarSvc: WpDiagramToolbarService,
        private cMainAppSvc: MainAppService,
    ) {
        this.h_tabList = this.cWpDiagramToolbarSvc.oTabList;
    }
    ngOnInit(): void { }
    async onClickHeaderBtn(pAction: string) {
        if (pAction == 'parameter') {
            const dialogRef = this.cDialog.open(WpUserParameterComponent, {
                id: "wp-user-parameter-popup"
            });
        }
        let sComId = this.cWpComViewerSvc.getComId();
        let sComData = this.cAppSvc.getComData(sComId);
    // (refresh) 새로고침
        if (pAction == 'refresh') {
            const dialogRef = this.cDialog.open(WpPopupComponent, {
                data: {
                    'title': 'Message',
                    'flag': true,
                    'message': '워크플로우를 초기화 하겠습니까?',
                    'colWidthOption': 'tight'
                }
            });
            dialogRef.afterClosed().subscribe(async result => {
                if (result && result.result) {
                    await this.cWpDiagramSvc.clearWpDiagram();
                }
            });
            return;
        }
        // (prev) 뒤로 가기 
        if (pAction == 'prev') {
            if (sComData.hasOwnProperty('parentId') && sComData.parentId.length > 0) {
                this.cWpDiagramSvc.selectComponentById(sComData.parentId[0]);
            }
            return;
        }
        // (next) 앞으로 가기
        if (pAction == 'next') {
            let sChildComponent = this.cWpDiagramSvc.getWpNodes().filter((sEdge: WpNodePro) => sEdge.parentId.includes(sComId));
            if (sChildComponent.length > 0) {
                this.cWpDiagramSvc.selectComponentById(sChildComponent[0].id);
            }
            return;
        }
        if (sComData) {
            // (last) 맨 끝으로 가기
            if (pAction == 'last') {
                let sEndCompFlag: boolean = false;
                while (!sEndCompFlag) {
                    sEndCompFlag = true;
                    let sChildComponent = this.cWpDiagramSvc.getWpNodes().filter((sEdge: WpNodePro) => sEdge.parentId.includes(sComId));
                    if (sChildComponent.length > 0) {
                        sComId = sChildComponent[0].id;
                        sEndCompFlag = false;
                    }
                }
                this.cWpDiagramSvc.selectComponentById(sComId);
                return;
            }
        }
        return;
    }

    onClickToolBtn(pName: string, pEvent: any) {
        if (pName == 'save') {
            let sWorkflowName = this.cWpDiagramToolbarSvc.getCurrentTitle();
            let sLoadWkName = this.cWpDiagramToolbarSvc.getLoadWkTitle();
            this.cWpDiagramToolbarSvc.onClickBtn(pName, pEvent, { workflowName: sWorkflowName, loadWkTitle: sLoadWkName });
        }
        else {
            this.cWpDiagramToolbarSvc.onClickBtn(pName, pEvent);
        }
    }
    onAddTab() {
        this.cWpDiagramToolbarSvc.addTab({
            name: 'Untitled',
            show: false,
            data: undefined,
            loadWkTitle: { title: '', wf_id: undefined }
        })
    }
    onChangeTabName(pIndex: number) {
        const dialogRef = this.cDialog.open(WpPopupComponent, {
            data: {
                'title': '워크플로우 이름 변경',
                'flag': true,
                'service': this.cMainAppSvc,
                'formdata': [{
                    vname: '워크플로우명',
                    name: 'workflowName',
                    value: '',
                    type: 'text',
                    fvalue: '',
                    visible: true,
                    edit: true
                }],
                'btnText': 'confirm',
            }
        });
        dialogRef.beforeClosed().subscribe(pResult => {
            if (pResult && pResult.result) {
                this.cWpDiagramToolbarSvc.setCurrentTitle(pResult.data.workflowName);
            }
        });
    }
    async onMoveTab(pIndex: number) {
        let sTabIndex = this.cWpDiagramToolbarSvc.getTabIndex();
        if (sTabIndex !== pIndex) {
            // save old data
            let sDiagram: string = this.cWpDiagramToolbarSvc.getDiagramElem().instance.export();
            let sWpDataset = this.cAppSvc.getWpData();
            sWpDataset = JSON.parse(JSON.stringify(sWpDataset)); // deep copy
            this.cWpDiagramToolbarSvc.setCurrentData({ sDiagram, sWpDataset });
            this.cAppSvc.initWpData();
            // 탭 변경 처리
            this.cWpDiagramToolbarSvc.setTabIndex(pIndex);
            // 변경한 탭에 기존 다이어그램이 있는 경우.
            let sTabData = this.cWpDiagramToolbarSvc.getCurrentData();
            if (sTabData) {
                // sWpDataset 불러오기
                let { sDiagram, sWpDataset } = sTabData;
                this.cAppSvc.setWkId(sWpDataset.WorkFlowId);
                this.cAppSvc.setCurrentDataId(sWpDataset.CurrentDataId);
                Object.keys(sWpDataset.Datas).forEach((sKey: any) => {
                    this.cAppSvc.setWpData(sWpDataset.Datas[sKey]);
                });
                // sDiagram 불러오기
                this.cWpDiagramSvc.loadWorkFlow({ sDiagram: JSON.parse(sDiagram), sWpDataset: Object.values(sWpDataset.Datas) }, 'changeTab');
            } else {
                // 기존 저장된 다이어그램이 없는 경우. clearWpDiagram를 먼저 하면 기존 저장된 title이 사라지므로 index를 먼저 변경
                await this.cWpDiagramSvc.clearWpDiagram();
            }
        }
    }
    onRemoveTab(pIndex: number) {
        this.cWpDiagramToolbarSvc.removeTab(pIndex);
    }
}
