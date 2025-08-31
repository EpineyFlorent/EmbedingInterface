from flask import Flask, render_template, request, jsonify
import os
import json
import numpy as np
import requests
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader
from docx import Document
import torch

app = Flask(__name__)

# Use GPU if available
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# Load transformer model for embeddings
model = SentenceTransformer("all-MiniLM-L6-v2").to(device)

# Directory where your files are stored
DATA_DIR = r"C:\Users\Florent\Documents\Documents\HES-SO\IA\EmbedingInterface\documents"
EMBEDDINGS_FILE = "embeddings.json"

OLLAMA_URL = "http://localhost:11434/api/generate"  # Adjust if needed

def extract_text_from_file(file_path):
    """Extract text from TXT, PDF, or DOCX files."""
    # Skip temporary files (e.g., those starting with '~$')
    if os.path.basename(file_path).startswith("~$"):
        print(f"Skipping temporary file: {file_path}")
        return None

    ext = file_path.lower().split('.')[-1]

    if ext == "txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    elif ext == "pdf":
        reader = PdfReader(file_path)
        return "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])

    elif ext == "docx":
        try:
            doc = Document(file_path)
            return "\n".join([para.text for para in doc.paragraphs])
        except Exception as e:
            print(f"Error processing DOCX file {file_path}: {e}")
            return None

    return None


def index_documents():
    """Generate embeddings for all documents in the folder and subfolders and save them."""
    embeddings = {}

    for root, _, files in os.walk(DATA_DIR):  # Walk through all directories
        for file in files:
            file_path = os.path.join(root, file)
            print(f"Processing file: {file_path}")  # Debugging print statement

            text = extract_text_from_file(file_path)
            if text:
                print(f"Extracted {len(text)} characters from {file_path}")  # Debugging print statement
                embedding = model.encode(text, convert_to_numpy=True).tolist()
                embeddings[file_path] = {"text": text, "embedding": embedding}
            else:
                print(f"No text extracted from {file_path}")

    with open(EMBEDDINGS_FILE, "w") as f:
        json.dump(embeddings, f)

    print(f"Indexed {len(embeddings)} documents.")


def search_documents(query, top_k=3):
    """Retrieve top-k relevant documents based on cosine similarity."""
    with open(EMBEDDINGS_FILE, "r") as f:
        embeddings = json.load(f)

    query_embedding = model.encode(query, convert_to_numpy=True)

    # Compute cosine similarity and sort results
    results = []
    for file, data in embeddings.items():
        similarity = 1 - cosine(query_embedding, np.array(data["embedding"]))
        results.append((file, similarity, data["text"]))

    results.sort(key=lambda x: x[1], reverse=True)
    
    top_results = results[:top_k]
    retrieved_text = "\n\n".join([f"### {file}:\n{text[:1000]}" for file, _, text in top_results])  # Limit text size

    return retrieved_text

def ask_llm(query):
    """Query the Ollama container via HTTP API with retrieved document context."""
    context = search_documents(query)
    prompt = f"""
    You are an AI assistant answering questions based on provided documents.
    
    Context:
    {context}
    
    User Query:
    {query}
    
    Provide a well-explained answer using the context.
    """

    data = {
        "model": "llama3.2",  # Make sure this model is available in the container
        "prompt": prompt,
        "stream": False  # Change to True if you want streaming responses
    }

    try:
        response = requests.post(OLLAMA_URL, json=data)
        response_json = response.json()
        return response_json.get("response", "Error: No response from Ollama")

    except requests.exceptions.RequestException as e:
        return f"Error communicating with Ollama: {e}"

# if __name__ == "__main__":
#     print("Indexing documents...")
#     index_documents()

#     while True:
#         query = input("\nEnter your search query (or type 'exit' to quit): ")
#         if query.lower() == "exit":
#             break
#         answer = ask_llm(query)
#         print("\nLLM Response:\n", answer)


# Routes Flask
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/index_documents', methods=['POST'])
def handle_indexing():
    try:
        index_documents()
        return jsonify({"status": "success", "message": "Documents indexés avec succès"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/query', methods=['POST'])
def handle_query():
    query = request.form.get('query')
    if not query:
        return jsonify({"status": "error", "message": "Query manquante"})
    
    try:
        answer = ask_llm(query)
        return jsonify({"status": "success", "response": answer})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

if __name__ == '__main__':
    app.run(debug=True)