from imblearn.over_sampling import SMOTE # doctest: +NORMALIZE_WHITESPACE
import pandas as pd

class Smote(object):
    def __init__(self,x_train,y_train):
        self.x_train = x_train
        self.y_train = y_train
     
    def getData(self):
        sm = SMOTE(random_state=42)
        self.x_train, self.y_train = sm.fit_resample(self.x_train,list(self.y_train))
        self.x_train = pd.DataFrame(self.x_train, columns=self.x_train.columns)
        return self.x_train, self.y_train