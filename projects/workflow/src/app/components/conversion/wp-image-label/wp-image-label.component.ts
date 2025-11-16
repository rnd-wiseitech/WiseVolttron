import { Component } from '@angular/core';
import { WpComponentViewerService } from 'projects/workflow/src/app/components/wp-component-viewer.service';
import { WpComponentViewerComponent } from 'projects/workflow/src/app/components/wp-component-viewer.component';
import { WpComponent } from 'projects/workflow/src/app/components/wp-component';
import { COM_IMG_LABEL_ATT, WpComData} from 'projects/wp-server/wp-type/WP_COM_ATT';
import { WpImgLabelData } from 'projects/wp-server/util/component/transper/wp-image-label';
import { WpDiagramComponent } from 'projects/workflow/src/app/wp-diagram/wp-diagram.component';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { WpImageListPopUpComponent} from '../../../../../../image-unstructured/src/app/image-popup/image-list-popup.component'
import { WpDiagramService } from '../../../wp-diagram/wp-diagram.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { v4 } from 'uuid';

/**
 * 데이터 변환 - 이미지 라벨 컴포넌트 클래스
 * 
 * 이미지 라벨 컴포넌트의 속성을 설정하는 클래스
 *
 * {@link WpComponent | WpComponent} 컴포넌트를 상속받아 사용하므로 
 * `super(WpComponentViewerService, WpSortData)`를 호출해야 한다.
 * 
 * {@link WpDiagramComponent | WpDiagramComponent} 에서 정렬 컴포넌트를 클릭하면 
 * {@link WpComponentViewerComponent | WpComponentViewerComponent} 에 컴포넌트 속성이 표시된다.
 * 
 * @params {@link WpComponentViewerService | WpComponentViewerService}
 * @params {@link MatDialog | MatDialog}
 * 
 * @example
 * ```ts
 * this.oComponent = new WpSortComponent(this.cComViewSvc, this.oComponentData);
 * ```
 */
@Component({
    selector: 'image-label',
    template: '' 
})
export class WpImageLabelComponent extends WpComponent {
    oWpData: COM_IMG_LABEL_ATT;
    oDialog: MatDialog;
    oTransSvc : TranslateService;
    oWpDiagramSvc: WpDiagramService;
    oMetaSvc: WpMetaService;
    constructor( pTransSvc: TranslateService, pComViewerSvc: WpComponentViewerService, pWpData: WpImgLabelData, pDiaglog: MatDialog, pWpDiagramSvc: WpDiagramService, pMetaSvc : WpMetaService ) {
        super(pComViewerSvc,pWpData);
        this.oWpDiagramSvc = pWpDiagramSvc;
        this.oMetaSvc = pMetaSvc;
        this.setFormData([{ 
                vname:'이미지 라벨 설정',
                name:'column',
                value:'',
                type:'button',
                fvalue:[],
                visible:true,
                callbak:this.onBtnClick.bind(this),
                edit:true
            }, 
            // { 
            //     vname:'이미지 라벨 불러오기',
            //     name:'column',
            //     value:'',
            //     type:'fileInput',
            //     fvalue:[],
            //     visible:true,
            //     callbak:this.onlabelUploadClick.bind(this),
            //     edit:true
            // }
        ]);
        this.oDialog = pDiaglog;
    }

    async onBtnClick(pEvent: any) {
        // 라벨링 데이터셋 
        // let sFilePath = this.oSchema.data.map((sImgValue:any) => {
        //     sImgValue = typeof(sImgValue) === 'string' ? JSON.parse(sImgValue) : sImgValue
        //     return sImgValue;
        // });
        let sFilePath = JSON.parse(this.oSchema.data[0])
        let sCurrentNode = this.oWpDiagramSvc.getNodesById(this.oComId);
        let sParentNode =  this.oWpDiagramSvc.getNodesById(sCurrentNode.parentId[0])
        let sImageCount = sParentNode['wp-data']['o_data']['count']
        let sParentJobId =  sParentNode.jobId;
        // console.log(this.oWpDiagramSvc.getNodesById(sCurrentNode.parentId[0]))
        if (Object.keys(sFilePath).includes('labelpath') && this.oWpData['label'].length == 0){
            let sParam = {
                action:'readfile',
                method: 'T-IMAGE-LABEL',
                groupId: 'Temp',
                jobId: sCurrentNode.jobId,
                location: 'workflow',
                data: {
                    filepath : `${sFilePath['labelpath']}/ui.json`,
                }
            };
            let sLabelData:any = await this.oMetaSvc.getLabelFile(sParam).toPromise()
            this.oWpData.label = JSON.parse(sLabelData)['data']
            this.oWpData.tagList = JSON.parse(sLabelData)['data'][0]['category']
        }
        
        let sData: any = {type : 'label', imageCount : sImageCount, label: this.oWpData.label, tagList: this.oWpData.tagList, currentJobId : sCurrentNode.jobId, usetable: this.oSchema['wp-data']['o_data']['usetable']};
        // 라벨링 팝업창 띄워서 라벨 작업 진행
        const dialogRef = this.oDialog.open(WpImageListPopUpComponent, {
            width: '1800px',
            data: sData,
            id: 'wp-list-popup',
            });
            // 라벨링 팝업창 종료 후, 라벨 작업한 데이터 ui.json 형태로 변환해 oWpData에 저장
            dialogRef.afterClosed().subscribe(pRes => {
            if (pRes) {
                this.oWpData.label = Object.entries(pRes.label).map(([pLabelDataKey, pLabelDataValue]:[string, any]) =>{
                    let sLabel:any = [];
                    if (Object.keys(pLabelDataValue).includes('label')) {
                        sLabel = Object.values(pLabelDataValue['label']);
                        sLabel = sLabel.filter((sLabel:any) => sLabel.value !== undefined || sLabel.value !== '');
                    }
                    // ui.json 값 형태로 변환
                    return { fileName : pLabelDataKey, category : pRes.tagList, images: pLabelDataValue['images'], value : Object.values(pLabelDataValue['label'])};
                })
                this.oWpData.tagList = pRes.tagList
            }
        });
    }

    // 라벨 업로드 기능
    onlabelUploadClick(pEvent: any) {
        const sInput = document.createElement('input');
        sInput.type = 'file';
        sInput.accept = '.json, .ymal, .txt'; // 필요 시 확장자 제한
        sInput.multiple = false; // 여러 파일 허용 시 true (YOLO 파일 같은 경우 여러개 씀)

        sInput.onchange = (pEvent: Event) => {
            
            const sUploadFile = pEvent.target as HTMLInputElement;
            if (sUploadFile.files && sUploadFile.files.length > 0) {
                this.oComViewerSvc.showProgress(true);
                const sLabelFile = sUploadFile.files[0];
            
                const sReader = new FileReader();
                sReader.onload = () => {
                    const sLabelFileData = sReader.result as string;
                    try{
                        this.validation(sLabelFileData)
                        this.oComViewerSvc.showMsg(`라벨 업로드가 완료되었습니다`, false);
                    }
                    catch (error){
                        this.oComViewerSvc.showMsg(`라벨 업로드에 오류가 발생했습니다`, false);
                    }
                    this.oComViewerSvc.showProgress(false);
                };
                sReader.readAsText(sLabelFile);
            }
        };
        sInput.click();
    }

    // JSON 변환 되는지, 불러온 라벨 데이터가 WPP에서 정한 규칙과 맞는 지 확인하고 통과할 경우 oSchema.Data 넣어주게 설정
    validation(pLabelData:any){
        let sLabelParseData = JSON.parse(pLabelData);

        
        // schema 데이터 하나찍 JSON.Parse 변환
        this.oSchema.data = this.oSchema.data.map((sImgValue:any) => {
            sImgValue = typeof(sImgValue) === 'string' ? JSON.parse(sImgValue) : sImgValue
            // 형식에 맞춘 label데이터 업로드 한거 하나씩 가져와서
            sLabelParseData.forEach((pLabelListData:any) => {
                // oSchema.data에 맞는 데이터에 찾아주기
                if(pLabelListData['fileName'] == sImgValue['fileName']){
                    // 있으면 labelData값 넣어주기
                    sImgValue['label'] = {};
                    pLabelListData['value'].forEach((pLabel:any) => {
                        let sLocalUuid = v4();
                        sImgValue['label'][sLocalUuid] = {segmentations : pLabel['segmentations'], type : pLabel['type'], value : pLabel['value']};
                    });
                }
            });
            return sImgValue;
        });
    }
    
}
