import { Transaction } from "sequelize";
import { WpError, WpHttpCode } from "../../exception/WpError";
import { DP_GRP_MSTR_ATT } from "../../metadb/model/DP_GRP_MSTR";
import { DP_USER_MSTR_ATT } from "../../metadb/model/DP_USER_MSTR";
import { DP_USER_PROFILE, DP_USER_PROFILE_ATT } from "../../metadb/model/DP_USER_PROFILE";
import { WP_META_DB } from "../../wp-type/WP_META_DB";
import logger from "../logger/logger";
import { WpLdapClient } from "./ldap-mng";
import { WpSparkApiManager } from "../spark-api/spark-api-mng";
/**
 * 플랫폼에 등록된 유저를 관리하는 클래스
 * 
 * {@link WpLdapClient | WpLdapClient}를 통해 LDAP과 유저를 동기화한다.
 * 
 * LDAP을 통해 타 시스템과 플랫폼 유저를 동기화 할 수 있다.
 * 
 * @example
 * ```ts
 *  let o_ldapClient = new WpLdapClient(WP_CONFIG);
 *  o_ldapClient.delGroup();
 * ```
 */

export class WpUserManager {

    o_client: WP_META_DB;
    o_ldapClient: WpLdapClient | undefined;
    // o_ldapStatus:boolean = true;
    constructor(p_MetaConn?: WP_META_DB) {
        if (typeof p_MetaConn == 'undefined')
            this.o_client = global.WiseMetaDB;
        else
            this.o_client = p_MetaConn;

        this.o_ldapClient = new WpLdapClient(global.WiseAppConfig);
    }

    async connect() {
        try {
            await this.o_ldapClient.connect();
        } catch (error) {
            console.log(error);
        }
    }

    onUsertoGroup(p_type: string, p_groupId: string, p_id: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_USER_MSTR', { GROUP_ID: p_groupId }, { USER_ID: p_id });

                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.onUsertoGroup('', p_groupId, p_id).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        resolve({ isSuccess: false, result: p_error });
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (p_error) {
                reject(p_error);
            }
        });
    }
    modifyGroup(p_id: string, p_groupNm: string, p_groupDesc?: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_updateGrp = {
                    GROUP_NAME: p_groupNm,
                    GROUP_DESC: ''
                };

                if (typeof p_groupDesc != 'undefined')
                    s_updateGrp['GROUP_DESC'] = p_groupDesc;

                let sReVal = await this.o_client.update('DP_GRP_MSTR', s_updateGrp, { GROUP_ID: p_id });

                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.modifyGroup(p_id, p_groupNm, s_updateGrp.GROUP_DESC).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        reject(p_error);
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    getGroup(p_grpInfo?: DP_GRP_MSTR_ATT) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.select('DP_GRP_MSTR', [], {});
                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
    addGroup(p_grpInfo: DP_GRP_MSTR_ATT) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.insert('DP_GRP_MSTR', p_grpInfo, false);

                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.addGroup(String(sReVal.GROUP_ID), p_grpInfo.GROUP_NAME, p_grpInfo.GROUP_DESC).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        reject(p_error);
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    delGroup(p_id: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_GRP_MSTR', { DEL_YN: 'Y' }, { GROUP_ID: p_id });
                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.delGroup(p_id).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        resolve({ isSuccess: false, result: p_error });
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    delUser(p_userId: string, p_groupId: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_USER_MSTR', { DEL_YN: 'Y' }, { USER_ID: p_userId });
                if (this.o_ldapClient.o_ldapStatus) {
                    let s_groupId = p_groupId ? p_groupId : '1000';
                    this.o_ldapClient?.delUser(p_userId, s_groupId).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        reject({ isSuccess: false, result: p_error });
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    modifyUser(p_oldUserData: any, p_newUserData: DP_USER_MSTR_ATT) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                // let sReVal = await this.o_client.update('DP_USER_MSTR',p_newUserData,{USER_ID:p_oldUserData.user_id});
                let sReVal = await this.o_client.update('DP_USER_MSTR', p_newUserData, { USER_NO: p_oldUserData.user_no });

                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.modifyUser(p_oldUserData, p_newUserData).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        resolve({ isSuccess: false, result: p_error });
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    addUser(p_userData: DP_USER_MSTR_ATT) {

        return new Promise<WiseReturn>(async (resolve, reject) => {
            // try {
            this.o_client.getConnection().transaction(async (pT: Transaction) => {

                let sReVal = await this.o_client.insert('DP_USER_MSTR', p_userData, false, pT);

                if (this.o_ldapClient.o_ldapStatus) {
                    p_userData.USER_NO = sReVal.USER_NO;
                    let sLdapResult = await this.o_ldapClient?.addUser(p_userData);
                    // 241028 철도&식약처 개발서버 설치시  WiseAppConfig.HIVE_DB.use 값 false처리
                    if (global.WiseAppConfig.API_TYPE == 'SPARK' && (global.WiseAppConfig.HIVE_DB.use !== undefined && global.WiseAppConfig.HIVE_DB.use  )) {
                        // 계정 생성시에 hive 데이터베이스까지 생성 ( {유저번호}_db )
                        let s_param = {
                            "groupId": "hive1",
                            "action": "hive",
                            "method": "QUERY",
                            "jobId": 1,
                            "userno": 1000,
                            "usermode": "ADMIN",
                            "userid": "administrator",
                            "location": "user manager",
                            "data": {
                                "dataArray": [{ "query": `create database ${p_userData.USER_NO}_db` }]
                            }
                        }
                        let s_option = {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(s_param)
                        };
                        let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
                        let s_createHiveDb = await s_sparkApiMng.onCallApi('/job', s_option.body, s_option.headers)
                    }

                    return sReVal;
                }
                else {
                    return sReVal;
                }

            }).then(p_result => {
                resolve({ isSuccess: true, result: p_result });
            })
                .catch(p_error => {
                    resolve({ isSuccess: false, result: p_error });
                });
            // } catch (error) {
            //     reject(error);
            // }
        });
    }
    
    getErrorCode(p_type: string, p_err: any) {
        let s_reVal: WpHttpCode = 500;

        if (p_type == 'user') {

        }
        else if (p_type == 'group') {

        }
        else {
            s_reVal = WpHttpCode.LDAP_USER_ERR;
        }

        return s_reVal;
    }
    onSearch(p_type: string, p_search: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal;
                if (p_type == 'USER_NO') {
                    sReVal = await this.o_client.select('DP_USER_MSTR', [], { USER_NO: p_search });
                } else {
                    sReVal = await this.o_client.select('DP_USER_MSTR', [], { USER_ID: p_search });
                }
                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
    getUser(p_userMode: string, p_userId?: string, p_userNo?: string, p_userNm?: string, p_passwd?: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_query = `SELECT A.*,B.* , C.APP_SVC_URL,D.PLATFORM_ID,C.APP_SVC_IP,C.APP_SVC_PORT
                                FROM DP_USER_MSTR A 
                                INNER JOIN DP_USER_PROFILE B ON A.USER_NO = B.USER_NO 
                                LEFT OUTER JOIN SERVER_APP_INFO C ON B.APP_NO = C.APP_NO
                                LEFT OUTER JOIN SERVER_INFO D ON C.SERVER_ID = D.SERVER_ID 
                                WHERE (A.DEL_YN='N' OR A.DEL_YN='E') 
                                ${p_userMode == 'ADMIN' ? `AND B.USER_MODE != 'ADMIN' ` : ''}
                                ${typeof p_userId != 'undefined' ? `AND A.USER_ID = '${p_userId}' ` : ''}
                                ${typeof p_userNo != 'undefined' ? `AND A.USER_NO = ${p_userNo} ` : ''}
                                ${typeof p_userNm != 'undefined' ? `AND A.USER_NAME = '${p_userNm}' ` : ''}
                                ${typeof p_passwd != 'undefined' ? `AND A.PASSWD = '${p_passwd}' ` : ''}
                                `;

                let sReVal = await this.o_client.query(s_query, 'DP_USER_MSTR');

                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
    getUserProfile(p_where: {}) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.select('DP_USER_PROFILE', [], p_where);
                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
    addUserProfile(p_profile: DP_USER_PROFILE_ATT) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.insert('DP_USER_PROFILE', p_profile, false);
                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
    updateUserProfile(p_profile: DP_USER_PROFILE_ATT, p_where: any) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_USER_PROFILE', p_profile, p_where);
                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    
    }
    updateUserGroupId(p_groupId: string, p_id: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_USER_MSTR', { GRP_ID: p_groupId }, { USER_ID: p_id });

                if (this.o_ldapClient.o_ldapStatus) {
                    this.o_ldapClient?.onUsertoGroup('', p_groupId, p_id).then(p_ldapReVal => {
                        logger.info(p_ldapReVal);
                        resolve({ isSuccess: true, result: sReVal });
                    }).catch(p_error => {
                        logger.error(p_error);
                        resolve({ isSuccess: false, result: p_error });
                    });
                }
                else {
                    resolve({ isSuccess: true, result: sReVal });
                }
            } catch (p_error) {
                reject(p_error);
            }
        });
    }
    updateGroupParent(p_groupId: string, p_parentGroupId: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let sReVal = await this.o_client.update('DP_GRP_MSTR', { P_GROUP_ID: p_parentGroupId }, { GROUP_ID: p_groupId });     
                resolve({ isSuccess: true, result: sReVal });
            } catch (p_error) {
                reject(p_error);
            }
        });
    }

    getAuthUser(p_userNo: number) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_query = `SELECT A.*,B.* 
                                FROM DP_USER_MSTR A 
                                INNER JOIN DP_USER_PROFILE B ON A.USER_NO = B.USER_NO 
                                WHERE A.DEL_YN='N' AND A.USER_NO != ${p_userNo}
                                `;

                let sReVal = await this.o_client.query(s_query, 'DP_USER_MSTR');

                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }

    getAuthGroup() {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_query = `SELECT * FROM DP_GRP_MSTR WHERE DEL_YN ='N'
                                `;

                let sReVal = await this.o_client.query(s_query, 'DP_GRP_MSTR');

                resolve({ isSuccess: true, result: sReVal });
            } catch (error) {
                reject(error);
            }
        });
    }
}