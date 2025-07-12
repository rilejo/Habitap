# Informe de Estado del Proyecto: Habivera

**Fecha:** 12 de Julio de 2025

Este documento resume el estado actual, la arquitectura y los próximos pasos del proyecto Habivera, una plataforma de gestión para conjuntos residenciales.

---

### 1. Objetivo del Proyecto

Crear una aplicación web (SaaS) que permita a los administradores de conjuntos residenciales gestionar eficientemente las operaciones diarias y facilite la comunicación e interacción con los propietarios. La aplicación está diseñada para ser multi-conjunto (multi-tenant), permitiendo que múltiples propiedades la usen de forma segura y aislada.

---

### 2. Pila Tecnológica

-   **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS).
-   **Base de Datos:** Google Firestore (NoSQL).
-   **Autenticación:** Firebase Authentication.
-   **Backend Logic:** Firebase Cloud Functions (Node.js).
-   **Hosting:** Firebase Hosting (pendiente de configuración final).

---

### 3. Estructura de la Base de Datos (Firestore)

Se ha diseñado una estructura de datos multi-tenant para aislar la información de cada conjunto residencial.

-   **Colección Principal:** `conjuntos`
    -   **Documento:** `{conjuntoId}` (ID único por conjunto).
        -   **Campos:** `nombre`, `direccion`, etc.
        -   **Sub-colección:** `torres`
            -   **Documento:** `{torreId}`
                -   **Campos:** `number`, `name`, `createdAt`.
                -   **Sub-colección:** `apartamentos`
                    -   **Documento:** `{apartamentoId}`
                        -   **Campos:** `number`, `floor`, `createdAt`.
        -   **Sub-colección:** `propietarios`
            -   **Documento:** `{propietarioId}` (coincide con el UID de Firebase Auth).
                -   **Campos:** `firstName`, `lastName`, `docType`, `docNumber`, `phone`, `email`, `towerId`, `apartmentId`, etc.
        -   **Otras sub-colecciones:** `comunicados`, `zonasComunes`, `paqueteria`, etc.

-   **Colección de Roles:** `usuarios`
    -   **Documento:** `{userId}` (UID de Firebase Auth).
        -   **Campos:** `role` ("admin" o "propietario"), `conjuntoId` (para enlazar al conjunto correcto).

---

### 4. Funcionalidades Implementadas (Vista Administrador)

#### a. Módulo de Estructura del Conjunto (`estructura.html`)
-   **Visualización de 3 Columnas:** Interfaz para gestionar Torres, Apartamentos y Detalles.
-   **Asistente de Creación de Torres:**
    -   Un modal por pasos que permite definir una nueva torre.
    -   Incluye un **selector numérico visual** que muestra los números de torre ya ocupados y los disponibles.
-   **Gestión de Apartamentos:**
    -   Al seleccionar una torre, se muestra la lista de sus apartamentos **agrupados por pisos desplegables** (con íconos +/-).
    -   Se ha implementado un modal para **añadir nuevos apartamentos o pisos** a una torre ya existente, calculando automáticamente los números de las nuevas unidades.

#### b. Módulo de Gestión de Propietarios (`residentes.html`)
-   **Formulario de Registro Completo:** Se ha implementado un modal para registrar propietarios con campos detallados: Nombres, Apellidos, Tipo y Número de Documento, Teléfono, Email y Contraseña.
-   **Selector de Propiedad Inteligente:**
    -   Un botón en el formulario abre un modal secundario para asignar una propiedad.
    -   Este modal muestra las torres y apartamentos disponibles, **deshabilitando y marcando visualmente aquellos que ya han sido asignados** a otro propietario para evitar duplicados.
-   **Integración con Backend:** El formulario se conecta con una **Cloud Function (`createOwnerUser`)** para crear el usuario en Firebase Authentication y guardar su información en Firestore de forma segura.

---

### 5. Estado Actual y Problema Pendiente

-   **Estado:** El frontend de los módulos de `Estructura` y `Propietarios` está funcionalmente completo. La lógica de la interfaz, la interacción con la base de datos para leer datos y la estructura de los formularios están terminadas.
-   **Problema Bloqueante:** El proyecto se encuentra detenido por un problema de configuración en el entorno de Firebase.
    -   **Error:** Al intentar registrar un propietario, la llamada a la Cloud Function `createOwnerUser` falla con un **error de CORS**.
    -   **Causa Raíz:** El proyecto de Firebase está en el plan gratuito "Spark". Para poder desplegar Cloud Functions que usan ciertas APIs de Google Cloud (como `artifactregistry.googleapis.com`), es un **requisito indispensable actualizar el proyecto al plan "Blaze" (pago por uso)**.
    -   **Acción Requerida:** El usuario debe acceder a la consola de Firebase, ir a la sección de facturación del proyecto `habivera-app` y actualizarlo al plan "Blaze". Aunque requiere añadir un método de pago, el uso para desarrollo y pruebas se mantendrá dentro del generoso nivel gratuito, por lo que no debería generar costos.

---

### 6. Código Clave: Cloud Function a Desplegar

Este es el código final y corregido que debe estar en el archivo `functions/index.js` para que el registro de propietarios funcione una vez solucionado el tema de la facturación.

```javascript
// Archivo: functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createOwnerUser = functions.https.onCall(async (data, context) => {
  if (!data.email || !data.password || !data.firstName || !data.conjuntoId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Faltan datos esenciales para crear el propietario."
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.firstName} ${data.lastName}`,
    });

    const ownerData = {
      firstName: data.firstName,
      lastName: data.lastName,
      docType: data.docType,
      docNumber: data.docNumber,
      phone: data.phone,
      email: data.email,
      towerId: data.towerId,
      towerName: data.towerName,
      apartmentId: data.apartmentId,
      apartmentNumber: data.apartmentNumber,
      status: "Activo",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ownerRef = admin
      .firestore()
      .collection("conjuntos")
      .doc(data.conjuntoId)
      .collection("propietarios")
      .doc(userRecord.uid);
    
    await ownerRef.set(ownerData);

    const userRoleRef = admin.firestore().collection("usuarios").doc(userRecord.uid);
    await userRoleRef.set({
      role: "propietario",
      conjuntoId: data.conjuntoId,
    });

    return { success: true, userId: userRecord.uid };

  } catch (error) {
    console.error("Error al crear propietario:", error);
    if (context.auth && context.auth.uid) {
        await admin.auth().deleteUser(context.auth.uid).catch(err => console.error("Error al limpiar usuario de Auth", err));
    }
    throw new functions.https.HttpsError("internal", error.message, error);
  }
});
```

---

### 7. Progreso Reciente (12 de Julio de 2025)

Se han realizado mejoras significativas en la funcionalidad y la experiencia de usuario de los módulos de `Residentes` y `Estructura`.

#### a. Módulo de Gestión de Propietarios (`residentes.html`)

*   **Selección de Apartamento Mejorada:** Se ha reemplazado el campo de texto libre por dos selectores (`<select>`) dinámicos para "Torre" y "Apartamento". Estos selectores se pueblan con datos de Firestore, mostrando las torres y apartamentos existentes.
*   **Visualización de Disponibilidad:** Los apartamentos ya asignados a un residente se muestran deshabilitados y con un estilo visual diferente en el selector, evitando duplicidades.
*   **Funcionalidad de Edición:** Se ha implementado la capacidad de editar residentes existentes. Al hacer clic en "Editar", el modal de registro se precarga con los datos del residente seleccionado, permitiendo su modificación y actualización en Firestore.
*   **Funcionalidad de Eliminación:** Se ha añadido la capacidad de eliminar residentes de la base de datos.
*   **Obtención Dinámica de `conjuntoId`:** El ID del conjunto residencial ahora se obtiene dinámicamente del usuario autenticado en Firebase, eliminando la necesidad de codificarlo.
*   **Corrección de Carga de Scripts:** Se ha asegurado que los scripts de Firebase se carguen correctamente y estén disponibles antes de la ejecución del JavaScript de la página, resolviendo errores de `firebase.auth is not a function`.
*   **Navegación Corregida:** El enlace a "Configuración" en la barra lateral ahora apunta correctamente a `estructura.html`.

#### b. Módulo de Estructura del Conjunto (`estructura.html`)

*   **Visualización Mejorada de Columnas:** Se han ajustado los estilos CSS para mejorar la distribución y el espaciado de las tres columnas (Torres, Apartamentos, Detalles).
*   **Resaltado de Selección:** Al seleccionar una torre o un apartamento, estos se resaltan visualmente para indicar la selección activa.
*   **Detalles de Apartamento:** La tercera columna ahora muestra los detalles del apartamento seleccionado, incluyendo información del propietario si está asignado.
*   **Corrección de Carga de Scripts:** Se ha asegurado que los scripts de Firebase se carguen correctamente y estén disponibles antes de la ejecución del JavaScript de la página, resolviendo errores de `firebase.auth is not a function`.

---

### 8. Nota Importante: Reglas de Seguridad de Firebase

Durante la fase de desarrollo, las reglas de seguridad de Firestore se han configurado para permitir acceso de lectura y escritura amplio (por ejemplo, `allow read, write: if request.time < timestamp.date(2026, 7, 12);`).

**Es CRÍTICO que, antes de desplegar el proyecto a un entorno de producción, estas reglas sean revisadas y endurecidas.** Se deben implementar reglas de seguridad que restrinjan el acceso a los datos basándose en la autenticación del usuario y sus roles (administrador, propietario), para proteger la información sensible y prevenir accesos no autorizados.

---
