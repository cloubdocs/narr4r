import re

ABBREV = ["Dr.", "Dra.", "Sr.", "Sra.", "Srta.", "Ing.", "Lic.", "etc.", "p. ej.", "No.", "Art.", "Cap."]

def is_code_like(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if len(s) < 2:
        return True
    # URLs, emails, rutas
    if "http" in s.lower() or "www." in s.lower() or "@" in s and ".com" in s.lower():
        return True
    if s.startswith("/") or s.startswith("C:\\") or "\\" in s and "/" in s:
        return True
    # Página X de Y, solo números, guiones
    if re.match(r"^(p[aá]gina\s+\d+\s+de\s+\d+|p[aá]g\.\s*\d+|\d+\s*/\s*\d+)$", s, re.I):
        return True
    if re.match(r"^[\d\s\-\_\.\,\;\:\_\=\*]+$", s):
        return True
    if re.match(r"^[\_\-\=\*\.]{3,}$", s):
        return True
    # Demasiados símbolos
    symbols = sum(1 for c in s if c in "{}[]();=_\\|#<>$%^&*~`")
    if len(s) > 0 and symbols / len(s) > 0.25:
        return True
    # Muchas letras pero casi sin vocales = basura de fuente / código
    letters = [c for c in s if c.isalpha()]
    if len(letters) >= 8:
        vowels = sum(1 for c in letters if c.lower() in "aeiouáéíóúü")
        if vowels / len(letters) < 0.18:
            return True
    # Letras separadas tipo "H O L A"
    if re.match(r"^(?:[A-Za-z]\s){3,}[A-Za-z]$", s):
        return True
    return False

def clean_text(raw: str) -> str:
    if not raw:
        return ""
    # Unir palabras cortadas con guión al final de línea
    raw = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", raw)
    lines = raw.splitlines()
    # Quitar headers/footers repetidos: líneas que aparecen >3 veces
    from collections import Counter
    counts = Counter([l.strip().lower() for l in lines if len(l.strip())>10])
    kept = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if counts[s.lower()] > 3 and len(s) < 120:
            continue
        if is_code_like(s):
            continue
        # Quitar URLs sueltas dentro de línea
        s = re.sub(r"https?://\S+|www\.\S+", "", s)
        s = re.sub(r"\S+@\S+\.\w+", "", s)
        s = s.strip()
        if len(s) < 3:
            continue
        kept.append(s)
    text = " ".join(kept)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def split_sentences(text: str):
    if not text:
        return []
    # Proteger abreviaturas
    protected = text
    for i, ab in enumerate(ABBREV):
        protected = protected.replace(ab, f"__AB{i}__")
    # Cortar en . ! ? seguido de espacio + mayúscula
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÜ¿¡\"])", protected)
    sentences = []
    for p in parts:
        for i, ab in enumerate(ABBREV):
            p = p.replace(f"__AB{i}__", ab)
        p = p.strip()
        if len(p) < 25:
            continue
        if len(p.split()) < 4:
            continue
        # Si es muy larga, cortar por coma
        while len(p) > 220:
            cut = p.rfind(",", 0, 220)
            if cut == -1:
                cut = p.rfind(" ", 0, 220)
            if cut == -1:
                break
            chunk = p[:cut].strip()
            if len(chunk.split()) >= 4:
                sentences.append(chunk)
            p = p[cut+1:].strip()
        if p and len(p.split()) >= 4:
            sentences.append(p)
    return sentences
