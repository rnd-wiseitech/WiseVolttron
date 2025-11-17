import json
from pandas.api.types import is_integer_dtype, is_float_dtype, is_bool_dtype
import numpy as np
def excute(s_df, p_action, p_func, p_method, p_uuid, p_batch=False, s_code_result=None):
    # 기본 result 형식(배치일 때는 이게 그대로 나감)
    s_result = {
            "action" : p_func,
            "method": p_method,
            "data" : [],
            "schema" : [],
            "viewname": p_uuid,
            "count":  0
        }
    
    # 배치가 아닐 경우
    if p_batch == False:
        if p_action not in ['correlation', 'statistics', 'hive', 'upload', "spark", "model-filter", "model-compare", "workflow", "stream", "output", "manifest", "model-info", "model-history", "model-custom",  "model-predict-lang", "readfile", "function"]:
            s_schema = []
            try:
                for s_colName in s_df.columns :
                            s_metadata = {}
                            if is_integer_dtype(s_df.dtypes[s_colName]) == True:
                                s_type = 'integer'
                            elif is_float_dtype(s_df.dtypes[s_colName]) == True:
                                s_type = 'float'
                            elif is_bool_dtype(s_df.dtypes[s_colName]) == True:
                                s_type = 'boolean'
                            else: 
                                s_type = 'string'
                            s_columnData= s_df[s_colName].dropna()

                            # if p_action == 'model-train' :
                            #     s_nunique = s_columnData.nunique()
                            #     if s_nunique <= 100 :
                            #         s_unique = s_columnData.unique()
                            #         s_metadata['probaColumn'] = list(s_unique)
                            
                            s_schema.append({
                                "metadata":s_metadata,
                                "name":s_colName,
                                "nullable":'true',
                                "type": s_type
                                # "type":str(s_df.dtypes[s_colName])
                            })
            except: 
                pass
            if p_action in ['api', 'chart', 'eda', 'image-read'] or p_method == 'I-IMAGE-STORAGE':
                s_data = s_df.to_json(orient='records', lines=True, force_ascii=False).splitlines()
                
            # elif p_method == 'I-IMAGE-STORAGE':
            #     s_data ={'filePath' : s_df['filePath'][0], 'fileName' : json.loads(s_df['fileName'][0])}
            #     # s_schema = [s_df['schema'][0]]
            #     # s_df = s_data['fileName']
               
            else:
                s_data = []
                try:
                    s_data = s_df.head(20).to_json(orient='records', lines=True, force_ascii=False).splitlines()
                except:
                     pass

            s_result = {
                        "action" : p_func,
                        "method": p_method,
                        "data" : s_data,
                        "schema" : s_schema,
                        "viewname": p_uuid,
                        "count":  len(s_df)
                    }
            # code_result 추가
            if p_func in ['python', 'feature-importance', 'model-process']:
                s_result['code_result'] = s_code_result
                
            s_result['schema'] = s_schema
            s_result['data'] = s_data
            s_result['count'] =  len(s_df)
        else:
            if s_df is None:
                s_df = []
                
            # if p_action not in ['statistics', 'hive']:
            #     s_count = 1
            # else:
            #     s_count = len(s_df)
            s_count = 1
            s_result['data'] = s_df
            s_result['count'] =  s_count


    return s_result