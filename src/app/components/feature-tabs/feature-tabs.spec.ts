import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { FeatureTabs } from './feature-tabs';
import { DESIGN_ITEMS, DEVELOPMENT_ITEMS, Feature, INFRASTRUCTURE_ITEMS, MenuItem, TAB_ITEMS } from './feature-tabs.data';
import { I18N } from './feature-tabs.i18n';
import { I18nService, LANGS } from '../../i18n/i18n.service';
import { BANNER_TEXT } from '../feature-banner/feature-banners.i18n';

const ALL_ITEMS: MenuItem[] = [...DEVELOPMENT_ITEMS, ...INFRASTRUCTURE_ITEMS, ...DESIGN_ITEMS];
const item = (id: string) => ALL_ITEMS.find((i) => i.id === id)!;
const feature = (itemId: string, key: string) => item(itemId).features.find((f) => f.key === key);

describe('FeatureTabs', () => {
  let component: FeatureTabs;
  let fixture: ComponentFixture<FeatureTabs>;
  let i18n: I18nService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureTabs],
      providers: [provideRouter([])],
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    i18n.set('pt');
    fixture = TestBed.createComponent(FeatureTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include the desktop PWA demo in web-apps and desktop-apps with the right context', async () => {
    const web = feature('web-apps', 'pwaDesktopWeb');
    expect(web?.inputs).toEqual({ context: 'web' });
    expect(await web!.loadComponent!()).toBeDefined();

    const desktop = feature('desktop-apps', 'pwaDesktop');
    expect(desktop?.inputs).toEqual({ context: 'desktop' });
    expect(await desktop!.loadComponent!()).toBeDefined();
  });

  it('should show only real totem photos in the custom-systems banner', () => {
    const banner = component.bannerFor(item('custom-systems'));
    expect(banner).toBeTruthy();
    const srcs = banner!.media!.map((m) => m.src);
    expect(srcs).toContain('/features/totem1.png');
    expect(srcs).toContain('/features/totem2.jpg');
    expect(srcs.some((s) => s.includes('/features/carousel/'))).toBeFalse();
  });

  it('should have a banner for every menu item, in every language', () => {
    for (const lang of LANGS) {
      i18n.set(lang.code);
      for (const it of ALL_ITEMS) {
        const banner = component.bannerFor(it);
        expect(banner).withContext(`${lang.code}/${it.id}`).toBeTruthy();
        // O trecho de destaque precisa existir no título, senão não é realçado.
        expect(banner!.headline).withContext(`${lang.code}/${it.id}`).toContain(banner!.accent!);
        expect(banner!.highlights.every((h) => !!h.label)).withContext(`${lang.code}/${it.id}`).toBeTrue();
        expect((banner!.media ?? []).every((m) => !!m.alt)).withContext(`${lang.code}/${it.id}`).toBeTrue();
        expect((banner!.mosaic ?? []).every((m) => !!m.label)).withContext(`${lang.code}/${it.id}`).toBeTrue();
      }
      expect(Object.keys(BANNER_TEXT[lang.code]).sort()).toEqual(Object.keys(BANNER_TEXT.pt).sort());
    }
    i18n.set('pt');
  });

  it('should have a translation for every item and feature text', () => {
    const keys = new Set<string>();
    for (const it of ALL_ITEMS) {
      keys.add(`item.${it.id}.title`).add(`item.${it.id}.subtitle`).add(`item.${it.id}.desc`);
      for (const f of it.features) {
        keys.add(`f.${f.key}`);
        if (f.kind === 'topic' || f.kind === 'screen' || f.kind === 'photo') keys.add(`f.${f.key}.d`);
      }
    }
    for (const lang of LANGS) {
      const table = I18N[lang.code] as Record<string, string>;
      for (const key of keys) {
        expect(table[key]).withContext(`${lang.code}: ${key}`).toBeTruthy();
      }
    }
  });

  it('should keep kiosk, meetings and games showcase in custom-systems', async () => {
    for (const key of ['kiosk', 'meetings', 'gamesPages']) {
      const f = feature('custom-systems', key);
      expect(f).withContext(key).toBeTruthy();
      expect(await f!.loadComponent!()).withContext(key).toBeDefined();
    }
    expect(feature('custom-systems', 'pEventTotem')?.price).toBe(3199);
  });

  it('should not use AI-generated or third-party images in feature rows', () => {
    const banned = ['/features/carousel/', 'commai', 'comma4', 'echoshow', 'totem_interativo_touch', 'event-camera-photos'];
    const images = ALL_ITEMS.flatMap((it) => it.features)
      .map((f: Feature) => f.image)
      .filter((src): src is string => !!src);
    for (const src of images) {
      expect(banned.some((b) => src.includes(b))).withContext(src).toBeFalse();
    }
  });

  it('should give every interactive feature a loader and every topic an icon', () => {
    for (const f of ALL_ITEMS.flatMap((it) => it.features)) {
      if (f.kind === 'component') expect(f.loadComponent).withContext(f.key).toBeDefined();
      if (f.kind === 'topic') expect(f.icon).withContext(f.key).toBeTruthy();
      if (f.kind === 'product') expect(f.posProductId).withContext(f.key).toBeTruthy();
    }
  });

  it('should switch tabs back to their first item and render the translated title', () => {
    component.selectTab('infrastructure');
    fixture.detectChanges();
    expect(component.activeItem().id).toBe(TAB_ITEMS.infrastructure[0].id);

    i18n.set('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('On-Premise Infrastructure');
    i18n.set('pt');
  });

  it('should render only one layout at a time', () => {
    const el: HTMLElement = fixture.nativeElement;
    const desktop = !!el.querySelector('.tabs-container');
    const mobile = !!el.querySelector('.tabs-accordion');
    expect(desktop !== mobile).toBeTrue();
  });
});
