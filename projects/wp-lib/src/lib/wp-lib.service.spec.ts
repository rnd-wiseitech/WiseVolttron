import { TestBed } from '@angular/core/testing';

import { WpLibService } from './wp-lib.service';

describe('WpLibService', () => {
  let service: WpLibService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WpLibService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
