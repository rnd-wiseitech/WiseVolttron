import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { WpPropertiesService } from './wp-component.properties.servie';

@Component({
    selector: 'lib-wp-component-properties',
    templateUrl: './wp-component-properties.component.html',
    styleUrls: ['./wp-component-properties.component.css']
})

export class WpComponentPropertiesComponent implements OnInit, OnDestroy {
    oCurrentType = '';
    oSelectData: any;
    oSubs: Subscription[] = [];
    constructor(private cWpPropertiesSVC:WpPropertiesService) {
    }
    ngOnInit(): void {
        this.oSubs.push(
            this.cWpPropertiesSVC.changePropertiesEmitter.subscribe(pData => {
                if (pData) {
                    console.log('changePropertiesEmitter');
                    console.log(pData);
                    this.oSelectData = pData;
                    this.oCurrentType = pData.type;
                } else {
                    console.log('initPropertiesEmitter');
                    this.oSelectData = undefined;
                    this.oCurrentType = undefined;
                }
            })
        );
    }
    ngOnDestroy(): void {
        this.oSubs.forEach(sSub => {
            sSub.unsubscribe();
        });
    }
}
