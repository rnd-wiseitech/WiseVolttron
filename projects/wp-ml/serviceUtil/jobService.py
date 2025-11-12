import os
from multiprocessing import Process
import concurrent.futures

class Job():
    def __init__(self):
        self.exitcode = None
        self.p_id = 0

    def run(self,p_target,p_asyncChk=True,*p_arg):
        reVal = None
        self.p_id = os.getpid()
        print(f"Starting job in process {self.p_id}")

        with concurrent.futures.ProcessPoolExecutor() as executor:
            futures = [executor.submit(p_target, p_arg[0])]
            for future in concurrent.futures.as_completed(futures):
                try:
                    reVal = future.result()
                    print(reVal)
                except concurrent.futures.process.BrokenProcessPool:
                    print("A child process has terminated abruptly.")
                    raise ConnectionError("강제 종료")
                    
        return reVal
        # Implement the logic of your job here
        # You can call sys.exit(exitcode) to end the process with a specific exit code
