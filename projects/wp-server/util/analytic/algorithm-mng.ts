import { Model, Op } from 'sequelize';
import { DP_ARG_PARAM_ATT } from "../../metadb/model/DP_ARG_PARAM";

/**
 * 알고리즘을 관리하는 클래스
 * 알고리즘을 등록,삭제 관리한다.
 * 
 * @example
  * ```ts
     
    let s_algorithmMng = new WpAlgorithmManagement();
    s_algorithmMng.getAlgorithmList(s_body).then(p_result=>{
           
      res.json(p_result.result);
           
    }).catch((p_error) => {
      next(p_error);
    });
 */
export class WpAlgorithmManagement {
    /**
    * 이 변수는 메타데이터베이스에 접속하여 조회 가능한 변수
    */
    public o_wiseMetaDb;
    constructor()
    {
        this.o_wiseMetaDb = global.WiseMetaDB;
    }

    load(){

    }
    /**
     * 알고리즘을 조회하는 함수
     *
     * @param p_where 변수는 알고리즘을 조회할 때 조건값을 입력
     * @returns 반환값을 Promise<WiseReturn>을 부여한다.
     */
    getAlgorithmList(p_where?: {}) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_where: any = { USE_YN: 'Y' };
                Object.assign(s_where, p_where);
                let s_layerModelArgData = await this.o_wiseMetaDb.select('DP_ARG_PARAM', ['ARG_ID'], {
                    PARAM: { [Op.like]: '%LAYER%' }
                });
                let s_blockModelArgData = await this.o_wiseMetaDb.select('DP_ARG_PARAM', ['ARG_ID'], {
                    PARAM: { [Op.like]: 'BLOCK_LAYER' }
                });
                let s_layerModelArgId: number[] = s_layerModelArgData.map((s_layerModel: DP_ARG_PARAM_ATT) => s_layerModel.ARG_ID);
                let s_blockModelArgId: number[] = s_blockModelArgData.map((s_blockModel: DP_ARG_PARAM_ATT) => s_blockModel.ARG_ID);
                
                let s_result = await this.o_wiseMetaDb.select('DP_ARG_MSTR', [], s_where);
                // LAYER_YN 값 추가(사용자 정의 알고리즘에서 사용)
                s_result = s_result.map((s_argmstrdata: Model) => {
                    let s_layerYn = s_layerModelArgId.includes(s_argmstrdata.dataValues.ARG_ID) ? 'Y' : 'N';
                    let s_blockYn = s_blockModelArgId.includes(s_argmstrdata.dataValues.ARG_ID) ? 'Y' : 'N';
                    s_argmstrdata.dataValues.LAYER_YN = s_layerYn;
                    s_argmstrdata.dataValues.BLOCK_YN = s_blockYn;
                    return s_argmstrdata.dataValues;
                });
                resolve({ isSuccess: true, result: s_result });
            } catch (p_error) {

                reject(p_error);
            }
        });
    }
    getWfAlgorithmList(p_where?: any) {
        return new Promise<WiseReturn>(async (resolve, reject) => {
            try {
                let s_query = `SELECT WP_ARG.ARG_ID, WP_ARG.ARG_TYPE, WP_ARG.ARG_NM, WF_ARG.TYPE
                                FROM DP_ARG_MSTR WP_ARG 
                                INNER JOIN COM_MSTR WF_ARG 
                                ON WP_ARG.ARG_NM = WF_ARG.NAME 
                                WHERE WP_ARG.USE_YN = 'Y' AND WF_ARG.CATEGORY = 'analytic_model'`;
                if (p_where) {
                    for(let s_key of Object.keys(p_where)){
                        s_query += `AND WF_ARG.${s_key} = '${p_where[s_key]}'`
                    }
                }
                let s_result = await this.o_wiseMetaDb.query(s_query, '', true);
                resolve({ isSuccess: true, result: s_result });
            } catch (p_error) {

                reject(p_error);
            }
        });
    }
    /**
     * 알고리즘의 하이퍼 파라메터를 조회하는 함수
     *
     * @param p_argId 알고리즘 아이디
     * @returns Promise<WiseReturn>
     */
    getHyperParameterList(p_argId?:any){
        return new Promise<WiseReturn>((resolve, reject) => {

            let s_where:any = {
                USE_YN : 'Y'
            }
            if(typeof p_argId != 'undefined')
                if (typeof p_argId == 'object')
                    s_where['ARG_ID'] = {[Op.or] : p_argId};
                else 
                    s_where['ARG_ID'] = p_argId;
            

            this.o_wiseMetaDb.select('DP_ARG_PARAM',[],s_where).then(p_result=>{
                resolve({isSuccess:true,result:p_result});
            }).catch(p_error=>{
                reject(p_error);
            })
        });
        
    }
}