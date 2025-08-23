import {  Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';


@Injectable()
export class WpAppConfig {

    public config: any = null;
    public env:    any = null;

    constructor(public http: HttpClient) {

    }

    public getServerPath(serverType: any) {
        let serverObj:any = this.getConfig(serverType);
        let sHttp = this.getConfig('HTTPS')? 'https://':'http://';
        return sHttp + serverObj['host'] + ':' + serverObj['port'] ;
    }
    /**
     * Use to get the data found in the second file (config file)
     */
    public getConfig(key: any) {
        return this.config[key];
    }

    public getUseConfig(key: any) {
        let sUseCheck;
        if (this.config[key].use === undefined){
            sUseCheck = false;
        }
        else {
            sUseCheck = this.config[key].use;
        }
        return sUseCheck;
    }

    public setConfig(cloudType:any, key: any) {
        this.config[key] = cloudType;
    }


    /**
     * Use to get the data found in the first file (env file)
     */
    public getEnv(key: any) {
        return this.env[key];
    }

    /**
     * This method:
     *   a) Loads "env.json" to get the current working environment (e.g.: 'production', 'development')
     *   b) Loads "config.[env].json" to get all env's variables (e.g.: 'config.development.json')
     */
    public load() {

        return new Promise((resolve, reject) => {
            this.http.get('/assets/config/app.config.json').subscribe( (envResponse) => {
                
                if (envResponse != undefined ) {
                    this.config = envResponse;
                    resolve(true);
                } else {
                    console.error('Env config file "env.json" is not valid');
                    resolve(true);
                }
            });

        });
    }
}