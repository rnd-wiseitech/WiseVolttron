import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WpDiagramToolbarComponent } from './wp-diagram-toolbar.component';
import { WpDiagramToolbarService } from './wp-diagram-toolbar.service';
import { WpTranslateSharedModule } from 'projects/wp-lib/src/lib/wp-lib-translate/wp-lib-translate.module';

@NgModule({
    declarations: [
        WpDiagramToolbarComponent
    ],
    imports: [
        CommonModule,
        WpTranslateSharedModule.forRoot()
    ],
    providers: [
        WpDiagramToolbarService
    ],
    exports: [
        WpDiagramToolbarComponent
    ]
})
export class WpDiagramToolbarModule { }
