
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuración de Firebase ---
    const firebaseConfig = {
        apiKey: "AIzaSyC36P8JptpDexx_nx7YeS3TGuIn9QJBaLI",
        authDomain: "habivera-app.firebaseapp.com",
        projectId: "habivera-app",
        storageBucket: "habivera-app.appspot.com",
        messagingSenderId: "656210941795",
        appId: "1:656210941795:web:b3caf76e01201a6a2a2556"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    // --- 2. Selección de Elementos del DOM ---
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOverlay = document.getElementById('comunicado-modal');
    const cancelButton = document.querySelector('.cancel-button');
    const comunicadoForm = document.getElementById('comunicado-form');
    const comunicadosList = document.getElementById('comunicados-list');
    
    // --- 3. Funciones del Modal ---
    const openModal = () => modalOverlay.classList.add('is-visible');
    const closeModal = () => modalOverlay.classList.remove('is-visible');

    // --- 4. Funciones de Firestore ---
    
    // Guardar comunicado con los nuevos campos
    const saveComunicado = (title, message, category, imageUrl, fileUrl) => {
        db.collection('comunicados').add({
            title,
            message,
            category,
            imageUrl: imageUrl || null, // Guarda null si el campo está vacío
            fileUrl: fileUrl || null,   // Guarda null si el campo está vacío
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Comunicado guardado!");
            comunicadoForm.reset();
            closeModal();
        }).catch(error => console.error("Error al guardar comunicado: ", error));
    };

    // Renderizar comunicado, incluyendo imagen y botón de descarga si existen
    const renderComunicado = (doc) => {
        const data = doc.data();
        const categoryMap = { 'urgent': { text: 'Urgente', className: 'tag-urgent' }, 'maintenance': { text: 'Mantenimiento', className: 'tag-maintenance' }, 'event': { text: 'Evento', className: 'tag-event' }, 'info': { text: 'Informativo', className: 'tag-info' } };
        const categoryInfo = categoryMap[data.category] || categoryMap['info'];
        const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
        
        // Crear dinámicamente el HTML para la imagen y el botón de descarga
        const imageHTML = data.imageUrl ? `<img src="${data.imageUrl}" alt="Imagen del comunicado" class="comunicado-image">` : '';
        const fileHTML = data.fileUrl ? `<a href="${data.fileUrl}" target="_blank" rel="noopener noreferrer" class="download-button"><i class="ph ph-download-simple"></i>Descargar Archivo</a>` : '<span></span>'; // Placeholder para mantener el layout

        const card = document.createElement('article');
        card.className = 'comunicado-card';
        card.setAttribute('data-id', doc.id);
        
        card.innerHTML = `
            ${imageHTML}
            <div class="comunicado-header">
                <h2>${data.title}</h2>
                <span class="comunicado-tag ${categoryInfo.className}">${categoryInfo.text}</span>
            </div>
            <p class="comunicado-excerpt">${data.message}</p>
            <div class="comunicado-footer">
                <span>Publicado el ${date}</span>
                ${fileHTML}
            </div>
        `;
        comunicadosList.appendChild(card);
    };

    // --- 5. Asignación de Eventos ---
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

    if (comunicadoForm) {
        comunicadoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const title = document.getElementById('comunicado-titulo').value;
            const message = document.getElementById('comunicado-mensaje').value;
            const category = document.getElementById('comunicado-categoria').value;
            const imageUrl = document.getElementById('comunicado-imagen').value;
            const fileUrl = document.getElementById('comunicado-archivo').value;
            
            if (title.trim() === '' || message.trim() === '') {
                alert('Por favor, completa los campos de Título y Mensaje.');
                return;
            }
            saveComunicado(title, message, category, imageUrl, fileUrl);
        });
    }

    // --- 6. Carga de datos en tiempo real ---
    db.collection('comunicados').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        comunicadosList.innerHTML = '';
        if (snapshot.empty) {
            comunicadosList.innerHTML = '<p id="loading-message">No hay comunicados para mostrar. ¡Crea el primero!</p>';
        } else {
            snapshot.docs.forEach(doc => renderComunicado(doc));
        }
    }, error => {
        console.error("Error al obtener comunicados: ", error);
        comunicadosList.innerHTML = '<p id="loading-message">Error al cargar los comunicados.</p>';
    });
});