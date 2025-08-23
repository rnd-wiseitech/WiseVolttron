import { Injectable } from "@angular/core";
import { AbstractControl } from "@angular/forms";

@Injectable({
  providedIn: 'root'
})
export class CustomValidator {
  scheduleValidator(p_col: any, p_default: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any => {
      let p_check = false;
      let p_msg = "";

      if (p_col == 'SCH_NM') {
        p_check = (p_default.indexOf(control.value) != -1);
        p_msg = `해당 스케줄명은 이미 등록되어 있습니다.`;
      }
      if (p_col == 'ED_DT') {
        p_check = (control.value < new Date());
        if (control.value < new Date()) {
          p_check = true;
          p_msg = "종료 날짜는 현재 날짜보다 작을 수 없습니다."
        }

        if (control.value < p_form['ST_DT'].value) {
          p_check = true;
          p_msg = "종료 날짜는 시작 날짜보다 작을 수 없습니다."
        }
      }
      if (p_col == 'ST_DT') {
        p_form['ED_DT'].updateValueAndValidity();
      }

      if(p_col == 'USE_CORE' || p_col == 'USE_MEMORY') {

        if(isNaN(control.value)){
          p_check = isNaN(control.value)
          p_msg = "숫자를 입력해야 합니다."
        } else {
          if(p_col == 'USE_CORE' && (control.value < p_default[0])) {
            p_check = true;
            p_msg = `최소 코어 수는 ${p_default[0]}입니다.`

          }
          if(p_col == 'USE_CORE' && (control.value > p_default[1])) {
            p_check = true;
            p_msg = `최대 코어 수는 ${p_default[1]}입니다.`

          }
          if(p_col == 'USE_MEMORY' && (control.value < p_default[0])) {
            p_check = true;
            p_msg = `최소 사용 메모리는 ${p_default[0]}MB입니다.`

          }
          if(p_col == 'USE_MEMORY' && (control.value > p_default[1])) {
            p_check = true;
            p_msg = `최대 사용 메모리는 ${p_default[1]}MB입니다.`

          }
        }
      }

      return p_check ? { message: p_msg } : null;


    };
  }
  // connection도 함께 사용
  datasetValidator(p_col:any, p_value: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any =>{
      let p_check = false;
      let p_msg = "";
 
      if(p_col =='DS_VIEW_NM') {
          p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
          p_msg = `해당 데이터셋명은 이미 등록되어 있습니다.`;
      }
      if(p_col =='connection_name') {
          p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
          p_msg = `해당 연결명은 이미 등록되어 있습니다.`;
      }
      return p_check ? {message: p_msg} : null;     
      
    };
  }
  // 하이브 등록
  setHiveValidator(p_col:any, p_value: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any =>{
      let p_check = false;
      let p_msg = "";
      if(p_col =='HIVE_TABLE') {
        p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
        p_msg = `해당 테이블명이 이미 존재합니다.`;
      }
      
      return p_check ? {message: p_msg} : null;     
      
    };
  }
  // 워크플로우 사용자 매개변수명
  userParamNmValidator(p_col: any, p_value: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any => {
      let p_check = false;
      let p_msg = "";
      if (p_col == 'param_nm') {
        p_check = (control.value[0] != '@');
        p_msg = `매개변수명의 첫 글자는 @ 입니다.`;
      }
      return p_check ? { message: p_msg } : null;
    };
  }
  resourceValidator(p_col: any, p_value: any, p_default: any, p_form: any): any {
    return (control: AbstractControl): any => {
      let p_check = false;
      let p_msg = "";

      if (p_col == 'allo_core') {
        if (control.value > p_default) {
          p_check = true;
          p_msg = "사용 가능 코어를 초과하여 설정할 수 없습니다."
        }
        if (isNaN(control.value) == true) {
          p_check = true;
          p_msg = "올바른 코어 수를 입력해주세요."
        }
      }
      if (p_col == 'allo_gpu_core') {
        if (control.value > p_default) {
          p_check = true;
          p_msg = "사용 가능 코어를 초과하여 설정할 수 없습니다."
        }
        if (isNaN(control.value) == true) {
          p_check = true;
          p_msg = "올바른 코어 수를 입력해주세요."
        }
      }  
      if (p_col == 'allo_memory') {
        if (Number(control.value.slice(0,-1)) > Number(p_default.slice(0,-1))) {
          p_check = true;
          p_msg = "사용 가능 메모리를 초과하여 설정할 수 없습니다."
        }
        if (isNaN(Number(control.value.slice(0,-1))) == true) {
          p_check = true;
          p_msg = "올바른 메모리 값을 입력해주세요."
        }
      } 

      return p_check ? { message: p_msg } : null;

    }
  }
  saveLayerValidator(p_col: any, p_value: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any => {
      let p_check = false;
      let p_msg = "";
      if (p_col == 'ARG_TYPE') {
        if (!['Classification', 'Regression', 'Clustering'].includes(control.value))
          p_msg = `알고리즘 종류를 선택해주세요`;
      }
      if (p_col == 'ARG_NM') {
        p_check = !/^[A-Za-z0-9\-\_]*$/.test(control.value);
        p_msg = `알고리즘 명을 영문으로 입력해주세요`;
      }
      return p_check ? { message: p_msg } : null;
    };
  }

  // connection도 함께 사용
  serverValidator(p_col:any, p_value: any, p_type: any, p_form: any): any {
    return (control: AbstractControl): any =>{
      let p_check = false;
      let p_msg = "";
 
      if(p_col =='SERVER_NAME') {
          p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
          p_msg = `해당 서버명은 이미 등록되어 있습니다.`;
          return p_check ? {message: p_msg} : null;

      } else if(p_col =='CLUSTER_NAME') {
        p_check = (p_value.indexOf((control.value).toLowerCase())!=-1);
        p_msg = `해당 클러스터명은 이미 등록되어 있습니다.`;
        return p_check ? {message: p_msg} : null;

    }else if(p_col =='CONNECT_STATUS') {
        if(control.value == null) {
          return {message: '서버 접속을 확인하십시오.'};
        }
    }      
    };
  }
}
