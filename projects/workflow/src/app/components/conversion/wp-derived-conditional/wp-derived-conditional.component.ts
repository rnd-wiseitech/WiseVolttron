import { MatDialog } from '@angular/material/dialog';
import { WpSocket } from 'projects/wp-lib/src/lib/wp-socket/wp-socket';
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpDerivedCondionalSetComponent } from '../../popup/wp-derived-condional-set.component';
import { WpComponent } from '../../wp-component';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
import { WpComponentService } from '../../wp-component.service';
import { COM_DERV_COND_ATT } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpDerivedCondData } from 'projects/wp-server/util/component/transper/wp-derived'
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
import { COM_ID } from 'projects/wp-lib/src/lib/wp-meta/com-id';
;
/**
 * 데이터 변환 - 파생열 조건부 컴포넌트 클래스
 * 
 * 파생열 조건부 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpDerivedCondData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 파생열 조건부 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpDerivedCondData | WpDerivedCondData}
 * @params {@link WpDiagramService | WpDiagramService}
 * @params {@link WpComponentService | WpComponentService}
 * @params {@link MatDialog | MatDialog}
 * @params {@link WpSocket | WpSocket}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpDerivedConditionalComponent(this.cComViewSvc, this.oComponentData, this.cWpDiagramSvc, this.cWpComSvc, this.matDialog, this.cWpSocketSvc);
 * ```
 */
export class WpDerivedConditionalComponent extends WpComponent {
    oSendColInfo: { [index: string]: any } = {};
    oWpDiagramSvc: WpDiagramService;
    oWpComSvc: WpComponentService;
    oWpSocketSvc: WpSocket;
    oWpData: COM_DERV_COND_ATT;
    public oDialog: MatDialog;
    cTransSvc: TranslateService;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService,
        pWpData: WpDerivedCondData,
        pWpDiagramSvc: WpDiagramService,
        pWpComSvc: WpComponentService,
        pDiaglog: MatDialog,
        pWpSocketSvc: WpSocket
    ) {
        super(pComViewerSvc, pWpData);
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oWpSocketSvc = pWpSocketSvc;
        this.oDialog = pDiaglog;
        this.oWpComSvc = pWpComSvc;
        this.cTransSvc = pTransSvc;
        this.setFormData([{
            vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info31"),
            name: 'excuteFlag',
            value: '',
            type: 'checkbox',
            fvalue: '',
            visible: true,
            edit: true,
            callbak: null
        }, {
            vname: 'Derived column',
            name: 'derivedColumnArray',
            value: '',
            type: 'tab',
            fvalue: [
                {
                    vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info29"),
                    name: 'derivedColumn',
                    value: '',
                    type: 'text',
                    fvalue: '',
                    visible: true,
                    edit: true,
                    callbak: null
                }, {
                    vname: pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info32"),
                    name: 'value',
                    value: '',
                    type: 'button',
                    fvalue: '',
                    visible: true,
                    edit: true,
                    callbak: this.openDerivedPopup.bind(this)
                },
            ],
            visible: true,
            edit: true,
            callbak: null
        }]);
        // WPLAT-351 workflow load할때 popup창에 바로  저장한값 적용되도록
        this.setDerivedData();
        // #154 현재 파생열 조건부 이전에 연결되어있는 컴포넌트까지 실행(출력X)
        // this.oComViewerSvc.showProgress(true);
        // try {
        //     this.oComViewerSvc.showProgress(true);
        //     this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
        // } catch (error) {
        //     console.error(error)
        //     this.oComViewerSvc.showProgress(false);
        // }
    }
    excuteSelectData() {
        this.oWpDiagramSvc.excuteSelectData();
    }
    // 실행한 Job을 통해서 생긴 viewId를 WpData에 저장
    setDervComViewId(pId: string) {
        // (usetable_info) usetable:viewId, schema:컬럼정보
        // let sInfo = this.oWpData.usetable_info;
        if (this.oWpData.usetable_info.usetable !== pId) {
            this.oWpData.usetable_info.usetable = pId;
        }
    }
    setDerivedData() {
        this.oWpData.derivedColumnArray.forEach((sData: any, sIndex: any) => {
            if (sData.colInfo) {
                this.oSendColInfo[sIndex] = sData.colInfo;
                let sBtnElem = document.getElementById(`${COM_ID['T-DERIVED_COND']}_button_${sIndex}`);
                if (sBtnElem && this.oSendColInfo[sIndex].queryText !== '')
                    sBtnElem.innerText = `${this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button10")} ${this.cTransSvc.instant("WPP_COMMON.INFO.info1")}`;
            }
        })
    }
    // # DI 오류수정
    chkSocketConnection() {
        if (!this.oWpSocketSvc.oSocketStatus) {
            console.log("Socket Reconnected");
            this.oWpSocketSvc.onConnection();
        }
    }
    openDerivedPopup(pEvent: any, pIndex: number) {
        try {
            // 실행 옵션이 true 일 때만 직전 연결까지 실행함.
            if (this.oWpData.excuteFlag) {
                this.chkSocketConnection();
                this.oComViewerSvc.showProgress(true);
                this.oWpDiagramSvc.excuteCurrentDiagram('excuteBefore');
                // 컴포넌트 삭제시 unSubscribe 할 수 있게 addSubscription
                let sSubsIdx = this.oWpComSvc.getSubsIdx(this.oComId);
                if (sSubsIdx == -1) {
                    this.oWpComSvc.addSubscription(this.oComId, [
                        this.oWpDiagramSvc.sendJobCallResultEmit.subscribe((pData: any) => {
                            console.log("------send Result-------");
                            if (this.oComViewerSvc.oCurrentComId == this.oComId) {
                                if (pData) {
                                    if (pData.mode == 'excuteBefore') {
                                        setTimeout(() => {
                                            this.oWpDiagramSvc.chkFinishExcute(pData.result.ID).then(async (pResult: any) => {
                                                let pMsg = '';
                                                if (pResult['sucsess']) {
                                                    // 상관관계, 시각화
                                                    this.o_usetable.usetable = pResult['pViewId'];
                                                    let s_schema: any = await this.oWpDiagramSvc.viewTable(pResult['pViewId']);
                                                    this.o_usetable.schema = s_schema['schema'];
                                                    this.o_usetable.data = s_schema['data'];
                                                    pMsg = '파생열 조건부 대상 데이터 조회 완료';
                                                    this.setDervComViewId(pResult['pViewId']);
                                                } else {
                                                    pMsg = '파생열 조건부 컬럼 정보 조회 에러가 발생하였습니다. 입력 데이터의 컬럼 정보를 사용합니다.'
                                                    this.excuteSelectData();
                                                }
                                                this.oComViewerSvc.showMsg(pMsg, false);
                                                this.oComViewerSvc.showProgress(false);
                                                // #203 파생열 조건부/ 파생열 실행 에러처리
                                            }).catch(pError => {
                                                this.oComViewerSvc.showMsg(pError.message, false);
                                                this.oComViewerSvc.showProgress(false);
                                            })
                                        }, 1000);
                                    }
                                    // 데이터 선택만 하는 경우
                                    if (pData.mode == 'selectData') {
                                        this.setDervComViewId(`${pData.result.ID}_0`);
                                        this.oComViewerSvc.showProgress(false);
                                    }
                                }
                                else {
                                    // 기존에 동일한 Job을 실행한 경우
                                    this.oComViewerSvc.showProgress(false);
                                }
                            }
                        }, error => {
                            console.log(error);
                            this.excuteSelectData();
                            this.oComViewerSvc.showProgress(false);
                        })
                    ]);
                }
                setTimeout(() => { this.setDerivedData() }, 50);
            }
        } catch (error) {
            console.error(error)
            this.oWpData.excuteFlag = false;
            this.oComViewerSvc.showProgress(false);
        } finally {
            let sSendInfo = this.oSendColInfo[pIndex] ? this.oSendColInfo[pIndex] : {};
            let sColInfo = {
                ...sSendInfo,
                schema: this.oSchema.schema,
                usetable_info: this.oWpData.usetable_info,
                tableIndex: pIndex,
                comId: this.oComId,
                excuteFlag: this.oWpData.excuteFlag,
            };
            const dialogRef = this.oDialog.open(WpDerivedCondionalSetComponent, {
                id: 'wp-derv-cond-set-popup',
                width: '1000px',
                data: sColInfo
            });
            dialogRef.afterClosed().subscribe(result => {
                if (typeof result == 'undefined') {
                    return;
                }
                if (result['comId'] == this.oComId) {
                    console.log("==== WpDerivedComponent ====");
                    // #138 다른 컴포넌트 선택 후 돌아왔을 때에도 설정 유지하기 위해서 JSON 문자열로 변환
                    this.oWpData.derivedColumnArray[result['tableIndex']].value = result['queryText'];
                    this.oWpData.derivedColumnArray[result['tableIndex']].colInfo = result;
                    this.oSendColInfo[result['tableIndex']] = result;
                    if (result['usetable_info']) {
                        this.oWpData.usetable_info = result['usetable_info'];
                    }
                    let sBtnElem = document.getElementById(`${COM_ID['T-DERIVED_COND']}_button_${result.tableIndex}`);
                    sBtnElem.innerText = result['queryText'] && result['queryText'].length > 0 ? `${this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button10")} ${this.cTransSvc.instant("WPP_COMMON.INFO.info1")}` : this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.BUTTON.button10");
                }
            });
        }
    }
    // 파생열 조건부 컬럼명 validation
    onKeyUp(pEvent: any, pName: string, pIndex: number) {
        let sDervColNm = pEvent.srcElement.value; // 입력 값
        let sIsValidInput = this.isValidString(sDervColNm, 'colNm');
        // 입력값이 유효하지 않을 경우
        if (!sIsValidInput.isValid) {
            this.oComViewerSvc.showMsg(`유효한 컬럼명을 입력하세요`, false);
            this.oWpData.derivedColumnArray[pIndex][pName] = sIsValidInput.result;
            pEvent.srcElement.value = sIsValidInput.result;
        }
    }
}