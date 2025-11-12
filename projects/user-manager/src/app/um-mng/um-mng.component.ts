import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MainAppService } from 'projects/main/src/app/app.service';
import { UmFormData, UmMngService } from './um-mng.service';
import { DxTreeViewComponent } from 'devextreme-angular';
import { CryptoService } from 'projects/wp-lib/src/lib/wp-lib-common/crypto/crypto.service';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { map } from 'rxjs/operators';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import ArrayStore from 'devextreme/data/array_store';
import { TranslateService } from '@ngx-translate/core';
@Component({
    selector: 'um-mng',
    templateUrl: './um-mng.component.html',
    styleUrls: ['./um-mng.component.css']
})
export class UmMngComponent implements OnInit, OnDestroy {
    @ViewChild('treeviewOrgChart') treeviewOrgChart: DxTreeViewComponent;
    objectKeys = Object.keys;
    
    oOrgChart:any;  // 전체 조직도
    // h_selectionMode:any = 'none';
    // h_modifyMode:any = false;
    h_type:string;
    h_mode:string;
    oPopData:any = {};  // 오른쪽 form 화면 그릴 떄 필요한 전체 데이터
    oCurrFormData:any = [];  // form 현재 데이터(그룹 or 유저)
    oValChkList:any = {'user':[],'group':[]};   // 기등록된 그룹 or 유저 리스트 (새로 등록 or 수정시 중복체크시 필요)
    oFormGroup: FormGroup;
    oGroupBoxData: any;
    oSelectGroupId:any = '';
    oFormcontrol:any = {};
    oFormTitle:any = {'user':this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info3"),
        'group':this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info2"),
        'new':this.cTransSvc.instant("WPP_COMMON.INFO.info3"),
        'modify':this.cTransSvc.instant("WPP_COMMON.INFO.info4")}  // 화면 글씨 표시
    oSelectedTreeInfo:any;
    o_LdapUse:boolean
    constructor(
        private cWpLibSvc: WpLoadingService,
        private cMetaSvc: WpMetaService,
        private cFormBuilder: FormBuilder,
        private cMainAppSvc: MainAppService,
        private cUmMainSvc: UmMngService,
        private cCryptoService: CryptoService,
        private cWpAppConfig : WpAppConfig,
        public cDialog: MatDialog,
        private cTransSvc: TranslateService) {
    }
    ngOnInit(): void {
        this.getOrgChart();
        this.o_LdapUse = this.cWpAppConfig.getUseConfig('LDAP');
    }
    ngOnDestroy() {
    }
    onSelectItem(pEv:any){
        if(pEv.itemData.key == '1'){
            return;
        }
        // 선택한 그룹 또는 사용자 정보 가져옴
        this.cUmMainSvc.getUmTreeInfo(pEv.itemData).subscribe((pData:any)=>{
            this.oSelectedTreeInfo = pData;
            this.loadFormData(pEv.itemData.type, 'modify', pData);
        });   
    }
    onSelectChanged2(pE:any){
        this.oPopData.formdata.filter((item:any)=>{
            if(item.name == "group_name")
                item.value = pE.value;
        });
        this.oFormGroup.value['group_name'] = pE.value;
        this.oFormGroup.controls.group_name.setValue(pE.value);
        this.oSelectGroupId = pE.value;
    }
    onDragChange(pEv:any) {
        // pEv.fromData == sortable.data
        if (pEv.fromComponent === pEv.toComponent) {
            const fromNode = this.findNode(this.getTreeView(pEv.fromData), pEv.fromIndex);
            const toNode = this.findNode(this.getTreeView(pEv.toData), this.calculateToIndex(pEv));
            if (toNode !== null && this.isChildNode(fromNode, toNode)) {
                pEv.cancel = true;
            }
        }
    }
    async onDragEnd(pEv:any) {
        if (pEv.fromComponent === pEv.toComponent && pEv.fromIndex === pEv.toIndex) {
            // toIndex가 정확히 잡히지않았을 경우, 최상위로 드래그했을때를 제외한 나머지 모든 경우
            return;
        }
        if (!pEv.dropInsideItem){
            // 최상위로 드래그하는경우 toNode가 관리자로 잡힘.
            return;
        }

        const fromTreeView = this.getTreeView(pEv.fromData);
        const toTreeView = this.getTreeView(pEv.toData);

        const fromNode = this.findNode(fromTreeView, pEv.fromIndex);
        const toNode = this.findNode(toTreeView, this.calculateToIndex(pEv));

        if (pEv.dropInsideItem && toNode !== null && toNode.itemData.type=='user') {
            // toNode가 group이 아닌 user인 경우
            return;
        }
        if(fromNode.parent !== null && fromNode.parent.key == toNode.itemData.key){
            // fromNode가 이미 toNode 폴더내에 있을 경우
            return;
        }
        let sFlag:any;
        if(fromNode.itemData.type=='user'){
            sFlag = await this.cUmMainSvc.moveUser(fromNode.itemData, toNode.itemData.key).toPromise();
        }else{
            sFlag = await this.cUmMainSvc.moveGroup(fromNode.itemData, toNode.itemData.key).toPromise();
        }
        if(sFlag.success){
            const fromTopVisibleNode = this.getTopVisibleNode(pEv.fromComponent);
            const toTopVisibleNode = this.getTopVisibleNode(pEv.toComponent);
    
            const fromItems = fromTreeView.option('items');
            const toItems = toTreeView.option('items');
            this.moveNode(fromNode, toNode, fromItems, toItems, pEv.dropInsideItem);
    
            fromTreeView.option('items', fromItems);
            toTreeView.option('items', toItems);
            fromTreeView.scrollToItem(fromTopVisibleNode);
            toTreeView.scrollToItem(toTopVisibleNode);
        }
    }
    getTreeView(pParam:any){
        // treeview 한 개라 fromdata, todata 동일
        return this.treeviewOrgChart.instance;
    }
    findNode(pTreeInst:any, pIdx:any) {
      const nodeElement = pTreeInst.element().querySelectorAll('.dx-treeview-node')[pIdx];
      if (nodeElement) {
        return this.findNodeById(pTreeInst.getNodes(), nodeElement.getAttribute('data-item-id'));
      }
      return null;
    }
    findNodeById(pNodes:any, pId:any) {
      for (let i = 0; i < pNodes.length; i++) {
        if (pNodes[i].itemData.key == pId) {
          return pNodes[i];
        }
        if (pNodes[i].children) {
          const node:any = this.findNodeById(pNodes[i].children, pId);
          if (node != null) {
            return node;
          }
        }
      }
      return null;
    }
    calculateToIndex(pEv:any) {
      if (pEv.fromComponent != pEv.toComponent || pEv.dropInsideItem) {
        return pEv.toIndex;
      }
  
      return pEv.fromIndex >= pEv.toIndex
        ? pEv.toIndex
        : pEv.toIndex + 1;
    }
    isChildNode(parentNode:any, childNode:any) {
      let parent = childNode.parent;
      while (parent !== null) {
        if (parent.itemData.key === parentNode.itemData.key) {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    }
    
    moveNode(fromNode:any, toNode:any, fromItems:any, toItems:any, isDropInsideItem:any) {
        const fromIndex = fromItems.findIndex((item:any) => item.key == fromNode.itemData.key);
        fromItems.splice(fromIndex, 1);

        const toIndex = toNode === null || isDropInsideItem
        ? toItems.length
        : toItems.findIndex((item:any) => item.key == toNode.itemData.key);
        toItems.splice(toIndex, 0, fromNode.itemData);

        this.moveChildren(fromNode, fromItems, toItems);
        if (isDropInsideItem) {
        fromNode.itemData.parent_id = toNode.itemData.key;
        } else {
        fromNode.itemData.parent_id = toNode != null
            ? toNode.itemData.parent_id
            : undefined;
        }
    }
    
    moveChildren(node:any, fromDataSource:any, toDataSource:any) {
        if (node.itemData.type =='user') {
            return;
        }

        node.children.forEach((child:any) => {
        if (child.itemData.type =='group') {
            this.moveChildren(child, fromDataSource, toDataSource);
        }

        const fromIndex = fromDataSource.findIndex((item:any) => item.key == child.itemData.key);
        fromDataSource.splice(fromIndex, 1);
        toDataSource.splice(toDataSource.length, 0, child.itemData);
        });
    }
    
    getTopVisibleNode(component:any) {
        const treeViewElement = component.element();
        const treeViewTopPosition = treeViewElement.getBoundingClientRect().top;
        const nodes = treeViewElement.querySelectorAll('.dx-treeview-node');
        for (let i = 0; i < nodes.length; i++) {
        const nodeTopPosition = nodes[i].getBoundingClientRect().top;
        if (nodeTopPosition >= treeViewTopPosition) {
            return nodes[i];
        }
        }

        return null;
    }


    // 수정일 경우 pDefaultVal 존재
    // type: user, group | mode: new, modify 
    loadFormData(pType:any, pMode:any, pDefaultVal?:any){
        this.resetFormData();
        let sFormdata:any = new UmFormData(this.cTransSvc);
        this.oCurrFormData = sFormdata[pType];
        this.h_type = pType;
        this.h_mode = pMode;
        // user,group , new, modify 에 따라 나눵,.ㄴㅇ
        if(pType == 'user'){
            if(pMode == 'new'){
                this.oCurrFormData.filter((pVal:any) => pVal.name === 'user_id')[0].fvalue = this.oValChkList['user'];
            }else if(pMode == 'modify'){
                let tmpUser = this.oValChkList['user'].filter((pVal:any) => {
                    if(pVal !== pDefaultVal.user_id){
                        return pVal
                    }
                });                
                this.oCurrFormData.filter((pVal:any) => pVal.name === 'user_id')[0].fvalue = tmpUser;
            }
            // 뿌리는 용도
            this.oCurrFormData.filter((pVal:any) => pVal.name === 'group_name')[0].fvalue = this.oValChkList['group'];
        }else if(pType == 'group'){
            if(pMode == 'new'){
                this.oCurrFormData.filter((pVal:any) => pVal.name === 'group_name')[0].fvalue = this.oValChkList['group'];
                // this.oCurrFormData.filter((pVal:any) => pVal.name === 'p_group_name')[0].fvalue = this.oValChkList['group'];
            }else if(pMode == 'modify'){
                let tmpGroup = this.oValChkList['group'].filter((pVal:any) => {
                    if(pVal !== pDefaultVal.group_name){
                        return pVal
                    }
                });                
                this.oCurrFormData.filter((pVal:any) => pVal.name === 'group_name')[0].fvalue = tmpGroup;
            }
        }        
        if(pDefaultVal){
            this.oCurrFormData.filter((pVal:any) => {
                for(let sIdx in pDefaultVal){
                    if(pVal.name === sIdx)
                        pVal.value = pDefaultVal[sIdx];
                    if(pVal.name== 'user_id')
                        pVal.edit = false;
                    // if(pVal.name == 'group_name')

                    //     this.oSelectGroupId = pDefaultVal['group_id'];
                }
            });
            this.oSelectGroupId = String(pDefaultVal['group_id']);
        }

        this.oPopData = {
            'title': `${this.oFormTitle[pType]} ${this.oFormTitle[pMode]}`,
            'formdata': this.oCurrFormData,
        }
        let sTmpControl:any = {};
        for(let sFormIdx of this.oPopData.formdata){
            // this.oFormcontrol[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, []);
            sTmpControl[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, []);
            // if(sFormIdx.name != 'group_desc' && sFormIdx.name != 'p_group_name')
            // WPLAT-79 if절 주석처리 (그룹추가에서 validation이 안됨)
            // if(sFormIdx.name != 'group_desc' && sFormIdx.name != 'group_name'){
                // this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.customValidator(sFormIdx.name, sFormIdx.fvalue)]);
                sTmpControl[sFormIdx.name].setValidators([Validators.required, this.customValidator(sFormIdx.name, sFormIdx.fvalue)]);
            // }
        }
        this.oFormGroup = this.cFormBuilder.group(sTmpControl);    
    }    
    customValidator(p_col:any, p_value: any): any {
        return (control: AbstractControl): any =>{
            let p_check = false;
            let p_msg = "";
            let expression = /^[a-z|A-Z|0-9]+$/g;
            if(p_col =='user_id') {
                p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
                p_msg = `해당 사용자 ID는 이미 등록되어 있습니다.`;
                
                // if (control.value == '')
                //     return { 'required': true };
                // let expression = /^[a-zA-Z0-9_.+-]+@(?:(?:[a-zA-Z0-9-]+\.)?[a-zA-Z]+\.)?()\.?()$/i;
                // if (expression.test(control.value)) {
                //     return { 'pattern': true };
                // }
                // expression = /^[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*@[0-9a-zA-Z]([-_\.]?[0-9a-zA-Z])*\.[a-zA-Z]{2,3}$/i;
                // if (!expression.test(control.value)) {
                //     return { 'email': true };
                // }
                // return null;
                console.log(expression.test(control.value), !expression.test(control.value))
                if (!expression.test(control.value)){
                    p_check = true;
                    p_msg = `ID로 사용할 수 없습니다.`;
                }
            }
            // group 등록일떄만
            if(p_col =='group_name' && this.h_type == 'group') {
                p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
                p_msg = `해당 그룹명은 이미 등록되어 있습니다.`;
            }
            return p_check ? {message: p_msg} : null;            
        };
    }
    onShowErrMsg(pFormNm:any) {
      if (this.oFormGroup.controls[pFormNm].errors.required) {
        return '해당 항목은 필수 입력사항입니다.';
      }else{
        return this.oFormGroup.controls[pFormNm].errors.message;
      }
    }
    onPasswordVisible(pEvent:any){
      let sInputElem = pEvent.target.parentElement.getElementsByTagName('input')[0];
      let sType = sInputElem.getAttribute('type');
      if (sType == 'password'){
        sInputElem.setAttribute('type','text');
        pEvent.target.className = 'ico visibility';
      }
      if (sType == 'text'){
        sInputElem.setAttribute('type','password');
        pEvent.target.className = 'ico visibility on';
      }
    }

    chkLowerNode(){
        return new Promise((resolve, reject) => {
          this.cUmMainSvc.chkLowCompt(this.oSelectedTreeInfo).pipe(
            map((pRes:any)=>{
              if(pRes.success){
                if(pRes.result.length!=0){
                  resolve({flag:false,message:'해당 그룹에 속해있는 그룹이나 사용자가 있을 경우 삭제할 수 없습니다.'});
                }else{
                    resolve({flag:true});
                }
              }else{
                resolve({flag:false,message:pRes.message});
              }
            })
          ).subscribe();   
        });
    }

    async onDelete(pEv:any){
        // console.log(this.oSelectedTreeInfo);
        let sFlag:any = true;
        let sChkResult:any = {};
        if(this.h_type == 'group'){
            sChkResult = await this.chkLowerNode(); // 하위 그룹이나 사용자 있는지 체크
            sFlag = sChkResult.flag;
        }
        if(sFlag){
            const dialogRef = this.cDialog.open(WpPopupComponent, {
              data: {
                'title': '알림',
                'flag': true,
                'service': this.cMainAppSvc,
                'message': `정말로 삭제하시겠습니까?`,
                'colWidthOption': 'tight'
              }
            }); 
            dialogRef.afterClosed().subscribe(pRes => {
              if(pRes){
                if(pRes.result){       
                  let sParam = this.transFormdata();
                  if(this.h_type == 'user'){           
                    this.cUmMainSvc.modifyUser(sParam, this.oSelectedTreeInfo, true).pipe(
                      ).subscribe( pResult => {
                        if(pResult.success){
                            this.reLoad(pResult.message);
                        }
                    });
                  }else{
                    this.cUmMainSvc.modifyGroup(sParam, this.oSelectedTreeInfo, true).pipe(
                      ).subscribe( pResult => {
                        if(pResult.success){
                            this.reLoad(pResult.message);
                        }
                    });
                  }
                }
              }
            });  
        }else{
            this.cMainAppSvc.showMsg(sChkResult.message,false);
        }
    }
    resetFormData(){
        this.oCurrFormData = [];
        this.oPopData = {};
        this.oSelectGroupId = '';
    }
    onConfirm(){
        if(!this.oFormGroup.valid){
            this.cMainAppSvc.showMsg("모두 입력해 주세요.",false);
        }else{
            this.submitForm();            
        }
    }
    transFormdata(){
        let sObj:any = {};
        for(let idx in this.oFormGroup.controls){
            if(idx == 'group_name'){
                sObj['group_id'] = this.oSelectGroupId;
                sObj['group_name'] = this.oFormGroup.controls[idx].value;                
            }
            else
                sObj[idx] = this.oFormGroup.controls[idx].value;
        }
        return sObj;
    }
    onSyncLdap(){
        this.cWpLibSvc.showProgress(true,"usermanagerspin");
        this.cUmMainSvc.syncLdap().subscribe(pResult=>{
            this.cWpLibSvc.showProgress(false,"usermanagerspin");
        },
        (error)=> {
            this.cWpLibSvc.showProgress(false,"usermanagerspin");
            throw error;
        })
    }
    submitForm(){
        console.log(this.oFormGroup);
        this.cWpLibSvc.showProgress(true,"usermanagerspin");
        let sParam:any = this.transFormdata(); 
        if(this.h_type=='user'){
            if(this.h_mode == 'new'){
                sParam['password']=this.cCryptoService.encryptPwd(this.oFormGroup.controls.password.value);
                this.cUmMainSvc.addUser(sParam).subscribe(pResult=>{
                    if(pResult.success){
                        this.reLoad(pResult.result);
                    }
                });
            }else{
                if(this.oSelectedTreeInfo.password != sParam['password']){
                    sParam['password']=this.cCryptoService.encryptPwd(this.oFormGroup.controls.password.value);
                }
                this.cUmMainSvc.modifyUser(sParam,this.oSelectedTreeInfo,false).subscribe(pResult=>{
                    if(pResult.success){
                        this.reLoad(pResult.result);
                    }
                });                
            }
        }else if(this.h_type=='group'){
            if(this.h_mode == 'new'){
                this.cUmMainSvc.addGroup(sParam).subscribe(pResult=>{
                    if(pResult.success){
                        this.reLoad(pResult.message);
                    }
                });
            }else{
                this.cUmMainSvc.modifyGroup(sParam,this.oSelectedTreeInfo,false).subscribe(pResult=>{
                    if(pResult.success){
                        this.reLoad(pResult.message);
                    }
                });                
            }

        }
        // this.cWpLibSvc.showProgress(false,"usermanagerspin");
    }

    reLoad(pMsg:any){
        this.cMainAppSvc.showMsg(pMsg,true);
        this.resetFormData();
        this.getOrgChart();
    }

    getOrgChart(){
        this.cWpLibSvc.showProgress(true,"usermanagerspin");
        this.cMetaSvc.getOrganizationChart().subscribe(pData=>{
            if(pData.success){
                let sRoot:any = [{
                    key:'1',
                    name:this.cTransSvc.instant("WPP_USER_MANAGER.USER_MANAGE.INFO.info1"),
                    type:'group',
                    expanded: true,
                    // icon:'assets/images/ico-folder@3x.png'
                }]
                sRoot = sRoot.concat(pData.result.orgChart)
                this.oOrgChart = sRoot;
                this.oGroupBoxData = new ArrayStore({
                    data:this.oOrgChart.filter((pVal:any) => pVal.type === 'group'),
                    key:'key'
                });
                // this.oOrgChart = pData.result.orgChart;
                this.oValChkList = pData.result.chkList;
            }
            this.cWpLibSvc.showProgress(false,"usermanagerspin");
        }, error =>{
            this.cWpLibSvc.showProgress(false, "usermanagerspin");
            throw error;
        });
    }

    // onSelectModeToggle(){
    //     // this.h_modifyMode = !this.h_modifyMode;
    //     if(this.h_selectionMode=='none')
    //         this.h_selectionMode = 'normal';
    //     else
    //         this.h_selectionMode = 'none';
    // }
    onSelectChanged(pVal:any,pCallbackNm:any) {
    }    
}