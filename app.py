import os
import json
import numpy as np
import requests
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader
from docx import Document
import torch
import sys

# Use GPU if available
device = "cuda" if torch.cuda.is_available() else "cpu"
# print(f"Using device: {device}")

# Load transformer model for embeddings
model = SentenceTransformer("all-MiniLM-L6-v2").to(device)

OLLAMA_URL = "http://localhost:11434/api/generate"  # Adjust if needed

def extract_text_from_file(file_path):
    """Extract text from TXT, PDF, or DOCX files."""
    # Skip temporary files (e.g., those starting with '~$')
    if os.path.basename(file_path).startswith("~$"):
#         print(f"Skipping temporary file: {file_path}")
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


def index_documents(data_dir, embeddings_file):
    embeddings = {}
    for root, _, files in os.walk(data_dir):
        for file in files:
            file_path = os.path.join(root, file)
            text = extract_text_from_file(file_path)
            if text:
                embedding = model.encode(text, convert_to_numpy=True).tolist()
                embeddings[file_path] = {"text": text, "embedding": embedding}

    with open(embeddings_file, "w") as f:
        json.dump(embeddings, f)

#     print(f"Indexed {len(embeddings)} documents.")


def search_documents(query, embeddings_file, top_k=3):
    """Retrieve top-k relevant documents based on cosine similarity."""
    try:
        if not os.path.exists(embeddings_file):
            raise FileNotFoundError(f"Embeddings file not found: {embeddings_file}")

        with open(embeddings_file, "r") as f:
            embeddings = json.load(f)

        query_embedding = model.encode(query, convert_to_numpy=True)

        # Compute cosine similarity and sort results
        results = []
        for file, data in embeddings.items():
            similarity = 1 - cosine(query_embedding, np.array(data["embedding"]))
            results.append((file, similarity, data["text"]))

        results.sort(key=lambda x: x[1], reverse=True)

        top_results = results[:top_k]
        retrieved_text = "\n\n".join([f"### {file}:\n{text[:1000]}" for file, _, text in top_results])
        return retrieved_text

    except Exception as e:
        raise Exception(f"Error in search_documents: {str(e)}")

def ask_llm(query, embeddings_file, model):
    """Query the Ollama container via HTTP API with retrieved document context."""
    try:
        context = search_documents(query, embeddings_file)
        prompt = f"""
        You are an AI assistant answering questions based on provided documents.

        Context:
        {context}

        User Query:
        {query}

        Provide a well-explained answer using the context.
        """

        data = {
            "model": model,
            "prompt": prompt,
            "stream": False  # Change to True if you want streaming responses
        }

        response = requests.post(OLLAMA_URL, json=data)
        response_json = response.json()
        return response_json.get("response", "Error: No response from Ollama")

    except Exception as e:
        raise Exception(f"Error in ask_llm: {str(e)}")

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Arguments manquants"}))
        return

    try:
        args = json.loads(sys.argv[1])
        command = args.get('command')
        data_dir = args.get('directory')
        embeddings_file = args.get('embeddings_file', 'embeddings.json')
        model = args.get('model')

        if not embeddings_file:
            print(json.dumps({"status": "error", "message": "Embeddings file missing"}))
            return

        if command == 'index':

            if not data_dir:
                print(json.dumps({"status": "error", "message": "Directory path missing"}))
                return

            index_documents(data_dir, embeddings_file)
            print(json.dumps({"status": "success", "message": "Documents indexés avec succès"}))

        elif command == 'query':
            query = args.get('query')
            if not query:
                print(json.dumps({"status": "error", "message": "Query manquante"}))
                return

            if not model:
                 print(json.dumps({"status": "error", "message": "Model manquant"}))
                 return

            answer = ask_llm(query, embeddings_file, model)
            print(json.dumps({"status": "success", "response": answer}))

        else:
            print(json.dumps({"status": "error", "message": "Commande invalide"}))

    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

if __name__ == '__main__':
    main()