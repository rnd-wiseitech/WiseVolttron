import express, { NextFunction, Request, Response } from 'express';
import { WpError, WpHttpCode } from '../exception/WpError';
import { DP_USER_MSTR_ATT } from '../metadb/model/DP_USER_MSTR';
import { DP_USER_PROFILE_ATT } from '../metadb/model/DP_USER_PROFILE';
import { WiseStorageManager } from '../util/data-storage/WiseStorageManager';
import { WpUserManager } from '../util/user-mng/user-mng';
import { QueryTypes } from "sequelize";
// import { WpLdapClient } from '../util/user-mng/ldap-mng';
const nodemailer = require('nodemailer')
const smtpTransport = require('nodemailer-smtp-transport')

const moment = require('moment');

export const userRoute = express.Router();

// id 중복체크
userRoute.post('/check',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }          
    let s_metaDb = global.WiseMetaDB;     

    s_metaDb.select('DP_USER_MSTR',[],{USER_ID:s_body.id}).then(function (pResult:any) {   
        res.json(pResult.length);
    }).catch(function (err:any) {
        if(err.original){
            res.status(550).json({ success: false, message: err.message });                        
        }else{
            res.status(500).json({ success: false, message: err.message });
        }
    });  
});

// 회원가입
userRoute.post('/auth',async(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }          
    let agree = 'Y';
    if(!s_body.userInfo.agree){
        agree = 'N';
    }
    var moment = require('moment'); 
    require('moment-timezone'); 
    moment.tz.setDefault("Asia/Seoul"); 
    var today = moment().format('YYYY-MM-DD HH:mm:ss'); 
    let s_userInfo:DP_USER_MSTR_ATT = {
        USER_ID: s_body.userInfo.id,
        EMAIL: s_body.userInfo.email,
        PASSWD: s_body.userInfo.password2,
        DEL_YN: 'N',
        AGREE_YN:agree,
        REG_DATE:today
    };

    let s_metaDb = global.WiseMetaDB;  
    let s_userMng = new WpUserManager();    
    await s_userMng.connect();

    s_userMng.addUser(s_userInfo).then(async p_result=>{
        if(p_result.isSuccess){
            let s_profile:DP_USER_PROFILE_ATT = {
                USER_NO:p_result.result.USER_NO,
                USER_MODE: 'USER',
                USER_INSTANCE: JSON.stringify({core:1,memory:'1GB',gpu:0,hdd:'10MB',LANG:'ko'}),
                USER_AUTH:JSON.stringify({tmppass: s_body.authNum, tutochk: 'N'}),
                FOLDER_PATH:JSON.stringify([{name:'데이터',isDirectory:true,items:[]}]),
                APP_NO: 1
            };
    
            let s_reVal = await s_userMng.addUserProfile(s_profile);
                
            // hdfs의 경우 폴더권한 문제로 root권한으로 user폴더 생성 -> user폴더 chown(user_id) -> user 하위 폴더 생성(user 권한으로)
            if(global.WiseAppConfig.STORAGE_TYPE=='HDFS'){                
                let s_remoteFolderPath = `/${p_result.result.USER_NO}`;
                let s_remoteDataPath = `/${p_result.result.USER_NO}/wp_dataset/removed/`;
                let s_wpSm = new WiseStorageManager({USER_NO:1000});
        
                s_wpSm.onMakeDir(s_remoteFolderPath,'755',true).then(pMakeFolderResult => {
                    if(pMakeFolderResult.isSuccess){
                        s_wpSm.chown(s_remoteFolderPath,s_userInfo.USER_ID).then(async pChownFolderResult => {
                            if(pChownFolderResult.isSuccess){
                                
                                let s_wpSm = new WiseStorageManager({USER_NO:p_result.result.USER_NO});
                                
                                s_wpSm.onMakeDir(s_remoteDataPath,'755',true).then(pMakeFolderResult2 => {
                                    if(pMakeFolderResult2.isSuccess){
                                        res.json({ result: true, message: '등록 완료' });
                                    }else{
                                        next(pMakeFolderResult2.result);
                                    }
                                });
                            }else{
                                next(pChownFolderResult.result);
                            }
                        });
                        // res.json({ result: true, message: '등록 완료' });
                    }else{
                        next(pMakeFolderResult.result);
                    }
                });
            // local의 경우 기존과 동일
            }else{
                let s_remoteFolderPath = `/${p_result.result.USER_NO}/wp_dataset/removed/`;
        
                let s_wpSm = new WiseStorageManager({USER_NO:p_result.result.USER_NO, AppConfig: global.WiseAppConfig});
        
                s_wpSm.onMakeDir(s_remoteFolderPath,'755',true).then(pMakeFolderResult => {
                    if(pMakeFolderResult.isSuccess){
                        res.json({ result: true, message: '등록 완료' });
                    }else{
                        next(pMakeFolderResult.result);
                    }
                });
            }
    
        }
        else{
            next(p_result.result);
        }
    });

});

// 비밀번호 찾기시 유효 이메일 체크
userRoute.post('/userCheck',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }          
    let s_metaDb = global.WiseMetaDB;     

    s_metaDb.select('DP_USER_MSTR',[],{USER_ID:s_body.auth.email}).then(function (pResult:any) {   
        if(pResult.length===0){
            res.json(pResult.length);
        }
        else{       
            s_metaDb.update('DP_USER_MSTR',{PASSWD: s_body.pwdNum, DEL_YN: "E"},{USER_NO: pResult[0]["USER_NO"]}).then(function (insertMode) {
                console.log(insertMode);
                res.json(insertMode);
            }).catch(function (err) {
                if(err.original){
                    res.status(550).json({ success: false, message: err.message });                        
                }else{
                    res.status(500).json({ success: false, message: err.message });
                }
            });
        }

    }).catch(function (err:any) {
        if(err.original){
            res.status(550).json({ success: false, message: err.message });                        
        }else{
            res.status(500).json({ success: false, message: err.message });
        }
    });  

});

// 비밀번호 찾기 이메일 전송
userRoute.post('/pwdEmail',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }          
    
    let transporter = nodemailer.createTransport(smtpTransport({
        service: 'gmail',
        auth: {
            user: 'wiseprophet@wise.co.kr',
            pass: 'wise1012!@'
        }
    }))    
    let mailOptions = {
        from: '위세아이텍 <wiseprophet@wise.co.kr>',
        to: s_body.email.email,
        subject: '임시 비밀번호 발급',
        text: '테스트입니다.',
        html:`<table border="0" cellpadding="0" cellspacing="0" style="width:700px;margin:0 auto;">
		<tr>
			<td><img src="data:image/gif;base64,R0lGODlhvAJQALMAANTl+nmx8KTI9EGY7PX5/uDr++ry/LHP9pbB81ah7mip773X98ne+Ii58v///yiP6yH/C1hNUCBEYXRhWE1QPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MUU1RjJBQzkxNTlCMTFFOUJEQjc4MjZBOUI1Mzk0REMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MUU1RjJBQ0ExNTlCMTFFOUJEQjc4MjZBOUI1Mzk0REMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDoxRTVGMkFDNzE1OUIxMUU5QkRCNzgyNkE5QjUzOTREQyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDoxRTVGMkFDODE1OUIxMUU5QkRCNzgyNkE5QjUzOTREQyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY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"></td>
		</tr>
		<tr>
			<td><img src="data:image/gif;base64,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"/></td>
		</tr>
		<tr>
			<td align="center" style="font-family:'Nanum Gothic','Malgun Gothic',Dotum ,sans-serif;color:#000;font-size:16px;">안녕하세요. <strong style="color:#1c62aa;">WISE PROPHET</strong> 입니다.</td>
		</tr>
		<tr>
			<td align="center" style="height:40px;line-height:40px;font-family:'Nanum Gothic','Malgun Gothic',Dotum ,sans-serif;font-size:30px;font-weight:bold;color:#333;">임시 비밀번호가 발급되었습니다.</td>
		</tr>
		<tr>
			<td style="height:20px;"></td>
		</tr>
		<tr>
			<td align="center" style="height:60px;line-height:60px;background:#eaeaea;font-family:'Dotum','Nanum Gothic','Malgun Gothic',Dotum ,sans-serif;font-size:16px;font-weight:bold;color:#5d6163;">임시 비밀번호는 <span style="color:#000;">${s_body.pwdNum}</span> 입니다.</td>
		</tr>
		<tr>
			<td style="height:75px;"></td>
		</tr>
		<tr>
			<td align="right" style="width:100%;padding-top:15px;border-top:1px solid #d8d8d8;">
                <img src="data:image/gif;base64,R0lGODlhdwANAPcAALC2vM3R1H+JkvX19t/i5MLHzLzBxuvt7qSrssvP0+Xn6fT19qyyuKOqsbW7wbq/xJqiqXuEjtDU1/7+/pefp87S1ZWdpYuTnOHk5qCnrqattMzQ1PX298rO0sjM0Pz9/YqSm8/T1t7g4+Dj5bO5vq+1u5aepY+YoIqTnLG3vY+XoKmvtpykq52lrMXJztrd4IeQmYWOl46Wn4ONlq2zueHj5f7//7S6v4iRmsHGytjb3tnc39ve4J+mrYKLlaGor6ats+fp65mhqfn6+pObo/j5+ers7Y2Wnt3g4vLz9IyVnuTm6MnN0X2Hkff4+NLV2NTX2n2GkI2Vnuvs7quxuM3R1ebo6paepqeutdLW2bm+xPf3+Jyjq36Ikujp6/b295ScpMLHy+3v8ImSmvDx8oSNluPl6ICJk3+IksbKz+7v8IGKlPj4+Z2krLi9w7O5v5mgqOnq7Ozu74WPmMbKzu3u7/Hy86Wss7e8wnyFj77DyMPIzLS6wKiutfr7+/n5+v3+/pifp4aPmKyyufz8/Kivtd/h5Pv7+7/Eyb3Cx660upujqvb39/v8/P39/YuUnZqhqbvAxaSrsbK4vtPW2pGZoXyGkMTIzKqwt3uFj5KaooCKk8fL0Onr7NDT146Xn7m+w9HU2OLk58fLz4GLlJefptHV2MTIzZCZoba7wbW7wIyUnd7h46mwtuLk5rq/xbi9wsDFyYOMlpGaou/x8qKpsImSm+7w8e/w8aettL/EyISOl5igqMDFys7S1oKMlXqEjv///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C1hNUCBEYXRhWE1QPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOCAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDRCODkwNjYxNTlDMTFFOUE4MUZDNTMwNUJFM0NFNDciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDRCODkwNjcxNTlDMTFFOUE4MUZDNTMwNUJFM0NFNDciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0NEI4OTA2NDE1OUMxMUU5QTgxRkM1MzA1QkUzQ0U0NyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0NEI4OTA2NTE1OUMxMUU5QTgxRkM1MzA1QkUzQ0U0NyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2ppaGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEwLy4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAAAAAAALAAAAAB3AA0AAAj/AKn8QhKsYKBfYgrakKKkIBxSSQoeoNEE2KNejAqm8AGsY0cmBUNK+EXy1wwKBoYUdFDy1y4IBUIWNPLmwq8LAIKIbHky5UqSGEKy+IWDQzA5LUs+qZC0JIQMwHYUtNJxREFXwDAFYwMsBqBgVs4AW9TAEjAtBZUA+5ELCIJaCmQG6+CxLpcJwRjU9dgq5Igue/PoKEh3L7C7eTuKCHmi44JgRgwDo5NDMrAzDYDxKKiqo6GCioAtCaZgbcFZwBYHSwIqTjAOwMrInR2gI5YQHsZ0DBAMQMdIIQqs6UiQ0JGORN5Q6PhrQLDawG7n3t27I4GQJoAJcH6go4wCBgw8/7Cy5EGYQR0tnHrAhIrmYEXmQAAGJdiETYJsBDMFDFawKcAQMVswogDTwoAyQZdAQS90pEF1wCQUjAsd5RCMLx3xUkQwhEAFTCzBVNDRgsE0CMyDvgFzXUHZbRdMdyciGEdHDoTEx3seACMBMAtiAMwDBbkBzAb/aecJbcCEgWBI0FkYjBMdtQGhFwVV0REiiUUVkgIRAJNBMDsC4ySUwEiZYh0hCaEddx0VguAIHaUQ0iQqBnNBD2QA40EwKwCjUzBQWRVMIR1B8IJMr4yVCh80kCgXdEQGk0BHJUAIBS462NIRK8G0uEVIH8AAzAXBZNFRpJMCU2mKECDgqixrvv/YEQyuIoBWSAR0BEBIJPgJGw9/AKNHMFGAoBAIwDwWzB8peNTAFwVpsNcKA0LXggE3oNFRDRBG0GVHLOAlAzAzNCKTFOSW2tG12W4LoWEuwljXGjLlCsyuGiWrBzDB+AFMGgsAo0tBA2RirExepIjvJxEooIYatzhRrWQGFJRiXS34YRAwXSgbTKjAHBHMExRb3JEgR6CwSkXxMgeBBWDQUK+uIYVGCwySBJMnHXsAY0dBZgDTwIB04fAxMA0tWRB0MaigwgqDmQxMACSbVlAJHR1aEJdCBxNKR00/HTWEOxzCxhBgxAojAgjai28w6BUQgRnBbBEFHkLIEJKIQAb/o19IRQBjQTBLdK30cx3FNFuKEampZTBQdHRFRod46EKIiQ+YYlwFLdcyMH20TXNBeIw6eEE4oBKF4sEIWUUwnFDAbUF6pRHMBsBgeTh0rMuU4mchdKRJQR80BswJN1jQURlG4Q5M7yGluGKnansHnniU4Dp6MD0DMwrxyAIDbUGlABOXe8BAcsccwNxRUK9E9AEEED1cQnRHiQyoFzAEBRN+BQWZQgz20oTZFSZ/s9mfaoJhvMdExjBwCIkIOsKAkDDhFyhQ1gR64AOZFQQQKPjFzyaQgCt0pBJ7itYv8lAXEgxoJL+43GxY8ougBKMKv/ABCxxRkDrcQAoYJEEnGXYSwwHR0IbBGEpRjtKUX1SqIBggSY0KEhAAOw==" alt="" />
			</td>
		</tr>
	    </table>`
    }
    
    transporter.sendMail(mailOptions, (error:any, info:any) => {
        
        if (error) {
            if(error.original){
                res.status(550).json({ success: false, message: error.message });                        
            }else{
                res.status(500).json({ success: false, message: error.message });
            }
            // return console.log(error)
        }
        console.log('Message %s sent: %s', info.messageId, info.response)        
        res.json({ result: true, message: '전송 완료' });
    })
});

userRoute.post('/chkLowCompt',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let sNodeInfo = s_body.nodeInfo;
    let s_metaDb = global.WiseMetaDB;

    let s_query = `SELECT GROUP_ID AS 'key', 'GROUP' AS 'type' FROM DP_GRP_MSTR WHERE P_GROUP_ID = ${sNodeInfo.group_id} AND DEL_YN = 'N' UNION ALL
    SELECT A.USER_NO AS 'key', 'USER' AS 'type' FROM DP_USER_MSTR A INNER JOIN DP_USER_PROFILE B ON A.USER_NO=B.USER_NO WHERE A.GRP_ID = ${sNodeInfo.group_id} AND A.DEL_YN='N'`;

    s_metaDb.query(s_query,'',false).then(p_result=>{

        res.json({ success: true, result: p_result });
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/changeLang',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_userMng = new WpUserManager();  
    let s_userNo = req.decodedUser.USER_NO;
      
    try {
        if(s_userNo != undefined &&s_userNo != 0){                
            s_userMng.getUserProfile({USER_NO:s_userNo}).then((p_result:any)=>{
                let s_instance=JSON.parse(p_result.result[0].USER_INSTANCE);
                s_instance.LANG=s_body.LANG;
    
                let s_newInst =JSON.stringify(s_instance);
                
                let s_updProfileCols = {
                    USER_INSTANCE: s_newInst
                };
    
                s_userMng.updateUserProfile(s_updProfileCols,{USER_NO:s_userNo}).then((p_result:any)=>{
                    res.json({ result: true, message: '언어 변경' });
                }).catch((p_err) => {
                    next(p_err);
                });;
    
            }).catch(p_error=>{
                next(p_error);
            });     
        }else{
            res.json({ result: true, message: '테스트 계정' });
        }   
    } catch (error) {
        next(error);
    }

});

userRoute.post('/addGroup',async(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let sFormData = s_body.formdata;
    let s_userMng = new WpUserManager();   
    await s_userMng.connect();
    let s_grpData = {
        P_GROUP_ID: 1,
        GROUP_NAME: sFormData.group_name,
        DEL_YN: 'N',
        REG_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
        GROUP_DESC: sFormData.group_desc,
    };

    s_userMng.addGroup(s_grpData).then((p_result) => {
        if(p_result.isSuccess)
            res.json({ success: true, message: '성공적으로 등록되었습니다.' });                
    }).catch((p_err) => {
        next(p_err);
    });
});

userRoute.post('/modifyGroup',async(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let sFormData = s_body.formdata;
    let sNodeInfo = s_body.nodeInfo;
    let sDelYn = s_body.delYn;

    let s_userMng = new WpUserManager();   
    await s_userMng.connect();

    if (sDelYn) {
        s_userMng.delGroup(sNodeInfo.group_id).then((p_result) => {
            if(p_result.isSuccess)
                res.json({ success: true, message: '삭제되었습니다.' });                
        }).catch((p_err) => {
            next(p_err);
        });
    } else {
        s_userMng.modifyGroup(sNodeInfo.group_id ,sFormData.group_name, sFormData.group_desc).then((p_result) => {
            if(p_result.isSuccess)
                res.json({ success: true, message: '성공적으로 수정되었습니다.' });                
        }).catch((p_err) => {
            next(p_err);
        });
    }
});

userRoute.post('/getHdfsUsedLog',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_metaDb = global.WiseMetaDB;

    let s_query = ``;

    s_query = `SELECT B.USER_ID AS USER_NO, A.TYPE, A.IP, A.REG_DT FROM DP_LOGIN_HISTORY A
    INNER JOIN DP_USER_MSTR B ON A.USER_NO=B.USER_NO
    ORDER BY A.REG_DT DESC LIMIT 1000`;


    s_metaDb.query(s_query,'',false).then(p_result=>{

        res.json({ success: true, result: p_result });
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getLoginHistory',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_metaDb = global.WiseMetaDB;

    let s_query = ``;

    s_query = `SELECT B.USER_ID AS USER_NO, A.TYPE, A.IP, A.REG_DT FROM DP_LOGIN_HISTORY A
    INNER JOIN DP_USER_MSTR B ON A.USER_NO=B.USER_NO
    ORDER BY A.REG_DT DESC LIMIT 1000`;


    s_metaDb.query(s_query,'',false).then(p_result=>{

        res.json({ success: true, result: p_result });
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getUmTreeInfo',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_metaDb = global.WiseMetaDB;

    let s_query = ``;

    if (s_body.nodeInfo.type == 'user') {
        let s_userNo = s_body.nodeInfo.key.split('user_')[1];
        s_query = `SELECT A.USER_NO AS 'user_no', A.USER_ID AS 'user_id' , A.USER_NAME AS 'user_name' , A.PASSWD AS 'password' , B.USER_MODE AS 'user_mode' , C.GROUP_NAME AS 'group_name', C.GROUP_ID AS 'group_id' 
            FROM DP_USER_MSTR A INNER JOIN DP_USER_PROFILE B ON A.USER_NO = B.USER_NO LEFT OUTER JOIN DP_GRP_MSTR C ON A.GRP_ID=C.GROUP_ID WHERE A.DEL_YN='N' AND A.USER_NO = ${s_userNo} `;
    } else {
        s_query = `SELECT A.GROUP_ID AS 'group_id', A.GROUP_NAME AS 'group_name', 
        A.GROUP_DESC AS 'group_desc' FROM DP_GRP_MSTR A WHERE A.DEL_YN='N' AND A.GROUP_ID = ${s_body.nodeInfo.key} `
    }

    s_metaDb.query(s_query,'',false).then(p_result=>{

        res.json(p_result[0]);
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getOrganizationChart',(req: Request, res: Response<any>,next:NextFunction) => {
    
    let s_groupNm: any = [];
    let s_userId: any = [];
    let s_metaDb = global.WiseMetaDB;

    let s_query = `SELECT GROUP_ID AS 'key', P_GROUP_ID AS 'parent_id', GROUP_NAME AS 'name', 'group' AS 'type', null AS 'user_id' FROM DP_GRP_MSTR C WHERE C.DEL_YN='N' UNION ALL 
    SELECT CONCAT('user_', A.USER_NO) AS 'key', A.GRP_ID AS 'parent_id', A.USER_NAME AS 'name', 'user' AS 'type', A.USER_ID AS 'user_id' FROM DP_USER_MSTR A  
    INNER JOIN DP_USER_PROFILE B ON A.USER_NO = B.USER_NO WHERE A.DEL_YN='N'`;

    s_metaDb.query(s_query,'',false).then(p_result=>{
        if (p_result.length > 0) {
            for (let s_user of p_result) {
                try {
                    if (s_user.type == 'group') {                                    
                        s_groupNm.push(s_user.name);
                    } else {                        
                        s_userId.push(s_user.user_id);
                    }
                    s_user['icon'] = `assets/images/${s_user.type}.png`;
                } catch (error) {
                }

            }
        }
        res.json({ success: true, result: { 'orgChart': p_result, 'chkList': { 'user': s_userId, 'group': s_groupNm } } });
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getPaylist',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_metaDb = global.WiseMetaDB;
    let s_query = "SELECT PAY_ID, TYPE, PRICE, PAY_TYPE, PAY_STATUS, TRADE_DT, PRODUCT FROM DP_USER_PAY WHERE USER_NO ='" + req.decodedUser.USER_NO + "' ORDER BY TRADE_DT DESC";
    s_metaDb.query(s_query,'DP_USER_PAY',{ type: QueryTypes.SELECT }).then(function (results) {       
        res.json(results[0]);

    }).catch(function (err) {
            if(err.original){
                res.status(550).json({ success: false, message: err.message });                        
            }else{
                res.status(500).json({ success: false, message: err.message });
            }
    });     
});

userRoute.post('/getUserList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_flag = req.body.exceptAdmin;
    let s_userMode = '';
    let s_userMng = new WpUserManager();   

    if(s_flag){
        s_userMode = 'ADMIN';
    }
    s_userMng.getUser(s_userMode).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getUserInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_userMng = new WpUserManager();

    s_userMng.getUser('', undefined, String(req.decodedUser.USER_NO) ).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/addUser',async(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body.formdata;
    let s_flag = s_body.exceptAdmin;
    let s_userMode = '';

    if(s_flag){
        s_userMode = 'ADMIN';
    }

    let s_userMng = new WpUserManager();   
    await s_userMng.connect();
    let s_userInfo:DP_USER_MSTR_ATT = {
        // USER_NO: body.USER_NO,
        USER_ID: s_body.user_id,
        PASSWD: s_body.password,
        GRP_ID: Number(s_body.group_id),
        // #37 사용자이름 추가... 뺴도됨ㅁㅁㅁ
        USER_NAME: s_body.user_name,
        // COMPANY: body.compName,
        DEL_YN: 'N',
        AGREE_YN:'Y',
        REG_DATE:moment().format('YYYY-MM-DD HH:mm:ss')
    };
    
    s_userMng.addUser(s_userInfo).then(async p_result=>{
        if(p_result.isSuccess){
            let s_profile:DP_USER_PROFILE_ATT = {
                USER_NO: p_result.result.USER_NO,
                USER_MODE: s_body.user_mode,
                USER_INSTANCE: JSON.stringify({core:1,memory:'1GB',gpu:0,hdd:'10MB',LANG:'ko'}),
                USER_AUTH:JSON.stringify({tmppass: p_result.result.PASSWD, tutochk: 'N'}),
                FOLDER_PATH:JSON.stringify([{name:'데이터',isDirectory:true,items:[]}]),
                APP_NO : global.WiseAppConfig.APP_NO
            };

            let s_reVal = await s_userMng.addUserProfile(s_profile);

            // hdfs의 경우 폴더권한 문제로 root권한으로 user폴더 생성 -> user폴더 chown(user_id) -> user 하위 폴더 생성(user 권한으로)
            if(global.WiseAppConfig.STORAGE_TYPE=='HDFS'){                
                let s_remoteFolderPath = `/${p_result.result.USER_NO}`;
                let s_remoteDataPath = `/${p_result.result.USER_NO}/wp_dataset/removed/`;
                let s_wpSm = new WiseStorageManager({USER_NO:1000});                
        
                s_wpSm.onMakeDir(s_remoteFolderPath,'755',true).then(pMakeFolderResult => {
                    if(pMakeFolderResult.isSuccess){
                        s_wpSm.chown(s_remoteFolderPath,s_userInfo.USER_ID).then(async pChownFolderResult => {
                            if(pChownFolderResult.isSuccess){
                                
                                let s_wpSm = new WiseStorageManager({USER_NO:p_result.result.USER_NO});
                                
                                s_wpSm.onMakeDir(s_remoteDataPath,'755',true).then(pMakeFolderResult2 => {
                                    if(pMakeFolderResult2.isSuccess){
                                        res.json({ success: true, result: '등록 완료' });
                                    }else{
                                        next(pMakeFolderResult2.result);
                                    }
                                });
                            }else{
                                next(pChownFolderResult.result);
                            }
                        });
                        // res.json({ result: true, message: '등록 완료' });
                    }else{
                        next(pMakeFolderResult.result);
                    }
                });
            // local의 경우 기존과 동일
            }else{
                let s_remoteFolderPath = `/${p_result.result.USER_NO}/wp_dataset/removed/`;
        
                let s_wpSm = new WiseStorageManager({USER_NO:p_result.result.USER_NO, AppConfig: global.WiseAppConfig });
        
                s_wpSm.onMakeDir(s_remoteFolderPath,'755',true).then(pMakeFolderResult => {
                    if(pMakeFolderResult.isSuccess){
                        res.json({ success: true, result: '등록 완료' });
                    }else{
                        next(pMakeFolderResult.result);
                    }
                });
            }

        }
        else{
            next(p_result.result);
        }
    });
});

userRoute.post('/modifyUser',async(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let sFormData = s_body.formdata;    // new
    let sNodeInfo = s_body.nodeInfo;    // old
    let sDelYn = s_body.delYn;

    let s_userMng = new WpUserManager();   
    await s_userMng.connect();

    if (sDelYn) {
        s_userMng.delUser(sNodeInfo.user_id, sNodeInfo.group_id).then((p_result) => {
            if(p_result.isSuccess)
                res.json({ success: true, message: '삭제되었습니다.' });                
        }).catch((p_err) => {
            next(p_err);
        });
    } else {
        
        let s_updProfileCols = {
            USER_MODE: sFormData.user_mode,
        };

        let s_userInfo:DP_USER_MSTR_ATT = {
            USER_ID: sFormData.user_id,
            PASSWD: sFormData.password,
            GRP_ID: Number(sFormData.group_id),
            USER_NAME: sFormData.user_name,            
            REG_DATE:moment().format('YYYY-MM-DD HH:mm:ss')
        };

        s_userMng.modifyUser(sNodeInfo ,s_userInfo).then((p_userResult) => {
            s_userMng.updateUserProfile(s_updProfileCols,{ USER_NO: sNodeInfo.user_no }).then((p_profileResult) => {
                if(p_profileResult.isSuccess)
                    res.json({ success: true, result: '성공적으로 수정되었습니다.' });
                }).catch((p_err) => {
                    next(p_err);
                });
        }).catch((p_err) => {
            next(p_err);
        });
    }
});

userRoute.post('/changUserProfile',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {

    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_userMng = new WpUserManager();   
    let s_metaDb = global.WiseMetaDB;

    
    s_metaDb.select('DP_USER_PROFILE',[],{USER_NO:req.decodedUser.USER_NO}).then(p_userProfile=>{        

        if(p_userProfile.length == 0){
            let s_profile:DP_USER_PROFILE_ATT = {
                USER_NO: req.decodedUser.USER_NO,
                USER_MODE: 'USER',
                USER_INSTANCE: JSON.stringify({core:1,memory:'1GB',gpu:0,hdd:'10MB',LANG:'ko'}),
                USER_AUTH:JSON.stringify({tmppass: s_body.authNum, tutochk: 'N'}),
                FOLDER_PATH:JSON.stringify([{name:'데이터',isDirectory:true,items:[]}])
            };
    
            s_userMng.addUserProfile(s_profile).then(p_result=>{
                res.json(p_result);
            }).catch(p_error=>{
                next(p_error);
            });
        }
        else if(p_userProfile.length == 1){
            let s_profile:any = {};
     
            for(let s_key of Object.keys(s_body)){
                if (s_key != 'USER_NO'){
                    s_profile[s_key] = JSON.stringify(s_body[s_key]);
                }
            }
            
            s_userMng.updateUserProfile(s_profile,{USER_NO: req.decodedUser.USER_NO }).then(p_result=>{
                res.json(p_result);
            }).catch(p_error=>{
                next(p_error);
            });
        }
        else{
            next(new WpError({httpCode:WpHttpCode.USER_UNKWON_ERR,message:'중복 사용자가 있습니다.'}));
        }
    })
    
});

userRoute.post('/userInfo',(req: Request, res: Response,next:NextFunction) => {

    let s_metaDb = global.WiseMetaDB;
    let s_query = "SELECT B.USER_NO,B.USER_ID,A.USER_INSTANCE,A.USER_MODE,A.FOLDER_PATH,A.EXP_DT, A.PAY_ID, A.AWS_INFO FROM DP_USER_PROFILE A INNER JOIN DP_USER_MSTR B ON A.USER_NO = B.USER_NO WHERE B.USER_NO='" + req.decodedUser.USER_NO + "'";
    
    s_metaDb.query(s_query,'',{ type: QueryTypes.SELECT }).then(function (results) {   
        if(results.length == 0){
            res.json({ USER_INSTANCE: JSON.stringify({hdd:"10MB"}), USER_ID: '체험판' });
        }else{
            // #30
            let sTmpFileList = JSON.parse(results[0].FOLDER_PATH);
            let sTotalCnt = 0;
            let sTotalSize = 0;
            // let sChkResult:any = chkFileList(sTmpFileList,sTotalCnt,sTotalSize);
            let sAwsInfo = JSON.parse(results[0].AWS_INFO);
            if(sAwsInfo){
                let sRequireAwsInfo = ['category','expirationDate','expirationStatus'];
                sAwsInfo = Object.fromEntries(
                    Object.entries(sAwsInfo).filter(([key]) => sRequireAwsInfo.includes(key))
                );
            }
              
            let sResObj = { 
                USER_INSTANCE: results[0].USER_INSTANCE, 
                USER_ID: results[0].USER_ID,
                // id: decryptId(results[0].USER_ID, key, 'wise1012') ,
                USER_MODE:results[0].USER_MODE,
                USER_NO:results[0].USER_NO,
                FOLDER_PATH:results[0].FOLDER_PATH,
                EXP_DT:results[0].EXP_DT,
                PAY_ID:results[0].PAY_ID,
                AWS_INFO:sAwsInfo,
                // DATA_CNT: sChkResult.cnt,
                // DATA_SIZE: sChkResult.size
            };
            
            if(results[0].EXP_DT){                        
                var nowDate =  moment().tz("Asia/Seoul").format();
                console.log("nowDate", nowDate);
                let sDiffday = ( new Date(new Date(results[0].EXP_DT)).getTime() - new Date(new Date(nowDate)).getTime() ) / (1000 * 60 * 60 * 24);
                if(sDiffday < 1){                    
                    s_metaDb.select('DP_USER_PROFILE',[],{USER_NO:req.decodedUser.USER_NO}).then(function (pProfileResult:any) {    
                        let sInstance=JSON.parse(pProfileResult[0].USER_INSTANCE);
                        sInstance.hdd = '10MB';    
                        let sInst = JSON.stringify(sInstance);
                        s_metaDb.update('DP_USER_PROFILE',{ USER_INSTANCE: sInst },{ USER_NO: req.decodedUser.USER_NO }).then(function (pUserResult:any) {    
                            sResObj['USER_INSTANCE'] = sInst;
                            res.json(sResObj);
                        }).catch(function (err:any) {
                            if(err.original){
                                res.status(550).json({ success: false, message: err.message });                        
                            }else{
                                res.status(500).json({ success: false, message: err.message });
                            }
                        });
        
                    }).catch(function (err:any) {
                        if(err.original){
                            res.status(550).json({ success: false, message: err.message });                        
                        }else{
                            res.status(500).json({ success: false, message: err.message });
                        }
                    });
                }else{
                    res.json(sResObj);
                }
            }else{
                res.json(sResObj);
            }

        }

    }).catch(function (err) {
        if(err.original){
            res.status(550).json({ success: false, message: err.message });                        
        }else{
            res.status(500).json({ success: false, message: err.message });
        }
    });

});

userRoute.post('/getAuthUserList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_userMng = new WpUserManager();   

    s_userMng.getAuthUser(req.decodedUser.USER_NO).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});

userRoute.post('/getAuthGroupList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    

    let s_userMng = new WpUserManager();   

    s_userMng.getAuthGroup().then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
});
userRoute.post('/moveUser', async (req: Request, res: Response,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_groupId = s_body.groupId
    let s_userId = s_body.userInfo.user_id

    let s_userMng = new WpUserManager();   
    await s_userMng.connect();

    s_userMng.updateUserGroupId(s_groupId, s_userId ).then((p_profileResult) => {
        if(p_profileResult.isSuccess)
            res.json({ success: true, result: '성공적으로 수정되었습니다.' });
    }).catch((p_err) => {
        next(p_err);
    });
});

userRoute.post('/moveGroup', async(req: Request, res: Response,next:NextFunction)=>{
    console.log(req.body);
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }
    let s_groupId = s_body.groupId
    let s_parentGroupId = s_body.groupInfo.key

    let s_userMng = new WpUserManager();   
    await s_userMng.connect();

    s_userMng.updateGroupParent(s_parentGroupId, s_groupId).then((p_profileResult) => {
        if(p_profileResult.isSuccess)
            res.json({ success: true, result: '성공적으로 수정되었습니다.' });
    }).catch((p_err) => {
        next(p_err);
    });
});

userRoute.post('/getUserMode',(req: Request, res: Response<any>,next:NextFunction) => {
    let s_body = req.body;
    
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }          
    let s_metaDb = global.WiseMetaDB;     

    s_metaDb.select('DP_USER_PROFILE',['USER_MODE'],{USER_NO:s_body.id}).then(function (pResult:any) {   
        console.log(pResult)
        res.json(pResult);
    }).catch(function (err:any) {
        if(err.original){
            res.status(550).json({ success: false, message: err.message });                        
        }else{
            res.status(500).json({ success: false, message: err.message });
        }
    });  
});

userRoute.post('/modPwd', function (req: Request, res: Response<any>,next:NextFunction) {

    const body = req.body;
    const encId = body.auth.username
    let s_metaDb = global.WiseMetaDB;     


    s_metaDb.select('DP_USER_MSTR', [],{ DEL_YN:'E',USER_ID:encId}).then(function (results) {
        const user_no= results[0]["USER_NO"]

        s_metaDb.update('DP_USER_MSTR', { DEL_YN: "N", PASSWD:body.pwdNum.newPwd},{USER_NO: user_no})
        .then(function (insertMode) {
            res.json({ result: true, message: '등록 완료' });
        }).catch(function (err) {
            if(err.original){
                res.status(550).json({ success: false, message: err.message });                        
            }else{
                res.status(500).json({ success: false, message: err.message });
            }
            // next(1001);
        });
    })
});