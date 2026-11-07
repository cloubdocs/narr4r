from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import tempfile, os, uuid
from clean_text import clean_text, split_sentences

app = FastAPI(title="NARR4R")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"ok": True, "mode": "codespaces", "engine": "Docling + Edge-TTS"}

def extract_with_docling(path: str) -> str:
    try:
        from docling.document_converter import DocumentConverter
        conv = DocumentConverter()
        res = conv.convert(path)
        return res.document.export_to_markdown()
    except Exception as e:
        print("Docling falló, usando PyMuPDF:", e)
        try:
            import fitz
            doc = fitz.open(path)
            return "\n".join([p.get_text() for p in doc])
        except Exception as e2:
            return f"Error extrayendo PDF: {e2}"

@app.post("/api/extract")
async def extract(file: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name
    try:
        raw = extract_with_docling(tmp_path)
        cleaned = clean_text(raw)
        sentences = split_sentences(cleaned)
        return {"cleaned": cleaned, "sentences": sentences, "count": len(sentences)}
    finally:
        try: os.unlink(tmp_path)
        except: pass

@app.post("/api/narrate")
async def narrate(text: str = Form(...), voice: str = Form("es-MX-AlvaroNeural")):
    # voice es como es-MX-AlvaroNeural, es-ES-AlvaroNeural, etc.
    import edge_tts
    out = f"/tmp/narr4r_{uuid.uuid4().hex}.mp3"
    # edge-tts necesita texto limpio, ya viene limpio del frontend/backend
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out)
    return FileResponse(out, media_type="audio/mpeg", filename="narr4r.mp3")

@app.get("/")
def root():
    return {"app": "NARR4R", "message": "Backend listo. Usa el frontend en puerto 5173"}
