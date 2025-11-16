import { WpComponentViewerService } from '../../wp-component-viewer.service';
import * as _ from "lodash";
import { WpComponent } from '../../wp-component';
import { COM_TYPE_ATT, WpComData } from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpTypeData } from 'projects/wp-server/util/component/transper/wp-type';
import { WpComponentViewerComponent } from '../../wp-component-viewer.component';
import { WpDiagramComponent } from '../../../wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';

/**
 * 데이터 변환 - 타입 변환 컴포넌트 클래스
 * 
 * 타입 변환 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpTypeData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 타입 변환 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link WpTypeData | WpTypeData}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpTypeComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
export class WpTypeComponent extends WpComponent {
    oWpData: Array<COM_TYPE_ATT>;
    constructor(
        pTransSvc: TranslateService,
        pComViewerSvc: WpComponentViewerService, 
        pWpData: WpTypeData) { 
        super(pComViewerSvc,pWpData);
        this.setFormData([{ 
                vname:'Converters',
                name:'converters',
                value:'',
                type:'tab',
                fvalue:[{
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info19"),
                name:'column',
                value:'',
                type:'select',
                fvalue:[],
                visible:true,
                edit:true,
                callbak:this.onColChange.bind(this)
            },
            {
                vname:pTransSvc.instant("WPP_WORKFLOW.COMPONENT.INFO.info20"),
                name:'type',
                value:'',
                type:'select',
                fvalue:['string','integer','double'],
                visible:true,
                edit:true,
                callbak:this.onColTypeChange.bind(this)
                },
            ],
            visible:true,
            edit:true,
            callbak:null
        }]);
    }
    public onColChange(pEvent:any, pIndex:any){
        console.log('=======onColChange=========');
        let { sComId, sTabIdx } = this.oComViewerSvc.getCurrentTabInfo(pEvent);
        let sColName = this.oWpData[sTabIdx].column
        // #69 동일 컬럼을 여러번 타입변환 할 수 없도록 막음
        let sColCount = 0;
        this.oWpData.forEach((sCol:any) => {
            if (sCol.column == sColName)
                sColCount ++;
            })
        if (sColCount > 1){
            this.oComViewerSvc.showMsg('컬럼을 중복하여 선택할 수 없습니다',false);
            // pEvent.target.selectedIndex = -1
            pEvent.component._clearValue();
            if (sComId == this.oComId){ 
                this.oWpData[sTabIdx].column  = '';
                this.oWpData[sTabIdx].type  = '';
            } 
        }
        else {
            for (let sCom of this.oSchema.schema){
                // 기존 컬럼 타입 표시 에러 수정
                if (sColName == sCom.name){
                    this.oWpData[sTabIdx].type  = sCom.type;
                    break;
                }
            }
        }
    }
    public onColTypeChange(pEvent:any){
    // #69 대상 컬럼을 선택하지 않은 타입 변환은 불가
        let sCurrentTabInfo = this.oComViewerSvc.getCurrentTabInfo(pEvent);
        let sComId = sCurrentTabInfo.sComId;
        if (sComId == this.oComId){ 
            let sTabIdx = sCurrentTabInfo.sTabIdx;
            if (this.oWpData[sTabIdx].column == ''){
                this.oComViewerSvc.showMsg('타입을 변환할 컬럼을 선택해주세요',false);
                // pEvent.target.selectedIndex = -1
                pEvent.component._clearValue();
                this.oWpData[sTabIdx].type  = '';
            }
        } 
    }
    public setSchema(pSchema: WpComData) {
        this.oSchema = pSchema;
        let sTmpSchema = [];
        let sFormTypeList = this.oFormData[0].fvalue.filter((sForm: any) => sForm.name === 'type')[0].fvalue;
        for (let sCom of this.oSchema.schema) {
            sTmpSchema.push(sCom.name);
            if (!sFormTypeList.includes(sCom.type)) {
                sFormTypeList.push(sCom.type)
            }
        }
        this.oComViewerSvc.selectData(pSchema);
        this.setTypeColList(sTmpSchema, sFormTypeList);
    }
    public setTypeColList(pList: string[], sFormTypeList: string[]) {
        this.oFormData.map(e => {
            e.fvalue.map((e1: any) => {
                if (e1.name == 'column') {
                    e1.fvalue = pList;
                } else if (e1.name == 'type') {
                    e1.fvalue = sFormTypeList;
                }
            });
        });
    }
}
