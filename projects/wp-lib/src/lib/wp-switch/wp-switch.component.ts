import { Component, ElementRef, OnInit, ViewChild ,Renderer2 ,Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'lib-wp-switch',
  templateUrl: './wp-switch.component.html',
  styleUrls: ['./wp-switch.component.css']
})
export class WpSwitchComponent implements OnInit {
  @Input() hLalbelNm:any;
  @Output() onChangSwitchEvent = new EventEmitter<boolean>();
  @ViewChild('hSwitchEf')
  oSwitchEf!: ElementRef;

  constructor(private cRenderer: Renderer2) { }

  ngOnInit(): void {
  }
  onClick(pEvent:Event){
    
    let sThis:any = pEvent.currentTarget;

    if(Array.from(sThis.parentElement.classList).includes('on')){
      this.cRenderer.removeClass(sThis.parentElement, 'on');
      this.cRenderer.setAttribute(this.oSwitchEf.nativeElement,'checked', 'false');
      this.onChangSwitchEvent.emit(false);
    }
    else{
      this.cRenderer.addClass(sThis.parentElement, 'on');
      this.cRenderer.setAttribute(this.oSwitchEf.nativeElement,'checked', 'true');
      this.onChangSwitchEvent.emit(true);
    }
    
  }
}
