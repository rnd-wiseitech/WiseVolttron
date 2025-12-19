from config.wp import getWiseDefaultStorage
from database.manager import WpDataBaseManagement
import pandas as pd
from config.wp import getConfig
def execute(p_dataSource, **kwargs):
    s_df = p_dataSource.getDataSet2(kwargs['data']['usetable'])
    s_data = kwargs['data']
    s_labelData = s_data['label']
    s_type = s_data.get('type', 'workflow')

    o_storageManager = p_dataSource.o_storageManager

    s_workflowId = kwargs['workflowId']
    s_jobId = kwargs['jobId']
    s_userno = kwargs['userno']
    if s_type == 'workflow':
        o_storageManager.createDirs(f'/{s_userno}/temp_labelset')
        o_storageManager.writeFile(f'/{s_userno}/temp_labelset/{s_workflowId}_{s_jobId}_ui.json',s_labelData,'json')
        
        s_labelpath_map = {
            label["fileName"]: f"{s_workflowId}_{s_jobId}"
            for label in s_labelData
        }
        s_tag_map = {
            label["fileName"]: label["value"]["value"]
            for label in s_labelData
            if "value" in label
        }
        s_mapped = s_df["filename"].map(s_labelpath_map)
        s_df["labelpath"] = s_mapped.where(pd.notna(s_mapped), None)
        s_df["tag"] = s_df["filename"].map(s_tag_map)

        
    else:
        s_dbMng = WpDataBaseManagement('meta')
        s_filename = s_data['filename']
        s_dsViewTblMstr = s_dbMng.select('DS_VIEW_TBL_MSTR', 
                                            f" WHERE DS_VIEW_ID='{s_filename}' AND DEL_YN='N'")
        s_index = s_dsViewTblMstr['VIEW_IDX'][0]
        o_storageManager.writeFile(f'/{s_userno}/wp_dataset/{s_filename}/{s_index}/labels/ui.json',s_labelData,'json')
        s_labelpath_map = {
            label["fileName"]: f"{s_userno}/wp_dataset/{s_filename}/{s_index}/labels"
            for label in s_labelData
        }
        s_mapped = s_df["filename"].map(s_labelpath_map)
        s_df["labelpath"] = s_mapped.where(pd.notna(s_mapped), None)

        s_fileFormat = getConfig('', 'FILE_FORMAT')
        p_dataSource.o_storageManager.writeFile(f'/{s_userno}/wp_dataset/{s_filename}/{s_filename}_{s_index}.{s_fileFormat}', s_df)
        p_dataSource.dataset[kwargs['data']['usetable']] = s_df

        s_manifest = p_dataSource.o_storageManager.readFile(f'/{s_userno}/wp_dataset/{s_filename}/{s_filename}_{s_index}.manifest', 'manifest')
        s_manifest['LABEL_COUNT'] = s_df['tag'].count()
        p_dataSource.o_storageManager.writeFile(f'/{s_userno}/wp_dataset/{s_filename}/{s_filename}_{s_index}.manifest', s_manifest, 'manifest')

    return s_df