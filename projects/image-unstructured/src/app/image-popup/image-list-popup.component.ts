import { Component, OnInit, AfterViewInit, ViewChild, Inject, ElementRef } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { MainAppService } from 'projects/main/src/app/app.service';
import { WpMetaService } from 'projects/wp-lib/src/lib/wp-meta/wp-meta.service';
import { MatPaginator } from '@angular/material/paginator';
import { v1, v5, v4 } from 'uuid';
import { fabric } from 'fabric';
import { WpLoadingService } from 'projects/wp-lib/src/lib/wp-lib-loading/wp-lib-loading.service';
@Component({
  selector: 'image-list-popup',
  templateUrl: './image-list-popup.component.html',
  styleUrls: ['./image-list-popup.component.css']
})
export class WpImageListPopUpComponent implements OnInit, AfterViewInit {
  @ViewChild('imgCanvas', { static: false }) oCanvasRef!: ElementRef<HTMLCanvasElement>
  @ViewChild(MatPaginator) oPaginator: MatPaginator;
  oDialog: MatDialog;
  
  h_display = 'list';
  h_Rotate = 0;
  h_ResizeX = 1;
  h_ResizeY = 1;
  h_SkewX = 0;
  h_SkewY = 0;
  h_showPopup = true;
  h_imgDataDisplay = false;
 
  // 이전 다음 이미지 버튼
  h_prevButton = true;
  h_nextButton = true;

  h_ImageCount : number= 0
  h_Pagenate : any = [];
  h_pageSize : number = 20;
  h_pageIndex : number = 0;
  // 화면에 띄워놓을 이미지 리스트
  h_ImageList : any = [];
  // 이미지 리스트에서 이미지 위에 마우스 올렸을 때 보여줄 이미지 정보 (오른쪽 칸에서 보임)
  h_ImageInfo : any = {};
  // 이미지 라벨값 저장 리스트
  h_LabelList:any = [];
  // 이미지 라벨 이미지 보여줄지 안보여줄지 결정하는 변수
  oShowCanvas = false;
  // 라벨 데이터 저장 변수
  oLabelData : any = {};
  // 라벨 태그 (라벨 값) 저장 변수
  oLabelTag : string[] = []
  // 현재 선택된 라벨 태그 (라벨 값) 저장 변수
  oCurrLabelTag :string = '';
  // 리스트에서 이미지 클릭 시 나오는 이미지
  oImage : any;
  oImageData : any = {};
  pos : any ;

  xDown : number = 0;
  yDown : number = 0;

  xMove : number = 0;
  yMove : number = 0;

  xUp : number = 0;
  yUp : number = 0;

  downChk :boolean = false;
  oLabelDraw : any = {name:'', id :''};
  // 폴리곤 다 그렸는지 확인 변수
  polyChk : boolean = false;
  polyCount : number = 0;
  keyChk : boolean = true;
  oDrawType : string = 'none'
  
  oImgWidth = 0;
  oImgHeight = 0;
  h_buttonIndex: number | null = null;
  oImageLoading = true;
  constructor(private cMainAppSvc: MainAppService,
    private cMetaSvc: WpMetaService,
    @Inject(MAT_DIALOG_DATA) public oData: any,
    public dialogRef: MatDialogRef<WpImageListPopUpComponent>,
    private cTransSvc: TranslateService,
    pDiaglog: MatDialog,
    private cWpLibSvc: WpLoadingService,
  ) { 
    this.oDialog = pDiaglog
  }

ngOnInit(): void {
    this.h_display = 'list';
    this.h_ImageCount= this.oData.imageCount;
    this.h_Pagenate = Array.from({ length: this.oData.imageCount }, (_, i) => i + 1);
    this.onPageSetIndex(1)
    // 라벨 처리를 했을 경우 불러옴 
    if(this.oData.label){
      this.oData.label.forEach((sLabelData: any) => {
        this.oLabelData[sLabelData['fileName']] = {images: sLabelData['images'], label :sLabelData['value']};
      });
    }
    // 라벨 태그 설정한 것이 있을 경우 불러옴
    if (this.oData.tagList){
      this.oLabelTag = this.oData.tagList;
    }
  }
  
  ngAfterViewInit():void{
    const canvasElement = this.oCanvasRef.nativeElement!;
    requestAnimationFrame(() => {    
      // 이미지를 fabric Canvas에 올림
      this.oImage = new fabric.Canvas(canvasElement, { 
        stopContextMenu: true,
        fireRightClick: true,
        selection : false,
        uniformScaling : false
        });
      let sCtx = this.oImage.getContext('2d');
      sCtx.lineWidth = 20

      // 이미지에 마우스 올릴 때
      this.oImage.on('mouse:over', (pMouseOver : any) =>{
        if(pMouseOver.target){
          this.oImage.setActiveObject(pMouseOver.target);
        }
      })
      // 이미지에 마우스 나갈때
      this.oImage.on('mouse:out', (pMouseOut : any) =>{
        if(pMouseOut.target){
          this.oImage.discardActiveObject(pMouseOut.target);
        }
      })
      // 이미지에 마우스 클릭하려고 눌렀을때, 라벨 도형 그리기 시작함
      this.oImage.on('mouse:down', (pMouseDown : any) =>{
        this.downChk = true
        if(pMouseDown.button == 3){
          this.keyChk = false;

          if(this.oDrawType == 'polygon'){ //취소하고 다시 그리면 첫번째 그리는데 문제 있음
            this.pos = []
            this.polyChk = false
          }
          this.oImage.remove(this.oLabelDraw);
          this.oLabelDraw = null
        } 
        
        else{
          if(!pMouseDown.target){ // 오브젝트 아닐때 = 빈 공간에다 마우스 클릭했을 때
            let pointer = this.oImage.getPointer(pMouseDown.e);
            let mousePosCheck = this.mousePosCheck(pointer.x, pointer.y)
            this.xDown = mousePosCheck[0]
            this.yDown = mousePosCheck[1]
            if(this.oDrawType != 'none'){
              this.drawLabelShape(this.xDown, this.yDown, this.oDrawType) //여기서 부터 처음 그림
              this.oImage.add(this.oLabelDraw);
              if(this.oDrawType == 'polygon' && this.xDown != this.xUp && this.yDown != this.yUp){
                this.polyCount++;
              }
            } 
          }

          else if(pMouseDown.target){ // 오브젝트일 때 = 라벨 한 곳에 마우스 클릭했을 때
            this.downChk = false;
          }
        }
      })
      //마우스가 떼어질 때
      this.oImage.on('mouse:up', (pMouseUp : any) =>{
        if(pMouseUp.button != 3){
          let pointer = this.oImage.getPointer(pMouseUp.e);
          let mousePosCheck = this.mousePosCheck(pointer.x, pointer.y)
          this.xUp = mousePosCheck[0]
          this.yUp = mousePosCheck[1]
          if(this.oDrawType == 'rectangle' && this.downChk){
              this.setLabel('rectangle');
              this.oImage.setActiveObject(this.oLabelDraw)
          }
          else if(this.oDrawType == 'keypoint'){
            this.setLabel('keypoint');
            if(!this.keyChk && this.oLabelDraw == null){
              this.oLabelDraw.set('stroke', pMouseUp.target.stroke);
              this.oImage.add(this.oLabelDraw);
              this.keyChk = true
            }
          }
          this.downChk = false;
        }
      })
      //마우스가 움직일 때 (라벨 그리는 중일때)
      this.oImage.on('mouse:move', (pMouseMove : any) =>{
        let pointer = this.oImage.getPointer(pMouseMove.e); 
        let mousePosCheck = this.mousePosCheck(pointer.x, pointer.y)
        this.xMove = mousePosCheck[0]
        this.yMove = mousePosCheck[1]
        //폴리곤 아닐 때 
        if(this.oDrawType != 'polygon'){
          if(this.oDrawType == 'keypoint' && this.oLabelDraw){
            if(this.downChk){
              this.oLabelDraw.set({x2 : pointer.x, y2 : pointer.y})
            }
          }
          // if(this.oDrawType == 'line'){
          //   this.oLabelDraw.set({x2 : pointer.x, y2 : pointer.y})
          // }
          else if(this.oDrawType == 'rectangle')
          {
            if(this.downChk) {
              if(this.xDown> this.xMove){
                this.oLabelDraw.set({left : this.xMove})
              }
              if(this.yDown> this.yMove){
                this.oLabelDraw.set({top : this.yMove})
              }
              let sWidth = Math.abs(this.xDown - this.xMove)
              let sHeight = Math.abs(this.yDown - this.yMove)
              this.oLabelDraw.set({width : sWidth, height : sHeight})
            }
          }
        }
        //폴리곤일 때
        else if(this.oDrawType == 'polygon' && this.polyChk == true){
          this.pos= this.oLabelDraw.get('points')
          this.pos.pop()
          this.drawPoly({x : this.xMove, y: this.yMove})
          this.oImage.add(this.oLabelDraw)
        }
        this.oImage.renderAll();
        // this.downChk = false
      })
      // 이미지에 있는 라벨 도형이 수정될 때, 마우스 드래그 놓는 순간 실행됨, 라벨 도형 수정된 값을 oLabelData에 수정해서 저장
      this.oImage.on('object:modified', (pModify : any) =>{
        this.oLabelDraw = pModify.target;
        let sSegment = this.getLabelSegment(this.oLabelDraw.id)
        if (pModify.target.id=='rectangle'){
          sSegment = {left : this.oLabelDraw.left, top : this.oLabelDraw.top, width : this.oLabelDraw.width * this.oLabelDraw.scaleX, height : this.oLabelDraw.height * this.oLabelDraw.scaleY}
        }
        this.oLabelData[this.oImageData['fileName']]['label'][pModify.target.name]['segmentations'] = sSegment;
      });
    });
  }

  // 라벨 그리기 기능
  drawLabelShape(pPosX : number, pPosY: number, pDrawType: string) {
    console.log("라벨 그리기")
    switch(pDrawType){
      case 'keypoint':
        this.drawKeyPoints(pPosX,pPosY)
        break;
      // case 'line':
      //   this.drawLine([pPosX, pPosY, pPosX, pPosY])
      //   break;  
      case 'rectangle':
        this.drawRect(pPosX, pPosY);
        break;
      case 'polygon':
        this.drawPoly({x:pPosX, y:pPosY});
        if(!this.polyChk){
          this.setLabel('polygon')
        }
        break;
      default:
        break;
    }
  }
  //키포인트 그리기 기능
  drawKeyPoints(x : number, y: number){
    let setColor = this.colorRand();
    this.oLabelDraw = new fabric.Circle({
      top : y,
      left : x,
      radius : 5,
      strokeWidth : 3,
      stroke : setColor + ', 1)',
      originX : 'center',
      originY : 'center',
      fill : setColor + ', 0.5)',
      // selectable : false
      cornerStyle : 'circle',
      cornerColor : 'rgba(0, 196, 240, 1)',
      cornerSize : 6,
      padding : 10,
      lockScalingX : true,
      lockScalingY : true,
      hasBorders : false,
    });
    this.oLabelDraw.setControlsVisibility({'tl': false, 'tr':false, 'br':false, 'bl':false, 'mtr':false})
    this.oLabelDraw.set('zindex', 2)
    this.oImage.add(this.oLabelDraw);
  }
  
  // 선그리기 기능
  drawLine(val : number[]){
    let setColor = this.colorRand();
    this.oLabelDraw = new fabric.Line(val,{
      originX : 'center',
      originY : 'center',
      strokeWidth : 3,
      stroke : setColor,
      hasBorders : false,
      hasControls : false,
      selectable : false,
      evented : false
    })
    let localUuid = v4()
    this.oLabelDraw.set('name', localUuid)
    this.oLabelDraw.set('id', 'line')
    return localUuid
  }

  //사각형 그리기 기능
  drawRect(x : number, y : number){
    let setColor = this.colorRand();
    this.oLabelDraw = new fabric.Rect({
      width : 3,
      height : 3,
      left : x,
      top : y,
      originX : 'left',
      originY : 'top',
      strokeWidth : 3,
      noScaleCache: false,
      stroke : setColor+', 1)',
      strokeUniform: true,
      fill : setColor+', 0.1)',
      cornerColor : setColor+', 0.6)',
      cornerStrokeColor: setColor+', 1 )',
      cornerStyle: 'circle',
      selectable : true,
      hasBorders : false, 
      lockRotation : true,
    });
    this.oLabelDraw.setControlsVisibility({'ml': false, 'mr':false, 'mt':false, 'mb':false, 'mtr':false})
    this.oLabelDraw.set('zindex',1)
  }

  // 다각형 그리기 기능
  drawPoly(points : {x: number, y: number}){
    if(this.polyChk != true){ //폴리곤 처음 점찍었을 때
      this.polyChk = true;
      this.pos = [];
      this.pos.push(points, points) //이후에 pop 이 실행되서 무조건 2개를 넣어야 처음 위치를 저장 할 수 있음
      this.colorRand()
    }

    
    else{ //폴리곤 처음 이후 진행
      let polyEndSize = 15
      if(this.xDown <= this.pos[0].x + polyEndSize && this.xDown >= this.pos[0].x - polyEndSize &&
          this.yDown <=  this.pos[0].y + polyEndSize && this.yDown >= this.pos[0].y - polyEndSize && this.polyCount > 2){
        this.pos.pop();
        this.polyChk = false;
        this.polyCount = 0;
      }
      else{
        this.pos.push(points)   
      }
      this.oImage.remove(this.oLabelDraw)
    }
    let setColor = this.colorRand
    
    this.oLabelDraw = new fabric.Polygon(this.pos,   
      {
        objectCaching: true,
        stroke : setColor+',1)',
        fill : setColor+',0.1)',
        strokeWidth : 3,
        selectable :false
        
      })
  }

  //마우스 위치 확인
  mousePosCheck(posX :number , posY : number)
  {
    if (posX < 0){
      posX = 0;
    }
    if (posY < 0){
      posY = 0;
    }
    if (posX > this.oImage.width){
      posX = this.oImage.width -2
    }
    if (posY > this.oImage.height){
      posY = this.oImage.height; -2
    }
    return [posX, posY];
  
  }

  //이미지 리스트에서 이미지 업로드 될 때 가로, 세로 길이 지정하는 기능 (리스트에서 사진 마우스에 올릴 때 오른쪽 이미지 정보에서 보여줌)
  onImageLoad(pEvent : Event, pIndex : number){
    const sImgSize = pEvent.target as HTMLImageElement;
    this.h_ImageList[pIndex]['images'] = {width : sImgSize.naturalWidth, height : sImgSize.naturalHeight};
  }

  //이미지 리스트 클릭했을때 기능
  onImageClick(pImageData : any, pImageIndex:number){
    //전체 이미지 중 현재 이미지 인덱스 값 확인
    let sCurrImageIdx = (this.h_pageSize * (this.h_pageIndex-1)) + pImageIndex
    //전체 이미지 중 첫번째일 경우 왼쪽 버튼 안나오게 처리
    if (sCurrImageIdx == 0){
      this.h_prevButton = false
      this.h_nextButton = true
    }
    //전체 이미지 중 마지막일 경우 오른쪽 버튼 안나오게 처리
    else if(sCurrImageIdx == this.h_ImageCount-1){
      this.h_prevButton = true
      this.h_nextButton = false
    }
    // 둘 다 아니면 버튼 나오게 처리
    else{
      this.h_prevButton = true
      this.h_nextButton = true
    }

    this.oImageData = { fileName: pImageData['filename'], images:pImageData['images'], imageIdx:pImageIndex }
    this.oLabelTag = this.oLabelTag.filter(pTag => pTag !== '');
    this.h_display = this.oData.type
    this.viewImage(pImageData['base64'], this.oLabelData[this.oImageData['fileName']]);
  }
  //리스트에서 클릭한 이미지 조정/라벨 기능창으로 전환하는 기능
  viewImage(pImageVal : string, pLabelVal: any){  
    this.oShowCanvas = true;
    let imgBase64 = pImageVal
    fabric.Image.fromURL(imgBase64, (img:any) =>{
      this.oImage.setHeight(img.height)
      this.oImage.setWidth(img.width)
      img.set({
        opacity: 1,     
        left : 0,
        top : 0
      })
      this.oImage.setBackgroundImage(img, this.oImage.requestRenderAll.bind(this.oImage));
      this.oImgWidth = img.width / 2;
      this.oImgHeight = img.height / 2;
    }) 
    // 다른거 그렸을때 라벨 이미지 지우는 기능
    this.oImage.remove(...this.oImage.getObjects())

    // 라벨 지정한 것이 있을 경우,
    if(pLabelVal){
      for (let [sKey, sValue] of Object.entries(pLabelVal['label']) as [string, { segmentations: any, type: string, value :string}][]) {
        this.drawLabelShape(sValue['segmentations']['left'], sValue['segmentations']['top'], sValue['type']);
        // 사각형 라벨링일 경우
        if(sValue['type']=='rectangle'){
          this.oLabelDraw.set({width : sValue['segmentations']['width'], height : sValue['segmentations']['height']})
        }
        this.oLabelDraw.set('name', sKey)
        this.oLabelDraw.set('id', sValue['type'])
        this.oImage.add(this.oLabelDraw);
      };
    }
    if(this.oLabelTag.length == 0){ 
      return this.cMainAppSvc.showMsg('라벨 태그가 설정되어 있지 않습니다.\n 이미지 목록에서 라벨 태그를 설정해주세요.', false);
    }
  }

  // 라벨링 명칭에서 라벨 값 입력값 받아주는 기능
  setLabelValue(pEvent:any, pLabelId:any, pLabelValue:any ){
    this.oLabelData[this.oImageData['fileName']]['label'][pLabelId]['value'] = pLabelValue;
  }

  // 라벨링 했을때 라벨링 명칭 텍스트 만들어주는 기능
  setLabel(pLabelType : string){
    let idValue = v4()
    let sLabelSegment = this.getLabelSegment(pLabelType)
    // 해당 이미지에 라벨 데이터 없을 경우 해당 이미지에 대한 너비, 높이랑 라벨 값 저장하는 키값 추가
    if (this.oLabelData[this.oImageData['fileName']] === undefined) {
      this.oLabelData[this.oImageData['fileName']] = { images : {width : this.h_ImageInfo.width, height: this.h_ImageInfo.height}, label : {} };
    }
    // 라벨 데이터 추가
    this.oLabelData[this.oImageData['fileName']]['label'][idValue] = { type : pLabelType, value: '', segmentations: sLabelSegment }
    // 선택된 라벨 태그 있을 경우 해당 값으로 value 저장해줌, 없으면 빈값으로
    if (this.oCurrLabelTag != '') {
      this.oLabelData[this.oImageData['fileName']]['label'][idValue]['value'] = this.oCurrLabelTag;
    }
    // 라벨 도형에도 고유값이랑, 타입 추가. 나중에 삭제하거나 수정할 때 사용
    this.oLabelDraw.set('id', this.oDrawType)
    this.oLabelDraw.set('name', idValue)
  }

  // 라벨링 명칭에서 라벨 값 입력할때 어느 라벨과 연결되어 있는건지 포커스 잡아주는 기능
  labelFocus(pEvent : any, pLabelId : any){
    let s_imageObj = this.oImage.getObjects()
    // 전체 라벨 도형에서 명칭과 같은 id인 도형 찾아서 포커스 잡아줌
    for(let s_obj of s_imageObj)
    {
      if(s_obj.name == pLabelId)
      {
        this.oImage.setActiveObject(s_obj)
        this.oImage.requestRenderAll()
        break;
      } 
    }
  }
  
  //라벨링 명칭에서 라벨 삭제하는 기능 - 라벨링 도형도 삭제됨, 
  labelRemove(pEvent : any){
    let id = pEvent.target.id
    //라벨 값 삭제
    delete this.oLabelData[this.oImageData['fileName']]['label'][id] //라벨 데이터 저장된 라벨값 삭제
    if (Object.keys(this.oLabelData[this.oImageData['fileName']]['label']).length == 0){
      this.removeAllLabel()
    }
    //라벨 도형 삭제
    this.oImage.getObjects().forEach( (obj :any)=> {
      if(obj.name == id){ 
        this.oImage.remove(obj);
      }
    });
  }

  //라벨 색상 정해주는 기능
  colorRand(){
    let sMax = Math.ceil(255);
    let sMin = Math.floor(100);
    let sRed = Math.floor(Math.random() * (sMax - sMin)) + sMin;
    let sGreen = Math.floor(Math.random() * (sMax - sMin)) + sMin;
    let sBlue = Math.floor(Math.random() * (sMax - sMin)) + sMin;
    return 'rgba('+sRed+','+sGreen+','+sBlue;
  }
  // 라벨 영역 설정 기능
  getLabelSegment(pLabelType:string) {
    let sSegments : any;
    if (pLabelType == 'keypoint'){
      sSegments = {left : this.oLabelDraw.left, top : this.oLabelDraw.top}
    }
    else if (pLabelType == 'rectangle'){
      // 왼쪽, 위, 오른쪽 
      sSegments = {left : this.oLabelDraw.left, top: this.oLabelDraw.top, width: this.oLabelDraw.width, height : this.oLabelDraw.height}
    }
    else if (pLabelType == 'polygon'){
      for(let sPos of this.oLabelDraw.points){
        sSegments.push({left:sPos.x, top :sPos.y});
      }
    }
    return sSegments;
  }
  
  // 라벨 팝업창이 어떤식으로든 닫히면 해당 기능 실행, 밑에 onClose 실행해도 작동
  ngOnDestroy(){
    try{
      // 라벨링 작업 데이터 wp-img-label.component.ts로 보내줌, 거기서 ui.json 형태로 변환
        this.dialogRef.close({ label: this.oLabelData, tagList : this.oLabelTag});
      }
      catch(err){}
  }

  // 라벨 팝업창 닫는 기능, 오른쪽 위에 X 버튼이나 오른쪽 아래 닫기 버튼 눌렀을때 작동
  onClose() {
    this.dialogRef.close();
  }

  // 이미지 조정 - 회전 기능
  onRotate() {
    if (this.h_Rotate >= 0 && this.h_Rotate <= 360){
      const sAngleInRadians = this.h_Rotate * Math.PI / 180;
      const sCos = Math.cos(sAngleInRadians);
      const sSin = Math.sin(sAngleInRadians);

      this.oImage.viewportTransform = [
        sCos,  sSin,
        -sSin,  sCos,
        this.oImgWidth - this.oImgWidth * sCos + this.oImgHeight * sSin,
        this.oImgHeight - this.oImgWidth * sSin - this.oImgHeight * sCos
      ];
      this.oImage.requestRenderAll();
    }
  }
  // 이미지 조정 - 확대 축소 기능
  onResize() {
    if (this.h_ResizeX == null){
      this.h_ResizeX = 1;
    }

    if (this.h_ResizeY == null){
      this.h_ResizeY = 1;
    }
    this.oImage.viewportTransform = [
      this.h_ResizeX, 0,     // x 스케일
      0, this.h_ResizeY,     // y 스케일
      this.oImgWidth - this.oImgWidth * this.h_ResizeX,
      this.oImgHeight - this.oImgHeight * this.h_ResizeY,
    ];
    this.oImage.requestRenderAll();
  }
  // 이미지 조정 - 기울기 기능
  onReskew() {
    const sSkewX = Math.tan((this.h_SkewX * Math.PI) / 180);
    const sSkewY = Math.tan((this.h_SkewY * Math.PI) / 180);
    this.oImage.viewportTransform = [
      1, sSkewX,
      sSkewY, 1,
      this.oImgWidth - this.oImgWidth * 1 - this.oImgHeight * sSkewX,
      this.oImgHeight - this.oImgWidth * sSkewY - this.oImgHeight * 1,
    ];
    this.oImage.requestRenderAll();
  }

  // 이미지 리스트에 이미지 위에 커서 올릴 때 오른쪽 칸에 이미지 정보 보여주는 기능
  onHoverStart(pEvent: any, pFileData:string){
    this.h_imgDataDisplay = true;
    // 파일 크기 계산, GPT가 알려준대로 하긴 했는데 나중에 파일 가져올때 크기도 가져오게 바꾸든가 해야할듯
    let fileSize = Math.floor(((pEvent.target.src.length * 3) / 4 -2) / 1024);
    this.h_ImageInfo = {fileName : pFileData, 
                        fileResolution : `${pEvent.target.naturalWidth} x  ${pEvent.target.naturalHeight}`, 
                        fileSize:`${fileSize}KB`, 
                        width : pEvent.target.naturalWidth,
                        height : pEvent.target.naturalHeight};
  }

  // 이미지 리스트에 이미지 위에 커서 나갈 때 이미지 정보 안보이게 처리하는 기능
  onHoverEnd(){
    this.h_imgDataDisplay = false;
  }

  // 라벨 타입 선택하는 기능
  setLabelShape(arg : string) {
    this.oDrawType = arg;
    // 라벨 초기화 하는 기능
    if(arg == 'none'){
      //해당 이미지의 라벨데이터 저장한거 모두 삭제
      if (this.oLabelData[this.oImageData['fileName']]){
        this.removeAllLabel()
      }
    }
  }
  //이미지 리스트 화면으로 돌아가는 기능
  onBackList(){
    // 화면 리스트로 변경하고 라벨 이미지 안보이게 처리
    this.h_display='list'
    this.oShowCanvas = false;
  }

  //라벨 값 저장 기능 (안 쓰는 기능, 혹시몰라 넵둠)
  onReturnLabelDataSet(){
    //라벨 값을 전체 이미지 중 현재 이미지 명 찾아서 넣어서 저장
    let sCurrentImage = this.oData.data.find((pFile:any) => pFile.fileName === this.oLabelData.fileName)
    if (sCurrentImage) { 
      sCurrentImage.label = this.oLabelData.label;
    }
  }
  onObjectEntries(pLabelList : any){
    return Object.entries(pLabelList.label);
  }

  //이미지 라벨값 설정에서 + 버튼 눌렀을 때 
  onAddLabelValue(){
    this.oLabelTag.push('');
  }

  //이미지 라벨값 설정에서 라벨값 삭제 기능
  onLabelTagRemove(pEvent:any){
    this.oLabelTag.splice(pEvent.target.id, 1);
  }

  //이미지 라벨값 설정에서 ''으로 된 빈값은 걸러내고 라벨 태그 버튼 생성하는 기능
  get onLabelTagFilter(){
    this.oLabelTag = this.oLabelTag.filter(pTag => pTag !== '');
    return this.oLabelTag
  }
  
  //이미지 라벨값 설정에서 라벨값 받는 기능
  onSetLabelTagValue(pEvent:any){
    if (this.oLabelTag.includes(pEvent.target.value)){ 
      pEvent.target.value = ''
    }
    else {
      this.oLabelTag[pEvent.target.id] = pEvent.target.value;
    }
  }

  // 라벨 목록 선택했을때 값과 button class 변경 기능
  onSetLabelTag(pEvent:any, pIdx:number){
    // 현재 선택된 라벨 태그와 같은 경우에는 선택 해제
    if(pEvent.target.value == this.oCurrLabelTag){
      this.h_buttonIndex = null;
      this.oCurrLabelTag = '';
    }
    // 현재 선택된 라벨 태그와 다를 경우 선택된 라벨 태그로 선택
    else {
      this.h_buttonIndex = pIdx;
      this.oCurrLabelTag = pEvent.target.value;
    }
  }
  // 이미지 불러와 페이징처리 하는 기능 
  async onPageSetIndex(pPageIndex:any){
    this.cWpLibSvc.showProgress(true, 'wppopupspin');
    this.oImageLoading = true;

    // job 파라미터 설정
    let sParam = {
        action:'page',
        method: '',
        groupId: 'image-label',
        jobId: this.oData.currentJobId,
        location: 'workflow',
        data: {
            page : pPageIndex,
            usetable : this.oData.usetable,
            dataType: 'image'
        }
    };

    // 이미지 base64로 불러온 후 페이지 값 저장
    let sImageList  = await this.cMetaSvc.getImageBase64List(sParam).toPromise();
    this.h_ImageList = JSON.parse(sImageList).data.map((pRow:string) => {
      return JSON.parse(pRow)
    });
    this.h_pageIndex = pPageIndex
    this.cWpLibSvc.showProgress(false, 'wppopupspin');
    this.oImageLoading = false;
  }

  async onViewImageChange(pType : String){
    // 이미지 불러오지 않을때만 진행
    if (!this.oImageLoading){
      let sImageIdx = this.oImageData['imageIdx']
      // 다음 이미지로 넘어갈때
      if (pType == 'next'){
        if (sImageIdx +1 > this.h_pageSize -1 && this.h_ImageCount > (this.h_pageSize * (this.h_pageIndex-1)) + sImageIdx ){
          this.h_pageIndex += 1
          await this.onPageSetIndex(this.h_pageIndex)
          sImageIdx = 0
        }
        else{
          sImageIdx += 1
        }
      }
      // 이전 이미지로 넘어갈때
      else {
        // 현재 이미지의 번호가 0 보다 작고, 0이 아닐때
        if (sImageIdx -1 < 0 && 0 < (this.h_pageSize * this.h_pageIndex) + sImageIdx ){
          // 이전 페이지의 이미지 불러옴
          this.h_pageIndex -= 1
          await this.onPageSetIndex(this.h_pageIndex)
          sImageIdx = this.h_pageSize - 1
        }
        else{
          sImageIdx -= 1
        }
      }
      let sImageData = this.h_ImageList[sImageIdx]
      this.onImageClick(sImageData, sImageIdx)
    }
  }
  
  // 오른쪽 왼쪽 이미지 가는 키
  onKeyDownEvent(pEvent:KeyboardEvent){
    if ((pEvent.key === 'd' || pEvent.key === 'D' || pEvent.key === 'ArrowRight') && this.h_nextButton) {
      this.onViewImageChange('next')
    }
    else if ((pEvent.key === 'a' || pEvent.key === 'A' || pEvent.key === 'ArrowLeft') && this.h_prevButton) {
      this.onViewImageChange('prev')
    }
  }
  
  // 해당 이미지에 있는 모든 라벨 삭제 기능
  removeAllLabel(){
    delete this.oLabelData[this.oImageData['fileName']]
    // 라벨 도형 모두 삭제
    this.oImage.getObjects().forEach((pDrawObj:any) => {
      this.oImage.remove(pDrawObj);
    });
    this.oImage.renderAll();
  }
  // 이미지에 있는 첫번째 라벨 값 가져오는 기능
  getLabelFirstLabelValue(pImageName:string){
    let value :any = Object.values(this.oLabelData[pImageName]['label'])[0]
    return value['value']
  }
}
