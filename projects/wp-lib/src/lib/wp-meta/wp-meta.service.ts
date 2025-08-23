import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';
import { WpSeriveImple } from './service-imple';


@Injectable()
export class WpMetaService extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    getWpMenuList() : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/metaservice/getWpMenuList', {});    
    }
    getMenuList() : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/metaservice/getMenuList', {});    
    }
    chkFilelist(pFileList:any, pFolderPath:any, pFolderFlag=false, pIsDownload=false) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/chkFilelist', {filelist:pFileList, folderpath:pFolderPath, folderflag:pFolderFlag, isDownload:pIsDownload});    
    }
    getDataLake(pFolderPath:any, pDbId:any=undefined, p_mode:string='all'):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/hdfs/getDataLakeList', {dsId:pDbId, folderPath:pFolderPath, filemode:p_mode});
    }
    getFtpInfo(pDbId: any, pFolderPath: any, pFtpType: string, pOption?: {
        type: 'search' | 'regexp',
        value: string
    }): Observable<any> {
        if (pOption && pOption.type === 'search') {
            return this.cHttp.post(this.oNodeUrl + '/hdfs/searchFileList', { dsId: pDbId, folderPath: pFolderPath, STORAGE_TYPE: pFtpType, keyword: pOption.value });
        }
        if (pOption && pOption.type === 'regexp') {
            return this.cHttp.post(this.oNodeUrl + '/hdfs/searchFileList', { dsId: pDbId, folderPath: pFolderPath, STORAGE_TYPE: pFtpType, regexp: pOption.value });
        } 
        return this.cHttp.post(this.oNodeUrl + '/hdfs/getDataLakeList', { dsId: pDbId, folderPath: pFolderPath, STORAGE_TYPE: pFtpType });
    }
    getComList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/metaservice/getCompntList', {'headers':this.oHeaders});
    }
    getDataSetList(): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/wd/dataViewList', {'headers':this.oHeaders});
    }
    // pParam에 includeFtp:true로 보내면 ftp까지 포함해서 DS_MSTR 조회
    getDsInfo(pParam?: any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/wd/dsMstr', { ...pParam });
    }
    getTableInfo(pDbId:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/dsViewTblMstr', {DS_ID:pDbId});
    }
    getDataSchema(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/select', pParam);    
    }
    getPageData(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/page', {params:pParam});    
    }
    getCorr(pParam:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/correlation', pParam);    
    }
    saveServerInfo(pParam:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/setServerInfo', pParam);
    }
    getServerInfo(pParam:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/getServerInfo', pParam);
    }
    getKuberConfig(pParam:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/getKuberConfig', pParam);
    }
    getPlatformConfig(pParam:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/getPlatformConfig', pParam);
    }
    savePlatformConfig(pParam:any): Observable<any> {
        return this.cHttp.post(this.oNodeUrl + '/rm/savePlatformConfig', pParam);
    }
    getUserList(pParam:boolean=false) :Observable<any>{
      return this.cHttp.post(this.oNodeUrl + '/userMng/getUserList', {exceptAdmin:pParam}, {'headers':this.oHeaders});
    }
    getUserInfo() :Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/userMng/getUserInfo', {}, {'headers':this.oHeaders});
    }
    getOrganizationChart(pParam:boolean=false) :Observable<any>{
      return this.cHttp.post(this.oNodeUrl + '/userMng/getOrganizationChart',{'headers':this.oHeaders});
    }
    getUserAuth(pDataset:any, p_type: string):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/auth/getUserAuth', {params:pDataset, type: p_type});
    }
    getGroupAuth(pDataset:any, p_type: string):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/auth/getGroupAuth', {params:pDataset, type: p_type});
    }
    getJupyterPort(pPlatformId:any, pNamespace:any ):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/rm/getJupyterPort', {platformId: pPlatformId, namespace: pNamespace});
    }
    getModelDeployPort(pPlatformId: any, pNamespace:any ):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/rm/getModelDeployPort', { platformId: pPlatformId, namespace: pNamespace });
    }
    deleteDsInfo(pDsId:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/updateDsMstr', {params:{dbData:{ds_id:pDsId}, type:'delete'}});
    }
    connectDs(pData:any, pType:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/addDsMstr', {dbData:pData, type:pType});
    }
    updateDs(pData:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/wd/updateDsMstr', {params:{dbData:pData, type:'update'}});
    }
    getAuthUserList() :Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/userMng/getAuthUserList',{'headers':this.oHeaders});
    }
    getAuthGroupList() :Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/userMng/getAuthGroupList',{'headers':this.oHeaders});
    }
    // getTempImageList(pImageFilePath:any, pPage:number):Observable<any>{
    getImageBase64List(pData:any):Observable<any>{
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/readImageBase64', pData);
    }
    getLabelFile(pData:any){
        return this.cHttp.post(this.oNodeUrl + '/jobexcute/readLabelJson', pData);
    }
} 