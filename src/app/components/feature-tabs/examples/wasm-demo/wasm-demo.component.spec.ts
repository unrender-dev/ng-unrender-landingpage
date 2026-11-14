import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../i18n/i18n.service';
import { WasmDemoComponent } from './wasm-demo.component';

describe('WasmDemoComponent', () => {
  let component: WasmDemoComponent;
  let fixture: ComponentFixture<WasmDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WasmDemoComponent],
    }).compileComponents();

    // Os textos conferidos abaixo são os do português.
    TestBed.inject(I18nService).set('pt');
    fixture = TestBed.createComponent(WasmDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the wasm demo component', () => {
    expect(component).toBeTruthy();
  });

  it('should present itself as a simulation and show the real editor screenshot', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.sim-tag')?.textContent).toContain('Simulação interativa');
    expect(el.querySelector('.bench-note')?.textContent).toContain('Valores ilustrativos');
    expect(el.querySelector('.real img')?.getAttribute('src')).toBe('/images/real-screens/editor-video-live-dark.png');
  });

  it('should start on the WebAssembly engine at 60 fps with the heavy 4K file', () => {
    expect(component.activeEngine).toBe('wasm');
    expect(component.activeProfile).toBe('heavy');
    expect(component.currentFps).toBe(60);
    expect(component.frameTimeMs).toBe(3.8);
    expect(component.droppedFrames).toBe(0);
    expect(component.showJsWarning).toBeFalse();
  });

  it('should switch to JavaScript and reflect the heavy-file telemetry', () => {
    component.setProfile('heavy');
    component.setEngine('js');
    expect(component.activeEngine).toBe('js');
    expect(component.currentFps).toBe(7.4);
    expect(component.frameTimeMs).toBe(135);
    expect(component.showJsWarning).toBeTrue();
    expect(component.droppedFrames).toBeGreaterThan(0);
  });

  it('should update telemetry for the light file in JavaScript mode', () => {
    component.setEngine('js');
    component.setProfile('light');
    expect(component.activeProfile).toBe('light');
    expect(component.currentFps).toBe(14.2);
    expect(component.frameTimeMs).toBe(44.5);
    expect(component.showJsWarning).toBeTrue();
  });

  it('should go back to 60 fps when returning to WebAssembly', () => {
    component.setEngine('js');
    component.setEngine('wasm');
    expect(component.currentFps).toBe(60);
    expect(component.frameTimeMs).toBe(3.8);
    expect(component.showJsWarning).toBeFalse();
  });

  it('should toggle playback', () => {
    const initial = component.isPlaying;
    component.togglePlay();
    expect(component.isPlaying).toBe(!initial);
  });

  it('should change the color preset', () => {
    component.setFilter('cyber');
    expect(component.selectedFilter).toBe('cyber');
    expect(component.currentFilterName).toBe('Cyberpunk');
  });

  it('should change the framing and translate its label', () => {
    component.setAspect('9:16');
    expect(component.currentAspectLabel).toBe('9:16 · vertical');
    component.setAspect('1:1');
    expect(component.currentAspectLabel).toBe('1:1 · feed');
    component.setAspect('16:9');
    expect(component.currentAspectLabel).toBe('16:9 · 4K');

    TestBed.inject(I18nService).set('en');
    component.setAspect('9:16');
    expect(component.currentAspectLabel).toBe('9:16 · portrait');
  });

  it('should seek within the clip boundaries', () => {
    component.currentTime = 10;
    component.seekRelative(5);
    expect(component.currentTime).toBe(15);
    component.seekRelative(-100);
    expect(component.currentTime).toBe(0);
    component.seekRelative(100);
    expect(component.currentTime).toBe(component.duration);
  });

  it('should scrub proportionally to the pointer position', () => {
    const mockEl = { getBoundingClientRect: () => ({ left: 100, width: 200 }) as DOMRect } as HTMLElement;
    component.onScrubClick(200, mockEl);
    expect(component.currentTime).toBeCloseTo(15, 1);
  });

  it('should expose the four reference metrics and format them for the language', () => {
    expect(component.benchmarkMetrics.length).toBe(4);
    const scrub = component.benchmarkMetrics[0];
    expect(scrub.wasmValue).toBe(60);
    expect(scrub.jsValue).toBe(14.2);
    expect(component.metricValue(scrub, 'js')).toBe('14,2 fps');
    expect(component.gainLabel(scrub)).toBe('4,2× mais rápido');

    const memory = component.benchmarkMetrics[2];
    expect(component.metricValue(memory, 'wasm')).toBe('Sem travar');
    expect(component.gainLabel(memory)).toBe('Estável');
  });

  it('should clean up on destroy', () => {
    component.runStressBenchmark();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
