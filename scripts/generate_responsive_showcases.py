import os, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

def make_gradient_bg(width, height):
    base = Image.new("RGBA", (width, height), (13, 4, 23, 255))
    draw = ImageDraw.Draw(base)

    # Ambient subtle glow top-center / top-left
    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    
    # Orange warm subtle spotlight behind devices
    for r in range(450, 0, -10):
        alpha = int(24 * (1.0 - r / 450.0))
        glow_draw.ellipse([width//2 - r, height//2 - r//2, width//2 + r, height//2 + r//2], fill=(249, 145, 38, alpha))
        
    # Purple deep glow bottom
    for r in range(600, 0, -15):
        alpha = int(35 * (1.0 - r / 600.0))
        glow_draw.ellipse([width//2 - r, height - r//3, width//2 + r, height + r//2], fill=(76, 29, 149, alpha))
        
    base = Image.alpha_composite(base, glow)
    return base

def draw_device_shadow(draw, x1, y1, x2, y2, radius=24, offset_y=28, blur_expand=20):
    # PIL shadow using semi-transparent rounded rect
    # We will do this via a blur layer
    pass

def render_smartphone_frame(screen_img, phone_w=340, phone_h=690, corner_r=46, bezel=12, dark_mode=True):
    """
    Renders a photorealistic modern smartphone frame (e.g. iPhone / high-end Android)
    with metallic chamfer, subtle bezel, dynamic island, and the given screen image.
    """
    frame = Image.new("RGBA", (phone_w, phone_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    # Outer chassis - metallic dark titanium with subtle gradient border
    draw.rounded_rectangle([0, 0, phone_w - 1, phone_h - 1], radius=corner_r, fill=(28, 28, 32, 255), outline=(60, 60, 68, 255), width=2)
    
    # Inner bezel
    screen_x1 = bezel
    screen_y1 = bezel
    screen_x2 = phone_w - bezel
    screen_y2 = phone_h - bezel
    screen_w = screen_x2 - screen_x1
    screen_h = screen_y2 - screen_y1
    screen_corner = corner_r - bezel // 2

    # Prepare screen content
    # Resize screen_img to fit screen_w, screen_h
    # Crop to maintain ratio without stretching
    sw, sh = screen_img.size
    scale = max(screen_w / sw, screen_h / sh)
    target_w = int(sw * scale)
    target_h = int(sh * scale)
    resized_screen = screen_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Center crop
    crop_x = (target_w - screen_w) // 2
    crop_y = 0  # prefer top of screen for mobile
    cropped_screen = resized_screen.crop((crop_x, crop_y, crop_x + screen_w, crop_y + screen_h)).convert("RGBA")

    # Mask with rounded corners
    screen_mask = Image.new("L", (screen_w, screen_h), 0)
    mask_draw = ImageDraw.Draw(screen_mask)
    mask_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_corner, fill=255)

    # Paste screen onto frame
    frame.paste(cropped_screen, (screen_x1, screen_y1), screen_mask)

    # Draw Dynamic Island / Speaker Pill at top
    pill_w = 90
    pill_h = 24
    pill_x1 = (phone_w - pill_w) // 2
    pill_y1 = screen_y1 + 10
    draw.rounded_rectangle([pill_x1, pill_y1, pill_x1 + pill_w, pill_y1 + pill_h], radius=12, fill=(0, 0, 0, 255))
    # Camera lens reflection inside pill
    draw.ellipse([pill_x1 + pill_w - 20, pill_y1 + 6, pill_x1 + pill_w - 8, pill_y1 + 18], fill=(12, 16, 24, 255), outline=(30, 40, 60, 255))

    # Home indicator bar at bottom
    bar_w = 110
    bar_h = 4
    bar_x1 = (phone_w - bar_w) // 2
    bar_y1 = screen_y2 - 12
    draw.rounded_rectangle([bar_x1, bar_y1, bar_x1 + bar_w, bar_y1 + bar_h], radius=2, fill=(180, 180, 190, 200))

    return frame

def render_tablet_frame(screen_img, tab_w=580, tab_h=410, corner_r=28, bezel=14):
    """
    Renders an iPad/Tablet horizontal frame with real screen.
    """
    frame = Image.new("RGBA", (tab_w, tab_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    # Outer chassis
    draw.rounded_rectangle([0, 0, tab_w - 1, tab_h - 1], radius=corner_r, fill=(24, 24, 28, 255), outline=(65, 65, 75, 255), width=2)

    screen_x1 = bezel
    screen_y1 = bezel
    screen_x2 = tab_w - bezel
    screen_y2 = tab_h - bezel
    screen_w = screen_x2 - screen_x1
    screen_h = screen_y2 - screen_y1
    screen_corner = corner_r - bezel // 2

    sw, sh = screen_img.size
    scale = max(screen_w / sw, screen_h / sh)
    target_w = int(sw * scale)
    target_h = int(sh * scale)
    resized_screen = screen_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    crop_x = (target_w - screen_w) // 2
    crop_y = (target_h - screen_h) // 2
    cropped_screen = resized_screen.crop((crop_x, crop_y, crop_x + screen_w, crop_y + screen_h)).convert("RGBA")

    screen_mask = Image.new("L", (screen_w, screen_h), 0)
    mask_draw = ImageDraw.Draw(screen_mask)
    mask_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_corner, fill=255)

    frame.paste(cropped_screen, (screen_x1, screen_y1), screen_mask)

    # Front camera dot (center top bezel)
    cam_x = tab_w // 2
    cam_y = bezel // 2
    draw.ellipse([cam_x - 3, cam_y - 3, cam_x + 3, cam_y + 3], fill=(8, 12, 16, 255), outline=(40, 50, 60, 255))

    return frame

def render_laptop_frame(screen_img, lap_w=780, lap_h=480, corner_r=20, bezel=12):
    """
    Renders a modern sleek laptop display with thin bezels and aluminum base.
    """
    # Total height including base
    total_h = lap_h + 30
    frame = Image.new("RGBA", (lap_w, total_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(frame)

    # Lid screen chassis
    draw.rounded_rectangle([20, 0, lap_w - 21, lap_h], radius=corner_r, fill=(20, 20, 24, 255), outline=(50, 50, 60, 255), width=2)

    screen_x1 = 20 + bezel
    screen_y1 = bezel
    screen_x2 = lap_w - 20 - bezel
    screen_y2 = lap_h - bezel
    screen_w = screen_x2 - screen_x1
    screen_h = screen_y2 - screen_y1
    screen_corner = corner_r - 4

    sw, sh = screen_img.size
    scale = max(screen_w / sw, screen_h / sh)
    target_w = int(sw * scale)
    target_h = int(sh * scale)
    resized_screen = screen_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    crop_x = (target_w - screen_w) // 2
    crop_y = (target_h - screen_h) // 2
    cropped_screen = resized_screen.crop((crop_x, crop_y, crop_x + screen_w, crop_y + screen_h)).convert("RGBA")

    screen_mask = Image.new("L", (screen_w, screen_h), 0)
    mask_draw = ImageDraw.Draw(screen_mask)
    mask_draw.rounded_rectangle([0, 0, screen_w, screen_h], radius=screen_corner, fill=255)

    frame.paste(cropped_screen, (screen_x1, screen_y1), screen_mask)

    # Webcam notch / camera dot
    cam_x = lap_w // 2
    cam_y = bezel // 2
    draw.ellipse([cam_x - 3, cam_y - 3, cam_x + 3, cam_y + 3], fill=(8, 12, 16, 255))

    # Laptop Bottom Base chassis
    base_y1 = lap_h - 4
    base_y2 = total_h - 10
    # Wide trapezoid base
    draw.rounded_rectangle([0, base_y1, lap_w - 1, base_y2], radius=8, fill=(38, 38, 44, 255), outline=(70, 70, 80, 255), width=1)
    # Notch opening
    draw.rounded_rectangle([lap_w // 2 - 45, base_y1, lap_w // 2 + 45, base_y1 + 6], radius=3, fill=(18, 18, 22, 255))

    return frame

def apply_drop_shadow(canvas, obj_img, pos_x, pos_y, blur_radius=30, shadow_color=(0, 0, 0, 180), offset_y=20):
    """
    Applies a smooth realistic Gaussian drop shadow under obj_img onto canvas.
    """
    w, h = obj_img.size
    shadow = Image.new("RGBA", (w + blur_radius * 2, h + blur_radius * 2), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow)
    
    # Extract alpha mask of obj_img
    alpha = obj_img.split()[3]
    # Draw solid shadow matching alpha
    shadow.paste(shadow_color, (blur_radius, blur_radius + offset_y), alpha)
    # Blur
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur_radius // 2))
    
    # Paste shadow then obj
    canvas.alpha_composite(shadow, (pos_x - blur_radius, pos_y - blur_radius))
    canvas.alpha_composite(obj_img, (pos_x, pos_y))

def build_mobile_native_showcase():
    """
    Builds the 'mobile-native-ctrlb.jpg' carousel slide:
    Three sleek modern smartphones showcasing real CTRLB Mobile & PWA:
    - Left: Atendimento WhatsApp / CRM em tempo real
    - Center: Agendamento & Turmas do Aluno
    - Right: Dashboard & Telemetria Mobile
    """
    canvas_w, canvas_h = 1600, 900
    canvas = make_gradient_bg(canvas_w, canvas_h)

    # Real screens
    screen_agenda = Image.open('public/images/real-screens/mobile-agendamento-modal.png')
    screen_chat = Image.open('public/images/real-screens/conversas-live-dark.png')
    screen_crm = Image.open('public/images/real-screens/crm-live-dark.png')

    # Crop modal cleanly for center phone
    # modal box was: x=[30, 809], y=[70, 1729]
    cropped_agenda = screen_agenda.crop((30, 70, 810, 1730))
    # Add status bar space (36px white top) so dynamic island doesn't cover title
    padded_agenda = Image.new("RGBA", (cropped_agenda.width, cropped_agenda.height + 70), (255, 255, 255, 255))
    padded_agenda.paste(cropped_agenda, (0, 70))

    # For chat on mobile, crop the active conversation sidebar & content
    chat_mobile_crop = screen_chat.crop((0, 0, 520, 900))

    # For CRM on mobile, crop the kanban pipeline
    crm_mobile_crop = screen_crm.crop((170, 0, 770, 900))

    # Phones dimensions
    # Center phone (dominant): 370 x 750
    center_phone = render_smartphone_frame(padded_agenda, phone_w=370, phone_h=750, corner_r=50, bezel=12)
    # Left phone: 320 x 650
    left_phone = render_smartphone_frame(chat_mobile_crop, phone_w=320, phone_h=650, corner_r=44, bezel=11)
    # Right phone: 320 x 650
    right_phone = render_smartphone_frame(crm_mobile_crop, phone_w=320, phone_h=650, corner_r=44, bezel=11)

    # Positions
    # Center phone
    cx = (canvas_w - 370) // 2
    cy = 135

    # Left phone
    lx = cx - 280
    ly = cy + 50

    # Right phone
    rx = cx + 330
    ry = cy + 50

    # Composite with drop shadows: Left & Right behind Center
    apply_drop_shadow(canvas, left_phone, lx, ly, blur_radius=36, shadow_color=(0, 0, 0, 200), offset_y=24)
    apply_drop_shadow(canvas, right_phone, rx, ry, blur_radius=36, shadow_color=(0, 0, 0, 200), offset_y=24)
    apply_drop_shadow(canvas, center_phone, cx, cy, blur_radius=44, shadow_color=(0, 0, 0, 220), offset_y=30)

    # Header title text in top left
    draw = ImageDraw.Draw(canvas)
    try:
        font_badge = ImageFont.truetype("C:/Windows/Fonts/seguisb.ttf", 16)
        font_title = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 32)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    except Exception:
        font_badge = font_title = font_sub = None

    # Badge pill
    badge_text = "ECOSSISTEMA MOBILE CTRLB SGA"
    draw.rounded_rectangle([60, 45, 360, 77], radius=16, fill=(38, 19, 68, 220), outline=(249, 145, 38, 200), width=1)
    draw.ellipse([74, 57, 82, 65], fill=(249, 145, 38, 255))
    draw.text((90, 52), badge_text, font=font_badge, fill=(255, 255, 255, 255))

    draw.text((60, 90), "Aplicativos Nativos Android & iOS e PWA Instalável", font=font_title, fill=(255, 255, 255, 255))
    draw.text((60, 134), "Interfaces reais em Jetpack Compose, SwiftUI e PWA Offline com Push Notifications", font=font_sub, fill=(200, 190, 220, 220))

    # Phone labels below
    draw.text((lx + 60, ly + 665), "Atendimento WhatsApp & CRM", font=font_sub, fill=(249, 145, 38, 255))
    draw.text((cx + 70, cy + 765), "Agendamento & Aulas Mobile", font=font_sub, fill=(52, 211, 153, 255))
    draw.text((rx + 70, ry + 665), "CRM & Funil de Vendas Mobile", font=font_sub, fill=(96, 165, 250, 255))

    out_path = 'public/features/carousel/mobile-native-ctrlb.jpg'
    canvas.convert("RGB").save(out_path, quality=95)
    print(f"Saved {out_path} ({canvas_w}x{canvas_h})")

def build_responsive_multi_device_showcase():
    """
    Builds the 'mobile-ctrlb-responsive.jpg' carousel slide:
    A complete responsive suite showing:
    - Laptop / Desktop (Left/Center background)
    - Tablet (Right background)
    - Smartphone (Foreground right)
    All running real CTRLB SGA screens.
    """
    canvas_w, canvas_h = 1600, 900
    canvas = make_gradient_bg(canvas_w, canvas_h)

    # Real screens
    screen_dash = Image.open('public/images/real-screens/dashboard-live-dark.png')
    screen_agenda = Image.open('public/images/real-screens/agenda-live-dark.png')
    screen_mobile = Image.open('public/images/real-screens/mobile-agendamento-modal.png')
    cropped_mobile = screen_mobile.crop((30, 70, 810, 1730))
    padded_mobile = Image.new("RGBA", (cropped_mobile.width, cropped_mobile.height + 70), (255, 255, 255, 255))
    padded_mobile.paste(cropped_mobile, (0, 70))

    # Render devices
    # 1. Laptop running Dashboard
    laptop = render_laptop_frame(screen_dash, lap_w=820, lap_h=490, corner_r=22, bezel=14)
    # 2. Tablet running Agenda
    tablet = render_tablet_frame(screen_agenda, tab_w=510, tab_h=355, corner_r=26, bezel=14)
    # 3. Smartphone running Mobile Agendamento
    phone = render_smartphone_frame(padded_mobile, phone_w=270, phone_h=540, corner_r=42, bezel=11)

    # Positions - plenty of breathing room at bottom (all devices finish above y=780 on 900h canvas)
    lap_x = 70
    lap_y = 230

    tab_x = 770
    tab_y = 210

    phone_x = 1190
    phone_y = 225

    # Composite: Laptop and Tablet first, then Phone in front with crisp natural drop shadows
    apply_drop_shadow(canvas, laptop, lap_x, lap_y, blur_radius=28, shadow_color=(0, 0, 0, 190), offset_y=16)
    apply_drop_shadow(canvas, tablet, tab_x, tab_y, blur_radius=26, shadow_color=(0, 0, 0, 180), offset_y=14)
    apply_drop_shadow(canvas, phone, phone_x, phone_y, blur_radius=30, shadow_color=(0, 0, 0, 200), offset_y=18)

    # Header titles
    draw = ImageDraw.Draw(canvas)
    try:
        font_badge = ImageFont.truetype("C:/Windows/Fonts/seguisb.ttf", 16)
        font_title = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 32)
        font_sub = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 16)
    except Exception:
        font_badge = font_title = font_sub = None

    badge_text = "DESIGN 100% RESPONSIVO & MULTIPLATAFORMA"
    draw.rounded_rectangle([60, 45, 430, 77], radius=16, fill=(38, 19, 68, 220), outline=(249, 145, 38, 200), width=1)
    draw.ellipse([74, 57, 82, 65], fill=(249, 145, 38, 255))
    draw.text((90, 52), badge_text, font=font_badge, fill=(255, 255, 255, 255))

    draw.text((60, 90), "Sistemas Web e Mobile sem Perda de Proporção", font=font_title, fill=(255, 255, 255, 255))
    draw.text((60, 134), "Uma única base de código que se molda com perfeição do desktop 4K ao smartphone", font=font_sub, fill=(200, 190, 220, 220))

    out_path = 'public/features/carousel/mobile-ctrlb-responsive.jpg'
    canvas.convert("RGB").save(out_path, quality=95)
    print(f"Saved {out_path} ({canvas_w}x{canvas_h})")

def build_responsive_devices_clean(scale=1.5):
    """
    Versão "limpa" do showcase multi-dispositivo para o FeatureBanner do site:
    só os 3 aparelhos (notebook, tablet, celular) com telas reais do CTRLB,
    fundo transparente, sem título "queimado" e recortada rente aos aparelhos.
    O texto fica no HTML, então a imagem nunca é cortada pelo layout.
    """
    s = lambda v: int(round(v * scale))
    canvas_w, canvas_h = s(1600), s(900)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))

    screen_dash = Image.open('public/images/real-screens/dashboard-live-dark.png')
    screen_agenda = Image.open('public/images/real-screens/agenda-live-dark.png')
    screen_mobile = Image.open('public/images/real-screens/mobile-agendamento-modal.png')
    cropped_mobile = screen_mobile.crop((30, 70, 810, 1730))
    padded_mobile = Image.new("RGBA", (cropped_mobile.width, cropped_mobile.height + 70), (255, 255, 255, 255))
    padded_mobile.paste(cropped_mobile, (0, 70))

    laptop = render_laptop_frame(screen_dash, lap_w=s(820), lap_h=s(490), corner_r=s(22), bezel=s(14))
    tablet = render_tablet_frame(screen_agenda, tab_w=s(510), tab_h=s(355), corner_r=s(26), bezel=s(14))
    phone = render_smartphone_frame(padded_mobile, phone_w=s(270), phone_h=s(540), corner_r=s(42), bezel=s(11))

    apply_drop_shadow(canvas, laptop, s(70), s(230), blur_radius=s(28), shadow_color=(0, 0, 0, 150), offset_y=s(16))
    apply_drop_shadow(canvas, tablet, s(770), s(210), blur_radius=s(26), shadow_color=(0, 0, 0, 150), offset_y=s(14))
    apply_drop_shadow(canvas, phone, s(1190), s(225), blur_radius=s(30), shadow_color=(0, 0, 0, 170), offset_y=s(18))

    # Recorta rente aos aparelhos + sombra (com uma margem pequena).
    bbox = canvas.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    pad = s(12)
    bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0),
            min(bbox[2] + pad, canvas_w), min(bbox[3] + pad, canvas_h))
    out = canvas.crop(bbox)

    out_path = 'public/images/showcases/ctrlb-responsive-devices.webp'
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, 'WEBP', quality=88, method=6)
    print(f"Saved {out_path} ({out.width}x{out.height})")

if __name__ == '__main__':
    build_responsive_multi_device_showcase()
    build_responsive_devices_clean()
    print("SHOWCASES GENERATED!")
