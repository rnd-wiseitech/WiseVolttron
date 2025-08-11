import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { MatDialog } from '@angular/material/dialog';
import { DmFtpPopUpComponent } from 'projects/data-manager/src/app/dataset/ftp-popup/ftp-popup.component';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import FileSystemItem from 'devextreme/file_management/file_system_item';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import dateFormat from "dateformat";
import { COM_FTP_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpFtpData } from 'projects/wp-server/util/component/data/wp-ftp';
import { DS_MSTR_ATT } from 'projects/wp-server/metadb/model/DS_MSTR';
import { TranslateService } from '@ngx-translate/core';
export interface IFtpPopupResult { result: boolean, data?: FileSystemItem | FileSystemItem[], regexp?: string, dateexp?: string, rootPath?: string, changeRootPath?: string, path?: string };
// export interface WkFtpData extends WkCommonData {
//   [index: string]: any
//   filename: string;
//   filepath: string;
// }
export class WpFtpComponent implements IWpProperties {
  hide = false;
  public oFormData: WpPropertiesWrap[];
  public oSelectData: any = {};
  public oProcess: boolean = false;
  public oComViewerSvc: WpComponentViewerService;
  public oMetaSvc: WpMetaService;
  oDiagramPreviewSvc: WpDiagramPreviewService;
  oWpData: COM_FTP_ATT;
  oDialog: MatDialog;
  oFtpInfoList: any = [];
  // oSelectedFtp: any;
  oDiagramSvc: WpDiagramService;
  cTransSvc: TranslateService;
  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pComponentData: WpFtpData,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pDiagramSvc: WpDiagramService,
    pDiaglog: MatDialog,
    pMetaSvc: WpMetaService
  ) {
    this.cTransSvc = pTransSvc;
    this.oFormData = [{
      // connection info에서 고르게 함
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info12"),
      name: 'dsname',
      value: '',
      type: 'select',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: this.onFtpChanged.bind(this)
    }, {
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info13"),
      name: 'filepath',
      value: '',
      type: 'button',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: this.onBtnClick.bind(this)
    },
    {
      vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info2"),
      name: 'filename',
      value: '',
      type: 'text',
      fvalue: '',
      visible: false,
      edit: false,
      callbak: null
      },
      {
        vname: '정규표현식',
        name: 'regexp',
        value: '',
        type: 'text',
        fvalue: [],
        visible: false,
        edit: false,
        callbak: null
      },
      {
        vname: '날짜표현식',
        name: 'dateexp',
        value: '',
        type: 'text',
        fvalue: [],
        visible: false,
        edit: false,
        callbak: null
      },
      {
        vname: 'FileList',
        name: 'filelist',
        value: '',
        type: 'list',
        fvalue: [],
        visible: false,
        edit: false,
        callbak: null
      },
    ];
    this.oComViewerSvc = pComViewerSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oDiagramSvc = pDiagramSvc;
    this.oMetaSvc = pMetaSvc;
    this.oWpData = (pComponentData['o_data'] as COM_FTP_ATT);
    this.oDialog = pDiaglog;
    // 파일 리스트(다중)
    if (this.oWpData.searchtype == 'multi') {
      this.setFileName('filelist', this.oWpData.filelist);
    } 
    if (this.oWpData.filename == 'single') {
      this.setFileName('filename', this.oWpData.filename);
    }
    if (this.oWpData.searchtype == 'regexp') {
      this.setFileName('regexp', this.oWpData.regexp);
    } 
    if (this.oWpData.searchtype == 'dateexp') {
      this.setFileName('dateexp', this.oWpData.dateexp);
    }
  }
  public setFtpNmList(pFtpList: DS_MSTR_ATT[]) {
    let sFtpList: Partial<COM_FTP_ATT> = [];
    let sFtpNmList: string[] = [];
    pFtpList.forEach(sFtp => {
      sFtpNmList.push(sFtp.DS_NM);
      sFtpList.push({
        ftphost: sFtp.IP,
        ftpport: sFtp.PORT,
        ftpuser: '',
        ftppassword: '',
        ftptype: sFtp.TYPE,
        dsId: sFtp.DS_ID,
        dsname: sFtp.DS_NM
      });
    })

    this.oFtpInfoList = sFtpList;
    this.oFormData.map(e => {
      if (e.name == 'dsname')
        e.fvalue = sFtpNmList;
    });
  }
  private onFtpChanged(pEvent: any) {
    let sSelectIdx: number = this.getItemIndexByElem(pEvent.component._valueChangeEventInstance.currentTarget);
    let sSelectFtp = this.oFtpInfoList[sSelectIdx];
    Object.assign(this.oWpData, sSelectFtp);
  }
  onBtnClick(pEvent: any) {
    if (this.oWpData.dsId !== "") {
      const dialogRef = this.oDialog.open(DmFtpPopUpComponent, {
        data: { DS_ID: this.oWpData.dsId, TYPE: this.oWpData.ftptype },
        id: 'wp-ftp-popop'
      });
      dialogRef.afterClosed().subscribe(async (pRes: IFtpPopupResult) => {
        if (pRes && pRes.result) {
          // 1. 정규 표현식으로 선택
          if (pRes.hasOwnProperty('regexp')) {
            let s_filepath = pRes.path;
            s_filepath = this.getResolvePath(s_filepath, pRes);

            this.oWpData.filepath = s_filepath;
            this.oWpData.keyword = pRes.regexp;
            this.oWpData.searchtype = 'regexp';
            let sFileList = await this.oMetaSvc.getFtpInfo(this.oWpData.dsId, s_filepath, this.oWpData.ftptype, {
              type: "regexp",
              value: pRes.regexp
            }).toPromise();
            if (sFileList.length === 0) {
              this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup17"), false);
              this.clearFilename();
            } else {
              let sFilenameList = sFileList.map((sFile: FileSystemItem) => sFile.name);
              this.setFileName('filelist', sFilenameList);
              this.setSelectData();
            }
          }
          else if (pRes.hasOwnProperty('dateexp')) {
            let s_filepath = pRes.path;
            s_filepath = this.getResolvePath(s_filepath, pRes);

            let sDate = new Date();
            let s_dateexp = `(${dateFormat(sDate, pRes.dateexp)})`;
            
            let sFileList = await this.oMetaSvc.getFtpInfo(this.oWpData.dsId, s_filepath, this.oWpData.ftptype, {
              type: "regexp",
              value: s_dateexp
            }).toPromise();
            let s_pythonexp = ''
            
            switch (pRes.dateexp) {
              case 'yyyy-mm-dd':
                s_pythonexp = '%Y-%m-%d';
                break
              case 'yyyymmdd':
                s_pythonexp = '%Y%m%d';
                break
              case 'yyyymmddHHMMss':
                s_pythonexp = '%Y%m%d%H%M%S';
                break
              case 'yyyy-mm-dd HH:MM:ss':
                s_pythonexp = '%Y-%m-%d %H:%M:%S';
                break
            }
            this.oWpData.filepath = s_filepath;
            this.oWpData.keyword = s_pythonexp;
            this.oWpData.searchtype = 'dateexp';
            if (sFileList.length === 0) {
              this.oComViewerSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup15"), false);
              this.clearFilename();
            } else {
              sFileList = sFileList.filter((sFile: FileSystemItem & { type: string }) => sFile.type === 'FILE');
            //   // 폴더를 제외한 경로 내의 파일들을 선택.
              let sFilenameList = sFileList.map((sFile: FileSystemItem) => sFile.name);
              this.setFileName('filelist', sFilenameList);
              this.setSelectData();
            }
          }
          // 2. 여러 파일 선택했을 때
          else if (Array.isArray(pRes.data)) {
            let sResult = pRes.data;
            // 경로 설정
            let s_filepath = pRes.path;
            s_filepath = this.getResolvePath(s_filepath, pRes);
            // 다중 파일일 경우 첫번째 파일을 기준으로 컴포넌트 설정

            let sSelectFileList = sResult.map(sFile => sFile.name);
            this.oWpData.filepath = s_filepath;
            this.oWpData.searchtype = 'multi';
            this.oWpData.filelist = sSelectFileList
            this.oWpData.filename = sSelectFileList[0];
            this.setSelectData();
            // 3. 단일 파일 선택
          } else { 
            let sResult = pRes.data;
            let s_filepath:any = sResult.path;
            // 경로 설정
            if (s_filepath) {
              s_filepath = this.getResolvePath(s_filepath, pRes);
              s_filepath = s_filepath.split('/');
              s_filepath.pop();
              s_filepath = s_filepath.join('/');
              this.oWpData.filepath = s_filepath;
              this.oWpData.searchtype = 'single';
              this.oWpData.filelist = [sResult.name];

              this.oWpData.filename = sResult.name;
              this.setSelectData();
            }
          }
        }
      }, pErr => {
        this.clearFilename();
      })
    } else {
      this.oComViewerSvc.showMsg('FTP 연결을 선택해주세요', false);
    }
  }
  // 서버에 보내기 위해서 절대경로로 경로 맞춰줌.
  getResolvePath(pTargetPath: string, pResult: IFtpPopupResult) {
    let sPath = pTargetPath;
    if (pResult.changeRootPath !== '') {
      sPath = pResult.changeRootPath + '/' + sPath;
    }
    else {
      sPath = pResult.rootPath + '/' + sPath;
    }
    return sPath;
  }
  private setSelectData() {
    let sParam = {
      action: 'input',
      method: 'I-FTP',
      groupId: 'Temp',
      jobId: '0',
      location: 'workflow',
      data : {
        dsId: this.oWpData.dsId,
        ftptype: this.oWpData.ftptype,
        ftphost: this.oWpData.ftphost,
        ftpport: this.oWpData.ftpport,
        filepath: this.oWpData.filepath,
        filelist: this.oWpData.filelist,
        ftpsample: true,
        searchtype: this.oWpData.searchtype,
        keyword: this.oWpData.keyword
      }
    };

    this.oComViewerSvc.showProgress(true);
    this.oComViewerSvc.getDataSchema(sParam).subscribe((response: any) => {
      console.log('============');
      let sSelectData = JSON.parse(response);
      this.oSelectData['name'] = this.oWpData.filename;
      if (sSelectData.hasOwnProperty('responsecode')) {
        if (sSelectData['responsecode'] == 200) {
          // 조회한 ftp 파일명 추가 (미사용 주석처리)
          // let sTempFtpFileNameList = this.oDiagramSvc.getTempFtpFileNameList()
          // if (!sTempFtpFileNameList.includes(this.oWpData.filename)) {
          //   sTempFtpFileNameList.push(this.oWpData.filename);
          //   this.oDiagramSvc.setTempFtpFileNameList(sTempFtpFileNameList);
          // }
          this.oComViewerSvc.onInitData();
          this.oComViewerSvc.selectData(sSelectData);
          this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sSelectData, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() });
        }
        else {
          this.oComViewerSvc.showProgress(false);
          this.clearFilename();
          this.oComViewerSvc.showMsg(sSelectData['exception'], false);
        }
        this.oComViewerSvc.showProgress(false);
      }
    }, (error) => {
      this.oComViewerSvc.showProgress(false);
      let sMessage = error.error ? error.error.message : error.message;
      this.oComViewerSvc.showMsg(sMessage, false);
      this.clearFilename();
    })
  }
  public getFormData() {
    return this.oFormData;
  }
  public getItemIndexByElem(pElem: any) {
    // pElem : pEvent.event.currentTarget
    return Array.from(pElem.parentNode.children).indexOf(pElem);
  }
  // 단일 파일, 다중 파일, 정규표현식으로 선택한 파일에 따라 form value를 다르게 표시해야 함.
  setFileName(pFormName: 'filename' | 'filelist' | 'regexp' | 'dateexp', pValue: any) {
    let sClearFormList = ['filename', 'filelist', 'regexp', 'dateexp'];
    sClearFormList.splice(sClearFormList.indexOf(pFormName), 1); // pFormName을 제외한 나머지 항목만 남음.
    // pFormName 을 표시하고, oWpData에 값 할당
    this.oFormData.forEach((sForm: WpPropertiesWrap) => {
      if (sForm.name === pFormName) {
        sForm.visible = true;
        if (pFormName === 'filelist') {
          sForm.fvalue = pValue;
        } else {
          sForm.value = pValue;
        }
      }
    })
    this.oWpData[pFormName] = pValue;
    // regexp, dateexp는 filelist를 표시해야하므로 filelist를 초기화 대상에서 제외
    if (pFormName === 'regexp' || pFormName === 'dateexp') {
      sClearFormList.splice(sClearFormList.indexOf('filelist'), 1);
    }
    // (form 설정) 나머지 form 은 숨기고 데이터 초기화.
    this.oFormData.forEach((sForm: WpPropertiesWrap) => {
      if (sClearFormList.includes(sForm.name)) {
        sForm.visible = false;
        if (sForm.name === 'filelist') {
          sForm.fvalue = [];
        } else {
          sForm.value = '';
        }
      }
    })
    // (wpData 설정) 
    for (const sFormName of sClearFormList) {
      if (sFormName === 'filelist') {
        this.oWpData[sFormName] = [];
      } else {
        this.oWpData[sFormName] = '';
      }
    }
    if (pFormName === 'regexp' || pFormName === 'dateexp' || pFormName === 'filelist') {
      this.oWpData.filename = this.oWpData.filelist[0];
    }
  }
  setFormValue(pFormName: string, pValueSet: Partial<WpPropertiesWrap>) {
    this.oFormData.forEach((sForm: WpPropertiesWrap) => {
      if (sForm.name == pFormName) {
        for (const pKey of Object.keys(pValueSet)) {
          sForm[pKey] = pValueSet[pKey];
        }
      }
    })
  }
  clearFilename() {
    this.oWpData.filepath = '';
    this.oWpData.filename = '';
    this.oWpData.filelist = [];
    this.oWpData.regexp = '';
    this.oWpData.dateexp = '';
    this.setFormValue('filelist', { visible: false });
    this.setFormValue('filename', { visible: false });
    this.setFormValue('regexp', { visible: false });
    this.setFormValue('dateexp', { visible: false });
  }
}
