import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
// import { MainAppService } from 'projects/main/src/app/app.service';
// import { DxDateBoxModule } from 'devextreme-angular';
import cronstrue from 'cronstrue/i18n';
import { CustomValidator } from './wp-popup-validator';
import { WpLibService } from '../wp-lib.service';
import { TranslateService } from '@ngx-translate/core';
declare const $: any;
export interface Formdata {
  vname:string;
  name:string;
  value:any;
  type:string;
  array:any;
  fvalue:any;
  visible:Boolean;
  edit:true;
  validation:boolean;
  default?: any; // 비교 값
  callbak(pEvent:Event):any;
}

export interface FormdataArray extends Array<Formdata[]>{}

@Component({
  selector: 'lib-wp-popup',
  templateUrl: './wp-popup.component.html',
  styleUrls: ['./wp-popup.component.css']
})
export class WpPopupComponent implements OnInit {
  oFormGroup: FormGroup;
  cronstrue = cronstrue;

  oComponentData:{[index:string]:any}={};
  hColSize:number = 1;
  hConfirmBtnText:string =this.cTransSvc.instant("WPP_COMMON.BUTTON.button1");
  hHideLabelArray:string[] = []
  hColWidth:string = '';
  oFormcontrol:any = {};
  o_lang = this.cTransSvc.currentLang;
  @Output() selectionChanged = new EventEmitter<any>();
  constructor(
    @Inject(MAT_DIALOG_DATA) public oData: {
      title:string, 
      flag:boolean,
      message?:string,
      formdata?:Formdata[],
      formdataArray?:FormdataArray,
      formControl?:{},
      btnText?:string,
      componentData?:any,
      hideLabelArray?:string[]
      colWidthOption?:string;
      type:string;
      scroll?:boolean;
      service?:any;
    },    
    private cFormBuilder: FormBuilder, 
    // private cMainAppSvc: MainAppService,
    public dialogRef: MatDialogRef<WpPopupComponent>,    
    private cLibSvc: WpLibService,
    private cValid: CustomValidator,
    private cTransSvc: TranslateService
    ) {

      this.setFormGroup();

      if (this.oData.btnText) {
        this.hConfirmBtnText = this.oData.btnText;
      }
      if (this.oData.colWidthOption){
        this.hColWidth = this.oData.colWidthOption
      }
      // 라벨 없는 항목 초기값 설정
      if (this.oData.hideLabelArray) {
        this.hHideLabelArray = this.oData.hideLabelArray
        this.oData.hideLabelArray.forEach(sHideName => {
          this.oComponentData[sHideName] = null
        })
      }
      // 값있으면 넣도록.
      if(this.oData.componentData) {
        let s_keys = Object.keys(this.oData.componentData); 
        for(var key of s_keys) {
          if(typeof this.oFormcontrol[key] != "undefined")
            this.oFormcontrol[key]['value'] = this.oData.componentData[key];
        }
       
      }
    }
  setFormGroup(){
    if (this.oData.formdata) {
      this.hColSize = 1;
      for(let sFormIdx of this.oData.formdata){
        if(sFormIdx.type=='select'){
          this.oFormcontrol[sFormIdx.name] = new FormControl({value:'',disabled:!sFormIdx.edit}, []);
        // 스케줄에서 사용
        }else if(sFormIdx.type=='select_single'){
          this.oFormcontrol[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, []);
        // 스케줄에서 사용
        }else if(sFormIdx.type=='array') {
          this.oFormcontrol[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, []);
          for(let item of sFormIdx.array) {
            this.oFormcontrol[item.name] = new FormControl({value:'',disabled:!item.edit}, []);
          }
        } else {
          this.oFormcontrol[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, []);
        }
        // add validator
        if (this.oData.type == 'schedule') {
          this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.scheduleValidator(sFormIdx.name, sFormIdx.default, sFormIdx.type, this.oFormcontrol)]);
        } else if (this.oData.type == 'dataset' || this.oData.type =='connection') {
          this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.datasetValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
        } else if (this.oData.type == 'sethive') {
          this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.setHiveValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
        } else if (this.oData.type == 'regexp') {
          this.oFormcontrol[sFormIdx.name].setValidators([]);
        } else if (this.oData.type == 'userparams') {
          this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.userParamNmValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
        }  else if (this.oData.type == 'resource') {
          this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.resourceValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.default, this.oFormcontrol)]);
        }  else if (this.oData.type == 'savelayer') {
          if (sFormIdx.name !== 'ARG_DESC') {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.saveLayerValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
          }
        } else if (this.oData.type == 'server' || this.oData.type =='cluster') {
          if (sFormIdx.validation == true) {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, this.cValid.serverValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
          }
        } else {
          if (sFormIdx.validation == true) {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required]);
          }
        }
      }
    } else if (this.oData.formdataArray) {
      this.hColSize = this.oData.formdataArray.length;
      this.hColWidth = '';
      for(let sFormArrIdx of this.oData.formdataArray){
        for(let sFormIdx of sFormArrIdx){
          if(sFormIdx.type=='select'){
            this.oFormcontrol[sFormIdx.name] = new FormControl({value:'',disabled:!sFormIdx.edit}, [Validators.required]);
          }else{
            this.oFormcontrol[sFormIdx.name] = new FormControl({value:sFormIdx.value,disabled:!sFormIdx.edit}, [Validators.required]);
          }
        }
      }
    } else {
      this.hColSize = 0
    }
    this.oFormGroup = this.cFormBuilder.group(this.oFormcontrol);
  }
  ngOnInit(): void {  
    $('.scrollbar').scrollbar();  
    this.cLibSvc.setService(this.oData.service);
    if(this.hColSize>0)
      this.oFormGroup = this.cFormBuilder.group(this.oFormcontrol);

    this.dialogRef.keydownEvents().subscribe(event => {
        if (event.key === "Escape") {
            this.onCancel();
        }
    });    

  }
  patchValue(pVal:any){
    this.oFormGroup.patchValue(pVal);
  }
  patchFormData(pVal:any){
    this.oData.formdata = pVal;    
    this.setFormGroup();
  }
  mergeFormData(pVal:any){
    this.oData.formdata.concat(pVal);    
    this.setFormGroup();
  }
  appendFormData(pVal:any){
    
    this.oData.formdata.push(pVal);    
    this.setFormGroup();
  }
  deleteFormData(pName:any){
    let sIndex = this.oData.formdata.findIndex(item => item.name === pName);

    if (sIndex !== -1) {
      this.oData.formdata.splice(sIndex, 1);
    }
    this.setFormGroup();
  }
  ngAfterViewInit() {
    $('.scrollbar').scrollbar();
  }
  checkValidation(){
    let sInvalidDisabledCnt = 0;
    let sInvalidCnt = 0;
    let sIgnoreInvalidCnt = 0;

    for(let sIdx in this.oFormGroup.controls){
      // visible==false && status== invalid 인 경우 valid로 체크해야함
      if(this.oFormGroup.controls[sIdx].status == 'INVALID'){
        sInvalidCnt++;
        if(!this.oData.formdata.filter(pVal => pVal.name === sIdx)[0].visible){
          sIgnoreInvalidCnt++;
        }
      }
      // disabled && fvalue=='' 인 경우 invalid로 체크해야함 
      if(this.oFormGroup.controls[sIdx].status == 'DISABLED'){
        // sDisabledCnt++;
        if(!this.oFormGroup.controls[sIdx].value && this.oData.formdata.filter(pVal => pVal.name === sIdx)[0].visible && this.oData.formdata.filter(pVal => pVal.name === sIdx)[0].validation){
          sInvalidDisabledCnt++;           
        }
      }
    }    
      
    if(sInvalidDisabledCnt == 0 && sInvalidCnt==sIgnoreInvalidCnt){
      return true;
    }else{
      return false;
    }
  }
  onConfirm(){   
    if(this.hColSize>0){    
      let sFlag = this.oFormGroup.valid;
      if (this.oData.type == 'dataset' || this.oData.type == 'sethive' || this.oData.type == 'connection' || this.oData.type == 'userparams' || this.oData.type == 'savelayer') {
        sFlag = this.checkValidation();
      }
      
      if (sFlag || this.oData.type == 'kafkaConnect'){
        let sTmpFormVal:any = {};
        for(let sIdx in this.oFormGroup.controls){
          sTmpFormVal[sIdx] = this.oFormGroup.controls[sIdx].value;
        }
        this.dialogRef.close({result:true, data: sTmpFormVal});

      }else{
        // alert("모두 입력해 주세요.")
        this.cLibSvc.showMsg('모두 입력해 주세요.', false);     
        // this.cMainAppSvc.showMsg("모두 입력해 주세요.",false);
      }
    }else{
      this.dialogRef.close({result:true, data: this.oFormGroup});
    }
  }

  onCancel(){
    this.dialogRef.close({result:false});
  }

  onShowErrMsg(pFormNm:any) {
    if (this.oFormGroup.controls[pFormNm].errors.required) {
      return this.cTransSvc.instant("WPP_LIB.POPUP.popup3");
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
  onToggleChecked(pName:string, pValue:any){
    this.oComponentData[pName] = pValue
  }
  onSelectChanged(pVal:any,pCallbackNm:any) {
    if (['onDbConnect','getTableNameList','getColumnInfo', 'onServerCheck'].includes(pCallbackNm)){
      let sTmpFormVal:any = {};
      for(let sIdx in this.oFormGroup.controls){
        sTmpFormVal[sIdx] = this.oFormGroup.controls[sIdx].value;
      }
      this.selectionChanged.emit({selectedVal:sTmpFormVal, eventNm:pCallbackNm});
      return;
    }

    // 하이브 등록시
    // mode를 new(새로생성일 경우에는) input text
    // 그외는 select로
    if(this.oData.type =='sethive') {
      if (pVal == 'overwrite' || pVal == 'append') {
        this.oData.formdata[1].visible=false;
        this.oData.formdata[2].visible=true;
      } else if(pVal == 'delete') {
        this.oData.formdata[1].visible=false;
        this.oData.formdata[2].visible=false; 
      } else {
        this.oData.formdata[1].visible=true;
        this.oData.formdata[2].visible=false;
      }
    }
    this.selectionChanged.emit({selectedVal:pVal, eventNm:pCallbackNm});
  }

  onChangeWidth(p_width: any) {
    return 85/p_width + '%'
  }

  onKeyFileClick():any {
    $("#keyfile-input").click();
  }
  onFileSelected(p_ev:any, p_form:any) {
    const files = p_ev.target.files
    if(files.length > 0) {
      if(p_form.type == 'file') {
        p_form.value = files[0].name;
        this.oFormGroup.get(p_form.name).setValue(files[0].name);
            // 파일 내용을 읽는 코드 추가
        if(p_form.name =='CLUSTER_CONFIG') {
          const s_reader = new FileReader();
          s_reader.onload = async (e: any) => {
            const s_text = e.target.result;
            // 파일 내용 처리
            console.log("s_text", s_text); // 예시로 콘솔에 출력, 원하는 처리로 변경 가능
            this.oFormGroup.get('CLUSTER_CONFIG_TEXT').setValue(s_text);
          };
          s_reader.readAsText(files[0]);
        }
        if(p_form.name =='KEYFILE') {
          const s_reader = new FileReader();
          s_reader.onload = async (e: any) => {
            const s_text = e.target.result;
            // 파일 내용 처리
            console.log("s_text", s_text); // 예시로 콘솔에 출력, 원하는 처리로 변경 가능
            this.oFormGroup.get('KEYFILE_TEXT').setValue(s_text);
          };
          s_reader.readAsText(files[0]);
        }

      }
      }
    }
  
} 
