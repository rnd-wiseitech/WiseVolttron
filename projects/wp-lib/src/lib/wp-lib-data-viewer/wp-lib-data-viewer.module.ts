import { NgModule } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { BrowserModule } from '@angular/platform-browser';
import { WpLibDataViewerComponent } from './wp-lib-data-viewer.component';
import { ScrollDispatcher, ScrollingModule } from '@angular/cdk/scrolling';
import { MatIconModule } from '@angular/material/icon';
import { MatTableExporterModule } from 'mat-table-exporter';
import { MatPaginatorModule } from '@angular/material/paginator';

@NgModule({
  declarations: [ WpLibDataViewerComponent],
  imports: [
      MatTableModule,
      BrowserModule,
      ScrollingModule,
      MatIconModule,
      MatTableExporterModule,
      MatPaginatorModule   
  ],
  exports: [ WpLibDataViewerComponent],
  providers:[ScrollDispatcher]
})
export class WpLibDataViewerModule { }
