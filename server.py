from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/index_documents', methods=['POST'])
def index_documents():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "Données manquantes"
            }), 400

        required_fields = ['data_dir', 'embeddings_file', 'model']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Champ requis manquant: {field}"
                }), 400

        # Vérification du répertoire
        if not os.path.isdir(data['data_dir']):
            return jsonify({
                "status": "error",
                "message": "Répertoire invalide"
            }), 400

        return jsonify({
            "status": "success",
            "message": "Documents indexés avec succès"
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400

if __name__ == '__main__':
    app.run(port=5000)