import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WpModalComponent } from './wp-lib-modal.component';

describe('WpModalComponent', () => {
  let component: WpModalComponent;
  let fixture: ComponentFixture<WpModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WpModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WpModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
