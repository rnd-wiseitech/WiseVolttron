export enum DS_CONNECT_TYPE {
    DB = "db",
    FTP = "ftp",
    SFTP = "sftp",
    HDFS = "hdfs",
    OBJECT = "object"
}
export enum OBJECT_SUPPORT_TYPE {
    AWS = "aws",
    GOOGLE = "google",
    AZURE = "azure",
    LOCAL = "local"
}

export enum DB_SUPPORT_TYPE {
    ORACLE = "oracle",
    POSTGRESQL = "postgresql",
    DB2 = "db2",
    MYSQL = "mysql",
    MSSQL = "mssql",
    TIBERO = "tibero"
}

export function getJson (enumObj: any): any {
    return Object.keys(enumObj).map(key => ({
      label: key,
      value: enumObj[key]
    }));
}
export function getEnumValues<T>(enumObj: T): string[] {
    return Object.values(enumObj);
}

export function getEnumKeys<T>(enumObj: T): string[] {
    return Object.keys(enumObj).filter(key => isNaN(Number(key)));
}
