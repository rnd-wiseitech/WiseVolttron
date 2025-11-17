
import pandas as pd
def execute(p_dataSource, **kwargs):
    s_data = kwargs['data']
    s_df = p_dataSource.getDataSet2(s_data['usetable'])
    s_method = kwargs['method']

    if s_method == 'reward':
    
        from serviceModel.model.reinforcements.reinfocements import Reinfocements
        from sklearn import preprocessing
        # for column in s_df.select_dtypes(include=['int64', 'float64']).columns:
        #     s_df[column] = s_df[column].astype('float32')
        s_code = s_data['value']
        s_column = s_data['column']
        s_copyDf = s_df.copy()
        # s_le = preprocessing.LabelEncoder()
        # s_copyDf[s_column] = s_le.fit_transform(s_copyDf[s_column].astype(str))
        for i in s_copyDf.columns:
            if s_copyDf[i].dtypes == 'object':
                if s_copyDf[i].nunique() > 100:
                    del s_copyDf[i]
                else:
                    s_le = preprocessing.LabelEncoder()
                    s_copyDf[i] = s_le.fit_transform(s_copyDf[i].astype(str))

        s_rfclass = Reinfocements(10, iterations_episode=10, reward_code=s_code)
        s_trainCnt = int(len(s_copyDf)*0.8)
        s_output = s_rfclass.excution(s_copyDf[:s_trainCnt], 
                                        s_copyDf[s_trainCnt:], 
                                        s_copyDf[s_column][:s_trainCnt].to_numpy(), 
                                        s_copyDf[s_column][s_trainCnt:].to_numpy(), 
                                        'check', s_column)
                                        
    return pd.DataFrame(), s_output