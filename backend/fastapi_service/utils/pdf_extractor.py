import fitz


def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pages = []
    for page in doc:
        text = page.get_text()
        if not text.strip():
            continue
        pages.append(' '.join(text.split()))
    doc.close()
    return '\n\n'.join(pages)
