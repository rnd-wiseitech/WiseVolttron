const LivyClient = require('livy-client');
import { WpError, WpHttpCode } from "../../exception/WpError";
export class WpLivyManagement {
    public o_livy:any;
    public o_livySession:any;
    

    constructor(p_host:string, p_port:string) {
        this.o_livy = new LivyClient({host:p_host, port:p_port});
    }


    getLivyClient() {
        return this.o_livy;
    }

    async init() {
        this.o_livySession = await this.o_livy.createSession({
            kind: 'pyspark',
            // numExecutors: 2,
            executorMemory: '8G', 
            // executorCores: 2,
            conf: {
                "spark.sql.execution.arrow.pyspark.enabled": "true",
                "spark.scheduler.mode": "FAIR",
                "spark.dynamicAllocation.enabled": "true",
                "spark.dynamicAllocation.shuffleTracking.enabled": "true",
                "spark.worker.cleanup.enabled": "true",
                "spark.shuffle.service.enabled": "true",
                // "spark.shuffle.service.fetch.rdd.enabled": "true",
                "spark.dynamicAllocation.cachedExecutorIdleTimeout": "120s",
                "spark.dynamicAllocation.executorIdleTimeout": "120s",
                "spark.sql.parquet.mergeSchema": "true"
            }
    
        })
    }

    async getSession() {
        const s_sessions = await this.o_livy.sessions({autoupdate:true})
        for await (var session of s_sessions) {
            console.log("session : ", session)
            const status = await session.status()
            console.log(`Session id: ${status.id}, state: ${status.state}`)
            // console.log('status : ', status);
            if (status.state == 'idle' || status.state == 'busy' || status.state == 'starting') {
                this.o_livySession = session
                // this.o_livySession.kill()
            }
            // nowSession.kill()
        }
        if(this.o_livySession == undefined) {
            this.o_livySession = await this.o_livy.createSession({
                kind: 'pyspark',
                // numExecutors: 2,
                executorMemory: '2G', 
                // executorCores: 2,
                conf: {
                    "spark.sql.execution.arrow.pyspark.enabled": "true",
                    "spark.scheduler.mode": "FAIR",
                    "spark.dynamicAllocation.enabled": "true",
                    "spark.dynamicAllocation.shuffleTracking.enabled": "true",
                    "spark.worker.cleanup.enabled": "true",
                    "spark.shuffle.service.enabled": "true",
                    // "spark.shuffle.service.fetch.rdd.enabled": "true",
                    "spark.dynamicAllocation.cachedExecutorIdleTimeout": "120s",
                    "spark.dynamicAllocation.executorIdleTimeout": "120s",
                    "spark.sql.parquet.mergeSchema": "true"
                }
        
            })
        }
        console.log("this.o_livySession : ", this.o_livySession);
        return this.o_livySession
    }


    async getBatchSession(s_wfPath: string, s_param: string, s_schId: string) {
        const s_batch = await this.o_livy.Batch({autoupdate:true})
        const s_batchSession = await s_batch.createSession({file: s_wfPath, args:[s_param], name: `BATCH${s_schId}`}).catch((error:any) => {
            console.log("error : ", error);
        })
        return s_batchSession
    }


    async executeSession(p_code: string) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            await this.getSession();
            this.o_livySession
            // .once('idle', async (status: any) => {
                const statement = await this.o_livySession.run({code: p_code})
                statement
                    .once('available', (response: any) => {
                        console.log(`Statement 완료`)
                        console.log(response.output)
                        if(response.output.status != 'error') {
                            resolve(response.output.data['text/plain'])	
                        } else {
                            reject(new WpError({ 
                                httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:response.output.message
                            }));
                        }
                        // this.o_livySession.kill()
                    }, (error:any) => {
                        console.log(error);
                        // this.o_livySession.kill();
                        reject(new WpError({ 
                            httpCode:WpHttpCode.PY_API_UNKOWN_ERR, message:error
                        }));
                    })
    
            })
        // })
    }
}