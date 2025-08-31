function showSpinner() {
    document.getElementById('spinner').style.display = 'block';
    document.getElementById('overlay').style.display = 'block';
}

function hideSpinner() {
    document.getElementById('spinner').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

function showStatus(message, type) {
    const statusDiv = document.createElement('div');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;

    // Supprime les anciens messages de statut
    const oldStatus = document.querySelectorAll('.status');
    oldStatus.forEach(el => el.remove());

    // Ajoute le nouveau message avant le formulaire de requête
    document.querySelector('.query-section').insertBefore(statusDiv, document.querySelector('#queryForm'));

    // Affiche le message
    statusDiv.style.display = 'block';

    // Cache le message après 3 secondes
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        statusDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => statusDiv.remove(), 500);
    }, 3000);
}

document.getElementById('configForm').onsubmit = async (e) => {
    e.preventDefault();
    showSpinner();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        const response = await fetch('http://localhost:5000/update_config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        showStatus('Configuration mise à jour', 'success');
    } catch (error) {
        showStatus('Erreur lors de la mise à jour de la configuration', 'error');
    } finally {
        hideSpinner();
    }
};

document.getElementById('indexButton').onclick = async () => {
    showSpinner();
    try {
        const config = {
            data_dir: document.getElementById('data_dir').value,
            embeddings_file: document.getElementById('embeddings_file').value,
            model: document.getElementById('model').value
        };

        // Vérification des champs requis
        if (!config.data_dir || !config.embeddings_file || !config.model) {
            throw new Error('Tous les champs sont requis');
        }

        const response = await fetch('http://localhost:5000/index_documents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        if (result.status === 'error') {
            throw new Error(result.message);
        }

        showStatus(result.message, 'success');
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Erreur:', error);
    } finally {
        hideSpinner();
    }
};

document.getElementById('queryForm').onsubmit = async (e) => {
    e.preventDefault();
    showSpinner();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/query', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.status === 'success') {
            document.getElementById('response').textContent = data.response;
        } else {
            showStatus(data.message, 'error');
        }
    } catch (error) {
        showStatus('Erreur lors de la requête', 'error');
    } finally {
        hideSpinner();
    }
};

const { ipcRenderer } = require('electron')

async function browseFolder(inputId) {
    try {
        const path = await ipcRenderer.invoke('select-directory')
        if (path) {
            document.getElementById(inputId).value = path
        }
    } catch (err) {
        console.error('Erreur lors de la sélection du dossier:', err)
    }
}

async function browseFile(inputId) {
    try {
        const path = await ipcRenderer.invoke('select-file')
        if (path) {
            document.getElementById(inputId).value = path
        }
    } catch (err) {
        console.error('Erreur lors de la sélection du fichier:', err)
    }
}