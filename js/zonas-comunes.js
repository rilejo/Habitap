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
    const createZoneModalBtn = document.getElementById('create-zone-btn');
    const closeZoneModalBtn = document.getElementById('close-zone-modal-btn');
    const zoneModalOverlay = document.getElementById('zone-modal');
    const zoneCancelButton = document.querySelector('#zone-modal .cancel-button');
    const zoneForm = document.getElementById('zone-form');
    const zonasList = document.getElementById('zonas-list');
    const loadingMessage = document.getElementById('loading-zones-message');
    
    // Elementos del Modal de Reservas
    const reservationModalOverlay = document.getElementById('reservation-modal');
    const closeReservationModalBtn = document.getElementById('close-reservation-modal-btn');
    const reservationCancelButton = document.querySelector('#reservation-modal .cancel-button');
    const reservationModalTitle = document.getElementById('reservation-modal-title');
    const calendarGridBody = document.getElementById('calendar-grid-body');
    const monthYearDisplay = document.getElementById('month-year-display');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const reservationDateInput = document.getElementById('reservation-date');
    const reservationForm = document.getElementById('reservation-form');
    
    // --- 3. Estado de la Aplicación ---
    let currentYear = new Date().getFullYear();
    let currentMonth = new Date().getMonth(); // 0-11
    let selectedDate = null;
    let currentZoneId = null;

    // --- 4. Funciones del Modal (Crear y Reservar) ---
    const openCreateModal = () => zoneModalOverlay.classList.add('is-visible');
    const closeCreateModal = () => zoneModalOverlay.classList.remove('is-visible');
    const openReservationModal = () => reservationModalOverlay.classList.add('is-visible');
    const closeReservationModal = () => reservationModalOverlay.classList.remove('is-visible');

    // --- 5. Lógica de Zonas Comunes ---
    const saveZone = (name, description, imageUrl) => {
        db.collection('zonasComunes').add({ name, description, imageUrl, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
            .then(() => {
                console.log("Nueva zona guardada!");
                zoneForm.reset();
                closeCreateModal();
            }).catch(error => console.error("Error al guardar la zona: ", error));
    };

    const renderZone = (doc) => {
        const zona = doc.data();
        const card = document.createElement('article');
        card.className = 'zona-card';
        card.innerHTML = `
            <img src="${zona.imageUrl}" alt="Imagen de ${zona.name}" class="zona-card-image" onerror="this.onerror=null;this.src='https://placehold.co/600x400/cccccc/ffffff?text=Imagen+no+disponible';">
            <div class="zona-card-content">
                <h2>${zona.name}</h2>
                <p>${zona.description}</p>
                <button class="reserve-button" data-zone-id="${doc.id}" data-zone-name="${zona.name}">Ver Disponibilidad</button>
            </div>
        `;
        zonasList.appendChild(card);
    };

    // --- 6. Lógica del Calendario y Reservas ---
    const generateCalendar = async (year, month) => {
        calendarGridBody.innerHTML = '';
        monthYearDisplay.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Consultar reservas existentes para la zona y mes actual
        const reservations = await db.collection('reservas')
            .where('zoneId', '==', currentZoneId)
            .where('year', '==', year)
            .where('month', '==', month + 1)
            .get();
        const reservedDays = reservations.docs.map(doc => doc.data().day);

        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarGridBody.innerHTML += `<div class="calendar-day not-current-month"></div>`;
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            if (reservedDays.includes(day)) {
                dayElement.classList.add('reserved');
            } else {
                dayElement.classList.add('selectable');
                dayElement.addEventListener('click', () => {
                    selectedDate = new Date(year, month, day);
                    document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
                    dayElement.classList.add('selected');
                    reservationDateInput.value = selectedDate.toLocaleDateString('es-ES');
                });
            }
            calendarGridBody.appendChild(dayElement);
        }
    };
    
    const saveReservation = (zoneId, residentId, date) => {
        db.collection('reservas').add({
            zoneId: zoneId,
            residentId: residentId,
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert('Reserva confirmada exitosamente!');
            closeReservationModal();
        }).catch(error => console.error('Error al guardar reserva:', error));
    };

    // --- 7. Asignación de Eventos ---
    // Crear Zona
    if (createZoneModalBtn) createZoneModalBtn.addEventListener('click', openCreateModal);
    if (closeZoneModalBtn) closeZoneModalBtn.addEventListener('click', closeCreateModal);
    if (zoneCancelButton) zoneCancelButton.addEventListener('click', closeCreateModal);
    if (zoneModalOverlay) zoneModalOverlay.addEventListener('click', e => e.target === zoneModalOverlay && closeCreateModal());
    if (zoneForm) zoneForm.addEventListener('submit', e => {
        e.preventDefault();
        saveZone(
            document.getElementById('zone-name').value,
            document.getElementById('zone-description').value,
            document.getElementById('zone-image').value
        );
    });

    // Reservar Zona
    if (closeReservationModalBtn) closeReservationModalBtn.addEventListener('click', closeReservationModal);
    if (reservationCancelButton) reservationCancelButton.addEventListener('click', closeReservationModal);
    if (reservationModalOverlay) reservationModalOverlay.addEventListener('click', e => e.target === reservationModalOverlay && closeReservationModal());
    
    // Navegación del calendario
    prevMonthBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar(currentYear, currentMonth);
    });

    nextMonthBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar(currentYear, currentMonth);
    });
    
    // Abrir modal de reserva (usando delegación de eventos)
    zonasList.addEventListener('click', e => {
        if (e.target && e.target.classList.contains('reserve-button')) {
            currentZoneId = e.target.dataset.zoneId;
            const zoneName = e.target.dataset.zoneName;
            reservationModalTitle.textContent = `Reservar ${zoneName}`;
            selectedDate = null;
            reservationDateInput.value = '';
            generateCalendar(currentYear, currentMonth);
            openReservationModal();
        }
    });

    if(reservationForm) reservationForm.addEventListener('submit', e => {
        e.preventDefault();
        const residentId = document.getElementById('resident-id').value;
        if(selectedDate && residentId.trim()){
            saveReservation(currentZoneId, residentId, selectedDate);
        } else {
            alert('Por favor, selecciona una fecha y proporciona el apartamento.');
        }
    });


    // --- 8. Carga inicial de datos ---
    db.collection('zonasComunes').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        zonasList.innerHTML = '';
        if (snapshot.empty) {
            loadingMessage.textContent = 'No hay zonas comunes registradas. ¡Añade la primera!';
            zonasList.appendChild(loadingMessage);
        } else {
            snapshot.docs.forEach(doc => renderZone(doc));
        }
    }, error => console.error("Error al cargar las zonas: ", error));
});