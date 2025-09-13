import { Request } from "express";
import multer, { DiskStorageOptions } from "multer";
import { verifyToken } from "../../auth/token/token";
import { WiseStorageManager } from "../data-storage/WiseStorageManager";
import * as  stream from 'stream';
import { WpSparkApiManager } from '../../util/spark-api/spark-api-mng';
import FormData from 'form-data';
import { Blob } from 'buffer';
import http from "http";
import ProgressBar from 'progress';
import { WpError, WpHttpCode } from "../../exception/WpError";
export const multerConfig = function (opts:DiskStorageOptions) {
    return new ObjectStorage(opts)
}

function chkPath(p_path:string){    
    let flag = false;
    if(!p_path || typeof p_path !== 'string'){
        flag = true;
    }
    return flag;    
}
/**
 * 플랫폼에 등록된 저장소에 데이터를 업로드하는 클래스
 * 
 * 구축된 Spark에 서비스되고 있는 API 서비스를 호출
 * 
 * multer 라이브러리를 override하여 구현 사용자 토큰을 넘겨받아 인증한다.
 * 
 * @example
 * ```ts
 * const upload = multer(
 * { 
 *     storage: multerConfig(
 *     {
 *      destination:  (req, file, cb)=> {
 *                 cb(null, '')
 *       }
 *      }) 
 * });
 * .post('/upload', upload.single('uploadfile')
 * 
 */
class ObjectStorage {
    constructor(opts:any) {
        this.getDestination = opts.destination;
    }    
    getDestination( req: Request,file: Express.Multer.File,cb:any){}
  }
  
interface ObjectStorage {
    _handleFile(p_req: Request, p_file:Express.Multer.File, cb:any): void;
    _removeFile(p_req: Request, p_file:Express.Multer.File, cb:any): void;
 }
  
ObjectStorage.prototype._handleFile = function _handleFile (p_req: Request, p_file:Express.Multer.File, cb:any) {
    this.getDestination(p_req, p_file, async function (err:any, container:any) {
        
        let body = p_req.body;
        
        if(Object.keys(body).includes('token'))
            p_req.decodedUser = await verifyToken(body.token);

        let sUserno = p_req.decodedUser.USER_NO.toString();
        let sUserMode = p_req.decodedUser.USER_MODE;
        // let sUserMode = 'ADMIN';

        let remoteFilePath = "/";
        // WPLAT-359
        if(sUserMode == 'ADMIN') {
            if(body.path == sUserno) {
                remoteFilePath = '/' + body.path;
            }
        }

        if(sUserMode != 'ADMIN')
            remoteFilePath += `/${sUserno}`;    
        if (body.path != '' && body.path != sUserno) 
            remoteFilePath += '/' + body.path;
        if (body.uploadType == 'un-analytic-model')
            remoteFilePath += '/tmp_upload';
        try{
            
            var path = remoteFilePath + "/" + p_file.originalname;

            if(chkPath(path)){
                cb(new Error('파일 경로가 올바르지않습니다.'),'');
            }else{                           

                let s_folderPath = path;

                // if (p_req.decodedUser.USER_MODE != 'ADMIN')
                //     s_folderPath = `${p_req.decodedUser.USER_NO}/` + s_folderPath ;

                let s_sparkApiMng = new WpSparkApiManager(p_req.decodedUser.AppConfig);

                
                const bar = new ProgressBar('Uploading [:bar] :percent :etas', {
                    width: 40,
                    total: Number(p_req.headers["content-length"])
                });
                let s_form:FormData = new FormData();

                s_form.append('file', p_file.stream, {
                            filename: p_file.originalname,
                            contentType: p_file.mimetype,
                        });
                s_form.append('path', s_folderPath);
                let s_options = {
                    method: 'POST',
                    headers: s_form.getHeaders()
                };
                let req = http.request(`${s_sparkApiMng.getApiUrl()}/storage/upload`, s_options, (res) => {
                    let data = '';
            
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
            
                    res.on('end', () => {     
                        try{                   
                            let sResult = JSON.parse(data);
                            if (sResult.responsecode != 200)
                                throw new WpError({
                                    httpCode: WpHttpCode.ANALYTIC_UNKOWN_ERR,
                                    message: '파일 서버 저장 오류'
                                });
                            else 
                                cb(null,{
                                    path: sResult.file,
                                    status: 200,
                                });
                        }catch(pErr){
                            cb(new Error('파일업로드 오류'),pErr);
                        }
                    });
                });
                
                s_form.pipe(req);

                // Listen for upload progress
                s_form.on('data', (chunk) => {
                    console.log(bar.total);
                    bar.tick(chunk.length);
                });

                req.on('error', (err) => {
                    console.error('Error uploading file:', err.message);
                });

            }
        }catch(pErr){
            cb(new Error('파일업로드 오류'),pErr);
        }
    });
};

ObjectStorage.prototype._removeFile = async function _removeFile (p_req: Request, p_file:Express.Multer.File, cb:any) {
    let body = p_req.body;
    let sUserno = p_req.decodedUser.USER_NO.toString();
    //let sUserMode = p_req.decodedUser.USER_MODE;
    let sUserMode = 'ADMIN';

    let remoteFilePath = "/";

    if(sUserMode != 'ADMIN')
        remoteFilePath += `/${sUserno}`;    
    if (body.path != '') 
        remoteFilePath += '/' + body.path;
                    
    try{
        var path = remoteFilePath + "/" + p_file.originalname;

        if(chkPath(path)){
            cb(new Error('파일 경로가 올바르지않습니다.'),'');
        }else{                           
            let sDelChk = {isSuccess:true, result:{}};
            let s_wpDataMng = new WiseStorageManager(p_req.decodedUser);
            
            let sExist = await s_wpDataMng.isExists(path);
            if (sExist.result) {
                sDelChk = await s_wpDataMng.onDeleteFile(path,true,false);
            }  

            if (!sDelChk.isSuccess) {
                cb(new Error('파일을 삭제할 수 없습니다.'),'');
            }
        }
    }catch(pErr){
        cb(new Error('파일업로드 오류'),'');
    }
}