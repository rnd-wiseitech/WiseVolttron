const oracledb = require('oracledb');
import { WpError, WpHttpCode } from '../../exception/WpError';
import { WiseAppConfig } from '../appConfig';
try {
    // oracledb.initOracleClient({ libDir: (new WiseAppConfig()).getConfig().LIB_PATH });

} catch (err) {
    console.error('Whoops!');
    console.error(err);
    process.exit(1);
}
const SimpleOracleDB = require('simple-oracledb');

SimpleOracleDB.extend(oracledb);

export const OracleConn = async(p_user:string, p_password:string, p_connectString:string, p_dbNm:string) => {
    return new Promise(async (resolve, reject) =>{
        try {
            // ORA-12514 error -> poolname = undefined
            // Create a connection pool which will later be accessed via the
            // pool cache as the 'default' pool.
            await oracledb.createPool({
                user: p_user,
                password: p_password,
                connectString: p_connectString,
                // edition: 'ORA$BASE', // used for Edition Based Redefintion
                // events: false, // whether to handle Oracle Database FAN and RLB events or support CQN
                // externalAuth: false, // whether connections should be established using External Authentication
                // homogeneous: true, // all connections in the pool have the same credentials
                poolAlias: p_dbNm, // set an alias to allow access to the pool via a name.
                // poolIncrement: 1, // only grow the pool by one connection at a time
                poolMax: 5, // maximum size of the pool. Increase UV_THREADPOOL_SIZE if you increase poolMax
                poolMin: 0, // start with no connections; let the pool shrink completely
                poolPingInterval: 10, // check aliveness of connection if idle in the pool for 60 seconds
                poolTimeout: 15, // terminate connections that are idle in the pool for 60 seconds
                // queueMax: 500, // don't allow more than 500 unsatisfied getConnection() calls in the pool queue
                // queueTimeout: 60000, // terminate getConnection() calls queued for longer than 60000 milliseconds
                // sessionCallback: myFunction, // function invoked for brand new connections or by a connection tag mismatch
                // sodaMetaDataCache: false, // Set true to improve SODA collection access performance
                // stmtCacheSize: 30, // number of statements that are cached in the statement cache of each connection
                // enableStatistics: false // record pool usage for oracledb.getPool().getStatistics() and logStatistics()
            });
            console.log('Connection pool started');
            resolve(p_dbNm);
            // Now the pool is running, it can be used
            // await dostuff();

        } catch (error:any) {
            if(error.message.includes('NJS-046')){
                resolve(p_dbNm);
            }else{
                console.error('oracle createPool error: ' + error.message);
                reject(new WpError({
                        httpCode:WpHttpCode.META_DB_ERROR,
                        message:error            
                    }));
            }
        } 
        // finally {
        //     try{
        //         await closePoolAndExit(p_dbNm);

        //     } catch (error:any) {
        //         console.log(error)
        //     }
        // }
    });
}
async function closePoolAndExit(p_dbNm:string) {
    console.log('\nTerminating');
    try {
      // Get the pool from the pool cache and close it when no
      // connections are in use, or force it closed after 10 seconds.
      // If this hangs, you may need DISABLE_OOB=ON in a sqlnet.ora file.
      // This setting should not be needed if both Oracle Client and Oracle
      // Database are 19c (or later).
    //   await oracledb.getPool(p_dbNm).close(10);
      await oracledb.getPool(p_dbNm).terminate();
      console.log('Pool closed!!!!!!!!!');
    //   process.exit(0);
    } catch (err:any) {
      console.log('Pool closed error!!!!!!!!!');
      console.error(err.message);
    //   process.exit(1);
    }
}

exports.doRelease = (p_connection:any) => {
    p_connection.close(
        function (p_err:Error) {
            if (p_err) {
                return;
            }
        });
}
