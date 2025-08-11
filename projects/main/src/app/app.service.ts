
import { Injectable } from '@angular/core';
import { WpMainAppSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/main-appservice-imple';

@Injectable()
export class MainAppService extends WpMainAppSeriveImple {
    // @Output() showModal: EventEmitter<any> = new EventEmitter();
    
    constructor() { 
        super();
    }
    // showMsg(pMsg:string, pType:boolean){
    //     this.showModal.emit({msg:pMsg,type:pType,flag:true});
    // }
    
}