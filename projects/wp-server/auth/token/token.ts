
import * as jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import  * as CryptoJS from "crypto-js";
import { WpError, WpHttpCode } from '../../exception/WpError';
import { WP_SESSION_USER } from '../../wp-type/WP_SESSION_USER';
// JWT 토큰 생성
export const createToken = (payload:object) => {
  const jwtOption:SignOptions = { expiresIn: '7d' };

  return new Promise((resolve, reject) => {
    jwt.sign(payload, 'wise1012', jwtOption, (error, token:any) => {
      if (error) reject({status:401,instance:error});
      resolve(CryptoJS.AES.encrypt(token, 'wise1012').toString());
    });
  });
};

export const createTempToken = (payload:object)  => {
  const jwtOption:SignOptions = { expiresIn: '1h' };

  return new Promise((resolve, reject) => {
    jwt.sign(payload, 'wise1012', jwtOption, (error, token:any) => {
      if (error) reject({status:401,instance:error});
      console.log(token);
      resolve(CryptoJS.AES.encrypt(token, 'wise1012').toString());
    });
  });
};
export const createUploadToken = (payload:object) => {
  const jwtOption:SignOptions = { expiresIn: '9999 years' };

  return new Promise((resolve, reject) => {
    jwt.sign(payload, 'wise1012', jwtOption, (error, token:any) => {
      if (error) reject({status:401,instance:error});
      console.log(token);
      resolve(CryptoJS.AES.encrypt(token, 'wise1012').toString());
    });
  });
};

// JWT 토큰 검증
export const verifyToken = (token:any)  => {
  return new Promise<WP_SESSION_USER>((resolve, reject) => {
    try {
      if(typeof token == 'object'){
        if(token.name == 'wiseitech')
        {
          let s_User:WP_SESSION_USER = {
            USER_NO:token.userNo
          };

          resolve(s_User);
        }
      }
      else{
        let chiperByte = CryptoJS.AES.decrypt(token, 'wise1012');
        token = chiperByte.toString(CryptoJS.enc.Utf8);
        token = token.replace('Bearer ','');
        jwt.verify(token, 'wise1012', (error:any, decoded:any) => {
          if (error) {
            // WPLAT-34 토큰 만료시 만료된 USER_NO 보내기 위해서 추가
            let sUserNo;
            try {
              let sBase64Payload = token.split('.')[1]; //value 0 -> header, 1 -> payload, 2 -> VERIFY SIGNATURE
              let sPayload = Buffer.from(sBase64Payload, 'base64');
              sUserNo = JSON.parse(sPayload.toString())['USER_NO'];
            } catch (pErr) {
              console.log(pErr);
            }
            if (sUserNo) {
              error['USER_NO'] = sUserNo;
            }
            reject(new WpError({
              httpCode: WpHttpCode.UNAUTHORIZED,
              message: error,
            }));
          } else {
            resolve((decoded as WP_SESSION_USER));
          }
        });
      }
      
    } catch (error1:any) {
      reject(new WpError({
        httpCode: WpHttpCode.UNAUTHORIZED,
        message: error1,
      }));
    }    
  });
};


// ID 암호화
export const encryptId = function (pId:string, pKey:string, pIv:string) {
  var key = CryptoJS.enc.Utf8.parse(pKey);
  var iv = CryptoJS.enc.Utf8.parse(pIv);
  let sEncrypChk = false;
  let sText = '';

  if(sEncrypChk)
    sText = CryptoJS.AES.encrypt(pId, key, { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.ZeroPadding}).toString()
  else
    sText = pId;
  return sText;
}


// ID 복호화
export const decryptId = function(pId:string, pKey:string, pIv:string) {
  let sEncrypChk = false;
  let sText = '';

  if(sEncrypChk){
    var key = CryptoJS.enc.Utf8.parse(pKey);
    var iv = CryptoJS.enc.Utf8.parse(pIv);
    var decrypted = CryptoJS.AES.decrypt(pId, key, {iv: iv, padding: CryptoJS.pad.ZeroPadding});
    sText = decrypted.toString(CryptoJS.enc.Utf8);
  }
  else{
    sText = pId;
  }
  
  return sText;
}

// key 암호화
export const encryptKey = function() {
  return (CryptoJS.HmacSHA1('wise1012', 'wise1012')).toString();
}