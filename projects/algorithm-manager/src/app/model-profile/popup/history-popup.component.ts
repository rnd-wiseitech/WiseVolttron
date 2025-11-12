import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { ModelProfileService } from '../model-profile.service';

@Component({
    selector: 'model-history-popup',
    templateUrl: './history-popup.component.html',
    styleUrls: ['./history-popup.component.css']
})

export class ModelHistoryPopupComponent implements OnInit {
    h_paramGridCol: any = [];
    h_paramGridData: any = [];
    h_chartData: any;
    h_popup = false;
    h_type = 'metrics';
    constructor(
        @Inject(MAT_DIALOG_DATA) public oData: {
            title: string,
            modelId: string,
            modelIdx: number
        },
        public dialogRef: MatDialogRef<ModelHistoryPopupComponent>,
        private cWpLibSvc: WpLoadingService,
        private cWpModelProfileSvc: ModelProfileService,
    ) {
    }

    ngOnInit() {
        console.log("ModelHistoryPopupComponent oData : ", this.oData);
        this.h_paramGridCol = [];
        this.cWpModelProfileSvc.getModelPerformanceHistory(this.oData.modelId).pipe()
            .subscribe(p_result => {
                let s_historyResult = JSON.parse(p_result)['data']
                this.h_paramGridData = s_historyResult['params'];
                if (this.h_paramGridData.length > 0) {
                    this.h_popup = true;
                    let sGridColList: any = [{
                        'NAME': 'MODEL_IDX',
                        'VISIBLE': true,
                        'VNAME': 'MODEL_IDX',
                        'TYPE': 'number'
                    },{
                        'NAME': 'MODEL_NAME',
                        'VISIBLE': true,
                        'VNAME': 'MODEL_NAME',
                        'TYPE': 'string'
                    }];
                    s_historyResult['param_key'].forEach((s_key:string) => {
                        let sGridCol = {
                            'NAME': s_key,
                            'VISIBLE': true,
                            'VNAME': s_key,
                            'TYPE': 'number'
                        };
                        if (isNaN(this.h_paramGridData[0][s_key])){
                            sGridCol['TYPE'] = 'string';
                        }
                        sGridColList.push(sGridCol);
                    })
                    this.h_paramGridCol = sGridColList;
                    this.cWpLibSvc.showProgress(false, "algorithmspin");
 
                } 
                let sChartData = this.cWpModelProfileSvc.getMetricChartData(this.oData.modelIdx, s_historyResult['metrics'], s_historyResult['metrics_key'])
                this.h_chartData = sChartData;
            });
        

    }
    onConfirm() {
        this.dialogRef.close({ result: true, data: [] });
    }
    onCancel() {
        this.dialogRef.close({ result: false });
    }
    onChangeType(pType:string) {
        this.h_type = pType;
    }
    ngOnDestroy(): void {
        console.log('히스토리 차트 파괴~');
        this.h_chartData = [];
    }
}
