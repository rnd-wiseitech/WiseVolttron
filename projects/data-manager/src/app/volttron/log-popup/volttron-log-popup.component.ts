import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ScheduleService } from '../volttron.service';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { TranslateService } from '@ngx-translate/core';
declare const $: any;

@Component({
    selector: 'dm-volttron-schedule-popup',
    templateUrl: './volttron-log-popup.component.html',
    styleUrls: ['./volttron-log-popup.component.css']
})

export class VolttronSchedulePopupComponent implements OnInit {
    h_gridCol: any;
    h_gridData: any;
    h_popup = false;
    constructor(
        @Inject(MAT_DIALOG_DATA) public oData: {
            title: string,
            sch_id: string,
            sch_nm: string
        },
        private cSchSvc: ScheduleService,
        public dialogRef: MatDialogRef<VolttronSchedulePopupComponent>,
        private cMainAppSvc: MainAppService,
        private cWpLibSvc: WpLoadingService,
        private cTransSvc: TranslateService

    ) {
    }

    ngOnInit() {
   
        this.cSchSvc.getLogList({ "SCH_ID": this.oData.sch_id }).pipe()
            .subscribe(pLogList => {
                this.h_gridData = pLogList['result'];
                if (this.h_gridData.length > 0) {
                    for(var data of this.h_gridData) {
                        data['STATUS'] = this.cTransSvc.instant(`WPP_DATA_MANAGER.SCHEDULE.INFO.LOG_${data['STATUS']}`)
                    }
                    this.h_popup = true;
                    this.h_gridCol = [
                        {
                            'NAME': "LOG_ID",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup13"),
                            'TYPE': 'string'
                        }, {
                            'NAME': "ST_DT",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup14"),
                            'TYPE': 'string'
                        }, {
                            'NAME': "ED_DT",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup15"),
                            'TYPE': 'string'
                        }, {
                            'NAME': "STATUS",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup16"),
                            'TYPE': 'string'
                        }, {
                            'NAME': "ANALYTIC_RESULT",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup18"),
                            'TYPE': 'string'
                        }, {
                            'NAME': "ERROR_MSG",
                            'VISIBLE': true,
                            'VNAME': this.cTransSvc.instant("WPP_DATA_MANAGER.SCHEDULE.POPUP.popup19"),
                            'TYPE': 'string'
                        }
                    ];
                    this.cWpLibSvc.showProgress(false, "wdspin");
 
                } else {
                    this.dialogRef.close({ result: false });
                    this.cWpLibSvc.showProgress(false, "wdspin");
                    this.cMainAppSvc.showMsg(`'${this.oData.sch_nm}'의 로그가 없습니다.`, false);
                }

            });

    }
    onConfirm() {
        this.dialogRef.close({ result: true, data: [] });
    }
    onCancel() {
        this.dialogRef.close({ result: false });
    }
    




}
