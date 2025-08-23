import { Component, OnInit} from '@angular/core';
import { MainAppService } from 'projects/main/src/app/app.service';

@Component({
  selector: 'dm-hdfs-viewer',
  templateUrl: './hdfs-viewer.component.html',
  styleUrls: ['./hdfs-viewer.component.css']
})
export class HdfsViewerComponent implements OnInit {
  
  constructor(public cMainAppSvc: MainAppService) { }

  ngOnInit(): void {      
  }
}
