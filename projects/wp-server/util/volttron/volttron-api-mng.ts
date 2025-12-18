import { WP_CONFIG } from "../../wp-type/WP_CONN_ATT";
import { WpError, WpHttpCode } from "../../exception/WpError";
import * as request from "request";

/**
 * 플랫폼에 구축된 Kafka를 관리하는 클래스
 * 
 * assets에  config 파일에 작성된 접속정보를 통해 접근한다.
 * 
 * @example
 * ```ts
 *  let s_kafkaApiMng = new WpKafkaApiManager(global.WiseAppConfig);
 *  s_kafkaApiMng.getConnectList();
 * ```
 */
export class WpVolttronApiManager {

    o_config:WP_CONFIG;
    o_master:string;
    o_httpHeader:object;
    o_url:string;

    constructor(p_config:WP_CONFIG,p_httpHeader?:object )
    {
        if(typeof p_httpHeader == 'undefined')
            this.o_httpHeader = {'Content-Type': 'application/json'};            
        else 
            this.o_httpHeader = p_httpHeader;
            
        this.o_config = p_config;

        this.o_url = `http://${p_config.VOLTTRON.host}:${p_config.VOLTTRON.port}`;
    }

    getConnectList(){

        return new Promise<WiseReturn>((resolve, reject) => {
            request.get(`${this.o_url}/connectors`, (err:any, res:request.Response, body:any) =>{
                if (err) {
                    reject( new WpError({ 
                        httpCode:WpHttpCode.KAFKA_API_UNKOWN_ERR,  
                        message: err }));
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }
    getTopicList(){
        return new Promise<WiseReturn>((resolve, reject) => {
            request.get(`http://${this.o_config.VOLTTRON.host}:${this.o_config.VOLTTRON.port}/topics`, (err:any, res:request.Response, body:any) =>{
                if (err) {
                    reject( new WpError({ 
                        httpCode:WpHttpCode.KAFKA_API_UNKOWN_ERR,  
                        message: err }));
                } else {
                    resolve(JSON.parse(body));
                }
            });
        });
    }
    getTopicData(p_topicNm:string){
        let s_params = {
            "topic": p_topicNm,
        };

        let s_options = {
            headers: { 'Content-Type': 'application/json' },
            url: `http://${this.o_config.VOLTTRON.host}:${this.o_config.VOLTTRON.port}/topicData`,
            body: s_params,
            json: true
        };

        return new Promise<WiseReturn>((resolve, reject) => {
            request.post(s_options, (err:any, res:request.Response, body:any) =>{
                if (err) {
                    reject( new WpError({ 
                        httpCode:WpHttpCode.KAFKA_API_UNKOWN_ERR,  
                        message: err }));
                } else {
                    resolve(body);
                }
            });
        });
    }
}