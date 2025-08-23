import { SelectionModel } from '@angular/cdk/collections';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild, ChangeDetectorRef} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
declare const $: any;
@Component({
  selector: 'lib-wp-grid',
  templateUrl: './wp-grid.component.html',
  styleUrls: ['./wp-grid.component.css']
})
export class WpGridComponent implements OnInit {
    @Input() iGridData:any; // grid 데이터
    @Input() iColInfo:any;  // grid column 정보
    @Input() iRowEvt:boolean;  // rowClick 이벤트 여부      
    @Input() iSelection:string='none';  // checkbox 여부(none, single, multiple) 
    @Input() iSelectedList:any=[];  // iSelection=='multiple'이고, grid 그릴떄 초기값(selected row) 있을 경우    
    @Input() iHoverEffect:boolean=false;  // 마우스 hovereffect 여부     
    @Input() iHead:any;  // grid 상단에 헤더 필요한 경우, (버튼, 검색필터 컬럼명)
    @Output() callBack: EventEmitter<any> = new EventEmitter();  // callback 함수
    @Output() callBackSearch: EventEmitter<any> = new EventEmitter();  // searchcallback 함수
    @Input() iPage:any;  // pagination 필요할 경우, boolean(true로 설정)
    @Input() iPageSize: number;  // pagination 에서 사용할 row size
    @Input() iComptNm:string='';  // FUNCTION(아이콘 기능)그릴 때 예외Row 또는 조건설정 필요한 경우, html에서 사용
    @Input() iScroll:any=true; // scroll css 적용여부
    @ViewChild(MatPaginator) oPaginator: MatPaginator;
    oData:any = [];
    oColInfo:any = [];
    // dataset.component.ts 참고
    // oData 컬럼 중 VISIBLE = true
    oDisplayedColumns: any = [];
    // 실제로 표시할 column name
    oDisplayedColumnNms: any = {};
    // function 부분 변경함. dataset.component 참고
    h_FuncList:any = [];
    h_SearchWord:any = ''; 

    // 일반적으로 보여지지 않는 컬럼.
    h_speicalCol = ['FUNCTION', 'AUTHORITY', 'JSON_DS_VIEW_NM', 'SCH_FUNC', 'INPUT_DATA', 'OUTPUT_DATA', 'TASK_STATUS', 'KILL', 'INPUT_TEXT', 'SERVER_FUNC', 'labels', this.cTransSvc.instant("WPP_WORKFLOW.COMPONENT.POPUP.popup75"), 'msg', 'ERROR_MSG'];
    // cell안에서 엔터키필요 컬럼.
    h_enterCol = ['INPUT_DATA', 'OUTPUT_DATA', 'labels', 'msg', 'ERROR_MSG'];
    // 한 화면 안에서 여러개의 그리드가 있는 경우 페이징 할때 각 그리드의 고유한 Id 가 필요해서 생성.
    h_PagingId = `wp-grid-paging-${Math.random().toString(16).slice(6, 8)}`

    oSelection = new SelectionModel<any>(true, []);
    oSelectList:any = [];

    // pagination 값
    // 현재 page
    o_currentPage = 1;
    // pageIdx
    o_pageIndex = 0;
    // 화면에 보이는 page 데이터
    h_pageData:any;
    // 페이지당 개수.
    // 각 ui별 조정이 필요할 경우 size도 그리드에 태우도록.
    o_size = 10;
    // 페이지 전체 데이터(화면에 뿌리기용)
    o_totalPageData:any = [];
    // 페이지 전체 데이터(페이지 기능 사용할때 검색용 내부 계산용)
    o_totalData:any = [];
    // 필터유무
    oFilterChk = false;
    oFilterFunction = false;
    oDateFilterChk = false;
    date: Date = new Date();
    // 아이콘 타이틀(마우스 오버시 글자)
    h_iconTitle:any = {
        trash: '삭제',
        modify: '수정',
        play: '시작',
        last: '정지',
        history: '로그',
        download: this.cTransSvc.instant("WPP_COMMON.INFO.info9"),
        share: 'api 공유',
        personadd: '권한 공유',
        hiveadd: '하이브 등록',
        hiveedit: '하이브 수정'
    }
    // 전체 선택 여부
    h_allSelected: boolean = false;

    
    constructor(public cDialog: MatDialog,
        private cTransSvc: TranslateService
        ) { }

    ngOnDestroy():void{
        
    }
    onSelectSingle(pSelectRow:any, pEv?:any){
        // pEv.preventDefault();
        if(this.oSelection.selected.length == 0){
            this.oSelection.toggle(pSelectRow);
        }else if(this.oSelection.selected[0] == pSelectRow){
            this.oSelection.toggle(pSelectRow);
        }else{
            this.oSelection.clear();
            this.oSelection.toggle(pSelectRow);
        }
        this.callBack.emit({element:pSelectRow,eventNm:'checkboxChanged', selection:this.oSelection});
    }
    onSelectMultiple(pSelectRow:any, pEv?:any){
        // pEv.preventDefault();
        this.oSelection.toggle(pSelectRow);
        if (this.oSelection.hasValue() && this.isAllSelected()) {
            this.h_allSelected = true;
        } else {
            this.h_allSelected = false;
        }
        this.callBack.emit({element:pSelectRow,eventNm:'checkboxChanged', selection:this.oSelection});
    }
    masterToggle() {  
        // 워크플로우에서 전체선택, 전체 해제 이벤트 필요해서 추가.
        if (this.oSelection.hasValue() && this.isAllSelected()) {
            this.oSelection.clear();
            this.h_allSelected = false;
            this.callBack.emit({ eventNm: 'clearAll', selection: this.oSelection });
        } else {
            this.oSelectList.forEach((row: any) => this.oSelection.select(row));
            this.h_allSelected = true;
            this.callBack.emit({ eventNm: 'selectAll', selection: this.oSelection });
        }
    //   this.isAllSelected() ?
    //       this.oSelection.clear() :
    //       this.oSelectList.forEach((row:any) => this.oSelection.select(row));
    }
    isAllSelected() {
      const numSelected = this.oSelection.selected.length;
      const numRows = this.oSelectList.length;
      return numSelected === numRows;
    }
    ngOnInit(): void {
        // // 디자인 스크롤바 적용
        //     $('.scrollbar').scrollbar();
        if (this.iSelection == 'multiple' && this.oSelection.hasValue() && this.isAllSelected()) {
            this.h_allSelected = true;
        }
    }
    ngAfterViewInit(){       
        // 디자인 스크롤바 적용 
        if(this.iScroll){
            $('.scrollbar').scrollbar();
        }
    }
    ngOnChanges(pChanges: SimpleChanges) {
        if(pChanges.iGridData){
            let sTmpData: Array<any> = pChanges.iGridData.currentValue;
            let sTmpColumns:any = [];
            let sTmpColumnNms:any = {};
            // this.oColInfo = pChanges.iColInfo.currentValue;
            this.oColInfo = this.iColInfo;
            if(typeof this.oColInfo != 'undefined'){
                for(let sCol of this.oColInfo){
                    if(sCol.VISIBLE){
                        sTmpColumns.push(sCol.NAME);
                        sTmpColumnNms[sCol.NAME] = sCol.VNAME;
                    }
                    if(sCol.NAME == 'FUNCTION'){
                        let sTmpFuncList = [];
                        for(let sFunc of sCol.VALUE){
                            sTmpFuncList.push(sFunc);
                        }
                        this.h_FuncList = sTmpFuncList;
                    }
                }
                this.oDisplayedColumns = sTmpColumns;
                this.oDisplayedColumnNms = sTmpColumnNms;
                if (this.iPageSize) {
                    this.o_size = this.iPageSize;
                }
                
                if(this.iPage != true) {
                    this.oData = new MatTableDataSource(sTmpData);
                } else {
                    this.o_totalPageData = sTmpData;
                    this.o_totalData = sTmpData;
                    // mat-paginator 방식
                    // this.oData = new MatTableDataSource(this.o_totalPageData);
                    // this.cChangeDetector.detectChanges();
                    // if (this.oPaginator){
                    //     this.oData.paginator = this.oPaginator
                    // }

                    // this.o_currentPage = 1;
                    this.paginate(this.o_currentPage);
                }                               

                if(this.iHead){
                    if(typeof this.iHead.filterCol != 'undefined'){
                        if(typeof this.iHead.filterCol == 'function'){                            
                            this.oFilterChk = true;
                            this.oFilterFunction = true;
                        }
                        else{
                            this.oFilterChk = true;

                            if(typeof this.iHead.datefilterCol != 'undefined')
                                this.oDateFilterChk = true;
                    
                            this.oData.filterPredicate = 
                                (data:any, filtersJson: string) => {
                                    const matchFilter:any = [];
                                    const filters = JSON.parse(filtersJson);
                                    
                                    filters.forEach((filter:any) => {
                                        let sTmpBool = false;
                                        if(this.oDateFilterChk){
                                            this.iHead.datefilterCol.forEach((filterColInfo:any) => {
                                                const val = data[filterColInfo.name] === null ? '' : data[filterColInfo.name];
                                                if(val.toString().includes(filter.value)){
                                                    sTmpBool = true;
                                                    return;
                                                }
                                            });
                                        }
                                        else{
                                            this.iHead.filterCol.forEach((filterColNm:any) => {
                                                const val = data[filterColNm] === null ? '' : data[filterColNm];
                                                if(val.toString().toLowerCase().includes(filter.value.toLowerCase())){
                                                    sTmpBool = true;
                                                    return;
                                                }
                                            });
                                        }
                                    
                                        matchFilter.push(sTmpBool);
                                    });
                                    return matchFilter.every(Boolean);
                                };
                        }
                    }
                }
                if(this.iSelection=='multiple'){
                    this.oSelection = new SelectionModel<any>(true, []);
                    this.oSelectList = this.oData.data;
                    if(this.iSelectedList.length !=0){
                        this.iSelectedList.forEach( (pSelectIdx:any) => {
                            this.oSelectList.filter((pRow: any) => {
                                 // 권한 유저
                                if (pRow['USER_NO']) {
                                    if (pRow['USER_NO'] === pSelectIdx) {
                                        this.oSelection.select(pRow);
                                    }                     
                                }
                                // 권한 그룹
                                else if (pRow['GROUP_ID']) {
                                    if (pRow['GROUP_ID'] === pSelectIdx) {
                                        this.oSelection.select(pRow);
                                    }                     
                                }
                                // 워크플로우 컬럼명 케이스
                                else if (pRow['COL_NAME']) {
                                    if (pRow['COL_NAME'] === pSelectIdx) {
                                        this.oSelection.select(pRow);
                                    }
                                }
                                // 강화학습
                                else if (pRow['NAME']) {
                                    if (pRow['NAME'] === pSelectIdx) {
                                        //   this.oPrevAuthList.push(pRow['USER_NO'])
                                        pRow['USE'] = true;
                                        this.oSelection.select(pRow);
                                    }
                                }
                          });              
                        });        
                        this.callBack.emit({eventNm:'checkboxChanged', selection:this.oSelection});                
                    }
                }
                // this.paginate(1);                
            }
        }      
    }
    onApplyFilter(pType?:any,pEv?: any) {
      let filterValue;
      if(pType == 'date'){
        filterValue = pEv.value;
      }
      else{
        if(pEv)
            filterValue = pEv.target.value;
        else{
            this.h_SearchWord = '';          
            filterValue = this.h_SearchWord;        
        }
      }
      
      const tableFilters = [];
      tableFilters.push({
        // id: 'name',
        value: filterValue
      });   
      if(this.oFilterFunction){
        this.callBackSearch.emit(filterValue);
      }
      else{
        // 페이지 사용할 때
        if (this.iPage){
            // 검색어 있을때
            if (filterValue != ''){
                this.oData.data = this.o_totalData;
                this.oData.filter = JSON.stringify(tableFilters);
                this.o_totalPageData = this.oData.filteredData;
            }
            // 검색어 없을때 전체 데이터 복원
            else {
                this.oData.filter = JSON.stringify([]);
                this.o_totalPageData = this.o_totalData;
                this.paginate(this.o_currentPage)
            }
        }
        // 페이지 기능 사용 안할때
        else {
            this.oData.filter = JSON.stringify(tableFilters);
            console.log(this.oData.filteredData)
        }
        // mat-paginator 로 페이지 기능 쓸 때
        // this.oData.filter = JSON.stringify(tableFilters);
        // if (this.oData.paginator) {
        //     this.oData.paginator.firstPage();
        // }
      }
      
    }
    onShowData(pEvent:any){
    }

    onFuncEmit(pEl:any, pEv:any, pEvent:any){
        pEvent.stopPropagation();
        this.callBack.emit({element:pEl,eventNm:pEv, event: pEvent});
    }
    onHeadBtnEmit(pBtnNm?:string){
        if (pBtnNm) {
            this.callBack.emit({ eventNm: pBtnNm });
        } else {
            this.callBack.emit({ eventNm: 'headBtnEvt' });
        }
    }
    onRowClickEmit(pEl:any, pEv:any){
        if(this.iSelection == 'single'){
            this.onSelectSingle(pEl);
        }else if(this.iSelection == 'multiple'){
            this.onSelectMultiple(pEl);
        }else{
            this.callBack.emit({element:pEl,eventNm:pEv});
        }
    }
    onKeyUpEmit(pEl: any, pIndex: any) {
        this.callBack.emit({ element: pEl, eventNm: 'keyUp', index: pIndex });
    }

    paginate(p_ev: any) {
        this.o_pageIndex = p_ev;
        let s_totalDataSlice = this.o_totalPageData.slice(p_ev * this.o_size - this.o_size, p_ev * this.o_size);
        
        if (this.oData.length == 0){ //맨 처음 시작할때
            this.oData = new MatTableDataSource(s_totalDataSlice);
        }
        else { // 처음 시작한 이후에 페이지 클릭하거나 할때
            this.oData.data = s_totalDataSlice;
        }
        
        // mat-paginator 방식
        // if (this.oPaginator){
        //     this.oData.paginator = this.oPaginator
        // }
    }
    pageChange(p_ev: any){
        this.o_currentPage = p_ev;
        this.paginate(this.o_currentPage);
    }


      // monitoring에 사용
      onChangeStyle(p_item: any) {
          let s_color = '#A0DFFF';
          if(p_item['JOB_STATUS']=='FAILED') {
              s_color = '#e6a8a8';
          }
        return { width: (100/p_item['TOTAL_TASK']*p_item['COM_TASK']) + '%', background: s_color}
      }

      // monitoring에 사용
      onKillEmit(pEl:any, pEvent:any,p_type:string){
        pEvent.stopPropagation();
        this.callBack.emit({element:pEl, event: pEvent,type:p_type});
    }

    // user-manager JIRA보드 웹 연결
    // monitoring에 사용
    onJiraEmit(pEl:any, pEvent:any){
        pEvent.stopPropagation();
        this.callBack.emit({element:pEl, eventNm: pEvent});
    }

    // 데이터 변환 컬럼명 변경에 추가
    onValueChange(pEl:any, pEvent:any){
        pEvent.stopPropagation();
        this.callBack.emit({element:pEl, eventNm: pEvent.type});
    }
}
