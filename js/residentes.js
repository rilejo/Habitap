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
    const openModalBtn = document.getElementById('add-resident-btn');
    const closeModalBtn = document.getElementById('close-resident-modal-btn');
    const modalOverlay = document.getElementById('resident-modal');
    const cancelButton = document.querySelector('#resident-modal .cancel-button');
    const residentForm = document.getElementById('resident-form');
    const residentTableBody = document.getElementById('resident-table-body');
    const loadingMessage = document.getElementById('loading-residents-message');

    // --- 3. Funciones del Modal ---
    const openModal = () => modalOverlay.classList.add('is-visible');
    const closeModal = () => modalOverlay.classList.remove('is-visible');

    // --- 4. Funciones de Firestore ---
    
    // Guardar un nuevo residente
    const saveResident = (name, apt, phone, email, status) => {
        db.collection('residentes').add({
            name: name,
            apartment: apt,
            phone: phone,
            email: email,
            status: status,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Residente guardado!");
            residentForm.reset();
            closeModal();
        }).catch(error => {
            console.error("Error al guardar residente: ", error);
            alert("Error al guardar el residente.");
        });
    };

    // Renderizar una fila en la tabla
    const renderResident = (doc) => {
        const resident = doc.data();
        const row = document.createElement('tr');
        row.setAttribute('data-id', doc.id);

        const statusTagClass = {
            'activo': 'status-activo',
            'inactivo': 'status-inactivo',
            'en_mora': 'status-en_mora'
        };
        const statusClass = statusTagClass[resident.status] || 'status-inactivo';

        row.innerHTML = `
            <td>${resident.name}</td>
            <td>${resident.apartment}</td>
            <td>${resident.phone}</td>
            <td><span class="status-tag ${statusClass}">${resident.status.replace('_', ' ')}</span></td>
            <td class="action-buttons">
                <button title="Editar"><i class="ph ph-pencil-simple"></i></button>
                <button title="Eliminar"><i class="ph ph-trash"></i></button>
            </td>
        `;
        residentTableBody.appendChild(row);
    };

    // --- 5. Asignación de Eventos ---
    if (openModalBtn) openModalBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelButton) cancelButton.addEventListener('click', closeModal);
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (event) => {
            if (event.target === modalOverlay) closeModal();
        });
    }

    if (residentForm) {
        residentForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = document.getElementById('resident-name').value;
            const apt = document.getElementById('resident-apt').value;
            const phone = document.getElementById('resident-phone').value;
            const email = document.getElementById('resident-email').value;
            const status = document.getElementById('resident-status').value;

            if (name.trim() && apt.trim() && phone.trim()) {
                saveResident(name, apt, phone, email, status);
            } else {
                alert("Por favor, completa los campos obligatorios.");
            }
        });
    }

    // --- 6. Carga de datos en tiempo real ---
    db.collection('residentes').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        residentTableBody.innerHTML = ''; // Limpiar tabla
        if (snapshot.empty) {
            loadingMessage.textContent = 'No hay residentes registrados. ¡Añade el primero!';
        } else {
            loadingMessage.style.display = 'none';
            snapshot.docs.forEach(doc => {
                renderResident(doc);
            });
        }
    }, error => {
        console.error("Error al cargar residentes: ", error);
        loadingMessage.textContent = 'Error al cargar los datos.';
    });

});