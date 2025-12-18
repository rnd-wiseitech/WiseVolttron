
import os

from serviceStorage import localService
from job.common.io import database, volttron
from database.manager import WpDataBaseManagement

def execute(p_dataSource, **kwargs):
    s_userno = kwargs['userno']
    s_data = kwargs['data']
    s_method = kwargs['method']
    s_groupId = kwargs['groupId']

    try:
        s_fromPath = kwargs['data']['filepath']
        path, extension = os.path.splitext(s_fromPath)
        extension = extension.replace('.','')
    except Exception :
        pass
        
    if s_method in ['I-DATABASE']  :
        s_storage = database
        # Temp면 10개만 뽑기 위해 groupId 보냄
        s_df = s_storage.getData(s_data, s_groupId)

    elif s_method == 'I-DATASOURCE' or s_method == 'I-IMAGE-DATASOURCE':
        s_dataUserno = s_data['dataUserno']
        s_dbMng = WpDataBaseManagement('meta')
        s_filename = s_data['filename']
        s_filetype = s_data['filetype']

        s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', 
                                            f" WHERE DS_VIEW_ID='{s_filename}' and REG_USER_NO='{s_dataUserno}' AND DEL_YN='N'")
        s_index = s_dsViewTblMstr['VIEW_IDX'][0]

        # delta일때는 뒤에 인덱스 안 붙히고 폴더 하나로 관리함
        if s_filetype == 'delta':
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "." + s_filetype    
        else :
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "_" + str(s_index) + "." + s_filetype
        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, s_filetype)


    elif s_method == 'I-STORAGE' :
        # deltaLake 형식인지 체크
        s_extension = p_dataSource.o_storageManager.checkDelta(s_fromPath, extension)

        if s_extension == 'txt':
            s_extension = 'csv'

        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, s_extension)

    elif s_method == 'I-LOCAL' :
        
        s_storage = localService.localStorage(s_userno, s_data)
        if extension == 'txt':
            s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_fromPath, 'csv')
        else:
            s_df = s_storage.readFile(s_data['DEFAULT_PATH'] + s_fromPath, extension)

    elif s_method == "I-VOLTTRON" :
        s_storage = volttron
        s_df = s_storage.getData(p_dataSource, **kwargs)

    # 이미지 스토리지
    elif s_method == 'I-IMAGE-STORAGE' or s_method == 'I-IMAGE-LABEL' :
        if s_method == 'I-IMAGE-STORAGE':
            extension='image'
        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, extension)

    else :
        s_storage = localService.localStorage(s_userno,'','/home/ubuntu/wp-platform/wp-ml/py_result/')
        s_df = s_storage.readFile(s_fromPath, extension)

    # 컬럼명 특수문자 제거
    s_df.columns = s_df.columns.str.replace('[-=+,#/\?:^.@*\"※~ㆍ!』‘|\(\)\[\]`\'…》\”\“\’·]', '')
    s_df.columns = s_df.columns.str.replace(' ', '_')

    return s_df