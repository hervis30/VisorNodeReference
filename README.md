# FHIR API Server

Servidor Express modularizado para integración con servicios FHIR del Ministerio de Salud.

## Estructura del Proyecto

```
proyecto/
├── index.js                      # Servidor principal
├── package.json                  # Dependencias y scripts
├── services/                     # Servicios de negocio
│   ├── httpsAgent.js            # Servicio de autenticación OAuth2
│   ├── services.js              # Servicio principal FHIR
│   
├── routes/                       # Rutas modulares
│   ├── index.js                 # Rutas principales FHIR
│   ├── documentReference.js     # Rutas para documentos
│   
└── public/                       # Archivos estáticos
    └── visor.html              # Interfaz web
```

## Instalación

```bash
npm install
```

## Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

## Endpoints

### Autenticación
Todos los endpoints requieren:
- `clientId`: Client ID de Azure AD
- `clientSecret`: Client Secret de Azure AD  
- `subscriptionKey`: Clave de suscripción APIM

### Endpoints FHIR Principales (`/api`)

#### POST /api/fhir-summary
Obtiene el resumen longitudinal de un paciente.
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionKey": "...",
  "patientId": "123456"
}
```

#### POST /api/query-patient
Busca pacientes similares.
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionKey": "...",
  "idType": "CC",
  "idValue": "12345678",
  "given": "Juan",
  "family": "Pérez"
}
```

#### POST /api/patient-rda
Obtiene las RDAs de un paciente.
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionKey": "...",
  "patientId": "123456"
}
```

#### POST /api/composition-document
Obtiene el documento de una composición.
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionKey": "...",
  "compositionId": "comp-123"
}
```

### Endpoints de Documentos (`/api`)

#### GET /api/download-document
Descarga un documento RDA/Epicrisis.
```
?docId=doc-123&clientId=...&clientSecret=...&subscriptionKey=...
```

#### POST /api/document-metadata
Obtiene metadatos de un DocumentReference.
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionKey": "...",
  "docId": "doc-123"
}
```

### Endpoints del Tablero (`/api`)

#### POST /api/consulta-metrics
Obtiene métricas de consulta.

#### POST /api/usage-stats
Obtiene estadísticas de uso.

#### POST /api/error-report
Obtiene reporte de errores.

#### POST /api/export-data
Exporta datos del tablero.

#### GET /api/dashboard-config
Obtiene configuración del tablero.

### Endpoints de Testing (`/api`)

#### POST /api/compositions/search
Busca compositions por paciente.

#### POST /api/compositions/validate
Valida la estructura de una composition.

#### POST /api/compositions/generate-test
Genera una composition de prueba.

#### POST /api/compositions/full-test
Ejecuta test completo de composition.

## Servicios

### HttpsAgent (`services/httpsAgent.js`)
- Maneja autenticación OAuth2
- Realiza peticiones HTTP autenticadas
- Centraliza la gestión de tokens

### FhirService (`services/services.js`)
- Operaciones principales FHIR
- Gestión de pacientes, RDAs y compositions
- Abstrae la comunicación con la API FHIR



## Configuración



## Notas Técnicas

- El proyecto usa ES modules (`"type": "module"`)
- Todas las rutas están modularizadas por funcionalidad
- Los servicios están separados por responsabilidad
- Se incluye validación de parámetros en todos los endpoints
- Manejo centralizado de errores
- Logs de debug en consola

## Migración desde Código Original

Los endpoints originales se mantienen compatibles:
- `/api/fhir-summary` → Mismo endpoint
- `/api/query-patient` → Mismo endpoint  
- `/api/patient-rda` → Mismo endpoint
- `/api/composition-document` → Mismo endpoint
- `/api/download-document` → Mismo endpoint

Se agregaron nuevos endpoints para funcionalidades adicionales.# VisorNodeReference
