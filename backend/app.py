from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

from services.ocr import extract_text
from services.ai import analyze_document

app = FastAPI()

# Allow the React frontend to access the backend.
# Wide open here since this is a school demo project with no
# sensitive data — for anything handling real user data, this
# should be locked down to your actual deployed frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # OCR
    extracted_text = extract_text(file_path)

    # AI Analysis
    result = analyze_document(extracted_text)

    result["ocrText"] = extracted_text
    return result


@app.get("/")
def home():
    return {"message": "EduFlow AI Backend Running Successfully"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)