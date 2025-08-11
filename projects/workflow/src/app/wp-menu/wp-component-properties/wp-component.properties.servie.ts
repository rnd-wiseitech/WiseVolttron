import { Injectable,Output,EventEmitter } from '@angular/core';
import { WpAppConfig } from 'projects/wp-lib/src/lib/wp-lib-config/wp-lib-config';
import { WpSeriveImple } from 'projects/wp-lib/src/lib/wp-meta/service-imple';
import { WpNodePro } from './wp-component-properties-wrap';

@Injectable({providedIn:'root'})
export class WpPropertiesService extends WpSeriveImple {
    @Output() changePropertiesEmitter: EventEmitter<WpNodePro> = new EventEmitter();
    
    constructor(
        private cAppConfig: WpAppConfig,
    ) {
        super(cAppConfig);
    }
    showProperties(pPropertiesData: WpNodePro) {
        this.changePropertiesEmitter.emit(pPropertiesData);
    }
    initProperties() {
        this.changePropertiesEmitter.emit();
    }
}