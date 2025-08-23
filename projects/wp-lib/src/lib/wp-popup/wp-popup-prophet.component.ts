import { Component, EventEmitter, Inject, OnInit, Output, SimpleChange, SimpleChanges } from '@angular/core';
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
  selector: 'lib-wp-popup-prophet',
  templateUrl: './wp-popup-prophet.component.html',
  styleUrls: ['./wp-popup-prophet.component.css']
})
export class WpPopupProphetComponent implements OnInit {
  oFormGroup: FormGroup;
  cronstrue = cronstrue;

  oComponentData:{[index:string]:any}={};
  hColSize:number = 1;
  hConfirmBtnText:string ='OK';
  hHideLabelArray:string[] = []
  hColWidth:string = '';
  oFormcontrol:any = {};
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
      iService?:any;
    },    
    private cTransSvc: TranslateService, 
    private cFormBuilder: FormBuilder, 
    // private cMainAppSvc: MainAppService,
    public dialogRef: MatDialogRef<WpPopupProphetComponent>,
    public cLibSvc:WpLibService,
    private cValid: CustomValidator
    ) {
      if (this.oData.formdata) {
        this.hColSize = 1;
        for(let sFormIdx of this.oData.formdata){
          if(sFormIdx.type=='select'){
            this.oFormcontrol[sFormIdx.name] = new FormControl({value:'',disabled:!sFormIdx.edit}, []);
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
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.scheduleValidator(sFormIdx.name, sFormIdx.default, sFormIdx.type, this.oFormcontrol)]);
          } else if (this.oData.type == 'dataset' || this.oData.type =='connection') {
            if(sFormIdx.name=='ownername')
              this.oFormcontrol[sFormIdx.name].setValidators([]);
            else
              this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.datasetValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
          } else if (this.oData.type == 'sethive') {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.setHiveValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
          } else if (this.oData.type == 'regexp') {
            this.oFormcontrol[sFormIdx.name].setValidators([]);
          } else if (this.oData.type == 'userparams') {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.userParamNmValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
          }  else if (this.oData.type == 'resource') {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.resourceValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.default, this.oFormcontrol)]);
          }  else if (this.oData.type == 'savelayer') {
            if (sFormIdx.name !== 'ARG_DESC') {
              this.oFormcontrol[sFormIdx.name].setValidators([Validators.required, cValid.saveLayerValidator(sFormIdx.name, sFormIdx.fvalue, sFormIdx.type, this.oFormcontrol)]);
            }
          } else {
            this.oFormcontrol[sFormIdx.name].setValidators([Validators.required]);
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
      if (this.oData.btnText) {
        this.hConfirmBtnText = this.oData.btnText;
      }else{
        this.hConfirmBtnText = this.cTransSvc.instant("BUTTON.OK");
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
          this.oFormcontrol[key]['value'] = this.oData.componentData[key];
        }
       
      }
    }
    
  ngOnInit(): void {
    this.cLibSvc.setService(this.oData.iService);
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
  ngAfterViewInit() {
    if(this.oData.scroll){
      $('.scrollbar').scrollbar();
      $('.wpmodal-body .scroll-wrapper.scrollbar').css("height", "470px");
    }
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
      
      if(sFlag){
        let sTmpFormVal:any = {};
        for(let sIdx in this.oFormGroup.controls){
          sTmpFormVal[sIdx] = this.oFormGroup.controls[sIdx].value;
        }
        this.dialogRef.close({result:true, data: sTmpFormVal});

      }else{
        this.cLibSvc.showMsg(this.cTransSvc.instant("Popup.invalid"),false);
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
      return this.cTransSvc.instant("Popup.require");
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
    if (['onDbConnect','getTableNameList','getColumnInfo'].includes(pCallbackNm)){
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


} 
