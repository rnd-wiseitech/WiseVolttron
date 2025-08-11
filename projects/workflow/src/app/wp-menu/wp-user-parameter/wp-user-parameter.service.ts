import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';
import { WF_USER_PARAM_ATT } from 'projects/wp-server/metadb/model/WF_USER_PARAM';

@Injectable({
    providedIn: 'root'
})
export class WpUserParameterService extends WpSeriveImple {
    constructor(
        private cAppConfig: WpAppConfig,
        private cHttp: HttpClient,
    ) {
        super(cAppConfig);
    }
    oUrl = this.cAppConfig.getServerPath("NODE");

    getUserParams(): Observable<any> {
        return this.cHttp.post(this.oUrl + '/wkservice/getUserParam',{});
    }

    addUserParams(pData: { PARAM_NM: string, PARAM_VALUE: string, PARAM_FORMAT: string }): Observable<any> {
        return this.cHttp.post(this.oUrl + '/wkservice/addUserParam', pData);
    }

    deleteUserParams(pParamId: string): Observable<any> {
        return this.cHttp.post(this.oUrl + '/wkservice/updateUserParam', { DEL_YN: 'Y', PARAM_ID: pParamId });
    }

    modifyUserParams(pData: Partial<WF_USER_PARAM_ATT>): Observable<any> {
        return this.cHttp.post(this.oUrl + '/wkservice/updateUserParam', pData);
    }


}