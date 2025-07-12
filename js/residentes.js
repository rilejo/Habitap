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

    let currentConjuntoId = null; // Variable para almacenar el conjuntoId
    let editingResidentId = null; // Variable para almacenar el ID del residente que se está editando

    // --- 2. Selección de Elementos del DOM ---
    const addResidentBtn = document.getElementById('add-resident-btn');
    const residentModal = document.getElementById('resident-modal');
    const closeModalBtn = residentModal ? residentModal.querySelector('.close-button') : null;
    const residentForm = document.getElementById('resident-form');
    const residentTableBody = document.querySelector('#resident-table-body');
    const loadingMessage = document.getElementById('loading-residents-message');
    const cancelButton = residentModal ? residentModal.querySelector('.cancel-button') : null;

    // Elementos del formulario del modal
    const residentNameInput = document.getElementById('resident-name');
    const residentPhoneInput = document.getElementById('resident-phone');
    const residentEmailInput = document.getElementById('resident-email');
    const residentStatusSelect = document.getElementById('resident-status');
    const modalTitle = residentModal ? residentModal.querySelector('h2') : null;
    const saveButton = residentForm ? residentForm.querySelector('.publish-button') : null;

    // Elementos de los nuevos selectores de torre y apartamento
    const towerSelect = document.getElementById('tower-select');
    const apartmentSelect = document.getElementById('apartment-select');

    let allTowers = [];
    let allApartments = {}; // Para almacenar apartamentos por torreId
    let assignedApartments = {}; // Para almacenar apartamentos ya asignados

    // --- 3. Funciones para Manejar Modales ---
    const openModal = (modal) => {
        if (modal) modal.classList.add('show-modal');
    };

    const closeModal = (modal) => {
        if (modal) modal.classList.remove('show-modal');
    };

    // --- 4. Funciones de Firestore ---
    const saveResident = async (name, towerId, towerName, apartmentId, apartmentNumber, phone, email, status) => {
        if (!currentConjuntoId) {
            alert("Error: No se ha podido obtener el ID del conjunto. Por favor, recarga la página.");
            return;
        }

        const residentData = {
            name: name,
            towerId: towerId,
            towerName: towerName,
            apartmentId: apartmentId,
            apartmentNumber: apartmentNumber,
            phone: phone,
            email: email,
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editingResidentId) {
                // Actualizar residente existente
                await db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').doc(editingResidentId).update(residentData);
                console.log("Residente actualizado!");
            } else {
                // Añadir nuevo residente
                residentData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').add(residentData);
                console.log("Residente guardado!");
            }
            
            if(residentForm) residentForm.reset();
            closeModal(residentModal);
            editingResidentId = null; // Resetear el ID de edición
            // Recargar datos para actualizar la disponibilidad y la tabla
            loadAssignedApartments();
            loadTowersAndApartments();
            loadResidents();
        } catch (error) {
            console.error("Error al guardar/actualizar residente: ", error);
            alert("Error al guardar/actualizar el residente.");
        }
    };

    const deleteResident = async (residentId) => {
        if (!currentConjuntoId) {
            alert("Error: No se ha podido obtener el ID del conjunto. Por favor, recarga la página.");
            return;
        }
        if (confirm("¿Estás seguro de que quieres eliminar este residente?")) {
            try {
                await db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').doc(residentId).delete();
                console.log("Residente eliminado!");
                loadAssignedApartments(); // Actualizar disponibilidad
                loadResidents(); // Recargar la tabla
            } catch (error) {
                console.error("Error al eliminar residente: ", error);
                alert("Error al eliminar el residente.");
            }
        }
    };

    const editResident = async (residentId) => {
        if (!currentConjuntoId) {
            alert("Error: No se ha podido obtener el ID del conjunto. Por favor, recarga la página.");
            return;
        }
        try {
            const residentDoc = await db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').doc(residentId).get();
            if (residentDoc.exists) {
                const resident = residentDoc.data();
                editingResidentId = residentId; // Establecer el ID del residente que se está editando

                // Rellenar el formulario
                residentNameInput.value = resident.name;
                residentPhoneInput.value = resident.phone;
                residentEmailInput.value = resident.email;
                residentStatusSelect.value = resident.status;

                // Seleccionar torre y apartamento
                await loadTowersAndApartments(); // Asegurarse de que las torres y apartamentos estén cargados
                towerSelect.value = resident.towerId;
                populateApartmentSelect(resident.towerId); // Poblar apartamentos para la torre seleccionada
                // Esperar un ciclo de evento para asegurar que las opciones estén renderizadas
                setTimeout(() => {
                    apartmentSelect.value = resident.apartmentId;
                }, 0);

                // Cambiar título y texto del botón
                if (modalTitle) modalTitle.textContent = "Editar Residente";
                if (saveButton) saveButton.textContent = "Guardar Cambios";

                openModal(residentModal);
            } else {
                alert("Residente no encontrado.");
            }
        } catch (error) {
            console.error("Error al cargar residente para edición: ", error);
            alert("Error al cargar los datos del residente para edición.");
        }
    };

    const renderResident = (doc) => {
        if (!residentTableBody) return;
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
            <td>${resident.towerName} - ${resident.apartmentNumber}</td>
            <td>${resident.phone}</td>
            <td><span class="status-tag ${statusClass}">${resident.status.replace('_', ' ')}</span></td>
            <td class="action-buttons">
                <button title="Editar" data-id="${doc.id}" class="edit-btn"><i class="ph ph-pencil-simple"></i></button>
                <button title="Eliminar" data-id="${doc.id}" class="delete-btn"><i class="ph ph-trash"></i></button>
            </td>
        `;
        residentTableBody.appendChild(row);
    };

    const loadAssignedApartments = async () => {
        if (!currentConjuntoId) return; // Asegurarse de tener el conjuntoId
        try {
            const snapshot = await db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').get();
            assignedApartments = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.apartmentId) {
                    assignedApartments[data.apartmentId] = true;
                }
            });
        } catch (error) {
            console.error("Error al cargar apartamentos asignados: ", error);
        }
    };

    const loadTowersAndApartments = async () => {
        if (!currentConjuntoId) return; // Asegurarse de tener el conjuntoId
        try {
            // Cargar torres
            const towersSnapshot = await db.collection('conjuntos').doc(currentConjuntoId).collection('torres').orderBy('number').get();
            allTowers = towersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            towerSelect.innerHTML = '<option value="">Selecciona una torre</option>';
            allTowers.forEach(tower => {
                const option = document.createElement('option');
                option.value = tower.id;
                option.textContent = `Torre ${tower.number} - ${tower.name}`;
                towerSelect.appendChild(option);
            });

            // Cargar todos los apartamentos y almacenarlos por torre
            for (const tower of allTowers) {
                const apartmentsSnapshot = await db.collection('conjuntos').doc(currentConjuntoId).collection('torres').doc(tower.id).collection('apartamentos').orderBy('number').get();
                allApartments[tower.id] = apartmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }

            // Actualizar apartamentos si ya hay una torre seleccionada
            if (towerSelect.value) {
                populateApartmentSelect(towerSelect.value);
            }

        } catch (error) {
            console.error("Error al cargar torres y apartamentos: ", error);
            towerSelect.innerHTML = '<option value="">Error al cargar torres</option>';
            apartmentSelect.innerHTML = '<option value="">Error al cargar apartamentos</option>';
        }
    };

    const populateApartmentSelect = (towerId) => {
        apartmentSelect.innerHTML = '<option value="">Selecciona un apartamento</option>';
        apartmentSelect.disabled = true;

        if (!towerId) {
            return;
        }

        const apartmentsInTower = allApartments[towerId] || [];
        apartmentsInTower.forEach(apt => {
            const option = document.createElement('option');
            option.value = apt.id;
            option.textContent = `Piso ${apt.floor} - Apartamento ${apt.number}`;
            if (assignedApartments[apt.id]) {
                option.disabled = true;
                option.textContent += ' (Asignado)';
                option.classList.add('assigned-apartment'); // Clase para estilos visuales
            }
            apartmentSelect.appendChild(option);
        });
        apartmentSelect.disabled = false;
    };

    // --- 5. Asignación de Eventos ---
    if (addResidentBtn) addResidentBtn.addEventListener('click', () => {
        openModal(residentModal);
        // Resetear formulario y estado de edición al abrir para añadir
        if (residentForm) residentForm.reset();
        editingResidentId = null;
        if (modalTitle) modalTitle.textContent = "Añadir Nuevo Residente";
        if (saveButton) saveButton.textContent = "Guardar";

        // Resetear selectores
        towerSelect.value = '';
        apartmentSelect.innerHTML = '<option value="">Selecciona una torre primero</option>';
        apartmentSelect.disabled = true;
    });
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeModal(residentModal));
    if (cancelButton) cancelButton.addEventListener('click', () => closeModal(residentModal));
    
    window.addEventListener('click', (event) => {
        if (event.target == residentModal) {
            closeModal(residentModal);
        }
    });

    // Delegación de eventos para botones de editar y eliminar
    if (residentTableBody) {
        residentTableBody.addEventListener('click', (event) => {
            const target = event.target;
            const button = target.closest('button'); // Encuentra el botón más cercano

            if (button) {
                const residentId = button.dataset.id; // Obtiene el ID del residente del atributo data-id
                if (residentId) {
                    if (button.classList.contains('edit-btn')) {
                        editResident(residentId);
                    } else if (button.classList.contains('delete-btn')) {
                        deleteResident(residentId);
                    }
                }
            }
        });
    }

    if (towerSelect) {
        towerSelect.addEventListener('change', (event) => {
            populateApartmentSelect(event.target.value);
        });
    }

    if (residentForm) {
        residentForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const name = residentNameInput.value;
            const phone = residentPhoneInput.value;
            const email = residentEmailInput.value;
            const status = residentStatusSelect.value;

            const towerId = towerSelect.value;
            const apartmentId = apartmentSelect.value;

            const selectedTower = allTowers.find(t => t.id === towerId);
            const selectedApartment = allApartments[towerId] ? allApartments[towerId].find(a => a.id === apartmentId) : null;

            if (name.trim() && phone.trim() && towerId && apartmentId && selectedTower && selectedApartment) {
                saveResident(name, towerId, `Torre ${selectedTower.number}`, apartmentId, selectedApartment.number, phone, email, status);
            } else {
                alert("Por favor, completa todos los campos obligatorios, incluyendo la selección de torre y apartamento.");
            }
        });
    }

    // --- 6. Carga de datos en tiempo real ---
    // Esta función ahora depende de currentConjuntoId
    const loadResidents = () => {
        if (!currentConjuntoId) return; // Asegurarse de tener el conjuntoId
        db.collection('conjuntos').doc(currentConjuntoId).collection('residentes').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
            residentTableBody.innerHTML = ''; // Limpiar tabla
            if (snapshot.empty) {
                loadingMessage.textContent = 'No hay residentes registrados. ¡Añade el primero!';
                loadingMessage.style.display = 'block';
            } else {
                loadingMessage.style.display = 'none';
                snapshot.docs.forEach(doc => {
                    renderResident(doc);
                });
            }
        }, error => {
            console.error("Error al cargar residentes: ", error);
            loadingMessage.textContent = 'Error al cargar los datos.';
            loadingMessage.style.display = 'block';
        });
    };

    // --- 7. Manejo del estado de autenticación de Firebase ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario autenticado, obtener su conjuntoId
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().conjuntoId) {
                    currentConjuntoId = userDoc.data().conjuntoId;
                    // Una vez que tenemos el conjuntoId, cargar los datos
                    loadAssignedApartments();
                    loadTowersAndApartments();
                    loadResidents(); // Cargar residentes una vez que el conjuntoId esté disponible
                } else {
                    console.error("No se encontró conjuntoId para el usuario actual o el documento no existe.");
                    loadingMessage.textContent = 'Error: No se pudo cargar la información del conjunto.';
                    loadingMessage.style.display = 'block';
                }
            } catch (error) {
                console.error("Error al obtener conjuntoId del usuario:", error);
                loadingMessage.textContent = 'Error al cargar la información del usuario.';
                loadingMessage.style.display = 'block';
            }
        } else {
            // No hay usuario autenticado, redirigir a la página de inicio de sesión si es necesario
            console.log("No hay usuario autenticado.");
            loadingMessage.textContent = 'Por favor, inicia sesión para ver los residentes.';
            loadingMessage.style.display = 'block';
            // Opcional: window.location.href = 'index.html';
        }
    });
});