import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Contact } from './contact';
import { I18nService } from '../../i18n/i18n.service';

describe('Contact', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Contact],
      providers: [provideRouter([])],
    })
    .compileComponents();

    // Os testes afirmam texto em português: fixa o idioma (o padrão vem do navegador).
    TestBed.inject(I18nService).set('pt');

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have message input placeholder set to "O que você deseja?"', () => {
    const messageInput = fixture.nativeElement.querySelector('input#message');
    expect(messageInput).toBeTruthy();
    expect(messageInput.getAttribute('placeholder')).toBe('O que você deseja?');
  });

  it('should display the updated 2022 - 2026 copyright notice in the footer', () => {
    const footerSmall = fixture.nativeElement.querySelector('small');
    expect(footerSmall).toBeTruthy();
    expect(footerSmall.textContent).toContain('2022 - 2026');
  });
});
