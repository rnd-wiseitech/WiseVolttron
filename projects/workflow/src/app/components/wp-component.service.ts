import { Injectable, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Injectable({providedIn:'root'})
export class WpComponentService implements OnDestroy {
    oSubs: Array<WpSubsData> = new Array<WpSubsData>();
    constructor() {}
    addSubscription(pId: string, pSubs: Subscription[]) {
        this.oSubs.push({ id: pId, subs: pSubs });
    }
    removeSubscription(pId: string) {
        let sIdx = this.oSubs.findIndex((sSubsData) => sSubsData.id == pId);
        if (sIdx !== -1) {
            this.oSubs[sIdx].subs.forEach((sSub) => {
                sSub.unsubscribe();
            });
            this.oSubs.splice(sIdx, 1);
        }
    }
    getSubsIdx(pId:string){
        let sIdx = this.oSubs.findIndex((sSubsData) => sSubsData.id == pId);
        return sIdx;
    }
    ngOnDestroy(): void {
        this.oSubs.forEach(sSubsciption => {
            sSubsciption.subs.forEach((sSub) => {
                sSub.unsubscribe();
            })
        })
    }
}
class WpSubsData {
    id: string; // componentId
    subs: Subscription[]; // 컴포넌트별 subscription
}
