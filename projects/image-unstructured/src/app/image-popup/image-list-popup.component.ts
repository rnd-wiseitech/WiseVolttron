// image-list-popup.component.ts
import { Component, OnInit, AfterViewInit, ViewChild, Inject, ElementRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { MatPaginator } from '@angular/material/paginator';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
import { imageListPopupService } from './image-list-popup.service';
import { fabric } from 'fabric';
import { DrawType } from '../types/image-types';

@Component({
  selector: 'image-list-popup',
  templateUrl: './image-list-popup.component.html',
  styleUrls: ['./image-list-popup.component.css']
})
export class WpImageListPopUpComponent implements OnInit, AfterViewInit {
  @ViewChild('imgCanvas', { static: false }) oCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild(MatPaginator) oPaginator!: MatPaginator;
  
  // 화면 상태
  h_display: 'list' | 'profile'  | 'predict' | 'tag' | 'model-result'= 'list';
  h_type: 'label' | 'validate' | 'tag' = 'label';
  h_imgDataDisplay = false;

  // 리스트/페이지
  h_ImageCount = 0;
  h_Pagenate: number[] = [];
  h_pageSize = 20;
  h_pageIndex = 1;
  h_ImageList: any[] = [];

  // Hover 정보
  h_ImageInfo: any = {};


  // ...클래스 안에 "최근 선택 상태" 저장용 멤버 추가
  o_currDrawType: DrawType = 'none'; // 마지막에 사용한 라벨링 도구
  o_currTag = '';                    // 마지막에 사용한 라벨 값
  h_currBtnIdx: number | null = null; // (선택 라벨의 버튼 인덱스, UI 하이라이트용)

  // 태그 (소스오브트루스는 부모가 보관)
  o_labelList: string[] = [];

  // 라벨 전체 집계: { [filename]: { images:{w,h}, label:{...} } }
  oLabelData: Record<string, { images: { width:number; height:number }, label:any }> = {};
  oLabelTag : string[] = []
  // 현재 선택 이미지 & 캔버스
  oImageData: { fileName: string; images: { width:number; height:number }; imageIdx: number } | null = null;
  oImage!: fabric.Canvas;               // 부모(공통)가 소유하는 캔버스
  selectedImageBase64: string | null = null;

  // 배경 준비 완료 → 자식 복원 트리거
  h_refreshTick = 0;
  // 캔버스 크기 비율
  o_canvasScale: number = 1;
  // 줌 확대 최댓값, 줌 축소 최솟값
  o_minZoom: number = 1;
  o_maxZoom: number = 16;
  // 줌하기 전 원본 이미지 크기(폭/높이)
  o_baseImgW: number = 0;
  o_baseImgH: number = 0;

  // 드래그 버튼 토글
  h_dragChk: boolean = false;
  // 현재 드래그 중인지 여부
  o_dragging: boolean = false;
  // 드래그 포인터 위치
  o_dragStart: any = { x: 0, y: 0 };

  h_labelCounts:any = {}
  o_imageFullData:any;
  h_modelList:any = [];
  h_relearnModel:any = null;
  h_paramlist:any = [];
  o_labelSave = true;
  o_argInfo:any;
  h_modelSaveOption:any = ['new', 'overwrite'];
  h_selectedOption = 'new';
  h_chartData:any;
  h_classGridData:any;
  h_metricsGridData:any;
  h_modelname:any;
  h_overwriteModel:any = null;

  constructor(
    private cMainAppSvc: MainAppService,
    private cMetaSvc: WpMetaService,
    @Inject(MAT_DIALOG_DATA) public oData: any,
    public dialogRef: MatDialogRef<WpImageListPopUpComponent>,
    private cTransSvc: TranslateService,
    private oDialog: MatDialog,
    private cWpLibSvc: WpLoadingService,
    private c_imgListPopupSvc: imageListPopupService
  ) {}

  async ngOnInit(): Promise<void> {
    // 초기화
    this.h_display = 'list';
    this.h_type = this.oData?.type ?? 'label';
    this.h_ImageCount = this.oData?.imageCount ?? 0;
    this.h_Pagenate = Array.from({ length: this.h_ImageCount }, (_, i) => i + 1);

    // 라벨/태그 복구
    if (this.oData?.label) {
      this.oData.label.forEach((sLabelData: any) => {
        this.oLabelData[sLabelData['fileName']] = { images: sLabelData['images'], label: sLabelData['value'] };
      });
    }
    // 라벨 태그 설정한 것이 있을 경우 불러옴
    if (this.oData?.tagList) this.o_labelList = [...this.oData.tagList];

    // (옵션) 검증 모드 준비
    if (this.h_type === 'validate') {
      try {
        await this.c_imgListPopupSvc.getRelearnModelList('Image');
        await this.c_imgListPopupSvc.getArgParam('4000');
      } catch {}
    }

    // 첫 페이지 로딩
    await this.onPageSetIndex(1);
  }

  ngAfterViewInit(): void {}

  // 이미지 로드 후 크기 저장: 이미지 리스트에서 이미지 업로드 될 때 가로, 세로 길이 지정하는 기능 (리스트에서 사진 마우스에 올릴 때 오른쪽 이미지 정보에서 보여줌)
  onImageLoad(pEvent: Event, pIndex: number) {
    const s_el = pEvent.target as HTMLImageElement;
    this.h_ImageList[pIndex]['images'] = { width: s_el.naturalWidth, height: s_el.naturalHeight };
  }

  // 이미지 리스트 클릭 → PROFILE 전환 + 캔버스 초기화 + 배경 로딩(공통 책임)
  onImageClick(pImageData: any, pImageIndex: number, p_displayType: 'list' | 'profile' | 'tag' |'predict' = 'profile') {

    // 태그 없으면 경고 + 화면전환 차단
    this.o_labelList = (this.o_labelList || []).filter(t => t !== '');
    if (this.o_labelList.length === 0) {
      this.cMainAppSvc.showMsg('라벨 태그가 없습니다.\n이미지 라벨 태그에서 라벨 태그를 하나 이상 설정하세요.', false);
      return;
    }

    // 태그가 있는 경우에만 화면전환
    this.h_display = p_displayType;

    this.oImageData = {
      fileName: pImageData['filename'],
      images: pImageData['images'],
      imageIdx: pImageIndex
    };

    // 검증인 경우에는 이미지 컬럼명이 predict_base64
    let s_base64Key = 'base64';
    if(this.h_display == 'predict') {
      s_base64Key = 'predict_base64';
    };
    this.selectedImageBase64 = pImageData[s_base64Key];

    this.loadCanvasBackground(this.selectedImageBase64!, this.oImageData!.images);
  }

  // 리스트에서 클릭한 이미지 조정/라벨 기능창으로 전환하는 기능: 배경 이미지 로딩(공통) + 자식 복원 트리거
  loadCanvasBackground(p_imgSrc: string, p_imageSize: { width:number; height:number }) {
    const s_canvasElement = this.oCanvasRef?.nativeElement;
    if (!s_canvasElement) return;

    // 기존 fabric Canvas가 있다면 dispose
    if (this.oImage) this.oImage.dispose();

    // fabric Canvas 초기화
    this.oImage = new fabric.Canvas(s_canvasElement, {
      stopContextMenu: true,
      fireRightClick: true,
      selection: false,
      uniformScaling: false,
      // 드래그 옵션
      allowTouchScrolling: true,
      preserveObjectStacking: true
    });

    // 배경 이미지 설정: 비동기 배경 로딩
    fabric.Image.fromURL(p_imgSrc, (img: any) => {
      img.set({ opacity: 1, left: 0, top: 0 });

      // 원본 이미지 크기 저장 후 화면맞춤
      this.o_baseImgW = p_imageSize?.width || img.width;
      this.o_baseImgH = p_imageSize?.height || img.height;

      // setCanvasScale()로 이동함
      // this.oImage.setWidth(s_w);
      // this.oImage.setHeight(s_h);

      // 캔버스 크기 1배
      this.setCanvasScale(1);
      // 캔버스가 레이아웃된 직후, 화면에 맞추기 + 중앙 정렬
      setTimeout(() => this.fitToScreen(), 10);

      // ❌ this.oImage.clear();  // (오버레이까지 지워지는 레이스 위험) 사용하지 않음
      this.oImage.setBackgroundImage(img, this.oImage.requestRenderAll.bind(this.oImage));

      // 배경 준비 완료 → 자식에게 복원 신호(값 증가)
      this.h_refreshTick++;
    });
  }

  // 이미지 리스트에 이미지 위에 커서 올릴 때 오른쪽 칸에 이미지 정보 보여주는 기능
  onHoverStart(pEvent: any, pFileData: string) {
    this.h_imgDataDisplay = true;
    const s_el: HTMLImageElement = pEvent.target;
    // 파일 크기 계산, GPT가 알려준대로 하긴 했는데 나중에 파일 가져올때 크기도 가져오게 바꾸든가 해야할듯
    const s_fileSize = Math.floor(((s_el.src.length * 3) / 4 - 2) / 1024);
    this.h_ImageInfo = {
      fileName: pFileData,
      fileResolution: `${s_el.naturalWidth} x ${s_el.naturalHeight}`,
      fileSize: `${s_fileSize}KB`,
      width: s_el.naturalWidth,
      height: s_el.naturalHeight
    };
  }

  // 이미지 리스트에 이미지 위에 커서 나갈 때 이미지 정보 안보이게 처리하는 기능
  onHoverEnd() {
    this.h_imgDataDisplay = false;
  }

  // 이미지 불러와 페이징처리 하는 기능 
  async onPageSetIndex(pPageIndex: number) {
    this.cWpLibSvc.showProgress(true, 'wppopupspin');

    // job 파라미터 설정
    const sParam = {
      action: 'page',
      method: '',
      groupId: 'image-label',
      jobId: this.oData?.currentJobId,
      location: 'workflow',
      data: {
        page: pPageIndex,
        usetable: this.oData?.usetable,
        dataType: 'image'
      }
    };

    // 이미지 base64로 불러온 후 페이지 값 저장
    const sImageList = await this.cMetaSvc.getImageBase64List(sParam).toPromise();
    this.h_ImageList = JSON.parse(sImageList).data.map((sRow: string) => JSON.parse(sRow));
    this.h_pageIndex = pPageIndex;
    this.cWpLibSvc.showProgress(false, 'wppopupspin');
  }

  // 자식(프로필)에서 넘어온 라벨 결과 반영
  onLabelDataChange(p_ev: { fileName:string, images:{width:number; height:number}, label:any }) {
    const { fileName, images, label } = p_ev;
    const s_hasAny = label && Object.keys(label).length > 0;
    if (s_hasAny) {
      this.oLabelData[fileName] = { images, label };
    } else {
      // 모든 라벨이 삭제된 경우 항목 자체를 제거해야 썸네일 보더/복원 안 뜸
      delete this.oLabelData[fileName];
    }
  }

  // 뒤로 가기: 이미지 리스트 화면으로 돌아가는 기능
  onBackList() {
    this.h_display = 'list';
    this.oImage?.discardActiveObject();
    this.oImage?.renderAll();
  }
  // 라벨 팝업창 닫기: 오른쪽 위에 X 버튼이나 오른쪽 아래 닫기 버튼 눌렀을때 작동
  onClose() {
    // 라벨링 작업 데이터 wp-img-label.component.ts로 보내줌, 거기서 ui.json 형태로 변환
    this.dialogRef.close({
      label: this.oLabelData,
      tagList: this.o_labelList
    });
  }
  // 라벨 팝업창이 어떤 식으로든 닫히면 해당 기능 실행, onClose 실행해도 작동
  ngOnDestroy() {
    try {
      this.dialogRef.close({
        label: this.oLabelData, 
        tagList: this.o_labelList
      });
    } catch {}
  }

  onWarn(pMsg: string) {
    this.cMainAppSvc.showMsg(pMsg, false);
  }

  // "+" 버튼 클릭 시 확대
  zoomIn() {
    // 캔버스 크기 1.5배
    if (this.o_canvasScale === 1) {
      this.setCanvasScale(1.5);
    }
    this.zoomBy(1.2, this.getCanvasCenter());
  }
  // "-" 버튼 클릭 시 축소
  zoomOut() {
    this.zoomBy(1 / 1.2, this.getCanvasCenter());
  }
  getCanvasCenter(): fabric.Point {
    return new fabric.Point(this.oImage.getWidth() / 2, this.oImage.getHeight() / 2);
  }
  // factor 비율로 zoom
  zoomBy(factor: number, anchor?: fabric.Point) {
    if (!this.oImage) return;
    const curr = this.oImage.getZoom();
    const next = this.clamp(curr * factor, this.o_minZoom, this.o_maxZoom);
    const p = anchor ?? this.getCanvasCenter();

    this.oImage.zoomToPoint(p, next);
    this.oImage.requestRenderAll();
  }
  clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
  }

  // 캔버스 크기 변경
  setCanvasScale(factor: number) {
    if (!this.oImage || !this.oCanvasRef?.nativeElement || !this.o_baseImgW || !this.o_baseImgH) return;

    this.o_canvasScale = factor;

    const w = Math.round(this.o_baseImgW * factor);
    const h = Math.round(this.o_baseImgH * factor);

    // Fabric 내부 버퍼
    this.oImage.setWidth(w);
    this.oImage.setHeight(h);

    // 실제 DOM 사이즈(시각적 면적)
    const el = this.oCanvasRef.nativeElement;
    el.style.width  = `${w}px`;
    el.style.height = `${h}px`;

    this.oImage.calcOffset();

    // 현재 줌 유지하고 중앙으로 보정
    const z = this.oImage.getZoom();
    const { w: vw, h: vh } = this.getViewportSize();   // 캔버스의 현재 표시 크기(px)
    const dx = (vw - this.o_baseImgW * z) / 2;
    const dy = (vh - this.o_baseImgH * z) / 2;
    this.oImage.setViewportTransform([z, 0, 0, z, dx, dy]);
    this.oImage.requestRenderAll();
  }

  // "드래그" 버튼 클릭 시 토글
  toggleDrag() {
    this.h_dragChk = !this.h_dragChk;
    this.setCanvasCursor(this.h_dragChk ? 'grab' : 'default');
  }
  // 드래그 여부에 따른 커서 모양 설정
  setCanvasCursor(style: 'default' | 'grab' | 'grabbing') {
    if (!this.oImage) return;
    this.oImage.defaultCursor = style;
    this.oImage.setCursor(style);
  }

  // "초기화" 버튼 클릭 시 확대 축소 드래그 초기화
  fitToScreen() {
    if (!this.oImage || !this.o_baseImgW || !this.o_baseImgH) return;

    // 캔버스 크기 원래대로 되돌림
    if (this.o_canvasScale !== 1) {
      this.setCanvasScale(1);
    }
    // 모든 변환 초기화 (줌/드래그 리셋)
    this.oImage.setViewportTransform([1, 0, 0, 1, 0, 0]);

    const { w, h } = this.getViewportSize();
    if (!w || !h) return;
    const z = this.clamp(Math.min(w / this.o_baseImgW, h / this.o_baseImgH), this.o_minZoom, this.o_maxZoom);
    const dx = (w - this.o_baseImgW * z) / 2;
    const dy = (h - this.o_baseImgH * z) / 2;

    this.oImage.setViewportTransform([z, 0, 0, z, dx, dy]);
    this.oImage.requestRenderAll();
  }

  // 캔버스 표시 영역 크기
  getViewportSize() {
    const parent = this.oCanvasRef?.nativeElement?.parentElement as HTMLElement; // .image-select
    const rect = parent?.getBoundingClientRect();
    return { w: rect?.width ?? 0, h: rect?.height ?? 0 };
  }
  //이미지 라벨 태그에서 태그 삭제시 이미지 태그 해제하는 기능, 지금 이미지 분류 컴포넌트에만 적용됨
  tagRemove(pTagEmit : {data : string[], emitType: string, colorMap : Record<string, string>}){
    this.o_labelList = pTagEmit['data']
    let tagColorMap = pTagEmit['colorMap']
    // 태그가 삭제될 때
    if (pTagEmit['emitType'] == 'removeTag'){
      // 이미지 순회 돌면서
      Object.entries(this.oLabelData).map(([key, value]) => {
        // 라벨 값이 설정되어 있는지 확인
        if(value['label'] !== undefined){ 
          // 라벨 값이 리스트에 있는지 확인, 없으면 라벨을 지움
          if(!pTagEmit['data'].includes(value['label']['value'])){
            value['label'] = undefined
          }
          // 있으면 현재 태그 색에 맞춰서 테두리색 변경
          else {
            value['label']['tagColor'] = tagColorMap[value['label']['value']]
          }
        }
      });
    }
  }
  // 재학습 모델 실행
  async executeRelearnModel(p_event:any) {
    const s_paramError = this.h_paramlist.some((param:any) => param.error);

    if (s_paramError) {
      this.cMainAppSvc.showMsg('파라미터 값을 다시 확인해주세요.', false);
      return;
    }
    if(this.oData.imageCount > Object.keys(this.oLabelData).length) {
      this.o_labelSave = false;
      this.cMainAppSvc.showMsg('라벨링이 안된 이미지 파일이 있습니다. 확인 후 라벨링파일 저장을 먼저 실행해주세요.', false);
      return;
    }
    if(this.o_labelSave == false) {
      this.cMainAppSvc.showMsg('라벨링 파일을 먼저 저장해주세요.', false);
      return;
    }
    if(this.h_relearnModel == null) {
      this.cMainAppSvc.showMsg('재학습할 모델을 선택해주세요.', false);
      return;
    }
    this.cWpLibSvc.showProgress(true, 'wppopupspin');
    let s_param = {
      action:"model-train",
      method:"train",
      jobId:"1",
      data:{
          modelname:"",
          parameter: this.h_paramlist,
          optimizer:{
            use:false,
            type:""
          },
          scaler:"No Scale",
          modelInfo: this.o_argInfo,
          targetCol:"No Target",
          partition:{
            type:"t-holdout",
            value:"20"
          },
          usetable: this.oData.usetable,
          comId: this.oData.comId
      },
      groupId:"predict",
      location:"workflow"
    }
    let s_modelResult:any = await this.c_imgListPopupSvc.exeuteModelTrain(s_param);
    s_modelResult = await this.c_imgListPopupSvc.getModelResult([this.oData.comId]);
    s_modelResult = JSON.parse(s_modelResult[0]['MODEL_RESULT'])
    let s_chartResult = JSON.parse(s_modelResult['evaluateLog']['result']);
    this.h_chartData = await this.c_imgListPopupSvc.getConfusionChart(s_chartResult);
    this.h_classGridData = await this.c_imgListPopupSvc.getClassGrid(s_modelResult['evaluateLog']);
    this.h_metricsGridData = await this.c_imgListPopupSvc.getMetricsGrid(s_modelResult['featureLog']);
    console.log("this.h_chartData ", this.h_chartData )
    this.h_display='model-result';
    this.cWpLibSvc.showProgress(false, 'wppopupspin');
    console.log("s_comId : ", this.oData.comId);
    console.log("s_modelResult : ", s_modelResult);
  }
  // 파라미터 설정시 validation
  validateParam(param: any) {
    const val = Number(param.value);

    // 1. 숫자 유효성 검사
    if (isNaN(val)) {
      param.error = `${param.name} 값은 숫자여야 합니다.`;
      return;
    }

    // 2. 범위 검사
    if (param.options && param.options.length === 2) {
      const [min, max] = param.options;
      if (val < min || val > max) {
        param.error = `${param.name} 값은 ${min} ~ ${max} 사이여야 합니다.`;
        return;
      }
    }

    // 3. 에러 없음
    delete param.error
  }
  // 재학습 모델 선택
  async selectModel(p_model: any) {

    // const s_relearnModel = event.target.value;
    console.log("p_model : ", p_model);
    console.log(" this.h_relearnModel : ",  this.h_relearnModel);
    let s_param = {
            method: 'MODEL-PARAM',
            location: 'model-manager',
            MODEL_ID: p_model.MODEL_ID,
            MODEL_IDX: p_model.MODEL_IDX,
            CUSTOM_YN: p_model.CUSTOM_YN
        }


    let s_modelInfo:any = await this.c_imgListPopupSvc.getModelInfo(s_param);
    s_modelInfo = JSON.parse(s_modelInfo);
    let s_modelParam = s_modelInfo.data.params;
    let s_weigthPath = s_modelInfo.data.weightPath
    // 파라미터 업데이트
    for (let param of this.h_paramlist) {
      if (param.name != 'model' && s_modelParam.hasOwnProperty(param.name)) {
        param.value = s_modelParam[param.name];
      }
      if(param.name == 'model') {
        param.value = s_weigthPath;
      }
    }
  }
  // 재학습 라벨 저장
  async saveLabelFile(p_event: any) {
    try {
      this.cWpLibSvc.showProgress(true, 'wppopupspin');
      // 라벨값 길이 계산
      // Object.keys(this.oLabelData).length;
      let s_labelData = Object.entries(this.oLabelData).map(([pLabelDataKey, pLabelDataValue]:[string, any]) =>{
                            let sLabel:any = [];
                            if (Object.keys(pLabelDataValue).includes('label')) {
                                sLabel = Object.values(pLabelDataValue['label']);
                                sLabel = sLabel.filter((sLabel:any) => sLabel.value !== undefined || sLabel.value !== '');
                            }
                            // ui.json 값 형태로 변환
                            return { fileName : pLabelDataKey, category : this.oLabelTag, images: pLabelDataValue['images'], value : Object.values(pLabelDataValue['label'])};
                        });
      console.log("s_labelData : ", s_labelData);

      let s_param = {
        action: 'image-transform',
        method: 'image-label',
        groupId: this.oData.dsViewId,
        jobId: '',
        location: 'workflow',
        data: {
          usetable: this.oData.usetable,
          label: s_labelData,
          type: 'relabel',
          filename: this.oData.dsViewId

        }
      }
      let s_result = await this.c_imgListPopupSvc.saveImageLabel(s_param);

      this.cWpLibSvc.showProgress(false, 'wppopupspin');
      this.cMainAppSvc.showMsg('신규 라벨링 저장 완료', true);
      this.o_labelSave = true;
    } catch(error) {
      this.o_labelSave = false;
      this.cWpLibSvc.showProgress(false, 'wppopupspin');
      this.cMainAppSvc.showMsg('신규 라벨링 저장 실패', false);
    }

    
  }
}
