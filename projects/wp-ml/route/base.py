import json
import time
from flask import Blueprint, jsonify, request, g, has_request_context

class WiseBaseBlueprint(Blueprint):
    '''
    요청 단위 상태(o_params / o_file / o_start)는 Blueprint 인스턴스가 아니라
    flask.g(요청 스코프)에 담는다.

    Blueprint 인스턴스는 앱 전체에 1개만 등록되므로 인스턴스 속성에 담으면
    app.run(threaded=True) 환경에서 동시 요청끼리 서로의 값을 덮어쓴다.
    (실측: 동시요청 12건 중 11건이 다른 요청의 path를 참조)
    그 결과 다른 사용자의 파일을 내려주거나 삭제할 수 있어 프로퍼티로 분리했다.

    속성 이름은 그대로 유지하므로 self.o_params[...] 형태의 기존 호출부는 수정이 필요 없다.
    '''
    def __init__(self, name, import_name, api_key, *args, **kwargs):
        super().__init__(name, import_name, *args, **kwargs)
        self.api_key = api_key

    # ---- 요청 스코프 저장소 ----
    @staticmethod
    def _reqGet(p_key):
        return getattr(g, p_key, None) if has_request_context() else None

    @staticmethod
    def _reqSet(p_key, p_value):
        # 요청 컨텍스트 밖(앱 초기화 시점)의 대입은 담을 곳이 없으므로 무시한다
        if has_request_context():
            setattr(g, p_key, p_value)

    @property
    def o_params(self):
        return self._reqGet('_wp_o_params')

    @o_params.setter
    def o_params(self, p_value):
        self._reqSet('_wp_o_params', p_value)

    @property
    def o_file(self):
        return self._reqGet('_wp_o_file')

    @o_file.setter
    def o_file(self, p_value):
        self._reqSet('_wp_o_file', p_value)

    @property
    def o_start(self):
        return self._reqGet('_wp_o_start')

    @o_start.setter
    def o_start(self, p_value):
        self._reqSet('_wp_o_start', p_value)

    @property
    def o_req(self):
        # request는 LocalProxy라 접근하는 시점의 요청으로 해석된다
        return request

    def route(self, rule, **options):
        def decorator(f):
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
