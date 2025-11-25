from config.wp import getWiseDefaultStorage
import base64
import os
from serviceStorage import common
def execute(p_dataSource, **kwargs):

    s_data= kwargs['data']
    
    s_viewName = f"{kwargs['userno']}_Temp_{s_data['usetable']}"
    s_df = p_dataSource.getDataSet2(s_viewName)
    
    # 페이징 처리
    s_page = s_data['pageIndex']
    # 한 페이지에 몇개 넣을지
    s_count = 20
    s_offset = s_count * int(s_page)
    s_df = s_df[s_offset:s_offset + s_count]
    
    s_df['base64'] = s_df.apply(
            lambda row: f"data:image/{'jpeg' if row['filename'].split('.')[-1].lower() in ['jpg', 'jpeg'] else row['filename'].split('.')[-1].lower()};base64," +
                        p_dataSource.o_storageManager.readFile(row['filepath'], 'base64'),
            axis=1
        )
    s_df = s_df.drop(columns=['filepath'])

    return s_df