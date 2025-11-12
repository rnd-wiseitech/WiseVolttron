
import pymysql
from database.manager import WpDataBaseManagement
from datetime import datetime

def savePid(p_uuid,p_processId):
    print("Before function execution")    
    s_reVal = True
    s_dbMng = WpDataBaseManagement('meta',False)
    
    try :
        s_transaction = s_dbMng.o_conn.begin()
        s_selectJob = s_dbMng.select("JOB_MSTR",{"ID": p_uuid})
        if len(s_selectJob) == 0:
            s_dbMng.insert("JOB_MSTR",{"PROCESS_ID": p_processId,"ID": p_uuid,"ST_DT":datetime.now().strftime("%Y-%m-%d %H:%M:%S"),"STATUS":20},'single')
        else:     
            s_dbMng.update("JOB_MSTR",{"PROCESS_ID": p_processId},{"ID": p_uuid});    
        s_transaction.commit()
        s_dbMng.o_conn.close()

    except Exception as e:
        s_transaction.rollback()
        s_dbMng.o_conn.close()

    print("After function execution")
    return s_reVal



def saveSparkPid(p_uuid,p_desc,p_type,p_dataSourceMng):
     p_dataSourceMng.o_storageManager.o_wpStorage.setJobGroup(p_uuid,p_desc)


