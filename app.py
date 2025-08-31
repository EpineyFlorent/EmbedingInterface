from flask import Flask, render_template, request, jsonify, session
import os
import json
import numpy as np
import requests
from scipy.spatial.distance import cosine
from sentence_transformers import SentenceTransformer
from PyPDF2 import PdfReader
from docx import Document
from flask import url_for
import torch

app = Flask(__name__)
app.secret_key = 'votre_clé_secrète_ici'  # Nécessaire pour utiliser session

# Valeurs par défaut
DEFAULT_CONFIG = {
    'data_dir': r"C:\Users\Florent\Documents\Documents\HES-SO\IA\EmbedingInterface\documents",
    'embeddings_file': "embeddings.json",
    'model': "llama3.2",
    'embedding_model': "all-MiniLM-L6-v2"
}

device = "cuda" if torch.cuda.is_available() else "cpu"
OLLAMA_URL = "http://localhost:11434/api/generate"

def get_config():
    return {
        'data_dir': session.get('data_dir', DEFAULT_CONFIG['data_dir']),
        'embeddings_file': session.get('embeddings_file', DEFAULT_CONFIG['embeddings_file']),
        'model': session.get('model', DEFAULT_CONFIG['model']),
        'embedding_model' : DEFAULT_CONFIG['embedding_model']
    }

@app.route('/')
def home():
    config = get_config()
    return render_template('index.html', config=config)

@app.route('/update_config', methods=['POST'])
def update_config():
    session['data_dir'] = request.form.get('data_dir', DEFAULT_CONFIG['data_dir'])
    session['embeddings_file'] = request.form.get('embeddings_file', DEFAULT_CONFIG['embeddings_file'])
    session['model'] = request.form.get('model', DEFAULT_CONFIG['model'])
    return jsonify({"status": "success"})

@app.route('/index_documents', methods=['POST'])
def handle_indexing():
    config = get_config()
    try:
        embedding_model = SentenceTransformer(config['embedding_model']).to(device)
        index_documents(embedding_model, config['data_dir'], config['embeddings_file'])
        return jsonify({"status": "success", "message": "Documents indexés avec succès"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/query', methods=['POST'])
def handle_query():
    query = request.form.get('query')
    if not query:
        return jsonify({"status": "error", "message": "Query manquante"})

    config = get_config()
    try:
        embedding_model = SentenceTransformer(config['embedding_model']).to(device)
        answer = ask_llm(query, embedding_model, config)
        return jsonify({"status": "success", "response": answer})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# Modification des fonctions existantes pour utiliser la config
def index_documents(model, data_dir, embeddings_file):
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

def search_documents(query, model, config, top_k=3):
    with open(config['embeddings_file'], "r") as f:
        embeddings = json.load(f)

    query_embedding = model.encode(query, convert_to_numpy=True)
    results = []
    for file, data in embeddings.items():
        similarity = 1 - cosine(query_embedding, np.array(data["embedding"]))
        results.append((file, similarity, data["text"]))

    results.sort(key=lambda x: x[1], reverse=True)
    top_results = results[:top_k]
    return "\n\n".join([f"### {file}:\n{text[:1000]}" for file, _, text in top_results])

def extract_text_from_file(file_path):
    if file_path.lower().endswith('.txt'):
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    elif file_path.lower().endswith('.pdf'):
        text = ""
        with open(file_path, 'rb') as f:
            pdf = PdfReader(f)
            for page in pdf.pages:
                text += page.extract_text() + "\n"
        return text
    elif file_path.lower().endswith('.docx'):
        doc = Document(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    else:
        return None

def ask_llm(query, model, config):
    context = search_documents(query, model, config)
    prompt = f"""
    You are an AI assistant answering questions based on provided documents.

    Context:
    {context}

    User Query:
    {query}

    Provide a well-explained answer using the context.
    """

    data = {
        "model": config['model'],
        "prompt": prompt,
        "stream": False
    }

    response = requests.post(OLLAMA_URL, json=data)
    response_json = response.json()
    return response_json.get("response", "Error: No response from Ollama")

if __name__ == '__main__':
    app.run(debug=True)