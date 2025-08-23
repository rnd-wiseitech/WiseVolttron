//# 73
//# Socket Class 추가
import { Injectable,Output,EventEmitter } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';

@Injectable({ providedIn: 'root' })
export class WpSocket extends Socket{
    @Output() socketStatusEmit: EventEmitter<any> = new EventEmitter();

    oSocketId:string = '';
    oSocketStatus:boolean = false;
    constructor(cWpConfig:WpAppConfig) {  
        super({ url: cWpConfig.getServerPath('NODE'), options: {} });  
        this.on('getId',(pSoketId : any)=>{
            console.log('=============clientid==========');
            console.log(pSoketId);
            this.socketStatusEmit.emit(true);
            this.oSocketId = pSoketId;
            
        });
        this.on("disconnect", (error: any) => {
            console.log("=====disconnect======" + error); // false            
            this.disconnect();
            this.socketStatusEmit.emit(false);
        });        
    }
    getSocket()
    {
        return this.ioSocket;
    }
    onConnection(){
        this.socketStatusEmit.emit(true);
        this.connect();
    }
    statusStati() {
        return this.fromEvent('statusStati');
    }
    getWpJobLog() {
        return this.fromEvent('wp-joblog-message');
    }
    statusCron() {
        return this.fromEvent('statusCron');
    }
    insertCronLog() {
        return this.fromEvent('insertCronLog');
    }
    statusCronLog() {
        return this.fromEvent('statusCronLog');
    }
    getSocketId() {
        return this.oSocketId;
    }
    getJobLog() {
        return this.fromEvent('joblog-message');
    }
    soketNextStep() {
        return this.fromEvent('nextStep');
    }
    getHadoopLog(pHadoopNm:any) {
        
        return this.fromEvent(`${pHadoopNm}-hadoop-log`);
    }
    getTerminal() {        
        return this.fromEvent('terminal');
    }
    getSetupLog() {        
        return this.fromEvent('platform-setup-log');
    }
    sendMsg(p_id:string,p_msg:any){
        this.emit(p_id,p_msg);
    }
}