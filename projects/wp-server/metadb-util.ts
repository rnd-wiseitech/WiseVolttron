import { QueryTypes } from 'sequelize';
import * as fs from 'fs';
import { WiseMetaDB } from './metadb/WiseMetaDB';

export const createModelfile = ()  => {
    let a = new WiseMetaDB();

    let sQuery:string = ` c TABLE_NAME from INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'WISE_PROPHET_V1' order by 1 asc`;
    a.query(sQuery,'',{ type: QueryTypes.SELECT }).then(p=>{
    
        console.log(p);
        
        for(let sTblNm of p){
        console.log(`${__dirname}/../metadb/model/${sTblNm.TABLE_NAME}.ts`);
        console.log(fs.existsSync(`${__dirname}/../metadb/model/${sTblNm.TABLE_NAME}.ts`));
        
        sQuery = `SELECT A.TABLE_NAME AS 'TBL_NM'
                        , B.COLUMN_NAME AS 'COL_NM'
                        , B.DATA_TYPE AS 'DATA_TYPE'
                        , case DATA_TYPE when 'int' then CAST(NUMERIC_PRECISION AS char(50))
                                when 'float' then CAST(NUMERIC_PRECISION AS char(50))
                                else  CAST(CHARACTER_MAXIMUM_LENGTH AS char(50))
                            end AS 'LENGTH'  
                            , CAST(B.ORDINAL_POSITION AS char(50)) AS 'COL_ID'        
                            , case B.COLUMN_KEY when 'PRI' then CAST(1 AS char(10))
                                when 'MUL' then CAST(2 AS char(10)) 
                            end AS 'PK_YN'
                            , B.COLUMN_COMMENT AS 'COL_CAPTION'
                            , B.EXTRA AS 'OPTION'
                            , B.IS_NULLABLE AS 'NULL'
                        FROM INFORMATION_SCHEMA.TABLES A
                        INNER JOIN INFORMATION_SCHEMA.COLUMNS B ON A.TABLE_NAME = B.TABLE_NAME AND A.TABLE_SCHEMA = B.TABLE_SCHEMA
                        WHERE A.TABLE_SCHEMA = 'WISE_PROPHET_V1'
                        AND A.TABLE_NAME = '${sTblNm.TABLE_NAME}'
                        ORDER BY 1`;
                        let sColContent = '';
                        let sColContent2 = '';
                        a.query(sQuery,'',{ type: QueryTypes.SELECT }).then(p=>{
                        console.log('===================');
                        console.log(p);
                        console.log('===================');
    
                        for(let sColnm of p){
                            if(sColnm.PK_YN == '1'){
                                
                            sColContent = sColContent + `
    @Column({
        allowNull: false,
        primaryKey: true,
        ${sColnm.OPTION == 'auto_increment'? 'autoIncrement: true':''}
    })
    get ${sColnm.COL_NM}(): ${getType(sColnm.DATA_TYPE)} {
        return this.getDataValue('${sColnm.COL_NM}');
    }`;
    sColContent2 = sColContent2 + `${sColnm.COL_NM}: ${getType(sColnm.DATA_TYPE)};
    `;
                            }
                            else{
                            sColContent = sColContent + `
    @Column
    ${sColnm.COL_NM}?: ${getType(sColnm.DATA_TYPE)};                        
    `;

    sColContent2 = sColContent2 + `${sColnm.COL_NM}${sColnm.NULL == 'YES'?'?':''}: ${getType(sColnm.DATA_TYPE)};
    `;
                            }
                        }
    
                        let sClassContent = `
    import {Table, Model,Column } from "sequelize-typescript";
    @Table
    export class ${sTblNm.TABLE_NAME} extends Model {
        ${sColContent}
    }
    
    export interface ${sTblNm.TABLE_NAME}_ATT {
        ${sColContent2}
    }
    `;
    
    
                        fs.writeFileSync(`${__dirname}/../metadb/model/${sTblNm.TABLE_NAME}.ts`,sClassContent,'utf8')
                        });
          } 
    });    
};


export function getType(p_type:string) {
    let s_returnType = '';
    if(p_type == 'varchar' ||
    p_type == 'char' ||
    p_type == 'text' ||
    p_type == 'datetime' ||
    p_type == 'longtext' ||
    p_type == 'varchar' )
      s_returnType = 'string';
    else 
      s_returnType = 'number';
    
    return s_returnType;
  }