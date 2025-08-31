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

# Configuration et initialisation du modèle
device = "cuda" if torch.cuda.is_available() else "cpu"
model = SentenceTransformer("all-MiniLM-L6-v2").to(device)
DATA_DIR = r"C:\Users\Florent\Documents\Documents\HES-SO\IA\Embeding\Embeding\DOCUMENT"
EMBEDDINGS_FILE = "embeddingsFLEP.json"
OLLAMA_URL = "http://localhost:11434/api/generate"

# Réutilisation de vos fonctions existantes
def extract_text_from_file(file_path):
    # [Votre code existant]
    pass

def index_documents():
    # [Votre code existant]
    pass

def search_documents(query, top_k=3):
    # [Votre code existant]
    pass

def ask_llm(query):
    # [Votre code existant]
    pass

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