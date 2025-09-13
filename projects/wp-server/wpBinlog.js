const ZongJi = require('zongji');
const { WpError, WpHttpCode } = require('./exception/WpError');
const { WpSparkApiManager } = require('./util/spark-api/spark-api-mng');
const { WpModelManagement } = require('./util/model-mng/model-mng');
const { JOB_LOCATION_ATT } = require('./wp-type/WP_COM_ATT');
function generateRandomNumber() {
  const randomNumber = Math.floor(Math.random() * 100000000);
  return randomNumber.toString().padStart(10, '0');
}
module.exports = class wpBinlog {

  constructor(p_config){
    this.metaDbId = p_config.id;
    this.metaDbPw = p_config.passwd;
    this.metaDbIp = p_config.host;
    this.metaDbPort = p_config.port;
    this.metaDbNm = p_config.db;

    this.includeSchema = {};
    this.oJobStatusList = {};
    this.oJobs = {};
    this.oClientId = '';
    // oSoket;
    this.zongji = new ZongJi({
      host: p_config.host,
      port: p_config.port,
      user: p_config.id,
      password: p_config.passwd
      //debug: true
    });
  }
  
  init() {
    console.log('==========wpBinlog init============');
    // // #54 binlog 통합
    this.includeSchema[this.metaDbNm] = ['job_sub_mstr', 'job_mstr'];
    this.zongji.start({
      includeEvents: ['tablemap','writerows','updaterows'],
      includeSchema: this.includeSchema,
      serverId: generateRandomNumber(),
      startAtEnd: true
    });

    this.zongji.on('binlog', function (evt) {
      if (evt.getEventName() == 'updaterows') {
        if(evt.tableMap[evt.tableId].parentSchema == 'wise_prophet_v1_company'){
          if(evt.tableMap[evt.tableId].tableName == 'job_mstr'){
            
          }
          else{
            for (let i in evt.rows) {
              // #60
              // ---------------------------------------------------------
              // binlog 여러 서버에서 실행시 서버 죽어서 임시로 추가
              // local이 아닌 다른 서버에서 추가한 job 실행시
              // this.oJobs[evt.rows[i].after.ID] 에 finish 및 success undefined 에러 발생해서 서버 die
    
              // #28 DB에서 전 값이 20인 부분만 진행되도록.
              // #28 이거 조거는 반드시 테스트하면서 확인해봐야함. 아직 조건 미정.
              // if (evt.rows[i].before.STATUS == 10) {
                if (this.oJobs[evt.rows[i].after.ID]) {
                  try {
                    // ---------------------------------------------------------
                    console.log("evt.rows[i].after.STATUS : ", evt.rows[i].after.STATUS);
                    switch (evt.rows[i].after.STATUS) {
                      case 20:
                        console.log("processJob : ", evt.rows[i].after.JOB_ID);
                        this.oJobs[evt.rows[i].after.ID].processJob(evt.rows[i].after.JOB_ID);
                        
                       
                        break;
                      case 40:
      
                        this.oJobs[evt.rows[i].after.ID].finish = true;
                        this.oJobs[evt.rows[i].after.ID].success = true;
      
                        this.oJobs[evt.rows[i].after.ID].o_jobList.forEach(function (element) {
                          if (element.id == evt.rows[i].after.JOB_ID) {
                            element.success = true;
                      
                            if (element.data.o_action  == 'statistics' || element.data.o_action  == 'feature-importance') {
                              if (element.location == JOB_LOCATION_ATT.WISEPROPHET){
                                this.oJobs[evt.rows[i].after.ID].successWpJob(evt.rows[i].after.JOB_ID,evt.rows[i].after.ERROR_MSG,element.data.o_action);
                                console.log(JSON.parse(evt.rows[i].after.ERROR_MSG));
                              }
                            }
                            
                          }
                        }.bind(this));
                        // #79. token값을 next() 파라미터에 추가하여 넘김.
                        console.log("successJob : ", evt.rows[i].after.JOB_ID);
                        this.oJobs[evt.rows[i].after.ID].successJob(evt.rows[i].after.JOB_ID);
                      
                        break;
                      case 99:
                        let s_wpJobchk = false;
                        this.oJobs[evt.rows[i].after.ID].finish = true;
                        this.oJobs[evt.rows[i].after.ID].success = false;
      
                        this.oJobs[evt.rows[i].after.ID].o_jobList.forEach(function (element) {
                          if (element.id == evt.rows[i].after.JOB_ID)
                            element.success = false;
                            if (element.location == JOB_LOCATION_ATT.WISEPROPHET)
                              s_wpJobchk = true;
                        });
                        
                        console.log('===========error==' + evt.rows[i].after.ID + '=============');
                        if (s_wpJobchk)
                          this.oJobs[evt.rows[i].after.ID].errorWpJob(evt.rows[i].after.JOB_ID, evt.rows[i].after.ERROR_MSG);
                        else
                          this.oJobs[evt.rows[i].after.ID].errorJob(evt.rows[i].after.JOB_ID, evt.rows[i].after.ERROR_MSG);
                        console.log('====================================');
                        break;
                      default:
                        this.oJobs[evt.rows[i].after.ID].o_jobList.forEach(function (element) {
                          if (element.id == evt.rows[i].after.JOB_ID)
                            element.finish = true;
                        });
                        this.oJobs[evt.rows[i].after.ID].o_jobList.forEach(function (element) {
                          if (element.id == evt.rows[i].after.JOB_ID)
                            element.success = false;
                        });
      
                        break;
                    }
                  } catch (error) {
                    console.log(error);
                  }
                }
    
              // }
            }
          }          
        }
        
        // }
      }
    }.bind(this));
    this.zongji.on('error', function (e) {
      console.log('==================Bin Log=====================');
      console.log(e);
      console.log('==============================================');
      this.restart();
    }.bind(this));
  }
  setJobList(pJobList) {
    for (let sJob of pJobList) {
      this.oJobStatusList[sJob.id] = sJob;
    }
  }
  getZongji() {
    return this.zongji;
  }
  // #73
  setClientId(pClientId) {
    this.oClientId = pClientId;
  }
  setJob(pJob) {
    this.oJobs[pJob.getJobId()] = pJob;
  }
  getJobStatus(pJobId) {
    this.oJobStatusList[pJobId[0]].finish;

    return this.oJobStatusList[pJobId[0]].finish;
  }
  // zongji 재시작
  restart() {
    this.zongji.stop();
    // 새로 정의
    this.zongji = new ZongJi({
      host: this.metaDbIp,
      port: this.metaDbPort,
      user: this.metaDbId,
      password: this.metaDbPw
      //debug: true
    });
    // 다시 init 함수에 태움
    this.init();
  }
  // binlog 연결 살아있는지 확인
  getBinLogStatus() {
    return new Promise((resolve, reject) => {
      let sProcessId = this.zongji.connection.threadId;
      let sQuery = "SELECT * FROM INFORMATION_SCHEMA.PROCESSLIST WHERE `Id`='" + String(sProcessId) + "'AND `COMMAND`='Binlog Dump'"
      global.WiseMetaDB.getConnection().query(sQuery).then(function (result) {
        // Binlog process 존재하는 경우 true
        if (result[0].length == 0) {
          resolve(false)
        } else {
          resolve(true)
        }
      }).catch(function (err) {
        console.log(err);
        reject('getBinLogStatus : ' + err.message);
      });
    })
  }

}
