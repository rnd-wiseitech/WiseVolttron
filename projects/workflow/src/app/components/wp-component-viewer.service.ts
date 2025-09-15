import { HttpClient } from '@angular/common/http';
import { Injectable, Output, EventEmitter } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { Observable } from 'rxjs';
import { WorkflowAppService } from '../app.service';
import { WpComData, WpPropertiesWrap } from '../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpPropertiesService } from '../wp-menu/wp-component-properties/wp-component.properties.servie';
import { JOB_DATA_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';

@Injectable({providedIn:'root'})
export class WpComponentViewerService extends WpSeriveImple {
    constructor(
        private cAppConfig: WpAppConfig,
        private cHttp: HttpClient,
        private cWpLibSvc: WpLoadingService,
        private cAppSvc: WorkflowAppService,
        private cWpPropSvc: WpPropertiesService,
        private cWpSocketSvc: WpSocket,
    ) {
        super(cAppConfig);
    }
    @Output() selectDataEmit: EventEmitter<WpComData> = new EventEmitter();
    @Output() onDisplayResultViewerEmit: EventEmitter<{ initJob: { jobList: {[index:string]: JOB_DATA_ATT}, step_count: number }, trainModelFlag: boolean }> = new EventEmitter();
    @Output() onCloseViewerEmit: EventEmitter<any> = new EventEmitter();
    @Output() onOpenViewerEmit: EventEmitter<any> = new EventEmitter();
    @Output() onInitDataEmit: EventEmitter<string> = new EventEmitter();
    @Output() showDiagramPreviewEmit: EventEmitter<{ comId: string | string[], currDataFlag: boolean }> = new EventEmitter();
    @Output() setViewerTrainModelComIdListEmit: EventEmitter<any> = new EventEmitter();
    @Output() setEditFlagEmit: EventEmitter<boolean> = new EventEmitter();
    @Output() setInfoFormDataEmit: EventEmitter<WpPropertiesWrap[]> = new EventEmitter();

    oCurrentComId = '';
    oUrl = this.cAppConfig.getServerPath("NODE");
    o_apiType = this.cAppConfig.getConfig('API_TYPE');
    o_fileFormat = this.cAppConfig.getConfig('FILE_FORMAT')
    setComId(pComId:string){
      this.oCurrentComId = pComId;
    }
    getComId(){
      return this.oCurrentComId;
    }
    selectData(pData: WpComData) {
      this.selectDataEmit.emit(pData);
    }
    getDataSchema(pParam:any) : Observable<any>{
        return this.cHttp.post(this.oUrl + '/jobexcute/select', pParam);    
    }
    getDataSourceList(pParam:Object = null){
        return this.cHttp.post(this.oUrl + '/wd/dataViewList', pParam).toPromise().then(p=>{
            let sFileList:any =  p;
            let sTmpFileList = []
            // #23 출력 관련 수정(통계 분석이 완료된 데이터만 선택 가능하도록 수정)
            for(let sRow of sFileList){
                
                // VIEW_IDX가 0 이면 기능 작동 안해서 수정
                if (sRow.VIEW_IDX !== null && sRow.VIEW_IDX !== undefined) {   
               // #95. 파일 형식 추가.
                    // 파일이름만 넣는 것이 아닌 json으로 filename과 filetype을 push
                    // #109 VIEW_ID 저장
                    sTmpFileList.push({
                        filename: sRow.DS_VIEW_NM, 
                        viewidx: sRow.VIEW_IDX,
                        filetype: sRow.DS_FILE_FORMAT,
                        viewid: sRow.DS_VIEW_ID,
                        userno: sRow.REG_USER_NO, 
                        appSvcIp: sRow.APP_SVC_IP, 
                        appSvcPort: sRow.APP_SVC_PORT 
                    });
                }
            }
            return sTmpFileList;
        });
    }
    // #37 공유 데이터셋 조회
    getSharedDataList(){
        return this.cHttp.post(this.oUrl + '/wd/dataViewList', {}).toPromise().then(p => {
            let sSharedFileList:any = p;
            let sTmpSharedFileList = [];
            for (let sRow of sSharedFileList){
                // 데이터셋 0번 부터 시작하는 걸로 변경되어서 sRow.VIEW_IDX 가 0 이면 데이터셋 조회가 안됨
                if (sRow.VIEW_IDX !== null && sRow.VIEW_IDX !== undefined && sRow.AUTHORITY == '공유') {
                    sTmpSharedFileList.push({ 
                        filename: sRow.DS_VIEW_NM, 
                        viewidx: sRow.VIEW_IDX,
                        filetype: sRow.DS_FILE_FORMAT,
                        viewid: sRow.DS_VIEW_ID,
                        userno: sRow.REG_USER_NO,
                        appSvcIp: sRow.APP_SVC_IP, 
                        appSvcPort: sRow.APP_SVC_PORT 
                    });
                }
            }
            return sTmpSharedFileList;
        }); 
    }
    getHdfsFileList(){
        // #70 포트변경
        return this.cHttp.get(this.oUrl + '/jobexcute/test').toPromise().then(p=>{
            let sFileList:any =  JSON.parse(p.toString()).FileStatuses.FileStatus;
            let sTmpFileList = [];
            for(let sIdx in sFileList){
                sTmpFileList.push(sFileList[sIdx].pathSuffix);
            }
            return sTmpFileList;
        });      
    }
    showResultViewer(pInitJob: { jobList: {[index:string]: JOB_DATA_ATT}, step_count: number }, pTrainModelFlag: boolean) {
        this.onDisplayResultViewerEmit.emit({ initJob: pInitJob, trainModelFlag: pTrainModelFlag });
    }
    onOpenViewer() {
        this.onOpenViewerEmit.emit();
    }
    onCloseViewer(){
        this.onCloseViewerEmit.emit();
        // viewer 닫을 때 property도 초기화함.
        this.cWpPropSvc.initProperties();
    }
    showMsg(pMsg:string, pFlag:boolean){
        this.cAppSvc.showMsg(pMsg, pFlag);
    }
    /**
     * diagram data 초기화  
     * diagram에 연결되어있는 하위 컴포넌트를 모두 초기화한다. (pId가 없으면)
     * {@link WpComponentViewerService | WpComponentViewerService} 의 {@link WpComponentViewerService.onInitData | onInitData}를 호출한다.
     * @params {string} [pId] - 특정 Id 의 컴포넌트의 데이터만 초기화한다.
     * @example
     * ```ts
     * this.cWpComViewerSvc.onInitData()
     * // or
     * this.cWpComViewerSvc.onInitData('component_id')
     * ```
     */
    onInitData(pId?: string){
        this.onInitDataEmit.emit(pId);
    }
    setViewerTrainModelComIdList() {
        this.setViewerTrainModelComIdListEmit.emit();
    }
    setEditFlag(pFlag: boolean){
        this.setEditFlagEmit.emit(pFlag);
    }
    // 속성창에서 Event가 발생한 ElemId, ComId, TabIdx(+ 속성으로 늘릴 수 있는 항목 중 몇 번째인지) (이상치, null, date, type 에서 공통 사용으로 통합)
    getCurrentTabInfo(pEvent:any, pSelectQuery?:string){
        let sComId:string;
        let sTabIdx: number;
        let sElem: HTMLElement;
        if (pSelectQuery){
            sElem = document.querySelector(pSelectQuery).closest(".inputAddedItem");
        } else {
            sElem = pEvent.element ? pEvent.element : pEvent.currentTarget;
            sElem = sElem.closest(".inputAddedItem");
        }
        sComId = sElem.getAttribute('comid');
        let tmpTabIdx = sElem.getAttribute('tableindex');
        if (tmpTabIdx !== "") {
            sTabIdx = Number(tmpTabIdx);
        } else {
            sTabIdx = -1
        }
        return {sComId, sTabIdx};
    }
    // #10 Diagram Preview 
    showDiagramPreview(pCompId: string | string[], pCurrDataFlag: boolean) {
        this.showDiagramPreviewEmit.emit({comId : pCompId, currDataFlag : pCurrDataFlag});
    }
    // #154 선택한 컬럼의 unique column value
    getColDistinctValue(pData: { groupId: string, jobId: string, target_column: string }) {
        return new Promise((resolve, reject) => {
            this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getDistinctValue', pData).toPromise()
            .then((response) => {
                resolve(response);
            }, pError => {
                reject(pError);
            });
        });
    }
    showProgress(pValue:boolean, pName?:string){
        if (pName)
          this.cWpLibSvc.showProgress(pValue, pName);
        else
          this.cWpLibSvc.showProgress(pValue,'wkspin');
    }
    setInfoFormData(pFormData: WpPropertiesWrap[]) {
        this.setInfoFormDataEmit.emit(pFormData);
    }

    getInputWorkflowList() {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getInputWorkflowList', {}).toPromise().then(p_result=>{
            console.log("p_result : ", p_result);
            return p_result
        });
    }

    getInputWorkflowInfo(p_data:any) {
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getInputWorkflowInfo', p_data).toPromise().then(p_result=>{
            console.log("p_result : ", p_result);
            return p_result
        });
    }

    // 차트데이터 실행
    getChartData(p_param: any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/chart', p_param);    
    }

    getTransformList(): Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wkservice/getTransformList', {});    
    } 

    async getArgInfo(p_argId: string): Promise<Observable<any>>{        
        let s_modelInfo:any = await this.cHttp.post(this.oNodeUrl + '/model/getArgInfo', {ARG_ID: p_argId}).toPromise();
        return s_modelInfo;
    }
        
    async getDatasetColumnCheck(p_param: any){
        let s_columnCheckResult = await this.cHttp.post(this.oNodeUrl + '/jobexcute/function', p_param).toPromise().then(p_result=>{
            console.log("p_result : ", p_result);
            return p_result
        });
        return s_columnCheckResult
    }
}