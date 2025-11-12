import { Injectable, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';

@Injectable({ providedIn: 'root' })
export class AlgorithmAppService {
    @Output() changeTabEmit: EventEmitter<any> = new EventEmitter();

    constructor(
        public cDialog: MatDialog,
    ) { }

    showMsg(pMsg: string, pFlag: boolean) {
        const dialogRef = this.cDialog.open(WpPopupComponent, {
            data: {
                'title': 'Message',
                'flag': pFlag,
                'message': pMsg,
                'colWidthOption': 'tight'
            }
        });
    }
    changeTab(pTabNm: string, pEl?: any) {
        this.changeTabEmit.emit({ tabNm: pTabNm, element: pEl });
    }
}