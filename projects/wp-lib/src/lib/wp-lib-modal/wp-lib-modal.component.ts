import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges} from '@angular/core';

@Component({
  selector: 'lib-wp-modal',
  templateUrl: './wp-lib-modal.component.html',
  styleUrls: ['./wp-lib-modal.component.css']
})
export class WpModalComponent implements OnInit {
    // @Input() iGridData:any;
    @Input() iMsg:string;
    // block, none
    @Input() iFlag:boolean;  
    // info, alert
    @Input() iType:boolean;  
    @Input() iCallBackType:string;  
    @Output() callBack: EventEmitter<any> = new EventEmitter();
    
  

    constructor() { }

    ngOnInit(): void {
    }
    ngOnChanges(pChanges: SimpleChanges) {
    }
    onClose(pValue:boolean){
      this.callBack.emit(pValue);
    }

}
