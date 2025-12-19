import pandas as pd
from config.wp import getConfig

def execute(p_dataSource, **kwargs):
    

    s_data = kwargs['data']
    s_page = s_data['page']
    s_update = s_data.get('update', 'N')
    if p_dataSource.checkExist(s_data['usetable']) and s_update == 'N':
        print("페이지 테이블 있음")
        s_df = p_dataSource.getDataSet2(s_data['usetable'])
    else:
        print("페이지 테이블 없음")
        s_filename = s_data['filename']
        s_filetype = s_data['filetype']
        s_dataUserno = s_data['dataUserno']
        s_index = s_data['index']
        if s_filetype == 'delta':
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "." + s_filetype
        else :
            s_fromPath =  str(s_dataUserno) + "/wp_dataset/" + str(s_filename) + "/" + str(s_filename) + "_" + str(s_index) + "." + s_filetype
        s_df = p_dataSource.o_storageManager.readFile(s_fromPath, s_filetype, p_index = s_index)
        p_dataSource.dataset[str(s_data['dataUserno']) + "_" + str(s_filename)] = s_df

    s_count = 20
    s_offset = s_count * (int(s_page) - 1)
    s_df = s_df[s_offset:s_offset + s_count]
    
    if s_data['dataType'] == 'image':
        s_df['base64'] = s_df.apply(
            lambda row: f"data:image/{'jpeg' if row['filename'].split('.')[-1].lower() in ['jpg', 'jpeg'] else row['filename'].split('.')[-1].lower()};base64," +
                        p_dataSource.o_storageManager.readFile(row['filepath'], 'base64'),
            axis=1
        )
        s_df = s_df.drop(columns=['filepath'])

    if 'predictpath' in s_df.columns :
        if 'tag' in s_df.columns:
            s_df = s_df.drop(columns=['tag'])    
        else :
            s_df['predict_base64'] = s_df.apply(
                lambda row: f"data:image/{'jpeg' if row['filename'].split('.')[-1].lower() in ['jpg', 'jpeg'] else row['filename'].split('.')[-1].lower()};base64," +
                            p_dataSource.o_storageManager.readFile(row['predictpath'], 'base64'),
                axis=1
            )
        s_df = s_df.drop(columns=['predictpath'])
    return s_df