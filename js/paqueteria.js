
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
    const openModalBtn = document.getElementById('register-package-btn');
    const closeModalBtn = document.getElementById('close-package-modal-btn');
    const modalOverlay = document.getElementById('package-modal');
    const cancelButton = document.querySelector('#package-modal .cancel-button');
    const packageForm = document.getElementById('package-form');
    const packageTableBody = document.getElementById('package-table-body');
    const loadingMessage = document.getElementById('loading-packages-message');

    // --- 3. Funciones del Modal ---
    const openModal = () => modalOverlay.classList.add('is-visible');
    const closeModal = () => modalOverlay.classList.remove('is-visible');

    // --- 4. Funciones de Firestore ---
    
    // Guardar un nuevo paquete
    const savePackage = (apt, sender, notes) => {
        db.collection('paqueteria').add({
            apartment: apt,
            sender: sender,
            notes: notes,
            status: 'Pendiente', // Estado inicial
            receivedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Paquete guardado!");
            packageForm.reset();
            closeModal();
        }).catch(error => {
            console.error("Error al guardar paquete: ", error);
            alert("Error al guardar el paquete.");
        });
    };

    // Marcar un paquete como entregado
    const markAsDelivered = (packageId) => {
        db.collection('paqueteria').doc(packageId).update({
            status: 'Entregado'
        }).then(() => {
            console.log("Paquete marcado como entregado!");
        }).catch(error => {
            console.error("Error al actualizar el paquete: ", error);
        });
    };

    // Renderizar una fila en la tabla de paquetes
    const renderPackage = (doc) => {
        const pkg = doc.data();
        const row = document.createElement('tr');
        row.setAttribute('data-id', doc.id);

        const statusClass = pkg.status === 'Pendiente' ? 'status-pendiente' : 'status-entregado';
        const receivedDate = pkg.receivedAt ? pkg.receivedAt.toDate().toLocaleDateString('es-ES') : 'N/A';
        
        // El botón solo aparece si el estado es 'Pendiente'
        const actionButton = pkg.status === 'Pendiente' 
            ? `<button class="action-button deliver-button" data-id="${doc.id}">Marcar Entregado</button>`
            : '';

        row.innerHTML = `
            <td>${pkg.apartment}</td>
            <td>${pkg.sender}</td>
            <td>${receivedDate}</td>
            <td><span class="status-tag ${statusClass}">${pkg.status}</span></td>
            <td>${actionButton}</td>
        `;
        packageTableBody.appendChild(row);
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

    if (packageForm) {
        packageForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const apt = document.getElementById('package-apt').value;
            const sender = document.getElementById('package-sender').value;
            const notes = document.getElementById('package-notes').value;

            if (apt.trim() && sender.trim()) {
                savePackage(apt, sender, notes);
            } else {
                alert("Por favor, completa los campos de Apartamento y Remitente.");
            }
        });
    }
    
    // Delegación de eventos para los botones de "Marcar Entregado"
    packageTableBody.addEventListener('click', (event) => {
        if(event.target && event.target.classList.contains('deliver-button')) {
            const packageId = event.target.dataset.id;
            if(confirm('¿Estás seguro de que quieres marcar este paquete como entregado?')) {
                markAsDelivered(packageId);
            }
        }
    });

    // --- 6. Carga de datos en tiempo real ---
    db.collection('paqueteria').orderBy('receivedAt', 'desc').onSnapshot(snapshot => {
        packageTableBody.innerHTML = ''; // Limpiar tabla
        if (snapshot.empty) {
            loadingMessage.textContent = 'No hay paquetes registrados.';
        } else {
            loadingMessage.style.display = 'none';
            snapshot.docs.forEach(doc => {
                renderPackage(doc);
            });
        }
    }, error => {
        console.error("Error al cargar los paquetes: ", error);
        loadingMessage.textContent = 'Error al cargar los datos.';
    });

});