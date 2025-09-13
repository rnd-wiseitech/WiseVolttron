//# 73
import * as http from 'http';
import { NodeSSH } from 'node-ssh';
import { Server, Socket } from "socket.io";
import { ClientChannel } from 'ssh2';
import { WP_SOCKET_ATT, WP_SOCKET_USER_ATT } from '../../wp-type/WP_SOCKET_ATT';

/**
 * WebSocket을 관리하는 클래스
 * 
 * Node서버, 플랫폼에 구축된 Pod 등 서버등에서 실행된 작업결과 및 상태를 Client에게 전달한다.
 * 
 * @example
 * ```ts
 * let s_socket = new WiseSocket(s_server,["http://localhost:4200"]);
 * s_socket.sendClientMsg(s_socket.getId(), 'statusCron', { SCH_ID: p_schData['SCH_ID'], SCH_STATUS: '배치 진행' });
 * ```
 */

export class WiseSocket implements WP_SOCKET_ATT {
    public server:Server
    public sockets:any;
    public clientId:string;
    public userInfo:WP_SOCKET_USER_ATT;
    constructor(p_server:http.Server,p_hosts:Array<string>) {
        this.server = new Server(p_server,{
            cors: {
                origin: p_hosts,
                methods: ["GET", "POST"]
              },
              connectTimeout:6000000
            
        });
        this.sockets = {};
        // #171 clientId(socket.id) 선언
        // 이걸 백단에서 다른 방식으로 가져올 수가 있는지 확인 필요.
        // 없어서 일단 선언하고 여기에 값을 넣음.
        this.clientId = "";
        this.userInfo = {}
    }
    start(){
        
        this.server.on('connection', (p_socket) => {
            console.log('=============server=============');
            console.log(p_socket.id);
            p_socket.emit('getId',p_socket.id);            
            // #171 
            // socket.id 값 넣음.
            this.clientId = p_socket.id;
            this.sockets[p_socket.id] = p_socket;
            p_socket.on('disconnect', function() {
                console.log('user disconnected');
            });
        });      
    }
    getClientSocket(p_clientId:string){
        return this.sockets[p_clientId];
    }
    getIo(){
        return this.server;
    }
    // #171. cronmanger에서 clientId 불러오는 함수.
    getId() {
        return this.clientId;
    }
    sendClientMsg(p_client:string,p_clientCommand:string,p_msg:any){
        this.sockets[p_client].emit(p_clientCommand, p_msg);
    }
    setUserNo(p_userNo:number){
        if(!Object.keys(this.userInfo).includes(String(p_userNo)))
            this.userInfo[p_userNo] = {
                sshClient : new Array<NodeSSH>(),                
            };
    }
    setUserChannel(p_userNo:number,p_channel:NodeSSH){
        this.userInfo[p_userNo].sshClient.push(p_channel);

    }
    getUserChannel(p_userNo:number,p_index:number){
        if(p_index == -1)
            return this.userInfo[p_userNo].sshClient;
        else
            return this.userInfo[p_userNo].sshClient[p_index];
    }
    async connectTerminal(p_userNo:number,p_index:number){

        let s_channel:ClientChannel = await this.userInfo[p_userNo].sshClient[p_index].requestShell();
        
        s_channel.on('data',(chunk:any)=>{
            this.sendClientMsg(this.clientId,'terminal',chunk.toString());
        });
        this.sockets[this.clientId].on('key_input',(p_key:any)=>{
            s_channel.write(p_key);
        });
    }
    disConnectTerminal(p_userNo:number,p_index:number){
        if(typeof this.userInfo[p_userNo].sshClient[p_index] != 'undefined'){
            this.userInfo[p_userNo].sshClient[p_index].dispose();
            this.userInfo[p_userNo].sshClient.splice(p_index, 1);
        }
        
    }
}
