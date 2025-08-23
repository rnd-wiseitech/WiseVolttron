import { HttpClient } from '@angular/common/http';
import { EventEmitter, Injectable, Output, } from '@angular/core';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';

@Injectable({
    providedIn: 'root'
})
export class DmAppService extends WpSeriveImple{
    @Output() changeTabEmit: EventEmitter<any> = new EventEmitter();
    @Output() showProfileEmit: EventEmitter<any> = new EventEmitter();
    
    constructor(private cHttp: HttpClient,
        private cAppConfig: WpAppConfig) { 
            super(cAppConfig);
        }
    changeTab(pTabNm:string, pEl?:any){
        this.changeTabEmit.emit({tabNm: pTabNm, element:pEl});
    }
    getUserInfo() {
        return this.cHttp.post(this.oNodeUrl + '/userMng/userInfo', {});
    }
    // showProfile(pEl:any){       
    //     this.showProfileEmit.emit(pEl);
    // }
    
}