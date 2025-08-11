#-*-coding:utf-8
class WpError(Exception):
    def __init__(self, msg):
        super().__init__(msg)