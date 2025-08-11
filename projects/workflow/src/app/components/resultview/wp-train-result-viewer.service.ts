import { HttpClient } from '@angular/common/http';
import { Injectable,Output,EventEmitter } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({providedIn:'root'})
export class WpTrainResultviewService extends WpSeriveImple  {
    constructor(
        private cAppConfig:WpAppConfig,
        private cHttp: HttpClient) {
            super(cAppConfig);
        }

    // runTextGeneration(pArgNm: any, pModelId: any, pUuid: any, pInputText: string, pAnalType: any): Observable<any> {
    //     return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + "/pyservice/RunTextGeneration", {
    //         argNm: pArgNm,
    //         modelId: pModelId,
    //         uuid: pUuid,
    //         inputText: pInputText,
    //         analType: pAnalType
    //     });
    // }
}