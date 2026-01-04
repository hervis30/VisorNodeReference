import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

 //Importar rutas (comentadas temporalmente para debug)
 
 import fhirRoutes from './src/routes/index.js';
 import documentRoutes from './src/routes/documentReference.js';


const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

// Para __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'src', 'public')));


import documentReferenceRoutes from './src/routes/documentReference.js';
app.use('/visor', documentReferenceRoutes);



// Usar rutas modulares (comentadas temporalmente)
 app.use('/api', fhirRoutes);
 app.use('/api', documentRoutes);
 app.use('/composition', documentReferenceRoutes);


// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pages', 'visor.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`App running on http://localhost:${PORT}`));