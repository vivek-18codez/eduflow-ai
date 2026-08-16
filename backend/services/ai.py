import json
import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

# -----------------------------------------
# Gemini configuration
# -----------------------------------------

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY environment variable is not set."
    )

client = genai.Client(api_key=API_KEY)

MODEL_NAME = "gemini-3.6-flash"


# -----------------------------------------
# Analyze OCR text
# -----------------------------------------

def analyze_document(text):

    if not text or not text.strip():
        return {
            "documentType": "Other Document",
            "summary": "No text was detected in the uploaded document."
        }

    prompt = f"""
You are an AI document classification system for a school.

IMPORTANT RULES:

1. Use ONLY information contained in the OCR TEXT.
2. NEVER invent a student name, parent name, phone number,
   date, email, address, blood group, class, or any other value.
3. NEVER use information from examples.
4. If a value is not present in the OCR TEXT, return an empty string.
5. Preserve the actual information found in the OCR text.
6. Return ONLY valid JSON.

CLASSIFICATION GUIDANCE:

The OCR text comes from an image, and table/list layouts often get
read out of order — column headers and row values may appear
scattered rather than neatly grouped. Look past the scrambled
order and focus on WHAT KIND of information is present:

- If the text contains a table-style heading (e.g. "Sr No",
  "Form No", "Surname", "Name", "Father's Name", "Mother's Name",
  "M/F") followed by many repeated groups of personal names —
  this is a "Student List", even if the words appear jumbled or
  out of row order. A list of many different names is the key
  signal, not perfect formatting.
- Only classify as "School Circular" if the text reads like an
  announcement or notice (e.g. contains words like "Dear
  Parents/Students", "Notice", "circular", "holiday", "meeting",
  "informed that", a date and a signatory) — NOT just because it
  came from a table.
- "Admission Form" is for a SINGLE student's individual
  application details (one name, one parent, one class, etc.),
  not a table of many students.

OCR TEXT:
----------------
{text}
----------------

Classify the document as exactly one of:

- Admission Form
- Student List
- School Circular
- Leave Letter
- Fee Receipt
- Other Document

If the document is a "Student List": reconstruct each individual
student's row from the (possibly out-of-order) OCR text as best
you can, using the column headers as a guide, and list each
student as one entry in the "students" array. Only include a
field if that specific value actually appears in the OCR text —
leave it as an empty string otherwise. Do not merge two different
students into one entry, and do not invent extra students.

Return JSON in exactly this format:

{{
    "documentType": "",
    "name": "",
    "parent": "",
    "className": "",
    "phone": "",
    "dob": "",
    "gender": "",
    "email": "",
    "address": "",
    "bloodGroup": "",
    "summary": "",
    "students": [
        {{
            "srNo": "",
            "name": "",
            "fatherName": "",
            "motherName": "",
            "gender": ""
        }}
    ]
}}

IMPORTANT:
- "students" should only be populated when documentType is
  "Student List". Otherwise leave it as an empty array.
- Do not create information that is not present in the OCR text.
- For document types other than Student List, put a short
  human-readable summary in the "summary" field.
"""

    try:

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt
        )

        response_text = response.text.strip()

        # Remove markdown code fences if Gemini adds them
        response_text = (
            response_text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        result = json.loads(response_text)

        # Make sure all expected fields exist
        result.setdefault("documentType", "Other Document")
        result.setdefault("name", "")
        result.setdefault("parent", "")
        result.setdefault("className", "")
        result.setdefault("phone", "")
        result.setdefault("dob", "")
        result.setdefault("gender", "")
        result.setdefault("email", "")
        result.setdefault("address", "")
        result.setdefault("bloodGroup", "")
        result.setdefault("summary", "")
        result.setdefault("students", [])

        return result

    except Exception as error:

        print("Gemini analysis error:", error)

        # IMPORTANT:
        # If Gemini fails, DON'T invent information.
        # Return the OCR text safely instead.

        return {
            "documentType": "Other Document",
            "name": "",
            "parent": "",
            "className": "",
            "phone": "",
            "dob": "",
            "gender": "",
            "email": "",
            "address": "",
            "bloodGroup": "",
            "summary": "AI analysis unavailable. Showing OCR text only.",
            "students": []
        }