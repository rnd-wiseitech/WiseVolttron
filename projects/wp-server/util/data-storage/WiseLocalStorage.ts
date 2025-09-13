import { WiseDataStorageInterface } from "../../wp-type/WP_DS_INFO";
import { WP_CONFIG } from "../../wp-type/WP_CONN_ATT";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import * as fs from 'fs';
import * as path from 'path';
import { WpError, WpHttpCode } from "../../exception/WpError";
import { WP_FILE_SYSTEM_ATT } from "../../wp-type/WP_FILE_INFO";
import * as csv from 'fast-csv';
import FILE_TYPE  from "../file/file-type";
// import getFolderSize from 'get-folder-size';
const getSize = require('get-folder-size');
/**
 * 플랫폼에서 서버가 설치된 Local 영역의 저장소를 통해 데이터에 접근 할 수 있는 클래스.
 * 
 * {@link WiseDataStorageInterface | WiseDataStorageInterface} 인터페이스를 이용해야,
 * 
 * {@link WiseManagerInterface | WiseManagerInterface}를 통해 접근해서 플랫폼의 데이터 소스를 이용할 수 있다.
 * 
 * @example
 * ```ts
 *  let s_local = new WiseDataLocalStorage(WP_SESSION_USER,WP_CONFIG);   
 * ```
 */
export class WiseDataLocalStorage implements WiseDataStorageInterface{
    o_path: string;
    o_url?: string;
    o_conn: any;
    o_userInfo:WP_SESSION_USER;
    o_config:WP_CONFIG;

    constructor(p_userInfo:WP_SESSION_USER,p_config:WP_CONFIG){
        this.o_userInfo = p_userInfo;
        this.o_config = p_config;
    }    
    connect(){
        
    }
    save(){

    }
    
    getDirSize(p_path:string){        
        return new Promise<WiseReturn>((resolve, reject) => {
            getSize(p_path, (p_err:any, size:any) => {
                if (p_err){
                    reject({
                        isSuccess:false,
                        result:new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_err.message 
                        })
                    });
                } 
                else{
                    resolve({isSuccess:true, result: size});
                }
            })
        })
    }

    csvWriteToStream(p_path:string,p_data:csv.FormatterRow[],p_options:csv.FormatterOptionsArgs<any,any>,p_append:string){
        return new Promise<WiseReturn>((resolve,reject)=> {     
            csv.writeToStream(fs.createWriteStream(p_path, { flags :p_append }),p_data, p_options)
                .on("finish", function () {
                    resolve({isSuccess:true, result: true});
                }).on("error", (p_err)=>{
                    reject({
                        isSuccess:false,
                        result:new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_err.message 
                        })
                    });
                });
        });                    
    }
    csvWriteToPath(p_path:string,p_data:csv.FormatterRow[],p_options:csv.FormatterOptionsArgs<any,any>){
        return new Promise<WiseReturn>((resolve,reject)=> {    
            csv.writeToPath(p_path, p_data, p_options)
                .on("finish", function () {
                    resolve({isSuccess:true, result: true});
                }).on("error", (p_err)=>{
                    reject({
                        isSuccess:false,
                        result:new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_err.message 
                        })
                    });
                });
        });            
    }
    getFileStat(p_path:string):Promise<any>{
        return new Promise((resolve,reject)=> {     
            fs.stat(p_path, function (p_err:any, pStats:any) {
                if (p_err) {
                    reject({
                        isSuccess:false,
                        result:new WpError({
                            httpCode:WpHttpCode.LOCAL_DIR_ERR,
                            message:p_err.message 
                        })
                    });
                } else {
                    resolve({isSuccess: true, result: {fileSize:pStats.size}});
                }
            });
        });           
    }
    onMakeDir(p_path:string,p_chmod:string,p_recursive:boolean){
        return new Promise<WiseReturn>(async (resolve, reject) =>{ 
            fs.mkdir(p_path, { recursive: p_recursive },(pResult:any)=>{
                if(pResult)
                    reject({
                        isSuccess:false,
                        result:new WpError({
                            httpCode:WpHttpCode.LOCAL_DIR_ERR,
                            message:'디렉토리 생성을 실패했습니다.'
                        })
                    });
                else
                    resolve({isSuccess:true, result: pResult});
            });
        });
    }
    getFileList(p_path:string, p_hideFlag:boolean = false, p_mode:any = 'all'){
        
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_wpFile = {
                    FileStatuses:{
                        FileStatus:new Array <WP_FILE_SYSTEM_ATT>()
                    }
                }
                for(let s_fileInfo of fs.readdirSync(decodeURIComponent(p_path))){
                    
                    let s_fileStats = fs.statSync(`${decodeURIComponent(p_path)}/${s_fileInfo}`);
                    if (p_mode != 'all' && !(FILE_TYPE[p_mode].includes(path.extname(s_fileInfo).toLowerCase()) || s_fileStats.isDirectory()))
                        continue;

                    let s_fileType = ''
                    // 디렉토리일때 내부에 _delta_log가 있을 경우 deltalake 파일로 처리
                    if (s_fileStats.isDirectory()){
                        let s_innerPath = path.join(p_path, s_fileInfo);
                        if (fs.readdirSync(s_innerPath).join(', ').includes('_delta_log')){
                            s_fileType = 'FILE';
                        }
                        else {
                            s_fileType = 'DIRECTORY';
                        }
                    }
                    else {
                        s_fileType = 'FILE';
                    }
                    s_wpFile.FileStatuses.FileStatus.push({
                        type: s_fileType,
                        name:s_fileInfo,
                        pathSuffix:s_fileInfo,
                        length:s_fileStats.size,
                        modificationTime:s_fileStats.mtimeMs
                    });
                }
                resolve({isSuccess:true,result:JSON.stringify(s_wpFile)});
            } catch (error) {
                reject({
                    isSuccess:false,
                    result:new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:error
                    })
                });
            }
            
        });
    }
    onSearchDataList(p_path:string,p_keyWord:string) {
        return new Promise<WiseReturn>((resolve, reject) =>{
            this.getFileList(p_path).then(p_result=>{
                let s_tmpList = p_result.result;
                let s_result = [];
                for(let s_tmp of s_tmpList){
                    if(s_tmp.toLowerCase().includes(p_keyWord)){
                        s_result.push({folderpath: p_path, file: s_tmp});
                    }
                }
                resolve({isSuccess:true,result:s_result});
            }).catch(p_err=>{reject(p_err)});
        });
    }
    isExists(p_path:string){
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                resolve({isSuccess:true,result:fs.existsSync(p_path)});
            } catch (error) {
                reject({
                    isSuccess:false,
                    result:new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:error
                    })
                });
            }
            
        });
    }
    onDeleteFile(p_path:string,p_recursive:boolean){
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_stat = fs.statSync(p_path);
                if(s_stat.isDirectory())
                    resolve({isSuccess:true,result:fs.rmdirSync(p_path, { recursive: true })});
                else
                    resolve({isSuccess:true,result:fs.unlinkSync(p_path)});
            } catch (error) {
                reject({
                    isSuccess:false,
                    result:new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:error
                    })
                });
            }
            
        });
    }
    onMoveFile(p_orgPath:string,p_newPath:string,p_overWriteFlag=false){
        return new Promise<WiseReturn>(async (resolve, reject) =>{
            try {
                let s_delChk:WiseReturn = {isSuccess:true, result:{}};
                let s_exist = await this.isExists(p_newPath);        
    
                if (s_exist.result) {
                    if(p_overWriteFlag)
                        s_delChk = await this.onDeleteFile(p_newPath,true);
                    else
                        resolve({ isSuccess: false, result: '파일이 존재합니다.' });
                }
                
                let s_result:WiseReturn = await this.onReName(p_orgPath, p_newPath);

                if (!s_result.isSuccess)
                    reject(s_result.result);                            
                else
                    resolve({ isSuccess: s_result.isSuccess, result: '수정 완료' });
                
            } catch (error) {
                reject(new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:error            
                    }));
            }

        });
    }
    onReName(p_orgPath:string,p_newPath:string){
        return new Promise<WiseReturn>(async (resolve, reject) =>{
            try {
                fs.rename(p_orgPath,p_newPath,(p_result:any)=>{
                    if(p_result)
                        reject(new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_result                    
                        }));
                    else
                        resolve({isSuccess:true, result: p_result});
                });
            } catch (p_error) {
                reject(new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:p_error            
                    }));
            }
        });
    }
    onCopyFile(p_orgPath:string,p_newPath:string,p_overWriteFlag=false){
        return new Promise<WiseReturn>(async (resolve, reject) =>{
            try {
                fs.copyFile(p_orgPath, p_newPath, (p_err) => {
                    if (p_err) 
                        reject(new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_err 
                        }));

                    resolve({isSuccess:true,result:true});
                });                
            } catch (error) {
                reject({
                    isSuccess:false,
                    result:new WpError({
                        httpCode:WpHttpCode.LOCAL_DATA_ERR,
                        message:error
                    })
                });
            }
        });
    }
    onReadFile(p_path:string,p_option:any = {}){
        return new Promise<WiseReturn>((resolve, reject) =>{ 
            try{
                fs.readFile(p_path, p_option, (p_err:any, p_result:any)=>{
                    if(p_err)
                        reject(new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_err.message 
                        }));
                    else
                        resolve({isSuccess:true, result: p_result});
                });
            }
            catch(e){
                reject(e);
            }

        });
    }
    onWriteFile(p_path:string,p_data:any,p_type:string){
        return new Promise<WiseReturn>((resolve, reject) =>{ 
            try {
                fs.writeFile(p_path, p_data, (p_result:any)=>{
                    if(p_result)
                        reject(new WpError({
                            httpCode:WpHttpCode.LOCAL_DATA_ERR,
                            message:p_result 
                        }));
                    else
                        resolve({isSuccess:true, result: p_result});
                });
            }  catch (error) {
                reject(new WpError({
                    httpCode:WpHttpCode.LOCAL_DATA_ERR,
                    message:error            
                }));
            }
        });
    }
}
