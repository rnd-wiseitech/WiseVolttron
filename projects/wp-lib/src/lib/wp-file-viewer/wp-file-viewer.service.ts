import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class WpFileViewerService extends WpSeriveImple {
    constructor(private cHttp: HttpClient, 
        private cAppConfig:  WpAppConfig) {
        super(cAppConfig);
    }
    
    getUserData(): Observable<any> {
        let aCurrentUser = JSON.parse(localStorage.getItem('currentUser'));
        return this.cHttp.post(this.oNodeUrl + '/userMng/userInfo', aCurrentUser);
  }
//   downloadFile(pFilePath:any, pType:any){        
//     return this.cHttp.get(this.oNodeUrl + '/hdfs/download',{responseType:"arraybuffer",params: {filePath:pFilePath, type:pType}});    
// }
    downloadFile(pFilePath:any, pType:any){        
        return this.cHttp.get(this.oNodeUrl + '/hdfs/download', {
            responseType: 'blob', // 파일 데이터를 Blob으로 수신
            params: { filePath: pFilePath, type: pType },
            observe: 'response', // 전체 HTTP 응답 객체를 관찰
        });    
    }
    copyPath(pPathFrom:any,pPathTo:any,pRootPath:any=null) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/copyTo', {path_from:pPathFrom, path_to:pPathTo, rootpath:pRootPath});    
    }
    movePath(pPathFrom:any,pPathTo:any,pRootPath:any=null) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/moveTo', {path_from:pPathFrom, path_to:pPathTo, rootpath:pRootPath});    
    }
    removePath(pPath:any,pIsDirectory:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/remove', {path:pPath,isDirectory:pIsDirectory});    
    }
    renamePath(pPath:any, pOrgNm:any, pNewNm:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/rename', {path:pPath, orgNm:pOrgNm, newNm:pNewNm});    
    }
    makeDir(pPath:any, pDirNm:any) : Observable<any>{        
        return this.cHttp.post(this.oNodeUrl + '/hdfs/makeDirectory', {path:pPath, dirNm:pDirNm});    
    }   
    getDownloadUrl(p_filePath: any) {
        return this.cHttp.post(this.oNodeUrl + '/hdfs/getDownloadUrl', {path:p_filePath});    
    } 
    // // #72
    // // #13 hdfs검색기능 추가
    // searchFileList(pKeyword:any, pFolderPath:any) : Observable<any>{        
    //   return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/hdfs/searchFileList', {keyword:pKeyword, folderpath:pFolderPath});    
    // }
}