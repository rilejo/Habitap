document.addEventListener('DOMContentLoaded', () => {

    const sidebar = document.querySelector('.sidebar');
    const menuButton = document.querySelector('.mobile-menu-button');
    const overlay = document.querySelector('.sidebar-overlay');
    const navLinks = document.querySelectorAll('.sidebar .nav-item'); // Selecciona todos los enlaces de navegación

    // Si los elementos esenciales no existen, no continuamos para evitar errores.
    if (!sidebar || !menuButton || !overlay) {
        console.error("No se encontraron los elementos necesarios para el menú móvil.");
        return;
    }

    // --- Funciones para controlar el menú ---

    // Función para cerrar el menú
    const closeMenu = () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
    };

    // Función para abrir el menú
    const openMenu = () => {
        sidebar.classList.add('is-open');
        overlay.classList.add('is-visible');
    };

    // --- Asignación de Eventos ---

    // Evento para el botón del menú (hamburguesa)
    menuButton.addEventListener('click', () => {
        // Si el menú ya está abierto, lo cerramos; si no, lo abrimos.
        if (sidebar.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    // Evento para el fondo oscuro (overlay) para cerrar el menú
    overlay.addEventListener('click', closeMenu);

    // ¡NUEVO! Evento para cerrar el menú automáticamente al hacer clic en un enlace de navegación
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

});