from pandas.api.types import is_integer_dtype, is_float_dtype, is_bool_dtype

def getSchemaData(p_df):
    s_schema = []
    
    for s_colName in p_df.columns :
        if is_integer_dtype(p_df.dtypes[s_colName]) == True:
            s_type = 'integer'
        elif is_float_dtype(p_df.dtypes[s_colName]) == True:
            s_type = 'float'
        elif is_bool_dtype(p_df.dtypes[s_colName]) == True:
            s_type = 'boolean'
        else: 
            s_type = 'string'
        
        s_schema.append({
            "metadata":{},
            "name":s_colName,
            "nullable":'true',
            "type": s_type
            # "type":str(s_df.dtypes[s_colName])
        })
    return s_schema