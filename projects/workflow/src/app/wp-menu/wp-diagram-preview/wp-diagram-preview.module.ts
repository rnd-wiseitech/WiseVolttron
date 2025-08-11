import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WpDiagramPreviewComponent } from './wp-diagram-preview.component';
import { WpGridSharedModule } from 'projects/wp-lib/src/lib/wp-grid/wp-grid.module';

@NgModule({
  declarations: [
    WpDiagramPreviewComponent
  ],
  imports: [
    CommonModule,
    WpGridSharedModule.forRoot(),
  ],
  exports: [
    WpDiagramPreviewComponent
  ]
})
export class WpDiagramPreviewModule { }
