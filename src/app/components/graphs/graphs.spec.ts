import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Graphs } from './graphs';
import { I18nService } from '../../i18n/i18n.service';

describe('Graphs', () => {
  let component: Graphs;
  let fixture: ComponentFixture<Graphs>;
  let nodeUpdates: any[][];

  beforeEach(async () => {
    nodeUpdates = [];
    (window as any).vis = {
      DataSet: function () {
        return { getIds: () => [], update: (rows: any[]) => nodeUpdates.push(rows) };
      },
      Network: function () {
        return {
          on: () => {},
          destroy: () => {},
          setOptions: () => {},
          getPositions: () => ({}),
          moveNode: () => {},
        };
      },
    };
    await TestBed.configureTestingModule({
      imports: [Graphs],
    }).compileComponents();

    // Idioma fixo: os rótulos conferidos abaixo são os de português.
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(Graphs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('redesenha os rótulos ao trocar de idioma', () => {
    const before = nodeUpdates.length;
    TestBed.inject(I18nService).set('en');
    fixture.detectChanges();
    expect(nodeUpdates.length).toBeGreaterThan(before);
    const labels = nodeUpdates.slice(before).flat().map((row) => row.label);
    expect(labels).toContain('Mani\n(Billing)');
  });
});
