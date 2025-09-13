import {  WP_SESSION_USER } from "../wp-type/WP_SESSION_USER";
import {  WP_META_DB } from "../wp-type/WP_META_DB";
import { WP_CONFIG } from "../wp-type/WP_CONN_ATT";
import { WP_SOCKET_ATT } from "../wp-type/WP_SOCKET_ATT";
import { WiseCronJobInterface  } from "../wp-type/WP_CRON_INFO";
import { WiseJupyterInterface } from "../../뺄꺼/WP_JUPYTER_INFO";
declare global {
	var WiseMetaDB:WP_META_DB;
	var WiseAppConfig:WP_CONFIG;
	var WiseSocketServer:WP_SOCKET_ATT;
	var WiseBinLog:any;
	var WiseLogClient:any;
	var WiseCronJobMng:WiseCronJobInterface;
	var WiseJupyterMng: WiseJupyterInterface;
	var WiseStorage:any;
	namespace Express {
		
		interface Request {
			decodedUser: WP_SESSION_USER;
		}
	};
}