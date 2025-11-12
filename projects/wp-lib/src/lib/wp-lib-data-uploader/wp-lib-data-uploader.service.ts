import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WpAppConfig } from '../wp-lib-config/wp-lib-config';
import { WpSeriveImple } from '../wp-meta/service-imple';
import { WpLibService } from '../wp-lib.service';

@Injectable({
  providedIn: 'root'
})
// #63
export class WpLibDataUploaderService extends WpSeriveImple {
  constructor(private cHttp: HttpClient,
    private cAppConfig: WpAppConfig,
  private cLibSvc: WpLibService,) {
    super(cAppConfig);
  }

  getDsViewData(pParam: any): Observable<any> {
    return this.cHttp.post(this.oNodeUrl + '/wd/TableSearch', pParam);
  }

  async downloadPredict(p_modelURL: string, p_filelist: any) {
    this.cHttp.post(
  this.oNodeUrl + '/hdfs/downloadPredict',
  { modelURL: p_modelURL, filelist: p_filelist },
  {
    responseType: 'blob',
    observe: 'response' // 👈 헤더까지 받기
  }
).subscribe({
  next: (res) => {
    const blob = res.body!;
    const contentDisposition = res.headers.get('Content-Disposition');
    let filename = 'downloaded_file';

    // Content-Disposition에서 파일명 추출
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match?.[1]) {
        filename = match[1];
      }
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  error: (err) => {
    console.error('다운로드 오류:', err);
    throw err
  }
});
    // this.cHttp.post<Blob>(
    //   this.oNodeUrl + '/hdfs/downloadPredict',
    //   { modelURL: p_modelURL, filelist: p_filelist },
    //   { responseType: 'blob' as 'json' }
    // ).subscribe({
    //   next: (blob: Blob) => {
    //     const a = document.createElement('a');
    //     a.href = URL.createObjectURL(blob);
    //     a.download = `predict_${p_filelist[0]}`;
    //     a.click();
    //     URL.revokeObjectURL(a.href);
    //   },
    //   error: (err) => {
    //     console.log("error : ", err);
    //     throw err
    //   }
    // });

  }
}

