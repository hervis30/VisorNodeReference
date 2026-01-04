

/**
 * Servicio unificado para operaciones FHIR
 */
class FHIRService {
    constructor() {
        this.baseUrls = {
            prod: 'https://sandbox.ihcecol.gov.co/ihce',
            
        };
        this.baseUrl = this.baseUrls.prod; // Default a sandbox
    }

}

// Exportar instancia única (Singleton)
export default new FHIRService();