import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HeroCube } from './hero-cube';
import { I18nService } from '../../i18n/i18n.service';

describe('HeroCube', () => {
  let component: HeroCube;
  let fixture: ComponentFixture<HeroCube>;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroCube]
    })
    .compileComponents();

    // Idioma fixo: o teste de texto abaixo parte do português.
    i18n = TestBed.inject(I18nService);
    i18n.set('pt');
    fixture = TestBed.createComponent(HeroCube);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('traduz o título do herói ao trocar de idioma', () => {
    const title: HTMLElement = fixture.nativeElement.querySelector('.hero-title');
    expect(title.textContent).toContain('Construindo');

    i18n.set('fr');
    fixture.detectChanges();
    expect(title.textContent).toContain('Nous créons');
  });
});
