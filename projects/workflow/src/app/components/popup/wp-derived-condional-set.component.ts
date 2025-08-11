import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
    MatDialogRef,
    MAT_DIALOG_DATA
  } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WorkflowAppService } from "../../app.service";
import { WpPropertiesWrap } from "../../wp-menu/wp-component-properties/wp-component-properties-wrap";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { WpAppConfig } from "projects/wp-lib/src/lib/wp-lib-config/wp-lib-config";
import { TranslateService } from "@ngx-translate/core";
declare const $: any;

@Component({
  selector: 'wp-derived-condional-set',
  templateUrl: './wp-derived-condional-set.component.html',
  styleUrls: ['./wp-derived-condional-set.component.css']
})
export class WpDerivedCondionalSetComponent implements OnInit, OnDestroy {
    // oDervConditionalForm:any;
    oWpDervData:any;
    oColList:any = ['derived_column', 'operation', 'operation_value', 'derived_value']
    oColInfo: any;
    // oMultiSelectData:any = {};
    oSubs: Subscription[] = [];
    // 문자열타입(SPARK, COMMON 공통)
    h_stringType = ['string', 'text', 'object'];

    // 숫자형 컬럼일 때 Form
    oDervFormNumeric:any = [{
      vname: this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"),
      name:'derived_column',
      value:'',
      type:'select',
      fvalue:[],
      visible:true,
      edit:true,
      callbak:this.onDervColumnChanged.bind(this)
    },{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup24"),
      name:'operation',
      value:'',
      type:'select',
      fvalue:[
        { ID: 0, Name: ">"},
        { ID: 1, Name:">="},
        { ID: 2, Name:"<"},
        { ID: 3, Name:"<="},
        { ID: 4, Name:"=="},
        { ID: 5, Name:"!="}
      ],
      visible:true,
      edit:true,
      callbak:null
    },
    // WPLAT-351
    {
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup25"),
      name:'operation_value',
      value:'',
      type:'select',
      fvalue:[
        { ID: 'INPUT', Name: "직접 입력"},
        { ID: 'COLUMN', Name:"컬럼 설정"}
      ],
      visible:true,
      edit:true,
      callbak:this.onDerivedColumnChanged.bind(this)
    },
    // {
    //   vname:'(조건)값',
    //   name:'operation_value',
    //   value:'',
    //   type:'text',
    //   fvalue:'',
    //   visible:true,
    //   edit:true,
    //   callbak:this.onDerivedColumnChanged.bind(this)
    // },
    {
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup26"),
      name:'derived_value',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }
  ];
    // 문자형 컬럼일 때 Form
    oDervFormString:any = [{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"),
      name:'derived_column',
      value:'',
      type:'select',
      fvalue:[],
      visible:true,
      edit:true,
      callbak:this.onDervColumnChanged.bind(this)
    },{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup24"),
      name:'operation',
      value:'',
      type:'select',
      fvalue:[
        { ID: 0, Name: "IN"},
        { ID: 1, Name: "NOT IN"},
      ],
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup25"),
      name:'operation_value',
      value:'',
      type:'select',
      fvalue:[{ID: 0, Name: "test"}],
      visible:true,
      edit:true,
      callbak:null
    },{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup26"),
      name:'derived_value',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }
  ]
   // 기본값 Form
    oDervDefaultForm:any =[{
      vname:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup27"),
      name:'default_value',
      value:'',
      type:'text',
      fvalue:'',
      visible:true,
      edit:true,
      callbak:null
    }
   ];

   o_apiType = 'SPARK';
   o_conditionColumn: any;
    constructor(@Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<WpDerivedCondionalSetComponent>,
    private cWpAppSvc : WorkflowAppService,
    private cWpComViewerSvc:WpComponentViewerService,
    private cWpAppConfig: WpAppConfig,
    private cTransSvc: TranslateService
    ){
      this.oWpDervData = {
        comId : '',
        tableIndex : '',
        queryText : '',
        displayOption : [{colindex:'-1', type:'numeric'}],
        usetable_info: this.data.usetable_info,
        selectboxOption : {'operation_value_0':[]},
        dervEditData : [{'derived_column':true, 'operation':true, 'operation_value':true,'derived_value':true,'default_value':true, 'type':'integer'}],
        dervData : [{'derived_column':'', 'operation':'', 'operation_value':'','derived_value':''}],
        dervDataDefault: [{ 'default_value': '' }],
        excuteFlag: false,
      }
    }
    ngOnInit(){
      $('.scrollbar').scrollbar();
      // API 타입에 따라 양식 다름
      this.o_apiType = this.cWpAppConfig.getConfig('API_TYPE');
      let sColItems:any[] = [];
      this.data.schema.map((sCol:any, sIndex:number)=>{
        sColItems.push({ VALUE: { Name: sCol.name, ID: sIndex}, ID: sIndex, Name: sCol.name});
        if (this.h_stringType.includes(sCol.type)){
          this.oWpDervData.usetable_info.schema[sCol.name] = []
        }
      });
      this.oDervFormNumeric.forEach((sForm:any) => {
        if (sForm.name == 'derived_column')
        sForm.fvalue = [...sColItems, { ID: sColItems.length, Name:'전체' }];
      })
      this.oDervFormString.forEach((sForm:any) => {
        if (sForm.name == 'derived_column')
          sForm.fvalue = [...sColItems, { ID: sColItems.length, Name:'전체' }];
      })
      // let sData = this.data
      this.oColInfo = [...sColItems, { ID: sColItems.length, Name: '전체' }];
      // this.setWpDervData(sData)
      this.oWpDervData = { ...this.oWpDervData, ...this.data };
      // 실행 옵션이 false 이면 operation_value를 text 타입으로 바꿔서 직접 입력하게 함.(문자열 distinct 값 구하는 것 실행 안함.)
      if (!this.oWpDervData.excuteFlag) {
        this.oDervFormString.forEach((sForm: WpPropertiesWrap) => {
          if (sForm.name == 'operation_value') {
            sForm.type = 'text';
            sForm.fvalue = '';
          }
        })
      }
    }
    // setWpDervData(pData:any){
    //   Object.keys(pData).forEach(sKey=>{
    //     if (typeof pData[sKey] !== 'undefined') {
    //       if (sKey == 'usetable_info'){
    //         this.oWpDervData.usetable_info.usetable = pData[sKey].usetable? pData[sKey].usetable : this.oWpDervData.usetable_info.usetable
    //         if (pData[sKey].schema){
    //           Object.keys(pData[sKey].schema).forEach(sCol => {
    //             this.oWpDervData.usetable_info.schema[sCol] = pData[sKey][sCol]
    //           })
    //         }
    //       }
    //       else {
    //           this.oWpDervData[sKey] = pData[sKey]
    //         }
    //       }
    //   })
    // }
    // 파생열 조건부 컬럼 데이터 타입에 따른 설정
    setDisplayOption(pEvent:any, pColName:any ,pRowIndex:any){
      let sSelectedIndex = pEvent.value;
      let sSelectedType = this.data.schema[sSelectedIndex].type;
      let sSelectCol = this.data.schema[sSelectedIndex].name;
      this.oWpDervData.displayOption[pRowIndex] = {'colindex':sSelectedIndex, 'type':sSelectedType};
      // 선택한 column의 type이 string이면 unique value select
      // 1. 문자형 변수
      // if (sSelectedType == "string" || sSelectedType == "text" || sSelectedType.includes('varchar') || sSelectedType == 'object' ) {
      if (this.h_stringType.includes(sSelectedType) ) {
        // 실행 옵션 true 일때
        if (this.oWpDervData.excuteFlag) {
          // 기존에 distinct value를 구한 적이 없을때는 구함
          let sDistinctValList = this.oWpDervData.usetable_info.schema[sSelectCol];
          if (!sDistinctValList || sDistinctValList.length == 0) {
          this.cWpComViewerSvc.showProgress(true,'wppopupspin');
            let sUsetableName = this.oWpDervData.usetable_info.usetable;
          if (!sUsetableName || sUsetableName == ''){
            this.cWpComViewerSvc.showProgress(false,'wppopupspin');
          }
          else {
            let sParams = {
              groupId:sUsetableName.split('_')[0],
              jobId:sUsetableName.split('_')[1],
              target_column:sSelectCol
            };
              // 선택한 문자열 컬럼의 distinct value 조회
            this.cWpComViewerSvc.getColDistinctValue(sParams).then((sResponse:any) =>{
              let sDistinctValList = JSON.parse(sResponse)['data'];
              try {
                sDistinctValList = sDistinctValList.map((sVal: any) => JSON.parse(sVal)[sSelectCol]);
              } catch (error) {
                console.log(error);
              }
              sDistinctValList.sort();
              this.oWpDervData.usetable_info.schema[sSelectCol] = sDistinctValList;
              this.oWpDervData.selectboxOption[`operation_value_${pRowIndex}`] = this.oWpDervData.usetable_info.schema[sSelectCol];
            }).catch(e => {
              console.log(e);
              this.cWpAppSvc.showMsg(e,false);
            }).finally(() => {
              this.cWpComViewerSvc.showProgress(false, 'wppopupspin');
            })
            }
          }
          else {
            // this.setMultiSelectOption(`operation_value_${pRowIndex}`, sSelectCol);
            this.oWpDervData.selectboxOption[`operation_value_${pRowIndex}`] = this.oWpDervData.usetable_info.schema[sSelectCol];
          }
        } else {
          this.oWpDervData.selectboxOption[`operation_value_${pRowIndex}`] = [];
        }
      }
      // 2. 숫자형 변수
      else {
        this.oWpDervData.selectboxOption[`operation_value_${pRowIndex}`]=[];
      }
    }
  // // #154 multiSelect option 설정
  // setMultiSelectOption(pOption:any,pCol:any){
  //   this.oWpDervData.selectboxOption[pOption] = this.oWpDervData.usetable_info.schema[pCol] ;
  //   // this.oMultiSelectData[pOption] = this.oWpDervData.usetable_info.schema[pCol];
  //   this.cWpComViewerSvc.showProgress(false,'wppopupspin');
  // }
    onDervColumnChanged(pEvent:any, pColName:any, pRowIndex:any){
      let sRowIndex = pRowIndex; // Form RowIndex
      let sControlNameList = ['operation', 'operation_value', 'derived_value'];
      // #153 파생열 조건부 조건에 전체 추가
      // if (pEvent.event.value.Name == '전체'){
      console.log(pEvent)
      if (pEvent.value) {
        if (this.oColInfo[pEvent.event.value].Name == '전체') {
          if (sRowIndex == 0) {
            this.oWpDervData.displayOption[sRowIndex] = { 'colindex': '-1', 'type': 'numeric' }
            let sDataLength = this.oWpDervData.dervData.length
            // 전체 선택시 조건 비활성
            if (sDataLength == 1) {
              this.setEditOption(sControlNameList, sRowIndex, false);
            }
            else {
              // 하위 조건들이 있는 경우 제거후 전체 선택
              this.cWpAppSvc.showMsg(`전체를 선택하면 다른 조건들은 초기화됩니다. 전체를 선택하시겠습니까?`, true)
              $('#wpPopup > div > div.modal-footer > div > div > a:nth-child(1)').off('click').on('click', (event: any) => {
                for (let sCount = 1; sCount < sDataLength; sCount++) {
                  this.onRemoveList(sCount)
                }
                this.setEditOption(sControlNameList, sRowIndex, false);
                $(this).off(event);
              });
              // 취소버튼 누를 경우 선택 안함
              setTimeout(() => {
                $('#wpPopup > div > div.modal-footer > div > div > a.btn.sm.natural.modalClose.ng-star-inserted').off('click').on('click', (event: any) => {
                  this.oWpDervData.dervData[0]['derived_column'] = ''
                  pEvent.event.component._clearValue()
                  // this.oDervConditionalForm.get('derived_column_0').setValue('')
                  $(this).off(event);
                });
              }, 100);
            }
          }
          else { // 전체 선택은 조건의 첫번째에서만 가능하도록 함
            // this.oDervConditionalForm.controls[`derived_column_${sRowIndex}`].setValue('')
            this.oWpDervData.dervData[sRowIndex]['derived_column'] = ''
            this.cWpAppSvc.showMsg('전체 선택은 첫번째 조건에서만 가능합니다.', false)
            pEvent.event.component._clearValue()
          }
        }
        else {
          this.setDisplayOption(pEvent, pColName, pRowIndex);
          this.setEditOption(sControlNameList, sRowIndex, true);
        }
      }
    }
    setEditOption(pNameList:any, pIndex:any, pOption:boolean){
      pNameList.forEach((sName:any) => {
        this.oWpDervData.dervEditData[pIndex][sName] = pOption
      })
    }
    onAddList(pEvent?:any){
      // 전체 설정시 조건 추가 불가능
      let sIndex = this.oWpDervData.dervData[0]['derived_column']
      if (sIndex !== '' && this.oColInfo[sIndex].Name == "전체") {
      // if (this.oDervConditionalForm.get('derived_column_0').value == "전체"){
        this.cWpAppSvc.showMsg('전체 조건 설정시 조건 추가가 불가합니다. 전체 조건을 해제한 후 추가해주세요',false)
      }
      else {
        let sAddIdx = this.oWpDervData.dervData.length
        this.oWpDervData.dervData.push({'derived_column':'', 'operation':'', 'operation_value':'','derived_value':''})
        this.oWpDervData.dervEditData.push({'derived_column':true, 'operation':true, 'operation_value':true,'derived_value':true})
        this.oWpDervData.displayOption.push({colindex:'-1', type:'numeric'})
        this.oWpDervData.selectboxOption[`operation_value_${sAddIdx}`] = []
      }
      //@ts-ignore
    }
    onRemoveList(pIndex:any){
      let sRemoveIdx = pIndex
      this.oWpDervData.dervData.splice(pIndex, 1)
      this.oWpDervData.dervEditData.splice(pIndex, 1)
      this.oWpDervData.displayOption.splice(pIndex, 1)
      delete this.oWpDervData.selectboxOption[`operation_value_${pIndex}`]
    }
    
    setDervData(){
      let sDervData = JSON.parse(JSON.stringify(this.oWpDervData.dervData));
      sDervData.forEach((sData:any, sIndex:number) => {
        for (const sKey of Object.keys(sData)) {
          // WPLAT-350 타입까지 추가함. 숫자형에서 직접입력인지 컬럼선택인지 확인.
          sData['type'] = this.oWpDervData.displayOption[sIndex].type;
          if (Number.isInteger(sData[sKey])){
            let sSelectedType = this.oWpDervData.displayOption[sIndex].type;
            if (this.h_stringType.includes(sSelectedType) ){
              this.oDervFormString.forEach((sForm:any) => {
                if (sForm.name == sKey){
                  sData[sKey] = sForm.fvalue[sData[sKey]]['Name'];
                }
              });
            } else {
              this.oDervFormNumeric.forEach((sForm:any) => {
                if (sForm.name == sKey){
                  sData[sKey] = sForm.fvalue[sData[sKey]]['Name'];
                }
              });
            }
          }
        }
      });
      return sDervData
    }

    setViewText(pEvent:any){
      let sViewDervData = this.setDervData();
      let sViewtext = ''
      let sDervtext =''
      let sDefaultText = ''
      // 전체 선택했는지 여부
      let sFullColFlag = sViewDervData[0].derived_column == '전체' ? true : false;
      let sCondList:any[] = []
      let s_conditionList:any[] = []
      if (!sFullColFlag) {
        // 조건값 validation
        console.log("sViewDervData : ", sViewDervData);
        for (const sData of sViewDervData) {
          let sDervFlag = Object.values(sData).filter(sCom=>sCom=='').length == 0 ? true:false
          if (sDervFlag){
            // TO DO : SPARK COMMON  구분
            // SPARK
            // #154 문자열, 숫자형 컬럼별 쿼리
            if (this.o_apiType == 'SPARK') {
              if (['IN', 'NOT IN'].includes(sData['operation'])){ // 문자형 컬럼
                if (this.oWpDervData.excuteFlag) {
                  sDervtext += `WHEN \`${sData['derived_column']}\` ${sData['operation']} ('${sData['operation_value'].join("','")}') THEN '${sData['derived_value']}' `;
                } else {
                  sDervtext += `WHEN \`${sData['derived_column']}\` ${sData['operation']} (${sData['operation_value']}) THEN '${sData['derived_value']}' `;
                }
              }
              else { // 숫자형 컬럼excuteFlag
                if(sData['type'].includes('COLUMN')) {
                  console.log('ㅎㅇㅎㅇㅎㅇ');
                  sDervtext += `WHEN \`${sData['derived_column']}\` ${sData['operation']} \`${sData['operation_value']}\` THEN '${sData['derived_value']}' `
                } else {
                  sDervtext += `WHEN \`${sData['derived_column']}\` ${sData['operation']} '${sData['operation_value']}' THEN '${sData['derived_value']}' `
                } 
              }
            } else {

            
            // COMMON
            let s_tempJson = {
              cond: {},
              value: `${sData['derived_value']}`, 
              else: `${this.oWpDervData.dervDataDefault[0]['default_value']}`
            }
            if (['IN', 'NOT IN'].includes(sData['operation'])){ // 문자형 컬럼
              if (this.oWpDervData.excuteFlag) {
                s_tempJson['cond'] = `s_df[\"${sData['derived_column']}\"].isin(['${sData['operation_value'].join("','")}'])`
              } else {
                s_tempJson['cond'] = `s_df[\"${sData['derived_column']}\"].isin([${sData['operation_value']}])`
              } 
            } else { // 숫자형 컬럼
               // WPLAT-350
              if(sData['type'].includes('COLUMN')) {
                s_tempJson['cond'] = `s_df[\"${sData['derived_column']}\"] ${sData['operation']} s_df[\"${sData['operation_value']}\"]`
              } else {
                s_tempJson['cond'] = `s_df[\"${sData['derived_column']}\"] ${sData['operation']} ${sData['operation_value']}`
              }
            }
            s_conditionList.push(s_tempJson)
          }
            sCondList.push(`${sData['derived_column']}${sData['operation']}${sData['operation_value']}`) // #149 파생열 조건 중복체크를 위해 추가
          }   
          else {
            this.cWpAppSvc.showMsg("파생열 조건부 속성 값을 입력해주세요", false)
            return
          }
        }
        if (this.o_apiType == 'SPARK') {
          if (sDervtext.length >0 ){
            sViewtext = `CASE ${sDervtext}`
          }
        } else {
          if (s_conditionList.length > 0) {
            sViewtext = JSON.stringify(s_conditionList)
          }
        }
        // #149 파생열 조건 중복체크
        let sUniqueCondList = sCondList.filter((elem, index)=>{return sCondList.indexOf(elem) === index})
        if (sCondList.length !== sUniqueCondList.length){
          this.cWpAppSvc.showMsg("동일한 파생열 조건에 다른 변환값을 설정할 수 없습니다. 다시 설정해주세요.", false)
          return
        }
      }
      // 기본값 validation
      sDefaultText = this.oWpDervData.dervDataDefault[0]['default_value']
      if (sDefaultText.length > 0){
        if (this.o_apiType == 'SPARK') {
          if (sFullColFlag)
            sViewtext = sDefaultText
          else
            sViewtext += `ELSE '${sDefaultText}' END`
        }
      }
      else {
        this.cWpAppSvc.showMsg("파생열 조건 기본값을 입력해주세요", false)
        return
      }
      this.oWpDervData.queryText = sViewtext
      this.dialogRef.close(this.oWpDervData);
  }
  onClose(){
    this.dialogRef.close(this.oWpDervData);
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub =>{
      sSub.unsubscribe()
    })
  }
  // WPLAT-350
  onDerivedColumnChanged(p_data1:any, p_data2: any, p_data3: any) {
    this.o_conditionColumn = this.oColInfo.slice(0, this.oColInfo.length - 1);
    this.oWpDervData.displayOption[p_data3]['type'] = this.oWpDervData.displayOption[p_data3]['type'] + "_" + p_data1.event.value;
  }
}
