// import { IWpProperties, WpPropertiesWrap } from "../../../wp-menu/wp-component-properties/wp-component-properties-wrap";
// (TODO) import IWpProperties, WpPropertiesWrap 
interface  WpPropertiesWrap {
    vname:string;
    name:string;
    value:string
    type:string;
    fvalue:any;
    visible:boolean;
    edit:boolean;
    callbak(pEvent:Event):any;
}
interface IWpProperties{
    oFormData:Array<WpPropertiesWrap>;
    getFormData():Array<WpPropertiesWrap>;
}

export class WpFileComponent implements IWpProperties  {
    constructor() { }
    oFormData: WpPropertiesWrap[] = [{
        vname:'File path',
        name:'file_path',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:null
    },
    {
        vname:'File name',
        name:'file_name',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:null
    },  
    {
        vname:'Separator',
        name:'separator',
        value:'',
        type:'select',
        fvalue:[',','|','tab'],
        visible:true,
        edit:true,
        callbak:null
    },{
        vname:'Encoding',
        name:'encoding',
        value:'',
        type:'select',
        fvalue:['utf8','euckr','iso'],
        visible:true,
        edit:true,
        callbak:null
    },{
        vname:'First row col',
        name:'first_row_col',
        value:'',
        type:'checkbox',
        fvalue:true,
        visible:true,
        edit:true,
        callbak:null
    }];
    getFormData(): WpPropertiesWrap[] {
        return this.oFormData;
    }
}
