import { EventEmitter, Injectable, Output, } from '@angular/core';

// platform, prophet 메인 appservice type
@Injectable()
export class WpMainAppSeriveImple {
    @Output() showModal: EventEmitter<any> = new EventEmitter();
    
    public oLang='ko';  // 현재 platform 만 사용.
    
    constructor() { }
    showMsg(pMsg:string, pType:boolean){
        this.showModal.emit({msg:pMsg,type:pType});
    }
    getLang(){
        return this.oLang;
    }
}