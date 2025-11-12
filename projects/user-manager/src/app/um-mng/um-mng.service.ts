import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';


// form 입력받을 리스트
export class UmFormData {
  public user: any;
  public group: any;
  constructor(
    private cTransSvc: TranslateService
  ) { 
    this.user = [{
      vname: this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info6"),
      name: 'user_id',
      value: '',
      type: 'text',
      fvalue: [],
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.DATASET.POPUP.popup13"),
      name: 'user_name',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_DATA_MANAGER.CONNECTION.POPUP.popup10"),
      name: 'password',
      value: '',
      type: 'password',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info8"),
      name: 'user_mode',
      value: '',
      type: 'select',
      fvalue: ['USER', 'ADMIN'],
      visible: true,
      edit: true,
      callbak: null
    }, {
      vname: this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info2"),
      name: 'group_name',
      value: '',
      type: 'select_group',
      fvalue: [],
      visible: true,
      edit: true,
      callbak: null
    }],
    this.group = [{
      vname: this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info4"),
      name: 'group_name',
      value: '',
      type: 'text',
      fvalue: [],
      visible: true,
      edit: true,
      callbak: null
      // },{
      //   vname:'상위 그룹',
      //   name:'p_group_name',
      //   value:'',
      //   type:'select',
      //   fvalue:[],
      //   visible:true,
      //   edit:true,
      //   callbak:null
    }, {
      vname: this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info5"),
      name: 'group_desc',
      value: '',
      type: 'text',
      fvalue: '',
      visible: true,
      edit: true,
      callbak: null
    }]
  }
}

@Injectable({ providedIn: 'root' })
export class UmMngService extends WpSeriveImple {
  constructor(private cHttp: HttpClient,
    private cAppConfig: WpAppConfig) {
    super(cAppConfig);
  }
  syncLdap(): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/ldapSync', {});
  }
  addUser(pFormData: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/addUser', { formdata: pFormData });
  }
  modifyUser(pFormData: any, pNodeInfo: any, pDelFlag: boolean): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/modifyUser', { formdata: pFormData, nodeInfo: pNodeInfo, delYn: pDelFlag });
  }
  addGroup(pFormData: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/addGroup', { formdata: pFormData });
  }
  modifyGroup(pFormData: any, pNodeInfo: any, pDelFlag: boolean): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/modifyGroup', { formdata: pFormData, nodeInfo: pNodeInfo, delYn: pDelFlag });
  }
  moveUser(pUserInfo: any, pGrpId: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/moveUser', { userInfo: pUserInfo, groupId: pGrpId });
  }
  moveGroup(pGroupInfo: any, pGrpId: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/moveGroup', { groupInfo: pGroupInfo, groupId: pGrpId });
  }
  getUmTreeInfo(pParam: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/getUmTreeInfo', { nodeInfo: pParam });
  }
  chkLowCompt(pParam: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/userMng/chkLowCompt', { nodeInfo: pParam });
  }

}