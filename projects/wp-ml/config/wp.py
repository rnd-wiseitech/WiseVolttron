
import json
import os

from enum import Enum
class JOB_LOCATION_ATT(Enum):
    WISEPROPHET = "wiseprophet",
    WORKFLOW = "workflow",
    SCHEDULE = "schedule",
    DATAMANAGER = "datamanager"

try :
    tmp_path = os.getcwd()
    o_configFile = open(f'{tmp_path}/../../assets/config/app.config.json', encoding = 'utf-8-sig')
    # o_configFile = open(f'/root/wp-platform.v1/assets/config/app.config.json', encoding = 'utf-8-sig')
    a = os.getcwd()
except Exception as e:
    if e.strerror == 'No such file or directory':
        o_configFile = open('../../assets/config/app.config.json', encoding = 'utf-8-sig')
    else:        
        raise Exception(e.strerror)

o_config = json.load(o_configFile)
o_storageInfo = {}

def getConfig(p_type,p_key):
    # print(o_config)
    if p_type != '':
        s_value = o_config[p_type][p_key]
        
        if s_value in ['true', 'false']:
            s_value = o_config[p_type].getboolean(p_key)
    else:
        s_value = o_config[p_key]
    return s_value

def setWiseDefaultStorage(p_dsId):
    from database.manager import WpDataBaseManagement
    o_dbMng = WpDataBaseManagement('meta')
    s_dsMstr = o_dbMng.select('DS_MSTR', f" WHERE DS_ID={p_dsId}")
    global o_storageInfo 
    o_storageInfo = {
        "host": s_dsMstr['IP'][0],
        "port": s_dsMstr['PORT'][0],
        "user": s_dsMstr['USER_ID'][0],
        "password": s_dsMstr['PASSWD'][0],
        "DEFAULT_PATH": s_dsMstr['DEFAULT_PATH'][0],
        "type": s_dsMstr['TYPE'][0].upper(),
        "dbms_type": s_dsMstr['DBMS_TYPE'][0]
    }



def getWiseDefaultStorage(p_key=None): 
    if p_key == None:
        return o_storageInfo
    else:
        return o_storageInfo[p_key]
