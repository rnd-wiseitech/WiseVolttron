import { Component, Inject, OnInit, ViewChild, ElementRef} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WorkflowAppService } from '../../app.service';
import { WpTrainResultviewService } from './wp-train-result-viewer.service'

@Component({
    selector: 'wp-train-result-viewer',
    templateUrl: './wp-train-result-viewer.html',
    styleUrls: ['./wp-train-result-viewer.css']
})
export class WpTrainResultviewComponent implements OnInit {
    constructor(
        public dialogRef: MatDialogRef<WpTrainResultviewComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private cAppSvc: WorkflowAppService,
        private cWpTrainResultView: WpTrainResultviewService) { }
    oChartData: any = [];
    oRGridData: any = [];
    oCGridData: any = [];
    oCLGridData: any = [];
    oLlmGridData: any = [];
    oRegChk = false;
    oClassChk = false;
    oClusterChk = false;
    hModelType: string = '';
    hGridData: any = [];
    hGridCol: any = [];

    oRGridCol = [
        { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'argNm', VISIBLE: true, VNAME: 'ARG NM', TYPE: 'string' },
        { NAME: 'accuracy', VISIBLE: true, VNAME: 'Accuracy', TYPE: 'number' },
        { NAME: 'mse', VISIBLE: true, VNAME: 'MSE', TYPE: 'number' },
        { NAME: 'rmse', VISIBLE: true, VNAME: 'RMSE', TYPE: 'number' },
        { NAME: 'mape', VISIBLE: true, VNAME: 'MAPE', TYPE: 'number' },
        { NAME: 'r2_score', VISIBLE: true, VNAME: 'R2 Score', TYPE: 'number' },
    ];
    oCGridCol = [
        { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'argNm', VISIBLE: true, VNAME: 'ARG NM', TYPE: 'string' },
        { NAME: 'accuracy', VISIBLE: true, VNAME: 'Accuracy', TYPE: 'number' },
        // 분류 모델은 precision, recall 등이 있음. (클래스별로)
    ];
    oCLGridCol = [
        { NAME: 'argId', VISIBLE: true, VNAME: 'ARG ID', TYPE: 'number' },
        { NAME: 'argNm', VISIBLE: true, VNAME: 'ARG NM', TYPE: 'string' },
        { NAME: 'silhoutte_coef', VISIBLE: true, VNAME: 'Silhoutte Coef', TYPE: 'number' },
    ];
    // 채팅모듈 정보
    oLangModelData: any = {
        MODEL_ID: '',
        MODEL_IDX: ''
    };

    ngOnInit(): void {
        console.log('============pPredcitData============');
        console.log(this.data);

        for (let sEvalResult of this.data) {
            let sResultData = sEvalResult.result;

            let sChartData:any = {
                argNm: sEvalResult.MODEL_NM,
                accuracy: 0
            };
            this.hModelType = sEvalResult.MODEL_EVAL_TYPE;
            if (sEvalResult.MODEL_EVAL_TYPE == 'Regression') {
                this.oRegChk = true;
                sChartData.accuracy = sResultData.accuracy;

                this.oRGridData.push({
                    argId: sEvalResult.ARG_ID,
                    argNm: sEvalResult.MODEL_NM,
                    accuracy: sResultData.accuracy.toFixed(3),
                    mse: sResultData.mse.toFixed(3),
                    rmse: sResultData.rmse.toFixed(3),
                    mape: sResultData.mape.toFixed(3),
                    r2_score: sResultData.r2_score.toFixed(3)
                });
            }
            // 280강화학습
            else if (sEvalResult.MODEL_EVAL_TYPE == 'Classification' || sEvalResult.MODEL_EVAL_TYPE == 'Reinforcement' || sEvalResult.MODEL_EVAL_TYPE == 'Image') {
                this.oClassChk = true;
                sChartData.accuracy = (sResultData.accuracy * 100);
                this.oCGridData.push({
                    argId: sEvalResult.ARG_ID,
                    argNm: sEvalResult.MODEL_NM,
                    accuracy: (sResultData.accuracy * 100).toFixed(3),
                });
            }

            else if (sEvalResult.MODEL_EVAL_TYPE == 'Clustering') {
                this.oClusterChk = true;
                this.oCLGridData.push({
                    argId: sEvalResult.ARG_ID,
                    argNm: sEvalResult.MODEL_NM,
                    silhoutte_coef: Number(sResultData['silhouette_coef']).toFixed(4)
                })
                delete sChartData['accuracy'];
                sChartData['silhouette_coef'] = Number(sResultData['silhouette_coef']).toFixed(4)

            } else if (sEvalResult.MODEL_EVAL_TYPE == 'Language') {
                this.hModelType = 'Language';
                this.oLlmGridData.push({
                    argId: sEvalResult.ARG_ID,
                    argNm: sEvalResult.MODEL_NM,
                    train_loss: Number(sResultData['train_loss']).toFixed(4)
                });
                delete sChartData['accuracy'];
                sChartData['train_loss'] = Number(sResultData['train_loss']).toFixed(4);

                this.oLangModelData.MODEL_ID = sEvalResult.MODEL_ID;
                this.oLangModelData.MODEL_IDX = sEvalResult.MODEL_IDX;

            // (검토) 현재 'Language'로 통합 중. 완료 후 'TEXT-GENERATION'은 삭제 예정
            } else if (sEvalResult.MODEL_EVAL_TYPE == 'TEXT-GENERATION') {
                this.hModelType = 'TEXT-GENERATION';
                this.oLlmGridData.push({
                    argId: sEvalResult.ARG_ID,
                    argNm: sEvalResult.MODEL_NM,
                    // loss: Number(sResultData['loss']).toFixed(4)
                })
                // delete sChartData['accuracy'];
                // sChartData['loss'] = Number(sResultData['loss']).toFixed(4);
            }
            this.oChartData.push(sChartData);

        }
        // 모델 타입에 따라서 화면에 표시하는 데이터 설정
        if (this.hModelType == 'Regression') {
            this.hGridData = this.onMergeDatasets(this.hGridData,this.oRGridData,'argId');
            this.hGridCol = this.oRGridCol;                
        }
        if (this.hModelType == 'Classification' || this.hModelType == 'Image') {
            this.hGridData = this.onMergeDatasets(this.hGridData,this.oCGridData,'argId');
            this.hGridCol = this.oCGridCol;
        }
        if (this.hModelType == 'Clustering') {
            this.hGridData = this.onMergeDatasets(this.hGridData,this.oCLGridData,'argId');
            this.hGridCol = this.oCLGridCol;
        }
        if (this.hModelType == 'Language') {
            this.hGridData = this.oLlmGridData;
            return;
        }
    }
    onNoClick(): void {
        try {

        } catch (e) {
            console.log(e)
        } finally {
            this.dialogRef.close();
        }
    }

    onMergeDatasets(dataset1: any, dataset2: any, key: string) {
        let s_merged:any = [];
      
        // 모든 키를 추출하여 합집합을 구함
        let allKeys = new Set<string>();
        dataset1.forEach((item:any) => Object.keys(item).forEach(k => allKeys.add(k)));
        dataset2.forEach((item:any) => Object.keys(item).forEach(k => allKeys.add(k)));
      
        // 첫 번째 데이터셋의 항목들을 병합
        dataset1.forEach((item1:any) => {
          let match = dataset2.find((item2:any) => item2[key] === item1[key]);
          let mergedItem: any = {};
      
          allKeys.forEach(k => {
            mergedItem[k] = item1[k] || (match ? match[k] : '');
          });
      
          s_merged.push(mergedItem);
        });
      
        // 두 번째 데이터셋에만 있는 항목들을 추가
        dataset2.forEach((item2:any) => {
          const match = dataset1.find((item1:any) => item1[key] === item2[key]);
          if (!match) {
            let mergedItem: any = {};
            allKeys.forEach(k => {
              mergedItem[k] = item2[k] || '';
            });
            s_merged.push(mergedItem);
          }
        });
      
        return s_merged;
    }
}
