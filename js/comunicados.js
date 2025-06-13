// Esperar a que el DOM y los scripts de Firebase estén listos
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuración e Inicialización de Firebase ---
    // ¡Credenciales de tu proyecto HABITAP!
    const firebaseConfig = {
        apiKey: "AIzaSyC36P8JptpDexx_nx7YeS3TGuIn9QJBaLI",
        authDomain: "habivera-app.firebaseapp.com",
        projectId: "habivera-app",
        storageBucket: "habivera-app.appspot.com",
        messagingSenderId: "656210941795",
        appId: "1:656210941795:web:b3caf76e01201a6a2a2556"
    };

    // Inicializar la aplicación de Firebase solo si no ha sido inicializada antes
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // Si ya está inicializada, usa la app existente
    }

    // Inicializar Firestore
    const db = firebase.firestore();

    // --- 2. Selección de Elementos del DOM ---
    const openModalBtn = document.getElementById('open-modal-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalOverlay = document.getElementById('comunicado-modal');
    const cancelButton = document.querySelector('.cancel-button');
    const comunicadoForm = document.getElementById('comunicado-form');
    const comunicadosList = document.getElementById('comunicados-list');
    
    // --- 3. Funciones para el Modal ---
    const openModal = () => modalOverlay.classList.add('is-visible');
    const closeModal = () => modalOverlay.classList.remove('is-visible');

    // --- 4. Funciones de Firestore ---

    const saveComunicado = (title, message, category) => {
        db.collection('comunicados').add({
            title: title,
            message: message,
            category: category,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("¡Comunicado guardado en Firestore!");
            comunicadoForm.reset();
            closeModal();
        }).catch((error) => {
            console.error("Error al guardar el comunicado: ", error);
            alert("Hubo un error al guardar. Revisa la consola para más detalles.");
        });
    };

    const renderComunicado = (doc) => {
        const data = doc.data();
        const categoryMap = {
            'urgent': { text: 'Urgente', className: 'tag-urgent' },
            'maintenance': { text: 'Mantenimiento', className: 'tag-maintenance' },
            'event': { text: 'Evento', className: 'tag-event' },
            'info': { text: 'Informativo', className: 'tag-info' }
        };
        const categoryInfo = categoryMap[data.category] || categoryMap['info'];
        const date = data.createdAt ? data.createdAt.toDate().toLocaleDateString('es-ES', {
            day: 'numeric', month: 'long', year: 'numeric'
        }) : 'Fecha no disponible';
        
        const card = document.createElement('article');
        card.className = 'comunicado-card';
        card.setAttribute('data-id', doc.id);
        
        card.innerHTML = `
            <div class="comunicado-header">
                <h2>${data.title}</h2>
                <span class="comunicado-tag ${categoryInfo.className}">${categoryInfo.text}</span>
            </div>
            <p class="comunicado-excerpt">${data.message}</p>
            <div class="comunicado-footer">
                <span>Publicado el ${date}</span>
                <a href="#">Leer más</a>
            </div>
        `;
        comunicadosList.appendChild(card);
    };

    // --- 5. Asignación de Eventos ---
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', (event) => {
        if (event.target === modalOverlay) closeModal();
    });

    if (comunicadoForm) {
        comunicadoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const titleInput = document.getElementById('comunicado-titulo');
            const messageInput = document.getElementById('comunicado-mensaje');
            const categoryInput = document.getElementById('comunicado-categoria');
            
            if (titleInput.value.trim() === '' || messageInput.value.trim() === '') {
                alert('Por favor, completa todos los campos.');
                return;
            }
            // Llama a la función que guarda en Firestore
            saveComunicado(titleInput.value, messageInput.value, categoryInput.value);
        });
    }

    // --- 6. Escucha de Cambios en Tiempo Real ---
    db.collection('comunicados').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        comunicadosList.innerHTML = ''; // Limpiar la lista para evitar duplicados
        if (snapshot.empty) {
            comunicadosList.innerHTML = '<p id="loading-message">No hay comunicados para mostrar. ¡Crea el primero!</p>';
        } else {
            snapshot.docs.forEach(doc => {
                renderComunicado(doc);
            });
        }
    }, (error) => {
        console.error("Error al obtener los comunicados: ", error);
        comunicadosList.innerHTML = '<p id="loading-message">Error al cargar los comunicados. Revisa la consola para más detalles.</p>';
    });
});