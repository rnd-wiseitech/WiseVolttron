import { HttpClient } from '@angular/common/http';
import { Injectable, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpPopupDiagramComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-diagram.component';
import { Observable } from 'rxjs';
import { WorkflowAppService } from '../app.service';
import { WpStreamingService } from '../components/data/wp-streaming/wp-streaming.service';
import { WpComponentViewerService } from '../components/wp-component-viewer.service';
import { dxDiagramData, WkSaveData, WpEdgePro, WpNodePro } from '../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WF_MSTR_ATT } from 'projects/wp-server/metadb/model/WF_MSTR';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
import { ICOM } from './wp-diagram.component';

let wpNodes: WpNodePro[] = [];
let wpEdges: WpEdgePro[] = [];

@Injectable({ providedIn: 'root' })
export class WpDiagramService extends WpSeriveImple {
  @Output() showValidDiagPreviewEmit: EventEmitter<any> = new EventEmitter();
  @Output() sendJobCallResultEmit: EventEmitter<any> = new EventEmitter();
  @Output() excuteCurrentDiagramEmit: EventEmitter<any> = new EventEmitter();
  @Output() excuteSelectDataEmit: EventEmitter<any> = new EventEmitter();
  @Output() loadWorkFlowEmit: EventEmitter<{
    sDiagram?: dxDiagramData, sLoadComData?: WpComData[], pType?: string, pId?: string, pData?: { pViewId: string | number, pViewIdx: string | number } | { data: WF_MSTR_ATT }
  }> = new EventEmitter();
  @Output() loadWorkFlowByViewIdEmit: EventEmitter<{ pViewId: string | number, pViewIdx: string | number }> = new EventEmitter();
  @Output() chkConnectFilterTextEmit: EventEmitter<any> = new EventEmitter();
  @Output() selectComponentByIdEmit: EventEmitter<any> = new EventEmitter();
  @Output() clearWpDiagramEmit: EventEmitter<any> = new EventEmitter();
  @Output() sendReinforcementResultEmit: EventEmitter<any> = new EventEmitter(); //280강화학습
  
  private oTrainModelComIdList: number[] = [];
  private oComNameMap: { [index: string]: string }; // 컴포넌트 type으로 name 조회하도록 추가
  oUrl = this.cAppConfig.getServerPath("NODE");
  oWpDiagramPushFlag: boolean = false; // ArrayStore push로 직접 데이터 변경한 경우
  oWpDiagramLoadFlag: boolean = false; // 워크플로우 불러온 경우
  oWpComTemplateData: any = [];
  // oTempFtpFileNameList: string[] = []; // ftp 컴포넌트에서 조회한 파일명
  constructor(
    private cAppConfig: WpAppConfig,
    private cAppSvc: WorkflowAppService,
    private cComViewSvc: WpComponentViewerService,
    private cHttp: HttpClient,
    private cWpStreamingSvc: WpStreamingService,
    private cMetaSvc: WpMetaService,
    private cRouter: Router,
    private cDialog: MatDialog,
  ) {
    super(cAppConfig);
  }
  setComTemplateData(pData: any) {
    this.oWpComTemplateData = pData;
  }
  getComTemplateData() {
    return this.oWpComTemplateData;
  }
  saveJob(pParam: any): Observable<any> {
    const headers = { 'content-type': 'application/json' };

    return this.cHttp.post(this.oUrl + '/metaservice/saveJob', pParam, { 'headers': headers });
  }
  excuteJob(pClientId: string, pJobId: string, pParam: any, pWkSaveData: any, pMode: string): Observable<any> {
    const headers = { 'content-type': 'application/json' };
    // #70 포트변경 #121 워크플로우 저장 데이터 추가
    return this.cHttp.post(this.oUrl + "/jobexcute", { clientId: pClientId, jobId: pJobId, data: pParam, wkSaveData: pWkSaveData, mode: pMode }, { 'headers': headers });
  }
  // #154 파생열 조건부 컴포넌트에 연결된 컴포넌트들 실행하기 위해 추가
  excuteCurrentDiagram(pData: any) {
    this.excuteCurrentDiagramEmit.emit(pData);
  }
  // #154 데이터 선택만 실행(viewid 생성)
  excuteSelectData() {
    this.excuteSelectDataEmit.emit();
  }
  sendJobCallResult(pData: any) {
    this.sendJobCallResultEmit.emit(pData);
  }
  // 워크플로우 저장
  saveWorkflow(pData: WkSaveData): Observable<any> {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/saveWorkflow', pData);
  }
  // #80 워크플로우 불러오기 (저장된 워크플로우 리스트 불러오기)
  getWorkflowList(pData?: { wfId?: string, viewId?: number, viewIdx?: number, pageNum?: number, preview?: boolean}): Observable<any> {
    if (pData)
      return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getWorkflowList', pData);
    else
      return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getWorkflowList', {});
  }
  // 워크플로우 불러오기 (워크플로우 ID 기준으로 저장된 워크플로우 상세 ComData 불러오기)
  getWorkflowComInfo(pData: { wfId: number, regUser: number }): Observable<any> {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getWorkflowComInfo', pData);
  }
  // 워크플로우 삭제
  removeWorkflow(pWkId: number) {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/editWorkflow', { wfId: pWkId, delYN: 'Y' });
  }
  // 워크플로우 이름 변경, 실제 파일명 변경 기능 때문에 wfPath 파라미터 추가
  changeWorkflowName(pWkId: number, pWkName: string, pWkPath:string) {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/editWorkflow', { wfId: pWkId, wfNm: pWkName, wfPath : pWkPath});
  }
  getUseDataInfo(pOption: { DS_VIEW_ID: string[] }): Observable<any> {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewUseDataInfo', { sOption: pOption });
  }
  // #117 DS_VIEW_ID 기준으로 데이터 확인
  // 확인하려는 컴포넌트 데이터만 받아서 체크할 경우
  chkInputFileChanged(pComList: WpComData[]): Promise<{ success: boolean, message: string, changedComList?: WpComData[], changeNameObj?: {[index:string]:string} }> {
    return new Promise(async (resolve, reject) => {
      console.log("pComList : ", pComList);
      let tmp = await this.cComViewSvc.getDataSourceList();
      let sViewFileObj: { [index: string]: { viewidx: number, filename: string} } = {};
      tmp.forEach(pFileInfo => {
        sViewFileObj[pFileInfo.viewid] = { viewidx: pFileInfo.viewidx, filename: pFileInfo.filename };
      })

      let sValidFlag = true;
      let sNmChangeFlag = false;
      let sNmObj: { [index: string]: any } = {}; // key-oldName, value-NewName
      
      for await (const sCom of pComList) {
        if (sCom.type == COM_ID['I-DATASOURCE']) {
          let sUiData = sCom['wp-data']['o_data']
          // viewId 체크
          if (!Object.keys(sViewFileObj).includes(String(sUiData['filename']))) {
            sValidFlag = false;
          }
          // 파일명 변경 여부 
          let sOldFileNm = sUiData['originalname']; // 저장 시점 파일명
          let sNewFileNm = sViewFileObj[sUiData['filename']]['filename']; // 현재 파일명
          sNmObj[sOldFileNm] = sNewFileNm;
          if (sOldFileNm != sNewFileNm) {
            sNmChangeFlag = true;
            sCom.name = sNewFileNm;
            sUiData['originalname'] = sNewFileNm;
          }
        }
        if (sCom.type == COM_ID['I-STREAMING']) {
          let sTopicList = await this.cWpStreamingSvc.getTopicList().toPromise();
          if (!sTopicList.includes(sCom['wp-data']['o_data']['filename'])) {
            sValidFlag = false;
          }
        }
      }

      if (sValidFlag) {
        if (sNmChangeFlag)
          resolve({ success: true, message: '', changedComList: pComList, changeNameObj: sNmObj });
        else
          resolve({ success: true, message: '' });
      }
      else {
        resolve({ success: false, message: '데이터가 존재하지 않습니다. 입력 데이터를 다시 설정해 주세요' });
      }
    })
  }
  // I-DATASOURCE 컴포넌트에서 저장한 데이터와 DB에 있는 데이터의 컬럼 정보가 동일한지 확인
  async chkLoadFileCol(pCom: WpComData) {
    console.log("pCom : ", pCom);
    try {
      let sColValidFlag;
      let sSelectData;
      // 저장시점의 컬럼명이 불러오는 시점의 컬럼명과 동일한지 확인. 불러오는 시점에 데이터가 없거나 컬럼 변동되면 false를 return
      let sUiData = pCom['wp-data']['o_data'];
      if (pCom['type'] == COM_ID['I-IMAGE-STORAGE'] || pCom['type'] == COM_ID['I-IMAGE-DATASOURCE'] || pCom['type'] == COM_ID['I-DATASOURCE'] || pCom['type'] == COM_ID['I-HDFS'] || pCom['type'] == COM_ID['I-FTP'] || pCom['type'] == COM_ID['I-HIVE'] || pCom['type'] == COM_ID['I-DATABASE'] || pCom['type'] == COM_ID['I-STORAGE'] || pCom['type'] == COM_ID['I-API']) {
        let sParam: any = {
          action: pCom['wp-data']['o_action'],
          method: pCom['wp-data']['o_method'],
          groupId : 'Temp',
          jobId: '0',
          location: 'workflow',
          data: {}
        };
        if (pCom['type'] == COM_ID['I-DATASOURCE'] || pCom['type'] == COM_ID['I-IMAGE-DATASOURCE']) {
          if (pCom['type'] == COM_ID['I-IMAGE-DATASOURCE']){
            sParam.jobId = pCom['jobId'];
          }
          sParam.data = {
            load: 'hdfs', filename: sUiData['filename'], filetype: sUiData['filetype'], fileseq: ',', dataUserno: sUiData['dataUserno'] 
          };
        }
        else if (pCom['type'] == COM_ID['I-IMAGE-STORAGE']){
          sParam.jobId = pCom['jobId'];
          sParam.data = {
            filepath: sUiData['filepath'], filename: sUiData['filename'], usetable: sUiData['usetable'] 
          };
        }
        else if (pCom['type'] == COM_ID['I-HDFS']) {
          sParam.data =  {
            filename: sUiData['filename'], filepath: sUiData['filepath']
          };
        } 
        else if (pCom['type'] == COM_ID['I-STORAGE']) {
          sParam.data =  {
            filename: sUiData['filename'], filepath: sUiData['filepath'], DEFAULT_PATH: sUiData['DEFAULT_PATH']
          };
        } 
        else if (pCom['type'] == COM_ID['I-FTP']) {
          sParam.data = {
            dsId: sUiData['dsId'], ftphost: sUiData['ftphost'], ftpport: sUiData['ftpport'],
            filelist: sUiData['filelist'], filepath: sUiData['filepath'], ftpsample: true, 
            searchtype: sUiData['searchtype'], keyword: sUiData['keyword'], ftptype: sUiData['ftptype'],
          };
        }
        else if (pCom['type'] == COM_ID['I-HIVE'] || pCom['type'] == COM_ID['I-DATABASE']) {
          sParam.data = {
            dsId: sUiData['dsId'], dbtype: sUiData['dbtype'], dbhost: sUiData['dbhost'], dbport: sUiData['dbport'], type: sUiData['selectOpt'],
            dbname: sUiData['dbname'], tablename: sUiData['tablename'], dbuser: '', dbpassword: '', query: sUiData['query'], owner : sUiData['owner']
          };
          // if (sParam.data.query) {
          //   sParam.data.type = 'query';
          // } 
        }
        else if (pCom['type'] == COM_ID['I-API']) {
          sParam.data = {
            apiType : sUiData['apiType'],
            apiUrl: sUiData['apiUrl'],
            parameter: sUiData['parameter'],
          };
        }
        console.log("pCom : ", pCom);
        // if(p_wfRegUserno != undefined && p_wfRegUserno != null) {
        //   sParam['wf_regUserno'] = p_wfRegUserno;
        // }
        if(pCom['wf_regUserno'] != undefined && pCom['wf_regUserno'] != null) {
          sParam['wf_regUserno'] = pCom['wf_regUserno'];
        }
        let sResponse = await this.cComViewSvc.getDataSchema(sParam).toPromise();
        sSelectData = JSON.parse(sResponse);
        if (!sSelectData.hasOwnProperty('responsecode') || sSelectData['responsecode'] != 200) {
          return Promise.reject(false);
        }
      }
      if (pCom['type'] == COM_ID['I-STREAMING']) {
        sSelectData = await this.cWpStreamingSvc.getTopicSchema({ filename: sUiData.filename }).toPromise();
        sSelectData = JSON.parse(sSelectData);
      }
      if (pCom['type'] == COM_ID['I-WORKFLOW']) {
        let s_workflowInfo:any = await this.cComViewSvc.getInputWorkflowInfo({workflowId : sUiData['workflowId']});
        let s_sortInfo:any = [];
        for(var i in s_workflowInfo) {
            s_sortInfo.push(JSON.parse(s_workflowInfo[i]['WF_DATA']))
        }
        let s_schema = []
        sSelectData = {schema: []}
        for(var j in s_sortInfo) {
            let s_action = s_sortInfo[j]['wp-data']['o_action'];
            let s_type = s_sortInfo[j]['type']
            let s_temp = {
                "metadata": {},
                "name": s_action,
                "nullable": true,
                "type": s_type
            }
            s_schema.push(s_temp)
        };
        sSelectData['schema'] = s_schema;
      }
      let sSelColNmList = sSelectData.schema.map((sCol: any) => sCol.name).filter(Boolean).sort();
      let sChkColNmList = pCom['schema'].map((sCol: any) => sCol.name).filter(Boolean).sort();
      if (JSON.stringify(sSelColNmList) !== JSON.stringify(sChkColNmList)) {
        sColValidFlag = false;
      } else {
        sColValidFlag = true;
      }
      return Promise.resolve(sColValidFlag);
    } catch (err) {
      // 파일명 변경 에러는 알림창을 띄우고 설정값을 유지하도록 함. 
      return Promise.reject(false);
    }
  }
  chkConnectFilterText(pKey: string) {
    this.chkConnectFilterTextEmit.emit(pKey);
  }
  // 워크플로우 팝업으로 불러오기
  async loadWorkFlowPopup(pData: { wfId?: string, viewId?: string, viewIdx?: string, preview?:boolean}, pType: 'wkId' | 'viewId') {
    let sGetWorkflowPromise: any;
    if (pType == 'wkId') {
      let s_data:any = { wfId: pData.wfId };
      if (pData.preview) {
        s_data['preview'] = true;
      }
      sGetWorkflowPromise = this.getWorkflowList(s_data).toPromise();
    }
    else if (pType == 'viewId') {
      sGetWorkflowPromise = this.getWorkflowList({ viewId: Number(pData.viewId), viewIdx: Number(pData.viewIdx) }).toPromise();
    }
    else {
      return;
    }
    if (sGetWorkflowPromise) {
      let sComComTemplateData = await this.cMetaSvc.getComList().toPromise();
      let sWorkflowData = await sGetWorkflowPromise;
      let pRes = await this.getWorkflowComInfo({ wfId: Number(pData.wfId), regUser: sWorkflowData[0].REG_USER }).toPromise();
      if (pRes) {
        const dialogRef = this.cDialog.open(WpPopupDiagramComponent, {
          width: '1300px',
          data: {
            title: 'preview',
            diagramData: sWorkflowData[0].WF_DIAGRAM,
            componentData: pRes,
            comTempleteData: sComComTemplateData.filter((sCom: any) => sCom.DISPLAY == 'true')
          },
          id: 'wp-popup-diagram'
        });
        dialogRef.afterClosed().subscribe((pRes: any) => {
          this.cComViewSvc.setEditFlag(true);
        });
      }
    }
  }
  async loadWorkFlow(pData: { sDiagram?: dxDiagramData, sWpDataset?: WpComData[], pWorkflowId?: string, }, pType: 'changeTab' | 'wkId' | 'diagramData') {
    try {
      if (pType == 'changeTab') {
        this.loadWorkFlowEmit.emit({
          sDiagram: pData.sDiagram,
          sLoadComData: pData.sWpDataset,
          pType
        });
        return;
      }
      if (pType == 'wkId') {
        // 워크플로우 ID 기준으로 불러오기
        this.showWorkflowTab(); // 워크플로우 탭으로 이동
        this.loadWorkFlowEmit.emit({ pId: pData.pWorkflowId });
        return;
      }
      if (pType == 'diagramData') {
        this.loadWorkFlowEmit.emit(pData);
        return;
      }
    } catch (error) {
      console.log(error);
      this.cComViewSvc.showProgress(false);
    }
  }
  // viewid, viewidx 기준으로 워크플로우 불러오기
  loadWorkFlowByViewId(pViewId: number, pViewIdx: number, pPopupFlag: boolean) {
    try {
      this.showWorkflowTab();
      // this.cComViewSvc.showProgress(true);
      this.loadWorkFlowByViewIdEmit.emit({ pViewId, pViewIdx });
    } catch (error) {
      console.log(error);
      this.cComViewSvc.showProgress(false);
    }
  }
  // 워크플로우 Job 실행 상태 조회
  getJobStatus(pId: any) {
    return new Promise((resolve, reject) => {
      this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getJobStatus', { sGroupId: pId })
        .toPromise().then((response) => {
          resolve(response);
        }, pError => {
          reject(pError);
        });
    });
  }
  // pGroupId를 기준으로 실행이 완료되었는지 체크
  chkFinishExcute(pGroupId: string) {
    return new Promise((resolve, reject) => {
      let sGroupId = pGroupId;
      let sTime = 0;
      if (!sGroupId || sGroupId == '') {
        reject({ sucsess: false, message: "pGroupId 입력 필요" });
      }
      else {
        let sInterval = setInterval(() => {
          this.getJobStatus(sGroupId).then((pResult: any) => {
            let sJobLength = pResult.length;
            let sFinishJob = pResult.filter((sJob: any) => sJob.STATUS == 40);
            let sErrorJob = pResult.filter((sJob: any) => sJob.STATUS == 99);
            // 1. 모든 job이 완료상태(40)
            if (sFinishJob.length == sJobLength) {
              // 마지막 job으로 생성된 viewid(파생열 조건부에서 사용)
              let pViewId = `${sGroupId}_${pResult[pResult.length - 1].JOB_ID}`;
              resolve({ sucsess: true, pViewId });
              clearInterval(sInterval);
            } // 2. 에러상태(99) 또는 15초가 지나도 응답이 없을 경우
            if (sErrorJob.length > 0 || sTime > 600) {
              reject({ sucsess: false, message: "job 완료 조회 에러" });
              clearInterval(sInterval);
            }
            sTime++;
          }).catch((error: Error) => {
            console.log(error);
            reject({ sucsess: false, message: `${error.message}` });
            clearInterval(sInterval);
          })
        }, 1500);
      }
    });
  }
  // #203 모델 실행 결과 조회(분석 컴포넌트 ID 기준)
  getModelResult(pComIdList: Array<string>, pModelIdDataList?: { MODEL_ID: number, MODEL_IDX: number }[]): any {
    return new Promise((resolve, reject) => {
      this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getModelResult', { analComIdList: pComIdList, modelIdDataList: pModelIdDataList ? pModelIdDataList : [] })
        .toPromise().then((response: any) => {
          resolve(response);
        }, pError => {
          reject(pError);
        });
    });
  }
  // viewid로 spark viewtable 조회
  viewTable(pViewId: string) {
    let sTmp = pViewId.split('_');
    let sParams = {
      groupId: sTmp[0],
      jobId: sTmp[1],
      usetable: pViewId
    };
    return new Promise((resolve, reject) => {
      this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewtable', sParams)
        .toPromise().then((response:any) => {
          if (typeof response == 'string') 
            resolve(JSON.parse(response));
          else 
            resolve(response);
        }, pError => {
          reject(pError);
        });
    });
  }
  getWpNodes() {
    return wpNodes;
  }
  getWpEdges() {
    return wpEdges;
  }
  initWpNodes() {
    wpNodes = [];
  }
  initWpEdges() {
    wpNodes = [];
  }
  async clearWpDiagram() {
    this.clearWpDiagramEmit.emit()
  }
  setWpDaigramFlag(pName: string, pFlag: boolean) {
    if (pName == 'push') {
      this.oWpDiagramPushFlag = pFlag;
    }
    if (pName == 'load') {
      this.oWpDiagramLoadFlag = pFlag;
    }
    if (pName == 'all') {
      this.oWpDiagramPushFlag = pFlag;
      this.oWpDiagramLoadFlag = pFlag;
    }
  }
  getWpDiagramFlag(pName: string) {
    if (pName == 'push') {
      return this.oWpDiagramPushFlag;
    }
    if (pName == 'load') {
      return this.oWpDiagramLoadFlag;
    }
    return undefined;
  }
  selectComponentById(pKey: string) {
    this.selectComponentByIdEmit.emit(pKey);
  }
  setTrainModelComIdList(pList: number[]) {
    this.oTrainModelComIdList = pList;
  }
  getTrainModelComIdList() {
    if (this.oTrainModelComIdList.length == 0){
      this.cMetaSvc.getComList().subscribe((e: ICOM[])=>{
        e = e.filter((sCom: ICOM) => sCom.DISPLAY == 'true');
        if (e.length > 0) {
          let sTrainComponentComIdList: number[] = [];
          e.forEach((sCom: ICOM) => {
            if (this.cAppConfig.getConfig('OFFER_MODEL').includes(sCom.CATEGORY)) {
              sTrainComponentComIdList.push(sCom.ID);
            }
          });
          this.oTrainModelComIdList = sTrainComponentComIdList;
        }
      });
    }
    this.oTrainModelComIdList.push(COM_ID['A-TRANSFER_MODEL']);
    return this.oTrainModelComIdList;
  }
  // pType에 해당하는 컴포넌트 리스트
  getNodesByType(pType: number) {
    let sNodeList: WpNodePro[] = [];
    wpNodes.forEach(sNode => {
      if (sNode.type == pType)
        sNodeList.push(sNode);
    });
    return sNodeList;
  }
  getNodesById(pId: string) {
    return wpNodes.find(sNode => sNode.id == pId);
  }
  getEdgeById(pId: string, pKey?:string) {
    if (pKey) {
      return wpEdges.filter(sEdge => sEdge[pKey] == pId);
    }
    return wpEdges.find(sEdge => sEdge.id == pId);
  }
  getNodesByJobId(pId: string) {
    return wpNodes.find(sNode => sNode.jobId == pId);
  }
  showValidDiagPreview(pData: WpComData) {
    this.showValidDiagPreviewEmit.emit({ pData });
  }
  // #68 pId의 component의 상위 연결된 컴포넌트의 ComponentId, Input 개수를 구함
  public getConnectedComp(pId: string): { inputCount:number, comIdObject:{[index:string]:string[]}, comIdList:string[], streamJobIdList:string[] } {
    let sDiagramLinkData = this.getWpEdges();
    let sDiagramData = this.getWpNodes();
    // @ts-ignore
    let sTmpLinkData = Object.assign({}, sDiagramLinkData.map(item => { if (item.hasOwnProperty('id')) { return item } })); // Array to Object
    let sCompIdObject: { [index: string]: string[] } = {}; // 상위 연결된 컴포넌트의 ComponentId Object (for return)
    let sCompKeyList: any = []; // sCompIdObject의 키를 생성된 순서대로 저장 (getDeriveSchema 에서 이 값을 기준으로 Object 에서 선택해서 사용) (for return)
    let sInputCount = 0; // pId기준 최상위 데이터 입력(I-DATASOURCE) 개수 (for return)
    let sToIdArr = [pId];
    let sConnectedComp: any = [];
    let sStreamJobIdList:string[] = [];

    while (sToIdArr.length !== 0) {
      sToIdArr.forEach(sToId => {
        // Link를 순회하며 sToId에 연결되어있는 상위 컴포넌트를 찾음
        for (var key in sTmpLinkData) {
          if (sTmpLinkData[key].toId == sToId) {
            sConnectedComp.push(sTmpLinkData[key].fromId); // (sConnectedComp) sToId에 연결되어 있는 컴포넌트의 ID
            //sToId에 연결되어 있는 컴포넌트가 I-DATASOURCE일 때
            let sFromData = sDiagramData.find(sCom => sCom.id === sTmpLinkData[key].fromId);
            // console.log("getConnectedComp sFromData : ", sFromData);
            if (sFromData.type == COM_ID['I-DATASOURCE'] || sFromData.type == COM_ID['I-DATABASE'] || sFromData.type == COM_ID['I-HIVE'] || sFromData.type == COM_ID['I-HDFS'] || sFromData.type == COM_ID['I-FTP'] || sFromData.type == COM_ID['I-STREAMING']){
              sInputCount++;
              if (sFromData.type == COM_ID['I-STREAMING']){
                sStreamJobIdList.push(sFromData.jobId);
              }
            }
            // sCompIdObject => {최하위 컴포넌트 id(A) : [A에 연결되어 있는 상위 컴포넌트들], .. , 조인/병합 이전 컴포넌트 id(B):[B에 연결되어 있는 상위 컴포넌트 id들]}
            // 조인, 병합이 연결에 없을 경우 sCompIdObject는 1개의 key만 있음
            let sToData = sDiagramData.find(sCom => sCom.id === sTmpLinkData[key].toId);
            if (sToData['parentId'].length >= 2) {  // 상위 연결이 여러개인 컴포넌트
              if (Object.keys(sCompIdObject).length == 0) {
                sCompIdObject[sToId] = [sToId]; // sToId가 최하위 Component(병합 or 조인)
                sCompKeyList.push(sToId);
              }
              for (let s_index = 0; s_index < sToData['parentId'].length; s_index++) {
                if (!sCompIdObject.hasOwnProperty(sToData['parentId'][s_index])) {
                  sCompIdObject[sToData['parentId'][s_index]] = [sToData['parentId'][s_index]];
                  sCompKeyList.push(sToData['parentId'][s_index]);
                }
              }
            }
            else {
              let sHasToIdFlag = false;
              let sKey = '';
              for (let key of Object.keys(sCompIdObject)) {
                if (sCompIdObject[key].includes(sToId)) { //sCompIdObject[key]의 리스트에 sToId를 포함하고 있는지 확인
                  sHasToIdFlag = true;
                  sKey = key;
                  break;
                }
              }
              // Obj[key] Array에 toId가 있다면 Obj[key] toId 바로뒤에 FromId 추가 (Obj[key] : [하위 comId, ... , 상위 comId])
              if (sHasToIdFlag) {
                let sIndex = sCompIdObject[sKey].findIndex((elem: any) => elem == sToId);
                sCompIdObject[sKey].splice(sIndex + 1, 0, sTmpLinkData[key].fromId);
              }
              else {
                // sToId가 최하위 Component(조인/병합 아닌 경우)
                sCompIdObject[sToId] = [sTmpLinkData[key].toId, sTmpLinkData[key].fromId];
                sCompKeyList.push(sToId);
              }
            }
            delete sTmpLinkData[key];
          }
        }
      })
      // sToId에 연결되어 있던 sConnectedComp를 sToIdArr로 바꾼 후 상위 연결된 컴포넌트를 찾음
      sToIdArr = sConnectedComp;
      sConnectedComp = [];
    } 
    return { inputCount: sInputCount, comIdObject: sCompIdObject, comIdList: sCompKeyList, streamJobIdList: sStreamJobIdList };
  }
  // #203 상위 연결에 파생열 또는 파생열 조건부 있는지 확인.
  chkParentDerivedComponent(pComId: string) {
    let sParentIdList = this.getWpNodes().filter(sNode => sNode.id == pComId)[0]['parentId'];
    let sDerivedFlag = false; // 상위 연결까지 실행해서 컬럼정보가 필요할 때 true(파생열 조건부, 파생열 등)
    sParentIdList.forEach((sParentId: string) => {
      let sEndFlag = false; // 더이상 상위 연결이 없을때 true
      let sId = sParentId;
      let sComData = this.cAppSvc.getComData(sId);
      while (!sEndFlag) {
        if ([COM_ID['T-DERIVED'], COM_ID['T-DERIVED_COND']].includes(sComData.type))
          sDerivedFlag = true;
        if (sComData.parentId.length == 0) {
          sEndFlag = true;
        } else {
          sId = sComData.parentId[0];
          sComData = this.cAppSvc.getComData(sId);
        }
      }
    })
    if (sDerivedFlag) {
      return true;
    } else {
      return false;
    }
  }
  // 지정된 type의 컴포넌트를 대상으로 파생컬럼명 리스트 구함.
  getDerivedColumnNameList(pTypeList?: string[]) {
    let sDervColList: any[] = [];
    wpNodes.forEach(sNode => {
      if (!pTypeList || pTypeList.includes(sNode.type)) {
        if (sNode['wp-data']['o_data'].hasOwnProperty('derived_column')) {
          let tmpDervColumn = sNode['wp-data']['o_data'].derived_column;
          if (typeof tmpDervColumn == 'string') {
            sDervColList.push(tmpDervColumn);
          } else {
            tmpDervColumn.forEach((sDervCol: any) => {
              if (sDervCol.hasOwnProperty('derived_column'))
                sDervColList.push(sDervCol['derived_column']);
            })
          }
        }
      }
    })
    return sDervColList;
  }
  // (getDeriveSchema) 선택한 pComData의 컬럼 정보를 구함.
  public getDeriveSchema(pComData: WpComData) {
    if ([COM_ID['I-WORKFLOW'], COM_ID['I-HDFS'], COM_ID['I-DATASOURCE'], COM_ID['I-STREAMING'], COM_ID['I-DATABASE'], COM_ID['I-HIVE'], COM_ID['I-FTP']].includes(pComData.type))
      return pComData;
    let sComData = pComData;
    let sExportData = sComData;
    let sFullComData = [];
    let sParentInputResult;
    // #68 현재 선택된 pComData 기준 상위 연결된 컴포넌트 id 구함
    sParentInputResult = this.getConnectedComp(pComData.id);
    // [최상위 컴포넌트, ... , 최하위 컴포넌트] 로 정렬(sParentInputResult.sCompKeyList 사용)
    for (let sCompKey of sParentInputResult.comIdList) {
      sFullComData.unshift(sParentInputResult.comIdObject[sCompKey]);
    }
    sFullComData.forEach((sTempComData) => {
      sTempComData = [sTempComData[0]].concat(sTempComData); // insert sTempComData[0] for dummy 
      while (sTempComData.length > 1) {
        let sPrevDataId = sTempComData.pop(); //sTempComData 중 상위 컴포넌트
        let sPrevData = this.cAppSvc.getComData(sPrevDataId);
        let sCurrDataId = sTempComData[sTempComData.length - 1];  // sPrevData의 하위 컴포넌트
        let sCurrData = this.cAppSvc.getComData(sCurrDataId);
        let sWpType: number = sPrevData.type;

        if (sWpType == COM_ID['T-MERGE'] || sWpType == COM_ID['T-JOIN']) {
          let sTargetKey = sWpType == COM_ID['T-MERGE'] ? 'mergetable_jobId' : 'jointable_jobId';
          // WPLAT-361 8번
          if(sPrevData['wp-data']['o_data'].usetable_jobId == '' || sPrevData['wp-data']['o_data'][sTargetKey] == '') {
            throw {message: "값을 모두 설정해주세요"};
          }
          let sPrevData_l =  this.cAppSvc.getComData(this.getNodesByJobId(sPrevData['wp-data']['o_data'].usetable_jobId).id); //usetable
          let sPrevData_r = this.cAppSvc.getComData(this.getNodesByJobId(sPrevData['wp-data']['o_data'][sTargetKey]).id); //transform_value
          sCurrData.schema = sPrevData['wp-data'].getColumnInfo(sPrevData_l.schema, sPrevData_r.schema, sPrevData['wp-data']['o_data'][sTargetKey]);
        } else {
          sCurrData.schema = sPrevData['wp-data'].getColumnInfo(sPrevData.schema);
        }
        sExportData = sCurrData;
      }
    })
    return sExportData;
  }
  setComNameMap(pNameMap: { [index: string]: string }) {
    this.oComNameMap = pNameMap;
  }
  getComNameMap() {
    return this.oComNameMap;
  }
  showWorkflowTab() {
    this.cRouter.navigate(['workflow']);
  }
  getFromPoint(pType: number): Observable<any> {
    return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/getComConnLimit', { ID: pType });
  }
  // 280강화학습
  sendReinforcementResult(pData: any) {
    this.sendReinforcementResultEmit.emit(pData);
  }
  // 미사용 주석처리
  // getTempFtpFileNameList() {
  //   return this.oTempFtpFileNameList
  // }
  // setTempFtpFileNameList(pList: string[]) {
  //   this.oTempFtpFileNameList = pList;
  // }
  // removeFtpTempFile(pFileList: string[]) {
  //   return this.cHttp.post(this.oNodeUrl + '/ftp/removeFtpTempFile', {
  //     groupId: 'Temp',
  //     jobId: '0',
  //     location: 'workflow',
  //     filename: pFileList
  //   });
  // }
}
