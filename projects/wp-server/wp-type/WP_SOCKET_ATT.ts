import { NodeSSH } from "node-ssh";
import { Server, Socket } from "socket.io";
import { ClientChannel } from "ssh2";

export interface WP_SOCKET_ATT {
    server:Server;
    sockets:any;
    clientId:string;
    userInfo:WP_SOCKET_USER_ATT;
    start():void;
    getClientSocket(p_clientId:string):Socket;
    getIo():Server;
    getId():string;
    sendClientMsg(p_client:string,p_clientCommand:string,p_msg:any):void;
    setUserNo(p_userNo:number):void;
    setUserChannel(p_userNo:number,p_channel:NodeSSH):void;
    getUserChannel(p_userNo:number,p_index:number):NodeSSH | NodeSSH[];
    connectTerminal(p_userNo:number,p_index:number):void;
    disConnectTerminal(p_userNo:number,p_index:number):void;
}

export interface WP_SOCKET_USER_ATT {

    [index: number]:{
        sshClient : NodeSSH[]
    }
    
}
