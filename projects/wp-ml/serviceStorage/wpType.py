import abc


class WpStorage(metaclass=abc.ABCMeta):
    # @abc.abstractmethod
    # def setOwner(self,p_filepath,p_userId):
    #     raise NotImplemented
        
    @abc.abstractmethod
    def createBuffer(self, p_path, p_option='rb', p_encType ='utf-8'):
        raise NotImplemented
        
    @abc.abstractmethod
    def getPath(self):
        raise NotImplemented

    @abc.abstractmethod
    def readFile(self, p_path, p_option='read', p_mode='r', p_readsize=0, p_encType ='utf-8', p_sep=',',p_fullPath=False):
        raise NotImplemented

    @abc.abstractmethod
    def writeFile(self, p_path, p_df, p_option='csv', p_index=False, p_encType ='utf-8', p_writeMode='w'):
        raise NotImplemented
        
    @abc.abstractmethod
    def checkExist(self, p_path):
        raise NotImplemented

    @abc.abstractmethod
    def createDirs(self, p_path,p_fullPath=False):
        raise NotImplemented
    
    @abc.abstractmethod
    def deleteDirs(self, p_path):
        raise NotImplemented

    @abc.abstractmethod    
    def listFile(self, p_path, p_status=False):
        raise NotImplemented
        
    @abc.abstractmethod
    def saveModel(self, p_path, p_df, p_option='pkl', p_tmpModel=False):
        raise NotImplemented

    @abc.abstractmethod
    def loadModel(self, p_path, p_option='pkl'):
        raise NotImplemented
    
    @abc.abstractmethod
    def getDirSize(self, p_path):
        raise NotImplemented
    
    @abc.abstractmethod
    def getDir(self, p_path):
        raise NotImplemented
    