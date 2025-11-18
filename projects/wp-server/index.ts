import express, { Express, NextFunction, Request, Response } from 'express';
import { commonRoute } from './router/common-api';
import { userRoute } from './router/user-api';
import { authRoute } from './router/auth';
import { dataMngRoute } from './router/data-api';
import { pyApiRoute } from './router/py-api';
import { WpError, WpErrorArgs, WpHttpCode } from './exception/WpError';
import { createToken, verifyToken } from './auth/token/token';
import { WiseMetaDB } from './metadb/WiseMetaDB';
import { WiseAppConfig } from './util/appConfig';
import { WiseSocket } from './util/socket/socket';
import wpBinlog from './wpBinlog';
import { schRoute } from './router/sch-api';
import { storageRoute } from './router/storage-api';
import { WiseCronManagement } from './util/schedule/cron-mng';
import { workflowRoute } from './router/workflow-api';
import { CorsOptions } from 'cors';
import { WiseDefaultStorage } from './util/data-storage/WiseDefaultStorage';
import { setCOM_ID } from './../wp-lib/src/lib/wp-meta/com-id';

var path = require('path');

const cors = require('cors');
var moment = require('moment');
moment.tz.setDefault("Asia/Seoul");
exports.moment = moment;

const app: Express = express();
const port = 8800;
const platFormPath = path.join(__dirname, './main');
app.get(['/', '/workflow', '/dm/?', '/login',
    '/usermng/?', '/modelmng/?', '/favicon.ico'],
  

    function (req, res) {
        res.sendFile(path.join(platFormPath, 'index.html'));
    });
app.use(express.static(platFormPath, { index: false }));

const s_corsOptions = (req: Request, callback: (err: Error | null, options?: CorsOptions) => void) => {
  let corsOptions;
  // interceptor 에서 withCredentials: true일 때는 cors * 사용 불가
  if (req.url.includes('/pyservice')) {
    corsOptions = { origin: req.header('Origin'), credentials: true };
  } else {
    corsOptions = { origin: true }; // reflect (enable) the requested origin in the CORS response
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

app.use(cors(
  s_corsOptions
));

app.use((req: Request, res: Response, next: NextFunction) => {
    // res.header("Access-Control-Allow-Origin", req.header('Origin'));
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "3600");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Cache-Control,Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Type'); // 헤더 노출 추가
    let s_token:any = req.query.token || req.headers.authorization;

    // console.log(req.url)
    if(req.url == '/userMng/auth' || req.url == '/userMng/check' || req.url == '/userMng/pwdEmail' || req.url == '/userMng/userCheck' 
      || req.url == '/auth/login'|| req.url == '/hdfs/upload' || req.url.includes('hdfs/getApiData') || req.url == '/auth/createToken' 
      || req.url == '/dbservice/re/copySampleDataset' || req.url.includes('/api/analyze-structured'))
      next();
    else{
      verifyToken(s_token).then(decodedToken => {
        req.decodedUser  = decodedToken;
        req.decodedUser.USER_TOKEN = s_token;
        req.decodedUser.USER_IP = req.headers['x-forwarded-for'] || req.ip;
        global.WiseSocketServer.setUserNo(req.decodedUser.USER_NO);
        next();
      }).catch(p_Err => {
        next(p_Err);
      });
    }
     
  
});

app.set('view engine', 'html');
app.set('trust proxy', true);

app.use(express.json({limit: '500mb'}));
app.use(express.urlencoded({ limit: '500mb',extended: true }));
app.use('/metaservice',commonRoute);
app.use('/wd',dataMngRoute);
app.use('/userMng',userRoute);

app.use('/auth',authRoute);
app.use('/jobexcute',pyApiRoute);
app.use('/sm',schRoute);
app.use('/hdfs',storageRoute);
app.use('/wkservice',workflowRoute);

// error handlers
app.use((err:Error | WpError,req: Request, res: Response, next: NextFunction) => {
  let customError:WpError;

  if (!(err instanceof WpError)) {
    let s :WpErrorArgs = {
      httpCode: WpHttpCode.INTERNAL_SERVER_ERROR,
      message: err.message
    };
    customError = new WpError(s);
  }
  else{
    customError = err;
  }
  res.status((customError as WpError).httpCode).send({message:customError.message});
  
});

let s_server = app.listen(port, async () => {
  try {
    global.WiseMetaDB = new WiseMetaDB();
    global.WiseAppConfig = (new WiseAppConfig()).getConfig();

    global.WiseStorage = await (new WiseDefaultStorage()).init();

    global.WiseMetaDB.select('DP_USER_MSTR',[],{USER_NO:1000}).then((p_adminUser:any)=>{
      createToken({ USER_NO: p_adminUser[0].USER_NO, USER_ID: p_adminUser[0].USER_ID }).then(async (p_adminToken:any)=>{
      
        global.WiseCronJobMng = new WiseCronManagement({
          USER_NO:p_adminUser[0].USER_NO,
          USER_ID:p_adminUser[0].USER_ID,
          USER_MODE:'ADMIN',
          USER_TOKEN:p_adminToken,
          HDFS_TOKEN :  Buffer.from(`root:${p_adminUser[0].PASSWD}`, "utf8").toString('base64')
        });
        global.WiseCronJobMng.init();
        global.WiseBinLog = new wpBinlog(global.WiseAppConfig.META_DB);
        // global.WiseBinLog.init();
        global.WiseLogClient = {};

      }).catch(p_error=>{
        global.WiseCronJobMng = undefined;
      })
      
    }).catch((p_err:any)=>{
      global.WiseCronJobMng = undefined;
    })

    global.WiseMetaDB.select('COM_MSTR', ['ID', 'TYPE', 'CATEGORY'], {DISPLAY: 'true'}).then((p_com: any) => {
      p_com.forEach((c: any) => {
        setCOM_ID(c.TYPE, c.ID, c.CATEGORY);
      });
    })
    const moment = require('moment');
    console.log(moment().tz("Asia/Seoul").format());
    //createModelfile();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

global.WiseSocketServer = new WiseSocket(s_server,["http://localhost:4200"]);
global.WiseSocketServer.start();

