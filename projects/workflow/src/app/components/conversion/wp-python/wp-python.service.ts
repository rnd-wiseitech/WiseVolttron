import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WpPythonService extends WpSeriveImple {
    constructor(
        private cHttp: HttpClient,
        private cAppConfig: WpAppConfig) {
        super(cAppConfig);
    }
    oUrl = this.cAppConfig.getServerPath("NODE");
    // pViewId : 코드를 적용할 데이터인 usetable의 group_id _ jobId
    // pJobId : 파이썬 컴포넌트의 jobId
    getCodeResult(pViewId: string, pCode: string, pJobId: string) {
        let sTmp = pViewId.split('_');
        let sParams = {
            usetable_groupId: sTmp[0],
            usetable_jobId: sTmp[1],
            value: pCode,
            jobId: pJobId
        };
        return new Promise((resolve, reject) => {
            this.cHttp.post(this.oUrl + '/wkservice/getPythonResult', sParams)
                .toPromise().then(response => {
                    resolve(response);
                }, pError => {
                    reject(pError);
                });
        });
    }

    getModelInfo(p_data: any): Observable<any> {
            return this.cHttp.post(this.oNodeUrl +  '/jobexcute/getModelInfo', p_data);
        }
}