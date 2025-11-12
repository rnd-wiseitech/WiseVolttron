import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpSwitchComponent } from './wp-switch.component';

describe('WpSwitchComponent', () => {
  let component: WpSwitchComponent;
  let fixture: ComponentFixture<WpSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WpSwitchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WpSwitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
