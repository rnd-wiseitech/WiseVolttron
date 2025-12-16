// label.component.ts
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { fabric } from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { DrawType, ViewType } from '../../types/image-types';



@Component({
  selector: 'img-tag',
  templateUrl: './img-tag.component.html',
  styleUrls: ['./img-tag.component.css']
})
export class ImgTagComponent implements OnChanges {
  /* ==== 부모로부터 받는 값 (o_) ==== */
  @Input() o_view: ViewType = 'profile';

  // (list 뷰/공통)
  @Input() o_tags: string[] = [];

  // (profile 뷰)
  @Input() o_canvas: fabric.Canvas | null = null;                      // 부모가 생성한 캔버스
  @Input() o_fileName: string | null = null;
  @Input() o_imageSize: { width: number; height: number } | null = null;
  @Input() o_initialLabelMap: Record<string, any> | null = null;       // { id:{ type,value,segmentations,order } }
  @Input() o_refreshTick = 0;                                          // 배경 로딩 완료 신호(부모가 증가시킴)

  // 드래그 모드 여부
  //@Input() o_dragChk: boolean = false;

  // 원본 이미지 크기
  @Input() o_baseImgW!: number;
  @Input() o_baseImgH!: number;

  /* ==== 부모에게 결과 전달 ==== */
  @Output() labelMapChange = new EventEmitter<{
    fileName: string;
    images: { width: number; height: number };
    label: any;
}>();
  @Output() tagsChange = new EventEmitter<{data : string[], colorMap : Record<string, string>, emitType : string}>();                 // list 뷰에서 태그 편집 결과
  // 클래스 안
  @Output() warn = new EventEmitter<string>();  // ★ 부모에게 경고 메시지 전달
  
  /* === ✅ 상태 유지용 입력 추가 === */
  @Input() o_currentTag: string = '';
  @Input() o_buttonIndex: number | null = null;

  /* === ✅ 상태 유지용 출력 추가 === */
  @Output() currentTagChange = new EventEmitter<string>();

  /* ==== 템플릿에서 쓰는 상태 (h_) ==== */
  h_drawType: DrawType = 'none';
  h_currentTag = '';
  h_buttonIndex: number | null = null;
  h_labelMap: Record<string, any> = {};             // 현재 파일의 라벨맵
  // 태그별 색상 맵
  h_colorMap: Record<string, string> = {};
  h_orderBy = (p_a: any, p_b: any) => p_a.value.order - p_b.value.order;

  // 컨텍스트 메뉴 상태
  h_ctx = {
    visible: false,
    x: 0,
    y: 0,
    obj: null as fabric.Object | null,
    selectedLabel: '' as string
  };

  /* =========================
   * 라이프사이클
   * ========================= */
  ngOnChanges(p_changes: SimpleChanges): void {
    if (p_changes['o_tags']) this.generatePalette(this.o_tags || []);
    // ✅ 부모가 들고있는 최근 상태를 반영
    //if (p_changes['o_currentDrawType']) this.h_drawType = this.o_currentDrawType;
    // if (p_changes['o_currentTag']) {
    //   this.h_currentTag = this.o_currentTag || '';
    //   // 라벨 목록이 바뀌었을 수 있으니 인덱스 재계산
    //   this.h_buttonIndex = this.o_currentTag ? this.o_tags.indexOf(this.o_currentTag) : null;
    // }
    
    if (p_changes['o_buttonIndex']) this.h_buttonIndex = this.o_buttonIndex;

    // profile 모드만 오버레이/이벤트
    if (this.o_view === 'profile') {
      if (p_changes['o_initialLabelMap']) {
        this.h_labelMap = { ...(this.o_initialLabelMap || {}) };
        // 선택한 태그가 있으면 해당 태그 선택한 상태로 지정
        if (Object.keys(this.h_labelMap).length !== undefined && this.h_labelMap.value !== undefined) {
          this.h_currentTag = this.h_labelMap.value;
          this.h_buttonIndex = this.o_tags.indexOf(this.h_labelMap.value)
        }
        if (this.o_canvas) this.restoreOverlays();
      }
      if (p_changes['o_canvas']) {
        this.restoreOverlays();
      }
      if (p_changes['o_refreshTick'] && !p_changes['o_refreshTick'].firstChange) {
        this.restoreOverlays();
      }
    }

    // ✅ 현재 선택 라벨이 목록에서 사라졌다면 안전하게 정리
    if (this.h_currentTag && !this.o_tags.includes(this.h_currentTag)) {
      this.h_currentTag = '';
      this.h_buttonIndex = null;
      this.currentTagChange.emit(this.h_currentTag);
    }
  }

  /* =========================
   * (LIST 뷰) 태그 편집 핸들러
   * ========================= */
  onAddTagValue() {
    const s_next = [...this.o_tags, ''];
    this.tagsChange.emit({data : s_next, emitType :'addTag', colorMap : {}});
  }
  onTagRemove(p_event: any) {
    const s_idx = Number(p_event.target.id);
    if (isNaN(s_idx)) return;
    const s_next = this.o_tags.filter((_, i) => i !== s_idx);

    // 색상 매핑 제거
    const s_removed = this.o_tags[s_idx];
    if (s_removed && this.h_colorMap[s_removed]) {
      delete this.h_colorMap[s_removed];
    }
    this.generatePalette(s_next || [])
    this.tagsChange.emit({data : s_next,  emitType :'removeTag', colorMap : this.h_colorMap});
  }
  // 라벨 값 수정
  onSetTagValueChange(p_event: any) {
    const s_idx = Number(p_event.target.id);
    const s_val = (p_event.target.value || '').trim();
    if (isNaN(s_idx)) return;
    if (!s_val) return;

    // 중복 방지
    if (this.o_tags.includes(s_val)) { 
      p_event.target.value = '';
      return;
    }

    const s_next = [...this.o_tags];
    s_next[s_idx] = s_val;
    this.tagsChange.emit({data : s_next, emitType :'setTagValue',  colorMap : {}});
  }

  /* =========================
   * 컨텍스트 메뉴 핸들러
   * ========================= */
  // private openContextMenu(p_obj: fabric.Object, p_clientX: number, p_clientY: number) {
  //   this.h_ctx.obj = p_obj;
  //   const s_id = (p_obj as any).name;
  //   const s_currValue = s_id ? this.h_labelMap?.[s_id]?.value : '';
  //   this.h_ctx.selectedLabel = s_currValue || (this.o_tags[0] || '');
  //   // 뷰포트 기준 좌표
  //   this.h_ctx.x = p_clientX;
  //   this.h_ctx.y = p_clientY;
  //   this.h_ctx.visible = true;
  // }

  onContextMenuLabelChange(p_event: any) {
    if (!this.h_ctx.obj) return;
    const s_newLabel = p_event?.target?.value ?? this.h_ctx.selectedLabel;

    const s_id = (this.h_ctx.obj as any).name;
    if (s_id && this.h_labelMap[s_id]) {
      this.h_labelMap[s_id].value = s_newLabel;
      // 색상 갱신
      const s_color = this.getColor(s_newLabel);
      (this.h_ctx.obj as any).set('stroke', s_color + ',1)');
      if ((this.h_ctx.obj as any).fill) (this.h_ctx.obj as any).set('fill', s_color + ',0.1)');
      if ((this.h_ctx.obj as any).cornerColor) (this.h_ctx.obj as any).set('cornerColor', s_color + ',0.6)');
      this.o_canvas?.requestRenderAll();
      this.emit();
    }
    this.closeContextMenu();
  }

  onContextMenuDelete() {
    if (!this.h_ctx.obj) { this.closeContextMenu(); return; }

    const s_id = (this.h_ctx.obj as any).name;
    // 1) 캔버스에서 제거
    this.o_canvas?.remove(this.h_ctx.obj);
    this.o_canvas?.requestRenderAll();

    // 2) 라벨 데이터에서 제거
    if (s_id && this.h_labelMap[s_id]) delete this.h_labelMap[s_id];

    // 3) 부모로 emit (빈 객체면 부모가 항목 제거)
    this.emit();

    // 4) 메뉴 닫기
    this.closeContextMenu();
  }

  onContextMenuClose() { this.closeContextMenu(); }
  private closeContextMenu() {
    this.h_ctx.visible = false;
    this.h_ctx.obj = null;
  }

  /* =========================
   * 오버레이 복원
   * ========================= */
  private restoreOverlays() {
    const c = this.o_canvas;
    if (!c) return;

    // 배경은 유지하고, 라벨 오버레이만 모두 제거 후 다시 그림
    c.getObjects().slice().forEach(p_o => { if ((p_o as any).id) c.remove(p_o); });

    Object.entries(this.h_labelMap || {}).forEach(([s_id, s_val]: any) => {
      const { type: s_type, value: s_value, segmentations: s_seg } = s_val;
      const s_color = this.getColor(s_value);
      let s_obj: fabric.Object | null = null;

      if (s_type === 'rectangle') {
        s_obj = new fabric.Rect({
          left: s_seg.left, top: s_seg.top,
          width: s_seg.width, height: s_seg.height,
          originX: 'left', originY: 'top',
          strokeWidth: 3, stroke: s_color + ',1)', strokeUniform: true,
          fill: s_color + ',0.1)', cornerColor: s_color + ',0.6)', cornerStyle: 'circle',
          selectable: true, hasBorders: true, hasControls: true, lockRotation: true, evented: true
        });
        (s_obj as any).setControlsVisibility({ ml: false, mr: false, mt: false, mb: false, mtr: false });
        (s_obj as any).set('id', 'rectangle');
      } else if (s_type === 'keypoint') {
        s_obj = new fabric.Circle({
          left: s_seg.left, top: s_seg.top,
          radius: 5, strokeWidth: 3, stroke: s_color + ',1)',
          originX: 'center', originY: 'center', fill: s_color + ',0.5)'
        });
        (s_obj as any).set('id', 'keypoint');
      } else if (s_type === 'polygon') {
        const s_points = s_seg?.points || [];
        s_obj = new fabric.Polygon(s_points, {
          objectCaching: true, stroke: s_color + ',1)', fill: s_color + ',0.1)', strokeWidth: 3,
          selectable: false, evented: true
        }) as any;
        (s_obj as any).set('id', 'polygon');
      }

      if (s_obj) { (s_obj as any).set('name', s_id); c.add(s_obj); }
    });

    c.requestRenderAll();
  }

  /* =========================
   * 커밋/세그먼트/전달
   * ========================= */
  private commit(p_tagValue : string) {
    // 선택되어 있는 태그 다시 선택할 경우 빈칸 처리 (태그 취소)
    if (this.h_labelMap.value === p_tagValue){
      p_tagValue = '';
    };
    
    this.h_labelMap['value'] = p_tagValue;
    this.h_labelMap['tagColor'] = this.h_colorMap[p_tagValue] + ',1)';
    this.emit();
  }

  private emit() {
    if (!this.o_fileName || !this.o_imageSize) return;
    this.labelMapChange.emit({ fileName: this.o_fileName, images: this.o_imageSize, label: this.h_labelMap });
  }

  /* =========================
   * 유틸/핸들러
   * ========================= */
  private generatePalette(p_labels: string[]) {
    const s_n = p_labels?.length || 1;
    p_labels?.forEach((p_label, p_i) => {
      const s_hue = Math.round((360 / s_n) * p_i);
      const s_rgb = this.hslToRgb(s_hue, 90, 55);
      this.h_colorMap[p_label] = `rgba(${s_rgb.r},${s_rgb.g},${s_rgb.b}`; // α는 사용처에서 추가
    });
  }

  // 라벨에 매칭된 컬러값 가져오기
  private getColor(p_tag?: string) {
    // if (!p_tag) return this.randColor();
    if (!this.h_colorMap[p_tag]) this.h_colorMap[p_tag] = this.randColor();
    return this.h_colorMap[p_tag];
  }
  // 지정된 색이 없으면 랜덤색 지정
  private randColor() {
    const s_h = Math.floor(Math.random() * 360);
    const s_rgb = this.hslToRgb(s_h, 100, 50);
    return `rgba(${s_rgb.r},${s_rgb.g},${s_rgb.b}`;
  }
  private hslToRgb(p_h: number, p_s: number, p_l: number) {
    p_s /= 100;
    p_l /= 100;

    const s_k = (p_n: number) => (p_n + p_h / 30) % 12;
    const s_a = p_s * Math.min(p_l, 1 - p_l);
    const s_f = (p_n: number) => p_l - s_a * Math.max(-1, Math.min(s_k(p_n) - 3, Math.min(9 - s_k(p_n), 1)));

    return {
      r: Math.round(255 * s_f(0)),
      g: Math.round(255 * s_f(8)),
      b: Math.round(255 * s_f(4))
    };
  }

  onSelectTag(p_tag: string, p_idx: number) {
    if (this.h_currentTag === p_tag) {
      this.h_currentTag = '';
      this.h_buttonIndex = null; 
    } else { 
      this.h_currentTag = p_tag;
      this.h_buttonIndex = p_idx;
    }
    this.commit(p_tag);
  }

  // 메뉴에서 라벨 변경 시: 색상 변경
  onLabelValueChange(p_labelId: string, p_value: string) {
    // 라벨 값 변경
    if (!this.h_labelMap[p_labelId]) return;
    this.h_labelMap[p_labelId].value = p_value;

    // 도형 색상 갱신
    const s_color = this.getColor(p_value);
    this.o_canvas?.getObjects().forEach((p_obj: any) => {
      if (p_obj.name === p_labelId) {
        p_obj.set('stroke', s_color + ',1)');
        if (p_obj.fill) p_obj.set('fill', s_color + ',0.1)');
        if (p_obj.cornerColor) p_obj.set('cornerColor', s_color + ',0.6)');
      }
    });
    this.o_canvas?.requestRenderAll();
    this.emit(); // 부모에게 변경사항 알림
  }
  resetTag(pTagList : Event){

  }
}
