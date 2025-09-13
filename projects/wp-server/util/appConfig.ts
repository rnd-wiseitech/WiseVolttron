
import * as path from "path";
import * as fs from 'fs';
import { WP_CONFIG, WP_DB_ATT } from "../wp-type/WP_CONN_ATT";
import { Dialect } from "sequelize";

/**
 * 플랫폼에서 사용되는 접속 정보 및 환경 설정을 관리하는 클래스
 * 
 * assets폴더의 config 파일을 읽어와 설정한다.
 * 
 * @example
 * ```ts
 *  let o_appconfig = new WiseAppConfig();
 *  {
 *      "NODE": {
 *          "host": "localhost",
 *          "port": "8800"
 *       },
 *       "META_DB": {
 *           "host": "localhost",
 *           "port": "3306",
 *           "id": "root",
 *           "passwd": "wise1012",
 *           "db": "WISE_PROPHET_V1",
 *           "type": "mysql"
 *       },
 *       "WP_API": {
 *           "host": "54.180.83.158",
 *           "port": "1337"
 *       },
*        "STORAGE_TYPE":"LOCAL",
*        "LANG": "ko",
*        "BACKGROUND": false,
*        "PLATFORM_ID": 1010,
*        "ADVANCE": true,
*        "CLOUD": false,
*        "CRON": false,
*        "LICENSE": "U2FsdGVkX19vVNpbWKr9k1p2+Nvx5MBwS8qd7/WYHuJA+OGIZGHd2f1U8CUs8UYQ"
*    }
* ```
*/

export class WiseAppConfig {

    private o_appConfig:WP_CONFIG;
    private o_myPath:string;
    
    constructor() {
        this.o_myPath = path.resolve("./assets", "config", "app.config.json");
        this.o_appConfig = JSON.parse(fs.readFileSync(this.o_myPath, 'utf8'));        
    }
    getConfig(){
        return this.o_appConfig;
    }
    reload(){
        this.o_appConfig = JSON.parse(fs.readFileSync(this.o_myPath, 'utf8'));
        return this.o_appConfig;
    }
    writeConfig(){
        let myPath = path.resolve("./assets", "config", "app.config.json");
        let sResult = fs.writeFileSync(myPath,JSON.stringify(this.o_appConfig, null, 4));
        return sResult;
    }
    getStorageType(){
        return this.o_appConfig.STORAGE_TYPE;
    }
    getConfigValue(pKey:string){
        let sTmpConfig:any = this.o_appConfig;
        return sTmpConfig[pKey];
    }
    getLdapPort() {
        return this.o_appConfig.LDAP.port;
    }
    getWpApiIp(){
        return this.o_appConfig.WP_API.host;
    }
    getWpApiPort(){
        return this.o_appConfig.WP_API.port;
    }
    // #203
    getPyApiIp(){
        return this.o_appConfig.PY.host;
    }
    getPyApiPort(){
        return this.o_appConfig.PY.port;
    }
    getKafkaIp(){
        return this.o_appConfig.KAFKA.host;
    }
    getKafkaTopicPort(){
        return this.o_appConfig.KAFKA.topics_port;
    }
    getKafkaConnectorPort(){
        return this.o_appConfig.KAFKA.connectors_port;
    }
    getPlatformId(){
        return this.o_appConfig.PLATFORM_ID;
    }
    getNodeIp() {
        return this.o_appConfig.NODE.host;
    }
    getNodePort() {
        return this.o_appConfig.NODE.port;
    }
    getDbInfo() {
        return this.o_appConfig.META_DB;
    }
    getHiveDbInfo() {
        return this.o_appConfig.HIVE_DB;
    }
    getDbHost() {
        return this.o_appConfig.META_DB.host;
    }
    getDbPort() {
        return this.o_appConfig.META_DB.port;
    }
    getDbId() {
        return this.o_appConfig.META_DB.id;
    }
    getDbPasswd() {
        return this.o_appConfig.META_DB.passwd;
    }
    getDbName() :string{
        return this.o_appConfig.META_DB.db;
    }
    getDbType() :Dialect {
        return this.o_appConfig.META_DB.type;
    }
    // 이중화여부
    getLoadBalancer() {
        return this.o_appConfig.LOAD_BALANCER;
    }

    // WPLAT-76 NAT IP 사용 시에 CRON(스케줄)에서는 원래 서버 IP를 사용하도록 함.
    // getOriginIp() {
    //     return this.o_appConfig['PATH']['ORIGIN_IP']['host'];
    // }
    // getOriginPort() {
    //     return this.oAppConfig['PATH']['ORIGIN_IP']['port'];
    // }
    
    setStorageType(pValue:string){
        this.o_appConfig.STORAGE_TYPE = pValue;
    }
    setLdapPort(pValue:number) {
        this.o_appConfig.LDAP.port = pValue;
    }
    setWpApiIp(pValue:string){
        this.o_appConfig.WP_API.host = pValue;
    }
    setWpApiPort(pValue:number){
        this.o_appConfig.WP_API.port = pValue;
    }
    // #203
    setPyApiIp(pValue:string){
        this.o_appConfig.PY.host = pValue;
    }
    setPyApiPort(pValue:number){
        this.o_appConfig.PY.port = pValue;
    }
    setKafkaIp(pValue:string){
        this.o_appConfig.KAFKA.host = pValue;
    }
    setKafkaTopicPort(pValue:number){
        this.o_appConfig.KAFKA.topics_port = pValue;
    }
    setKafkaConnectorPort(pValue:number){
        this.o_appConfig.KAFKA.connectors_port = pValue;
    }
    setPlatformId(pValue:number){
        this.o_appConfig.PLATFORM_ID = pValue;
    }
    setNodeIp(pValue:string) {
        this.o_appConfig.NODE.host = pValue;
    }
    setNodePort(pValue:number) {
        this.o_appConfig.NODE.port = pValue;
    }
    setDbInfo(pValue:WP_DB_ATT) {
        this.o_appConfig.META_DB = pValue;
    }
    setHiveDbInfo(pValue:WP_DB_ATT) {
        this.o_appConfig.HIVE_DB = pValue;
    }
    setHiveDbIp(pValue:string) {
        this.o_appConfig.HIVE_DB.host = pValue;
    }
    setHiveDbPort(pValue:number) {
        this.o_appConfig.HIVE_DB.port = pValue;
    }
    setDbHost(pValue:string) {
        this.o_appConfig.META_DB.host = pValue;
    }
    setDbPort(pValue:number) {
        this.o_appConfig.META_DB.port = pValue;
    }
    setDbId(pValue:string) {
        this.o_appConfig.META_DB.id = pValue;
    }
    setDbPasswd(pValue:string) {
        this.o_appConfig.META_DB.passwd = pValue;
    }
    setDbName(pValue:string) {
        this.o_appConfig.META_DB.db = pValue;
    }
    setDbType(pValue:Dialect) {
        this.o_appConfig.META_DB.type = pValue;
    }
    // 이중화여부
    setLoadBalancer(pValue:boolean) {
        this.o_appConfig.LOAD_BALANCER = pValue;
    }
}