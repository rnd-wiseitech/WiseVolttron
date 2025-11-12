import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlgorithmAppService } from './app.service';

@Component({
  selector: 'algorithm-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AlgorithmAppComponent implements OnInit {
  oActiveTab = 'model-manager';
  oTabClickSubscribe: Subscription;
  oProfileData: any;
  oPromptData: any;
  oProfile = 'wp-model';
  constructor(
    private cAlgAppSvc: AlgorithmAppService
  ) {
  }
  ngOnDestroy(): void {
    this.oTabClickSubscribe.unsubscribe();
  }
  onTabClick(pTabNm: string) {
    this.oActiveTab = pTabNm;
  }
  ngOnInit(): void {
    this.oTabClickSubscribe = this.cAlgAppSvc.changeTabEmit.subscribe(pRes => {
      if(this.oActiveTab =='model-manager' && pRes.tabNm == 'model-profile') {
        this.oProfile = 'wp-model';
      } else if (this.oActiveTab =='custom-manager' && pRes.tabNm == 'model-profile') {
        this.oProfile = 'custom-model';
      }
      this.onTabClick(pRes.tabNm);
      if (pRes.tabNm == 'model-profile' && pRes.element)
        this.oProfileData = pRes.element;
      if (pRes.tabNm == 'prompt-profile' && pRes.element)
        this.oPromptData = pRes.element;
    });
  }

}