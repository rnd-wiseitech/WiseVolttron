import { HttpClient } from '@angular/common/http';
import { Injectable,Output,EventEmitter } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';


@Injectable({providedIn:'root'})
export class WpResultViewerService extends WpSeriveImple  {
    constructor(
        private cAppConfig:WpAppConfig,
        private cHttp: HttpClient) {
            super(cAppConfig);
        }
    // @Output() pushJobStatusEmit: EventEmitter<any> = new EventEmitter();
    @Output() nextStepEmit: EventEmitter<any> = new EventEmitter();
    @Output() onCloseResultViewerEmit: EventEmitter<any> = new EventEmitter();
    // pushJobStatus(pJobData:any){
    //     this.pushJobStatusEmit.emit(pJobData.data);
    // }
    nextStep(pJobData:any){
        this.nextStepEmit.emit(pJobData.data);
    }
    // unSubscribeEmit(){
    //     this.pushJobStatusEmit.observers[0].complete();
    //     this.nextStepEmit.observers[0].complete();
    // }
    onCloseResultViewer(){
        this.onCloseResultViewerEmit.emit();
    }
}