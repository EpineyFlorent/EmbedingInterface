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
    try {
        const response = await fetch('/update_config', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
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
        const response = await fetch('/index_documents', {
            method: 'POST'
        });
        const data = await response.json();
        showStatus(data.message, data.status);
    } catch (error) {
        showStatus('Erreur lors de l\'indexation', 'error');
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