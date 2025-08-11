import { Component, Inject, OnDestroy, OnInit } from "@angular/core";
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog
} from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { WpComponentViewerService } from "../wp-component-viewer.service";
import { MonacoEditorConstructionOptions } from '@materia-ui/ngx-monaco-editor';
import { WpPythonService } from "../conversion/wp-python/wp-python.service";
import { WpSocket } from "projects/wp-lib/src/lib/wp-socket/wp-socket";
import { WpComSchema } from "projects/wp-server/wp-type/WP_COM_ATT";
import { TranslateService } from '@ngx-translate/core';
import { MainAppService } from "projects/main/src/app/app.service";
import { WpPopupComponent } from "projects/wp-lib/src/lib/wp-popup/wp-popup.component";
interface IGridData { COL_NAME: string, COL_TYPE: string }
interface IGridCol { NAME: string; VISIBLE: boolean; VNAME: string; TYPE: string; }

@Component({
  selector: 'wp-python-popup',
  templateUrl: './wp-python-popup.component.html',
  styleUrls: ['./wp-python-popup.component.css']
})
export class WpPythonPopupComponent implements OnInit, OnDestroy {
  oSubs: Subscription[] = [];
  oGridData: IGridData[] = [];
  oGridCol: IGridCol[] = [];
  oDisplayCols: string[] = ['COL_NAME', 'COL_TYPE'];
  oDisplayColNms: string[] = ['사용가능한 변수명', '타입'];
  h_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'python',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true
  };
  h_query: any = {
    code: "print(df)",
    editor: $('#wp_python_popup_code'),
  };

  h_result_query: any = {
    code: "",
    editor: $('#wp_python_popup_result_code'),
  };

  h_result_queryOptions: MonacoEditorConstructionOptions = {
    theme: 'myCustomTheme',
    language: 'python',
    roundedSelection: true,
    autoIndent: 'full',
    minimap: {
      enabled: false
    },
    automaticLayout: true,
    readOnly: true
  };
  h_pythonResult = false;
  h_codeResult = '';
  h_popup: any = null;

  h_kerasTemplateCode = `
"""
📌 [전이 학습 코드 작성 가이드]
- 아래 템플릿을 참고하여 's_model'을 활용한 전이 학습 코드를 작성하세요.
- 사전 훈련된 모델 ('s_model')을 기반으로 새 모델을 생성하고, 필요한 레이어를 추가할 수 있습니다.
- 모델 컴파일('compile')까지만 작성하셔야 합니다.
- 's_new_model' 변수에 최종적으로 학습할 모델을 저장해야 합니다.

🚀 [사용 가능 변수]
- 's_model': 사전 훈련된 TensorFlow/Keras 모델 (전이 학습의 기반 모델)
- 's_optimizer': UI에서 선택한 옵티마이저
- 's_loss': UI에서 선택한 손실 함수
- 's_metrics': UI에서 선택한 평가 지표

⚠️ [주의 사항]
1. 's_model'의 기존 레이어를 어떻게 사용할지 결정해야 합니다. (일부 동결 / 모든 레이어 학습 가능 등)
2. 새로운 모델('s_new_model')을 생성할 때, 입력, 출력 레이어를 적절히 수정해야 합니다.
3. 모델을 'compile()'할 때, UI에서 설정한 'optimizer', 'loss', 'metrics' 값이 설정되며 
코드 내에서 임의로 바꾸게 될 경우, 모델 관리에서 사용한 파라미터 값이 제대로 나오지 않을 수 있습니다.
"""
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# ✅ [1] 기존 모델의 가중치 동결 (필요 시 변경 가능)
s_model.trainable = False  

# ✅ [2] 새로운 레이어 추가 (사용자가 직접 'activation'과 'dropout_rate' 설정)
new_layers = keras.Sequential([
    layers.Dense(128, activation="relu"),  # 사용자 정의 활성화 함수 적용
    layers.Dropout(0.5),  # 사용자 정의 dropout 적용
    layers.Dense(3, activation="softmax")  # 출력층 (다중 분류 기준)
])

# ✅ [3] 기존 모델과 새로운 레이어 결합하여 새 모델 생성
s_new_model = keras.Sequential([
    s_model,  
    new_layers
])

# ✅ [4] 모델 컴파일 (UI에서 설정한 값 적용)
s_new_model.compile(
    optimizer=s_optimizer,  # UI에서 선택한 옵티마이저
    loss=s_loss,  # UI에서 선택한 손실 함수
    metrics=[s_metrics]  # UI에서 선택한 평가 지표
)      
      `;

h_pytorchTemplateCode = `
"""
📌 [전이 학습 코드 작성 가이드 - PyTorch 버전]
- 아래 템플릿을 참고하여 's_model'을 활용한 전이 학습 코드를 작성하세요.
- 사전 훈련된 모델 ('s_model')을 기반으로 새 모델을 생성하고, 필요한 레이어를 추가할 수 있습니다.
- forward 함수 및 모델 구조 정의까지만 작성해주세요.
- 최종적으로 's_new_model' 변수에 새 모델 인스턴스를 저장하세요.

🚀 [사용 가능 변수]
- 's_model': 사전 훈련된 PyTorch 모델 (전이 학습의 기반 모델)

⚠️ [주의 사항]
1. 's_model'의 기존 레이어를 freeze 할지 여부를 결정하세요.
2. 출력 레이어의 차원은 사용자 문제에 맞게 조정해야 합니다.
3. 's_new_model'에 최종 전이 학습 모델을 인스턴스로 할당해주세요.
"""

import torch
import torch.nn as nn

# ✅ [1] 기존 모델의 가중치 동결 (필요 시 변경 가능)
for param in s_model.parameters():
    param.requires_grad = False  # 필요 시 True로 변경

# ✅ [2] 사용자 정의 새 레이어 (예: fc 레이어 추가 및 활성화 함수, 드롭아웃 등)
class TransferLearningModel(nn.Module):
    def __init__(self, base_model):
        super(TransferLearningModel, self).__init__()
        self.base_model = base_model
        self.new_layers = nn.Sequential(
            # 입력 크기는 base_model 출력 크기
            nn.Linear(in_features=base_model.fc.out_features, out_features=128),  
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(128, 3)  # 사용자 정의 출력 크기 (예: 3 클래스)
        )
    
    def forward(self, x):
        x = self.base_model(x)
        x = self.new_layers(x)
        return x

# ✅ [3] 모델 인스턴스 생성
s_new_model = TransferLearningModel(s_model)
`;
  constructor(@Inject(MAT_DIALOG_DATA) public data: { schema: any, code: string, usetable: string, result: { [index: string]: any }, jobId: string, excuteFlag: boolean, popupType?: any, param?: any },
    public dialogRef: MatDialogRef<WpPythonPopupComponent>,
    private cWpPythonSvc: WpPythonService,
    private cWpComViewSvc: WpComponentViewerService,
    private cWpSocketSvc: WpSocket,
    private cTransSvc: TranslateService,
    private cMainAppSvc: MainAppService,
    public cDialog: MatDialog,
  ) {

  }
  ngOnInit() {
    this.h_popup = this.data.popupType ?? null;
    if(this.h_popup == 'transfer-model') {
      if(this.data.param.FRAMEWORK_TYPE == 'TensorFlow/Keras') {
        this.h_query.code = this.h_kerasTemplateCode;
      } else if(this.data.param.FRAMEWORK_TYPE == 'PyTorch') {
        this.h_query.code = this.h_pytorchTemplateCode;
      }

    let sCodeResultElem = document.getElementById('default_python');
    sCodeResultElem.style.display = 'none';  
    } else if(this.h_popup == 'pytorch-class') {
      this.h_query.code = `
"""
✅ 주의사항:
1. 반드시 nn.Module을 상속받아 모델 클래스를 작성하세요.
2. 클래스 이름은 자유롭게 지정 가능하지만,
   업로드 시 '클래스명 입력' 칸에 동일한 이름을 입력해야 합니다.
3. __init__() 함수 안에서 필요한 레이어를 정의하세요.
4. forward(self, x) 함수 안에서 연산 과정을 정의하세요.
5. 입력/출력 형태는 학습 시 사용했던 모델과 동일해야 합니다.
6. 마지막에 's_model = 클래스명()' 으로 인스턴스를 생성해주세요.

✅ TIP:
 - torch.nn 모듈의 모든 기능을 사용할 수 있습니다.
 - forward() 함수 내부에서 자유롭게 연산하세요.
 - 학습 때 저장한 state_dict 파일과 이 모델의 구조가 반드시 일치해야 합니다.
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
# 👇 커스텀 모델 클래스 템플릿:
class MyModel(nn.Module):
    def __init__(self):
        super(MyModel, self).__init__()
        self.fc1 = nn.Linear(10, 50)
        self.fc2 = nn.Linear(50, 2)

    def forward(self, x):
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x

s_model = MyModel()
      `
      let sCodeResultElem = document.getElementById('default_python');
    sCodeResultElem.style.display = 'none';  
    } else {
      let sCodeResultElem = document.getElementById('code-result');
      sCodeResultElem.style.display = 'none';
    }
    this.drawGrid(this.data.schema, this.h_popup);

    // 결과 영역 처음에는 숨김
    if (this.data.code && this.data.code !== '') {
      this.h_query.code = decodeURIComponent(atob(this.data.code));
    }
    if (this.data.result.code_result && this.data.result.code_result !== '') {
      this.h_codeResult = decodeURIComponent(atob(this.data.result.code_result));
      // 결과 영역 표시
      let sCodeResultElem = document.getElementById('code-result');
      sCodeResultElem.style.display = 'block';
      let sPopupElem = document.getElementById('wpPythonPopup');
      sPopupElem.className = 'modal extra-large on';
    }

  }
  //사용가능한 컬럼 그리드 그림.
  drawGrid(pSchema: any, p_type: any) {
    if (p_type == null) {
      let sGridData: IGridData[] = [];
      // 컬럼명 그리드 데이터 설정
      pSchema.forEach((sSchema:any) => {
        sGridData.push({ COL_NAME: sSchema.name, COL_TYPE: sSchema.type });
      });
      this.oGridData = sGridData;
      let sGridCol: IGridCol[] = [];
      for (const sCol of Object.keys(this.oGridData[0])) {
        let sIndex = this.oDisplayCols.findIndex(pVal => pVal === sCol);
        if (sIndex == -1) {
          sGridCol.push({
            'NAME': sCol, 'VISIBLE': false, 'VNAME': sCol, 'TYPE': 'string'
          });
        } else {
          sGridCol.push({
            'NAME': sCol, 'VISIBLE': true, 'VNAME': this.oDisplayColNms[sIndex], 'TYPE': 'string'
          });
        }
      }
      this.oGridCol = sGridCol;
    } else if(p_type=='transfer-model') {
      this.oGridData = pSchema;
      let sGridCol: IGridCol[] = [
        { NAME: 'Layer Name', VISIBLE: true, VNAME: 'Layer (name)', TYPE: 'string' },
        { NAME: 'Layer Type', VISIBLE: true, VNAME: 'Layer (type)', TYPE: 'string' },
        { NAME: 'Input Shape', VISIBLE: true, VNAME: 'Input Shape', TYPE: 'string' },
        { NAME: 'Output Shape', VISIBLE: true, VNAME: 'Output Shape', TYPE: 'string' },
        { NAME: 'Activation', VISIBLE: true, VNAME: 'Activation', TYPE: 'string' },
        { NAME: 'Param', VISIBLE: true, VNAME: 'Param #', TYPE: 'string' },
      ];
      this.oGridCol = sGridCol;

    }

  }
  // 코드 에디터 초기 설정
  editorInit(editor: any) {
    this.h_query['editor'] = editor;
    // Programatic content selection example
    editor.setSelection({
      startLineNumber: 1,
      startColumn: 1,
      endColumn: 10,
      endLineNumber: 3
    });
  }
  // # DI 오류수정
  chkSocketConnection() {
    if (!this.cWpSocketSvc.oSocketStatus) {
      console.log("Socket Reconnected");
      this.cWpSocketSvc.onConnection();
    }
  }
  async onSubmit(pEvent: any) {
    // 파이썬 코드 실행 (spark로 코드, 뷰아이디 던짐)
    // base64 인코딩 해서 전송
    this.data.code = btoa(encodeURIComponent(this.h_query.code));
    this.chkSocketConnection();
    try {
      // 코드 실행시
      if (this.data.excuteFlag) {
        this.cWpComViewSvc.showProgress(true);
        let sResult: any = await this.cWpPythonSvc.getCodeResult(this.data.usetable, this.data.code, this.data.jobId);
        sResult = JSON.parse(sResult);
        this.data.result = sResult;
        this.h_codeResult = decodeURIComponent(atob(sResult.code_result));

        // 결과 영역 표시
        let sCodeResultElem = document.getElementById('code-result');
        sCodeResultElem.style.display = 'block';
        let sPopupElem = document.getElementById('wpPythonPopup');
        sPopupElem.className = 'modal extra-large on';
      } else {
        // 코드 실행안하면 그냥 팝업 닫음.
        this.dialogRef.close(this.data);
      }
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      // this.data.code = 'print(df)';
      this.cWpComViewSvc.showMsg(this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info108"), false);
      this.data.excuteFlag = false;
    } finally {
      this.cWpComViewSvc.showProgress(false);
    }
  }
  onClose() {
    this.dialogRef.close(this.data);
  }
  ngOnDestroy(): void {
    this.oSubs.forEach(sSub => {
      sSub.unsubscribe();
    })
  }

  async onPythonSubmit(p_ev: any) {
    this.cWpComViewSvc.showProgress(true);
    try {
        if(p_ev == 'check') {
          let s_param = {}
          if(this.h_popup =='transfer-model') {
            s_param = {
              'method': 'CHECK-CODE',
              'location': 'workflow',
              'MODEL_ID': this.data.param.MODEL_ID,
              'MODEL_IDX': this.data.param.MODEL_IDX,
              'PARAMETER': this.data.param.PARAMETER,
              'PYTHON_CODE': btoa(encodeURIComponent(this.h_query.code)),
              'CUSTOM_YN': this.data.param.CUSTOM_YN,
              'FRAMEWORK_TYPE': this.data.param.FRAMEWORK_TYPE
            }
          } else if(this.h_popup='pytorch-class') {
            s_param = {
              'method': 'CHECK-CLASS',
              'location': 'workflow',
              'PYTHON_CODE': btoa(encodeURIComponent(this.h_query.code))
            }
          }
          
  
          let s_modelInfo = await this.cWpPythonSvc.getModelInfo(s_param).toPromise();
          let s_summary = JSON.parse(s_modelInfo)['data'];
          this.h_result_query.code = s_summary;
          this.h_pythonResult = true;   
        } else if (p_ev == 'code') {
          this.h_pythonResult = false; 
        } else if (p_ev == 'access') {
          this.data.code = btoa(encodeURIComponent(this.h_query.code));
          this.h_pythonResult = false; 
          this.dialogRef.close(this.data);
        }
          
    } catch (pErr: any) {
      // 실행 에러시 code, result 초기화;
      this.data.result = {}
      // this.data.code = 'print(df)';
      this.cWpComViewSvc.showMsg(`${this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info108")}\nerror: ${pErr.error.message}`, false);
      this.data.excuteFlag = false;
    } finally {
      this.cWpComViewSvc.showProgress(false);
    }
  }
}
