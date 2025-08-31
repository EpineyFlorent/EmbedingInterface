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

function showFileDialog(items, currentPath, isFolder) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'file-dialog';

        const header = document.createElement('div');
        header.className = 'dialog-header';
        header.textContent = `Chemin actuel: ${currentPath}`;

        const content = document.createElement('div');
        content.className = 'dialog-content';

        if (currentPath !== '/') {
            const upItem = document.createElement('div');
            upItem.className = 'file-item';
            upItem.textContent = '..';
            upItem.onclick = async () => {
                dialog.remove();
                const parentPath = currentPath.split('\\').slice(0, -1).join('\\') || '/';
                if (isFolder) {
                    await browseFolder('data_dir', parentPath);
                } else {
                    await browseFile('embeddings_file', parentPath);
                }
            };
            content.appendChild(upItem);
        }

        items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'file-item';
            itemDiv.textContent = item.name;
            itemDiv.onclick = () => {
                dialog.remove();
                if (item.type === 'dir' && !isFolder) {
                    browseFile('embeddings_file', item.path);
                } else {
                    resolve(item.path);
                }
            };
            content.appendChild(itemDiv);
        });

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Annuler';
        closeBtn.onclick = () => {
            dialog.remove();
            resolve(null);
        };

        dialog.appendChild(header);
        dialog.appendChild(content);
        dialog.appendChild(closeBtn);
        document.body.appendChild(dialog);
    });
}

async function browseFolder(inputId, startPath = null) {
    try {
        const response = await fetch('/browse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'folder',
                current_path: startPath || document.getElementById(inputId).value
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            const path = await showFileDialog(data.items, data.current_path, true);
            if (path) {
                document.getElementById(inputId).value = path;
            }
        } else {
            showStatus(data.message, 'error');
        }
    } catch (error) {
        showStatus('Erreur lors de la navigation', 'error');
    }
}

async function browseFile(inputId, startPath = null) {
    try {
        const response = await fetch('/browse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'file',
                current_path: startPath || document.getElementById(inputId).value,
                extension: '.json'
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            const path = await showFileDialog(data.items, data.current_path, false);
            if (path) {
                document.getElementById(inputId).value = path;
            }
        } else {
            showStatus(data.message, 'error');
        }
    } catch (error) {
        showStatus('Erreur lors de la navigation', 'error');
    }
}