import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { WpPopupComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup.component';
import { AlgorithmAppService } from '../app.service';
import { ModelManagerService } from './model-manager.service';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { MainAppService } from 'projects/main/src/app/app.service';
import { TranslateService } from '@ngx-translate/core';
import { WpPopUpAuthorityComponent } from 'projects/wp-lib/src/lib/wp-popup/wp-popup-authority.component';

@Component({
    selector: 'wp-model-manager',
    templateUrl: './model-manager.component.html',
    styleUrls: ['./model-manager.component.css']
})
export class ModelManagerComponent implements OnInit {

    oGridData: any;
    oGridCol: any;
    oGridRowEvt = true;
    oHoverEffect = true;
    oDataList: any = [];
    oGridheader = { btnNm: this.cTransSvc.instant("WPP_COMMON.BUTTON.button6"), filterCol: ['MODEL_NM'] };
    oComptNm = 'wp-authority'
    o_displayedColumns: string[] = [
        'MODEL_ID',
        'MODEL_IDX',
        'FRAMEWORK_TYPE',
        'ARG_NM',
        'ARG_TYPE',
        'MODEL_NM',
        'ACCURACY',
        'USER_ID',
        'REG_DATE',
        'DEPLOY_URL'
    ];
    o_displayedColumnNms: string[] = [
        '모델 ID',
        '최신 버전',
        '프레임워크',
        '사용 알고리즘',
        '모델 타입',
        '모델 명',
        '정확도',
        '소유자',
        '등록일',
        '배포 URL'
    ];


    o_gridData: any;
    o_gridCol = [
        {
            'NAME': 'AUTHORITY',
            'VISIBLE': true,
            'VNAME': '권한',
            'TYPE': 'string'
        },
        {
            'NAME': 'MODEL_ID',
            'VISIBLE': true,
            'VNAME': '모델 ID',
            'TYPE': 'string'
        },
        {
            'NAME': 'MODEL_IDX',
            'VISIBLE': true,
            'VNAME': '모델 버전',
            'TYPE': 'string'
        },
        {
            'NAME': 'FRAMEWORK_TYPE',
            'VISIBLE': true,
            'VNAME': '프레임워크',
            'TYPE': 'string'
        },
        {
            'NAME': 'ARG_NM',
            'VISIBLE': true,
            'VNAME': '사용 알고리즘',
            'TYPE': 'string'
        },
        {
            'NAME': 'ARG_TYPE',
            'VISIBLE': true,
            'VNAME': '알고리즘 타입',
            'TYPE': 'string'
        },
        {
            'NAME': 'MODEL_NM',
            'VISIBLE': true,
            'VNAME': '모델 명',
            'TYPE': 'string'
        },
        {
            'NAME': 'ACCURACY',
            'VISIBLE': true,
            'VNAME': '정확도',
            'TYPE': 'string'
        },
        {
            'NAME': 'USER_ID',
            'VISIBLE': true,
            'VNAME': '소유자',
            'TYPE': 'string'
        },
        {
            'NAME': 'REG_DATE',
            'VISIBLE': true,
            'VNAME': '등록일',
            'TYPE': 'string'
        },
        {
            'NAME': 'DEPLOY_STATUS',
            'VISIBLE': true,
            'VNAME': '배포 여부',
            'TYPE': 'string'
        },
        {
            'NAME': 'FUNCTION',
            'VISIBLE': true,
            'VNAME': '',
            'VALUE': ['trash', 'download'],
            'TYPE': 'string'
        }
   ];
    constructor(public cDialog: MatDialog,
        private cAppSvc: AlgorithmAppService,
        private cModelManagerSvc: ModelManagerService,
        private cWpLibSvc: WpLoadingService,
        public cMetaSvc: WpMetaService,
        private cAppConfig: WpAppConfig,
        private cMainAppSvc: MainAppService,
        private cTransSvc: TranslateService
    ) { }

    ngOnDestroy(): void {

    }

    ngOnInit(): void {
        // this.drawGrid();
        this.getModelList();
    }

    getModelList() {
        this.cWpLibSvc.showProgress(true, 'algorithmspin');
        this.cModelManagerSvc.getModelList().subscribe(p_data => {
            if (p_data.isSuccess == true && p_data.result.length > 0) {
                this.o_gridData = p_data.result.filter((model: any) => model.CUSTOM_YN === 'N');
                if (this.o_gridData.length > 0) {
                    for (let col of Object.keys(this.o_gridData[0])) {
                        // this.oServerList.push((pData[sIdx].DS_VIEW_NM).toLowerCase());
                        let s_index = this.o_gridCol.findIndex(p_val => p_val.NAME === col);
                        if (s_index == -1) {
                            this.o_gridCol.push({
                                'NAME': col,
                                'VISIBLE': false,
                                'VNAME': col,
                                'TYPE': 'string'
                            });
                        }
                    }
                }
            }
            this.cWpLibSvc.showProgress(false, 'algorithmspin');
        })
    }
    drawGrid() {
        this.cWpLibSvc.showProgress(true, 'algorithmspin');
        this.cModelManagerSvc.getGridCol().then(sResult => {
            this.oGridCol = sResult;
            this.cModelManagerSvc.getGridData().then(sResult => {
                this.oGridData = sResult;
            }).finally(() => {
                this.cWpLibSvc.showProgress(false, 'algorithmspin');
            })
        }).catch(p_Error => {
            this.cWpLibSvc.showProgress(false, 'algorithmspin');
        })
    }

    onGridCallback(pEv: any) {
        if (pEv.eventNm == 'trash')
            this.delModel(pEv.element);
        else if (pEv.eventNm == 'download')
            this.downloadArtifact(pEv.element);
        else if (pEv.eventNm == 'rowClick')
            this.showModelPage(pEv.element);
        else if (pEv.eventNm == 'headBtnEvt') {
            this.getModelList();
        }
        else if (pEv.eventNm == 'personadd')
            this.showAuthorityPopup(pEv.element);
    }

    showModelPage(p_event: any) {
        console.log(p_event);
        this.cWpLibSvc.showProgress(true, 'algorithmspin');
        // 실행결과, 파라미터 정보 넘겨서 모델 메트릭스랑 파라미터 정보 가져온다.
        let s_param = {
            method: 'MODEL-INFO',
            location: 'model-manager',
            MODEL_ID: p_event.MODEL_ID,
            MODEL_IDX: p_event.MODEL_IDX,
            CUSTOM_YN: p_event.CUSTOM_YN
        }

        console.log("s_param : ", s_param);
        this.cModelManagerSvc.getModelInfo(s_param).toPromise().then(pResult => {
            Object.assign(p_event, JSON.parse(pResult)['data']);
            console.log("p_event : ", p_event);
            // 상세 페이지 로직
            this.cAppSvc.changeTab('model-profile', p_event);
        }).finally(() => {
            this.cWpLibSvc.showProgress(false, 'algorithmspin');
        })

    }

    delModel(pEl: any) {
        const dialogRef = this.cDialog.open(WpPopupComponent, {
            data: {
                'title': '알림',
                'flag': true,
                'service': this.cMainAppSvc,
                'message': `모델 ${pEl.MODEL_NM}을 삭제하시겠습니까?`,
                'colWidthOption': 'tight'
            }
        });
        dialogRef.afterClosed().subscribe(pRes => {
            if (pRes) {
                if (pRes.result) {
                    this.cModelManagerSvc.deleteModel(pEl.MODEL_ID).subscribe((p_result) => {
                        console.log(p_result);
                        this.cModelManagerSvc.initGridData().then(() => {
                            this.getModelList();
                        })
                    })
                }
            }
        });
    }

    downloadArtifact(pEl: any) {
        // let s_rootPath = this.cAppConfig.getConfig('DEFAULT_DATA_PATH');
        // let s_artifiactPath = pEl.artifact_uri.split(s_rootPath)[1] + '/model';
        let s_artifiactPath = pEl.MLFLOW_PATH + '/model';
        // 모델 아티팩트 다운로드 로직
        this.cModelManagerSvc.downloadArtifact(pEl.MODEL_NM, s_artifiactPath);
    }

    showAuthorityPopup(pEl: any) {
        const dialogRef = this.cDialog.open(WpPopUpAuthorityComponent, { data: { 'dataset': { MODEL_ID: pEl.MODEL_ID, REG_USER_NO: pEl.REG_USER_NO, MODEL_NM: pEl.MODEL_NM }, type: 'model' }, id: 'wp-popup-authority' });
    }
}
