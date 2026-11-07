# NARR4R — Made 4 Narration

**Tus libros y documentos, en voz humana. Sin deletrear.**

NARR4R convierte PDF, libros y documentos en audio con voz natural. No lee código, no deletrea caracteres. Limpia el texto como lo leería un humano y luego lo narra en la voz y el idioma que elijas.

- **Modo Codespaces (voz buena):** Docling + Edge-TTS → MP3 neural real
- **Modo Pages (solo página):** Limpieza + voz del navegador, texto ya limpio

## Cómo probar en Codespaces (recomendado)

1. En GitHub, botón verde **Code** → pestaña **Codespaces** → **Create codespace on main**
2. Espera que cargue. Abre 2 terminales:

**Terminal 1 - backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - frontend:**
```bash
npx serve public -l 5173
```

3. Abre el puerto **5173** en el navegador. Debe decir arriba: **Modo Codespaces: Docling + Edge-TTS**

## Cómo probar

Sube 3 tipos de PDF:
1. Libro / artículo limpio
2. PDF feo con tablas, encabezados, pies de página, URLs
3. PDF escaneado (solo imagen)

Revisa siempre el **texto limpio** que aparece abajo antes de darle Play. Si se ve como español normal, va a sonar bien. Si se ve como código, el problema es el PDF, no la voz.

## Cómo publicar en Cloudflare Pages

- En Cloudflare: Workers & Pages → Create → Pages → Conecta el repo `narr4r`
- Build output: `public`
- Build command: (vacío)

Sin backend, Pages usa voz del navegador pero con texto ya limpio. Para voz neural en producción, deja el backend corriendo o usa un Worker después.

## Por qué no deletrea

`backend/clean_text.py` y `public/app.js` comparten la misma limpieza:
- Borra líneas con >25% símbolos `{ } [ ] ; = _ \ | #`
- Borra URLs, emails, rutas, `Página X de Y`, líneas sin vocales
- Une palabras cortadas con guión `pala- bra` → `palabra`
- Nunca manda una sola letra: corta solo en oraciones completas, mínimo 4 palabras y 25 caracteres, máximo 220 caracteres, respetando `Dr.`, `Sr.`, `etc.`
- En Codespaces usa Edge-TTS, voz neural entrenada para leer oraciones, no para deletrear.

## Voces

- `es-MX` - Español México
- `es-ES` - Español España
- `es-AR` - Español Argentina
- `es-US` - Español EE.UU.

## Estructura

```
public/       → lo que va a Cloudflare Pages
backend/      → Docling + Edge-TTS, corre en Codespaces
.devcontainer/→ Codespaces con Python + Node
```

NARR4R — Made 4 Narration
