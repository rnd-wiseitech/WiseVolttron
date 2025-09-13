import { WiseAppConfig } from "../appConfig";

var o_appconfig = new WiseAppConfig();
export class WiseDefaultStorage {
    constructor(){       
    }


    async init() {
        let s_dsId = o_appconfig.getConfigValue('DS_ID');
        let s_dsInfo = await global.WiseMetaDB.select('DS_MSTR',[], { DS_ID: s_dsId });
        let s_wiseStorage:any = {}
        let s_config = {
            user:s_dsInfo[0].USER_ID,
            password:s_dsInfo[0].PASSWD,
            host:s_dsInfo[0].IP,
            port:s_dsInfo[0].PORT,
        }

        s_wiseStorage['CONFIG'] = s_config
        s_wiseStorage['DEFAULT_PATH'] = s_dsInfo[0].DEFAULT_PATH
        if(s_dsInfo[0].TYPE =='hdfs') {
            s_wiseStorage.STORAGE_TYPE = 'HDFS'
        } else if(s_dsInfo[0].TYPE =='local') {
            s_wiseStorage.STORAGE_TYPE = 'LOCAL'
        }else if(s_dsInfo[0].TYPE =='object') {
            s_wiseStorage.STORAGE_TYPE = 'object'
        };

        return s_wiseStorage
    }
}