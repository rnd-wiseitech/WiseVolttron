import { WpComponentViewerService } from 'projects/workflow/src/app/components/wp-component-viewer.service';
import { WpComponent } from 'projects/workflow/src/app/components/wp-component';
import { WpDiagramService } from 'projects/workflow/src/app/wp-diagram/wp-diagram.service';
import { IWpProperties, WpPropertiesWrap, WpToggleEvent  } from 'projects/workflow/src/app/wp-menu/wp-component-properties/wp-component-properties-wrap';
import { COM_ODATASOURCE_ATT, WpComData} from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpODataSourceData } from 'projects/wp-server/util/component/data/wp-datasource';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID, getCOM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';

export class WpImageODataSourceComponent extends WpComponent {
    hide = false;
    oWpData: COM_ODATASOURCE_ATT; //type override
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
        pWpDiagramSvc: WpDiagramService) { 
        super(pComViewerSvc,pWpData);
        this.cTransSvc = pTransSvc;
        this.oFormData = [
            {
                vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info66"),
                name:'saveOpt',
                value:'',
                type:'button_toggle',
                fvalue:['new','overwrite'],
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
    }
    public onChangeTxt(pEvent:any){    
        console.log(pEvent);
    }
    
    public setFileNm (pFileList:any, pSharedFileList:any){
        // 모든 데이터셋에서 공유 데이터셋은 빼고 진행
        let sMyFileList:any = pFileList.filter((pDataSet:any) => {
            return !pSharedFileList.some((pSharedDataSet:any) => pSharedDataSet.userno === pDataSet.userno)
        });
        this.oFileList = sMyFileList;
        this.oSharedFileList = pSharedFileList
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
        return this.oWpDiagramSvc.getNodesByType(COM_ID['O-IMAGE-DATASOURCE']).filter(sCom => sCom.hasOwnProperty('wp-data')).map(sCom => Object.assign({}, { id: sCom.id, overwrite_filename: sCom['wp-data'].overwrite_filename }));
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
    onDataChange(pEvent:any){
        let sIndex = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
        let sFileList:any;
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info9")){
            sFileList = this.oFileList;
        }
        if (this.oWpData.dataOpt == this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info10")){
            sFileList = this.oSharedFileList;
        }   
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
            this.oWpData.filename = sFileList[sIndex]['viewid'];
            this.oWpData.filetype = sFileList[sIndex]['filetype'];
            this.oWpData.dataUserno = sFileList[sIndex]['userno'];
        }
    }
}
