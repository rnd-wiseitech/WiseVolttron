import { Component, EventEmitter, Input, Output } from '@angular/core';
import { WpLoadingService } from './wp-lib-loading.service';

@Component({
  selector: 'lib-wp-loading',
  templateUrl: './wp-lib-loading.component.html',
  styleUrls: ['./wp-lib-loading.component.css']
})
export class WpLoadingComponent {
    // progressbar Name
    @Input() iName:string;
    @Input() iFullScreen:boolean;
    // 하이브에서 사용
    // @Input() iButton:boolean;
    // @Input() iData:any;
    @Output() callBack: EventEmitter<any> = new EventEmitter();  // callback 함수
    
    constructor(public cWpLoadingSvc: WpLoadingService) {}


    ngOnInit(): void {
    }

    onCancel() {
      this.cWpLoadingSvc.showProgress(false, this.iName);
      this.callBack.emit({spinNm:this.iName, jobNm:this.cWpLoadingSvc.oJobName});
      // this.cWpLoadingSvc.cancelSparkJob(this.iData).subscribe(pResult => {
      // })
    }
}
