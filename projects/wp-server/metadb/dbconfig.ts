import {Sequelize} from 'sequelize-typescript';
import { WiseAppConfig } from "../util/appConfig";

var o_appconfig = new WiseAppConfig();

export const MetaConn = new Sequelize(
    o_appconfig.getDbName(),
    o_appconfig.getDbId(),
    o_appconfig.getDbPasswd(),
    {
        'host': o_appconfig.getDbHost(), // 데이터베이스 호스트
        'port': o_appconfig.getDbPort(),
        'dialect': o_appconfig.getDbType(), // 사용할 데이터베이스 종류
        "timezone": "+09:00",
        define: {
            freezeTableName: true,
            timestamps: false,
        },
        dialectOptions: {
          useUTC: false, //for reading from database
          dateStrings: true,
          typeCast: function (field:any, next:Function) { // for reading from database
            if (field.type === 'DATETIME') {
              return field.string()
            }
              return next()
            },
        },
        pool: {
            max: 100,
            min: 0,
            acquire: 30000,
            idle: 10000,
            evict: 10000
      
        },
        logging: console.log,
        //logging: logger.debug
        models: [__dirname + '/model'],
      }
)