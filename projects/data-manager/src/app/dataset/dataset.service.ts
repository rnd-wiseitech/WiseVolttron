import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WP_DATASET_ATT } from 'projects/wp-server/wp-type/WP_DATASET_ATT';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class DataSetSerivce extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    
    // 어드민계정으로 다른 계정의 파일 다운로드시 
    // 해당 어드민계정의 하둡경로로 가기 때문에 reg_user_no필요
    downloadFile(pFilePath:any, pType:any, pRegUserno: any){        
        return this.cHttp.get(this.oNodeUrl + '/hdfs/download',{responseType:"arraybuffer",params: {filePath:`${pRegUserno}/${pFilePath}`, type:pType}});    
    }
    getDownloadUrl(p_filePath: any, p_fileName: any) {
        return this.cHttp.post(this.oNodeUrl + '/hdfs/getDownloadUrl', {path:p_filePath, filename:  p_fileName});    
    } 
    getRestUrl(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + "/userMng/userInfo", {});
    }
    delFile(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/delFile', pParam);    
    }
    chkDatasetlist(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/chkDatasetlist', {filename:pParam});    
    }
    addDataset(pData:WP_DATASET_ATT, pClientId:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/addDataset', {dataInfo:pData, clientId: pClientId});
    }
    updateUserDatasetAuth(pData:any, pAdd:any, pRemove:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/auth/updateUserDatasetAuth', {params:{dataInfo:pData, addList:pAdd, removeList:pRemove}});
    }

    updateUserModelAuth(pData:any, pAdd:any, pRemove:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/auth/updateUserModelAuth', {params:{dataInfo:pData, addList:pAdd, removeList:pRemove}});
    }
    updateUserAuth(pData:any, p_type:string, pAdd:any, pRemove:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/auth/updateUserAuth', {params:{dataInfo:pData, type:p_type, addList:pAdd, removeList:pRemove}});
    }
    updateGroupAuth(pData:any, p_type:string, pAdd:any, pRemove:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/auth/updateGroupAuth', {params:{dataInfo:pData, type:p_type, addList:pAdd, removeList:pRemove}});
    }
    // hive table list
    getHiveTableList(pParam:any ): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/hive/hiveTalbeInfo', pParam);
    }

    // dataset convert hive
    datasetHive(pParam: any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/datasetHive', pParam);    
    }

    // 하이브 테이블 변환시 update dp_view_tbl_mstr
    updateDpViewTblMstr(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/wd/toHiveUpdate', pParam);    
    }
    // 이미지데이터셋 zip파일 다운로드
    async downloadZipFile(p_modelName:string, p_artifactPath: any) {
        this.cHttp.post(this.oNodeUrl + '/hdfs/getDownloadZipUrl', {path : p_artifactPath, filename : p_modelName, option: 'dateset' }).subscribe((response :any) => {
            const link = document.createElement('a');
            link.href = response.url;
            link.download = ``;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })

    }
}