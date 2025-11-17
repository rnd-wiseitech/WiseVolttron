import os
# 단일 파일 읽는 기능, input 기능하고 비슷한데 input으로 쓸 수 있으면 삭제
def execute(p_dataSource, **kwargs):
    s_fromPath = kwargs['data']['filepath']
    path, extension = os.path.splitext(s_fromPath)
    extension = extension.replace('.','')
    o_storageManager = p_dataSource.o_storageManager

    s_fileData = o_storageManager.readFile(s_fromPath, extension)
        
    return s_fileData