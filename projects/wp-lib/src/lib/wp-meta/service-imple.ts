import { WpAppConfig } from "../wp-lib-config/wp-lib-config";


export class WpSeriveImple {
    oNodeUrl = "";
    oPyUrl = "";
    oHeaders = { 'content-type': 'application/json'};
    constructor(cAppConfig:  WpAppConfig) {
        this.oNodeUrl = cAppConfig.getServerPath("NODE");
        // this.oPyUrl = cAppConfig.getServerPath("PY");
    }
}