import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
import { WpDiagramPreviewService } from '../../../wp-menu/wp-diagram-preview/wp-diagram-preview.service';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { COM_API_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpApiData } from 'projects/wp-server/util/component/data/wp-api';
import { WpApiService } from './wp-api.service';
import { TranslateService } from '@ngx-translate/core';

export class WpApiComponent implements IWpProperties  {
  public oFormData:WpPropertiesWrap [];
  // public oFormData:WpPropertiesWrap [] = [
  //   {
  //     vname: 'API 실행',
  //     name: 'apiStart',
  //     value: '',
  //     type: 'button',
  //     fvalue: '',
  //     visible: true,
  //     edit: true,
  //     callbak: this.onApiBtnClick.bind(this)
  //   },
  //   {
  //     vname: 'API 타입',
  //     name: 'apiType',
  //     value: '',
  //     type: 'select',
  //     fvalue: ['get','post'],
  //     visible: true,
  //     edit: true,
  //     callbak: null
  //   },
  //   {
  //     vname: 'API Url',
  //     name: 'apiUrl',
  //     value: '',
  //     type: 'text',
  //     fvalue: '',
  //     visible: true,
  //     edit: true,
  //     callbak: null
  //   },
  //   {
  //     vname: 'API 파라미터 설정',
  //     name: 'parameter',
  //     value: '',
  //     type: 'tab',
  //     fvalue: [
  //       {
  //         vname:'API 파라미터 명',
  //         name:'name',
  //         value:'',
  //         type:'text',
  //         fvalue:'',
  //         visible:false,
  //         edit:true,
  //         callbak:null
  //       },{
  //         vname:'API 파라미터 값',
  //         name:'value',
  //         value:'',
  //         type:'text',
  //         fvalue:'',
  //         visible:false,
  //         edit:true,
  //         callbak:null
  //       }
  //     ],
  //     visible: true,
  //     edit: true,
  //     callbak: null
  //   }
  // ]
  public oComViewerSvc: WpComponentViewerService;
  public oDiagramPreviewSvc: WpDiagramPreviewService;
  public oMetaSvc: WpMetaService;
  public oApiSvc: WpApiService;
  oWpData: COM_API_ATT;

  constructor(
    pTransSvc: TranslateService,
    pComViewerSvc: WpComponentViewerService,
    pComponentData: WpApiData,
    pDiagramPreviewSvc: WpDiagramPreviewService,
    pMetaSvc: WpMetaService,
    pApiService : WpApiService
  ) {
    console.log("pTransSvc : ", pTransSvc);
    this.oFormData = [
      {
        vname: `API ${pTransSvc.instant("WPP_COMMON.BUTTON.button5")}`,
        name: 'apiStart',
        value: '',
        type: 'button',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: this.onApiBtnClick.bind(this)
      },
      {
        vname: 'API 타입',
        name: 'apiType',
        value: '',
        type: 'select',
        fvalue: ['get','post'],
        visible: true,
        edit: true,
        callbak: null
      },
      {
        vname: 'API URL',
        name: 'apiUrl',
        value: '',
        type: 'text',
        fvalue: '',
        visible: true,
        edit: true,
        callbak: null
      },
      {
        vname: 'API 파라미터 설정',
        name: 'parameter',
        value: '',
        type: 'tab',
        fvalue: [
          {
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info16"),
            name:'name',
            value:'',
            type:'text',
            fvalue:'',
            visible:false,
            edit:true,
            callbak:null
          },{
            vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info17"),
            name:'value',
            value:'',
            type:'text',
            fvalue:'',
            visible:false,
            edit:true,
            callbak:null
          }
        ],
        visible: true,
        edit: true,
        callbak: null
      }
    ];
    this.oComViewerSvc = pComViewerSvc;
    this.oDiagramPreviewSvc = pDiagramPreviewSvc;
    this.oWpData = (pComponentData['o_data'] as  COM_API_ATT);
    this.oMetaSvc = pMetaSvc;
    this.oApiSvc = pApiService;
  }
  public getFormData() {
    return this.oFormData;
  }
  setDervInputReadOnly(){
    setTimeout(()=>{
      this.oWpData['parameter'].forEach((sCol:any, sIndex:number) => {
          let sExprElem = document.getElementById(`value_${sIndex}`);
          //@ts-ignore
          sExprElem.setAttribute('readonly',true);
      })
    }, 50)
  }
  public async onApiBtnClick(pEvent: any) {
    let sParam = {
      action: 'input', 
      method: 'I-API',
      groupId: 'Temp',
      jobId: '0',
      location: 'workflow',
      data : {
        apiType : this.oWpData.apiType,
        apiUrl: this.oWpData.apiUrl,
        parameter : this.oWpData.parameter
      }
    };
    this.oComViewerSvc.showProgress(true);
    if (this.oWpData.apiUrl == ''){
      this.oComViewerSvc.showProgress(false);
    }
    else{
      let sExistParamList : any = [];
      if(sParam['data']['parameter']){
        sParam['data']['parameter'].forEach( (pApiParam : any) => {
          if(pApiParam['name'] && pApiParam['value']){
            sExistParamList.push(pApiParam)
          }
        });
        sParam['data']['parameter'] = sExistParamList;
      }
      
      this.oComViewerSvc.getDataSchema(sParam).subscribe((pResponse:any) =>{
        let sResult = JSON.parse(pResponse);
        this.oComViewerSvc.onInitData();
        this.oComViewerSvc.selectData(sResult);
        this.oDiagramPreviewSvc.setDiagramPreviewByData({ 'sComData': sResult, 'sCurrDataFlag': true, 'sInputDataFlag': true, 'sInputComId': this.oComViewerSvc.getComId() })
        this.oComViewerSvc.showProgress(false);
      });
    }
  }

  
}
