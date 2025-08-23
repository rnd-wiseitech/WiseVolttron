import { WpScheduleManagement } from "../util/schedule/schedule-mng"
import { WP_SESSION_USER } from "./WP_SESSION_USER"

export interface WiseCronJobInterface {  
    init(): void
    getAnalyticDataNm(p_userInfo:WP_SESSION_USER,p_schData:any):Promise<WiseReturn>
    add(p_schData:any, p_cronManager:any,p_userInfo:WP_SESSION_USER):void
    delete(p_schId:string,p_type?:string):void
    finish(p_schData:any, p_cronManager:any):void
    pause(p_schData:any):void
    run(p_schData:any):void
    checkJobInit(): void
    o_schMng: WpScheduleManagement;
}