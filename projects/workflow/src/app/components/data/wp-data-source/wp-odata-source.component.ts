import { WpDataSourceService } from './wp-data-source.service';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponent } from '../../wp-component';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpComData, WpPropertiesWrap, WpToggleEvent } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { COM_ODATASOURCE_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpODataSourceData } from 'projects/wp-server/util/component/data/wp-datasource';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID, getCOM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
import { WorkflowAppService } from "../../../app.service";
// export interface WkODataSourceData extends WkCommonData {
//     fileNm: string;
//     filetype: string;
//     saveOpt: string;
//     viewFileName: string;
//     viewid: number;
//     viewidx: number;
//     dataOption: string;
//     userno: number;
// }
export class WpODataSourceComponent extends WpComponent {
    hide = false;
    oWpData: COM_ODATASOURCE_ATT; //type override
    oWpDataSourceService: WpDataSourceService;
    oWpAppSvc: WorkflowAppService;
    public oFormData:WpPropertiesWrap [];
    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    public oWpDiagramSvc:WpDiagramService;
    oFileList: any[];
    oSharedFileList : any[];
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc:WpComponentViewerService,
        pWpData: WpODataSourceData,
        pWpDiagramSvc: WpDiagramService,
        pWpAppSvc:WorkflowAppService) { 
        super(pComViewerSvc,pWpData);
        this.cTransSvc = pTransSvc;
        this.oFormData = [
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info66"),
                name:'saveOpt',
                value:'',
                type:'button_toggle',
                fvalue:this.oComViewerSvc.o_fileFormat=='delta'?['new','overwrite','append']:['new','overwrite'],
                visible:true,
                edit:true,
                callbak:this.onSaveOptionChange.bind(this)
            },
            { // #37 덮어쓸 대상 데이터 (내 데이터셋, 공유된 데이터셋)
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info7"),
                name:'dataOpt',
                value:'',
                type:'button_toggle',
                fvalue:[pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9"), pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")],
                visible:true,
                edit:true,
                callbak:this.onChangedataOpt.bind(this),
            },
            { // #37 덮어쓰기 대상 파일명
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info8"),
                name:'overwrite_filename',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onDataChange.bind(this)
            },
            { // 신규 파일명
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info8"),
                name:'new_filename',
                value:'',
                type:'text',
                fvalue:'',
                visible:true,
                edit:true,
                callbak:this.onChangeTxt.bind(this)
            }
            ];
        // this.oComViewerSvc = pComViewerSvc;
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpAppSvc = pWpAppSvc;
        // #121 saveOpt에 맞춰서 overwrite_filename, new_filename 설정
        let sOverwriteFlag = this.oWpData.saveOpt == 'new'? false : true;
        this.oFormData.forEach(sForm => {
        //#136 saveOpt에 따라 신규 파일명 입력 / 덮어쓸 파일 선택 표시
        if (sForm.name == 'overwrite_filename'){
            sForm.edit = sOverwriteFlag;
            sForm.visible = sOverwriteFlag ;
        }
        if (sForm.name == 'dataOpt'){
            sForm.edit = sOverwriteFlag;
            sForm.visible = sOverwriteFlag;
        }
        if (sForm.name == 'new_filename'){
            sForm.edit = !sOverwriteFlag;
            sForm.visible = !sOverwriteFlag;
        }
        })
        // default option : 내 데이터셋
        if (this.oWpData.dataOpt == ''){
            this.oWpData.dataOpt = pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")
        }
        let sSteamInputJobList = this.oWpDiagramSvc.getConnectedComp(this.oComId).streamJobIdList;
        if (sSteamInputJobList.length > 0){
            this.oWpData.streamInputJobList = sSteamInputJobList;
        }
        this.oWpData.filetype = this.oComViewerSvc.o_fileFormat;
    }
    public onChangeTxt(pEvent:any){
        if (pEvent.srcElement.value != '' && pEvent.srcElement.value != null){
            let sFilelist = this.oFileList.filter((pDataSet:any) => {
                return pDataSet.filename == pEvent.srcElement.value;
            });
            if (sFilelist.length > 0){
                this.oComViewerSvc.showMsg(`이미 존재하는 파일명입니다.`,false);
                this.oWpData.new_filename = '';
                pEvent.srcElement.value = '';
            }
        }
    }
    // public getFormData(){    
    //   return this.oFormData;
    // }
    // #148 데이터 셋에 있는 데이터 리스트를 덮어쓸 수 있도록 수정
    // #37 공유 데이터셋 추가
    public setFileNm (pFileList:any, pSharedFileList:any){
        // 모든 데이터셋에서 공유 데이터셋은 빼고 진행
        let sMyFileList:any = pFileList.filter((pDataSet:any) => {
            return !pSharedFileList.some((pSharedDataSet:any) => pSharedDataSet.userno === pDataSet.userno)
        });
        this.oFileList = sMyFileList;
        this.oSharedFileList = pSharedFileList
        // let pFileNmList = [];
        // pFileList.forEach(pFileInfo => {
        //   pFileNmList.push(pFileInfo.filename);
        // })
        // this.oFormData.map(e=>{
        //   if(e.name == 'overwrite_filename')
        //     e.fvalue = pFileNmList;
        // });
        this.sefFileNmList(this.oWpData.dataOpt);
    }
    public sefFileNmList(pdataOpt:any){
        let sFileList = [];
        if (pdataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")){
            sFileList = this.oFileList;
        }
        if (pdataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")){
            sFileList = this.oSharedFileList;
        }
        let sFileNmList:any = []
        sFileList.forEach(pFileInfo => {
        sFileNmList.push(pFileInfo.filename)
        })
        this.oFormData.map(e=>{
        if(e.name == 'overwrite_filename')
            e.fvalue = sFileNmList;
        });
    }
    public getSelectData(){
        return this.oSelectData;
    }
    // #22 출력 컴포넌트 이후 다른 연결 가능하도록 수정
    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        let sTmpSchema = [];
        for(let sCom of this.oSchema.schema){
            sTmpSchema.push(sCom.name);
        }
        this.oComViewerSvc.selectData(pSchema);
    }
    getOutputDataList(){
        // return this.oWpDiagramSvc.getNodesByType(COM_ID['O-DATASOURCE']).filter(sCom=>sCom.hasOwnProperty('wp-data')).map(sCom=>Object.assign({},{id:sCom.id, viewid:sCom['wp-data'].viewid, viewidx:sCom['wp-data'].viewidx}));
        return this.oWpDiagramSvc.getNodesByType(COM_ID['O-DATASOURCE']).filter(sCom => sCom.hasOwnProperty('wp-data')).map(sCom => Object.assign({}, { id: sCom.id, overwrite_filename: sCom['wp-data'].overwrite_filename }));
    }
    // #12 component validation
    onKeyUp(pEvent:any, pName:string){
        let sOutFileNm = pEvent.srcElement.value; // 입력 값
        // 파일명 유효성 확인
        let sIsValidFloat = this.isValidString(sOutFileNm,'fileNm');
        if (!sIsValidFloat.isValid){
            this.oComViewerSvc.showMsg(`유효한 파일명을 입력하세요`,false);
            // oWpData, input text 수정
            this.oWpData.new_filename = sIsValidFloat.result;
            pEvent.srcElement.value = sIsValidFloat.result;
        }
    }
    // #121 저장 옵션 선택(신규 파일 생성/기존 파일 업데이트)
    async onSaveOptionChange(pEvent: WpToggleEvent) {
        this.oWpData.saveOpt = pEvent.value;
        let sOverwriteFlag = pEvent.value == 'new'? false : true;
        this.oWpData.new_filename = '';
        this.oWpData.overwrite_filename = '';
        // this.oWpData.viewid = 1; //초기값 수정
        // this.oWpData.viewidx = 1;
        this.oFormData.forEach(sForm => {
            //#136 saveOpt에 따라 신규 파일명 입력 / 덮어쓸 파일 선택 표시
            if (sForm.name == 'overwrite_filename'){ // 기존 파일 목록
                sForm.edit = sOverwriteFlag;
                sForm.visible = sOverwriteFlag;
            }
            if (sForm.name == 'dataOpt'){ //덮어쓸 대상 데이터
                sForm.edit = sOverwriteFlag;
                sForm.visible = sOverwriteFlag;
            }
            if (sForm.name == 'new_filename'){ // 신규 파일명 입력
                sForm.edit = !sOverwriteFlag;
                sForm.visible = !sOverwriteFlag;
            }
        });
        // #29 워크플로우 여러번 재실행시 데이터 셋명 표시 되도록 수정
        if (sOverwriteFlag){
            let tmp = await this.oComViewerSvc.getDataSourceList();
            let tmpShared = await this.oComViewerSvc.getSharedDataList(); // 공유 데이터셋
            this.setFileNm(tmp, tmpShared);
        }
    }
    onChangedataOpt(pEvent: WpToggleEvent) {
        this.oWpData.dataOpt = pEvent.value;
        this.oWpData['overwrite_filename'] = '';
        this.sefFileNmList(pEvent.value);    
    }
    // #121 기존 파일 선택(업데이트 대상 파일)
    async onDataChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sFileList:any;
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")){
            sFileList = this.oFileList;
        }
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")){
            sFileList = this.oSharedFileList;
        }   
        // #129 O-DATASOURCE overwrite는 중복으로 불가능하게 막음
        // 1. 선택된 데이터가 다른 O-DATASOURCE에서 선택되었는지 확인
        let sOutputDataList = this.getOutputDataList();
        let sOverwriteList = sOutputDataList.filter(sData => sData.id !== this.oComId && sData.overwrite_filename == sFileList[sIndex]['filename'] );
        // 2. 다른 O-DATASOURCE에서 선택되었다면 경고창
        if (sOverwriteList.length > 0){
            this.oWpData.overwrite_filename ='';
            this.oWpData.filetype ='';
            this.oWpData.dataUserno = '';
            pEvent.target.value = '';
            this.oComViewerSvc.showMsg('overwrite 대상 데이터가 다른 출력 컴포넌트에서 이미 선택되었습니다. 다시 선택해주세요', false);
        }
        // 3. 다른 O-DATASOURCE에서 선택되지 않았다면 O-DATASOURCE wp-data에 viewid, viewidx할당
        else {
            // this.oWpData.viewid = sFileList[sIndex]['viewid'];
            // this.oWpData.viewidx = Number(sFileList[sIndex]['viewidx'])+1;
            let sSaveOptCheck = true
            // 데이터셋 저장할 때, append 기능을 사용하면 컬럼명이 같은지 확인
            if (this.oWpData.saveOpt == 'append'){
                this.oComViewerSvc.showProgress(true);
                let sSchema = await this.oWpAppSvc.getComData(this.oComId)['schema'].map((pSchema:any)=>{ return pSchema['name'] }) ;
                
                let sParam : any = {
                            'action': 'function',
                            'jobId':'Temp',
                            'groupId':'Temp',
                            'functionType': 'datasetColumnCheck', 
                            'fileType' : sFileList[sIndex]['filetype'], 
                            'fileName' : sFileList[sIndex]['viewid'],
                            'fileIdx' : sFileList[sIndex]['viewidx'],
                            'columnList' : sSchema,
                            'location': "workflow"
                        }
            
                let sColumnCheck :any = await this.oComViewerSvc.getDatasetColumnCheck(sParam);
                let sColumnCheckResult = JSON.parse(sColumnCheck)['data']
                // 컬럼명이 같지 않으면 append 기능 사용 불가
                if (!sColumnCheckResult['result']){
                    this.oComViewerSvc.showMsg(`append 기능을 사용하려면 컬럼명이 같아야합니다.\n필요 컬럼명: ${sColumnCheckResult['useColumn']}`, false);
                    this.oWpData.saveOpt = 'overwrite';
                    sSaveOptCheck = false
                }
                this.oComViewerSvc.showProgress(false);
            }
            
            // sSaveOptCheck가 True일때 →  append 기능 사용 가능할때나 overwrite 기능 일때
            if (sSaveOptCheck) {
                this.oWpData.filename = sFileList[sIndex]['viewid'];
                this.oWpData.filetype = sFileList[sIndex]['filetype'];
                this.oWpData.dataUserno = sFileList[sIndex]['userno'];
            }
        }
    }
}
