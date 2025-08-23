import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as Crypto from 'crypto-js';
import * as sha512 from 'js-sha512';
import { WpAppConfig } from '../../wp-lib-config/wp-lib-config';
@Injectable()
export class CryptoService {
  
  TOKEN_NAME = 'currentUser';
  
  constructor(private http: HttpClient,
    private cAppConfig:  WpAppConfig) {
    
  }
  encrypt(pPlanText:any){
    return Crypto.AES.encrypt(pPlanText, 'wise1012');  
  }
  decrypt(pChiperText:any){
    let bytes  = Crypto.AES.decrypt(pChiperText.toString(), 'wise1012');
    return bytes.toString(Crypto.enc.Utf8);
  }

  encryptPwd(pPlanText:any) {
    let sPlanText = '';
    let sType = this.cAppConfig.getConfig('CRYPTO_TYPE');
    let salt = "wiseitech";
    if(sType == 'SHA512'){      
      sPlanText = sha512.sha512(pPlanText + salt); 
    }
    else{
      sPlanText = (Crypto.HmacSHA1(pPlanText, 'wise1012')).toString();
    }
    
    return sPlanText;  
  }

  
}