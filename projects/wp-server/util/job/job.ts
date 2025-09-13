import moment from "moment";
import { verifyToken } from "../../auth/token/token";
import { WpError, WpHttpCode } from "../../exception/WpError";
import { DS_VIEW_MSTR_ATT } from "../../metadb/model/DS_VIEW_MSTR";
import { DS_VIEW_TBL_MSTR_ATT } from "../../metadb/model/DS_VIEW_TBL_MSTR";
import { WiseMetaDB } from "../../metadb/WiseMetaDB";
import { JOB_DATA_ATT, WkSaveData } from "../../wp-type/WP_COM_ATT";
import { WP_SESSION_USER } from "../../wp-type/WP_SESSION_USER";
import { WP_SOCKET_ATT } from "../../wp-type/WP_SOCKET_ATT";
import { WpDataSourceManager } from "../data-source/WpDataSourceManager";
import { WpModelManagement } from "../model-mng/model-mng";
import { WpSparkApiManager } from "../spark-api/spark-api-mng";
import { getPropertiesData } from "../component/component-util";
import { WpLivyScript } from "../livy/livy-script"
import { WiseStorageManager } from '../../util/data-storage/WiseStorageManager';
// import { DS_AUTH_USER_MSTR_ATT } from "../../metadb/model/DS_AUTH_USER_MSTR";
import { WF_USER_PARAM_ATT } from "../../metadb/model/WF_USER_PARAM";
// import { ANALYTIC_API_URL, WpAnalyticManager } from "../analytic/analytic-mng";
import { DP_MODEL_MSTR_ATT } from "../../metadb/model/DP_MODEL_MSTR";
// import { DP_MODEL_WORKFLOW_USE_MSTR_ATT } from "../../metadb/model/DP_MODEL_WORKFLOW_USE_MSTR";
import { getCOM_ID } from '../../../wp-lib/src/lib/wp-meta/com-id';
import { Transaction } from "sequelize";

// 워크플로우 실행 데이터
export interface JOB_ATT {
    jobId:string;
    clientId:string;
    data:any;
    token:string;
    mode?:string;
}

/**
 * Workflow를 통해 사용자가 만든  파이프라인의 순서에 따라 생성된 컴포넌트를 실행 데이터를 적재하는 등의 작업을 할 수 있는 클래스
 * 
 * {@link WpComponentProperty | WpComponentProperty}를 상속 받은 컴포넌트를 사용해야 한다.
 * 
 * @example
 * ```ts
 * let s_jobParam:JOB_ATT = {
 *     jobId:s_body.jobId,
 *     clientId:s_body.clientId,
 * 
 *     // #28. 배치 로그아이디
 *     logId:s_logId,
 * 
 *     // #28. 배치 워크플로우아이디
 *     wfId:s_wfId,
 * 
 *     // #28. 배치 워크플로우이름
 *     wfNm:s_wfNm,
 *     data:s_body.wkSaveData,
 * 
 *     // #28. 배치 스케줄Id
 *     schId:s_schId,
 * 
 *     // #28  배치 시작 날짜.
 *     schDt:s_schDt,
 * 
 *     // sjh 모니터링 어디서 실행되는지 위치 파라미터
 *     location:s_location,
 *     token:req.decodedUser.USER_TOKEN
 * };
 * let s_jobMstr = new JobMstr(s_jobParam);
 *
 * s_jobMstr.setJobList(Object.values(s_body.data));
 * s_binLog.setJob(s_jobMstr);
 * 
 * let s_rootJob = s_jobMstr.start(s_userNo, s_userId, s_userMode);
 *
 * s_rootJob.then(p => {
 *     res.json({ success: true, reVal: p });
 * });
 * ```
 */

export class JobMstr {
    o_index = 0;
    o_jobList: Array<JOB_DATA_ATT> = [];
    o_jobId = '';
    o_clientId = '';
    o_callApiUrl = '';
    // #54 binlog 통합
    // job socket은 원래대로 별도로 생성
    o_socket:WP_SOCKET_ATT;
    // #79. 토큰 저장 변수
    // wpBinlog에서 쓰임.
    o_token='';
    o_wkOutputInfo:any = {};
    // o_wkSaveData:WkSaveData;
    // #125 상태코드 체크하기 위해 추가 excute: job 실행, success: job 성공
    o_jobExecuteCount = { success: 0, excute: 0 };
  
    // 분석 컴포넌트 ID 리스트
    o_trainModelComIdList: number[];

    o_execUser:WP_SESSION_USER;
    o_metaDb:WiseMetaDB;
    o_dsMng:WpDataSourceManager;
    o_apiMng:WpSparkApiManager;
    o_userParam: WF_USER_PARAM_ATT[];
    o_workflowId: string;
    o_modelId:string[] = [];
    o_mode:string = '';
    constructor(p_jobParam:JOB_ATT) {
    
      this.o_jobId = p_jobParam.jobId;
      console.log(this.o_jobId);
      // #70 포트변경
      // #73
      this.o_socket = global.WiseSocketServer;
      this.o_clientId = p_jobParam.clientId;
      // #79. 토큰 저장.
      this.o_token = p_jobParam.token;
      // # 모드저장
      this.o_mode = p_jobParam.mode;
      // #121. 워크플로우 저장 데이터
      // this.o_wkSaveData = p_jobParam.data;
      // 모델 ID, IDX 데이터
      // this.o_wkSaveData.wkModelIdData = {};
      //#28 로그id저장, 워크플로우id, 이름, 스케줄ID, 스케줄시작날짜 저장 (배치가 아닌 경우에는 null값)

      this.o_callApiUrl =  `http://${global.WiseAppConfig.WP_API.host }:${global.WiseAppConfig.WP_API.port}`;

      
      
      this.o_metaDb = global.WiseMetaDB;

      (async ()=>{
        await this.init();
      })();
    }
    async init(){
      this.o_execUser = await verifyToken(this.o_token);
      this.o_dsMng = new WpDataSourceManager(this.o_execUser);
      this.o_apiMng = new WpSparkApiManager(this.o_execUser.AppConfig);
      let s_userParam = await this.o_metaDb.select('WF_USER_PARAM', [], { REG_USER: this.o_execUser.USER_NO, DEL_YN: 'N' });
      this.o_userParam = s_userParam.map((s_param:any) => s_param.dataValues);

      // 분석 컴포넌트 ID 리스트
      let s_trainModel = await this.o_metaDb.select('COM_MSTR', [], { CATEGORY: ['analytic_model', 'classification_model', 'regression_model', 'cluster_model', 'language_model'], DISPLAY: 'true' });
      this.o_trainModelComIdList = s_trainModel.map((c: any) => c.dataValues.ID);
    }
    getJobId() {
      return this.o_jobId;
    }
 

  // WORKFLOW 실행
  async call(p_location:string) {
    return new Promise<WiseReturn>(async (resolve, reject) => {
      let COM_ID: Record<string, number> = getCOM_ID();
      var sBinLog =  global.WiseBinLog;
      console.log('========workflow call : zongji.ready ========');
      console.log(sBinLog.zongji.ready);
      // Binlog 연결이 끊어져 있는 경우 재시작. 
      let sConnStatus = await sBinLog.getBinLogStatus();
      if (!sConnStatus) {
        await sBinLog.restart();
      }
      let s_ = [];
      let b = { groupId: this.o_jobId, userno: this.o_execUser.USER_NO, userId: this.o_execUser.USER_ID, usermode: this.o_execUser.USER_MODE, location: p_location, workflowId: this.o_workflowId};
     
      for(let s_param of this.o_jobList){
        let s_jobData:any = s_param;
        let s_tmpData = getPropertiesData(s_jobData.type, s_jobData.data.o_data);

        // Job별로 특별하게 필요한 파라미터는 모조리 여기에 넣음 (기본값 workflowId, userParam)
        let s_data: any = {
            workflowId: this.o_workflowId,
            user_param: this.o_userParam,
            filter: s_jobData.filter
        };
        // jskwon_통합본_리뉴얼 job.ts 코드 추가 (정효팀장님 수정부분)
        // 로드한 워크플로우 일 경우
        if(s_jobData.wf_regUserno != undefined && s_jobData.wf_regUserno != null) {
          let s_regUsermode = await this.o_metaDb.select('DP_USER_PROFILE', ['USER_MODE'], { USER_NO: s_jobData.wf_regUserno });
          s_data['wf_regUserno'] = s_jobData.wf_regUserno;
          s_data['wf_regUsermode'] = s_regUsermode[0].USER_MODE;
        }
         // jskwon_통합본_리뉴얼 job.ts 코드 추가 끝 (정효팀장님 수정부분)
        // I-FTP, I-DATABASE, O-ODBC일 경우 접속정보 가져옴
        if (s_jobData.type == COM_ID['I-FTP'] || s_jobData.type == COM_ID['I-DATABASE'] || s_jobData.type == COM_ID['O-DATABASE']) {
            s_data['connInfo'] = await global.WiseMetaDB.select('DS_MSTR', [], { DS_ID: s_jobData.data.o_data.dsId });
            // O-DATASOURCE일 경우 DB작업(DS_VIEW_MSTR, DS_VIEW_TBL_MSTR, DS_AUTH_USER_MSTR)하여 DS_VIEW_ID 가져옴 
        } else if (s_jobData.type == COM_ID['I-HDFS']){
            s_data['connInfo'] = global.WiseAppConfig.WP_API; // default hdfs port
        } else if (s_jobData.type == COM_ID['O-DATASOURCE'] || s_jobData.type == COM_ID['O-IMAGE-DATASOURCE']){
            let s_filename = await this.getOutputDsViewId(s_jobData.data.o_data)
            s_data['filename'] = s_filename;
        } else if (this.o_trainModelComIdList.includes(s_jobData.type)) {
            // s_data['modelId'] = await this.getModelId(s_jobData.data.o_data.comId);
            
            if(p_location == 'wiseprophet')
              s_data['workflowId'] = s_data['modelId'];

            this.o_modelId.push(s_data['modelId'])
        } 
        // else if (s_jobData.type == COM_ID['A-FILTER_MODEL']) {
            // let s_trainResultChk = await this.chkTrainModelResult();
            // if (!s_trainResultChk){
            // throw new WpError({ httpCode: WpHttpCode.INTERNAL_SERVER_ERROR, message: '모델 결과 조회 에러' });
            // }
        // } 
        // else if (s_jobData.type == COM_ID['A-PREDICT_MODEL'] || s_jobData.type == COM_ID['A-DEPLOY_MODEL']){
        //     let s_trainResultChk = await this.chkTrainModelResult();
        //     if (!s_trainResultChk) {
        //     throw new WpError({ httpCode: WpHttpCode.INTERNAL_SERVER_ERROR, message: '모델 결과 조회 에러' });
        //     }
            // s_data['modelId'] = await this.getModelId(s_jobData.data.o_data.modelComId);
        // } 
        // 컴퍼넌트 공통함수 돌려서 최종 API 파라미터 세팅
        let s_body = s_tmpData.getSparkParams(this.o_execUser, this.o_jobId, s_jobData.id, s_jobData.parent_id, s_data);      
    
        s_.push(Object.assign({parentJobId:  s_jobData.parent_id}, s_body,b));
      }

      let s_sparkApiMng = new WpSparkApiManager(this.o_execUser.AppConfig);
      let c = { jobId: this.o_jobId,jobParam:s_, mode: this.o_mode};
      // let s_result = await this.saveJobMstr(s_);
      s_sparkApiMng.onCallApi(`/job2`,JSON.stringify(c),
                          {   
                              'Content-Type': 'application/json',
                          }).then(async (pResult:any) => {
                              let s_ = JSON.parse(pResult);
                              for (let s_job of s_.joblist){
                                  let s_jobResult = s_job[1];                                    
                                  if (s_jobResult.action == 'model-train') {
                                      try {
                                          let s_wpModelMng = new WpModelManagement(this.o_execUser);
                                          s_wpModelMng.saveWorkflowModel(s_jobResult).then(()=>{
                                            resolve({isSuccess: true, result: { jobId: s_jobResult.id, success: true, msg: '' }});
                                          })
                                      } catch (error) {
                                        resolve({isSuccess: false, result: { jobId: s_jobResult.id, success: false, msg: error }});
                                      }
                                  }
                              }
                              
                              resolve({ isSuccess: true, result: pResult });
                          }).catch(pErr => 
                            { 
                              reject(pErr) 
                            });
      });
    
    }
  
    setJobList(p_jobDataList:Array<JOB_DATA_ATT>) {
      this.o_jobList = p_jobDataList;
    }
    // #73
    processJob(p_jobId:string) {
      // #54 binlog 통합
      this.o_socket.sendClientMsg(this.o_clientId, 'joblog-message', { id: this.o_clientId, data: { jobId: p_jobId, success: 'ing', msg: '' } });
    }
    successJob(p_jobId:string) {
      // #54 binlog 통합
      console.log("successJob pJobId : ", p_jobId);
      this.o_socket.sendClientMsg(this.o_clientId, 'joblog-message', { id: this.o_clientId, data: { jobId: p_jobId, success: true, msg: '' } });
    }
    // #73
    errorJob(p_jobId:string, p_error:WpError) {
      this.o_socket.sendClientMsg(this.o_clientId, 'joblog-message', { id: this.o_clientId, data: { jobId: p_jobId, success: false, msg: p_error } });
      this.o_socket.sendClientMsg(this.o_clientId, 'nextStep', { id: this.o_clientId, data: false });
    }

    
    async saveJobMstr(p_subJob?:any) {
      let sJobMstr = {
          ID: this.o_jobId,
          NAME: '',
          STATUS: 20,
          ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
          DESC: '',
          USER_NO: this.o_execUser.USER_NO,
          // USER_NO: '1000',
          ERROR_MSG: ''
      };

      let sJobSubMstr:any = [];

      for (let idx in p_subJob) {
          sJobSubMstr.push({
              ID: this.o_jobId,
              JOB_ID: p_subJob[idx].jobId,
              P_JOB_ID: JSON.stringify(p_subJob[idx].parentJobId),
              COM_ID: p_subJob[idx].method,
              STATUS: 20,
              ST_DT: moment().format('YYYY-MM-DD HH:mm:ss'),
              DATA: JSON.stringify(p_subJob[idx].data),
              ERROR_MSG: ''
          });
      }
      this.o_metaDb.getConnection().transaction(async (pT:Transaction) => {
          try {
            let s_insertResult = await this.o_metaDb.insert('JOB_MSTR',sJobMstr,false,pT);
            
            if(p_subJob.length > 0)
              await this.o_metaDb.insert('JOB_SUB_MSTR',sJobSubMstr,true,pT);
            
            // pT.commit();
            
            return s_insertResult;
          } catch (error) {
              pT.rollback();
              throw error;
          }        
      }).then(p_result=>{
          return p_result
      }).catch(p_error=>{
          throw p_error;
      });
    }
    // #79. 유저번호 파라미터 추가. 
    // router.post('/')에서 토큰을 decode하여 보내는 유저번호를 받음.
    async start(p_location:string) {
      console.log('============Job Start================');
  
      var sBinLog =  global.WiseBinLog;
      console.log('======== zongji.ready ========');
      console.log(sBinLog.zongji.ready);
      // Binlog 연결이 끊어져 있는 경우 재시작. 
      let sConnStatus = await sBinLog.getBinLogStatus()
      if (!sConnStatus) {
        sBinLog.restart()
      }
  
      let sCallResults = await this.call(p_location);
      let isSuccess = 0;
  
      for (let sResult of sCallResults.result) {
        if (sResult.isSuccess)
          isSuccess++;
        else {
          console.log(sResult.result.msg);
        }
      }
      // #125 (oJobExecuteCount) 성공횟수(success), 실행횟수 추가(excute)
      if (isSuccess == sCallResults.result.length) {
        console.log('Sucess Call');
        this.o_jobExecuteCount.excute += isSuccess
        this.o_jobExecuteCount.success += isSuccess
        return sCallResults.result;
      }
      else {
        console.log('Faild Call');
        this.o_jobExecuteCount.excute += sCallResults.result.length
        return [];
      }
    }



    // #125 상태코드 업데이트 추가
    chkWkStatus() {
      return new Promise((resolve, reject) => {
        setTimeout(()=>{

          let s_status = this.o_jobExecuteCount.success == this.o_jobList.length ? 40 : 99; //모든 job이 성공했을때만 40          
          this.updateWkStatus({ WF_ID: this.o_workflowId, STATUS: s_status }).then((sUpdateResult:any) => {
            if (sUpdateResult.success) {
              resolve({ success: true, message: sUpdateResult.message })
            } else {
              reject({ success: false, message: sUpdateResult.message })
            }
          })

        }, 1000);
      });
    }



    // #125 상태코드 업데이트 추가
    updateWkStatus(p_param:any) {
      return new Promise((resolve, reject) => {
        this.o_metaDb.update('WF_MSTR',{ STATUS: p_param['STATUS'] }, { WF_ID: p_param['WF_ID'] }).then(function (updateWfMstr) {
          resolve({ success: true, message: '워크플로우 상태코드 업데이트 완료' });
        }).catch(pErr =>
          reject(pErr)
        );
      })
    }

    saveModelInfo(pParams:any) {
      return new Promise(async (resolve, reject) => {
        try {
          // MODEL_ID, MODEL_IDX 기준 모델 정보 확인.
          const { WF_ID, COM_UUID, MODEL_ID, MODEL_IDX } = pParams.pData;
          const sWfModelData = await this.o_metaDb.select('DP_MODEL_WORKFLOW_USE_MSTR', [], { MODEL_ID, MODEL_IDX });
          if (sWfModelData.length == 0) {
            await this.o_metaDb.insert('DP_MODEL_WORKFLOW_USE_MSTR', { MODEL_ID, MODEL_IDX, WF_ID, COM_UUID });
          } else {
            await this.o_metaDb.update('DP_MODEL_WORKFLOW_USE_MSTR', { WF_ID, COM_UUID }, { MODEL_ID, MODEL_IDX });
          }
          resolve({ success: true, MODEL_ID, MODEL_IDX });
        } catch (pErr) {
          reject(pErr);
        }
      })
    }


    // Workflow Meta DB 작업
    async saveWorkflowMetaDb(p_data: any, p_userno: number) {
      let s_overwrite = p_data.overwrite;
      let s_date = moment().format('YYYY-MM-DD HH:mm:ss')
      let s_WF_MSTR = {
        WF_NM: p_data.wkName,
        WF_DIAGRAM: p_data.wkDiagram,
        STATUS: 10,
        REG_DT: s_date,
        REG_USER: p_userno,
        WF_TYPE: p_data.wkType,
        DEL_YN: 'N'
      }
      if (!s_overwrite) {
        let s_wfMstrResult = await global.WiseMetaDB.insert('WF_MSTR', s_WF_MSTR, false);
        this.o_workflowId = s_wfMstrResult.dataValues.WF_ID;
      } else {
        this.o_workflowId = p_data.WF_ID;
        await global.WiseMetaDB.delete('WF_COM_MSTR',{ WF_ID: this.o_workflowId });
        await global.WiseMetaDB.delete('WF_USE_DATASET',{ WF_ID: this.o_workflowId });
        await global.WiseMetaDB.update('WF_MSTR', s_WF_MSTR, { WF_ID: this.o_workflowId });
      }

      let s_WF_COM_MSTR = []

      for (var comp of p_data.wkCompData) {
          let s_compData = {
              WF_ID: this.o_workflowId,
              COM_UUID: comp.id,
              COM_ID: comp.type,
              // COM_TYPE: comp.type, (25.4.22) COM_TYPE 칼럼에 null. 향후 COM_TYPE 칼럼을 테이블에서 삭제 예정
              WF_DATA: JSON.stringify(comp),
              REG_DT: s_date,
              REG_USER: p_userno
          }
          s_WF_COM_MSTR.push(s_compData)
      }
      await global.WiseMetaDB.insert('WF_COM_MSTR',s_WF_COM_MSTR, true);

      
    }

    // OUTPUT 시에 DB작업
    async getOutputDsViewId(p_data: any) {
      let s_filename = ''
      // 신규 데이터일 경우
      if (p_data.saveOpt == 'new') {

        // META DB에 등록되어 있는지 조회
        let s_exist = await this.o_dsMng.isExists(this.o_execUser.USER_NO, p_data.new_filename);
        
        // 없을 경우 DB에 INSERT하고 DS_VIEW_ID가져옴
        if (s_exist.result.length == 0) {
          let s_DS_VIEW_MSTR: DS_VIEW_MSTR_ATT = {
            DS_ID: global.WiseAppConfig.DS_ID,
            DS_VIEW_NM: p_data.new_filename,
            DS_VIEW_DESC: p_data.new_filename,
            REG_USER_NO: this.o_execUser.USER_NO,
            DS_FILE_FORMAT: global.WiseAppConfig.FILE_FORMAT
          }

          let s_dsViewMstrResult = await global.WiseMetaDB.insert('DS_VIEW_MSTR', s_DS_VIEW_MSTR, false)
          
          // 원래 데이터셋 저장값 (데이터셋 명, 데이터셋 타입)
          let sTBL_TYPE = 'structure'

          // 이미지 데이터셋일 경우 타입하고 이름 변경
          if (p_data.filetype == 'image') {
            sTBL_TYPE = p_data.filetype
          }

          let s_DS_VIEW_TBL_MSTR: DS_VIEW_TBL_MSTR_ATT = {
            DS_VIEW_ID: s_dsViewMstrResult.DS_VIEW_ID,
            TBL_NM: `${p_data.new_filename}`,
            TBL_CAPTION: `${p_data.new_filename}`,
            TBL_TYPE: sTBL_TYPE,
            REG_USER_NO: this.o_execUser.USER_NO,
            DEL_YN: 'N',
            REG_DT : moment().format('YYYY-MM-DD HH:mm:ss')
          }
          let s_dsViewTblMstrResult = await global.WiseMetaDB.insert('DS_VIEW_TBL_MSTR', s_DS_VIEW_TBL_MSTR, false)
          
          // let s_DS_AUTH_USER_MSTR:DS_AUTH_USER_MSTR_ATT = {
          //   DS_VIEW_ID: s_dsViewMstrResult.DS_VIEW_ID,
          //   DS_VIEW_AUTH_USER: this.o_execUser.USER_NO,
          //   IS_SELECT: 1,
          //   IS_UPDATE: 1,
          //   IS_DELETE: 1
          // };
          // await global.WiseMetaDB.insert('DS_AUTH_USER_MSTR',s_DS_AUTH_USER_MSTR, false); 
          s_filename = s_dsViewMstrResult.DS_VIEW_ID
        // DB에 등록되어 있는 경우 등록된 DS_VIEW_ID가져옴
        } else {
          s_filename = s_exist.result[0].DS_VIEW_ID
        }
      // 신규가 아닐 경우 UI에서 선택한 DS_VIEW_ID 가져옴
      } else {
        s_filename = p_data.filename
      }

      return s_filename
    }

    // 저장할 워크플로우 정렬
    async sortWorkflow(p_wkData:any) {
      // 최초 job array
      let s_tempWkData = Object.assign([], p_wkData)
      // 최종 순서 정렬 job array
      let s_sortWkData:any[] = []

      // cnt 추가 및 parentId가 없는것 sort array에 넣기(나중에 parentId 길이와 비교)
      for await (var job of s_tempWkData) {
        job['cnt'] = 0;
        if (job['parentId'].length == 0) {
          s_sortWkData.push(job)
        }
      }

      // 기본 job에서 parentId가 있는 job만 추출
      let s_nextJob = s_tempWkData.filter((pJob:any) => pJob.parentId.length > 0 );
      
      // 나머지 job 길이가 0이 될때까지
      while (s_nextJob.length > 0){
        s_nextJob.reduce( (pre:any, value:any) => {
              for (let sParentId of value.parentId) {
                  // 순서 정렬 job array의 jobid가 parentId와 같을 경우
                  let s_parentJob = s_sortWkData.find(pJob => pJob.id == sParentId);
                  if (s_parentJob != undefined) {
                    var idx = value.parentId.indexOf(sParentId)
                    // parentId를 해당 parentJob의 jobId로 변경
                    value.parentId[idx] = s_parentJob.jobId
                    // cnt +1
                    value['cnt'] += 1
                  }
              }
              // 만약 cnt와 parentId길이가 같으면 최종 순서 job array에 push
              // 그리고 나머지 job array에서 해당 job 제거
              if (value.parentId.length == value['cnt']) {
                s_sortWkData.push(value);
                  var idx = s_nextJob.indexOf(value)
                  s_nextJob.splice(idx, 1)
              }

            
        }, [])
      }
      return s_sortWkData
    }
    
    // Wp 파일 저장 작업
    async saveWpFile(p_data: any, p_name: any) {
      let COM_ID: Record<string, number> = getCOM_ID();
      // 순서 정렬
      let s_groupId = `Workflow${this.o_workflowId}`
      let s_sortWkdata = await this.sortWorkflow(p_data);
      let s_code='';
      let s_livyScript = new WpLivyScript(s_groupId, 'None', 'False', this.o_execUser.USER_NO, this.o_execUser.USER_ID, this.o_execUser.USER_MODE, 'workflow');
      for (let data of s_sortWkdata) {
        let s_jobUiData = data['wp-data'].o_data;
        let s_tmpData = getPropertiesData(data.type, s_jobUiData);
        // Job별로 특별하게 필요한 파라미터는 모조리 여기에 넣음 (기본값 workflowId)
        let s_data: any = {
          workflowId: this.o_workflowId,
          user_param: this.o_userParam,
          filter: data.filter
        };
        if (data.type == COM_ID['I-FTP'] || data.type == COM_ID['I-DATABASE'] || data.type == COM_ID['O-DATABASE']) {
          // 접속정보
          s_data['connInfo'] = await global.WiseMetaDB.select('DS_MSTR', [], { DS_ID: s_jobUiData.dsId });
        } else if (data.type == COM_ID['O-DATASOURCE']){
          // DS_VIEW_MSTR, DS_VIEW_TBL_MSTR, DS_AUTH_USER_MSTR 작업하여 DS_VIEW_ID 가져오기
          let s_filename = await this.getOutputDsViewId(s_jobUiData)
          s_data['filename'] = s_filename;
        }  
        // else if (this.o_trainModelComIdList.includes(data.text)) {
        //   s_data['modelId'] = await this.getModelId(s_jobUiData.comId);
        // }
        let s_body = s_tmpData.getSparkParams(this.o_execUser, s_groupId, data.jobId, data.parentId, s_data)
        s_code = s_livyScript.addParamCode(JSON.stringify(s_body));
        s_code = s_livyScript.addFunctionCode(s_body['action']);
      }

      s_code = s_livyScript.addEndCode();
      let sFs = require('fs');
      sFs.writeFile(`./${p_name}.py`,s_code,'utf8', function(error:any) { 
              console.log('write end') ;
          });

      let s_wpSm = new WiseStorageManager(this.o_execUser);      

      let s_path = `/${this.o_execUser.USER_NO}/workflow`
      let s_filename = s_path + `/${p_name}.py`
      await s_wpSm.onMakeDir(s_path,'755',true);
      await s_wpSm.onWriteFile(s_filename, s_code,'buffer');
      await this.o_metaDb.update('WF_MSTR',{WF_PATH:`${s_wpSm.o_rootPath}${this.o_execUser.USER_NO}/workflow/${p_name}.py`}, { WF_ID: this.o_workflowId });
      return { workflowId: this.o_workflowId }
    }
    // 워크플로우 파일 저장 작업
    async saveWorkflowFile(p_data: any, p_name: any) {
      let COM_ID: Record<string, number> = getCOM_ID();
      // 순서 정렬
      let s_groupId = `Workflow${this.o_workflowId}`
      let s_sortWkdata = await this.sortWorkflow(p_data);
      let s_code='';
      let s_livyScript = new WpLivyScript(s_groupId, 'None', 'False', this.o_execUser.USER_NO, this.o_execUser.USER_ID, this.o_execUser.USER_MODE, 'workflow');
      for (let data of s_sortWkdata) {
        let s_jobUiData = data['wp-data'].o_data;
        let s_tmpData = getPropertiesData(data.type, s_jobUiData);
        // Job별로 특별하게 필요한 파라미터는 모조리 여기에 넣음 (기본값 workflowId)
        let s_data: any = {
          workflowId: this.o_workflowId,
          user_param: this.o_userParam,
          filter: data.filter
        };
        if (data.type == COM_ID['I-FTP'] || data.type == COM_ID['I-DATABASE'] || data.type == COM_ID['O-DATABASE']) {
          // 접속정보
          s_data['connInfo'] = await global.WiseMetaDB.select('DS_MSTR', [], { DS_ID: s_jobUiData.dsId });
        } else if (data.type == COM_ID['I-HDFS']) {
          s_data['connInfo'] = global.WiseAppConfig.WP_API; // default hdfs port
        } else if (data.type == COM_ID['O-DATASOURCE'] || data.type == COM_ID['O-IMAGE-DATASOURCE']) {
          // DS_VIEW_MSTR, DS_VIEW_TBL_MSTR, DS_AUTH_USER_MSTR 작업하여 DS_VIEW_ID 가져오기
          let s_filename = await this.getOutputDsViewId(s_jobUiData)
          s_data['filename'] = s_filename;
        } 
        // else if (this.o_trainModelComIdList.includes(data.text)) {
        //   s_data['modelId'] = await this.getModelId(s_jobUiData.comId);
        // }
        let s_body = s_tmpData.getSparkParams(this.o_execUser, s_groupId, data.jobId, data.parentId, s_data)
        s_code = s_livyScript.addParamCode(JSON.stringify(s_body));
        s_code = s_livyScript.addFunctionCode(s_body['action']);
      }
      // Develop + 고용노동부 workflow exception 부분 추가
      s_code = s_livyScript.addWfEndCode();
      s_code = s_livyScript.addEndCode();

      let s_wpSm = new WiseStorageManager(this.o_execUser, global.WiseStorage);      

      let s_path = `/${this.o_execUser.USER_NO}/workflow`
      let s_filename = s_path + `/${p_name}.py`
      await s_wpSm.onMakeDir(s_path,'755',true);
      let buffer = Buffer.from(s_code, 'utf-8');
      await s_wpSm.onWriteFile(s_filename, buffer,'buffer');
      await this.o_metaDb.update('WF_MSTR',{WF_PATH:`${s_wpSm.o_rootPath}${this.o_execUser.USER_NO}/workflow/${p_name}.py`}, { WF_ID: this.o_workflowId });
      return { workflowId: this.o_workflowId }
    }

    async getModelId(p_comUuid: string) {
      try {
        // comId로 모델ID가 존재하는지 조회
        // 반복 실행시 동일한 모델 ID가 되도록 함.
        let s_exist = await global.WiseMetaDB.select('DP_MODEL_WORKFLOW_USE_MSTR', [], { COM_UUID: p_comUuid }, [['MODEL_ID', 'DESC'], ['MODEL_IDX', 'DESC']]);
        let s_modelId = ""
        // 길이가 0이면 신규
        if (s_exist.length == 0) {
          let s_DP_MODEL_MSTR: DP_MODEL_MSTR_ATT = {
            DEL_YN: "N",
            REG_USER_NO: this.o_execUser.USER_NO
          };
          let s_dpModelMstrResult = await global.WiseMetaDB.insert('DP_MODEL_MSTR', s_DP_MODEL_MSTR, false);
          s_modelId = s_dpModelMstrResult.MODEL_ID;
          // DP_MODEL_WORKFLOW_USE_MSTR 작업은 saveWorkflowModel 내부로 이동함.
        } else {
          s_modelId = s_exist[0].MODEL_ID;
        }

        return s_modelId;
      } catch (error) {
        console.log(error)
      }
    }

    chkTrainModelResult(){
      return new Promise((resolve, reject) => {
        let s_modelCnt = this.o_modelId.length;
        if (s_modelCnt > 0) {
          let s_modelIdString = `("${this.o_modelId.join('","')}")`;
          let s_query = `SELECT * FROM DP_MODEL_MSTR WHERE MODEL_ID IN ${s_modelIdString} AND MODEL_IDX > 0 GROUP BY MODEL_ID`;
          let s_retry = 0;
          let sInterval = setInterval(() => {
            console.log("s_retry ", s_retry)
            if (s_retry > 10) {
              resolve(false);
              clearInterval(sInterval);
            } else {
              global.WiseMetaDB.query(s_query, 'DP_MODEL_MSTR').then((p_result) => {
                if (p_result.length >= s_modelCnt) {
                  resolve(true);
                  clearInterval(sInterval);
                } else {
                  s_retry ++;
                }
              })
            }
            clearInterval(sInterval);
          }, 1000);
        } else {
          resolve(true);
        }
      });
    }
  
  }
  