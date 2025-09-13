import * as ldapjs from "ldapjs";
import { WpError, WpHttpCode } from "../../exception/WpError";
import { DP_USER_MSTR_ATT } from "../../metadb/model/DP_USER_MSTR";
import { WP_CONFIG } from "../../wp-type/WP_CONN_ATT";
/**
 * 플랫폼에 구축된 LDAP을 관리하는 클래스
 * 
 * assets에  config 파일에 작성된 접속정보를 통해 LDAP 접근한다.
 * 
 * @example
 * ```ts
 *  let o_ldapClient = new WpLdapClient(WP_CONFIG);
 *  o_ldapClient.delGroup();
 * ```
 */
export class WpLdapClient {
    o_config:WP_CONFIG;
    o_client:ldapjs.Client;
    o_ldapStatus:boolean = true;
    constructor(p_config:WP_CONFIG) {
        this.o_config = p_config;
      
  
    }   
    createLdapClient() {
      return new Promise((resolve, reject) => {
        const client = ldapjs.createClient({
          url: [`ldap://${this.o_config.LDAP.host}:${this.o_config.LDAP.port}`],
        });  

        client.on('connect', () => resolve(client));  

        client.on('error', (err) => reject(err));
      });
    }
  
    bindLdapClient() {
      return new Promise((resolve, reject) => {
        this.o_client.bind('cn=admin,dc=app,dc=wise', 'wise1012', (err) => {
          if(err){
            this.o_ldapStatus = false;
            resolve(false);
            // reject(err);
          }else{
            this.o_ldapStatus = true;
            resolve(true);
          }    
        });  
      });
    }
    async connect(){
      try{
        if(this.o_config.CLOUD || (this.o_config.LDAP.use === undefined || !this.o_config.LDAP.use )){  // aws-market일 경우나 LDAP 사용 여부 설정 안하면 ldap 사용안함.
          this.o_ldapStatus = false;
        }else{
          let client:any = await this.createLdapClient();  
          this.o_client = client;
          await this.bindLdapClient();
        }
      }catch(err){
        this.o_ldapStatus = false;
      }
    }

    onUsertoGroup(p_type:string,p_groupId:string,p_id?:string){
      return new Promise<WiseReturn>((resolve, reject) => {
          let change = new ldapjs.Change({
            operation: p_type,
            modification: {
              memberuid: [p_id]
            }
          });
          this.o_client.modify(`gidNumber=${p_groupId},ou=Group,dc=app,dc=wise`, change, (p_err) => {
            if(p_err){
              if(p_err.code == 20){
                console.log('이미 그룹에 등록된 유저 입니다');
                resolve({isSuccess:true,result:'already Registared'});
              }                
              else if(p_err.code == 32)
                resolve({isSuccess:false,result:WpHttpCode.LDAP_GRP_ERR});
              else
                // reject(new WpError({httpCode:this.getErrorCode('group',p_err),message:p_err}));
                resolve({isSuccess:false,result:this.getErrorCode('group',p_err)})
            }
            else{
                resolve({isSuccess:true,result:''});
            }
          });
      });
    }
    
    modifyGroup(p_id:string,p_groupNm:string,p_groupDesc?:string){      
      return new Promise<WiseReturn>((resolve, reject) => {
        // 변경시 modification 한개씩 가능
        const change = new ldapjs.Change({
          operation: 'replace',
          modification: {
            cn:p_groupNm,
            // description:p_groupDesc
          }
        });

        this.o_client.modify(`gidNumber=${p_id},ou=Group,dc=app,dc=wise`, change, (p_err) => {
          if(p_err){
            console.log(p_err)
              // reject(new WpError({httpCode:this.getErrorCode('group',p_err),message:p_err.message}));
              resolve({isSuccess:false,result:this.getErrorCode('group',p_err)})
          }
          else{
            resolve({isSuccess:true,result:''});
          }
        });
      }); 
    }
    addGroup(p_id:string,p_groupNm?:string,p_groupDesc?:string){
      
      return new Promise<WiseReturn>((resolve, reject) => {

        let entry = {
          cn: p_groupNm,
          gidNumber: p_id,
          // description: p_groupDesc,
          objectclass: ['top','posixGroup']
        };
        
        this.o_client.add(`gidNumber=${p_id},ou=Group,dc=app,dc=wise`, entry,(p_err)=>{        
          if(p_err){
            if(p_err.code == 68)
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('group',p_err),message:'이미 등록된 그룹 입니다.'}});
            else
              // reject(new WpError({httpCode:this.getErrorCode('group',p_err),message:p_err.message}));
              resolve({isSuccess:false,result:this.getErrorCode('group',p_err)})
          }
          else{
            resolve({isSuccess:true,result:''});
          }
            
        });
      }); 
      
        //   console.log(sAddLog);
    }
    delGroup(p_id:string){
      return new Promise<WiseReturn>((resolve, reject) => {
        this.o_client.del(`gidNumber=${p_id},ou=Group,dc=app,dc=wise`,(p_err)=>{          
          if(p_err){
            if(p_err.code == 32)
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('group',p_err),message:'그룹이 없습니다.'}});
            else
              // reject(new WpError({httpCode:this.getErrorCode('group',p_err),message:p_err.message})); 
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('group',p_err),message:p_err.message}});
          }
          else
            resolve({isSuccess:true,result:''});
        });
      }); 
      
        //   console.log(sAddLog);
    }
    delUser(p_userId:string, p_groupId:string){
      return new Promise<WiseReturn>((resolve, reject) => {              
        let change = new ldapjs.Change({
            operation: 'delete',
            modification: {
              memberuid: [p_userId]
            }
        });

        this.o_client.modify(`gidNumber=${p_groupId},ou=Group,dc=app,dc=wise`, change, (p_err)=>{
          if(p_err){
              // reject(new WpError({httpCode:this.getErrorCode('user',p_err),message:p_err.message})); 
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:p_err.message}});
          }else{

            this.o_client.del(`uid=${p_userId},ou=User,dc=app,dc=wise`,(p_err)=>{
              if(p_err){
                if(p_err.code == 32)
                  resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:'유저가 없습니다.'}});
                else
                  // reject(new WpError({httpCode:this.getErrorCode('user',p_err),message:p_err.message})); 
                  resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:p_err.message}});
              }else{
                resolve({isSuccess:true,result:''});
              }
            });

          }
        });

      });
    }
    test(){

      return new Promise((resolve, reject) => {

        this.o_client.bind('cn=admin,dc=app,dc=wise', 'wise1012', (err) => {
          console.log(err);
          let change = new ldapjs.Change({
            operation: 'replace',
            modification: {
              memberuid: ['administrator']
            }
          });
          this.o_client.modify('gidNumber=테스트그룹,ou=Group,dc=app,dc=wise', change, (err) => {
            console.log(err);
          });
        });
      });
    }
    modifyUser(p_oldUserData:any,p_newUserData:DP_USER_MSTR_ATT){

      return new Promise<WiseReturn>((resolve, reject) => {
        this.delUser(p_oldUserData.user_id, String(p_oldUserData.group_id)).then(p_result=>{
          if(p_result.isSuccess){
            p_newUserData.USER_NO = p_oldUserData.user_no;
            this.addUser(p_newUserData).then(p_addResult=>{     
              resolve({isSuccess:true,result:''});
            }).catch(pErr=>{
              resolve({isSuccess:false,result:{message:pErr}});
              // reject(pErr);
            })              
          }
          else{
            resolve(p_result);
          }          
        }).catch(pErr=>{
          resolve({isSuccess:false,result:{message:pErr}});
          // reject(pErr);
        })
      });
    }
    addUser(p_userData:DP_USER_MSTR_ATT){

      return new Promise<WiseReturn>((resolve, reject) => {

        let entry1={
          cn: p_userData.USER_ID,
          givenName: p_userData.USER_NAME? p_userData.USER_NAME:p_userData.USER_ID,
          sn: p_userData.USER_NAME? p_userData.USER_NAME:p_userData.USER_ID,
          uid: p_userData.USER_ID,
          uidNumber: p_userData.USER_NO,
          gidNumber: p_userData.GRP_ID? p_userData.GRP_ID:1, // default value 필요, 없으면 1로 지정해서 아예 그룹을 안잡음
          homeDirectory: `/home/${p_userData.USER_ID}`,
          loginShell: '/bin/bash',
          mail: p_userData.EMAIL? p_userData.EMAIL:``,
          userPassword: p_userData.PASSWD,
          objectclass: ['top','inetOrgPerson','posixAccount','shadowAccount'],
        };
        this.o_client.add(`uid=${p_userData.USER_ID},ou=User,dc=app,dc=wise`, entry1,(p_err)=>{          
          if(p_err){
            if(p_err.code == 68)
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:'이미 등록된 유저 입니다.'}});
            else if(p_err.code == 21){
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:'아이디로 사용할 수 없는 문자가 있습니다.'}});
            }
            else{
              // reject(new WpError({httpCode:this.getErrorCode('user',p_err),message:p_err}));
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_err),message:p_err}})
            }
          }
          else{
            this.onUsertoGroup('add',String(entry1.gidNumber),p_userData.USER_ID).then(pResult=>{
              if(!pResult.isSuccess)
                console.log('그룹이 없습니다.');

              resolve({isSuccess:true,result:{userNo:p_userData.USER_NO}});
            }).catch(p_error=>{
              resolve({isSuccess:false,result:{httpCode:this.getErrorCode('user',p_error),message:p_error}})
              // reject(new WpError({httpCode:this.getErrorCode('user',p_err),message:p_error}));
            });
          }
        });
      });
    }
    getErrorCode(p_type:string, p_err:any){
      let s_reVal: WpHttpCode;

      if(p_type == 'user'){
        if (p_err instanceof ldapjs.NoSuchObjectError)
          s_reVal = WpHttpCode.LDAP_USER_NOT_FOUND;
        else if(p_err instanceof ldapjs.EntryAlreadyExistsError)
          s_reVal = WpHttpCode.LDAP_USER_EXIST;
        else
          s_reVal = WpHttpCode.LDAP_USER_ERR;
      }
      else if(p_type == 'group'){
        if (p_err instanceof ldapjs.NoSuchObjectError)
          s_reVal = WpHttpCode.LDAP_GRP_NOT_FOUND;
        else if(p_err instanceof ldapjs.EntryAlreadyExistsError)
          s_reVal = WpHttpCode.LDAP_GRP_EXIST;
        else
          s_reVal = WpHttpCode.LDAP_USER_ERR;
      }
      else{
        s_reVal = WpHttpCode.LDAP_USER_ERR;
      }

      return s_reVal;
    }
    onSearch(p_type:string,p_search:string){
      let s_option:ldapjs.SearchOptions = {
        filter: '(objectClass=*)',
      scope: 'sub',
      attributes: ['sn','cn']
      };

      return new Promise<WiseReturn>((resolve, reject) => {
        let sUserInfo:WiseReturn = {isSuccess:true,result:[]};
        this.o_client.search(`uid=${p_search},ou=${p_type},dc=app,dc=wise`,s_option, (err, res) => {
          res.on('searchEntry', (entry:any) => {
            sUserInfo.result.push(entry.objectName);
          });
          res.on('error', (err) => {
            console.error('error: ' + err.message);

            let sCode:WpHttpCode;

            if(err.code == 32)
            {
              sCode = WpHttpCode.LDAP_USER_NOT_FOUND;
              resolve(sUserInfo);
            }              
            else{
              sCode = WpHttpCode.LDAP_USER_ERR;
              resolve({isSuccess:false,result:{httpCode:sCode,message:err}})
              // reject(new WpError({httpCode:sCode,message:err}));
            }
          });
          res.on('end', (result:any) => {
            console.log('status: ' + result.status);
            resolve(sUserInfo);
          });
        });
      });
    }
}