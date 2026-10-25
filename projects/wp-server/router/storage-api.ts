import express, { NextFunction, Request, Response } from 'express';
import { WpError, WpHttpCode } from '../exception/WpError';
import { WiseStorageManager } from '../util/data-storage/WiseStorageManager';
import { WpSparkApiManager } from '../util/spark-api/spark-api-mng';

import multer from 'multer';
import { multerConfig } from '../util/uploader/upload';
import { WiseDataStorageInterface } from '../wp-type/WP_DS_INFO';
// import { WiseDataHDFSStorage } from '../util/data-storage/WiseHDFSStorage';
import { WiseDataLocalStorage } from '../util/data-storage/WiseLocalStorage';
// import { WiseFTPStorage } from '../util/data-storage/WiseFTPStorage';
// import { WiseSFTPStorage } from '../util/data-storage/WiseSFTPStorage';
// import { WiseDataObjectStorage } from '../util/data-storage/WiseObjectStorage';
import http from "http";
import { verifyToken } from '../auth/token/token';
import busboy from "busboy";
const stream = require("stream");
const iconv = require("iconv-lite");
const upload = multer(
    {
        storage: multerConfig(
            {
                destination: (req, file, cb) => {
                    cb(null, '')
                }
            })
    });

export const storageRoute = express.Router();

storageRoute.post('/getDataLakeList', async (req: Request, res: Response<WiseReturn>, next: NextFunction) => {

    let s_body = req.body;
    let s_hideFlag = false;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_filemode = s_body.filemode;
    let s_storageMng: WiseDataStorageInterface;

    let s_path = `${encodeURI(s_body.folderPath)}`;

    if (s_body.dsId == global.WiseAppConfig.DS_ID || s_body.dsId == undefined) {
        if (req.decodedUser.USER_MODE == 'USER') {
            s_path = `/${req.decodedUser.USER_NO}/` + s_path
            if (s_body.folderPath == '') {
                s_hideFlag = true;
            }
        }
        // #WP-238 체험판 예제데이터 사용
        else if (req.decodedUser.USER_NO == 0) {
            s_path = '/sample_dataset';
            if (s_body.folderPath == '') {
                s_hideFlag = true;
            }
        }
    }

    // 넘어온 파라미터에서 STORAGE_TYPE이 없을 경우
    if (s_body.dsId == undefined) {
        s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);
        // STORAGE_TYPE 존재 : sftp / ftp
    } else {
        let s_dsInfo = await global.WiseMetaDB.select('DS_MSTR', [], { DS_ID: s_body.dsId });
        let s_config = {
            user: s_dsInfo[0].USER_ID,
            password: s_dsInfo[0].PASSWD,
            host: s_dsInfo[0].IP,
            port: s_dsInfo[0].PORT,
        };
        s_body['CONFIG'] = s_config;
        s_body['DEFAULT_PATH'] = s_dsInfo[0].DEFAULT_PATH;
        if (s_dsInfo[0].DEFAULT_PATH == null){
            s_body['DEFAULT_PATH'] = ''
        }
        s_path = `${s_body['DEFAULT_PATH']}/${s_path}`;
        // s_path = s_body.folderPath
        if (s_dsInfo[0].TYPE == 'local') {
            s_body.STORAGE_TYPE = 'LOCAL';
            s_storageMng = new WiseDataLocalStorage(req.decodedUser,s_body);
        } 
    }

    s_storageMng.getFileList(s_path, s_hideFlag, s_filemode).then(p_result => {
        if (p_result.isSuccess) {
            res.json(p_result.result);
        }
        else {
            next(new WpError({ httpCode: WpHttpCode.LOCAL_DIR_ERR, message: p_result.result }));
        }

    }).catch(p_error => {
        next(p_error);
    });
});

storageRoute.post('/searchFileList', async (req: Request, res: Response<WiseReturn>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_storageMng: any;
    let s_path = `/${req.decodedUser.USER_NO}/${encodeURI(s_body.folderPath)}`;
    let s_serach: any;

    if (req.decodedUser.USER_MODE == 'ADMIN')
        s_path = `/${encodeURI(s_body.folderPath)}`;

    // 넘어온 파라미터에서 STORAGE_TYPE이 없을 경우
    if (s_body.STORAGE_TYPE == undefined) {
        s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);
        s_serach = s_body.keyword.toLowerCase()
        // STORAGE_TYPE 존재 : sftp / ftp
    } else {
        let s_dsInfo = await global.WiseMetaDB.select('DS_MSTR', [], { DS_ID: s_body.dsId });
        let s_config = {
            user: s_dsInfo[0].USER_ID,
            password: s_dsInfo[0].PASSWD,
            host: s_dsInfo[0].IP,
            port: Number(s_dsInfo[0].PORT),
        }
        s_body['CONFIG'] = s_config
        s_path = s_body.folderPath

        if (s_body.hasOwnProperty('keyword')) {
            s_serach = { type: 'search', value: s_body.keyword.toLowerCase() };
        }
        // 정규표현식으로 검색
        if (s_body.hasOwnProperty('regexp')) {
            s_serach = { type: 'regexp', value: s_body.regexp };
        }
        // if (s_body.STORAGE_TYPE == 'sftp'){
        //     s_storageMng = new WiseSFTPStorage(req.decodedUser,s_body.CONFIG);
        //     await s_storageMng.connect();
        // }
        // else if (s_body.STORAGE_TYPE == 'ftp'){
        //     s_storageMng = new WiseFTPStorage(req.decodedUser,s_body.CONFIG);
        //     await s_storageMng.connect();
        // }
        // else {
        s_storageMng = new WiseStorageManager(req.decodedUser, s_body);
        // }
    }

    s_storageMng.onSearchData(s_path, s_serach).then((p_result:any) => {
        res.json(p_result.result);
    }).catch((p_error:any) => {
        next(p_error);
    });
});

storageRoute.post('/chkFilelist', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    let s_fileList = s_body.filelist;
    let s_folderPath = s_body.folderpath;
    let s_folderFlag = s_body.folderflag;   // 체크하는게 폴더인지 파일인지 체크
    let s_isDownload = s_body.isDownload;   // 데이터셋 다운로드인지 체크, 있으면 파일 경로에 본인 번호 붙어서 USER가 공유받은 파일 다운 못받음

    let s_remoteFilePath = `/`;
    let s_chkList = [];
    let s_resultList: any = [];
    let s_wpFolderFlag = false;
    if (req.decodedUser.USER_MODE != 'ADMIN' && !s_isDownload)
        s_remoteFilePath += `${req.decodedUser.USER_NO}/`;

    if (s_folderPath != '') {
        s_remoteFilePath += s_folderPath + '/';
    }
    if (req.decodedUser.USER_MODE != 'ADMIN' && s_folderPath == '' && s_folderFlag) {
        // USER가 / 경로에 폴더 생성하려고할 때 wpfolder명과 겹치는지 체크
        s_wpFolderFlag = s_storageMng.checkWpFolder(s_fileList[0]);
    }
    if (s_wpFolderFlag) {
        next(new WpError({ httpCode: WpHttpCode.STORAGE_COMMON_ERR, message: '해당 폴더명은 사용할 수 없습니다.' }))
    } else {
        for (let s_file of s_fileList) {
            let s_chkPath = `${s_remoteFilePath}${s_file}`;
            s_chkList.push(s_storageMng.isExists(s_chkPath));
        }
        // promise all은 안에 배열 순서가 결과와 같을 수 있게 보장됨
        Promise.all(s_chkList).then(p_results => {
            // #1 중복 체크 오류 수정
            for (let idx = 0; idx < p_results.length; idx++) {
                if (p_results[idx].result)
                    s_resultList.push(s_fileList[idx]);
            }
            res.json({ success: true, result: s_resultList });
        }).catch(p_error => {
            next(p_error);
        });
    }
});

// storageRoute.post('/upload', upload.single('uploadfile'), (req: Request, res: Response) => {

storageRoute.post("/upload", async (req, res) => {
    try {
      // Token 검증 및 사용자 정보 확인
      const token = req.headers.token;
      // admin계정이면 원래 받아오는 path 그대로 쓰지만 일부분의 경우(커스텀모델 업로드 같은)은
      // admin 본인 폴더 안에 업로드되어야됨. 그래서 이걸로 판단.
      const s_personalPath = req.headers.personalpath || 'N';
      if (!token) {
        return res.status(401).json({ error: "Unauthorized: Token missing" });
      }

      let s_modelURL: string | null = null;
      let s_isAborted = false; // 요청 취소 상태 플래그

      req.decodedUser = await verifyToken(token);
      const s_sparkApiMng = new WpSparkApiManager(req.decodedUser.AppConfig);
      let pythonUrl = `${s_sparkApiMng.getApiUrl()}/storage/upload`;
  
 
      let sUserno = req.decodedUser.USER_NO.toString();
      let sUserMode = req.decodedUser.USER_MODE;

      let remoteFilePath = "/";
      let s_filePath:any = req.headers.filepath;
      s_filePath = decodeURIComponent(s_filePath);
      if (s_filePath == 'undefined') {
        s_filePath = '/';
      }
      if (onChkPath(s_filePath)) {
        return res.status(400).json({ error: "파일 경로가 올바르지않습니다." });
      }
      // 어드민이면서 개인경로가 아닌 경우에는 받아온 패스 그대로
      if(sUserMode == 'ADMIN' && s_personalPath == 'N') {
        s_filePath = '/' + s_filePath;
      } else {
        s_filePath = `${sUserno}/${s_filePath}`;
      }
      s_filePath = encodeURIComponent(s_filePath);
      

            
      const bb = busboy({ headers: req.headers });
      bb.on("field", (fieldname, val) => {
        if (fieldname === "modelURL") {
            s_modelURL = val;
        }
      });

      bb.on("file", async (fieldname, file, info) => {
        let  { filename, mimeType } = info;
        // busyboy 인코딩은 라틴어라 이를 utf-8로 변환
        filename = iconv.decode(Buffer.from(filename, "binary"), "utf-8");
        if (onChkPath(filename)) {
            file.resume();
            return res.status(400).json({ error: "파일 이름이 올바르지않습니다." });
        }
        // 모델 예측 업로드: 클라이언트가 준 주소는 메타DB에 등록된 배포 주소일 때만 쓴다
        if (s_modelURL != null) {
            if (!(await isRegisteredDeployUrl(s_modelURL))) {
                file.resume();
                return res.status(403).json({ error: "등록되지 않은 모델 배포 주소입니다." });
            }
            pythonUrl = s_modelURL + '/upload';
        }
        filename = encodeURIComponent(filename);
        // Python API 요청 옵션
        const url = new URL(pythonUrl);
        const options = {
          hostname: url.hostname,
          port: url.port || 80,
          path: url.pathname + url.search,
          method: "POST",
          headers: {
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${filename}"`,
            "upload": "true",
            "filepath": s_filePath,
            "filename": filename
          },
        };
  
        // Python API로 스트림 데이터 전송
        const reqToPython = http.request(options, (responseFromPython) => {
          let data = "";
  
          responseFromPython.on("data", (chunk) => {
            if (s_isAborted) {
              reqToPython.destroy(); // Python API 요청 중단
              console.log("Python API 요청이 취소되었습니다.");
              return;
            }
            data += chunk;
          });
  
          responseFromPython.on("end", () => {
            if (s_isAborted) {
              console.log("요청이 취소되어 응답을 종료합니다.");
              return;
            }
  
            try {
              const parsedData = JSON.parse(data);
              res.status(responseFromPython.statusCode).json(parsedData);
            } catch (err) {
              console.error("Error parsing Python response:", err);
              res.status(500).json({ error: "Failed to parse response from Python API" });
            }
          });
        });
        // 요청 취소 감지
        req.on('close', () => {
            s_isAborted = true;
            reqToPython.destroy();
            console.log('클라이언트 연결이 종료되었습니다.');
        });
        reqToPython.on("error", (err) => {
            if (s_isAborted) {
              console.log("클라이언트 연결이 종료되어 Python API 전송 중단됨.");
              return;
            }
            console.error("Error in HTTP request to Python:", err);
            res.status(500).json({ error: "Failed to upload file to Python API" });
          });

        // 클라이언트 요청 취소 시 스트리밍 중단
        if (s_isAborted) {
            console.log("파일 스트림이 취소되었습니다.");
            file.unpipe();
            reqToPython.destroy();
            return;
        }
        // 스트림 데이터 조정
        const adjustedStream = file.pipe(
            new stream.PassThrough({ highWaterMark: 10 * 1024 * 1024 }) // 10MB 청크 크기 설정
        );
        // 파일 스트림을 Python API로 연결
        // Python API로 파일 전송
        adjustedStream.pipe(reqToPython);
  
        adjustedStream.on("end", () => {
            if (s_isAborted) {
                console.log("스트림 종료: 클라이언트 요청이 취소되었습니다.");
                reqToPython.destroy();
                return;
            }
            console.log(`Finished streaming file: ${filename}`);
            reqToPython.end(); // 스트림 종료
        });
      });
  
      bb.on("error", (err) => {
        console.error("Busboy error:", err);
        res.status(500).json({ error: "File processing error" });
      });
  
      req.pipe(bb); // 요청 스트림을 Busboy로 전달

      
    } catch (error) {
      console.error("Unexpected error:", error);
      res.status(500).json({ error: "Internal server error" });
    }

    if (typeof req.file != 'undefined') {
        res.json({ success: true, file: req.file });
    } else {
        // next({ status:700, instance: new Error('업로드에 실패하였습니다.') })
    }
});

storageRoute.post('/makeDirectory', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_remoteFilePath = `/`;
    let s_folderPath = s_body.path;

    if (req.decodedUser.USER_MODE != 'ADMIN')
        s_remoteFilePath += `${req.decodedUser.USER_NO}/`;

    if (s_folderPath != '') {
        s_remoteFilePath += s_folderPath + '/';
    }

    let s_path: string = s_remoteFilePath + '/' + s_body.dirNm;

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_path)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        // #85
        if (s_body.path == '' && s_body.dirNm.toLowerCase() == 'wp_dataset') {
            next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '해당 폴더는 만들 수 없습니다.' }))
        } else {
            try {
                let sResult = await s_storageMng.onMakeDir(s_path, "755", true);

                if (!sResult.isSuccess)
                    next(sResult.result);
                else
                    res.json({ success: sResult.isSuccess, message: '폴더생성 완료' });
            } catch (p_error) {
                next(p_error);
            }
        }
    }
});


storageRoute.post('/rename', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_path: string = '';

    // if (req.decodedUser.USER_MODE == 'ADMIN')
    //     s_path = `/` + (s_body.path).slice(0, (s_body.path).lastIndexOf(s_body.orgNm));
    // else
    //     s_path = `/${req.decodedUser.USER_NO}/` + (s_body.path).slice(0, (s_body.path).lastIndexOf(s_body.orgNm));

    if (req.decodedUser.USER_MODE == 'ADMIN')
        s_path = `/` + s_body.path;
    else
        s_path = `/${req.decodedUser.USER_NO}/` + s_body.path;

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_path + s_body.newNm) || onChkPath(s_path + s_body.orgNm)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        // #85
        if (s_body.path == '' && s_body.path.toLowerCase() == 'wp_dataset') {
            next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '해당 폴더는 만들 수 없습니다.' }));
        } else {
            try {
                // rename 타는 경우: (중복X) or (중복O && 덮어쓰기) -> overwrite: True
                // LOCAL && 폴더일 경우, 이미 존재하는 폴더명이면 rename 에러 return 해서 onReNameData 대신 onMoveData 실행
                let s_result = await s_storageMng.onMoveFile(s_path + '/' +s_body.orgNm, s_path + '/' +s_body.newNm, true);

                if (!s_result.isSuccess)
                    next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: s_result.result }));
                else
                    res.json(s_result.result);
            } catch (p_error) {
                next(p_error);
            }
        }
    }
});

storageRoute.post('/remove', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_prefix: string = '';

    if (req.decodedUser.USER_MODE == 'ADMIN')
        s_prefix = `/`;
    else
        s_prefix = `/${req.decodedUser.USER_NO}/`;

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    let s_param = {
        "prefix":s_prefix,
        "path": s_body.path,
        "fullpath":true,
        "isDirectory":s_body.isDirectory
    };

    let s_paths = Array.isArray(s_body.path) ? s_body.path : [s_body.path];
    if (s_paths.some((p_path: any) => onChkPath(String(p_path)))) {
        return next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    try {
        let s_result = await s_storageMng.onDeleteFile(s_param, true,s_body.isDirectory);

        if (!s_result.isSuccess)
            next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: s_result.result }));
        else
            res.json({ success: s_result.isSuccess });
    } catch (p_error) {
        next(p_error);
    }
});

storageRoute.post('/moveTo', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }


    let s_orgPath = (req.decodedUser.USER_MODE == 'ADMIN' ? '/' : `/${req.decodedUser.USER_NO}/`) + (s_body.rootpath ? `${s_body.rootpath}/` : '') + s_body.path_from.path;
    let s_newPath = (req.decodedUser.USER_MODE == 'ADMIN' ? '/' : `/${req.decodedUser.USER_NO}/`) + (s_body.rootpath ? `${s_body.rootpath}/` : '');
    let s_path: string = '';

    if (s_body.path_to.path != '') {
        s_newPath += s_body.path_to.path + '/' + s_body.path_from.name;
    } else {
        s_newPath += s_body.path_from.name;
    }

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_orgPath) || onChkPath(s_newPath)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        // #85
        if (s_body.path == '' && s_body.dirNm.toLowerCase() == 'wp_dataset') {
            next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '해당 폴더는 만들 수 없습니다.' }))
        } else {
            try {
                let s_result = await s_storageMng.onMoveFile(s_orgPath, s_newPath, true);

                if (!s_result.isSuccess)
                    next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: s_result.result }));
                else
                    res.json(s_result.result);
            } catch (p_error) {
                next(p_error);
            }
        }
    }
});

storageRoute.post('/copyTo', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }


    let s_orgPath = (req.decodedUser.USER_MODE == 'ADMIN' ? '/' : `/${req.decodedUser.USER_NO}/`) + (s_body.rootpath ? `${s_body.rootpath}/` : '') + s_body.path_from.path;
    let s_newPath = (req.decodedUser.USER_MODE == 'ADMIN' ? '/' : `/${req.decodedUser.USER_NO}/`) + (s_body.rootpath ? `${s_body.rootpath}/` : '');

    if (s_body.call_type != undefined) {
        s_newPath = `/${req.decodedUser.USER_NO}/`;
    }

    if (s_body.path_to.path != '') {
        s_newPath += s_body.path_to.path + '/' + s_body.path_from.name;
    } else {
        s_newPath += s_body.path_from.name;
    }

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_orgPath) || onChkPath(s_newPath)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        try {
            let s_result = await s_storageMng.onCopyFile(s_orgPath, s_newPath, true);

            if (!s_result.isSuccess)
                next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: s_result.result }));
            else
                res.json({ success: true, message: '복사 완료' });
        } catch (p_error) {
            next(p_error);
        }
    }
});

storageRoute.get('/download', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body: any = req.query;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_path: string = s_body.filePath;
    let s_filename = '';
    if(s_body.filename) {
        s_filename = s_body.filename;
    };
    let s_regUserno: string = '';

    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_path)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        try {

            let s_result:any = await s_storageMng.onReadFile(s_path, null, s_filename);
            const { contentDisposition, contentType, contentLength } = s_result.headers;
            res.setHeader('Content-Disposition', contentDisposition);
            res.setHeader('Content-Type', contentType);
            // res.setHeader('Content-Length', contentLength);
            const start = Date.now();
            s_result.stream.pipe(res);
            s_result.stream.on('end', () => {
            const end = Date.now();
                console.log(`📦 Zip 파일 다운로드 완료 (총 ${(end - start) / 1000}s)`);
            });
        } catch (p_error) {
            next(p_error);
        }
    }
});

storageRoute.get('/downloadZipFile', async (req: Request, res: Response<any>, next: NextFunction) => {

    let s_body: any = req.query;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_path: string = s_body.filePath;

    let s_filename = '';
    if(s_body.filename) {
        s_filename = s_body.filename;
    };
    let s_option = '';
    if(s_body.option) {
        s_option = s_body.option;
    };
    let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);

    if (onChkPath(s_path)) {
        next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
    }
    else {
        try {
            const startTime = Date.now();
            let s_result:any = await s_storageMng.onDonwloadZipFile(encodeURIComponent(s_path), s_option, s_filename);
            const { contentDisposition, contentType, contentLength } = s_result.headers;
            res.setHeader('Content-Disposition', contentDisposition);
            res.setHeader('Content-Type', contentType);
            if (contentLength != undefined) {
                res.setHeader('Content-Length', contentLength);
            }
            s_result.stream.pipe(res)
            .on('finish', () => {
            console.log(`📦 Zip stream completed`);
            const duration = (Date.now() - startTime) / 1000;
            console.log(`⏱️ Duration: ${duration.toFixed(2)} seconds`);
        });
            console.log("contentDisposition : ", contentDisposition);
        } catch (p_error) {
            next(p_error);
        }
    }
});
// WPLAT-355
storageRoute.get('/getApiData/:USER_NO/:VIEW_ID/:STARTROW/:ENDROW', async (req: Request, res: Response, next: NextFunction) => {
    let s_body: any = req.params;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }


    try {
        if (isNaN(s_body.STARTROW) || isNaN(s_body.ENDROW)) {
            res.json({"message": "start row와 end row는 숫자만 가능합니다."});
        }
        else if ((s_body.ENDROW - s_body.STARTROW) > 1000) {
            res.json({"message": "1000개 이상은 조회가 불가능합니다."});
        } else {


            // let s_storageMng = new WiseStorageManager(s_user,global.WiseAppConfig);

            // await s_storageMng.onInit();

            // s_storageMng.getData(`${s_body.USER_NO}/wp_dataset/${s_body.VIEW_ID}`).then((p_result:any) => {
            // let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
            // let sFileList = JSON.parse(p_result.result).FileStatuses.FileStatus;
            // let sFileNm = sFileList.pop().pathSuffix;
            let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
            let s_index = await global.WiseMetaDB.select('DS_VIEW_TBL_MSTR', ['VIEW_IDX'], { DS_VIEW_ID: s_body.VIEW_ID });

            let s_param = {
                action: "api",
                method: "",
                groupId: "api",
                jobId: "1",
                location: "api",
                userno: s_body.USER_NO,
                data: {
                    usetable: s_body.USER_NO + "_" + s_body.VIEW_ID,
                    filename: s_body.VIEW_ID,
                    filetype: global.WiseAppConfig.FILE_FORMAT,
                    fileseq: ",",
                    index: s_index[0].VIEW_IDX,
                    dataUserno: s_body.USER_NO,
                    startRow: s_body.STARTROW,
                    endRow: s_body.ENDROW
                }
            }

            s_sparkApiMng.onCallApi(`/job`,
                JSON.stringify(s_param),
                {
                    'Content-Type': 'application/json',
                    'groupId': 'api',
                    'jobId': '0'
                }).then((pResult:any) => {
                    res.json(JSON.parse(pResult));
                }).catch(pErr => { next(pErr) });
        }

    } catch (error) {
        next(error);
    }
});
// 잘못된 경로면 true. 빈 값과 함께 .. 경로 조각, 널 문자를 막아 저장소 밖으로 나가지 못하게 한다.
function onChkPath(p_path: string) {
    if (!p_path || typeof p_path !== 'string') {
        return true;
    }
    let s_path = p_path;
    try {
        s_path = decodeURIComponent(p_path);
    } catch (p_err) {
        return true;
    }
    if (s_path.includes('\0')) {
        return true;
    }
    return s_path.split(/[\\/]/).some(p_seg => p_seg == '..');
}

// 모델 배포 주소는 클라이언트가 보낸 값을 그대로 호출하지 않고, 메타DB에 등록된 배포 주소일 때만 쓴다.
async function isRegisteredDeployUrl(p_url: string) {
    if (!p_url || typeof p_url !== 'string') {
        return false;
    }
    let s_model = await global.WiseMetaDB.select('DP_MODEL_MSTR', ['MODEL_ID'], { DEPLOY_URL: p_url, DEL_YN: 'N' });
    return s_model.length > 0;
}


// 다운로드 url 만듬
storageRoute.post('/getDownloadUrl', async (req: Request, res: Response<any>, next: NextFunction) => {

    try {
        const s_filePath = req.body.path;
        
        if (!s_filePath) {
            return res.status(400).send('Missing filePath parameter.');
        }

        const token = req.headers.authorization

        if (!token) {
            return res.status(401).send('Unauthorized: Missing token');
        }
        let s_filename = '';
        if(req.body.filename) {
            s_filename = req.body.filename
        }

        // Pre-Signed URL 생성 (URL에 토큰과 유효기간 포함)
        const s_url = `${req.protocol}://${req.get('host')}/hdfs/download?filePath=${encodeURIComponent(s_filePath)}&filename=${encodeURIComponent(s_filename)}&token=${encodeURIComponent(token)}`;
        res.send({ url: s_url });
    } catch (error) {
        next(error);
    }
});

storageRoute.post('/getDownloadZipUrl', async (req: Request, res: Response<any>, next: NextFunction) => {

    try {
        const s_filePath = req.body.path;
        
        if (!s_filePath) {
            return res.status(400).send('Missing filePath parameter.');
        }

        const token = req.headers.authorization

        if (!token) {
            return res.status(401).send('Unauthorized: Missing token');
        }
        let s_filename = '';
        if(req.body.filename) {
            s_filename = req.body.filename
        }
        let s_option = '';
        if(req.body.option) {
            s_option = req.body.option
        }
        const s_url = `${req.protocol}://${req.get('host')}/hdfs/downloadZipFile?filePath=${encodeURIComponent(s_filePath)}&filename=${encodeURIComponent(s_filename)}&option=${encodeURIComponent(s_option)}&token=${encodeURIComponent(token)}`;
        res.send({ url: s_url });
    } catch (error) {
        next(error);
    }
});

storageRoute.post('/getArtifactExist', async (req: Request, res: Response<any>, next: NextFunction) => {
    try {
        const s_filePath = req.body.path;
        if (onChkPath(s_filePath)) {
            return next(new WpError({ httpCode: WpHttpCode.HADOOP_DATA_ERR, message: '파일 경로가 올바르지않습니다.' }));
        }
        let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);
        let s_result = await s_storageMng.onArtifactExist(s_filePath)
        res.json({ success: s_result, message: 'Exist' });
    } catch (error) {
        next(error);
    }
});

storageRoute.post('/downloadPredict', async (req: Request, res: Response,  next: NextFunction) => {
  const { modelURL, filelist } = req.body;

    if (!(await isRegisteredDeployUrl(modelURL))) {
        return next(new WpError({ httpCode: WpHttpCode.UNAUTHORIZED, message: '등록되지 않은 모델 배포 주소입니다.' }));
    }
    const targetUrl = new URL('/predict_file', modelURL); // modelURL + /predict_file
    const postData = JSON.stringify({ filelist });

    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 80,
      path: targetUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    const flaskReq = http.request(options, flaskRes => {
  const contentType = flaskRes.headers['content-type'];

  if (flaskRes.statusCode !== 200) {
    let errorText = '';
    flaskRes.on('data', chunk => errorText += chunk);
    flaskRes.on('end', () => {
      next({ message: errorText || 'Flask 예측 실패' });
    });
    return;
  }

  // ✅ Content-Type에 따라 처리 분기
  if (contentType?.includes('application/zip')) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=predicted_images.zip');
  } else if (contentType?.includes('text/csv')) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=predict_${filelist[0]}`);
  }

  // ✅ Flask에서 오는 압축 스트림을 그대로 클라이언트로 전달
  flaskRes.pipe(res);

  // ✅ 오류 및 종료 처리 보강
  flaskRes.on('end', () => {
    res.end();
  });
});

flaskReq.on('error', err => {
  console.error('Flask 호출 오류:', err);
  res.status(777).json({ message: 'Flask 요청 중 오류 발생' });
});

flaskReq.write(postData);
flaskReq.end();
//     const flaskReq = http.request(options, flaskRes => {
//       if (flaskRes.statusCode !== 200) {
//         let errorText = '';
//         flaskRes.on('data', chunk => errorText += chunk);
//         flaskRes.on('end', () => {
//           next({ message: errorText || 'Flask 예측 실패' });
//         });
//         return;
//       }

//       // CSV 파일 스트림 응답
//       res.setHeader('Content-Type', 'text/csv');
//       res.setHeader('Content-Disposition', `attachment; filename=predict_${filelist[0]}`);
//       flaskRes.pipe(res);
//     });

//     flaskReq.on('error', err => {
//       console.error('Flask 호출 오류:', err);
//       res.status(777).json({ message: 'Flask 요청 중 오류 발생' });
//     });

//     flaskReq.write(postData);
//     flaskReq.end();

//   } catch (err) {
//     console.error('예측 처리 실패:', err);
//     next({ message: '예측 처리 중 서버 오류 발생' });
//   }
});
// storageRoute.post('/getTempImageList', async (req: Request, res: Response<any>, next: NextFunction) => {
//     try {
//         const s_filePath = req.body.path;
//         const s_page = req.body.page;
//         let s_storageMng = new WiseStorageManager(req.decodedUser, global.WiseStorage);
//         let s_result:any = await s_storageMng.getTempImageList(s_filePath, s_page)
//         s_result = JSON.parse(s_result);
//         if (s_result['responsecode']==200){
//             res.json({ success: true, data: s_result['data']});
//         }
//         else{
//             res.json({ success: false});
//         }
//     } catch (error) {
//         next(error);
//     }
// });