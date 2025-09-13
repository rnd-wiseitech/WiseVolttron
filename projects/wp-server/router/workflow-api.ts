import express, { NextFunction, Request, Response } from 'express';
import { DS_MSTR_ATT } from '../metadb/model/DS_MSTR';
import { WF_MSTR_ATT } from '../metadb/model/WF_MSTR';
import { DatabaseManagement } from '../util/database-mng/database-mng';
// import { WpKafkaApiManager } from '../util/spark-api/kafka-api-mng';
import { WpSparkApiManager } from '../util/spark-api/spark-api-mng';
import { WpModelManagement } from '../util/model-mng/model-mng';
// import { WpSparkApiManager } from '../util/volttron/spark-api-mng';
import { col, fn } from 'sequelize';

import { JobMstr, JOB_ATT } from '../util/job/job';
import * as path from "path";
import moment from 'moment';

export const workflowRoute = express.Router();




workflowRoute.post('/getWorkflowList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {

    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    // #114 워크플로우 Id 기준으로 불러오기
    let s_wfId = s_body.wfId;
    let s_viewId = s_body.viewId;
    let s_viewIdx = s_body.viewIdx;
    let s_preview = s_body.preview;
    
     // #118 페이징 처리
    let s_itemCount = 10;
    let s_pageNum = s_body.pageNum ? s_body.pageNum : 1;
    let s_offset = 0;

    if (s_pageNum > 1) {
        s_offset = s_itemCount * (s_pageNum - 1);
    }
    
    if (s_viewId && s_viewIdx) {
        let s_option = { REG_USER: req.decodedUser.USER_NO, DS_VIEW_ID: s_viewId, DS_VIEW_IDX: s_viewIdx, OUTPUT_YN: 'Y' };

        // #28. 배치는 파일 index를 늘리지 않고 가장 최근 index에 업데이트를 함.
        // 그래서 wf_use_dataset에 해당 index에 대한 값이 2개 이상 생길 수 있음(워크플로우에서 돌렸을때 하나, 배치에서 하나)
        // 그래서 가장 최신으로 등록된(REG_DT DESC) 값 하나(LIMIT 1)를 불러옴.
        s_metaDb.select('WF_USE_DATASET',['WF_ID'], s_option, [['REG_DT', 'DESC']], 1).then(p_wfDataSet => {
            let s_findWfId = p_wfDataSet[0].WF_ID;
            s_metaDb.select('WF_MSTR',[], { REG_USER: req.decodedUser.USER_NO, WF_ID: s_findWfId }).then(p_wfMstr => {
                res.json(p_wfMstr);
            }).catch(p_err => {
                console.log(p_err);
                next(p_err);
            });
        })
    }
    else if(s_body.wfId) {
        let s_query = `
          SELECT  * FROM WF_MSTR WHERE WF_ID=${s_body.wfId} AND DEL_YN = 'N'

          `

        s_metaDb.query(s_query, 'WF_MSTR').then(p_wfMstr => {
            res.json(p_wfMstr);
        }).catch(p_err => {
            console.log(p_err);
            next(p_err);
        });
    } else {
      // #121 OUTPUT_YN 추가(사용자가 저장한 워크플로우만 불러옴) => WF_TYPE:save 으로 수정 
      let p_option = s_wfId ? { REG_USER: req.decodedUser.USER_NO, WF_ID: s_wfId, WF_TYPE: 'save' } : { REG_USER: req.decodedUser.USER_NO, WF_TYPE: 'save' };
      if (s_preview) {
        delete p_option['WF_TYPE'];
      }

      // #118 페이징 처리 페이지 번호 없으면 전체 데이터 불러오도록 함.
      let s_findOption = s_body.pageNum ? {
                                              where: p_option, 
                                              order: [['REG_DT', 'DESC']], 
                                              offset: s_offset, 
                                              limit: s_itemCount
                                          } : {
                                              where: p_option, 
                                              order: [['REG_DT', 'DESC']]
                                          };
      let s_query = `
        SELECT 
        CASE WHEN A.REG_USER =${req.decodedUser.USER_NO} THEN '소유' 
        ELSE '공유' END AS AUTHORITY,
        A.*,
        B.*,
        C.USER_ID
        FROM WF_MSTR A
        LEFT OUTER JOIN (SELECT * FROM DP_AUTH_USER_MSTR WHERE SHARE_TYPE='workflow' AND OWNER_USER_NO != ${req.decodedUser.USER_NO}) B 
        ON A.WF_ID = B.DATA_ID
        INNER JOIN DP_USER_MSTR C ON A.REG_USER = C.USER_NO
        WHERE (A.REG_USER=${req.decodedUser.USER_NO} OR B.SHARER_USER_NO = ${req.decodedUser.USER_NO}) AND A.WF_TYPE='save' AND A.DEL_YN='N'
        ORDER BY AUTHORITY ASC, A.REG_DT DESC

        `

      s_metaDb.query(s_query, 'WF_MSTR').then(p_wfMstr => {
          res.json(p_wfMstr);
      }).catch(p_err => {
          console.log(p_err);
          next(p_err);
      });
  }
});

workflowRoute.post('/saveWorkflow',async (req: Request, res: Response<any>,next:NextFunction) => {

  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }  
  let s_jobParam :JOB_ATT = {
    jobId:'',
    clientId:'',
    data:s_body.wkCompData,
    token:req.decodedUser.USER_TOKEN
  };

  let s_jobMstr = new JobMstr(s_jobParam);

  await s_jobMstr.saveWorkflowMetaDb(s_body, req.decodedUser.USER_NO);
 
  s_jobMstr.saveWorkflowFile(s_body.wkCompData, s_body.wkName).then(p_result => {
    res.json(p_result)
  }).catch(p_err => {
    next(p_err)
  })
});

workflowRoute.post('/getWorkflowComInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let s_userno = req.decodedUser.USER_NO;
    // 워크플로우 로드했을 경우
    if(s_body.regUser != undefined && s_body.regUser != '') {
      s_userno =  s_body.regUser
    }
    s_metaDb.select('WF_COM_MSTR',[],{ REG_USER: s_userno, WF_ID: s_body.wfId }).then(p_wfComMstr => {
        res.json(p_wfComMstr);
    }).catch(p_err => {
        console.log(p_err);
        next(p_err);
    });
});

workflowRoute.post('/viewUseDataInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    let { sOption:s_option } = req.body;

    s_metaDb.select('WF_MSTR',['WF_ID', 'WF_TYPE'],{ REG_USER: req.decodedUser.USER_NO,  WF_TYPE: 'save' }).then(p_wfMstr => {
        
        let s_tmpList:any = [];
        
        p_wfMstr.forEach((p_wfData:WF_MSTR_ATT) => {
            s_tmpList.push(p_wfData.WF_ID);
        });

        s_option['REG_USER'] = req.decodedUser.USER_NO;
        s_option['WF_ID'] = s_tmpList;

        s_metaDb.select('WF_USE_DATASET',[[fn('DISTINCT', col('WF_ID')), 'WF_ID'],
            'WF_NM',
            'DS_VIEW_ID',
            'DS_VIEW_IDX'],s_option).then(p_wfMstr => {
                res.json(p_wfMstr);
        });
        
    }).catch(p_err => {
        console.log(p_err);
        next(p_err);
    });
});

workflowRoute.post('/viewDbList', async (req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let s_dbInfo:DS_MSTR_ATT = {
    DS_ID : 0,
    DBMS_TYPE : s_body.connectData.type,
    USER_ID : s_body.connectData.username,
    PASSWD : s_body.connectData.password, 
    DB_NM: s_body.connectData.database,
    IP : s_body.connectData.ip, 
    PORT : s_body.connectData.port
  };

  let s_dbMng = new DatabaseManagement(s_dbInfo);
  await s_dbMng.onInit();

  s_dbMng.getDbInfo().then(p_dbList=>{

    let s_dbList:any = [];

    p_dbList.forEach((s_dbNms:any) => {
      s_dbList.push(s_dbNms[Object.keys(s_dbNms)[0]]);
    })
    res.json(s_dbList);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

workflowRoute.post('/viewTbList', async (req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }
  // WPLAT-376
  if(s_body.connectData.type == 'postgresql') {
    s_body.connectData.owner = s_body.connectData.connection_name;
  }
  let s_dbInfo:DS_MSTR_ATT = {
    DS_ID : 0,
    DBMS_TYPE : s_body.connectData.type,
    USER_ID : s_body.connectData.username,
    PASSWD : s_body.connectData.password, 
    DB_NM: s_body.connectData.database,
    IP : s_body.connectData.ip, 
    PORT : s_body.connectData.port,
    OWNER_NM: s_body.connectData.owner,
  };

  let s_dbMng = new DatabaseManagement(s_dbInfo);
  await s_dbMng.onInit();

  s_dbMng.getTableInfo(s_body.connectData.connection_name, s_dbInfo.DS_ID).then(p_tblList=>{

    let s_List:any = [];

    p_tblList.forEach((s_dbNm:any) => {
      s_List.push(s_dbNm.TBL_NM);
    })
    res.json(s_List);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

workflowRoute.post('/viewColInfo',async (req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }
  //WPLAT-376
  if(s_body.connectData.type == 'postgresql') {
    s_body.connectData.owner = s_body.connectData.connection_name;
  }
  let s_dbInfo:DS_MSTR_ATT = {
    DS_ID : 0,
    DBMS_TYPE : s_body.connectData.type,
    USER_ID : s_body.connectData.username,
    PASSWD : s_body.connectData.password, 
    DB_NM: s_body.connectData.database,
    IP : s_body.connectData.ip, 
    PORT : s_body.connectData.port,
    OWNER_NM: s_body.connectData.owner,
  };

  let s_dbMng = new DatabaseManagement(s_dbInfo);
  await s_dbMng.onInit();

  s_dbMng.getColumnInfo(s_body.connectData.connection_name,s_body.connectData.table_name).then(p_colList=>{
    res.json(p_colList);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

workflowRoute.post('/editWorkflow',(req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let { wfId: s_wfId, wfNm: s_wfNm, delYN: s_delYN, wfPath : s_wfPath } = req.body;

  let s_updateData:any = {};
  if (s_wfNm) {
    s_updateData.WF_NM = s_wfNm;
  }
  if (s_delYN) {
    s_updateData.DEL_YN = s_delYN;
  }
  if (s_wfPath){
    let s_path = path.dirname(s_wfPath);
    let s_fileNm = `${s_wfNm}.py`
    let s_newFilePath = `${s_path}/${s_fileNm}`
    s_updateData.WF_PATH = s_newFilePath
    
    let s_params = {
      path : s_wfPath,
      newPath : s_newFilePath
    }
    let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);
    s_sparkApiMng.onCallApi('/storage/workflowRename',JSON.stringify(s_params)).then((p_result:any) => {
        res.json(p_result);
    })
  } 
  
  s_metaDb.update('WF_MSTR',s_updateData, { REG_USER: req.decodedUser.USER_NO, WF_ID: s_wfId }).then(p_colList=>{
    res.json(p_colList);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// #154 Job 실행 상태 조회
workflowRoute.post('/getJobStatus',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  s_metaDb.select('JOB_SUB_MSTR',[],{ ID: s_body.sGroupId }).then(p_jobList => {
      res.json(p_jobList);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});



// #154 선택한 컬럼의 distinct value select
workflowRoute.post('/getDistinctValue',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }
  
  let  s_params = {
    "action": "transform",
    "method": "distinct",
    "userno": req.decodedUser.USER_NO,
    "userId": req.decodedUser.USER_ID,
    "usermode": req.decodedUser.USER_MODE,
    "groupId": "transform_distinct", // WPLAT-209 spark 로직 변경으로 적용
    "jobId": s_body.jobId,
    "location": "workflow",
    "data": {
      "usetable": `${req.decodedUser.USER_NO}_${s_body.groupId}_${s_body.jobId}`,
      "column": s_body.target_column
    }
  };

  let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);

  s_sparkApiMng.onCallApi('/job',JSON.stringify(s_params)).then((p_topic:any) => {
    
    res.json(p_topic);

  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// 가장 최근 실행된 출력 파일 정보 조회
workflowRoute.post('/getRecentOutputInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  s_metaDb.select('WF_USE_DATASET',[],{ REG_USER: req.decodedUser.USER_NO, OUTPUT_YN: 'Y' },[['WF_ID', 'DESC'] ],1).then(p_wfDataSet => {
      res.json(p_wfDataSet);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// #179 모델 실행 정보 저장
workflowRoute.post('/saveModelInfo',(req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.pParams != undefined) {
      s_body = s_body.pParams;
  }
  let s_modelMng = new WpModelManagement(req.decodedUser);

  s_modelMng.saveWkUseModel(s_body).then(p_wfDataSet => {
      res.json({ success: p_wfDataSet.isSuccess, MODEL_ID : p_wfDataSet.result.MODEL_ID, MODEL_IDX : p_wfDataSet.result.MODEL_IDX });
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// 모델 결과 조회
workflowRoute.post('/getModelResult', (req: Request, res: Response<any>, next: NextFunction) => {

  let s_analComIdList = req.body['analComIdList'];
  let s_modelIdDataList = req.body['modelIdDataList'];

  let s_modelMng = new WpModelManagement(req.decodedUser);
  s_modelMng.getWkModelResult(s_analComIdList, s_modelIdDataList).then(p_wkModelResult => {
    if (p_wkModelResult.isSuccess){
      res.json(p_wkModelResult.result);
    } else {
      res.json([]);
    }
  }).catch(p_err => {
    console.log(p_err);
    next(p_err);
  });
})

// 모델 파라미터
workflowRoute.post('/getModelParams', (req: Request, res: Response<any>, next: NextFunction) => {

  let s_analComIdList = req.body['analComIdList'];
  let s_modelIdDataList = req.body['modelIdDataList'];

  let s_modelMng = new WpModelManagement(req.decodedUser);
  s_modelMng.getWkModelParams(s_analComIdList, s_modelIdDataList).then(p_wkModelParams => {
    res.json(p_wkModelParams);
  }).catch(p_err => {
    console.log(p_err);
    next(p_err);
  });
})

// #203 Spark View Table 조회
workflowRoute.post('/viewtable',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let s_params = {
    "action": "manage",
    "method": "VIEWTABLE",
    "userno" : req.decodedUser.USER_NO,
    "userId": req.decodedUser.USER_ID,
    "usermode": req.decodedUser.USER_MODE,
    "groupId" : s_body.groupId,
    "jobId" : s_body.jobId,
    "location": "workflow",
    "data": {
      "usetable": `${req.decodedUser.USER_NO}_${s_body.usetable}`
    }
  };

  let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);

  s_sparkApiMng.onCallApi('/job',JSON.stringify(s_params)).then((p_result:any) => {
    
    res.json(p_result);

  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// 파이썬 코드 조회
workflowRoute.post('/getPythonResult',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let s_params = {
    action: "transform",
    method: "python",
    userno : req.decodedUser.USER_NO,
    userId: req.decodedUser.USER_ID,
    usermode: req.decodedUser.USER_MODE,
    groupId: 'transform_python', // WPLAT-209 spark api 수정 반영
    jobId : s_body.jobId,
    location: "workflow",
    data : {
      usetable: `${req.decodedUser.USER_NO}_${s_body.usetable_groupId}_${s_body.usetable_jobId}`,
      value: s_body.value,
    }
  };

  let s_sparkApiMng = new WpSparkApiManager(global.WiseAppConfig);

  s_sparkApiMng.onCallApi('/job',JSON.stringify(s_params)).then((p_result:any) => {
    
    res.json(p_result);

  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});


// 사용자 파라미터 조회
workflowRoute.post('/getUserParam',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let s_option = s_body.PARAM_NM ? { REG_USER: req.decodedUser.USER_NO, PARAM_NM:s_body.PARAM_NM, DEL_YN: 'N' } : { REG_USER: req.decodedUser.USER_NO, DEL_YN: 'N' };

  s_metaDb.select('WF_USER_PARAM',[],s_option,[['REG_DT', 'DESC'] ]).then(p_wfUseParam => {
      res.json(p_wfUseParam);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// 사용자 파라미터 추가
workflowRoute.post('/addUserParam',(req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  let s_data = {
    PARAM_NM:s_body.PARAM_NM, 
    PARAM_VALUE:s_body.PARAM_VALUE, 
    PARAM_FORMAT:s_body.PARAM_FORMAT,
    REG_USER: req.decodedUser.USER_NO, 
    DEL_YN: 'N',
    REG_DT: moment().format('YYYY-MM-DD HH:mm:ss')
  };

  s_metaDb.insert('WF_USER_PARAM',s_data,false).then(p_insert => {
      res.json({ success: true, PARAM_ID: p_insert.PARAM_ID });
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

// 사용자 파라미터 추가
workflowRoute.post('/updateUserParam',(req: Request, res: Response<any>,next:NextFunction) => {
    
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }

  s_metaDb.update('WF_USER_PARAM',s_body,{ PARAM_ID : s_body.PARAM_ID }).then(p_update => {
      res.json({ success: true});
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});


workflowRoute.post('/getInputWorkflowList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
  let s_body = req.body;
  let s_metaDb = global.WiseMetaDB;
  let s_query = `
  SELECT WF_ID, WF_NM, WF_PATH FROM WF_MSTR WHERE REG_USER=${req.decodedUser.USER_NO} AND WF_TYPE ='save' AND DEL_YN='N' AND WF_PATH IS NOT NULL
  AND WF_ID NOT IN (SELECT DISTINCT WF_ID FROM WK_SCH_MSTR WHERE SCH_STATUS != 'BATCH_40' AND DEL_YN != 'Y') ORDER BY REG_DT DESC
  `
  s_metaDb.query(s_query, '', true).then(p_result => {
      res.json(p_result);
  }).catch(p_err => {
      console.log(p_err);
      next(p_err);
  });
});

  workflowRoute.post('/getInputWorkflowInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
    console.log("s_body : ", s_body);
    let s_metaDb = global.WiseMetaDB;
    let s_query = `
    SELECT * FROM WF_COM_MSTR WHERE WF_ID=${s_body.workflowId}
    `;
    console.log("s_query : ", s_query);
    s_metaDb.query(s_query, '', true).then(p_result => {
      console.log("p_result : ", p_result);
        res.json(p_result);
    }).catch(p_err => {
        console.log(p_err);
        next(p_err);
    });


});

workflowRoute.post('/getTransformList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {

  let s_metaDb = global.WiseMetaDB;

  s_metaDb.select('COM_MSTR',['ID', 'TYPE'],{CATEGORY: ['data_change', 'image_change']}).then(p_result=>{
      res.json(p_result);
  }).catch(p_error=>{
      next(p_error);
  });
});

// 컴포넌트 상위 연결 개수 반환
workflowRoute.post('/getComConnLimit',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {

  let s_body = req.body;
  let s_ID = s_body.ID;
  let s_metaDb = global.WiseMetaDB;

  s_metaDb.select('COM_MSTR',['ID', 'CONN_LIMIT'],{ID: s_ID}).then(p_result=>{
      res.json(p_result);
  }).catch(p_error=>{
      next(p_error);
  });
});