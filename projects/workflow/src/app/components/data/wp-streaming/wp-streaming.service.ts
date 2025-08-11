import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { Observable } from 'rxjs';

@Injectable({providedIn:'root'})
export class WpStreamingService extends WpSeriveImple {
    constructor(private cHttp: HttpClient,
                private cAppConfig:WpAppConfig) {
                    super(cAppConfig);
    }
    oUrl = this.cAppConfig.getServerPath("NODE");
    // #119 데이터베이스명 리스트 조회
    getDbList(pConnectData:any){
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewDbList', {connectData:pConnectData}).toPromise().then(p=>{
            return p;
        });
    }
    // #119 테이블 리스트 조회
    getTbList(pConnectData:any){
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewTbList', {connectData:pConnectData}).toPromise().then(p=>{
            return p;
        });
    }
    // #119 테이블 컬럼 리스트 조회
    getColInfo(pConnectData:any){
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewColInfo', {connectData:pConnectData}).toPromise().then(p=>{
            return p;
        });
    }
    // #119 카프카 커넥터 생성
    createKafkaConnector(pConnectData:any):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/createKafkaConn', {connectData:pConnectData});
    }
    // #119 토픽 리스트 조회
    getTopicList():Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/viewTopicList', {});
    }
    // #119 선택한 토픽의 컬럼 정보 조회
    getTopicSchema(pData:any):Observable<any>{
        return this.cHttp.post(this.cAppConfig.getServerPath('NODE') + '/wkservice/kafkaSelect', pData);
    }
}