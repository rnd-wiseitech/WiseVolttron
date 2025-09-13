import {Sequelize} from 'sequelize-typescript';


export const Db2sqlConn =  (p_dbName:string, p_id:string, p_password:string,p_host:string,p_port:number) => {
    return new Sequelize(
            p_dbName,
            p_id,
            p_password,
            {
                'host': p_host, // 데이터베이스 호스트
                'port': p_port,
                'dialect': "db2", // 사용할 데이터베이스 종류
                "timezone": "+09:00",
                define: {
                    freezeTableName: true,
                    timestamps: false
                },
                pool: {
                    max: 100,
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                    evict: 10000
              
                },
                logging: false,
              }
        );
}

