import { Injectable} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable()
export class WkTranslateService {

  constructor(private cTransSvc: TranslateService,) { }
  // LayerOption 변경 (pOptions 예시) {layerCount:1, options:[{selector:'wk-diag-preview', iOption:'before'}]}
  onChangeLang(pLang:any){
    this.cTransSvc.setDefaultLang(pLang);
  }
}
