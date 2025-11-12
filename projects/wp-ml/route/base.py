import json
import time
from flask import Blueprint, jsonify, request

class WiseBaseBlueprint(Blueprint):
    def __init__(self, name, import_name, api_key, *args, **kwargs):
        super().__init__(name, import_name, *args, **kwargs)
        self.api_key = api_key
        self.o_start = None
        self.o_params = None
        self.o_file = None
        self.o_req = None
    def route(self, rule, **options):
        def decorator(f):
            self.o_req = request
            self.o_start = None
            self.o_params = None
            self.o_file = None
            endpoint = options.pop("endpoint", f.__name__)
            def wrapped_function(*args, **kwargs):
                # Add custom behavior here if needed
                self.o_start = time.time()
                
                if request.method == 'GET':
                    if len(request.args) > 0 :
                        self.o_params = request.args                        
                elif  request.method == 'POST':
                    upload = request.headers.get('upload', None)
                    if upload != "true":
                        if len(request.get_data()) > 0 :
                            try:
                                if request.mimetype == 'multipart/form-data' :
                                    self.o_file = request.files['file']
                                    self.o_params = request.form
                                else:
                                    self.o_params = json.loads(request.get_data())
                            except json.JSONDecodeError as e:
                                self.o_params = request.get_data()

                return f(*args, **kwargs)
                        
            self.add_url_rule(rule, endpoint, wrapped_function, **options)
            return wrapped_function

        return decorator

    def getParams(self):
        return self.o_params