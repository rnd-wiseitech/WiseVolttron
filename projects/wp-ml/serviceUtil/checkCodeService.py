# strict_audit.py
from __future__ import annotations
import ast, os, sys, subprocess, tempfile, signal, shutil

# ─────────────────────────────────────────────────────────────────────────────
# [정책]  ← 필요 시 이 블록만 조정해도 동작함

# 1) "임포트만 해도 실패" 루트 모듈
BANNED_IMPORT_ROOTS = {
    # 기본 위험군
    "os","subprocess","shlex","pty",
    "sys","pathlib","shutil","importlib","builtins",
    "ctypes","pickle", "zipfile", "tarfile", "code",

    # 네트워크/전송계층
    "socket","requests","urllib","urllib3","http","ftplib","smtplib",
    "aiohttp","httpx","websockets","websocket",  # websocket-client는 import websocket
    "grpc",  # grpcio

    # 클라우드/SDK/스토리지/원격추적
    "boto3","botocore","s3transfer",
    "google","azure","openai","huggingface_hub","datasets","transformers",
    "mlflow","databricks","label_studio","label_studio_sdk",
    "sentry_sdk","opentelemetry","ldclient",  # LaunchDarkly
    "google_cloud_storage",   # 파생 모듈 대비(없어도 무해)
    "smart_open",

    # 메시징/브로커/DB/파일시스템 클라이언트
    "kafka","pika","redis","pymongo","dnspython",
    "psycopg2","pymysql","pyodbc","cx_Oracle","hdfs", "pyarrow",

    # 컨테이너/오케스트레이션
    "docker","kubernetes", "findspark", "pyspark", 

    # 서버 프레임워크/런처
    "flask","django","werkzeug","uvicorn","waitress","litestar","httptools","gevent","tornado",

    # 분산/동시성/작업큐
    "multiprocessing","threading","concurrent","concurrent.futures","asyncio",
    "celery","kombu","amqp","rq",

    # 윈도우 저수준/시스템 접근
    "win32api","win32com","pythoncom","win32con",

    # CV/이미지 I/O(직접 파일/디코드 우회 방지)
    "cv2","PIL","imageio",
}

# 2) 위험 내장 호출(등장하면 실패)  ※ 'open'은 Step 2에서 별도 처리
DANGEROUS_BUILTIN_CALLS = {
    "eval","exec","input","compile","globals","locals","__import__",
    # getattr/setattr/delattr는 이름 그대로 호출되면 무조건 실패 (가려도 불합격)
    "getattr","setattr","delattr",
    "type","memoryview",
}

# 3) 서버 명령/프로세스 실행 패턴(등장하면 실패)
SUBPROC_ATTR_CALLS = {
    ("os","system"),("os","popen"),
    ("os","execv"),("os","execve"),("os","spawnv"),("os","spawnve"),
    ("subprocess","run"),("subprocess","Popen"),("subprocess","call"),
    ("subprocess","check_call"),("subprocess","check_output"),
}

# 4) 파일 I/O/삭제/복사 메서드 (읽기까지 포함해 강화)
FILEIO_METHOD_NAMES = {
    # 쓰기/저장
    "to_csv","to_excel","to_parquet","to_json","to_pickle","to_hdf","to_sql","to_feather",
    "save","savetxt","savefig","savez","savez_compressed","imsave","imwrite","imencode",
    "write","writelines","dump","dumps","write_text","write_bytes",
    # 읽기/로드
    "read","readline","readlines",
    "read_csv","read_excel","read_parquet","read_json","read_pickle","read_hdf","read_feather",
    "imread","load","loadtxt","load_workbook","fromfile","frombuffer",
    # 파일시스템 조작
    "open","remove","unlink","rename","replace","rmdir","mkdir","makedirs",
    "chmod","chown","copy","copy2","copyfile","copytree","move","rmtree","extract","extractall",
}

# 5) 네트워크 루트(호출 시도 탐지)
NETWORK_ROOTS = {
    "socket","requests","urllib","urllib3","http","ftplib","smtplib",
    "aiohttp","httpx","websockets","websocket",
    "grpc","openai","huggingface_hub","datasets","transformers",
    "boto3","botocore","s3transfer","google","azure","smart_open",
    "kafka","pika","redis","pymongo","dnspython",
    "docker","kubernetes","mlflow","databricks",
    "sentry_sdk","opentelemetry","ldclient", "fetch_openml"
}

# 6) 특정 라이브러리의 위험 메서드(동적 getattr 우회 방어)
DANGEROUS_ATTR_BY_MODULE = {
    "torch": {"save","load"},
    "cv2": {"imwrite","imencode","imwrite_multi","imread"},
    "PIL": {"Image"},  # PIL.Image.save/open은 tail 규칙으로도 잡히지만 보강
    "joblib": {"dump","load"},
    "numpy": {"save","savez","savez_compressed","savetxt","load","fromfile","frombuffer"},
    "np": {"save","savez","savez_compressed","savetxt","load","fromfile","frombuffer"},
    "imageio": {"imwrite","imread"},
    "matplotlib": {"savefig"},
}
# ─────────────────────────────────────────────────────────────────────────────


def _read_src(path:str)->str:
    try:
        return open(path, "r", encoding="utf-8").read()
    except UnicodeDecodeError:
        return open(path, "rb").read().decode("utf-8","ignore")

def _dotted(node: ast.AST):
    parts=[]; cur=node
    while isinstance(cur, ast.Attribute):
        parts.append(cur.attr); cur=cur.value
    if isinstance(cur, ast.Name):
        parts.append(cur.id); return ".".join(reversed(parts))
    return None

def _param_names(fn_args: ast.arguments):
    names = []
    names += [a.arg for a in getattr(fn_args, "posonlyargs", [])]
    names += [a.arg for a in fn_args.args]
    names += [a.arg for a in fn_args.kwonlyargs]
    if fn_args.vararg: names.append(fn_args.vararg.arg)
    if fn_args.kwarg:  names.append(fn_args.kwarg.arg)
    return names

def _iter_target_names(t: ast.AST):
    # 새 변수 정의로 취급할 타깃만 수집 (obj.attr = x 같은 건 제외)
    if isinstance(t, ast.Name):
        yield t.id
    elif isinstance(t, (ast.Tuple, ast.List)):
        for e in t.elts:
            yield from _iter_target_names(e)

def _static_str(node: ast.AST) -> str | None:
    # 간단한 상수 문자열 해석: "a", "a"+"b", f"ab" (모든 파트 상수일 때)
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.JoinedStr):
        parts=[]
        for v in node.values:
            if isinstance(v, ast.Constant) and isinstance(v.value, str):
                parts.append(v.value)
            else:
                return None
        return "".join(parts)
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
        left = _static_str(node.left)
        right = _static_str(node.right)
        if left is not None and right is not None:
            return left + right
    return None

def checkCode(s_path: str) -> dict:
    """
    실패 즉시 반환:
      {status:'Faild', step:'N.설명', reason:'실패이유'}
    모든 단계 통과 시:
      {status:'Success'}

    단계:
      1) 서버 접근/명령 시도(금지 임포트/위험 내장/명령 실행 + __builtins__ 우회)
      2) 파일 읽기/쓰기/삭제/복사 시도(별칭/라이브러리 포함, torch.save/cv2.imwrite 등)
      3) 네트워크 호출 시도
      4) 문법/정의 문제(루프/with/except/컴프리헨션/월러스 포함)
      5) 실제 실행(타임아웃 10초, 임시 작업 디렉터리)
    """
    # ─────────────────────────────────────────────────────────────────────
    # (Step 4 선행) 문법 파싱
    try:
        # src = _read_src(s_path)
        src = s_path
        tree = ast.parse(src)
    
    except SyntaxError as e:
        return {"status":"Faild", "step":"4. 문법/정의 점검",
                "reason": f"SyntaxError: {e.msg} (line {e.lineno}, col {e.offset})"}

    # 심볼/임포트/별칭 수집
    assigned: set[str] = set()
    load_names: list[tuple[str,int]] = []
    imports: list[tuple[str,int]] = []

    # 빌트인/파일IO 빌트인 별칭 추적
    dangerous_aliases: set[str] = set()  # eval/exec/__import__/getattr/setattr/delattr ...
    open_aliases: set[str] = set()       # open

    def _record_aliases_for_assignment(targets, value):
        if isinstance(value, ast.Name):
            rhs = value.id
            for t in targets:
                for name in _iter_target_names(t):
                    if rhs in DANGEROUS_BUILTIN_CALLS:
                        dangerous_aliases.add(name)
                    if rhs == "open":
                        open_aliases.add(name)

    class V(ast.NodeVisitor):
        # 임포트
        def visit_Import(self, node: ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]
                imports.append((root, node.lineno))
                assigned.add(alias.asname or root)

        def visit_ImportFrom(self, node: ast.ImportFrom):
            modroot = (node.module or "").split(".")[0]
            imports.append((modroot, node.lineno))
            for alias in node.names:
                assigned.add(alias.asname or alias.name)

        # 함수/메서드/람다: 이름 및 파라미터(self/cls 포함)를 정의로 등록
        def visit_FunctionDef(self, node: ast.FunctionDef):
            assigned.add(node.name)
            for n in _param_names(node.args): assigned.add(n)
            self.generic_visit(node)

        def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
            assigned.add(node.name)
            for n in _param_names(node.args): assigned.add(n)
            self.generic_visit(node)

        def visit_Lambda(self, node: ast.Lambda):
            for n in _param_names(node.args): assigned.add(n)
            self.generic_visit(node)

        # 클래스
        def visit_ClassDef(self, node: ast.ClassDef):
            assigned.add(node.name)
            self.generic_visit(node)

        # 대입/주석대입 + 별칭 추적
        def visit_Assign(self, node: ast.Assign):
            for t in node.targets:
                for n in _iter_target_names(t): assigned.add(n)
            _record_aliases_for_assignment(node.targets, node.value)
            self.generic_visit(node)

        def visit_AnnAssign(self, node: ast.AnnAssign):
            if isinstance(node.target, ast.Name):
                assigned.add(node.target.id)
            if node.value is not None:
                _record_aliases_for_assignment([node.target], node.value)
            self.generic_visit(node)

        # for/async for 타깃 변수
        def visit_For(self, node: ast.For):
            for n in _iter_target_names(node.target): assigned.add(n)
            self.generic_visit(node)

        def visit_AsyncFor(self, node: ast.AsyncFor):
            for n in _iter_target_names(node.target): assigned.add(n)
            self.generic_visit(node)

        # with/as, async with/as
        def visit_With(self, node: ast.With):
            for item in node.items:
                if item.optional_vars is not None:
                    for n in _iter_target_names(item.optional_vars): assigned.add(n)
            self.generic_visit(node)

        def visit_AsyncWith(self, node: ast.AsyncWith):
            for item in node.items:
                if item.optional_vars is not None:
                    for n in _iter_target_names(item.optional_vars): assigned.add(n)
            self.generic_visit(node)

        # except as e:
        def visit_ExceptHandler(self, node: ast.ExceptHandler):
            if isinstance(node.name, str) and node.name:
                assigned.add(node.name)
            self.generic_visit(node)

        # 월러스 연산자: (n := expr)
        def visit_NamedExpr(self, node: ast.NamedExpr):
            if isinstance(node.target, ast.Name):
                assigned.add(node.target.id)
            self.generic_visit(node)

        # 컴프리헨션 타깃
        def visit_comprehension(self, node: ast.comprehension):
            for n in _iter_target_names(node.target): assigned.add(n)
            self.generic_visit(node)

        # 로드되는 이름 기록
        def visit_Name(self, node: ast.Name):
            if isinstance(node.ctx, ast.Load):
                load_names.append((node.id, node.lineno))
            self.generic_visit(node)

    V().visit(tree)

    # ─────────────────────────────────────────────────────────────────────
    # Step 1. 서버 접근/명령 시도

    # 1-0) __builtins__ 직접 접근 차단
    for name, ln in load_names:
        if name == "__builtins__":
            return {"status":"Faild","step":"1. 서버 명령/접근 금지",
                    "reason": f"__builtins__ 직접 접근 감지 (line {ln})"}

    # 1-1) 금지 임포트 (임포트만으로도 실패)
    for mod, ln in imports:
        if mod in BANNED_IMPORT_ROOTS:
            return {"status":"Faild","step":"1. 서버 명령/접근 금지",
                    "reason": f"금지 모듈 임포트: {mod} (line {ln})"}

    # 1-2) 위험 내장 호출 + os/subprocess 명령 실행 + __builtins__['...'] 우회
    def _root_name_of(node: ast.AST):
        cur=node
        while isinstance(cur, ast.Attribute):
            cur=cur.value
        return cur.id if isinstance(cur, ast.Name) else None

    class CallScan1(ast.NodeVisitor):
        found=None
        def visit_Call(self, node: ast.Call):
            # (A) 단일 이름 호출: eval/exec/... 또는 그 별칭
            if isinstance(node.func, ast.Name):
                name=node.func.id
                # getattr/setattr/delattr는 이름 그대로 호출되면 무조건 실패
                if name in {"getattr","setattr","delattr"}:
                    CallScan1.found=(name, node.lineno); return
                # 위험 빌트인 별칭
                if name in dangerous_aliases:
                    CallScan1.found=(name, node.lineno); return
                # 원래 빌트인 이름(사용자 정의로 가리지 않은 경우)
                if name in DANGEROUS_BUILTIN_CALLS and name not in {"getattr","setattr","delattr"}:
                    if name not in assigned:
                        CallScan1.found=(name, node.lineno); return

            # (B) 속성 호출: os.system, subprocess.run ...
            dotted=_dotted(node.func)
            if dotted:
                head = dotted.split(".")[0]
                tail = dotted.split(".")[-1]
                if (head, tail) in SUBPROC_ATTR_CALLS:
                    CallScan1.found=(dotted, node.lineno); return

            # (C) __builtins__['__import__'](...) 등 인덱스 우회
            if isinstance(node.func, ast.Subscript):
                base = node.func.value
                root = _root_name_of(base)
                key = None
                sl = node.func.slice
                if isinstance(sl, ast.Constant) and isinstance(sl.value, str):
                    key = sl.value
                elif hasattr(ast, "Index") and isinstance(sl, ast.Index) and isinstance(sl.value, ast.Constant) and isinstance(sl.value.value, str):
                    key = sl.value.value
                dangerous_keys = {"__import__","eval","exec","compile","getattr","setattr","delattr","open"}
                if root == "__builtins__" and key in dangerous_keys:
                    CallScan1.found=(f"__builtins__['{key}'](...)", node.lineno); return

            # (D) getattr(__builtins__, "ev"+"al")(...) 같은 정적 문자열 합성
            if isinstance(node.func, ast.Call) and isinstance(node.func.func, ast.Name) and node.func.func.id == "getattr":
                # getattr(obj, name, [default])
                args = node.func.args
                if len(args) >= 2:
                    base_obj = args[0]
                    attr_str = _static_str(args[1])
                    base_root = _root_name_of(base_obj)
                    if base_root == "__builtins__" and attr_str in {"__import__","eval","exec","compile","getattr","setattr","delattr","open"}:
                        CallScan1.found=(f"getattr(__builtins__, '{attr_str}')(...)", node.lineno); return
            self.generic_visit(node)
    c1=CallScan1(); c1.visit(tree)
    if c1.found:
        what, ln = c1.found
        return {"status":"Faild","step":"1. 서버 명령/접근 금지",
                "reason": f"위험 호출/우회 감지: {what} (line {ln})"}

    # ─────────────────────────────────────────────────────────────────────
    # Step 2. 파일 읽기/쓰기/삭제/복사 시도 (open 별칭/라이브러리 포함, torch/cv2 우회)
    class CallScan2(ast.NodeVisitor):
        found=None
        def visit_Call(self, node: ast.Call):
            # (A) open(...) 또는 open 별칭
            if isinstance(node.func, ast.Name):
                name=node.func.id
                if (name == "open" and name not in assigned) or (name in open_aliases):
                    CallScan2.found=("open(...)", node.lineno); return

            # (B) 점표기 메서드: df.to_csv, Path.write_text, PIL.Image.save 등
            dotted=_dotted(node.func)
            if dotted:
                head = dotted.split(".")[0]
                tail = dotted.split(".")[-1]
                if tail in FILEIO_METHOD_NAMES or tail.startswith(("save","write","dump")): #"to_",
                    CallScan2.found=(dotted, node.lineno); return
                # torch.save / cv2.imwrite / numpy.save 등 라이브러리별 위험 메서드
                if head in DANGEROUS_ATTR_BY_MODULE and tail in DANGEROUS_ATTR_BY_MODULE[head]:
                    CallScan2.found=(dotted, node.lineno); return

            # (C) getattr(torch,"save")(...), getattr(cv2,"imwrite")(...), getattr(np,"save")(...)
            if isinstance(node.func, ast.Call) and isinstance(node.func.func, ast.Name) and node.func.func.id == "getattr":
                args = node.func.args
                if len(args) >= 2:
                    base_obj = args[0]
                    attr_str = _static_str(args[1])
                    base_root = base_obj.id if isinstance(base_obj, ast.Name) else _root_name_of(base_obj)
                    if base_root in DANGEROUS_ATTR_BY_MODULE and attr_str in DANGEROUS_ATTR_BY_MODULE[base_root]:
                        CallScan2.found=(f"getattr({base_root}, '{attr_str}')(...)", node.lineno); return
            self.generic_visit(node)
    c2=CallScan2(); c2.visit(tree)
    if c2.found:
        what, ln = c2.found
        return {"status":"Faild","step":"2. 파일 I/O 금지",
                "reason": f"파일 I/O/삭제/복사 시도: {what} (line {ln})"}

    # ─────────────────────────────────────────────────────────────────────
    # Step 3. 네트워크 호출 시도
    class CallScan3(ast.NodeVisitor):
        found=None
        def visit_Call(self, node: ast.Call):
            dotted=_dotted(node.func)
            if dotted:
                head = dotted.split(".")[0]
                if head in NETWORK_ROOTS:
                    CallScan3.found=(dotted, node.lineno); return
            self.generic_visit(node)
    c3=CallScan3(); c3.visit(tree)
    if c3.found:
        what, ln = c3.found
        return {"status":"Faild","step":"3. 네트워크 호출 금지",
                "reason": f"네트워크 호출 시도: {what} (line {ln})"}

    # ─────────────────────────────────────────────────────────────────────
    # Step 4. 문법/정의 문제 (미정의 이름 간단 점검)
    import builtins as _bi
    builtins_set = set(dir(_bi))
    for name, ln in load_names:
        if name not in builtins_set and name not in assigned:
            return {"status":"Faild","step":"4. 문법/정의 점검",
                    "reason": f"미정의 이름 사용: {name} (line {ln})"}

    # ─────────────────────────────────────────────────────────────────────
    # Step 5. 실제 실행 (subprocess로 실행, 타임아웃 10초)
    # cmd = [sys.executable, "-I", "-u", s_path]  # -I: PYTHON* 환경변수 무시, -u: 비버퍼 출력
    # tmpdir = tempfile.mkdtemp(prefix="audit_run_", dir=r"C:\Users\jhseo\Downloads\jupyter\tmp")
    # try:
    #     kwargs = dict(
    #         cwd=tmpdir,
    #         stdin=subprocess.DEVNULL,
    #         stdout=subprocess.PIPE,
    #         stderr=subprocess.PIPE,
    #         text=True, encoding="utf-8", errors="ignore",
    #     )
    #     if os.name == "nt":
    #         kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    #     else:
    #         kwargs["start_new_session"] = True

    #     p = subprocess.Popen(cmd, **kwargs)
    #     try:
    #         out, err = p.communicate(timeout=10.0)
    #         if p.returncode != 0:
    #             return {"status":"Faild","step":"5. 실행 테스트",
    #                     "reason": f"프로세스 종료코드 {p.returncode} / stderr: {err[:500]}"}
    #     except subprocess.TimeoutExpired:
    #         if os.name == "nt":
    #             p.kill()
    #         else:
    #             os.killpg(p.pid, signal.SIGKILL)
    #         _o, _e = p.communicate()
    #         return {"status":"Faild","step":"5. 실행 테스트",
    #                 "reason": "타임아웃(10초 초과)"}
    # finally:
    #     shutil.rmtree(tmpdir, ignore_errors=True)

    # ─────────────────────────────────────────────────────────────────────
    # Step 5. 실행 테스트 (코드 문자열을 바로 stdin으로 실행, 타임아웃 10초)
    #  - 가정: 위에서 src 는 "파이썬 코드 문자열"이다.
    cmd = [sys.executable, "-I", "-u", "-"]  # '-' = stdin에서 스크립트 읽기
    tmpdir = tempfile.mkdtemp(prefix="audit_run_")
    try:
        kwargs = dict(
            cwd=tmpdir,                    # 항상 임시 작업 폴더에서 실행
            stdin=subprocess.PIPE,         # 코드 문자열을 stdin으로 보냄
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True, encoding="utf-8", errors="ignore",
        )
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
        else:
            kwargs["start_new_session"] = True
    
        p = subprocess.Popen(cmd, **kwargs)
        try:
            out, err = p.communicate(input=src, timeout=10.0)
            if p.returncode != 0:
                return {"status":"Faild","step":"5. 실행 테스트",
                        "reason": f"프로세스 종료코드 {p.returncode} / stderr: {err[:500]}"}
        except subprocess.TimeoutExpired:
            # 타임아웃: 강제 종료
            if os.name == "nt":
                p.kill()
            else:
                os.killpg(p.pid, signal.SIGKILL)
            _o, _e = p.communicate()
            return {"status":"Faild","step":"5. 실행 테스트",
                    "reason": "타임아웃(10초 초과)"}
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    # 모든 단계 통과
    return {"status":"Success"}
