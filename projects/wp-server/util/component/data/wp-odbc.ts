import { DS_MSTR_ATT } from "../../../metadb/model/DS_MSTR";
import { COM_ODBC_ATT, COM_OODBC_ATT } from "../../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../../wp-type/WP_SESSION_USER";
import { WpComponentProperty } from "../component";
import moment from 'moment';

/**
 * WorkFlow에서 사용하는 컴포넌트
 * 데이터베이스를 통해 폴더 및 파일을 입력데이터로 사용할 때 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpOdbcData extends WpComponentProperty {
    constructor(p_data:COM_ODBC_ATT) {
        // dbOpt?: 'odbc' | 'hive';
        let s_method = 'I-DATABASE'
        super('/job', p_data, 'input', s_method);       
    }
    hasEmptyValue() {
        if (super.isEmpty(this.o_data.dbname) || (super.isEmpty(this.o_data.tablename) && super.isEmpty(this.o_data.query)) ) {
            return true;
        }
        return false;
    }
    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: any) {
        
        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data : {
                dbtype: this.o_data.dbtype,
                dbhost: this.o_data.dbhost,
                dbport: this.o_data.dbport,
                dbname: this.o_data.dbname,
                owner: this.o_data.owner,
                tablename: this.o_data.tablename,
                query: this.o_data.query,
                dbuser: '',
                dbpassword: '',
                type: this.o_data.selectOpt
            }
        };

        if (this.o_method == 'I-DATABASE') {
            sParam.data.dbuser = p_data.connInfo[0].USER_ID;
            sParam.data.dbpassword = p_data.connInfo[0].PASSWD;
        }

        return sParam;
    }
}
/**
 * WorkFlow에서 사용하는 컴포넌트
 * 데이터베이스를 통해 폴더 및 파일을 출력데이터로 사용할 때 정의
 * 
 * @example
  * ```ts
    * // 이곳에 예제를 작성하시오.    
    * ```
 */
export class WpOOdbcData extends WpComponentProperty {
    constructor(p_data:COM_OODBC_ATT) {
        super('/job', p_data, 'output', 'O-DATABASE');       
    }
    hasEmptyValue() {
        if (this.o_data.dbOpt == 'HIVE') {
            return false;
        }
        if (super.isEmpty(this.o_data.dbOpt) || super.isEmpty(this.o_data.dbname) || super.isEmpty(this.o_data.tablename)) {
            return true;
        }
        return false;
    }

    getSparkParams(p_userInfo: WP_SESSION_USER, p_groupId: string, p_jobId: string, p_parentId: string[], p_data: { user_param: any, connInfo: DS_MSTR_ATT[], filter?:'true'|'false' }) {

        let sParam: any = {
            action: this.o_action,
            method: this.o_method,
            jobId: p_jobId,
            data: {
                usetable: p_userInfo.USER_NO + '_' + p_groupId + '_' + p_parentId[0],
                dbtype: this.o_data.dbtype,
                dbhost: this.o_data.dbhost,
                dbport: this.o_data.dbport,
                dbname: this.o_data.dbname,
                tablename: this.o_data.tablename,
                mode: this.o_data.mode,
                owner: this.o_data.owner,
                dbuser: '',
                dbpassword: ''
            }
        };

        if (this.o_data.dbOpt == 'DBMS') {
            sParam.data.dbuser = p_data.connInfo[0].USER_ID;
            sParam.data.dbpassword = p_data.connInfo[0].PASSWD;
            if (!sParam.data.owner){
                sParam.data.owner = '';
            }
        } 
        

        if (this.o_data.partition.trim() != '' && this.o_data.partition !== '(선택안함)') {
            sParam.data['partition'] = this.o_data.partition;
            // 날짜 표현식인 경우에는 오늘 날짜 값으로 변경해야 함.
            sParam.data['partitionValue'] = this.o_data.partitionOpt == '날짜표현식' ? moment().format(this.o_data.partitionValue) : this.o_data.partitionValue;

            let s_userParam: any = {};
            // 사용자 파라미터가 있는지 체크할 입력값 (단일값 체크)
            let s_checkValue = sParam.data['partitionValue'];
            let sMatchValueList = s_checkValue.match(/@[0-9a-zA-Zㄱ-힣_]*/g);
            if (sMatchValueList) {
                sMatchValueList.forEach((s_match: string) => {
                    let s_param: any = p_data['user_param'].find((s_param: any) => s_param.PARAM_NM == s_match);
                    s_userParam[s_param['PARAM_NM']] = { value: JSON.parse(s_param['PARAM_VALUE']), format: JSON.parse(s_param['PARAM_FORMAT']) };
                })
                if (Object.values(s_userParam).length > 0) {
                    sParam['data']['user_param'] = s_userParam;
                } 
            }
        }

        if (p_data.filter) {
            sParam.data.usetable = sParam.data.usetable + '_' + p_data.filter[0].split("_")[0];
        }

        // OUTPUT query 사용
        if ((this.o_data.mode || '').trim() === 'query') {
            sParam.data.query = this.o_data.query;
        }
        
        return sParam;
    }
}