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
    const showWizardBtn = document.getElementById('show-wizard-btn');
    const creationWizardModal = document.getElementById('creation-wizard-modal');
    const structureView = document.getElementById('structure-view');
    const wizardForm = document.getElementById('wizard-form');
    const wizardSteps = document.querySelectorAll('.wizard-step');
    const closeWizardBtn = document.getElementById('close-wizard-modal-btn');
    
    const towersList = document.getElementById('towers-list');
    const apartmentsList = document.getElementById('apartments-list');
    const apartmentsTitle = document.getElementById('apartments-title');
    const apartmentDetailsContent = document.getElementById('apartment-details-content');
    
    const towerNumberGrid = document.getElementById('tower-number-grid');
    
    // --- 3. Estado de la Aplicación ---
    let currentStep = 1;
    let selectedTowerNumber = null;
    let currentConjuntoId = null; // Se obtendrá del usuario autenticado
    let selectedTowerId = null; // ID de la torre seleccionada
    let selectedApartmentId = null; // ID del apartamento seleccionado

    // --- 4. Lógica del Asistente (Wizard) ---
    const openWizard = () => {
        generateNumberGrid();
        creationWizardModal.classList.add('is-visible');
    };
    const closeWizard = () => {
        wizardForm.reset();
        navigateWizard(1);
        creationWizardModal.classList.remove('is-visible');
    };

    const navigateWizard = (step) => {
        wizardSteps.forEach(s => s.classList.add('hidden'));
        const nextStepElement = document.querySelector(`.wizard-step[data-step="${step}"]`);
        if (nextStepElement) {
            nextStepElement.classList.remove('hidden');
            const placeholder = nextStepElement.querySelector('.tower-name-placeholder');
            if (placeholder) {
                const towerName = document.getElementById('tower-name').value || `Torre ${selectedTowerNumber}`;
                placeholder.textContent = `${towerName}`;
            }
        }
        currentStep = step;
    };

    const generateNumberGrid = async () => {
        if (!currentConjuntoId) return;
        const existingTowersSnapshot = await db.collection(`conjuntos/${currentConjuntoId}/torres`).get();
        const takenNumbers = existingTowersSnapshot.docs.map(doc => doc.data().number);

        towerNumberGrid.innerHTML = '';
        for (let i = 1; i <= 50; i++) {
            const cell = document.createElement('div');
            cell.className = 'number-cell';
            cell.textContent = i;
            if (takenNumbers.includes(i)) {
                cell.classList.add('taken');
            } else {
                cell.classList.add('available');
                cell.addEventListener('click', () => {
                    selectedTowerNumber = i;
                    document.querySelectorAll('.number-cell.selected').forEach(c => c.classList.remove('selected'));
                    cell.classList.add('selected');
                    document.querySelector('.wizard-step[data-step="1"] .next-step').disabled = false;
                });
            }
            towerNumberGrid.appendChild(cell);
        }
    };

    const generateFloorTable = () => {
        const floorCount = parseInt(document.getElementById('floor-count').value, 10);
        const tableBody = document.getElementById('floors-table-body');
        tableBody.innerHTML = '';
        if (isNaN(floorCount) || floorCount < 1) return;
        for (let i = 1; i <= floorCount; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `<td>Piso ${i}</td><td><input type="number" class="apartment-count-input" data-floor="${i}" min="1" placeholder="N° de aptos" required></td>`;
            tableBody.appendChild(row);
        }
    };

    const createStructure = async () => {
        if (!currentConjuntoId || !selectedTowerNumber) return;
        const optionalName = document.getElementById('tower-name').value;
        const floorInputs = document.querySelectorAll('.apartment-count-input');
        
        const towerData = {
            number: selectedTowerNumber,
            name: optionalName || `Torre ${selectedTowerNumber}`,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        const towerRef = await db.collection(`conjuntos/${currentConjuntoId}/torres`).add(towerData);
        
        const batch = db.batch();
        floorInputs.forEach(input => {
            const floorNumber = input.dataset.floor;
            const apartmentCount = parseInt(input.value, 10);
            for (let i = 1; i <= apartmentCount; i++) {
                const apartmentNumber = `${floorNumber}${String(i).padStart(2, '0')}`;
                const aptRef = db.collection(`conjuntos/${currentConjuntoId}/torres/${towerRef.id}/apartamentos`).doc();
                batch.set(aptRef, { number: apartmentNumber, floor: parseInt(floorNumber, 10), createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        });
        
        await batch.commit();
        alert(`¡La estructura para "${towerData.name}" ha sido creada exitosamente!`);
        closeWizard();
    };
    
    // --- 5. Lógica de Vista Principal ---
    const renderTowerCard = async (towerDoc) => {
        const tower = towerDoc.data();
        const towerId = towerDoc.id;
        const apartmentsSnapshot = await db.collection(`conjuntos/${currentConjuntoId}/torres/${towerId}/apartamentos`).get();
        const apartmentCount = apartmentsSnapshot.size;
        const floors = new Set(apartmentsSnapshot.docs.map(doc => doc.data().floor));
        
        const card = document.createElement('article');
        card.className = 'info-card';
        card.setAttribute('data-id', towerId);
        card.innerHTML = `
            <div class="card-header">
                <h3>${tower.name}</h3>
                <span class="tower-number">Torre N° ${tower.number}</span>
            </div>
            <div class="card-stats">
                <div class="card-stat"><p class="card-stat-value">${floors.size}</p><p class="card-stat-label">Pisos</p></div>
                <div class="card-stat"><p class="card-stat-value">${apartmentCount}</p><p class="card-stat-label">Aptos</p></div>
            </div>
        `;
        card.addEventListener('click', () => {
             document.querySelectorAll('#towers-list .info-card').forEach(c => c.classList.remove('selected'));
             card.classList.add('selected');
             selectedTowerId = towerId; // Guardar la torre seleccionada
             apartmentsTitle.textContent = `Apartamentos de ${tower.name}`;
             loadApartments(towerId);
             apartmentDetailsContent.innerHTML = '<p class="placeholder-text">Selecciona un apartamento para ver los detalles.</p>'; // Limpiar detalles
        });
        towersList.appendChild(card);
    };

    const loadApartments = (towerId) => {
        if (!currentConjuntoId) return;
        const path = `conjuntos/${currentConjuntoId}/torres/${towerId}/apartamentos`;
        db.collection(path).orderBy('number').onSnapshot(snapshot => {
            apartmentsList.innerHTML = '';
            if (snapshot.empty) {
                apartmentsList.innerHTML = '<p class="placeholder-text">No hay apartamentos en esta torre.</p>';
            } else {
                snapshot.docs.forEach(doc => renderApartmentCard(doc));
            }
        });
    };

    const renderApartmentCard = (aptDoc) => {
        const apartment = aptDoc.data();
        const apartmentId = aptDoc.id;
        const card = document.createElement('article');
        card.className = 'info-card apartment-card';
        card.setAttribute('data-id', apartmentId);
        card.innerHTML = `<h3>Apto ${apartment.number}</h3>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('#apartments-list .apartment-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedApartmentId = apartmentId; // Guardar el apartamento seleccionado
            loadApartmentDetails(apartmentId);
        });
        apartmentsList.appendChild(card);
    };

    const loadApartmentDetails = async (apartmentId) => {
        if (!currentConjuntoId || !selectedTowerId) return;
        try {
            const aptDoc = await db.collection(`conjuntos/${currentConjuntoId}/torres/${selectedTowerId}/apartamentos`).doc(apartmentId).get();
            if (aptDoc.exists) {
                const apartment = aptDoc.data();
                // Buscar propietario asignado
                const ownerSnapshot = await db.collection(`conjuntos/${currentConjuntoId}/residentes`).where("apartmentId", "==", apartmentId).limit(1).get();
                const owner = ownerSnapshot.empty ? null : ownerSnapshot.docs[0].data();

                apartmentDetailsContent.innerHTML = `
                    <h3>Apartamento ${apartment.number}</h3>
                    <div class="detail-item">
                        <i class="ph ph-buildings"></i>
                        <p><strong>Piso:</strong> <span>${apartment.floor}</span></p>
                    </div>
                    ${owner ? `
                    <div class="detail-item">
                        <i class="ph ph-user"></i>
                        <p><strong>Propietario:</strong> <span>${owner.name}</span></p>
                    </div>
                    <div class="detail-item">
                        <i class="ph ph-phone"></i>
                        <p><strong>Teléfono:</strong> <span>${owner.phone || 'N/A'}</span></p>
                    </div>
                    <div class="detail-item">
                        <i class="ph ph-envelope"></i>
                        <p><strong>Email:</strong> <span>${owner.email || 'N/A'}</span></p>
                    </div>
                    <div class="detail-item">
                        <i class="ph ph-info"></i>
                        <p><strong>Estado:</strong> <span class="status-tag status-${owner.status}">${owner.status.replace('_', ' ')}</span></p>
                    </div>
                    ` : `
                    <div class="detail-item">
                        <i class="ph ph-info"></i>
                        <p><strong>Estado:</strong> <span>Disponible</span></p>
                    </div>
                    `}
                    <div class="action-buttons">
                        <button class="edit-button">Editar Apartamento</button>
                        ${owner ? `<button class="delete-button">Desasignar Propietario</button>` : ''}
                    </div>
                `;
            } else {
                apartmentDetailsContent.innerHTML = '<p class="placeholder-text">Apartamento no encontrado.</p>';
            }
        } catch (error) {
            console.error("Error al cargar detalles del apartamento: ", error);
            apartmentDetailsContent.innerHTML = '<p class="placeholder-text">Error al cargar los detalles.</p>';
        }
    };

    // --- 6. Asignación de Eventos ---
    if(showWizardBtn) showWizardBtn.addEventListener('click', openWizard);
    if(closeWizardBtn) closeWizardBtn.addEventListener('click', closeWizard);
    wizardForm.querySelector('.cancel-button')?.addEventListener('click', closeWizard);


    wizardForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('next-step')) {
            if (currentStep === 1 && selectedTowerNumber === null) {
                alert("Por favor, selecciona un número para la torre.");
                return;
            }
            if (currentStep === 2) generateFloorTable();
            navigateWizard(currentStep + 1);
        }
        if (e.target.classList.contains('prev-step')) {
            navigateWizard(currentStep - 1);
        }
    });

    wizardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        createStructure().catch(console.error);
    });

    // --- 7. Manejo del estado de autenticación de Firebase ---
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario autenticado, obtener su conjuntoId
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().conjuntoId) {
                    currentConjuntoId = userDoc.data().conjuntoId;
                    // Una vez que tenemos el conjuntoId, cargar los datos
                    db.collection(`conjuntos/${currentConjuntoId}/torres`).orderBy('number').onSnapshot(snapshot => {
                        towersList.innerHTML = '';
                        if(snapshot.empty) {
                            towersList.innerHTML = '<p class="placeholder-text">No hay torres creadas. Usa el asistente para crear la primera.</p>';
                        } else {
                            snapshot.docs.forEach(renderTowerCard);
                        }
                    });
                } else {
                    console.error("No se encontró conjuntoId para el usuario actual o el documento no existe.");
                    structureView.innerHTML = '<h1>Error: No se pudo cargar la información del conjunto.</h1>';
                }
            } catch (error) {
                console.error("Error al obtener conjuntoId del usuario:", error);
                structureView.innerHTML = '<h1>Error al cargar la información del usuario.</h1>';
            }
        } else {
            // No hay usuario autenticado
            console.log("No hay usuario autenticado.");
            structureView.innerHTML = '<h1>Por favor, inicia sesión para ver la estructura del conjunto.</h1>';
            // Opcional: window.location.href = 'index.html';
        }
    });
});