import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';

@Injectable()
export class AppConfig extends WpAppConfig {

    constructor(private cHttp: HttpClient) {
        super(cHttp);
    }

}


