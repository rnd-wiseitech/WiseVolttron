import json
import requests
import pandas as pd
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class apiStorage():
    def __init__(self, p_info):
        self.o_rootPath = p_info['apiUrl']
        self.o_parameter = p_info['parameter']
        self.o_apiType = p_info['apiType']
    
    def readApiData(self):
        s_requestParams = {}
        for p_params in self.o_parameter :
            if p_params['name'] and p_params['value']:
                s_requestParams[p_params['name']] = p_params['value']
        # ApiUrl에 ? 있으면 GET 방식으로 아니면 POST 방식으로 보냄
        if self.o_apiType == 'get' :
            s_apiData = requests.get(self.o_rootPath, params=json.dumps(s_requestParams))
        else :
            s_apiData = requests.post(self.o_rootPath, data=json.dumps(s_requestParams))
        # 결과코드 200이나 201이면 정상처리, 데이터 DataFrame으로 처리, 나머지는 오류라 오류 띄워줌
        if s_apiData.status_code == 200 or s_apiData.status_code == 201:
            s_apiData = json.loads(s_apiData.content)
            # 공공데이터 기준 결과값 나오면 data 키에 데이터가 들어감, 다른 api 데이터 테스트 해보고 고칠 예정
            if 'data' in s_apiData :
                s_apiData = s_apiData['data']
            # 한줄이면 scalar로 인식해서 index 붙여줘야함
            if len(s_apiData) == 1:
                  result = pd.DataFrame(s_apiData, index=[0])  
            else:
                result = pd.DataFrame(s_apiData)
            return result
        
        else :
            raise s_apiData.raise_for_status()