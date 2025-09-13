import { WpError, WpHttpCode } from "../../exception/WpError";
// import { WiseDataHDFSStorage } from "./WiseHDFSStorage";
// import { WiseDataLocalStorage } from "./WiseLocalStorage";
// import { WiseSFTPStorage } from "./WiseSFTPStorage";
// import { WiseFTPStorage } from "./WiseFTPStorage";
import { WP_CONFIG, WP_SFTP_ATT } from "../../wp-type/WP_CONN_ATT";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import { WiseDataStorageInterface } from "../../wp-type/WP_DS_INFO";
import { WP_META_DB } from "../../wp-type/WP_META_DB";
import { WP_FILE_SYSTEM_ATT } from "../../wp-type/WP_FILE_INFO";
import { WpSparkApiManager } from "../spark-api/spark-api-mng";
import { Readable } from 'stream';
const path = require('path');
import http from "http";
/**
 * 플랫폼에서 사용하는 데이터 저장소에 접근 할 수 있는 클래스.
 * 
 * config 파일에 설정된 저장소 타입에 따라 다르게 접근 된다.
 * 
 * {@link WiseManagerInterface | WiseManagerInterface}를 통해 접근해서 플랫폼의 데이터 소스를 이용할 수 있다.
 * 
 * @example
 * ```ts
 *  let s_storageMng= new WiseStorageManager(WP_SESSION_USER,WP_CONFIG);   
 * ```
 */

export class WiseStorageManager implements WiseDataStorageInterface {

    o_userInfo:WP_SESSION_USER;
    o_name: string;
    o_type: string;
    o_rootPath:string;
    o_metaDb:WP_META_DB;
    o_sparkApiMng: WpSparkApiManager;
    // USER_MODE=='USER'일 경우 WP 기본 생성 폴더 숨기기 체크
    // ___tmp_upload___: 비정형 데이터 경로를 띄우기 위함.
    o_wpFolderList:string[] = ['batchresult','deployresult','dictionary','exeresult','objLabelresult','pkl','tmp_upload','treegraph','txtlabelresult','workflow','wp_dataset'];
    public constructor(p_userInfo:WP_SESSION_USER, p_config:any = global.WiseStorage) {
        
        this.o_rootPath = p_config.DEFAULT_PATH;
        this.o_name = '';
        this.o_type = p_config.STORAGE_TYPE;
        this.o_userInfo = p_userInfo;
        if (p_userInfo.AppConfig ==null) {
            p_userInfo.AppConfig = global.WiseAppConfig
        }
        if (p_userInfo.AppConfig.WP_API.host==null) {
            p_userInfo.AppConfig.WP_API = global.WiseAppConfig.WP_API
        }
        this.o_sparkApiMng = new WpSparkApiManager(p_userInfo.AppConfig);
        
    }

    public async getConnectInfo(p_id:string) { 
        let s_dsInfo = await this.o_metaDb.select('DS_MSTR',[], { DS_ID: p_id });

        return s_dsInfo[0]
    }

    isExists(p_path:string){
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_param = {
                "path": p_path
            };

            this.o_sparkApiMng.onCallApi(`/storage/isExists`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                resolve({
                    isSuccess: true,
                    result:s_result.result
                });
            }).catch(pErr => { reject(pErr) });
        });
    }
    
    bytesToSize(p_bytes:number, p_sep = "") {
        let s_sizeName = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        if (p_bytes == 0) return 'n/a';
        let s_idx = Math.floor(Math.log(p_bytes) / Math.log(1024));
        if (s_idx === 0) return `${p_bytes}${p_sep}${s_sizeName[s_idx]}`;

        return `${(p_bytes / (1024 ** s_idx)).toFixed(1)}${p_sep}${s_sizeName[s_idx]}`;
    }

    sizeToBytes(p_size:string, p_sep = "") {
        let s_sizeName = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        let s_size = p_size;
        let s_idx = 0;
        s_sizeName.forEach((val, index) => { 
            if(p_size.includes(val)){
                s_size = s_size.split(p_sep+val)[0];
                s_idx = index
            }
        });

        return Number(s_size)*(1024** s_idx)
    }

    public getAbsPath(p_path:string){
        return this.o_rootPath + p_path;
    }
    public onDeleteFile(p_path:any,p_recursive:boolean,p_isDirectory:boolean) {
        let s_param = {
            "path": p_path,
            "fullpath":true,
            "recursive":p_recursive,
            "isDirectory":p_isDirectory
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            // 삭제시 클라이언트 단에서 삭제 목록이 리스트로 들어와야하게 수정
            if (onChkPath(p_path) && typeof(p_path) == 'string') {
                reject(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
            }else {
                this.o_sparkApiMng.onCallApi(`/storage/delete`, JSON.stringify(s_param)).then((pResult:any) => {
                    let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));
                    console.log(pResult);
                }).catch(pErr => { reject(pErr) });
            }
        });        
    }
    // USER_MODE=='USER'일 경우 WP 기본생성 폴더 제외하고 데이터 리스트 가져오기
    public getFilteredData(p_dataList:WiseReturn){
        
            try {
                let s_wpFile = {
                    FileStatuses:{
                        FileStatus:new Array <WP_FILE_SYSTEM_ATT>()
                    }
                }
                //WPLAT-336 파일리스트 읽기 에러
                let s_tmpList =p_dataList.result.FileStatuses.FileStatus; 
                // WPLAT-361 5번
                let s_filteredResult:any;
                if(global.WiseAppConfig.STORAGE_TYPE=='HDFS') {
                    s_filteredResult = s_tmpList.filter((s_tmpIdx:any) => !(s_tmpIdx.type == 'DIRECTORY' && this.o_wpFolderList.includes(s_tmpIdx.pathSuffix)));               
                } else {
                    s_filteredResult = s_tmpList.filter((s_tmpIdx:any) => !(s_tmpIdx.type == 'DIRECTORY' && this.o_wpFolderList.includes(s_tmpIdx.name.toLowerCase())));
                }
                
                s_wpFile.FileStatuses.FileStatus = s_filteredResult;
                return s_wpFile;
            } catch (error) {
               throw error;
            }            
        
    }
    // USER_MODE=='USER'일 경우 폴더 생성시 WP 기본생성 폴더명 체크
    public checkWpFolder(p_path:string){        
        if(this.o_wpFolderList.includes(p_path.toLowerCase())){
            return true
        }else{
            return false
        }
    }

    public getFileList(p_path:string,p_hideFlag:boolean=false, p_mode:string='all') {
        let s_param = {
            "path": p_path,
            "mode": p_mode
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            this.o_sparkApiMng.onCallApi(`/storage/getFileList`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = pResult;

                let s_wpFile = {
                    FileStatuses:{
                        FileStatus:JSON.parse(pResult).listFiles
                    }
                };

                if(p_hideFlag){   // 'USER'일 경우 true
                    s_wpFile = this.getFilteredData({isSuccess : true, result : s_wpFile});
                }
                
                resolve({isSuccess:true,result:JSON.stringify(s_wpFile)});

            }).catch(pErr => { reject(pErr) });
        });
    }
    public onSearchData(p_path:string,p_keyWord:any) {
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
    
    public onMoveFile(p_orgPath:string,p_newPath:string,p_overWriteFlag=false):Promise<WiseReturn>{
        let s_param = {
            "target": p_orgPath,
            "new_path":p_newPath
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            this.o_sparkApiMng.onCallApi(`/storage/moveFile`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));
                console.log(pResult);
            }).catch(pErr => { reject(pErr) });
        });
    }
    public onReName(p_orgPath:string,p_newPath:string):Promise<WiseReturn>{
        let s_param = {
            "target": p_orgPath,
            "new_path":p_newPath
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            this.o_sparkApiMng.onCallApi(`/storage/moveFile`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));
                console.log(pResult);
            }).catch(pErr => { reject(pErr) });
        });
    }
    public onCopyFile(p_orgPath:string,p_newPath:string,p_overWriteFlag:boolean):Promise<WiseReturn>{
        let s_param = {
            "target": p_orgPath,
            "new_path":p_newPath
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            this.o_sparkApiMng.onCallApi(`/storage/copyFile`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));  
                console.log(pResult);
            }).catch(pErr => { reject(pErr) });
        });
    }
    public onReadFile(p_path:string, p_option:any = {}, p_filename:any = ''):Promise<WiseReturn>{
        let s_param = {
            "path": p_path,
            "filename": p_filename,
            "option":p_option
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            // 다운로드 호출 API는 별개로 만듬
            let s_headers = {'Content-Type': 'application/json', 'Accept': 'application/octet-stream' };
            this.o_sparkApiMng.onDownloadApi(`/storage/download`, JSON.stringify(s_param), s_headers).then((pResult:any) => {
                // let s_result = JSON.parse(pResult);
                
                // let chunks:any = [];
                if (pResult.stream){
                //     //소장님이 작성하셨던 코드
                //     pResult.stream.on(`data`, (chunk:any) => {
                //         // console.log(`${chunk.length} bytes 읽음ntxt: "${chunk.toString()}"n`);
                //         chunks.push(chunk);
                //       })
                //       pResult.stream.on('end',    (     ) => resolve({isSuccess:true,result:Buffer.concat(chunks)}));
                
                // 스트리밍 다운로드
                    resolve(pResult)
                }
                    
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: pResult
                    }));
            }).catch(pErr => { reject(pErr) });
        }); 
    }

    public onDonwloadZipFile(p_path:string, p_option:any = '', p_filename:any = ''):Promise<WiseReturn>{
        
        let s_param = {
            "path": p_path,
            "filename": p_filename,
            "option":p_option
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_headers = {'Content-Type': 'application/json', 'Accept': 'application/octet-stream' };
            this.o_sparkApiMng.onDownloadApi(`/storage/downloadZipFile`, JSON.stringify(s_param), s_headers).then((pResult:any) => {

                if (pResult.stream)
                    resolve(pResult);
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: pResult
                    }));
            }).catch(pErr => { reject(pErr) });
        }); 
    }
    public onArtifactExist(p_path:string):Promise<WiseReturn>{
        let s_param = {
            "path": p_path
        };
        return new Promise<WiseReturn>((resolve, reject) => {
            this.o_sparkApiMng.onCallApi(`/storage/artifactExist`, JSON.stringify(s_param)).then((pResult:any) => {
                console.log(pResult)
                if (pResult)
                    resolve(pResult);
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: pResult
                    }));
            }).catch(pErr => { reject(pErr) });
        }); 
    }
    
    public onWriteFile(p_path:string,p_data:any,p_type:string):Promise<WiseReturn>{
        let s_filepath = path.dirname(p_path);
        let s_filename = p_path.split('/').pop();
        let s_options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream', // Raw 데이터 전송
                'filepath': encodeURIComponent(s_filepath),
                'filename': encodeURIComponent(s_filename),
                'upload': 'true',
            },
        };

        return new Promise((resolve, reject) => {
            const req = http.request(`${this.o_sparkApiMng.getApiUrl()}/storage/upload`, s_options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const sResult = JSON.parse(data);
                        if (sResult.responsecode !== 200) {
                            throw new Error('파일 서버 저장 오류');
                        }
                        resolve({ isSuccess: true, result: sResult.file });
                    } catch (err:any) {
                        reject(new Error(`JSON 파싱 실패: ${err.message}`));
                    }
                });
            });

            req.on('error', (err) => {
                reject(new Error(`HTTP 요청 실패: ${err.message}`));
            });

            // 파일 스트림 데이터를 직접 전송
            const s_stream = Readable.from(Buffer.from(p_data, 'utf-8'));
            s_stream.pipe(req);
        });
        // let s_options:any;
        // let s_form:FormData = new FormData();
        // let s_filepath ='';
        // let s_filename = '';

        // if (p_type == 'buffer'){
        //     let s_stream = Readable.from(p_data);
        //     s_filepath = encodeURIComponent(path.dirname(p_path));
        //     s_filename = encodeURIComponent(p_path.split('/').pop());
        //     s_form.append('file', s_stream, s_filename);
  
        //     // s_param = s_options;
        // }
        // else{
        //     s_form.append('file', p_data, {
        //                 filename: p_path.split('/').pop()
        //             });
        //     s_form.append('path', p_path);
        // }
        // // headers: {
        // //     "Content-Type": mimeType,
        // //     "Content-Disposition": `attachment; filename="${filename}"`,
        // //     "upload": "true",
        // //     "filepath": s_filePath,
        // //     "filename": filename
        // //   }
        // s_options = {
        //     method: 'POST',
        //     headers: {...s_form.getHeaders(), 
        //         "filepath": s_filepath,
        //         "filename": s_filename,
        //         'upload': "true"
        //     }
        // };
        // return new Promise<WiseReturn>((resolve, reject) => {

        //     let req = http.request(`${this.o_sparkApiMng.getApiUrl()}/storage/upload`, s_options, (res) => {
        //         let data = '';
        
        //         res.on('data', (chunk) => {
        //             data += chunk;
        //         });
        
        //         res.on('end', () => {     
        //             try{                   
        //                 let sResult = JSON.parse(data);
        //                 if (sResult.responsecode != 200)
        //                     throw new WpError({
        //                         httpCode: WpHttpCode.ANALYTIC_UNKOWN_ERR,
        //                         message: '파일 서버 저장 오류'
        //                     });
        //                 else 
        //                     resolve({isSuccess:true,result:sResult.file});
        //             }catch(pErr){
        //                 reject(new WpError({
        //                     httpCode: WpHttpCode.STORAGE_COMMON_ERR,
        //                     message: pErr
        //                 }));  
        //             }
        //         });
        //     });
            
        //     s_form.pipe(req);

        //     // Listen for upload progress
        //     s_form.on('data', (chunk) => {
        //     });

        //     req.on('error', (err) => {
        //         reject(new WpError({
        //             httpCode: WpHttpCode.STORAGE_COMMON_ERR,
        //             message: err
        //         }));  
        //     });
        // });  
    }
    public onMakeDir(p_path:string,p_chmod:string,p_recursive:boolean):Promise<WiseReturn>{

        return new Promise<WiseReturn>((resolve, reject) => {
            let s_param = {
                "path": p_path
            };

            this.o_sparkApiMng.onCallApi(`/storage/makeDir`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));  
            }).catch(pErr => { reject(pErr) });
        });
    }
    public chown(p_path:string,p_uid:string,p_gid:string='supergroup'):Promise<WiseReturn>{
        return new Promise<WiseReturn>((resolve, reject) => {
            let s_param = {
                "path": p_path,
                "userId": p_uid,
                "groupId": p_gid
            };

            this.o_sparkApiMng.onCallApi(`/storage/chown`, JSON.stringify(s_param)).then((pResult:any) => {
                let s_result = JSON.parse(pResult);
                if (s_result.responsecode == 200)
                    resolve({isSuccess:true,result:s_result.result});
                else
                    reject(new WpError({
                        httpCode: WpHttpCode.STORAGE_COMMON_ERR,
                        message: s_result
                    }));  
            }).catch(pErr => { reject(pErr) });
        })
    }
    // public getTempImageList(p_path:string, p_page:number):Promise<WiseReturn>{
    //     let s_param = {
    //         "path": p_path,
    //         "page": p_page
    //     };
    //     return new Promise<WiseReturn>((resolve, reject) => {
    //         this.o_sparkApiMng.onCallApi(`/storage/getTempImageList`, JSON.stringify(s_param)).then((pResult:any) => {
    //             if (pResult)
    //                 resolve(pResult);
    //             else
    //                 reject(new WpError({
    //                     httpCode: WpHttpCode.STORAGE_COMMON_ERR,
    //                     message: pResult
    //                 }));
    //         }).catch(pErr => { reject(pErr) });
    //     }); 
    // }
}
function onChkPath(p_path: string) {
    let flag = false;
    if (!p_path || typeof p_path !== 'string') {
        flag = true;
    }
    return flag;
}