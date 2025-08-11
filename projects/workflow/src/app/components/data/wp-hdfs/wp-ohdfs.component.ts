import { WpHdfsService } from './wp-hdfs.service';
import { WpComponentViewerService } from '../../wp-component-viewer.service';
// import { IWpProperties, WpPropertiesWrap } from '../../../wp-menu/wp-component-properties/wp-component-properties-wrap';
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

export class WpOHdfsComponent implements IWpProperties {
    hide = false;
    oWpHdfsService: WpHdfsService;
    public oFormData:WpPropertiesWrap [] = [
    {
        vname:'FileNm',
        name:'fileNm',
        value:'',
        type:'text',
        fvalue:'',
        visible:true,
        edit:true,
        callbak:this.onChangeTxt.bind(this)
    }];
    public oSelectData:any = {};
    public oProcess:boolean = false;
    public oComViewerSvc:WpComponentViewerService;
    constructor(pComViewerSvc:WpComponentViewerService) { 
        this.oComViewerSvc = pComViewerSvc;
    }
    public onChangeTxt(pEvent:any){    
        console.log(pEvent);
    }
    public getFormData(){    
        return this.oFormData;
    }
    public setFileNm (pFileList:any){
        this.oFormData.map(e=>{
        if(e.vname == 'FileNm')
            e.fvalue = pFileList;
        });
    }
    public getSelectData(){
        return this.oSelectData;
    }
}
