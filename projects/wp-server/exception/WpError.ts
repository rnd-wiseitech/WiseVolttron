import { DatabaseError } from "sequelize";
import logger from "../util/logger/logger";

export enum WpHttpCode {
    OK = 200,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    META_DB_ERROR = 301,
    META_DB_SELECT = 310,
    META_DB_INSERT = 320,
    META_DB_UPDATE = 330,
    META_DB_DELETE = 340,
    META_DB_QUERY = 350,

    PY_API_UNKOWN_ERR = 500,
    KAFKA_API_UNKOWN_ERR = 550,
    PROMETHEUS_API_UNKOWN_ERR = 560,
    KUBER_UNKOWN_ERR = 590,
    SERVER_UNKOWN_ERR = 580,
    
    ANALYTIC_UNKOWN_ERR = 600,
    ANALYTIC_MODEL_ERR = 610,
    IMAGE_TRANS_ERR = 662,


    
    BATCH_UNKOWN_ERR = 900,
    WINLOG_INTER_ERR = 910,

    STORAGE_COMMON_ERR = 700,
    HADOOP_CONN_ERR = 710,
    HADOOP_DIR_ERR = 711,
    HADOOP_DATA_ERR = 712,
    LOCAL_CONN_ERR = 720,
    LOCAL_DIR_ERR = 721,
    LOCAL_DATA_ERR = 722,
    OBJECT_CONN_ERR = 730,
    OBJECT_DIR_ERR = 731,
    OBJECT_DATA_ERR = 732,
    FTP_CONN_ERR = 780,
    FTP_DIR_ERR = 781,
    FTP_DATA_ERR = 782,
    SFTP_CONN_ERR = 783,
    SFTP_DIR_ERR = 784,
    SFTP_DATA_ERR = 785,
    LDAP_CONN_ERR = 790,
    LDAP_UNKWON_ERR = 791,
    LDAP_USER_ERR = 792,
    LDAP_USER_NOT_FOUND = 793,
    LDAP_USER_EXIST = 794,
    LDAP_GRP_ERR = 795,
    LDAP_GRP_EXIST = 796,
    LDAP_GRP_NOT_FOUND = 797,

    USER_UNKWON_ERR = 801,
    WISE_USER_ERR = 810,
    WISE_USER_NOT_FOUND = 813,
    WISE_USER_EXIST = 818,
    WISE_GRP_ERR = 820,
    WISE_GRP_EXIST = 828,
    WISE_GRP_NOT_FOUND = 823,
    WISE_BACTH_UNKWON_ERROR = 830,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500,
}

export interface WpErrorArgs {
    name?: string;
    httpCode: WpHttpCode;
    message: any;
    isOperational?: boolean;
}
  
export class WpError extends Error {
    public override readonly name: string;
    public readonly httpCode: WpHttpCode;
    public readonly isOperational: boolean = true;
    public override readonly message: string = '';
    public readonly sql: string = '';

    constructor(args: WpErrorArgs) {
        
        let s_message = '';
        logger.error(args.message);
        
        if (args.message instanceof Error)
        {
            for(let s_keyNm of Object.keys(args.message))
            {
                if(s_keyNm == 'original'){
                    let s_tmpError:any = args.message;
                    args.message.message = s_tmpError.original.sqlMessage;
 
                        logger.error('=========실행된 쿼리=========');
                        logger.error(s_tmpError.sql);
                        logger.error('=============================');
                    
                }
            }

            s_message = args.message.message;
        }
            
        else 
            s_message = args.message;        
        
        if(args.message instanceof DatabaseError){
            logger.error('=========실행된 쿼리=========');
            logger.error(args.message.sql);
            logger.error('=============================');
        }

        super(s_message);
        
        Object.setPrototypeOf(this, new.target.prototype);

        this.name = args.name || 'Error';
        this.httpCode = args.httpCode;
        this.message = s_message;

        if (args.isOperational !== undefined) {
        this.isOperational = args.isOperational;
        }

        Error.captureStackTrace(this);
    }
}