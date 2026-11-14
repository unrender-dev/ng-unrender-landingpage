import os
import math
from PIL import Image, ImageDraw, ImageFont

WIDTH = 960
HEIGHT = 540

def get_font(name, size):
    fonts_dir = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts')
    path = os.path.join(fonts_dir, name)
    if os.path.exists(path):
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

FONT_TITLE = get_font('segoeuib.ttf', 20)
FONT_SUB = get_font('segoeui.ttf', 12)
FONT_BOLD_MD = get_font('segoeuib.ttf', 13)
FONT_SM = get_font('segoeui.ttf', 11)
FONT_BOLD_SM = get_font('segoeuib.ttf', 11)
FONT_XS = get_font('segoeui.ttf', 10)
FONT_BOLD_XS = get_font('segoeuib.ttf', 10)
FONT_LG = get_font('segoeuib.ttf', 17)
FONT_TINY = get_font('segoeui.ttf', 9)
FONT_BOLD_TINY = get_font('segoeuib.ttf', 9)

def draw_tech_bg(draw, color_center=(28, 12, 54), color_edge=(10, 4, 18)):
    # Subtle radial glow
    cx, cy = int(WIDTH * 0.35), int(HEIGHT * 0.45)
    for r in range(450, 0, -18):
        alpha = int((1 - r / 450) * 45)
        color = (
            min(255, color_edge[0] + int((color_center[0] - color_edge[0]) * (alpha / 45))),
            min(255, color_edge[1] + int((color_center[1] - color_edge[1]) * (alpha / 45))),
            min(255, color_edge[2] + int((color_center[2] - color_edge[2]) * (alpha / 45))),
        )
        draw.ellipse([cx - r, cy - int(r * 0.65), cx + r, cy + int(r * 0.65)], fill=color)

    # Very subtle dark purple grid lines
    grid_color = (25, 12, 38)
    for x in range(0, WIDTH, 48):
        draw.line([(x, 0), (x, HEIGHT)], fill=grid_color, width=1)
    for y in range(0, HEIGHT, 48):
        draw.line([(0, y), (WIDTH, y)], fill=grid_color, width=1)

def draw_window_frame(draw, x1, y1, x2, y2, url, badge_text, badge_color=(249, 145, 38)):
    # Window background
    draw.rounded_rectangle([x1, y1, x2, y2], radius=12, fill=(18, 9, 34), outline=(75, 40, 115), width=1)
    # Header bar
    draw.rounded_rectangle([x1, y1, x2, y1 + 36], radius=12, fill=(28, 14, 50))
    draw.rectangle([x1, y1 + 24, x2, y1 + 36], fill=(28, 14, 50))
    draw.line([(x1, y1 + 36), (x2, y1 + 36)], fill=(55, 28, 95), width=1)

    # Dots
    draw.ellipse([x1 + 14, y1 + 13, x1 + 24, y1 + 23], fill=(255, 95, 87))
    draw.ellipse([x1 + 29, y1 + 13, x1 + 39, y1 + 23], fill=(254, 188, 46))
    draw.ellipse([x1 + 44, y1 + 13, x1 + 54, y1 + 23], fill=(40, 200, 64))

    # URL bar with mini lock vector
    url_x1, url_x2 = x1 + 72, x2 - 16
    draw.rounded_rectangle([url_x1, y1 + 8, url_x2, y1 + 28], radius=10, fill=(12, 6, 24), outline=(60, 30, 95), width=1)
    # Lock body + shackle
    draw.rectangle([url_x1 + 12, y1 + 16, url_x1 + 19, y1 + 23], fill=(168, 85, 247))
    draw.arc([url_x1 + 13, y1 + 11, url_x1 + 18, y1 + 17], 180, 0, fill=(168, 85, 247), width=1)
    draw.text((url_x1 + 25, y1 + 11), url, font=FONT_XS, fill=(190, 180, 215))

    # Top pill badge
    if badge_text:
        badge_w = len(badge_text) * 6 + 28
        draw.rounded_rectangle([x1 + 12, y1 - 25, x1 + 12 + badge_w, y1 - 5], radius=10, fill=(20, 10, 35), outline=badge_color, width=1)
        draw.ellipse([x1 + 20, y1 - 18, x1 + 26, y1 - 12], fill=(34, 197, 94))
        draw.text((x1 + 32, y1 - 22), badge_text, font=FONT_BOLD_XS, fill=(255, 255, 255))

def draw_vector_check(draw, x, y, size=10, color=(34, 197, 94), width=2):
    p1 = (x, y + size * 0.5)
    p2 = (x + size * 0.35, y + size)
    p3 = (x + size, y)
    draw.line([p1, p2], fill=color, width=width)
    draw.line([p2, p3], fill=color, width=width)

def draw_cursor(draw, cx, cy, click=False):
    poly = [(cx, cy), (cx + 14, cy + 10), (cx + 7, cy + 12), (cx + 10, cy + 19), (cx + 7, cy + 20), (cx + 4, cy + 13), (cx, cy + 16)]
    draw.polygon(poly, fill=(255, 255, 255), outline=(16, 5, 28))
    if click:
        draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], outline=(249, 145, 38), width=2)

def draw_vector_heart(draw, cx, cy, size=6, color=(239, 68, 68)):
    r = size // 2
    draw.ellipse([cx - size, cy - r, cx, cy + r], fill=color)
    draw.ellipse([cx, cy - r, cx + size, cy + r], fill=color)
    draw.polygon([(cx - size, cy), (cx + size, cy), (cx, cy + size + 2)], fill=color)


# ==============================================================================
# 1. GENERATE LP E-COMMERCE ANIM (AQUI.SHOPPING)
# ==============================================================================
def draw_sneaker(draw, cx, cy, col=(249, 145, 38)):
    # Stylized athletic sneaker vector
    sole = [(cx - 24, cy + 14), (cx + 24, cy + 14), (cx + 26, cy + 19), (cx - 24, cy + 19)]
    draw.polygon(sole, fill=(240, 240, 245))
    upper = [(cx - 22, cy + 14), (cx - 20, cy + 2), (cx - 6, cy - 8), (cx + 10, cy + 2), (cx + 24, cy + 10), (cx + 24, cy + 14)]
    draw.polygon(upper, fill=col)
    # dynamic accent swoosh
    draw.line([(cx - 10, cy + 8), (cx + 8, cy + 4), (cx + 18, cy - 2)], fill=(255, 255, 255), width=2)

def draw_smartwatch(draw, cx, cy, col=(139, 92, 246)):
    # Modern smartwatch vector
    # strap
    draw.rectangle([cx - 10, cy - 22, cx + 10, cy + 22], fill=(45, 22, 70))
    # watch body
    draw.rounded_rectangle([cx - 16, cy - 16, cx + 16, cy + 16], radius=6, fill=(15, 8, 28), outline=col, width=2)
    # screen display
    draw.text((cx - 10, cy - 10), '09:41', font=FONT_BOLD_TINY, fill=(255, 255, 255))
    draw.ellipse([cx - 4, cy + 3, cx + 4, cy + 11], fill=(236, 72, 153))

def draw_headset(draw, cx, cy, col=(34, 197, 94)):
    # Over-ear headset vector
    # headband
    draw.arc([cx - 18, cy - 20, cx + 18, cy + 12], 180, 0, fill=(200, 200, 220), width=3)
    # left & right earcups
    draw.rounded_rectangle([cx - 22, cy - 4, cx - 14, cy + 16], radius=4, fill=col)
    draw.rounded_rectangle([cx + 14, cy - 4, cx + 22, cy + 16], radius=4, fill=col)
    # mic
    draw.line([(cx + 18, cy + 12), (cx + 10, cy + 20), (cx + 2, cy + 20)], fill=(255, 255, 255), width=2)
    draw.ellipse([cx, cy + 18, cx + 4, cy + 22], fill=(249, 145, 38))

def draw_qr_code(draw, qx1, qy1, size=70):
    draw.rounded_rectangle([qx1, qy1, qx1 + size, qy1 + size], radius=6, fill=(255, 255, 255))
    # 3 corner position markers (outer box + inner box)
    def pos_marker(mx, my):
        draw.rectangle([mx, my, mx + 16, my + 16], fill=(16, 5, 28))
        draw.rectangle([mx + 3, my + 3, mx + 13, my + 13], fill=(255, 255, 255))
        draw.rectangle([mx + 5, my + 5, mx + 11, my + 11], fill=(16, 5, 28))
    pos_marker(qx1 + 4, qy1 + 4)
    pos_marker(qx1 + size - 20, qy1 + 4)
    pos_marker(qx1 + 4, qy1 + size - 20)
    # random pattern data modules
    for py in range(qy1 + 4, qy1 + size - 4, 6):
        for px in range(qx1 + 4, qx1 + size - 4, 6):
            if not ((px < qx1 + 24 and py < qy1 + 24) or (px > qx1 + size - 24 and py < qy1 + 24) or (px < qx1 + 24 and py > qy1 + size - 24)):
                if (px * py + py) % 7 in (0, 2, 4):
                    draw.rectangle([px, py, px + 4, py + 4], fill=(16, 5, 28))
    # center green PIX emblem
    draw.rounded_rectangle([qx1 + size//2 - 9, qy1 + size//2 - 9, qx1 + size//2 + 9, qy1 + size//2 + 9], radius=3, fill=(34, 197, 94))
    draw_vector_check(draw, qx1 + size//2 - 5, qy1 + size//2 - 4, size=8, color=(255, 255, 255), width=2)

def generate_lp_ecommerce_anim():
    print("Generating lp-ecommerce-anim.gif (perfect margins, vector art, Brazilian Portuguese)...")
    frames = []

    for f in range(20):
        img = Image.new('RGB', (WIDTH, HEIGHT), (10, 4, 18))
        draw = ImageDraw.Draw(img)
        draw_tech_bg(draw, color_center=(26, 14, 48), color_edge=(9, 4, 17))

        # Desktop Window (Left): bounds wx1=34, wy1=58, wx2=630, wy2=465 (75px bottom margin!)
        wx1, wy1, wx2, wy2 = 34, 58, 630, 465
        draw_window_frame(draw, wx1, wy1, wx2, wy2, "https://aqui.shopping/loja/unrender", "E-COMMERCE & VITRINE DIGITAL")

        # Desktop Content
        draw.text((wx1 + 24, wy1 + 44), "SHOPPING LOCAL & VENDAS ONLINE", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw.text((wx1 + 24, wy1 + 58), "Aqui.shopping — Vitrine do Seu Negócio", font=FONT_TITLE, fill=(255, 255, 255))
        draw.text((wx1 + 24, wy1 + 86), "Produtos sincronizados com estoque físico, catálogo web leve e PIX direto.", font=FONT_SUB, fill=(185, 175, 205))

        # Product cards (3 items)
        products = [
            ("Tênis Sport Runner", "R$ 189,90", "Estoque: 14 un", (249, 145, 38), draw_sneaker),
            ("Smartwatch Pro", "R$ 279,00", "Mais Vendido", (139, 92, 246), draw_smartwatch),
            ("Headset Wireless", "R$ 149,00", "Pronta Entrega", (34, 197, 94), draw_headset)
        ]

        card_w = 176
        for i, (p_name, p_price, p_badge, p_col, p_draw_fn) in enumerate(products):
            cx1 = wx1 + 24 + i * (card_w + 16)
            cy1 = wy1 + 114
            cx2 = cx1 + card_w
            cy2 = cy1 + 172

            is_hover = (i == 1 and f >= 7 and f <= 15)
            card_bg = (30, 16, 54) if is_hover else (22, 11, 40)
            border_col = (249, 145, 38) if is_hover else (60, 32, 95)

            draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=10, fill=card_bg, outline=border_col, width=2 if is_hover else 1)

            # Product image area
            draw.rounded_rectangle([cx1 + 10, cy1 + 8, cx2 - 10, cy1 + 86], radius=7, fill=(14, 7, 26))
            # Vector artwork
            p_draw_fn(draw, (cx1 + cx2)//2, cy1 + 46, p_col)

            # Badge
            b_w = len(p_badge)*6 + 10
            draw.rounded_rectangle([cx1 + 14, cy1 + 12, cx1 + 14 + b_w, cy1 + 26], radius=4, fill=(10, 5, 20), outline=p_col, width=1)
            draw.text((cx1 + 18, cy1 + 13), p_badge, font=FONT_BOLD_TINY, fill=p_col)

            # Info
            draw.text((cx1 + 12, cy1 + 94), p_name, font=FONT_BOLD_SM, fill=(255, 255, 255))
            draw.text((cx1 + 12, cy1 + 114), p_price, font=FONT_LG, fill=(249, 145, 38))

            # Buy button
            btn_bg = (249, 145, 38) if is_hover else (38, 20, 68)
            btn_txt_col = (16, 5, 28) if is_hover else (230, 220, 250)
            draw.rounded_rectangle([cx1 + 12, cy1 + 140, cx2 - 12, cy1 + 164], radius=6, fill=btn_bg)
            draw.text((cx1 + 42, cy1 + 146), "Comprar Agora", font=FONT_BOLD_XS, fill=btn_txt_col)

        # Desktop CTA button
        draw.rounded_rectangle([wx1 + 24, wy1 + 296, wx1 + 230, wy1 + 330], radius=8, fill=(249, 145, 38))
        draw.text((wx1 + 42, wy1 + 305), "Ver Catálogo Completo  >", font=FONT_BOLD_SM, fill=(16, 5, 28))

        # 3 KPI Badges (y=342..388)
        kpis = [("Zero Comissões", "100% da venda é sua"), ("PIX em 3s", "Aprovação instantânea"), ("Estoque Real", "Sincronizado físico e online")]
        for j, (k_title, k_desc) in enumerate(kpis):
            kx = wx1 + 24 + j * 188
            ky = wy1 + 344
            draw.rounded_rectangle([kx, ky, kx + 176, ky + 44], radius=8, fill=(14, 7, 28), outline=(50, 25, 80), width=1)
            draw.text((kx + 12, ky + 6), k_title, font=FONT_BOLD_XS, fill=(34, 197, 94) if j == 0 else ((249, 145, 38) if j == 1 else (168, 85, 247)))
            draw.text((kx + 12, ky + 22), k_desc, font=FONT_XS, fill=(160, 150, 180))

        # Mobile Phone Mockup (Right): bounds px=662, py=58, pw=260, ph=412 (ending at y=470!)
        px, py, pw, ph = 662, 58, 260, 412
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=24, fill=(12, 6, 22), outline=(249, 145, 38), width=2)
        # Notch
        draw.rounded_rectangle([px + pw//2 - 28, py + 8, px + pw//2 + 28, py + 18], radius=5, fill=(0, 0, 0))
        draw.text((px + 18, py + 22), "9:41", font=FONT_BOLD_XS, fill=(255, 255, 255))
        draw.text((px + pw - 38, py + 22), "100%", font=FONT_XS, fill=(160, 150, 180))

        # Mobile app bar
        draw.rounded_rectangle([px + 10, py + 34, px + pw - 10, py + 60], radius=8, fill=(24, 12, 44))
        draw.text((px + 18, py + 40), "Aqui.shopping", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw.text((px + pw - 75, py + 40), "Sacola (1)", font=FONT_XS, fill=(255, 255, 255))

        # Mobile Order Card
        draw.rounded_rectangle([px + 12, py + 68, px + pw - 12, py + 144], radius=10, fill=(20, 10, 36), outline=(60, 30, 95), width=1)
        draw.text((px + 20, py + 76), "Smartwatch Pro Ultra", font=FONT_BOLD_SM, fill=(255, 255, 255))
        draw.text((px + 20, py + 94), "Qtd: 1  •  R$ 279,00", font=FONT_SM, fill=(180, 170, 205))
        draw.line([(px + 20, py + 112), (px + pw - 20, py + 112)], fill=(45, 22, 70), width=1)
        draw.text((px + 20, py + 120), "Total: R$ 279,00", font=FONT_BOLD_SM, fill=(249, 145, 38))
        draw.text((px + pw - 85, py + 122), "Frete Grátis", font=FONT_XS, fill=(34, 197, 94))

        # PIX status box
        pulse = (f >= 6 and f <= 16)
        pix_bg = (18, 38, 26) if pulse else (16, 8, 30)
        pix_border = (34, 197, 94) if pulse else (50, 25, 80)
        draw.rounded_rectangle([px + 12, py + 152, px + pw - 12, py + 268], radius=12, fill=pix_bg, outline=pix_border, width=2 if pulse else 1)

        # Real QR Code Vector
        draw_qr_code(draw, px + 22, py + 162, size=68)

        # QR text
        draw.text((px + 104, py + 168), "Pague com PIX", font=FONT_BOLD_SM, fill=(255, 255, 255))
        draw.text((px + 104, py + 186), "Chave copia e cola", font=FONT_XS, fill=(170, 160, 195))
        draw.rounded_rectangle([px + 104, py + 204, px + pw - 20, py + 228], radius=6, fill=(34, 197, 94))
        draw_vector_check(draw, px + 112, py + 211, size=9, color=(10, 4, 18), width=2)
        draw.text((px + 126, py + 209), "PIX Copiado", font=FONT_BOLD_XS, fill=(10, 4, 18))

        # Status banner
        status_txt = "Pagamento Aprovado!" if pulse else "Aguardando PIX..."
        status_col = (34, 197, 94) if pulse else (249, 145, 38)
        draw.rounded_rectangle([px + 20, py + 238, px + pw - 20, py + 260], radius=6, fill=(10, 5, 20))
        draw.ellipse([px + 28, py + 245, px + 36, py + 253], fill=status_col)
        draw.text((px + 44, py + 242), status_txt, font=FONT_BOLD_XS, fill=status_col)

        # WhatsApp notification button
        draw.rounded_rectangle([px + 12, py + 278, px + pw - 12, py + 314], radius=10, fill=(34, 197, 94))
        draw_vector_check(draw, px + 28, py + 292, size=11, color=(10, 4, 18), width=2)
        draw.text((px + 48, py + 289), "Avisar pelo WhatsApp", font=FONT_BOLD_SM, fill=(10, 4, 18))

        # Delivery progress (y=322..398)
        draw.rounded_rectangle([px + 12, py + 322, px + pw - 12, py + 398], radius=10, fill=(18, 9, 32), outline=(50, 25, 80), width=1)
        draw.text((px + 20, py + 330), "Status do Pedido", font=FONT_BOLD_XS, fill=(180, 170, 205))
        draw.text((px + 20, py + 346), "Em rota de entrega expressa", font=FONT_BOLD_SM, fill=(255, 255, 255))
        draw.rounded_rectangle([px + 20, py + 368, px + pw - 20, py + 374], radius=3, fill=(35, 18, 55))
        draw.rounded_rectangle([px + 20, py + 368, px + int((pw - 40) * (0.6 + 0.3 * (f / 20))), py + 374], radius=3, fill=(34, 197, 94))

        # Smooth Cursor on Desktop
        cur_x = wx1 + 110 + int(18 * math.sin(f * 0.3))
        cur_y = wy1 + 312 + int(4 * math.cos(f * 0.3))
        draw_cursor(draw, cur_x, cur_y, click=(f >= 10 and f <= 13))

        frames.append(img)

    out_path = 'public/features/carousel/lp-ecommerce-anim.gif'
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=130, loop=0, optimize=True)
    print(f"Saved {out_path} ({len(frames)} frames)")


# ==============================================================================
# 2. GENERATE LP GAMIFICATION ANIM
# ==============================================================================
def generate_lp_gamification_anim():
    print("Generating lp-gamification-anim.gif (rich 3D WebGL scene, game HUD, touch controls)...")
    frames = []

    for f in range(20):
        img = Image.new('RGB', (WIDTH, HEIGHT), (9, 4, 18))
        draw = ImageDraw.Draw(img)
        draw_tech_bg(draw, color_center=(32, 10, 58), color_edge=(9, 4, 17))

        # Desktop Window (Left): bounds wx1=34, wy1=58, wx2=630, wy2=465 (75px bottom margin!)
        wx1, wy1, wx2, wy2 = 34, 58, 630, 465
        draw_window_frame(draw, wx1, wy1, wx2, wy2, "https://unrender.games/3d-experience", "3D, WEBGL & GAMIFICAÇÃO")

        # Desktop Content
        draw.text((wx1 + 24, wy1 + 44), "INTERATIVIDADE & ALTA CONVERSÃO", font=FONT_BOLD_XS, fill=(168, 85, 247))
        draw.text((wx1 + 24, wy1 + 58), "Gamificação & 3D Web Imersivo", font=FONT_TITLE, fill=(255, 255, 255))
        draw.text((wx1 + 24, wy1 + 86), "Mundos 3D interativos, física em tempo real e jogos web que prendem a atenção.", font=FONT_SUB, fill=(185, 175, 205))

        # 3D Viewport Box (y=114..285)
        vx1, vy1, vx2, vy2 = wx1 + 24, wy1 + 114, wx2 - 24, wy1 + 288
        draw.rounded_rectangle([vx1, vy1, vx2, vy2], radius=10, fill=(12, 6, 24), outline=(139, 92, 246), width=1)

        # 3D HUD overlay inside viewport
        draw.text((vx1 + 14, vy1 + 10), "VIDAS:", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw_vector_heart(draw, vx1 + 60, vy1 + 15, size=5, color=(239, 68, 68))
        draw_vector_heart(draw, vx1 + 74, vy1 + 15, size=5, color=(239, 68, 68))
        draw_vector_heart(draw, vx1 + 88, vy1 + 15, size=5, color=(239, 68, 68))
        draw.text((vx1 + 100, vy1 + 10), "•  SCORE: 14.850  •  FASE 3", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw.text((vx2 - 145, vy1 + 10), "60 FPS • WebGL 2.0", font=FONT_BOLD_XS, fill=(34, 197, 94))

        # Rotating 3D crystal / gem
        angle = f * (2 * math.pi / 20)
        center_x = (vx1 + vx2) // 2 - 75
        center_y = (vy1 + vy2) // 2 + 10
        size = 50

        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        def project(x, y, z):
            rx = x * cos_a + z * sin_a
            rz = -x * sin_a + z * cos_a
            iso_x = center_x + rx - rz * 0.5
            iso_y = center_y + y + (rx + rz) * 0.3
            return (iso_x, iso_y)

        top_poly = [project(-size, -size, -size), project(size, -size, -size), project(size, -size, size), project(-size, -size, size)]
        left_poly = [project(-size, -size, size), project(size, -size, size), project(size, size, size), project(-size, size, size)]
        right_poly = [project(size, -size, -size), project(size, -size, size), project(size, size, size), project(size, size, -size)]

        draw.polygon(top_poly, fill=(249, 145, 38), outline=(255, 180, 80))
        draw.polygon(left_poly, fill=(139, 92, 246), outline=(180, 130, 255))
        draw.polygon(right_poly, fill=(76, 29, 149), outline=(120, 80, 220))

        # Orbiting glowing particles & stars
        for p in range(6):
            p_ang = angle + p * (math.pi / 3)
            px_p = center_x + math.cos(p_ang) * 92
            py_p = center_y + math.sin(p_ang) * 42
            draw.ellipse([px_p - 4, py_p - 4, px_p + 4, py_p + 4], fill=(249, 145, 38) if p % 2 == 0 else (255, 215, 0))

        # 3D Control overlay inside viewport
        draw.text((vx1 + 355, vy1 + 22), "CENA 3D NATIVA", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw.text((vx1 + 355, vy1 + 38), "Renderizador WebGL 60 FPS", font=FONT_BOLD_SM, fill=(255, 255, 255))
        draw.text((vx1 + 355, vy1 + 56), "Iluminação dinâmica e sombras PBR", font=FONT_XS, fill=(160, 150, 180))

        ctrl_items = ["Rotação 360 graus", "Física Ativa 60fps", "Shaders PBR Realistas"]
        for ci, ct in enumerate(ctrl_items):
            cy_c = vy1 + 80 + ci * 26
            draw.rounded_rectangle([vx1 + 355, cy_c, vx1 + 510, cy_c + 20], radius=5, fill=(24, 12, 44), outline=(60, 30, 95), width=1)
            draw.ellipse([vx1 + 364, cy_c + 6, vx1 + 372, cy_c + 14], fill=(249, 145, 38) if ci == 0 else (139, 92, 246))
            draw.text((vx1 + 378, cy_c + 3), ct, font=FONT_XS, fill=(230, 220, 250))

        # CTA Button
        draw.rounded_rectangle([wx1 + 24, wy1 + 298, wx1 + 235, wy1 + 332], radius=8, fill=(139, 92, 246))
        draw.text((wx1 + 42, wy1 + 307), "Explorar Showroom 3D  >", font=FONT_BOLD_SM, fill=(255, 255, 255))

        # KPIs (y=342..388)
        kpis = [("+340% Retenção", "Usuários engajam 3x mais"), ("WebGL Nativo", "Roda direto sem plugins"), ("60 FPS Fluido", "Otimizado para celulares")]
        for j, (k_title, k_desc) in enumerate(kpis):
            kx = wx1 + 24 + j * 188
            ky = wy1 + 344
            draw.rounded_rectangle([kx, ky, kx + 176, ky + 44], radius=8, fill=(14, 7, 28), outline=(50, 25, 80), width=1)
            draw.text((kx + 12, ky + 6), k_title, font=FONT_BOLD_XS, fill=(249, 145, 38) if j == 0 else ((168, 85, 247) if j == 1 else (34, 197, 94)))
            draw.text((kx + 12, ky + 22), k_desc, font=FONT_XS, fill=(160, 150, 180))

        # Mobile Phone Mockup (Right): bounds px=662, py=58, pw=260, ph=412 (ending at y=470!)
        px, py, pw, ph = 662, 58, 260, 412
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=24, fill=(12, 6, 22), outline=(139, 92, 246), width=2)
        draw.rounded_rectangle([px + pw//2 - 28, py + 8, px + pw//2 + 28, py + 18], radius=5, fill=(0, 0, 0))
        draw.text((px + 18, py + 22), "9:41", font=FONT_BOLD_XS, fill=(255, 255, 255))
        draw.text((px + pw - 38, py + 22), "100%", font=FONT_XS, fill=(160, 150, 180))

        draw.rounded_rectangle([px + 10, py + 34, px + pw - 10, py + 60], radius=8, fill=(24, 12, 44))
        draw.text((px + 18, py + 40), "3D Touch Experience", font=FONT_BOLD_XS, fill=(168, 85, 247))

        # Mobile 3D Canvas Box
        draw.rounded_rectangle([px + 12, py + 68, px + pw - 12, py + 242], radius=12, fill=(16, 8, 30), outline=(65, 32, 105), width=1)

        m_cx = px + pw // 2
        m_cy = py + 142
        m_size = 35

        m_top = [(m_cx, m_cy - m_size), (m_cx + m_size, m_cy - m_size//2), (m_cx, m_cy), (m_cx - m_size, m_cy - m_size//2)]
        m_left = [(m_cx - m_size, m_cy - m_size//2), (m_cx, m_cy), (m_cx, m_cy + m_size), (m_cx - m_size, m_cy + m_size//2)]
        m_right = [(m_cx + m_size, m_cy - m_size//2), (m_cx, m_cy), (m_cx, m_cy + m_size), (m_cx + m_size, m_cy + m_size//2)]

        draw.polygon(m_top, fill=(249, 145, 38))
        draw.polygon(m_left, fill=(139, 92, 246))
        draw.polygon(m_right, fill=(76, 29, 149))

        # Touch indicator
        touch_x = m_cx + int(32 * math.cos(angle))
        touch_y = m_cy + int(18 * math.sin(angle))
        draw.ellipse([touch_x - 9, touch_y - 9, touch_x + 9, touch_y + 9], outline=(255, 255, 255), width=2)
        draw.text((px + 45, py + 218), "Arraste para girar em 3D", font=FONT_XS, fill=(200, 190, 225))

        # Mobile specs
        draw.rounded_rectangle([px + 12, py + 252, px + pw - 12, py + 342], radius=10, fill=(20, 10, 36), outline=(50, 25, 80), width=1)
        draw.text((px + 20, py + 260), "Performance Mobile", font=FONT_BOLD_SM, fill=(255, 255, 255))
        draw.text((px + 20, py + 278), "• Consumo leve de bateria", font=FONT_XS, fill=(180, 170, 205))
        draw.text((px + 20, py + 296), "• Resolução adaptativa (DPR)", font=FONT_XS, fill=(180, 170, 205))
        draw.text((px + 20, py + 314), "• Suporte iOS e Android nativo", font=FONT_XS, fill=(34, 197, 94))

        # CTA button (ending safely at y=398)
        draw.rounded_rectangle([px + 12, py + 356, px + pw - 12, py + 396], radius=10, fill=(249, 145, 38))
        draw.text((px + 36, py + 367), "Criar Minha Landing 3D  >", font=FONT_BOLD_SM, fill=(10, 4, 18))

        # Cursor
        cur_x = wx1 + 115 + int(15 * math.cos(f * 0.3))
        cur_y = wy1 + 314 + int(5 * math.sin(f * 0.3))
        draw_cursor(draw, cur_x, cur_y, click=(f >= 8 and f <= 11))

        frames.append(img)

    out_path = 'public/features/carousel/lp-gamification-anim.gif'
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=130, loop=0, optimize=True)
    print(f"Saved {out_path} ({len(frames)} frames)")


# ==============================================================================
# 3. GENERATE AI COPILOT ANIM (CTRLB IA - RESPONSIVE & NO BORDERS/CUTS!)
# ==============================================================================
def generate_ai_copilot_anim():
    print("Generating ai-copilot-anim.gif (responsive, perfectly framed, Portuguese accents)...")
    frames = []

    for f in range(20):
        img = Image.new('RGB', (WIDTH, HEIGHT), (10, 4, 18))
        draw = ImageDraw.Draw(img)
        draw_tech_bg(draw, color_center=(28, 12, 54), color_edge=(9, 4, 18))

        # Desktop Window (Left): bounds wx1=34, wy1=58, wx2=630, wy2=465 (75px bottom margin!)
        wx1, wy1, wx2, wy2 = 34, 58, 630, 465
        draw_window_frame(draw, wx1, wy1, wx2, wy2, "https://app.ctrlb.com.br/ia-copilot", "COPILOTO IA INTEGRADO AO SGA")

        # Desktop Content
        draw.text((wx1 + 24, wy1 + 44), "INTELIGÊNCIA ARTIFICIAL REALMENTE ÚTIL", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw.text((wx1 + 24, wy1 + 58), "CTRLB — Copiloto IA no Seu Dia a Dia", font=FONT_TITLE, fill=(255, 255, 255))
        draw.text((wx1 + 24, wy1 + 86), "A IA lê seus números, antecipa ações, atende clientes no WhatsApp e redige documentos.", font=FONT_SUB, fill=(185, 175, 205))

        # AI Insight Cards Box (y=114..285)
        ix1, iy1, ix2, iy2 = wx1 + 24, wy1 + 114, wx2 - 24, wy1 + 288
        draw.rounded_rectangle([ix1, iy1, ix2, iy2], radius=10, fill=(15, 7, 28), outline=(65, 32, 105), width=1)

        # AI Header inside box
        draw.ellipse([ix1 + 16, iy1 + 14, ix1 + 24, iy1 + 22], fill=(34, 197, 94))
        draw.text((ix1 + 30, iy1 + 11), "Copiloto CTRLB Ativo  •  3 Prioridades Detectadas Hoje", font=FONT_BOLD_SM, fill=(255, 255, 255))

        insights = [
            ("Módulo Atendimento", "48 conversas respondidas pela IA no WhatsApp sem fila de espera.", (34, 197, 94)),
            ("Módulo Comercial", "12 leads com alto potencial de compra aguardando proposta.", (249, 145, 38)),
            ("Módulo Documentos", "Manual de atendimento e contrato revisados automaticamente.", (168, 85, 247))
        ]

        for idx, (ins_mod, ins_text, ins_color) in enumerate(insights):
            iy = iy1 + 38 + idx * 42
            is_hl = (idx == 0 and f >= 6 and f <= 15)
            card_fill = (26, 13, 46) if is_hl else (18, 9, 34)
            draw.rounded_rectangle([ix1 + 12, iy, ix2 - 12, iy + 36], radius=6, fill=card_fill, outline=ins_color if is_hl else (45, 22, 70), width=1)

            draw.text((ix1 + 22, iy + 5), ins_mod, font=FONT_BOLD_XS, fill=ins_color)
            draw.text((ix1 + 22, iy + 19), ins_text, font=FONT_XS, fill=(230, 225, 240))

        # CTA Button
        draw.rounded_rectangle([wx1 + 24, wy1 + 298, wx1 + 235, wy1 + 332], radius=8, fill=(249, 145, 38))
        draw.text((wx1 + 42, wy1 + 307), "Executar Ações com IA  >", font=FONT_BOLD_SM, fill=(16, 5, 28))

        # KPIs (y=342..388)
        kpis = [("24h Atendimento", "IA responde dia e noite"), ("Copiloto no Sistema", "Integrado a todas as telas"), ("Zero Apps Extras", "Tudo nativo no CTRLB")]
        for j, (k_title, k_desc) in enumerate(kpis):
            kx = wx1 + 24 + j * 188
            ky = wy1 + 344
            draw.rounded_rectangle([kx, ky, kx + 176, ky + 44], radius=8, fill=(14, 7, 28), outline=(50, 25, 80), width=1)
            draw.text((kx + 12, ky + 6), k_title, font=FONT_BOLD_XS, fill=(34, 197, 94) if j == 0 else ((249, 145, 38) if j == 1 else (168, 85, 247)))
            draw.text((kx + 12, ky + 22), k_desc, font=FONT_XS, fill=(160, 150, 180))

        # Mobile Phone Mockup (Right) - REAL WHATSAPP IA CHAT!
        px, py, pw, ph = 662, 58, 260, 412
        draw.rounded_rectangle([px, py, px + pw, py + ph], radius=24, fill=(12, 6, 22), outline=(249, 145, 38), width=2)
        draw.rounded_rectangle([px + pw//2 - 28, py + 8, px + pw//2 + 28, py + 18], radius=5, fill=(0, 0, 0))
        draw.text((px + 18, py + 22), "9:41", font=FONT_BOLD_XS, fill=(255, 255, 255))
        draw.text((px + pw - 38, py + 22), "100%", font=FONT_XS, fill=(160, 150, 180))

        # WhatsApp Chat Header
        draw.rounded_rectangle([px + 10, py + 34, px + pw - 10, py + 66], radius=8, fill=(18, 38, 28))
        draw.ellipse([px + 18, py + 42, px + 36, py + 60], fill=(34, 197, 94))
        draw.text((px + 22, py + 45), "IA", font=FONT_BOLD_XS, fill=(10, 4, 18))
        draw.text((px + 44, py + 40), "Copiloto IA CTRLB", font=FONT_BOLD_XS, fill=(255, 255, 255))
        draw.text((px + 44, py + 53), "online 24h • responde em 1s", font=FONT_XS, fill=(34, 197, 94))

        # Chat messages
        # Message 1 (Customer)
        draw.rounded_rectangle([px + 14, py + 74, px + pw - 45, py + 122], radius=10, fill=(30, 16, 50))
        draw.text((px + 22, py + 80), "Cliente", font=FONT_BOLD_XS, fill=(168, 85, 247))
        draw.text((px + 22, py + 94), "Olá! Qual o horário de aula\ne valor do plano?", font=FONT_XS, fill=(255, 255, 255))
        draw.text((px + pw - 75, py + 108), "09:40", font=FONT_XS, fill=(160, 150, 180))

        # Message 2 (IA CTRLB)
        draw.rounded_rectangle([px + 28, py + 130, px + pw - 14, py + 226], radius=10, fill=(16, 45, 26), outline=(34, 197, 94), width=1)
        draw.text((px + 36, py + 136), "IA CTRLB", font=FONT_BOLD_XS, fill=(34, 197, 94))
        draw.text((px + 36, py + 150), "Olá! Temos turmas hoje às\n17h30 e 19h. O plano mensal\nsai por R$ 89 sem fidelidade.", font=FONT_XS, fill=(255, 255, 255))
        draw.text((px + 36, py + 192), "Gostaria de agendar para hoje?", font=FONT_BOLD_XS, fill=(249, 145, 38))
        draw_vector_check(draw, px + pw - 40, py + 212, size=7, color=(34, 197, 94), width=1)
        draw_vector_check(draw, px + pw - 36, py + 212, size=7, color=(34, 197, 94), width=1)
        draw.text((px + pw - 66, py + 208), "09:41", font=FONT_XS, fill=(34, 197, 94))

        # Message 3 (Customer response)
        draw.rounded_rectangle([px + 14, py + 234, px + pw - 55, py + 270], radius=10, fill=(30, 16, 50))
        draw.text((px + 22, py + 240), "Sim! Confirma para as 19h.", font=FONT_XS, fill=(255, 255, 255))
        draw.text((px + pw - 85, py + 254), "09:41", font=FONT_XS, fill=(160, 150, 180))

        # Confirmation box
        draw.rounded_rectangle([px + 14, py + 278, px + pw - 14, py + 346], radius=10, fill=(20, 10, 38), outline=(249, 145, 38), width=1)
        draw_vector_check(draw, px + 22, py + 286, size=10, color=(34, 197, 94), width=2)
        draw.text((px + 38, py + 284), "Agendamento Registrado!", font=FONT_BOLD_SM, fill=(34, 197, 94))
        draw.text((px + 22, py + 304), "Aluno cadastrado automaticamente\nno CRM com catraca facial liberada.", font=FONT_XS, fill=(200, 190, 220))

        # Action button at bottom (ends safely at y=398!)
        draw.rounded_rectangle([px + 12, py + 356, px + pw - 12, py + 396], radius=10, fill=(34, 197, 94))
        draw_vector_check(draw, px + 24, py + 370, size=10, color=(10, 4, 18), width=2)
        draw.text((px + 44, py + 367), "Atendimento WhatsApp 24h", font=FONT_BOLD_SM, fill=(10, 4, 18))

        # Cursor
        cur_x = wx1 + 115 + int(15 * math.sin(f * 0.3))
        cur_y = wy1 + 314 + int(5 * math.cos(f * 0.3))
        draw_cursor(draw, cur_x, cur_y, click=(f >= 10 and f <= 13))

        frames.append(img)

    out_path = 'public/features/carousel/ai-copilot-anim.gif'
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=140, loop=0, optimize=True)
    print(f"Saved {out_path} ({len(frames)} frames)")


# ==============================================================================
# 4. GENERATE WEBAPP CTRLB ANIM (SISTEMAS WEB - REELS 9:16 VIDEO EDITOR!)
# ==============================================================================
def draw_video_editor_screen(sub_f, vw_w=900, vw_h=378):
    """Renders authentic CTRLB video editor workspace editing vertical 9:16 social video"""
    img = Image.new('RGB', (vw_w, vw_h), (15, 23, 42))
    draw = ImageDraw.Draw(img)

    f_title = FONT_BOLD_MD
    f_sub = FONT_SM
    f_xs = FONT_XS
    f_bold_xs = FONT_BOLD_XS

    # Top Bar of Editor (h=32)
    draw.rectangle([0, 0, vw_w, 32], fill=(24, 32, 54))
    draw.line([(0, 32), (vw_w, 32)], fill=(40, 52, 85), width=1)
    draw.text((12, 8), 'CTRLB Studio', font=f_title, fill=(255, 255, 255))
    draw.rounded_rectangle([105, 6, 215, 26], radius=4, fill=(35, 45, 75))
    draw.text((112, 8), 'Reels 9:16 (Vertical)', font=f_bold_xs, fill=(249, 145, 38))
    draw.text((230, 8), 'Campanha_Redes_Sociais.mp4', font=f_sub, fill=(180, 195, 220))

    # Buttons on top right
    draw.rounded_rectangle([vw_w - 230, 5, vw_w - 125, 27], radius=4, fill=(139, 92, 246))
    draw.text((vw_w - 220, 8), '+ Gerar Legenda IA', font=f_bold_xs, fill=(255, 255, 255))
    draw.rounded_rectangle([vw_w - 115, 5, vw_w - 15, 27], radius=4, fill=(34, 197, 94))
    draw.text((vw_w - 105, 8), 'Exportar MP4', font=f_bold_xs, fill=(15, 23, 42))

    # Left Media Panel (w=170, y=33..275)
    draw.rectangle([0, 33, 170, 275], fill=(20, 27, 46))
    draw.line([(170, 33), (170, 275)], fill=(35, 45, 75), width=1)
    draw.text((12, 40), 'Biblioteca de Mídia', font=f_bold_xs, fill=(160, 175, 205))

    medias = [('Vídeo_Treino.mp4', '00:15', (249, 145, 38)), ('Narração_IA.mp3', 'Voz Cláudia', (139, 92, 246)), ('Trilha_Lofi.mp3', 'Fundo 80%', (34, 197, 94))]
    for mi, (mname, msub, mcol) in enumerate(medias):
        my = 60 + mi * 42
        draw.rounded_rectangle([10, my, 160, my + 36], radius=4, fill=(28, 38, 65), outline=(45, 60, 95), width=1)
        draw.rectangle([14, my + 4, 42, my + 32], fill=(18, 24, 42))
        draw.ellipse([24, my + 14, 32, my + 22], fill=mcol)
        draw.text((48, my + 6), mname[:16], font=f_bold_xs, fill=(255, 255, 255))
        draw.text((48, my + 20), msub, font=f_xs, fill=(150, 165, 195))

    # Center Canvas / Stage (x=171..vw_w-180, y=33..275)
    draw.rectangle([171, 33, vw_w - 180, 275], fill=(13, 19, 35))
    # 9:16 Phone Canvas
    cx = (171 + vw_w - 180) // 2
    cw, ch = 125, 222
    cx1, cy1 = cx - cw // 2, 40
    cx2, cy2 = cx1 + cw, cy1 + ch
    draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=10, fill=(24, 12, 44), outline=(139, 92, 246), width=2)
    # Canvas content (video mock)
    draw.rounded_rectangle([cx1 + 4, cy1 + 4, cx2 - 4, cy2 - 4], radius=8, fill=(35, 15, 60))
    # Top live badge
    draw.text((cx1 + 10, cy1 + 10), 'Reels 9:16', font=f_bold_xs, fill=(249, 145, 38))
    # Video subject silhouette (person exercising / gym)
    sub_bounce = int(3 * math.sin(sub_f * 1.0))
    draw.ellipse([cx - 18, cy1 + 45 + sub_bounce, cx + 18, cy1 + 81 + sub_bounce], fill=(249, 145, 38))
    draw.polygon([(cx - 26, cy1 + 135 + sub_bounce), (cx + 26, cy1 + 135 + sub_bounce), (cx + 14, cy1 + 84 + sub_bounce), (cx - 14, cy1 + 84 + sub_bounce)], fill=(139, 92, 246))
    # Subtitle overlay box on video
    draw.rounded_rectangle([cx1 + 8, cy1 + 148, cx2 - 8, cy1 + 184], radius=4, fill=(15, 23, 42))
    draw.text((cx1 + 12, cy1 + 152), 'Treino Intensivo', font=f_bold_xs, fill=(255, 255, 255))
    draw.text((cx1 + 12, cy1 + 167), 'Comece hoje às 19h!', font=f_xs, fill=(249, 145, 38))
    # Floating heart & share
    draw_vector_heart(draw, cx2 - 14, cy1 + 97, size=4, color=(236, 72, 153))
    draw.text((cx2 - 20, cy1 + 106), '1.4k', font=f_xs, fill=(200, 200, 220))

    # Right Inspector (x=vw_w-179..vw_w, y=33..275)
    draw.rectangle([vw_w - 179, 33, vw_w, 275], fill=(20, 27, 46))
    draw.line([(vw_w - 179, 33), (vw_w - 179, 275)], fill=(35, 45, 75), width=1)
    draw.text((vw_w - 168, 40), 'Inspetor de Vídeo', font=f_bold_xs, fill=(160, 175, 205))
    inspect_items = [
        ('Proporção', 'Vertical (9:16)'),
        ('Resolução', '1080x1920 Full HD'),
        ('Taxa de Quadros', '60 FPS'),
        ('Legenda IA', 'Ativa (PT-BR)'),
        ('Áudio Master', 'Normalizado')
    ]
    for ii, (ilabel, ival) in enumerate(inspect_items):
        iy = 60 + ii * 34
        draw.text((vw_w - 168, iy), ilabel, font=f_xs, fill=(140, 155, 185))
        draw.text((vw_w - 168, iy + 13), ival, font=f_bold_xs, fill=(255, 255, 255))

    # Bottom Timeline (y=276..vw_h)
    draw.rectangle([0, 276, vw_w, vw_h], fill=(18, 24, 42))
    draw.line([(0, 276), (vw_w, 276)], fill=(45, 60, 95), width=1)
    # Time ruler
    draw.text((180, 280), '00:00        00:03        00:06        00:09        00:12        00:15', font=f_xs, fill=(130, 145, 175))
    # Track labels
    draw.text((12, 298), 'Legendas IA', font=f_bold_xs, fill=(139, 92, 246))
    draw.text((12, 324), 'Vídeo 9:16', font=f_bold_xs, fill=(249, 145, 38))
    draw.text((12, 350), 'Áudio / Trilha', font=f_bold_xs, fill=(34, 197, 94))
    # Tracks
    # Track 1: Text
    draw.rounded_rectangle([180, 296, 440, 316], radius=3, fill=(139, 92, 246))
    draw.text((190, 299), 'Legenda: "Treino Intensivo hoje às 19h"', font=f_bold_xs, fill=(255, 255, 255))
    # Track 2: Video clips
    draw.rounded_rectangle([180, 322, 380, 342], radius=3, fill=(249, 145, 38))
    draw.text((190, 325), 'Cena 1 (Abertura)', font=f_bold_xs, fill=(15, 23, 42))
    draw.rounded_rectangle([385, 322, 620, 342], radius=3, fill=(217, 119, 6))
    draw.text((395, 325), 'Cena 2 (Exercício)', font=f_bold_xs, fill=(15, 23, 42))
    draw.rounded_rectangle([625, 322, 850, 342], radius=3, fill=(180, 83, 9))
    draw.text((635, 325), 'Cena 3 (CTA Final)', font=f_bold_xs, fill=(15, 23, 42))
    # Track 3: Audio waveform
    draw.rounded_rectangle([180, 348, 850, 368], radius=3, fill=(22, 101, 52))
    for ax in range(185, 845, 5):
        h_bar = ((ax * 13 + sub_f * 7) % 14) + 2
        draw.line([(ax, 358 - h_bar // 2), (ax, 358 + h_bar // 2)], fill=(34, 197, 94), width=2)

    # Scrubbing Playhead needle moving across timeline
    playhead_x = 220 + int(sub_f * 35)
    draw.line([(playhead_x, 276), (playhead_x, vw_h)], fill=(239, 68, 68), width=2)
    draw.polygon([(playhead_x - 5, 276), (playhead_x + 5, 276), (playhead_x, 283)], fill=(239, 68, 68))

    return img

def generate_webapp_ctrlb_anim():
    print("Generating webapp-ctrlb-anim.gif (perfect 16:9, clean crops, real video editor 9:16)...")

    img_mapa_raw = Image.open('public/images/real-screens/mapa-mental-aberto.png').convert('RGB')
    img_doc_raw = Image.open('public/images/real-screens/editor-documento-aberto.png').convert('RGB')
    img_dash_raw = Image.open('public/images/real-screens/dashboard-live-dark.png').convert('RGB')

    vw_w, vw_h = 900, 378
    # Clean crops that keep every important element without cutting:
    img_mapa = img_mapa_raw.crop((140, 80, 1360, 680)).resize((vw_w, vw_h), Image.Resampling.LANCZOS)
    img_doc = img_doc_raw.crop((140, 50, 1360, 650)).resize((vw_w, vw_h), Image.Resampling.LANCZOS)
    img_dash = img_dash_raw.crop((0, 0, 1440, 604)).resize((vw_w, vw_h), Image.Resampling.LANCZOS)

    scenes = [
        {
            "tab_idx": 0,
            "tag": "PLANEJAMENTO VISUAL",
            "url": "https://app.ctrlb.com.br/mapas/ideia-central",
            "img_fn": lambda sf: img_mapa,
            "color": (249, 145, 38)
        },
        {
            "tab_idx": 1,
            "tag": "DOCUMENTOS COM IA",
            "url": "https://app.ctrlb.com.br/documentos/manual-atendimento",
            "img_fn": lambda sf: img_doc,
            "color": (168, 85, 247)
        },
        {
            "tab_idx": 2,
            "tag": "REELS & TIKTOK 9:16",
            "url": "https://app.ctrlb.com.br/editor/video?format=vertical-9-16",
            "img_fn": lambda sf: draw_video_editor_screen(sf, vw_w, vw_h),
            "color": (236, 72, 153)
        },
        {
            "tab_idx": 3,
            "tag": "CASOS DE USO & BI",
            "url": "https://app.ctrlb.com.br/dashboard",
            "img_fn": lambda sf: img_dash,
            "color": (34, 197, 94)
        }
    ]

    tab_names = ["Mapa Mental", "Documentos", "Editor de Vídeo (Reels 9:16)", "Casos de Uso"]

    frames = []

    for s_idx, scene in enumerate(scenes):
        for sub_f in range(6):
            img = Image.new('RGB', (WIDTH, HEIGHT), (10, 4, 18))
            draw = ImageDraw.Draw(img)
            draw_tech_bg(draw, color_center=(28, 12, 54), color_edge=(9, 4, 18))

            # Browser Window bounds: wx1=30, wy1=34, wx2=930, wy2=472 (68px safe bottom margin!)
            wx1, wy1, wx2, wy2 = 30, 34, 930, 472

            # Window background
            draw.rounded_rectangle([wx1, wy1, wx2, wy2], radius=12, fill=(18, 9, 34), outline=(75, 40, 115), width=1)
            # Header bar (y=34..94)
            draw.rounded_rectangle([wx1, wy1, wx2, wy1 + 60], radius=12, fill=(26, 13, 46))
            draw.rectangle([wx1, wy1 + 40, wx2, wy1 + 60], fill=(26, 13, 46))
            draw.line([(wx1, wy1 + 60), (wx2, wy1 + 60)], fill=(55, 28, 95), width=1)

            # Window control dots
            draw.ellipse([wx1 + 14, wy1 + 12, wx1 + 24, wy1 + 22], fill=(255, 95, 87))
            draw.ellipse([wx1 + 29, wy1 + 12, wx1 + 39, wy1 + 22], fill=(254, 188, 46))
            draw.ellipse([wx1 + 44, wy1 + 12, wx1 + 54, wy1 + 22], fill=(40, 200, 64))

            # URL bar
            draw.rounded_rectangle([wx1 + 65, wy1 + 7, wx1 + 420, wy1 + 27], radius=10, fill=(12, 6, 24), outline=(60, 30, 95), width=1)
            draw.rectangle([wx1 + 75, wy1 + 14, wx1 + 82, wy1 + 21], fill=(168, 85, 247))
            draw.arc([wx1 + 76, wy1 + 9, wx1 + 81, wy1 + 15], 180, 0, fill=(168, 85, 247), width=1)
            draw.text((wx1 + 88, wy1 + 10), scene["url"], font=FONT_XS, fill=(190, 180, 215))

            # Live feature badge on top right of header
            draw.rounded_rectangle([wx2 - 190, wy1 + 7, wx2 - 16, wy1 + 27], radius=10, fill=(14, 7, 28), outline=scene["color"], width=1)
            draw.ellipse([wx2 - 182, wy1 + 14, wx2 - 176, wy1 + 20], fill=(34, 197, 94))
            draw.text((wx2 - 170, wy1 + 10), scene["tag"], font=FONT_BOLD_XS, fill=scene["color"])

            # 4 Navigation Tabs in Header
            tab_start_x = wx1 + 14
            for t_i, t_name in enumerate(tab_names):
                t_active = (t_i == scene["tab_idx"])
                t_w = 210
                t_x1 = tab_start_x + t_i * (t_w + 8)
                t_x2 = t_x1 + t_w
                t_y1 = wy1 + 33
                t_y2 = wy1 + 56

                t_fill = (38, 19, 68) if t_active else (18, 9, 32)
                t_border = scene["color"] if t_active else (45, 22, 70)
                t_text_col = (255, 255, 255) if t_active else (160, 150, 180)

                draw.rounded_rectangle([t_x1, t_y1, t_x2, t_y2], radius=6, fill=t_fill, outline=t_border, width=2 if t_active else 1)
                if t_active:
                    draw.ellipse([t_x1 + 10, t_y1 + 7, t_x1 + 18, t_y1 + 15], fill=scene["color"])
                    draw.text((t_x1 + 24, t_y1 + 4), t_name, font=FONT_BOLD_XS, fill=t_text_col)
                else:
                    draw.text((t_x1 + 14, t_y1 + 4), t_name, font=FONT_XS, fill=t_text_col)

            # Viewport content: bounds (wx1 + 1, wy1 + 61) to (wx2 - 1, wy2 - 1)
            vw_x1, vw_y1 = wx1 + 1, wy1 + 61
            screen_img = scene["img_fn"](sub_f)
            img.paste(screen_img, (vw_x1, vw_y1))

            # Animated Cursor clicking on the active tab
            cur_tab_x = tab_start_x + scene["tab_idx"] * 218 + 90
            cur_x = cur_tab_x + int(8 * math.sin(sub_f * 0.8))
            cur_y = wy1 + 44 + int(3 * math.cos(sub_f * 0.8))
            draw_cursor(draw, cur_x, cur_y, click=(sub_f == 1 or sub_f == 2))

            frames.append(img)

    out_path = 'public/features/carousel/webapp-ctrlb-anim.gif'
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=350, loop=0, optimize=True)
    print(f"Saved {out_path} ({len(frames)} frames)")


if __name__ == '__main__':
    generate_lp_ecommerce_anim()
    generate_lp_gamification_anim()
    generate_ai_copilot_anim()
    generate_webapp_ctrlb_anim()
    print("ALL 4 CAROUSEL GIFS RE-GENERATED FLAWLESSLY!")
