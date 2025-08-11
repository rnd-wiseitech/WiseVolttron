// interface 인터페이스는 선언만 존재(인터페이스에 선언된 프로퍼티 또는 메소드의 구현을 강제하여 일관성을 유지하도록 함.)
import { EventObject } from "devextreme/events";
import dxSelectBox from "devextreme/ui/select_box";
import { KeyUpEvent } from "devextreme/ui/text_box";
import { WiseComData, WiseComType } from "projects/wp-server/wp-type/WP_COM_ATT";
// workflow formdata typing
export interface WpPropertiesWrap {
    [index: string]: any;
    vname:string;
    name:string;
    value:any
    type:string;
    fvalue:any;
    visible:boolean;
    edit:boolean;
    callbak(pEvent: Event | WpToggleEvent | dxSelectChangeEvent | KeyUpEvent, pName?: string|WpPropertiesWrap, pIndex?:number): any;
}
export interface IWpProperties{
    oWpData: WiseComData;
    oFormData:Array<WpPropertiesWrap>;
    getFormData():Array<WpPropertiesWrap>;
}
export interface WpToggleEvent {
    event: MouseEvent | PointerEvent;
    name: string;
    value: string;
}
// workflow app service wpdataset type
export interface IWkDataset {
    [index: string]: string | { [index: string]: WpComData };
    WorkFlowId: string;
    Datas: {
        [index: string]: WpComData
    };
    CurrentDataId: string;
};
// app service workflow data
export interface WpComSchema {
    metadata: {};
    name: string;
    nullable: boolean;
    type: string;
}
export interface WpComData {
    id: string;
    name: string;
    type: number;
    text?: string;
    filter?:string[];
    data?: string[];
    parentId?: string[];
    schema?: WpComSchema[];
    jobId?: string;
    'wp-data'?: WiseComType;
    // 워크플로우 로드했을 경우
    wf_regUserno?: number;
}
// 각 워크플로우 컴포넌트에서 WkComData를 확장해서 oWpData의 타입을 정의하고 사용한다.
export type WkCommonData = {
    url: string; //호출 url
    from_point: number; //상위 연결 가능한 컴포넌트 수. -1 이면 상위 연결 제한 없음.
    getColumnInfo(pSchema: WpComSchema[], pSchema_r?: WpComSchema[], pJobId_r?: string): WpComSchema[];
    getUserDataParams(pUserno?: string, pGroupId?: string, pParentId?: string[]): any;
    getSparkApiParams(pUserno?: string, pGroupId?: string, pParentId?: string[]): any;
    hasEmptyValue(): boolean;
    hasUserParam(): { result: boolean, userParameter: string[] };
    getSparkUserParam(): { result: boolean, sparkUserParam: { [index: string]: any } };
}

// 워크플로우 저장 데이터
export type WkSaveData = {
    wkCompData: WpComData[],
    wkDiagram: string,
    wkId: string,
    wkName?: string,
    wkType?: string,
    workflowName?: string
    overwrite?: boolean,
    WF_ID?: number
}
// 스파크 job 실행 결과
export type WkSparkResultData = {
    action: string,
    data: string[],
    schema: WpComSchema[],
    viewname: string,
    count: number,
    responsecode: number,
    duration: number
}


// dxDiagram 구성요소
// diagram node data
export interface WpNodePro {
    [index: string]: any;
    id: string;
    text: string;
    type: any;
    filter?: 'true'| 'false';
    parentId?: string[];
    jobId?: string;
    'wp-data'?: WiseComType;
}
// diagram link data
export interface WpEdgePro {
    [index: string]: string | { [index: string]: any; };
    id: string;
    fromId: string;
    toId: string;
    text: string | { [index: string]: any; };
}
// devextreme diagram type (hDiagram.instance.export type)
export type dxDiagramConnector = {
    beginConnectionPointIndex: number;
    beginItemKey: string;
    dataKey: string;
    endConnectionPointIndex: number;
    endItemKey: string;
    key: string;
    locked: false
    points: { x: number, y: number }[];
    length: number;
    zIndex: number;
    dataItem?: WpEdgePro;
}
export type dxDiagramShape = {
    dataKey: string;
    height: number
    imageUrl?: string;
    key: string
    locked: boolean
    text: string
    type: string
    width: number
    x: number
    y: number
    zIndex: number;
    dataItem?: WpNodePro;
}
export type dxDiagramData = {
    connectors: dxDiagramConnector[];
    shapes: dxDiagramShape[];
    page: {
        height: number
        pageColor: number
        pageHeight: number
        pageLandscape: boolean
        pageWidth: number
        width: number
    };
}
export type dxDiagramChangeConnectorEvent = {
    internalChange: boolean,
    internalKey: string,
    key: string,
    type: 'insert' | 'update' | 'remove',
    data?: WpEdgePro
}
export type dxSelectChangeEvent = {
    component: dxSelectBox & { _valueChangeEventInstance: EventObject & (MouseEvent | Event | KeyboardEvent), _clearValue(): void };
    element: HTMLElement;
    selectedItem: string;
}