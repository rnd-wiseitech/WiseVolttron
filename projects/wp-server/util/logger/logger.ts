import moment from 'moment';
import winston from 'winston';
import * as path from 'path';
import fs from 'fs';

const enum log_level {
    LogLevelDebug = 'debug',
    LogLevelInfo = 'info',
    LogLevelError = 'error'
};

/**
 * 플랫폼 내의 로그를 기록하는 클래스
 * 
 * @example
 * ```ts
 * ```
 */
class WiseLogger {
    public static readonly o_LogLevel: string = log_level.LogLevelDebug;
    public static readonly o_MaxFileSize: number = 1024 * 1024 * 100; //100MB
    public static readonly o_NumMaxFiles: number = 100; //로그파일 최대 100개
    public static readonly o_Filename: string = 'wp_server.log';
    public static readonly o_MaxFilenameLength: number = 20;
    //INFO: 로그 저장 폴더
    public static readonly o_LogPath: string = './logs';
    //INFO: 프로젝트 최상위 폴더
    public static readonly o_ProjRootPath: string = path.join(__dirname, '..');
    //INFO: 파일이름만 출력할 경우 false, 경로까지 출력할 경우 true
    public static readonly o_UseRelativePath: boolean = false;

    private readonly writer: winston.Logger;

    constructor(){
   		this.makeLoggerFolder();

    	this.writer = this.getLogger();
    }

    private makeLoggerFolder(){
        try{
        	fs.mkdirSync(WiseLogger.o_LogPath);
        }
        catch(ex:any){
            console.error(`Create logger path FAILED; ${ex.message}`);
            return;
        }

        console.info(`Create logger folder SUCCESS`);
    }

    private getTimeStampFormat(): string {
    	return moment().format('YYYY-MM-DD HH:mm:ss.SSS ZZ').trim();
    }

    private getLogger(){
        if(this.writer !== undefined){
        	return this.writer;
    	}

        return winston.createLogger({
            transports: [
                new winston.transports.File({
                    filename: path.join(WiseLogger.o_LogPath, './wp_server.log'),
                    level: WiseLogger.o_LogLevel,
                    maxsize: WiseLogger.o_MaxFileSize,
                    maxFiles: WiseLogger.o_NumMaxFiles,
                    format: winston.format.printf(info => `${this.getTimeStampFormat()} [${info.level.toUpperCase()}] ${info.message}`),
                    tailable: true //INFO: 최신 로그 파일의 이름이 항상 동일하게 유지됨 (직전 로그 파일은 가장 높은 번호의 파일)
                }),
                new winston.transports.Console({
                    level: WiseLogger.o_LogLevel,
                    format: winston.format.printf(info => `${this.getTimeStampFormat()} [${info.level.toUpperCase()}] ${info.message}`)
                }),
            ]
        });
    }

    private createFinalMessage(p_message: string,p_type:string=''){
        let s_stackInfo:any;
        if(p_type == 'error')
            s_stackInfo = this.getStackInfo(2);
        else
            s_stackInfo = this.getStackInfo(1);

        let s_filenameInfo: string = (WiseLogger.o_UseRelativePath ? s_stackInfo?.relativePath : s_stackInfo?.file) as string;
        let s_finalMessage: string = `[${s_filenameInfo}:${s_stackInfo?.line}] ${p_message}`;
        return s_finalMessage;
    }

    public info(...args: any[]){
    	this.writer.info(this.createFinalMessage(this.getLogString(args)));
    }

    public warn(...args: any[]){
    	this.writer.warn(this.createFinalMessage(this.getLogString(args)));
    }

    public error(...args: any[]){
    	this.writer.error(this.createFinalMessage(this.getLogString(args),'error'));
    }

    public debug(...args: any[]){
    	this.writer.debug(this.createFinalMessage(this.getLogString(args)));
    }

    private getLogString(p_args: any[]){
        let s_resultStr: string = '';
        for(let i=1;i<p_args.length;i++){
            //INFO: 객체 타입
            if(typeof(p_args[i]) === 'object'){
                s_resultStr += JSON.stringify(p_args[i]) + '\t';
            }
            else {
                s_resultStr += p_args[i] + '\t';
            }
        }
        
        return p_args[0] + '\t' + s_resultStr;
    }

    /**
    * Parses and returns info about the call stack at the given index.
    */
    private getStackInfo (p_stackIndex: number) {
        // get call stack, and analyze it
        // get all file, method, and line numbers
        let s_stacklist = (new Error(undefined)).stack?.split('\n').slice(3);

        // stack trace format:
        // http://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
        // do not remove the regex expresses to outside of this method (due to a BUG in node.js)
        let s_stackReg = /at\s+(.*)\s+\((.*):(\d*):(\d*)\)/gi;
        let s_stackReg2 = /at\s+()(.*):(\d*):(\d*)/gi;

        let s_s = s_stacklist?.[p_stackIndex] || s_stacklist?.[0];
        if(s_s === undefined){
        	throw new Error();
        }
        s_s = s_s.toString();
        let s_sp = s_stackReg.exec(s_s) || s_stackReg2.exec(s_s);

        if (s_sp && s_sp.length === 5) {
        	return {
        		method: s_sp[1],
        		relativePath: path.relative(WiseLogger.o_ProjRootPath, s_sp[2]),
        		line: s_sp[3],
        		pos: s_sp[4],
        		file: path.basename(s_sp[2]),
        		stack: s_stacklist?.join('\n')
        	}
        }
	}
}

export default new WiseLogger();