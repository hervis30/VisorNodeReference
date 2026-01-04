// consultas_rda_fixed.js - Código corregido con validaciones
const containerPatient = document.getElementById("accordion-body-patient");
const contenedor = document.getElementById('accordion-body-envios');
const contador = document.getElementById('contadorDocumentos');

// Configuración - REEMPLAZA CON TUS CREDENCIALES REALES
const CONFIG = {
    clientId: 'Contraseñas suministradas por el ministerio',
    clientSecret: 'Contraseñas suministradas por el ministerio',
    subscriptionKey: 'Contraseñas suministradas por el ministerio',
};


/**
 * Función principal para consultar información
 */
async function obtenerYConsultar(tipoDocumento, documento, clientId, clientSecret, subscriptionKey) {
    if (!documento || documento.trim() === "") {
        throw new Error("❌ No se proporcionó un número de documento válido");
    }

    if (!tipoDocumento || tipoDocumento.trim() === "") {
        throw new Error("❌ No se proporcionó un tipo de documento válido");
    }

    // Capturar fecha desde el input
    const fechaDesdeElement = document.getElementById('inputFechaDesde');
    const fechaDesde = fechaDesdeElement ? fechaDesdeElement.value : '';

    // Construir parámetros
    const parametros = {
        clientId: clientId,
        clientSecret: clientSecret,
        subscriptionKey: subscriptionKey,
        body: {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "identifier",
                    part: [
                        { name: "type", valueString: tipoDocumento },
                        { name: "value", valueString: documento.toString() }
                    ]
                }
            ]
        }
    };

    // ✅ Agregar fecha si existe
    if (fechaDesde) {
        parametros.body.parameter.push({
            name: "fechaDesde",
            valueDate: fechaDesde // formato YYYY-MM-DD
        });
    }

    console.log('📤 Parámetros enviados:', parametros);

    try {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        const response = await fetch('http://localhost:3001/api/composition', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(parametros)
        });

        const responseText = await response.text();

        if (!response.ok) {
            let errorMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || errorJson.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        return JSON.parse(responseText);
    } catch (error) {
        console.error("❌ Error en la petición:", error);
        throw error;
    }
}

/**
 * Función que maneja la consulta desde el botón
 */
async function manejarConsulta() {
    try {
        // Obtener elementos usando los IDs correctos
        const tipoDocumentoElement = document.getElementById('inputTipoDocumento');
        const numeroDocumentoElement = document.getElementById('inputDocumento');
        const fechaDesdeElement = document.getElementById('inputFechaDesde');
        const fechaDesde = fechaDesdeElement ? fechaDesdeElement.value : '';


        if (!tipoDocumentoElement) {
            console.error("❌ No se encontró inputTipoDocumento");
            alert('Error: No se encontró el selector de tipo de documento');
            return;
        }

        if (!numeroDocumentoElement) {
            console.error("❌ No se encontró inputDocumento");
            alert('Error: No se encontró el campo de número de documento');
            return;
        }

        // Obtener valores
        const tipoDocumento = tipoDocumentoElement.value;
        const numeroDocumento = numeroDocumentoElement.value;


        // Validaciones
        if (!numeroDocumento || numeroDocumento.trim() === '') {
            alert('Por favor ingrese un número de documento');
            numeroDocumentoElement.focus();
            return;
        }

        if (!tipoDocumento || tipoDocumento === '') {

            alert('Por favor seleccione un tipo de documento');
            tipoDocumentoElement.focus();
            return;
        }



        // Mostrar loading en el botón
        const boton = document.getElementById('consultaInfoIhce');
        if (boton) {
            const textoOriginal = boton.innerHTML;
            boton.disabled = true;
            boton.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Consultando...';

            try {
                // Llamar la función de consulta
                const resultado = await obtenerYConsultar(
                    tipoDocumento,
                    numeroDocumento.trim(),
                    CONFIG.clientId,
                    CONFIG.clientSecret,
                    CONFIG.subscriptionKey
                );

                // Procesar y mostrar resultados
                await procesarResultados(resultado);

            } finally {
                // Restaurar botón
                boton.disabled = false;
                boton.innerHTML = textoOriginal;
            }
        }

    } catch (error) {
        console.error("❌ Error en manejarConsulta:", error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Función para procesar y mostrar resultados
 */
async function procesarResultados(resultado) {
    try {



        const bundle = resultado; // si resultado es el Bundle raíz
        const compositions = bundle.entry?.filter(e =>
            e.resource.resourceType === 'Composition' &&
            e.resource.title === 'RDA Hospitalización'
        );



        // Buscar información del paciente con más debugging
        let paciente = null;

        if (resultado.referencedResources?.patients?.length > 0) {
            paciente = resultado.referencedResources.patients[0];

        } else {
            console.warn('⚠️ No se encontró recurso Patient en referencedResources');
        }

        mostrarPatient(paciente);
        mostrarResultados(resultado);
        mostrarPaginacion(resultado); // ✅ Agregamos paginación

    } catch (error) {
        console.error("Error procesando resultados:", error);
        throw error;
    }
}




function mostrarPaginacion(bundle) {
    const paginacionContainer = document.getElementById('paginacion');
    paginacionContainer.innerHTML = '';

    if (!bundle.link || bundle.link.length === 0) return;

    bundle.link.forEach(link => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-primary m-1';
        btn.textContent = link.relation === 'next' ? 'Siguiente' :
                          link.relation === 'previous' ? 'Anterior' :
                          link.relation === 'first' ? 'Primero' :
                          link.relation === 'last' ? 'Último' : link.relation;

        // ✅ Aquí usamos el backend para evitar CORS y manejar autenticación
        btn.addEventListener('click', async () => {
            try {
                const response = await fetch(`http://localhost:3001/composition/pagina?url=${encodeURIComponent(link.url)}&clientId=${CONFIG.clientId}&clientSecret=${CONFIG.clientSecret}&subscriptionKey=${CONFIG.subscriptionKey}`);
                const newBundle = await response.json();
                mostrarResultados(newBundle);
                mostrarPaginacion(newBundle);
            } catch (error) {
                console.error('Error cargando página:', error);
                alert('No se pudo cargar la página.');
            }
        });

        paginacionContainer.appendChild(btn);
    });
}


/**
 * Función para mostrar información del paciente
 */
function mostrarPatient(infoPatient) {
    if (!containerPatient) {
        console.error("No se encontró containerPatient");
        return;
    }

    containerPatient.innerHTML = "";

    if (!infoPatient) {

        containerPatient.innerHTML = "<p>No se encontró información del paciente.</p>";
        return;
    }



    // Extraer datos del Patient FHIR
    const nombres = infoPatient.name?.[0]?.given || [];
    const apellidos = infoPatient.name?.[0]?.family || '';
    const nombreCompleto = `${nombres.join(' ')} ${apellidos}`.trim();

    // Buscar el identificador correcto (cédula)
    const identificador = infoPatient.identifier?.find(id =>
        id.type?.coding?.some(coding =>
            coding.code === 'CC' || coding.display?.includes('dula')
        )
    )?.value || infoPatient.identifier?.[0]?.value || '';

    const fechaNacimiento = infoPatient.birthDate || '';



    containerPatient.innerHTML = `
        <table class="table table-bordered table-striped">
            <thead>
                <tr>
                    <th scope="col">Paciente</th>
                    <th scope="col">No. de Documento</th>
                    <th scope="col">Fecha de Nacimiento</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>${nombreCompleto || 'Sin nombre'}</td>
                    <td>${identificador || 'Sin documento'}</td>
                    <td>${fechaNacimiento || 'Sin fecha'}</td>
                </tr>
            </tbody>
        </table>
    `;
}

/**
 * Función para mostrar documentos
 */
function mostrarResultados(resultado) {
    if (!contenedor) {
        console.error("❌ No se encontró contenedor");
        return;
    }

    contenedor.innerHTML = '';

    if (resultado.entry && Array.isArray(resultado.entry) && resultado.entry.length > 0) {
        if (contador) {
            contador.textContent = resultado.entry.length;
            contador.style.display = 'inline-block';
        }

        const tabla = document.createElement('table');
        tabla.className = 'table table-bordered table-striped';

        tabla.innerHTML = `
            <thead class="table-dark">
                <tr>
                    <th>#</th>
                    <th>Formato</th>
                    <th>Región</th>
                    <th>Autor</th>
                    <th>Fecha Bundle</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const cuerpoTabla = tabla.querySelector('tbody');

        resultado.entry.forEach((entry, index) => {
            const recurso = entry.resource;
            let autor = 'Sin nombre';
            let ciudad = 'Sin ciudad';
            let patient = null;
            let organizacion = null;
            let practitioner = null;
            const organizacionDelRDA = obtenerOrganizacionDelRDA(recurso, resultado);
            const encounter = encounterMapper(recurso.resource);


            resultado.entry.forEach(e => {
                const recurso = e.resource;
                if (recurso.resourceType === "Encounter") {
                    const encounter = encounterMapper(recurso);
                    console.log("Encounter mapeado:", encounter);
                }
            });

                function encounterMapper(recurso) {
                    return {
                        id: recurso?.id || "Sin ID",
                        status: recurso?.status || "Sin estado",

                        type: Array.isArray(recurso?.type)
                            ? recurso.type.map(t => t.coding?.[0]?.display || "Sin tipo")
                            : ["Sin tipo"],

                        period: {
                            start: recurso?.period?.start || "No disponible",
                            end: recurso?.period?.end || "No disponible"
                        },

                        reasonCode: Array.isArray(recurso?.reasonCode)
                            ? recurso.reasonCode.map(r => r.coding?.[0]?.display || "Sin motivo")
                            : ["Sin motivo"],

                        diagnosis: Array.isArray(recurso?.diagnosis)
                            ? recurso.diagnosis.map(d => ({
                                tipo: d.use?.coding?.[0]?.display || "Sin rol",
                                detalle: d.extension?.[0]?.valueCoding?.display || "Sin detalle",
                                condicion: d.condition?.reference || "Sin condición"
                            }))
                            : [],

                        hospitalization: {
                            estadoEgreso:
                                recurso?.hospitalization?.extension?.[0]?.valueCoding?.display || "No especificado",
                            viaIngreso:
                                recurso?.hospitalization?.admitSource?.coding?.[0]?.display || "No especificada",
                            destino:
                                recurso?.hospitalization?.dischargeDisposition?.coding?.[0]?.display || "No especificado"
                        },

                        location: Array.isArray(recurso?.location)
                            ? recurso.location.map(l =>
                                l.location?.display || l.location?.reference || "Sin ubicación"
                            )
                            : ["Sin ubicación"],

                        serviceProvider: recurso?.serviceProvider?.reference || "Sin prestador"
                    };
                }

            // 🔹 VALIDACIÓN SEGURA DE PROCEDIMIENTOS
            const Procedure = resultado.referencedResources?.procedures?.filter(P => {
                const referencias = recurso.section?.flatMap(p => p.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(P.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE ADMINISTRACIÓN DE MEDICAMENTOS

            const MedicationAdministration = resultado.referencedResources?.medicationAdministrations?.filter(M => {
                const referencias = recurso.section?.flatMap(m => m.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(M.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE AntecedenteS FAMILIARES


            const Antecedente = resultado.referencedResources?.familyMemberHistories?.filter(A => {
                const referencias = recurso.section?.flatMap(a => a.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(A.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE MEDICAMENTOS
            const MedicamentoStatement = resultado.referencedResources?.medicationStatements?.filter(MS => {
                const referencias = recurso.section?.flatMap(ms => ms.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(MS.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE ALERGIAS
            const AllergyIntolerance = resultado.referencedResources?.allergyIntolerances?.filter(AL => {
                const referencias = recurso.section?.flatMap(al => al.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(AL.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE CONDICIONES MÉDICAS

            const condition = resultado.referencedResources?.conditions?.filter(C => {
                const referencias = recurso.section?.flatMap(co => co.entry?.map(e => e.reference?.split('/')[1])) || [];
                return referencias.includes(C.id);
            });

            // 🔹 VALIDACIÓN SEGURA DE ORGANIZACIÓN

            function obtenerOrganizacionDelRDA(recurso, resultado) {
                let organizacion = null;

                // Buscar organización desde custodian
                const orgRef = recurso.custodian?.reference || recurso.attester?.party?.reference;
                if (orgRef) {
                    const [, orgId] = orgRef.split('/');
                    organizacion = resultado?.referencedResources?.organizations?.find(
                        org => org.id === orgId
                    );
                }

                return organizacion;
            }

            // Buscar Practitioner - MEJORADO
            if (recurso.author?.[0]?.reference) {
                const [tipoProf, idProf] = recurso.author[0].reference.split('/');
                practitioner = resultado.referencedResources?.practitioners?.find(pr =>
                    pr.resourceType === tipoProf && pr.id === idProf
                );

            }

            // Búsqueda alternativa si no se encuentra por author
            if (!practitioner && resultado.referencedResources?.practitioners?.length > 0) {
                practitioner = resultado.referencedResources.practitioners[0];
              
            }

            // Buscar Patient
            if (recurso.subject?.reference) {
                const [tipoPat, idPat] = recurso.subject.reference.split('/');
                patient = resultado.referencedResources?.patients?.find(p =>
                    p.resourceType === tipoPat && p.id === idPat
                )
            }

            // Calcular edad si hay fecha de nacimiento
            let edad = 'N/A';
            if (patient?.birthDate) {
                const nacimiento = new Date(patient.birthDate);
                const hoy = new Date();
                edad = hoy.getFullYear() - nacimiento.getFullYear();
            }


            const fila = document.createElement('tr');
            fila.innerHTML = `
            <td>${index + 1}</td>
            <td>${recurso.title || 'RDA'}</td>
            <td>${organizacionDelRDA?.address?.[0]?.city || 'N/A'}</td>
            <td>${organizacionDelRDA?.name || 'N/A'}</td>
            <td>${recurso.date || recurso.meta?.lastUpdated || 'Sin fecha'}</td>
            `;

            fila.addEventListener('click', () => {

                const encounterRef = recurso.encounter?.reference; // viene de Composition
                let encounterData = null;

                if (encounterRef && resultado.referencedResources?.encounters) {
                    const [tipoEnc, idEnc] = encounterRef.split('/');
                    encounterData = resultado.referencedResources.encounters.find(
                        e => e.resourceType === tipoEnc && e.id === idEnc
                    );
                }

                const enc = encounterData ? encounterMapper(encounterData) : null;

                // 🔹 GENERAR CONTENIDO CON VALIDACIONES SEGURAS
                let contenido = ``;

                // ✅ Mostrar tarjeta SOLO si existe información del Encuentro
                if (enc) {
                    contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-primary text-white">
                                <h4 class="mb-0">Información del Encuentro</h4>
                            </div>
                            <div class="card-body">
                              
                                <p><strong>Estado:</strong> ${enc.status}</p>
                                <p><strong>Tipo:</strong> ${enc.type.join(", ")}</p>
                                <p><strong>Fecha de Inicio:</strong> ${enc.period.start}</p>
                                <p><strong>Fecha de Fin:</strong> ${enc.period.end}</p>
                                <p><strong>Motivo:</strong> ${enc.reasonCode.join(", ")}</p>
                                <p><strong>Ubicación:</strong> ${organizacionDelRDA?.address?.[0]?.city || 'N/A'}</p>
                
                                <hr>
                                <p><strong>Hospitalización:</strong></p>
                                <p>Estado de egreso: ${enc.hospitalization.estadoEgreso}</p>
                                <p>Vía de ingreso: ${enc.hospitalization.viaIngreso}</p>
                                <p>Destino: ${enc.hospitalization.destino}</p>
                
                                <hr>
                                <p><strong>Prestador:</strong> ${organizacionDelRDA?.name || 'N/A'}</p>
                            </div>
                        </div>
                    `;
                }

                // 🔹 Información del Paciente
                contenido += `
                    <div class="card mb-3 shadow-sm">
                        <div class="card-header bg-success text-white">
                            <h4 class="mb-0">Datos del Paciente</h4> 
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-12 col-md-6">
                                    <p><strong>Nombre:</strong> ${patient?.name?.[0]?.given?.join(' ') || ''} ${patient?.name?.[0]?.family || ''}</p>
                                    <p><strong>Edad:</strong> ${edad} años</p>
                                    <p><strong>Documento:</strong> ${patient?.identifier?.[0]?.value || 'N/A'}</p>
                                    <p><strong>Sexo Biológico:</strong> ${patient?.gender || 'N/A'}</p>
                                    <p><strong>Identidad de Género:</strong> ${patient?.extension?.find(e => e.url.includes('ExtensionPatientGenderIdentity'))?.valueCoding?.display || 'N/A'}</p>
                                    <p><strong>País de Nacimiento:</strong> ${patient?.extension?.find(e => e.url.includes('ExtensionPatientNationality'))?.valueCoding?.display || 'N/A'}</p>
                                </div>
                                <div class="col-12 col-md-6">
                                    <p><strong>País de Residencia:</strong> ${patient?.address?.[0]?.country || 'N/A'}</p>
                                    <p><strong>Municipio de Residencia:</strong> ${patient?.address?.[0]?.city || 'N/A'}</p>
                                    <p><strong>Departamento:</strong> ${patient?.address?.[0]?.state || 'N/A'}</p>
                                    <p><strong>Etnia:</strong> ${patient?.extension?.find(e => e.url.includes('ExtensionPatientEthnicity'))?.valueCoding?.display || 'N/A'}</p>
                                    <p><strong>Tipo Discapacidad:</strong> ${patient?.extension?.find(e => e.url.includes('ExtensionPatientDisability'))?.valueCoding?.display || 'N/A'}</p>
                                    <p><strong>Zona de Residencia:</strong> ${patient?.address?.[0]?.extension?.[0]?.valueCoding?.display || 'N/A'}</p>
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // 🔹 Lo mismo aplica con Organización y Profesional (ya tienes sus bloques abajo)


                // 🔹 AGREGAR CONDICIÓN MÉDICA SOLO SI EXISTE
                if (condition && condition.length > 0) {
                    condition.forEach(condition => {
                        contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-info text-white">
                                <h4 class="mb-0">Información del Diagnóstico</h4>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-12 col-md-6">
                                        
                                        <p><strong>Diagnóstico:</strong> ${condition.code?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Código CIE-10:</strong> ${condition.code?.coding?.[0]?.code || 'N/A'}</p>
                                        <p><strong>Estado clínico:</strong> ${condition.clinicalStatus?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Estado de verificación:</strong> ${condition.verificationStatus?.coding?.[0]?.display || 'N/A'}</p>
                                        
                                    </div>
                                    <div class="col-12 col-md-6">
                                        <p><strong>Fecha de Inicio:</strong> ${condition.onsetDateTime || condition.meta?.lastUpdated || 'N/A'}</p>
                                       
                                        
                                        <p><strong>Nota:</strong> ${condition.note?.[0]?.text || 'Sin notas'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    });
                }



                // 🔹 AGREGAR ALERGIA SOLO SI EXISTE
                if (AllergyIntolerance && AllergyIntolerance.length > 0) {
                    AllergyIntolerance.forEach(AllergyIntolerance => {
                        contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-danger text-white">
                                <h4 class="mb-0">Información de la Alergia</h4>
                            </div>
                            <div class="card-body">
                                <p><strong>Estado Clínico:</strong> ${AllergyIntolerance.clinicalStatus?.coding?.[0]?.display || 'N/A'}</p>
                               
                                <p><strong>Descripción:</strong> ${AllergyIntolerance.code?.text || 'N/A'}</p>
                                <p><strong>Última Actualización:</strong> ${AllergyIntolerance.meta?.lastUpdated || 'N/A'}</p>
                                <p><strong>Tipo de Alergia:</strong> ${AllergyIntolerance.code?.coding?.[0]?.display || 'N/A'}</p>
                                

                            </div>
                        </div>
                    `;
                    });
                }

                // 🔹 AGREGAR MEDICAMENTO SOLO SI EXISTE
                if (MedicamentoStatement && MedicamentoStatement.length > 0) {
                    MedicamentoStatement.forEach(MedicamentoStatement => {
                        contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-info text-white">
                                <h4 class="mb-0">Información del Medicamento</h4>
                            </div>
                            <div class="card-body">
                                
                                <p><strong>Estado:</strong> ${MedicamentoStatement.status || 'N/A'}</p>
                                <p><strong>Nombre del Medicamento:</strong> ${MedicamentoStatement.medicationCodeableConcept?.coding?.[0]?.display || 'N/A'}</p>
                                <p><strong>Código CUMS:</strong> ${MedicamentoStatement.medicationCodeableConcept?.coding?.[0]?.code || 'N/A'}</p>
                                <p><strong>Fecha de Registro:</strong> ${MedicamentoStatement.meta?.lastUpdated || 'N/A'}</p>
                            </div>
                        </div>
                    `;
                    });
                }



                if (Antecedente && Antecedente.length > 0) {
                    Antecedente.forEach(Antecedente => {
                        contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-warning text-white">
                                <h4 class="mb-0">Antecedente Familiar</h4>
                            </div>
                            <div class="card-body">
                                <p><strong>Estado:</strong> ${Antecedente.status || 'N/A'}</p>
                                
                                <p><strong>Relación Familiar:</strong> (${Antecedente.relationship?.coding?.[0]?.display || 'N/A'})</p>
                                <p><strong>Código de Relación:</strong> ${Antecedente.relationship?.coding?.[0]?.code || 'N/A'}</p>
                                <p><strong>Condición:</strong> ${Antecedente.condition?.[0]?.code?.coding?.[0]?.display || 'N/A'}</p>
                                <p><strong>Código ICD-10:</strong> ${Antecedente.condition?.[0]?.code?.coding?.[0]?.code || 'N/A'}</p>
                                <p><strong>Última Actualización:</strong> ${Antecedente.meta?.lastUpdated || 'N/A'}</p>
                            </div>
                        </div>
                    `;
                    });
                }


                // 🔹 AGREGAR ADMINISTRACIÓN DE MEDICAMENTO SOLO SI EXISTE
                if (MedicationAdministration && MedicationAdministration.length > 0) {
                    MedicationAdministration.forEach(MedicationAdministration => {
                        const extensionCantidad = MedicationAdministration.extension?.find(ext => ext.url.includes("ExtensionMedicationQuantity"));
                        const extensionDosis = MedicationAdministration.extension?.find(ext => ext.url.includes("ExtensionDoseQuantity"));

                        contenido += `
            <div class="card mb-3 shadow-sm">
                <div class="card-header bg-warning text-white">
                    <h4 class="mb-0">Administración de Medicamento</h4>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-12 col-md-6">
                            <p><strong>Estado:</strong> ${MedicationAdministration.status || 'N/A'}</p>
                            <p><strong>Fecha de Administración:</strong> ${MedicationAdministration.effectiveDateTime || 'N/A'}</p>
                            <p><strong>Nombre del Medicamento:</strong> ${MedicationAdministration.medicationCodeableConcept?.coding?.[0]?.display || 'N/A'}</p>
                            <p><strong>Código CUMS:</strong> ${MedicationAdministration.medicationCodeableConcept?.coding?.[0]?.code || 'N/A'}</p>
                            <p><strong>Cantidad Total:</strong> ${extensionCantidad?.valueQuantity?.value || 'N/A'} ${extensionCantidad?.valueQuantity?.unit || ''}</p>
                            <p><strong>Forma Farmacéutica:</strong> ${extensionDosis?.valueQuantity?.value || 'N/A'} ${extensionDosis?.valueQuantity?.unit || ''}</p>
                        </div>
                        <div class="col-12 col-md-6">
                            <p><strong>Categoría:</strong> ${MedicationAdministration.category?.coding?.[0]?.display || 'N/A'}</p>
                            <p><strong>Código de Categoría:</strong> ${MedicationAdministration.category?.coding?.[0]?.code || 'N/A'}</p>
                            <p><strong>Ruta de Administración:</strong> ${MedicationAdministration.dosage?.route?.coding?.[0]?.display || 'N/A'}</p>
                            <p><strong>Dosis:</strong> ${MedicationAdministration.dosage?.dose?.value || 'N/A'} ${MedicationAdministration.dosage?.dose?.unit || ''}</p>
                            <p><strong>Frecuencia:</strong> Cada ${MedicationAdministration.dosage?.rateQuantity?.value || 'N/A'} ${MedicationAdministration.dosage?.rateQuantity?.unit || ''}</p>
                            <p><strong>Última Actualización:</strong> ${MedicationAdministration.meta?.lastUpdated || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
                    });
                }

                // 🔹 AGREGAR PROCEDIMIENTO SOLO SI EXISTE
                if (Procedure && Procedure.length > 0) {
                    Procedure.forEach(Procedure => {
                        contenido += `
                        <div class="card mb-3 shadow-sm">
                            <div class="card-header bg-success text-white">
                                <h4 class="mb-0">Información del Procedimiento</h4> </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-12 col-md-6">                                   
                                        <p><strong>ID:</strong> ${Procedure.id || 'N/A'}</p>
                                        <p><strong>Estado:</strong> ${Procedure.status || 'N/A'}</p>
                                        <p><strong>Categoría:</strong> ${Procedure.category?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Código CUPS:</strong> ${Procedure.code?.coding?.[0]?.code || 'N/A'} - ${Procedure.code?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Fecha de realización:</strong> ${Procedure.performedDateTime || 'N/A'}</p>
                                        <p><strong>Método quirúrgico:</strong> ${Procedure.extension?.find(e => e.id === 'SurgicalMethod')?.valueCoding?.display || 'N/A'}</p>
                                    </div>
                                    <div class="col-12 col-md-6"> 
                                        <p><strong>Motivo:</strong> ${Procedure.reasonCode?.[0]?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Profesional:</strong> ${Procedure.performer?.[0]?.function?.coding?.[0]?.display || 'N/A'}</p>
                                        <p><strong>Paciente:</strong> ${Procedure.subject?.reference || 'N/A'}</p>
                                        <p><strong>Encuentro:</strong> ${Procedure.encounter?.reference || 'N/A'}</p>
                                        <p><strong>Diagnóstico principal:</strong> ${Procedure.reasonReference?.find(r => r.id === 'MainDiagnosis')?.reference || 'N/A'}</p>
                                        <p><strong>Comorbilidad:</strong> ${Procedure.reasonReference?.find(r => r.id === 'Comobility-1')?.reference || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    });
                }

                // 🔹 MOSTRAR MENSAJE SI NO HAY RECURSOS ADICIONALES
                const tieneRecursosAdicionales = condition || AllergyIntolerance || MedicamentoStatement || Antecedente || MedicationAdministration || Procedure;

                if (!tieneRecursosAdicionales) {
                    contenido += `
                        <div class="alert alert-info" role="alert">
                            <h4 class="alert-heading">ℹ️ Información Adicional</h4>
                            <p>No se encontraron recursos adicionales (diagnósticos, alergias, medicamentos, Antecedentes familiares, administraciones de medicamentos o procedimientos) para este paciente en este RDA.</p>
                        </div>
                    `;
                }

                document.getElementById('mostrarCompositions').innerHTML = contenido;
                const modal = new bootstrap.Modal(document.getElementById('exampleModal'));
                modal.show();
            });

            cuerpoTabla.appendChild(fila);
        });

        contenedor.appendChild(tabla);
    } else {
        if (contador) {
            contador.textContent = '0';
            contador.style.display = 'inline-block';
        }

        const mensaje = document.createElement('div');
        mensaje.className = 'alert alert-warning';
        mensaje.textContent = 'No se encontraron documentos para este paciente.';
        contenedor.appendChild(mensaje);
    }
}

/**
 * Inicialización cuando la página carga
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('📱 Página cargada completamente');

    const botonConsulta = document.getElementById('consultaInfoIhce');

    if (botonConsulta) {
        botonConsulta.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            manejarConsulta();
        });

    } else {
        console.error('❌ No se encontró el botón consultaInfoIhce');
    }

    // Hacer funciones disponibles globalmente para debugging
    window.manejarConsulta = manejarConsulta;
    window.obtenerYConsultar = obtenerYConsultar;
});