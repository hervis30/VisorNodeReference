import express from 'express';
import fhirService from '../services/services.js';

const router = express.Router();

/**
 * Endpoint para obtener resumen longitudinal de paciente
 */
router.post('/fhir-summary', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, patientId } = req.body;
        
        if (!clientId || !clientSecret || !subscriptionKey || !patientId) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos: clientId, clientSecret, subscriptionKey, patientId' 
            });
        }

        const result = await fhirService.getPatientSummary(
            patientId, 
            clientId, 
            clientSecret, 
        
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error en fhir-summary:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para buscar pacientes similares
 */
router.post('/query-patient', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, idType, idValue, given, family } = req.body;
        
        if (!clientId || !clientSecret || !subscriptionKey || !idType || !idValue) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos: clientId, clientSecret, subscriptionKey, idType, idValue' 
            });
        }

        const searchParams = { idType, idValue, given, family };
        const result = await fhirService.queryPatient(
            searchParams, 
            clientId, 
            clientSecret, 
        
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error en query-patient:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para obtener RDAs de paciente
 */
router.post('/patient-rda', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, patientId } = req.body;
        
        if (!clientId || !clientSecret || !subscriptionKey || !patientId) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos: clientId, clientSecret, subscriptionKey, patientId' 
            });
        }

        const result = await fhirService.getPatientRdas(
            patientId, 
            clientId, 
            clientSecret, 
        
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error en patient-rda:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint para obtener documento de composición
 */
router.post('/composition-document', async (req, res) => {
    try {
        const { clientId, clientSecret, subscriptionKey, compositionId } = req.body;
        
        if (!clientId || !clientSecret || !subscriptionKey || !compositionId) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos: clientId, clientSecret, subscriptionKey, compositionId' 
            });
        }

        const result = await fhirService.getCompositionDocument(
            compositionId, 
            clientId, 
            clientSecret, 
        
        );
        
        res.json(result);
    } catch (error) {
        console.error('Error en composition-document:', error);
        res.status(500).json({ error: error.message });
    }
});






export default router;