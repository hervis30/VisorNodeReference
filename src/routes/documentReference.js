import express from 'express';
import httpsAgent from '../services/httpsAgent.js';

const router = express.Router();

/**
 * Servicio para manejo de recursos FHIR
 */
class FHIRService {
    constructor() {
        this.baseUrl = 'https://sandbox.ihcecol.gov.co/ihce';
    }

    /**
     * Valida credenciales requeridas      https://sandbox.ihcecol.gov.co/ihce
     */
    validateCredentials(clientId, clientSecret, subscriptionKey) {
        if (!clientId || !clientSecret || !subscriptionKey) {
            throw new Error('Faltan credenciales: clientId, clientSecret, subscriptionKey son requeridos');
        }
    }

    /**
     * Obtiene token y hace request autenticado
     */
    async authenticatedRequest(endpoint, clientId, clientSecret, subscriptionKey, options = {}) {
        this.validateCredentials(clientId, clientSecret, subscriptionKey);
        const token = await httpsAgent.getAccessToken(clientId, clientSecret);
        const url = `${this.baseUrl}/${endpoint}`;
        return httpsAgent.authenticatedRequest(url, token, subscriptionKey, options);
    }

    /**
     * Obtiene token y hace POST autenticado
     */
    async authenticatedPOST(endpoint, clientId, clientSecret, subscriptionKey, body) {
        this.validateCredentials(clientId, clientSecret, subscriptionKey);
        const token = await httpsAgent.getAccessToken(clientId, clientSecret);
        const url = `${this.baseUrl}/${endpoint}`;
        return httpsAgent.authenticatedRequestPOST(url, token, subscriptionKey, body);
    }

    /**
     * Busca documentos por tipo y número de documento
     */
    async buscarDocumentos(tipoDocumento, documento, clientId, clientSecret, subscriptionKey) {
        const searchParams = new URLSearchParams({
            'identifier': `${tipoDocumento}|${documento}`,
            '_format': 'json'
        });

        const response = await this.authenticatedRequest(
            `DocumentReference?${searchParams.toString()}`,
            clientId, clientSecret, subscriptionKey
        );

        if (!response.ok) {
            throw new Error(`Error en búsqueda de documentos: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }



    /**
     * Obtiene un recurso por tipo e ID
     */
    async obtenerRecurso(resourceType, resourceId, clientId, clientSecret, subscriptionKey) {
        const response = await this.authenticatedRequest(
            `${resourceType}/${resourceId}`,
            clientId, clientSecret, subscriptionKey
        );

        if (!response.ok) {
            throw new Error(`Error obteniendo ${resourceType}: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Busca recursos con parámetros
     */
    async buscarRecursos(resourceType, searchParams, clientId, clientSecret, subscriptionKey) {
        const queryParams = new URLSearchParams(searchParams);
        const response = await this.authenticatedRequest(
            `${resourceType}?${queryParams.toString()}`,
            clientId, clientSecret, subscriptionKey
        );

        if (!response.ok) {
            throw new Error(`Error buscando ${resourceType}: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    /**
    
    /**
     * Consulta RDA para paciente
     */
    async consultarRDA(body, clientId, clientSecret, subscriptionKey) {
        const response = await this.authenticatedPOST(
            'Composition/$consultar-rda-paciente',
            clientId, clientSecret, subscriptionKey, body
        );

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error del servidor FHIR: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        return response.json();
    }

    /**
     * Obtiene recursos referenciados de un Composition
     */
    async obtenerRecursosReferenciados(compositionData, clientId, clientSecret, subscriptionKey) {
        const token = await httpsAgent.getAccessToken(clientId, clientSecret);
        const referencedResources = {
            patients: [], encounters: [], practitioners: [], organizations: [],
            conditions: [], allergyIntolerances: [], medicationStatements: [],
            medicationAdministrations: [], medicationRequests: [],
            familyMemberHistories: [], procedures: []
        };

        // Extraer referencias
        const allReferences = this.extractReferences(compositionData);


        // Obtener recursos en paralelo
        const fetchPromises = Array.from(allReferences).map(reference =>
            this.fetchSingleResource(reference, token, subscriptionKey)
                .then(resource => this.categorizeResource(resource, referencedResources))
                .catch(error => console.warn(`⚠️ No se pudo obtener recurso ${reference}:`, error.message))
        );

        await Promise.all(fetchPromises);

        return referencedResources;
    }

    /**
     * Extrae todas las referencias de los Compositions
     */
    extractReferences(compositionData) {
        const allReferences = new Set();

        if (!compositionData.entry) return allReferences;

        compositionData.entry.forEach(entry => {
            if (entry.resource?.resourceType === 'Composition') {
                const comp = entry.resource;

                // Referencias directas
                [comp.subject?.reference, comp.encounter?.reference, comp.custodian?.reference]
                    .filter(Boolean).forEach(ref => allReferences.add(ref));

                // Referencias en arrays
                [comp.author || [], comp.attester || []]
                    .flat()
                    .map(item => item.reference || item.party?.reference)
                    .filter(Boolean)
                    .forEach(ref => allReferences.add(ref));

                // Referencias en secciones
                (comp.section || [])
                    .flatMap(section => section.entry || [])
                    .map(entry => entry.reference)
                    .filter(Boolean)
                    .forEach(ref => allReferences.add(ref));
            }
        });

        return allReferences;
    }

    /**
     * Obtiene un recurso individual
     */
    async fetchSingleResource(reference, token, subscriptionKey) {
        const resourceUrl = reference.startsWith('http') ? reference : `${this.baseUrl}/${reference}`;
        const response = await httpsAgent.authenticatedRequest(resourceUrl, token, subscriptionKey);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Categoriza recursos por tipo
     */
    categorizeResource(resource, referencedResources) {
        if (!resource) return;

        const typeMap = {
            'Patient': 'patients',
            'Encounter': 'encounters',
            'Practitioner': 'practitioners',
            'Organization': 'organizations',
            'Condition': 'conditions',
            'AllergyIntolerance': 'allergyIntolerances',
            'MedicationStatement': 'medicationStatements',
            'MedicationAdministration': 'medicationAdministrations',
            'MedicationRequest': 'medicationRequests',
            'FamilyMemberHistory': 'familyMemberHistories',
            'Procedure': 'procedures'
        };

        const category = typeMap[resource.resourceType];
        if (category) {
            referencedResources[category].push(resource);
        } else {
            console.log(`🤔 Tipo de recurso no manejado: ${resource.resourceType}`);
        }
    }

    /**
     * Genera resumen de recursos
     */
    getResourceSummary(resources) {
        return {
            patients: resources.patients.length,
            encounters: resources.encounters.length,
            practitioners: resources.practitioners.length,
            organizations: resources.organizations.length,
            conditions: resources.conditions.length,
            allergies: resources.allergyIntolerances.length,
            medications: resources.medicationStatements.length +
                resources.medicationAdministrations.length +
                resources.medicationRequests.length,
            familyHistory: resources.familyMemberHistories.length,
            procedures: resources.procedures.length
        };
    }
}

const fhirService = new FHIRService();

/**
 * Middleware para extraer credenciales
 */
function extractCredentials(req, res, next) {
    const { clientId, clientSecret, subscriptionKey } = req.method === 'GET' ? req.query : req.body;

    if (!clientId || !clientSecret || !subscriptionKey) {
        return res.status(400).json({
            error: 'Faltan credenciales: clientId, clientSecret, subscriptionKey son requeridos'
        });
    }

    req.credentials = { clientId, clientSecret, subscriptionKey };
    next();
}

/**
 * Handler genérico para errores
 */
function handleError(error, res, context) {
    console.error(`❌ Error en ${context}:`, error);

    if (error.message.includes('404')) {
        return res.status(404).json({ error: `${context} no encontrado` });
    }

    res.status(500).json({
        error: `Error en ${context}`,
        details: error.message
    });
}

// ========== ENDPOINTS GET ==========

/**
 * GET - Obtener Composition por ID
 */
router.get('/composition/:id', extractCredentials, async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, clientSecret, subscriptionKey } = req.credentials;

        console.log(`🔍 Obteniendo Composition ID: ${id}`);
        const composition = await fhirService.obtenerRecurso('Composition', id, clientId, clientSecret, subscriptionKey);

        console.log(`✅ Composition obtenido: ${composition.resourceType} - ${composition.status}`);
        res.json(composition);

    } catch (error) {
        handleError(error, res, 'Composition');
    }
});

/**
 * GET - Obtener documento completo expandido
 */
router.get('/composition/:id/document', extractCredentials, async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, clientSecret, subscriptionKey } = req.credentials;

        console.log(`📄 Obteniendo documento completo para Composition ID: ${id}`);
        const documento = await fhirService.obtenerDocumentoCompleto(id, clientId, clientSecret, subscriptionKey);


        res.json(documento);

    } catch (error) {
        handleError(error, res, 'documento completo');
    }
});

/**
 * GET - Obtener Patient por ID
 */
router.get('/patient/:id', extractCredentials, async (req, res) => {
    try {
        const { id } = req.params;
        const { clientId, clientSecret, subscriptionKey } = req.credentials;

        console.log(`👤 Obteniendo Patient ID: ${id}`);
        const paciente = await fhirService.obtenerRecurso('Patient', id, clientId, clientSecret, subscriptionKey);


    } catch (error) {
        handleError(error, res, 'Patient');
    }
});


// ========== ENDPOINTS POST ==========

/**
 * POST - Consulta RDA completa con recursos referenciados
 */
router.post('/composition', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, body } = req.body;

        if (!body) {
            return res.status(400).json({ error: 'Body es requerido con los parámetros de búsqueda' });
        }

        // Consulta al servicio FHIR
        const result = await fhirService.consultarRDA(body, clientId, clientSecret, subscriptionKey);
        console.log('✅ Consulta exitosa, Compositions encontrados:', result.total || result.entry?.length || 0);

        // ✅ Filtrar por fecha si viene en parámetros
        const fechaParam = body.parameter.find(p => p.name === 'fechaDesde');
        if (fechaParam && fechaParam.valueDate) {
            const fechaFiltro = new Date(fechaParam.valueDate + 'T00:00:00'); // convertir a Date
            console.log('📅 Fecha filtro:', fechaParam.valueDate);
        
            const antesFiltro = result.entry?.length || 0;
            result.entry = result.entry.filter(e => {
                const fechaDocStr = e.resource.meta?.lastUpdated || ''; // usar meta.lastUpdated
                if (!fechaDocStr) return false;
                const fechaDoc = new Date(fechaDocStr);
                return fechaDoc >= fechaFiltro;
            });
            console.log(`🔍 Entradas antes del filtro: ${antesFiltro}, después del filtro: ${result.entry.length}`);
        }
        

        // ✅ Obtener recursos referenciados
        const referencedResources = await fhirService.obtenerRecursosReferenciados(result, clientId, clientSecret, subscriptionKey);

        // ✅ Respuesta completa
        const completeResult = {
            ...result,
            referencedResources,
            summary: {
                compositions: result.entry?.filter(e => e.resource?.resourceType === 'Composition').length || 0,
                ...fhirService.getResourceSummary(referencedResources)
            }
        };

        res.json(completeResult);
    } catch (error) {
        console.error('❌ Error en endpoint composition:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

/**
 * POST - Obtener metadatos de DocumentReference
 */
router.post('/document-metadata', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, docId } = req.body;

        if (!docId) {
            return res.status(400).json({ error: 'Falta parámetro requerido: docId' });
        }

        const result = await fhirService.obtenerRecurso('DocumentReference', docId, clientId, clientSecret, subscriptionKey);
        res.json(result);

    } catch (error) {
        handleError(error, res, 'metadatos del documento');
    }
});







router.get('/pagina', extractCredentials, async (req, res) => {
    try {
        const { url } = req.query;
        const token = await httpsAgent.getAccessToken(req.credentials.clientId, req.credentials.clientSecret);
        const response = await httpsAgent.authenticatedRequest(url, token, req.credentials.subscriptionKey);
        const bundle = await response.json();

        // ✅ Enriquecer con recursos referenciados
        const referencedResources = await fhirService.obtenerRecursosReferenciados(bundle, req.credentials.clientId, req.credentials.clientSecret, req.credentials.subscriptionKey);

        const completeResult = {
            ...bundle,
            referencedResources
        };

        res.json(completeResult);
    } catch (error) {
        console.error('❌ Error cargando página:', error);
        res.status(500).json({ error: 'Error cargando página', details: error.message });
    }
});

export default router;