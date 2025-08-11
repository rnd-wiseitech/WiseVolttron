import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material/dialog';
import { of, Subscription } from 'rxjs';
import { NgWizardConfig, NgWizardService, StepChangedArgs, StepValidationArgs, STEP_STATE, THEME } from 'ng-wizard';

import { WpResultViewerService } from './wp-result-viewer.service';
import { WorkflowAppService } from '../../app.service';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { JOB_DATA_ATT, WiseComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'wp-result-viewer',
  templateUrl: 'wp-result-viewer.component.html',
  styleUrls: ['./wp-result-viewer.component.css']
})
export class WpResultViewerComponent {
    oStepCount: unknown[] = [];
    oCurrentStepJob: {
        jobId: string,
        jobName: string,
        status: string,
        msg: string,
        time: number
    }[] = [];
    oStepStates: STEP_STATE[] = [];
    oCurrentStep: number = 0;
    oJobList: {
        id: string,
        type: number,
        text: string,
        data: WiseComData, //wk-data
        parent_id: string[],
        step: number
    }[];
    oFullTime: number = 0;
oAnalyiticModelFlag:boolean;
oJobLogSubscribe: Subscription;
oNextStepSubscribe: Subscription;
stepStates = {
    normal: STEP_STATE.normal,
    disabled: STEP_STATE.disabled,
    error: STEP_STATE.error,
    hidden: STEP_STATE.hidden
    };
// ng-wizard 기본 테마 사용 안하기 위해 아래 추가
config: NgWizardConfig = {
    selected: 0,
    theme: undefined,
    toolbarSettings: {
        showPreviousButton: false,
        showNextButton : false
    }
};
oGridCol =[
    {NAME:'jobId',VISIBLE:true,VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup53"),TYPE:'string'},
    {NAME:'jobName',VISIBLE:true,VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup54"),TYPE:'string'},
    {NAME:'status',VISIBLE:true,VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup55"),TYPE:'string'},
    {NAME:'time',VISIBLE:true,VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup56"),TYPE:'number'},
    {NAME:'msg',VISIBLE:true,VNAME:this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup57"),TYPE:'string'}
];
    constructor(
        public dialogRef: MatDialogRef<WpResultViewerComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { jobList: {[index:string]:JOB_DATA_ATT}, step_count: number, analyiticModelFlag?: boolean },
        private ngWizardService: NgWizardService,
        private cAppSvc:WorkflowAppService,
        private cWpResultViewerSvc:WpResultViewerService,
        private cWpSocketSvc:WpSocket,
        private cTransSvc: TranslateService) {}
    
    ngOnDestroy():void{
        this.oJobLogSubscribe.unsubscribe();
        this.oNextStepSubscribe.unsubscribe();      
    }
    ngAfterViewInit():void{
        console.log('======ngAfterViewInit=====');
        let sStepElem = document.getElementsByClassName('nav nav-tabs step-anchor')[0];
        sStepElem.classList.add('scrollbar','scroll-content','scroll-scrollx_visible');
    }
    ngOnInit(): void {
        console.log('======resultviewer=====');
        console.log(this.data);
        this.oAnalyiticModelFlag = this.data.analyiticModelFlag;
        this.oStepCount = new Array (this.data.step_count);
        this.oStepStates = Array.from({length: this.data.step_count}, () => STEP_STATE.normal); 
        // let sInitJob = this.data.initJob.reVal;
        this.oJobList = Object.values(this.data.jobList);
        for(let sJob of this.oJobList){
                this.oCurrentStepJob.push({
                    'jobId': sJob.id,
                    'jobName': sJob.text,
                    'status': this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup76"),
                    'msg': '',
                    'time': 0
            });
        }
        let sInitTime = Date.now();
        let sTime = sInitTime;

        this.oJobLogSubscribe = this.cWpSocketSvc.getJobLog().subscribe((pJobData:any) => {
            console.log('=========pJobData===============');
            console.log(pJobData);
            this.oCurrentStepJob.map((pJob:any)=>{
                if (pJobData['data'].jobId == pJob.jobId){
                    if (pJobData['data'].success == true){
                        pJob.status = this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup77");
                        pJob.time = Number(((Date.now() - sTime)/1000).toFixed(2));
                    } else if (pJobData['data'].success == 'ing'){
                        pJob.status = '진행중';
                    } else {
                        pJob.status = this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup78");
                        pJob.msg = pJobData['data'].msg;
                        pJob.time = Number(((Date.now() - sTime)/1000).toFixed(2));
                    }
                    // pJob.time = Number(((Date.now() - sTime)/1000).toFixed(2));
                    sTime = Date.now();
                    this.oFullTime += pJob.time;
                }
            });
            this.oFullTime = Number(this.oFullTime.toFixed(2));
        });
        this.oNextStepSubscribe = this.cWpSocketSvc.soketNextStep().subscribe((pJobData:any) => {
            console.log('=========nextStepEmit===============');
            console.log(pJobData);
            if(pJobData['data'])
                this.ngWizardService.next();
            else{            
                this.oStepStates[this.oCurrentStep] = STEP_STATE.error;
            }
        });
    }
    onNoClick(): void {
        this.dialogRef.close();
    }
    onClick(){
        this.cWpResultViewerSvc.onCloseResultViewer();
        this.dialogRef.close();
    }
    showPreviousStep(event?: Event) {
        this.ngWizardService.previous();
    }
    
    showNextStep(event?: Event) {
        this.ngWizardService.next();
    }
    
    resetWizard(event?: Event) {
        this.ngWizardService.reset();
    }
    
    setTheme(theme: THEME) {
        this.ngWizardService.theme(theme);
    }
    
    stepChanged(args: StepChangedArgs) {
        console.log('=====args.step=====');
        console.log(args.step);
        this.oCurrentStep = args.step.index+1
    }
    
    isValidTypeBoolean: boolean = true;
    
    isValidFunctionReturnsBoolean(args: StepValidationArgs) {
        return true;
    }
    
    isValidFunctionReturnsObservable(args: StepValidationArgs) {
        return of(true);
    }

}
