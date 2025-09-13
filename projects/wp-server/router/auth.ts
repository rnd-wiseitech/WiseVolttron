import express, { NextFunction, Request, Response } from 'express';
import {Op, Transaction} from 'sequelize';
import { WpUserManager } from '../util/user-mng/user-mng';
import { createToken,verifyToken, createTempToken } from '../auth/token/token';
import { WiseStorageManager } from '../util/data-storage/WiseStorageManager';
import { WpError } from '../exception/WpError';
const moment = require('moment');

export const authRoute = express.Router();

authRoute.post('/login', async(req: Request, res: Response,next:NextFunction) => {

    let s_body = req.body.params;
    let s_userId = s_body.USER_ID;
    let s_passwd = s_body.password;
    let s_userMng = new WpUserManager();   
    await s_userMng.connect();

    s_userMng.getUser('',s_userId).then(p_userInfo=>{
        if(p_userInfo.result.length == 0){
            res.json({
                CHECK_LOGIN: "FAILED",
                CHECK_ID: "INVALID"
            });
        }
        else{
            let s_user = {
                USER_ID:p_userInfo.result[0]['USER_ID'],
                USER_NO:"",
                USER_MODE:"",
                DEL_YN:p_userInfo.result[0]['DEL_YN']
            };

            s_userMng.getUser('',s_userId,undefined,undefined,s_passwd).then(pp_userInfo=>{
                if(pp_userInfo.result.length == 0){
                    res.json({
                        CHECK_LOGIN: "FAILED",
                        CHECK_PWD: "INVALID"
                    });
                }
                else{
                    if(pp_userInfo.result[0].dataValues.USER_MODE==""){     
                        res.json({
                            CHECK_LOGIN: "FAILED",
                            CHECK_MODE: "INVALID"
                        });
                    }
                    else{
                        createToken({ 
                            USER_ID:pp_userInfo.result[0].USER_ID,                             
                            USER_NO:pp_userInfo.result[0].USER_NO, 
                            USER_MODE:pp_userInfo.result[0].dataValues.USER_MODE,
                            WPML_URL: `${pp_userInfo.result[0].dataValues.APP_SVC_URL}`,
                            AppConfig:{
                                WP_API: {
                                    host: pp_userInfo.result[0].dataValues.APP_SVC_IP,
                                    port: `${pp_userInfo.result[0].dataValues.APP_SVC_PORT}`,
                                    monitoring_port:"30095"
                                },
                            },
                            USER_INSTANCE:pp_userInfo.result[0].dataValues.USER_INSTANCE}).then(p_token => {
                                res.json({
                                    CHECK_LOGIN: "SUCCESS",
                                    DEL_YN:pp_userInfo.result[0]['DEL_YN'],
                                    TOKEN:p_token,
                                    CHECK_TUTO: JSON.parse(pp_userInfo.result[0].dataValues.USER_AUTH).tutochk
                                });
                        }).catch(pError => {
                            next(pError)
                        });
                    }
                }
            }).catch(p_error=>next(p_error));
        }
    }).catch(p_error=>next(p_error));
});

// #WP-238 체험판 토큰 생성
authRoute.post('/createToken', (req: Request, res: Response, next: NextFunction) => {
    createTempToken({ USER_NO:'0', USER_ID:''}).then(async (token) => {
        console.log('체험판 토큰:', token);
        let s_wpSm = new WiseStorageManager({USER_NO:0});
        let s_tutoPath = '/0'
        let s_isExist = await s_wpSm.isExists(s_tutoPath);
        if(s_isExist.isSuccess){
            if(s_isExist.result){
                res.json({TOKEN:token});
            }else{
                s_wpSm.onMakeDir(s_tutoPath,'755',true).then(pMakeFolderResult => {
                    if(pMakeFolderResult.isSuccess){
                        res.json({TOKEN:token});
                    }else{
                        next(pMakeFolderResult.result);
                    }
                });
            }
        }else{
            next(s_isExist.result);
        }
    }).catch(error => {
        res.status(401).json({ success: false, message: error.message })
    });
});

authRoute.post('/tokenCheck',(req: Request, res: Response,next:NextFunction) => {
    let s_token = req.decodedUser.USER_TOKEN;

    // 토큰 미존재: 로그인하지 않은 사용자
    if (!s_token) {
        console.log(s_token);
        return next(new WpError({ httpCode:401, message:'토큰이 존재하지 않습니다.'}));
    }

    // 토큰 검증
    verifyToken(s_token)
      .then(p_decodedToken => {
        if(p_decodedToken.USER_NO!=undefined && p_decodedToken.USER_NO != 0) {
            res.json('user');
        }else if(p_decodedToken.USER_NO == 0){
            res.json('test');
        } else {
            console.log(true);
            res.json('expired');
        }
      })
      .catch(pError => next(pError));
});


// WPLAT-34 접속이력 추가 
authRoute.post('/updateLoginHistory',(req: Request, res: Response,next:NextFunction) => {
    try {
        let { USER_NO, TYPE } = req.body;
        if (USER_NO || TYPE) {
            let s_ip = req.decodedUser.USER_IP;            
            let s_today = moment().format('YYYY-MM-DD HH:mm:ss');
            let s_metaDb = global.WiseMetaDB;

            s_metaDb.insert('DP_LOGIN_HISTORY',{
                USER_NO: USER_NO,
                TYPE: TYPE,
                IP: s_ip,
                REG_DT: s_today
            },false).then(p_insertResult => {
                res.json({ isSuccess: true, message: 'LOGIN HISTORY UPDATE - ' + TYPE });
            }).catch((p_error) => {
                next(p_error);
            });
        } else {
            next(new WpError({ httpCode: 500, message: 'update login history error' }));
        }
    } catch (pError) {
        next(pError);
    }
});

authRoute.post('/getUserAuth',(req: Request, res: Response,next:NextFunction) => {
    let s_metaDb = global.WiseMetaDB;
    let s_params = req.body.params;
    let s_type = req.body.type;
    let s_dataId = '';
    if(s_type == 'dataset') {
        s_dataId = s_params.DS_VIEW_ID;
    } else if (s_type == 'model') {
        s_dataId = s_params.MODEL_ID;
    } else if (s_type == 'workflow') {
        s_dataId = s_params.WF_ID;
    }
    s_metaDb.select('DP_AUTH_USER_MSTR',[],{ DATA_ID: s_dataId, SHARE_TYPE: s_type}).then(p_insertResult => {
        res.json({ isSuccess: true, result: p_insertResult});
    }).catch((p_error) => {
        next(p_error);
    });
});

authRoute.post('/getGroupAuth',(req: Request, res: Response,next:NextFunction) => {
    let s_metaDb = global.WiseMetaDB;
    let s_params = req.body.params;
    let s_type = req.body.type;
    let s_dataId = '';
    if(s_type == 'dataset') {
        s_dataId = s_params.DS_VIEW_ID;
    } else if (s_type == 'model') {
        s_dataId = s_params.MODEL_ID;
    } else if (s_type == 'workflow') {
        s_dataId = s_params.WF_ID;
    }
    s_metaDb.select('DP_AUTH_GRP_MSTR',[],{ DATA_ID: s_dataId, SHARE_TYPE: s_type}).then(p_insertResult => {
        res.json({ isSuccess: true, result: p_insertResult});
    }).catch((p_error) => {
        next(p_error);
    });
});

authRoute.post('/updateUserAuth',(req: Request, res: Response,next:NextFunction) => {

    let s_metaDb = global.WiseMetaDB;
    
    let s_params = req.body.params;
    let s_dataInfo = s_params.dataInfo;
    let s_addList = s_params.addList;
    let s_removeList = s_params.removeList;
    let s_type = s_params.type;
    let s_dataId = '';
    if(s_type =='dataset') {
        s_dataId = s_dataInfo.DS_VIEW_ID;
    } else if(s_type == 'model') {
        s_dataId = s_dataInfo.MODEL_ID;
    } else if(s_type == 'workflow') {
        s_dataId = s_dataInfo.WF_ID;
    }

    if(s_addList.includes(s_dataInfo.REG_USER_NO))
        s_addList.splice(s_addList.indexOf(s_dataInfo.REG_USER_NO),1);
    if(s_removeList.includes(s_dataInfo.REG_USER_NO))
        s_removeList.splice(s_removeList.indexOf(s_dataInfo.REG_USER_NO),1);
    
    try {
        s_metaDb.getConnection().transaction(async (pT:Transaction)=>{
        
            let s_result = [];
            
            for(let s_addIdx of s_addList){
                s_result.push(await s_metaDb.insert('DP_AUTH_USER_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_USER_NO: s_addIdx},false));
            }
            for(let s_removeIdx of s_removeList){
                s_result.push(await s_metaDb.delete('DP_AUTH_USER_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_USER_NO: s_removeIdx}));
            }

            return s_result;
        }).then(p_result=>{
            res.json({ isSuccess: true, result: p_result});
        });
    } catch (p_error) {
        next(p_error);
    }
    
});



authRoute.post('/updateGroupAuth',async (req: Request, res: Response,next:NextFunction) => {

    let s_metaDb = global.WiseMetaDB;
    
    let s_params = req.body.params;
    let s_dataInfo = s_params.dataInfo;
    let s_addList = s_params.addList;
    let s_removeList = s_params.removeList;
    let s_type = s_params.type;
    let s_dataId = '';
    if(s_type =='dataset') {
        s_dataId = s_dataInfo.DS_VIEW_ID;
    } else if(s_type == 'model') {
        s_dataId = s_dataInfo.MODEL_ID;
    } else if (s_type == 'workflow') {
        s_dataId = s_dataInfo.WF_ID;
    }

    
    try {
        
        let s_addUserNo = await s_metaDb.select('DP_USER_MSTR', ['USER_NO'], { DEL_YN:'N', GRP_ID:{[Op.in]:s_addList}});
        let s_removeUserNo = await s_metaDb.select('DP_USER_MSTR', ['USER_NO'], { DEL_YN:'N', GRP_ID:{[Op.in]:s_removeList}});
        s_metaDb.getConnection().transaction(async (pT:Transaction)=>{
        
            let s_result = [];
            
            for(let s_addIdx of s_addList){
                s_result.push(await s_metaDb.insert('DP_AUTH_GRP_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_GROUP_ID: s_addIdx},false));
            }
            for(let userno of s_addUserNo){
                s_result.push(await s_metaDb.insert('DP_AUTH_USER_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_USER_NO: userno['USER_NO']},false));
            }
            for(let s_removeIdx of s_removeList){
                s_result.push(await s_metaDb.delete('DP_AUTH_GRP_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_GROUP_ID: s_removeIdx}));
            }
            for (let userno of s_removeUserNo) {
                s_result.push(await s_metaDb.delete('DP_AUTH_USER_MSTR',{DATA_ID: s_dataId, SHARE_TYPE: s_type, OWNER_USER_NO: s_dataInfo.REG_USER_NO, SHARER_USER_NO: userno['USER_NO']}));
            }

            return s_result;
        }).then(p_result=>{
            res.json({ isSuccess: true, result: p_result});
        });
    } catch (p_error) {
        next(p_error);
    }
    
});