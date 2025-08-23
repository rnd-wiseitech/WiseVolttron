import { Component, OnInit, Input, Inject } from '@angular/core';
// import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
declare const $: any;

@Component({
    selector: 'wp-popup-basic',
    templateUrl: './wp-popup-basic.component.html',
    styles: [``]
})

export class WpPopupBasicComponent implements OnInit {
    
    constructor( 
        @Inject(MAT_DIALOG_DATA) public oData: {
            msg:any
        },
        public dialogRef: MatDialogRef<WpPopupBasicComponent>
        
    ) { }

    ngOnInit() {
    }
    onConfirm(){
      this.dialogRef.close(true);
    }
    onCancel(){
      this.dialogRef.close(false);
    }
  



}
