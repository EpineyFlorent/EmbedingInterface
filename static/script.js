const { ipcRenderer } = window.require('electron')

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
    document.querySelector('.query-section').insertBefore(statusDiv, document.querySelector('#queryForm'));
    statusDiv.style.display = 'block';
    setTimeout(() => {
        statusDiv.style.opacity = '0';
        statusDiv.style.transition = 'opacity 0.5s';
        setTimeout(() => statusDiv.remove(), 500);
    }, 3000);
}

document.getElementById('indexButton').onclick = async () => {
    showSpinner();
    try {
        const config = {
            command: 'index',
            data_dir: document.getElementById('data_dir').value,
            embeddings_file: document.getElementById('embeddings_file').value,
            model: document.getElementById('model').value
        };

        console.log('Envoi de la configuration:', config);
        const result = await ipcRenderer.invoke('index-documents', config);
        console.log('Résultat brut reçu:', typeof result, result);

        // Si result est déjà un objet, pas besoin de parser
        const data = typeof result === 'string' ? JSON.parse(result) : result;

        if (data.status === 'success') {
            showStatus(data.message, 'success');
        } else {
            throw new Error(data.message || 'Erreur inconnue');
        }
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Erreur complète:', error);
    } finally {
        hideSpinner();
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const savedConfig = await ipcRenderer.invoke('load-config')
        document.getElementById('data_dir').value = savedConfig.data_dir
        document.getElementById('embeddings_file').value = savedConfig.embeddings_file
        document.getElementById('model').value = savedConfig.model
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error)
    }
})

document.getElementById('configForm').onsubmit = async (e) => {
    e.preventDefault()
    try {
        const config = {
            data_dir: document.getElementById('data_dir').value,
            embeddings_file: document.getElementById('embeddings_file').value,
            model: document.getElementById('model').value
        }
        await ipcRenderer.invoke('save-config', config)
        showStatus('Configuration sauvegardée', 'success')
    } catch (error) {
        showStatus('Erreur lors de la sauvegarde', 'error')
        console.error(error)
    }
}

document.getElementById('queryForm').onsubmit = async (e) => {
    e.preventDefault();
    showSpinner();
    try {
        const query = new FormData(e.target).get('query');
        console.log('Envoi de la requête:', query);

        const result = await ipcRenderer.invoke('query', query);
        console.log('Type du résultat:', typeof result);
        console.log('Résultat brut reçu:', result);

        // Validation du résultat
        if (!result) {
            throw new Error('Aucune réponse du serveur');
        }

        // Si le résultat est vide mais existe
        if (result === '' || (typeof result === 'object' && Object.keys(result).length === 0)) {
            throw new Error('La réponse est vide');
        }

        // Gestion plus robuste du parsing JSON
        const data = typeof result === 'string' ? JSON.parse(result) : result;

        if (data && data.status === 'success') {
            document.getElementById('response').textContent = data.response;
            showStatus('Requête traitée avec succès', 'success');
        } else {
            throw new Error(data?.message || 'Réponse invalide du serveur');
        }
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Erreur complète:', error);
        document.getElementById('response').textContent = '';
    } finally {
        hideSpinner();
    }
};

async function browseFolder(inputId) {
    try {
        const path = await ipcRenderer.invoke('select-directory');
        if (path) {
            document.getElementById(inputId).value = path;
        }
    } catch (err) {
        console.error('Erreur lors de la sélection du dossier:', err);
    }
}

async function browseFile(inputId) {
    try {
        const path = await ipcRenderer.invoke('select-file');
        if (path) {
            document.getElementById(inputId).value = path;
        }
    } catch (err) {
        console.error('Erreur lors de la sélection du fichier:', err);
    }
}