import pandas as pd
from deltalake import write_deltalake, DeltaTable
import pyarrow as pa

def execute(p_dataSource, **kwargs):
    # 기능이 필요는 한데, 파일로 따로 관리하기는 애매한 기능들 모아놓은 파일
    # functionType의 값에 따라 기능을 구분함. /jobexecute/function 으로 실행시킨뒤 s_functionType에 따라 기능 실행
    
    s_functionType = kwargs['functionType']
    
    # 데이터셋 컬럼 체크 (현재 DeltaLake에서만 쓰임)
    if s_functionType =='datasetColumnCheck':
        s_fromPath =  str(kwargs['userno']) + "/wp_dataset/" + str(kwargs['fileName']) + "/" + str(kwargs['fileName']) + '_'+ str(kwargs['fileIdx']) +".manifest"
        s_manifest = p_dataSource.o_storageManager.readFile(s_fromPath, 'manifest')
        s_datasetColumn = [s_schema['name'] for s_schema in s_manifest['schema']]
        
        if set(s_datasetColumn) == set(kwargs['columnList']):
            s_result = {'result' : True}
        else :
            s_result = {'result' : False, 'useColumn':s_datasetColumn}

    if s_functionType =='writeDeltaLake':
        s_mode = 'overwrite'
        if type(kwargs['data']) != pd.DataFrame:
            try:
                s_df = pd.DataFrame.from_dict(kwargs['data'])
            except Exception as e:
                s_df = pd.DataFrame([kwargs['data']])
        else:
            s_df = kwargs['data']

        s_deltaLakeTbl = pa.Table.from_pandas(s_df)
        write_deltalake('C:/deltaTest', data=s_deltaLakeTbl, mode=s_mode)

        s_result = True

    return s_result
