
import * as path from "path";
import * as fs from 'fs';
import { WP_CONFIG, WP_DB_ATT } from "../wp-type/WP_CONN_ATT";
import { Dialect } from "sequelize";


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
    getWpApiIp(){
        return this.o_appConfig.WP_API.host;
    }
    getWpApiPort(){
        return this.o_appConfig.WP_API.port;
    }
    getPyApiIp(){
        return this.o_appConfig.PY.host;
    }
    getPyApiPort(){
        return this.o_appConfig.PY.port;
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
}