document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Configuración e Inicialización de Firebase ---
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
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- 2. Selección de Elementos del DOM ---
    const loginForm = document.querySelector('.login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();

            const email = emailInput.value;
            const password = passwordInput.value;

            // --- 3. Iniciar Sesión con Firebase Auth ---
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Inicio de sesión exitoso
                    const user = userCredential.user;
                    console.log('Usuario autenticado:', user.uid);

                    // --- 4. Buscar el Rol del Usuario en Firestore ---
                    // Buscamos en una colección 'usuarios' el documento con el ID del usuario logueado.
                    db.collection('usuarios').doc(user.uid).get()
                        .then((doc) => {
                            if (doc.exists) {
                                const userData = doc.data();
                                const userRole = userData.role;

                                // Guardamos el ID del conjunto en el almacenamiento local para usarlo en otras páginas
                                localStorage.setItem('conjuntoId', userData.conjuntoId);

                                // --- 5. Redireccionar según el Rol ---
                                if (userRole === 'admin') {
                                    // Si es administrador, va al dashboard principal
                                    window.location.href = 'dashboard.html';
                                } else if (userRole === 'residente') {
                                    // Si es residente, va a un dashboard de residente (que crearemos)
                                    // Por ahora, redirigimos también al dashboard principal como placeholder.
                                    alert("¡Bienvenido Residente! Próximamente tendrás tu propio dashboard.");
                                    window.location.href = 'dashboard.html'; 
                                } else {
                                    alert('Rol de usuario no reconocido.');
                                }
                            } else {
                                console.error("No se encontró el documento del usuario en Firestore.");
                                alert("No tienes permisos asignados. Contacta al administrador.");
                            }
                        }).catch((error) => {
                            console.error("Error buscando el rol del usuario: ", error);
                            alert("Error al verificar tus permisos.");
                        });

                })
                .catch((error) => {
                    // Manejo de errores de autenticación
                    console.error('Error de inicio de sesión:', error.code, error.message);
                    alert('Correo o contraseña incorrectos. Por favor, intenta de nuevo.');
                });
        });
    }
});