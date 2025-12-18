import express, { NextFunction, Request, Response } from 'express';
import { Op, Transaction } from 'sequelize';
import { DataType, Sequelize } from 'sequelize-typescript';
import { WpError, WpHttpCode } from '../exception/WpError';
import { WpAlgorithmManagement } from '../util/analytic/algorithm-mng';
import { WpModelManagement } from '../util/model-mng/model-mng';

// import { WP_MODEL } from '../wp-type/WP_MODEL';
import { WiseStorageManager } from '../util/data-storage/WiseStorageManager';
import { WpScheduleManagement } from '../util/schedule/schedule-mng';
import { load as loadYaml } from 'js-yaml'
import * as request from "request";

const csv = require("fast-csv");
const moment = require('moment');
const Stopwatch = require('statman-stopwatch');

export const modelRoute = express.Router();

modelRoute.post('/parameterList',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    s_sw.start();

    let s_algorithmMng = new WpAlgorithmManagement();
    s_algorithmMng.getHyperParameterList(s_body).then(p_result=>{
       
        res.json(p_result.result);
        
    }).catch((p_error) => {
        next(p_error);
    });
});

//알고리즘 리스트로 바꿔야됨
modelRoute.post('/argList',(req: Request, res: Response,next:NextFunction) => {


    let s_sw = new Stopwatch();
    let s_body = req.body;
    s_sw.start();

    let s_algorithmMng = new WpAlgorithmManagement();
    s_algorithmMng.getAlgorithmList(s_body).then(p_result=>{
        // let s_modelList = p_result.result.filter((s_model:any) => s_model.REG_USER_NO == req.decodedUser.USER_NO)
        let s_modelList = p_result.result.filter((s_model:any) => (s_model.REG_USER_NO == req.decodedUser.USER_NO || s_model.REG_USER_NO == null))
        
        res.json(s_modelList);

    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/argWorkFlowList',(req: Request, res: Response,next:NextFunction) => {
    let s_sw = new Stopwatch();
    let s_body = req.body;
    s_sw.start();
    
    let s_algorithmMng = new WpAlgorithmManagement();
    s_algorithmMng.getWfAlgorithmList(s_body).then(p_result=>{
        res.json(p_result);
    }).catch((p_error) => {
        next(p_error);
    });
});


modelRoute.post('/dsMstr',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    s_sw.start();
    
    s_metaDb.select('DS_MSTR',[],{ WF_YN:{[Op.is]:null}, DEL_YN:'N', TYPE:{[Op.in]:['sftp', 'ftp', 'hdfs']}}).then(p_result=>{

        res.json(p_result.result);
        
    }).catch((p_error) => {
        next(p_error);
    });
});



modelRoute.post('/satifiedInfo',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    
    let s_query = `SELECT 
                        VAR_CAPTION AS NAME, 
                        DATA_TYPE AS TYPE, 
                        VAR_TARGET_YN, 
                        RTRIM(VAR_MAJOR_YN) AS VAR_MAJOR_YN, 
                        RTRIM(VAR_IMPORT) AS VAR_IMPORT, 
                        VAR_PRE AS CLEANDATA 
                    FROM DP_VAR_MSTR WHERE MODEL_ID = '${s_body.modelId}' and MODEL_IDX = '${s_body.modelIdx}'`;
    
    s_metaDb.query(s_query,'DP_VAR_MSTR').then(p_result=>{
        
        res.json(p_result);
        
    }).catch((p_error) => {
        next(p_error);
    });
});


//모델 알고리즘 파라미터 가져옴(모델학습말고 모델관리에서 사용)

modelRoute.post('/modelArgParamList',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();

    s_metaDb.select('DP_SCH_LOG',[],{ 'MODEL_ID': s_body.modelId, 'MODEL_IDX': s_body.modelIdx },[Sequelize.fn('max', Sequelize.col('LOG_ID'))])
    .then(p_result=>{        
        if (p_result === null) {
            s_metaDb.select('DP_MODEL_MSTR',[],{ 'MODEL_ID': s_body.modelId, 'MODEL_IDX': s_body.modelIdx }).then(p_modelResult=>{
                res.json(JSON.parse(p_modelResult[0].get('MODEL_ARG_PARAM')));
            }).catch((p_error) => {
                next(p_error);
            });
        }
        else {
            res.json(p_result);
        }
    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/saveExeResult',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    
    s_metaDb.update('DP_MODEL_MSTR',
                    {EXCUTE_RESULT: JSON.stringify(s_body.exeResult)},
                    {MODEL_ID: s_body.modelId, MODEL_IDX: s_body.modelIdx}).then(p_result=>{        
        res.json(p_result.result);
    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/saveDataUseMstr',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_metaDb = global.WiseMetaDB;
    let s_dtsetNm = '';

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    
    if(s_body.FILETYPE == 'single'){
        s_dtsetNm = s_body.DATASET_NAME;
    }

    s_metaDb.insert('DP_MODEL_DATASET_USE_MSTR',{
        DATASET_TYPE: s_body.DATASET_TYPE,
        DATASET_NAME: s_dtsetNm,
        DATASET_REF_ID: s_body.DATASET_REF_ID,
        MODEL_ID:s_body.MODEL_ID
    },false).then(p_result=>{

        if(s_body.FILETYPE == 'multi'){

            let s_datasetId = p_result.DATASET_ID;
            let s_dtsetNmArr = s_body.DATASET_NAME;
            let s_dtsetUseExTemp = [];
            
            for(let sIdx of s_dtsetNmArr){
                let s_dtsetItem = {
                    DATASET_ID: s_datasetId,  
                    DATASET_EX_NAME: sIdx, 
                    MODEL_ID: s_body.MODEL_ID
                }
                s_dtsetUseExTemp.push(s_dtsetItem);
            }

            s_metaDb.insert('DP_MODEL_DATASET_USE_EX_MSTR',s_dtsetUseExTemp,true).then(p_exResult=>{
                res.json({ result: true, message: '등록 완료' });
            }).catch((p_error) => {
                next(p_error);
            });
        }

        res.json({ result: true, message: '등록 완료' });

    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/dpVarMstr',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    let s_metaDb = global.WiseMetaDB;
    
    s_metaDb.select('DP_VAR_MSTR',[],{MODEL_ID:s_body.modelId,MODEL_IDX:s_body.modelIdx}).then(p_result=>{
        res.json(p_result);
    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/dpVarExMstr',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    let s_metaDb = global.WiseMetaDB;
    
    s_metaDb.select('DP_VAR_STR_EX_MSTR',[],{MODEL_ID:s_body.modelId}).then(p_result=>{
        res.json(p_result);
    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/saveModelDesc',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    s_sw.start();
    let s_metaDb = global.WiseMetaDB;
    
    s_metaDb.update('DP_MODEL_MSTR',{DESC: s_body.DESC},{MODEL_ID:s_body.modelId}).then(p_result=>{
        res.json({result: true, message: '업데이트 완료'});
    }).catch((p_error) => {
        next(p_error);
    });
});


modelRoute.post('/getVarMstr', (req: Request, res: Response, next: NextFunction) => {

    let s_body = req.body;
    let s_modelId = req.body.modelId;
    let s_modelIdx = req.body.modelIdx;
    let s_where:any = {};
    if (!s_body.params) {
        s_body = s_body.params;
    }

    if (s_modelId) {
        s_where['MODEL_ID'] = s_modelId;
    }

    if (s_modelIdx) {
        s_where['MODEL_IDX'] = s_modelIdx;
    }

    let s_metaDb = global.WiseMetaDB;
    s_metaDb.select('DP_VAR_MSTR',[], s_where).then(p_varMstr => {
        res.json(p_varMstr);
    }).catch((p_error) => {
        next(p_error);
    });

});


modelRoute.post('/schManagement',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_searchWord = '';
    let s_modelId = '';

    if (s_body.params != undefined) {
        s_body = s_body.params;
    }

    if (s_body.modelId === undefined)
        s_searchWord = s_body.generalSearch;
    else
        s_modelId = s_body.modelId;

    s_sw.start();
    let s_schMng = new WpScheduleManagement(req.decodedUser);

    s_schMng.getSchModelList(s_modelId,s_searchWord).then(p_result=>{
        res.json(p_result.result);
    }).catch((p_error) => {
        next(p_error);
    });
});


modelRoute.post('/getModelConfig', (req: Request, res: Response, next: NextFunction) => {
    let s_body = req.body;
    let s_modelId = s_body.modelId;
    try {
        console.log('getModelConfig');
        let s_metaDb = global.WiseMetaDB;
        s_metaDb.select('DP_MODEL_MSTR', ['MLFLOW_PATH', 'MODEL_ID', 'MODEL_IDX', 'DEPLOY_URL'], { MODEL_ID: s_modelId }, [['MODEL_IDX', 'DESC']], 1).then(async p_modelResult => {

            let s_deployUrl = p_modelResult[0]['DEPLOY_URL'];
            if (!s_deployUrl){
                throw Error('모델 배포 URL이 없습니다.');
            }
            let s_artifactPath = '';
            try {
                s_artifactPath = p_modelResult[0]['MLFLOW_PATH'] + '/model/MLmodel';
            } catch (error) {
                // s_MLInfo = s_MLInfo.replace(/<RunInfo:/g, "{'").replace(/>/g, "}")
                //     .replace(/\=/g, "':").replace(/,/g, ",'").replace(/None/g, "null").replace(/\s/g, "").replace(/'/g, '"');
                // s_artifactUri = JSON.parse(s_MLInfo)['artifact_uri'];
            }

            let s_storageMng = new WiseStorageManager(req.decodedUser);
            s_storageMng.onReadFile(s_artifactPath).then((p_result) => {
                let s_modelConfig: any= loadYaml(p_result.result.toString('utf-8'));
                if (s_modelConfig.signature) {
                    if (s_modelConfig.signature.inputs) 
                        s_modelConfig.signature.inputs = JSON.parse(s_modelConfig.signature.inputs);
                    if (s_modelConfig.signature.outputs)
                        s_modelConfig.signature.outputs = JSON.parse(s_modelConfig.signature.outputs);
                }
                res.json({ isSuccess: true, result: { url: s_deployUrl, config: s_modelConfig} });
            })
        }).catch(p_error => {
            console.log("error", p_error);
            res.json({ isSuccess: false, result: p_error.message ? p_error.message : '' });  
        })

    } catch (p_error) {
        console.log("error", p_error);
        res.json({ isSuccess: false, result: '' });
    }
}); 

modelRoute.post('/getPredictResult', async (req: Request, res: Response, next: NextFunction) => {
    let s_body: any = {
        columns: [],
        data: []
    }
    let s_type: 'file' | 'raw' = req.body.type ? req.body.type : 'raw';
    let s_data = req.body.data;
    let s_url = req.body.url;
    let s_filepath = req.body.filepath;
    let s_options:any = {};
    

    if (s_type == 'raw') {
        if (!Array.isArray(req.body.data)) {
            s_body.columns = Object.keys(s_data);
            s_body.data = [Object.values(s_data)];
        }
        s_options = {
            url: `${s_url}/predict`,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(s_body)
        };
    }

    if (s_type == 'file') {
        let s_wpDsMng = new WiseStorageManager(req.decodedUser);
        let s_readData = await s_wpDsMng.onReadFile(s_filepath);
    
        s_options = {
            url: `${s_url}/predict_csv`,
            headers: { 'Content-Type': 'application/octet-stream' },
            body: s_readData.result
        };
    }

    request.post(s_options, (p_err: any, p_res: request.Response, body: any) => {
        if (p_err) {
            res.json({
                isSucess: false, result: new WpError({
                    httpCode: WpHttpCode.SERVER_UNKOWN_ERR, message: p_err.exception
                })
            });
        } else {
            res.json({ isSucess: true, result: body });
        }
    });
});

// 모델을 사용한 워크플로우 조회
modelRoute.post('/getModelWorkflow', (req: Request, res: Response, next: NextFunction) => {
    let s_body = req.body;
    let s_modelId = s_body.modelId;
    let s_modelIdx = s_body.modelIdx;

    try {
        let s_metaDb = global.WiseMetaDB;
        
        s_metaDb.select('DP_MODEL_MSTR', ['WF_ID'], { 'MODEL_ID': s_modelId}).then(s_result => {
            if (s_result.length == 0){
                res.json({ isSuccess: false, result: '해당 모델의 워크플로우가 존재하지 않습니다.' });  
            } else {
                s_metaDb.select('WF_MSTR', [], { WF_ID: s_result[0].dataValues.WF_ID }).then(s_modelResult => {
                    res.json({ isSuccess: true, result: s_modelResult });  
                }).catch(p_error => {
                    res.json({ isSuccess: false, result: p_error.message ? p_error.message : '' });
                })
            }
        }).catch(p_error => {
            res.json({ isSuccess: false, result: p_error.message ? p_error.message : '' });
        })
        
    } catch (p_error) {
        console.log("error", p_error);
        res.json({ isSuccess: false, result: '' });
    }
});


modelRoute.post('/getRestUrl', (req: Request, res: Response, next: NextFunction) => {
    let s_body = req.body;
    let s_userNo = s_body.USER_NO;
    try {
        let results = {
            userNo: s_userNo
        };
        res.json(results);
    } catch (p_error) {
        console.log("error", p_error);
        res.json({ isSuccess: false, result: '' });
    }
});

modelRoute.post('/getModelList',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_searchWord = '';
    let s_modelId = '';

    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.getModelList(req.decodedUser).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/getModelHistory',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_searchWord = '';
    let s_modelId = '';

    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.getModelHistory(s_body.modelId).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/getArgParam',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }  
  let s_metaDb = global.WiseMetaDB;

  // 단일 값을 배열로 변환
  let s_argId = s_body.ARG_ID;
  if (!Array.isArray(s_argId)) {
    s_argId = [s_argId];
  }
  s_metaDb.select('DP_ARG_PARAM',['ARG_ID', 'PARAM'],{ARG_ID: {[Op.in]: s_argId}}).then(p_result=>{
      res.json(p_result);
  }).catch(p_error=>{
      next(p_error);
  });
})

modelRoute.post('/checkModelName',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
  let s_body = req.body;

  if (s_body.params != undefined) {
      s_body = s_body.params;
  }  
  let s_metaDb = global.WiseMetaDB;

  s_metaDb.select('DP_MODEL_MSTR',['MODEL_ID'],{MODEL_NM: s_body.MODEL_NM, DEL_YN:'N', REG_USER_NO:req.decodedUser.USER_NO}).then(p_result=>{
      res.json(p_result);
  }).catch(p_error=>{
      next(p_error);
  });
})

modelRoute.post('/getArgInfo',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
  
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }  
    let s_metaDb = global.WiseMetaDB;
  
    s_metaDb.select('DP_ARG_MSTR',[],{ARG_ID: s_body.ARG_ID}).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
  })
  
  modelRoute.post('/getEnsembleArgList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_body = req.body;
  
    if (s_body.params != undefined) {
        s_body = s_body.params;
    }  
    let s_metaDb = global.WiseMetaDB;
  
    s_metaDb.select('DP_ARG_MSTR',[],{ARG_TYPE: s_body.ARG_TYPE, ENSEMBLE_YN:'Y', USE_YN:'Y'}).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
  });

  modelRoute.post('/getOverwriteModelList',(req: Request, res: Response<WiseReturn>,next:NextFunction) => {
    let s_metaDb = global.WiseMetaDB;
  
    s_metaDb.select('DP_MODEL_MSTR',['MODEL_NM'],{DEL_YN: 'N', REG_USER_NO:req.decodedUser.USER_NO}).then(p_result=>{
        res.json(p_result);
    }).catch(p_error=>{
        next(p_error);
    });
  })



  modelRoute.post('/getCustomModelList',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_searchWord = '';
    let s_modelId = '';

    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.getCustomModelList(req.decodedUser).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});


modelRoute.post('/addCustomModel',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;


    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.addCustomModel(req.decodedUser, s_body.p_param).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});


modelRoute.post('/updateCustomModel',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();
    let s_body = req.body;
    let s_param = s_body.p_param;
    let s_cond = s_body.p_cond;

    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.updateCustomModel(req.decodedUser, s_param, s_cond).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});

modelRoute.post('/getTrainCustomModelList',(req: Request, res: Response,next:NextFunction) => {

    let s_sw = new Stopwatch();

    s_sw.start();
    let s_modelMng = new WpModelManagement(req.decodedUser);
    
    s_modelMng.getTrainCustomModelList(req.decodedUser).then(p_result=>{
        res.json(p_result);

    }).catch((p_error) => {
        next(p_error);
    });
});