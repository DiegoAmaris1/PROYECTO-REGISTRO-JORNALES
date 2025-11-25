// ===== VARIABLES GLOBALES =====
let modelsLoaded = false;
let employees = [];
let allRecords = [];
let registerStream = null;
let checkinStream = null;
let capturedDescriptor = null;
let recognitionInterval = null;
let selectedActivity = null;
let currentFilteredRecords = [];
let signatureData = null; // Almacena la firma del empleado
let signatureCanvas = null;
let signatureCtx = null;
let isDrawing = false;


const JORNAL_VALUE = 60000;

// ===== ACTIVIDADES POR NIVEL =====
const activitiesByLevel = {
    "1": [
        "Preparación de terreno",
        "Armado de capachos y sustratos",
        "Entrada de capachos",
        "Lavado y desinfección de coco",
        "Instalación y adecuación de riego",
        "Ajuste y mantenimiento de riego",
        "Preparación y mezcla de sustrato 4000",
        "Mezcla y preparación de sustrato",
        "Montaje y mantenimiento de rampas",
        "Control de humedad y ventilación"
    ],
    "2": [
        "Calado y trazado de siembra",
        "Siembra inicial",
        "Siembra de refuerzo",
        "Transplante de machos",
        "Reubicación de capachos",
        "Organización de plantas",
        "Organización de invernaderos",
        "Ajuste de riego siembra nueva"
    ],
    "3": [
        "Control fitosanitario integral",
        "Control de Botritis",
        "Fumigación y control de plagas",
        "Fumigación de machos",
        "Eliminación de enfermedades",
        "Desmalezado",
        "Podas de mantenimiento",
        "Poda de bajos",
        "Entutorado de plantas",
        "Aporque y sostenimiento de machos",
        "Limpieza general del cultivo",
        "Supervisión y riego"
    ],
    "4": [
        "Polinización controlada",
        "Polinización y control de anteras",
        "Supervisión de polinización",
        "Recolección de polen",
        "Preparación zona libre expo"
    ],
    "5": [
        "Cosecha general",
        "Cosecha y trillado",
        "Cosecha y siembra simultánea",
        "Aventado y trillado de semilla",
        "Secado y trillado de producto",
        "Lavado y limpieza de semilla",
        "Selección de semilla",
        "Clasificación de semilla",
        "Reubicación de bultos y empaque",
        "Control de calidad post-cosecha"
    ],
    "6": [
        "Limpieza y desinfección de invernadero",
        "Organización de capachos",
        "Registro de datos y organización",
        "Supervisión general",
        "Libre exposición y control ambiental"
    ]
};

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando sistema...');
    
    await loadData();
    updateClock();
    setInterval(updateClock, 1000);
    await loadFaceApiModels();
    initializeEventListeners();
    updateStats();
    populateFilters();
    
    console.log('✅ Sistema inicializado');
    console.log(`📊 Empleados: ${employees.length}, Registros: ${allRecords.length}`);
});

// ===== CARGAR MODELOS FACE-API =====
async function loadFaceApiModels() {
    try {
        console.log('Cargando modelos de IA...');
        updateLoadingStatus('Preparando sistema...');
        
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js no está disponible');
        }
        
        const modelUrls = [
            'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/',
            'https://justadudewhohacks.github.io/face-api.js/models/',
            '/models/'
        ];
        
        let loaded = false;
        
        for (let url of modelUrls) {
            try {
                console.log(`Intentando: ${url}`);
                updateLoadingStatus(`Cargando desde: ${url}`);
                
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(url),
                    faceapi.nets.faceLandmark68Net.loadFromUri(url),
                    faceapi.nets.faceRecognitionNet.loadFromUri(url)
                ]);
                
                loaded = true;
                console.log('✅ Modelos cargados');
                break;
            } catch (error) {
                console.warn(`❌ Falló: ${url}`);
            }
        }
        
        if (!loaded) {
            throw new Error('No se pudieron cargar los modelos');
        }
        
        modelsLoaded = true;
        updateLoadingStatus('✅ Sistema listo');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 500);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showCriticalError(error);
    }
}

function updateLoadingStatus(message) {
    const el = document.getElementById('loadingStatus');
    if (el) el.textContent = message;
}

function showCriticalError(error) {
    document.getElementById('loading').innerHTML = `
        <div style="color: red; padding: 40px;">
            <h2>❌ Error al cargar el sistema</h2>
            <p>${error.message}</p>
            <p>Verifica tu conexión a internet y recarga la página.</p>
            <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">
                🔄 Reintentar
            </button>
        </div>
    `;
}

// ===== RELOJ =====
function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('es-CO');
    const date = now.toLocaleDateString('es-CO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    document.getElementById('clock').textContent = `${date} - ${time}`;
}

// ===== PERSISTENCIA DE DATOS =====
function saveData() {
    try {
        localStorage.setItem('facial_employees', JSON.stringify(employees));
        localStorage.setItem('facial_records', JSON.stringify(allRecords));
        console.log('✅ Datos guardados en localStorage');
        console.log(`   📊 Empleados: ${employees.length}, Registros: ${allRecords.length}`);
    } catch (error) {
        console.error('❌ Error al guardar:', error);
        alert('Error al guardar datos: ' + error.message);
    }
}

function loadData() {
    try {
        // Cargar empleados
        const empData = localStorage.getItem('facial_employees');
        if (empData) {
            employees = JSON.parse(empData);
            console.log(`✅ ${employees.length} empleados cargados desde localStorage`);
        } else {
            console.log('ℹ️ No hay empleados previos');
        }
        
        // Cargar registros
        const recData = localStorage.getItem('facial_records');
        if (recData) {
            allRecords = JSON.parse(recData);
            console.log(`✅ ${allRecords.length} registros cargados desde localStorage`);
        } else {
            console.log('ℹ️ No hay registros previos');
        }
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        alert('Error al cargar datos guardados: ' + error.message);
    }
}
// ===== EVENT LISTENERS =====

function initializeEventListeners() {
    // Tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Tabs de firma
    document.querySelectorAll('.signature-tab').forEach(btn => {
        btn.addEventListener('click', () => switchSignatureTab(btn.dataset.sigTab));
    });

    // Firma digital
    initSignatureCanvas();
    document.getElementById('clearSignature').addEventListener('click', clearSignature);
    document.getElementById('selectSignatureFile').addEventListener('click', () => {
        document.getElementById('signatureUpload').click();
    });
    document.getElementById('signatureUpload').addEventListener('change', handleSignatureUpload);

    // Registro de empleados
    document.getElementById('startRegisterCamera').addEventListener('click', startRegisterCamera);
    document.getElementById('capturePhoto').addEventListener('click', capturePhoto);
    document.getElementById('saveEmployee').addEventListener('click', saveEmployee);

    // Check-in - Selección de actividad
    document.getElementById('checkinCiclo').addEventListener('change', handleCicloChange);
    document.getElementById('checkinNivel').addEventListener('change', handleNivelChange);
    document.getElementById('checkinActivity').addEventListener('change', handleActivityChange);
    document.getElementById('checkinHours').addEventListener('change', handleHoursChange);
    document.getElementById('continueToRecognition').addEventListener('click', continueToRecognition);
    document.getElementById('backToActivity').addEventListener('click', backToActivitySelection);

    // Check-in - Reconocimiento
    document.getElementById('startCheckinCamera').addEventListener('click', startCheckinCamera);
    document.getElementById('stopCheckinCamera').addEventListener('click', stopCheckinCamera);

    // Registros
    document.getElementById('exportRecords').addEventListener('click', exportRecords);
    document.getElementById('clearRecords').addEventListener('click', clearRecords);
    document.getElementById('clearEmployees').addEventListener('click', clearEmployees);

    // Jornadas
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('exportWorkdays').addEventListener('click', exportWorkdays);
    document.getElementById('deleteFilteredWorkdays').addEventListener('click', deleteFilteredWorkdays);

    // Reportes
    document.getElementById('refreshReports').addEventListener('click', generateReports);
    document.getElementById('exportDetailedReport').addEventListener('click', exportDetailedReport);
    document.getElementById('exportPDF').addEventListener('click', generatePDFReport);
    document.getElementById('clearAllData').addEventListener('click', clearAllData);
}

function switchSignatureTab(tabName) {
    document.querySelectorAll('.signature-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-sig-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.signature-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'draw') {
        document.getElementById('signatureDrawTab').classList.add('active');
    } else {
        document.getElementById('signatureUploadTab').classList.add('active');
    }
}

function initSignatureCanvas() {
    signatureCanvas = document.getElementById('signatureCanvas');
    signatureCtx = signatureCanvas.getContext('2d');
    
    signatureCtx.strokeStyle = '#000';
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    signatureCtx.lineJoin = 'round';

    // Mouse events
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);

    // Touch events
    signatureCanvas.addEventListener('touchstart', handleTouch);
    signatureCanvas.addEventListener('touchmove', handleTouch);
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.beginPath();
    signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signatureCtx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        signatureData = signatureCanvas.toDataURL('image/png');
    }
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    signatureCanvas.dispatchEvent(mouseEvent);
}

function clearSignature() {
    signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    signatureData = null;
}

function handleSignatureUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert('El archivo es muy grande. Máximo 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.getElementById('signaturePreview');
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            signatureData = canvas.toDataURL('image/png');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}


function switchTab(tabName) {
    stopAllCameras();

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${tabName}Panel`).classList.add('active');

    if (tabName === 'records') {
        displayRecords();
        updateStats();
    } else if (tabName === 'workdays') {
        displayWorkdays();
    } else if (tabName === 'reports') {
        generateReports();
    }
}

// ===== REGISTRO DE EMPLEADOS =====
async function startRegisterCamera() {
    if (!modelsLoaded) {
        showMessage('registerMessage', 'Espera a que se carguen los modelos', 'error');
        return;
    }

    try {
        registerStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        const video = document.getElementById('registerVideo');
        video.srcObject = registerStream;
        await video.play();
        
        document.getElementById('startRegisterCamera').disabled = true;
        document.getElementById('capturePhoto').disabled = false;
        
        showMessage('registerMessage', 'Cámara iniciada. Captura tu rostro.', 'info');
    } catch (error) {
        console.error('Error:', error);
        showMessage('registerMessage', 'No se pudo acceder a la cámara', 'error');
    }
}

async function capturePhoto() {
    const video = document.getElementById('registerVideo');
    const canvas = document.getElementById('registerCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    showMessage('registerMessage', 'Procesando rostro...', 'info');

    try {
        const detection = await faceapi
            .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            capturedDescriptor = detection.descriptor;
            
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 3;
            const box = detection.detection.box;
            ctx.strokeRect(box.x, box.y, box.width, box.height);
            
            document.getElementById('saveEmployee').disabled = false;
            showMessage('registerMessage', '✅ Rostro capturado. Completa los datos y guarda.', 'success');
        } else {
            showMessage('registerMessage', '❌ No se detectó rostro. Intenta de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('registerMessage', 'Error al procesar rostro', 'error');
    }
}

async function saveEmployee() {
    const name = document.getElementById('employeeName').value.trim();
    const id = document.getElementById('employeeId').value.trim();

    if (!name || !id) {
        showMessage('registerMessage', 'Completa todos los campos', 'error');
        return;
    }

    if (!capturedDescriptor) {
        showMessage('registerMessage', 'Captura el rostro primero', 'error');
        return;
    }

    if (!signatureData) {
        showMessage('registerMessage', 'Captura o carga la firma del empleado', 'error');
        return;
    }

    if (employees.find(emp => emp.id === id)) {
        showMessage('registerMessage', 'Ya existe un empleado con ese ID', 'error');
        return;
    }

    const employee = {
        name,
        id,
        descriptor: Array.from(capturedDescriptor),
        signature: signatureData,
        registeredAt: new Date().toISOString()
    };

    employees.push(employee);
    await saveData();

    // Limpiar formulario
    document.getElementById('employeeName').value = '';
    document.getElementById('employeeId').value = '';
    
    const canvas = document.getElementById('registerCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    clearSignature();
    
    capturedDescriptor = null;
    signatureData = null;
    
    document.getElementById('saveEmployee').disabled = true;
    document.getElementById('capturePhoto').disabled = true;
    
    stopCamera(registerStream);
    registerStream = null;
    document.getElementById('startRegisterCamera').disabled = false;

    showMessage('registerMessage', `✅ Empleado ${name} registrado exitosamente con firma digital`, 'success');
    updateStats();
    populateFilters();
}

function handleCicloChange() {
    updateContinueButton();
}

function handleHoursChange() {
    const hours = parseFloat(document.getElementById('checkinHours').value);
    const valorJornal = calculateJornal(hours);
    
    const display = document.getElementById('jornalAmount');
    display.textContent = `💰 Valor del Jornal: $${valorJornal.toLocaleString()} COP`;
    display.parentElement.classList.add('updated');
    
    setTimeout(() => {
        display.parentElement.classList.remove('updated');
    }, 500);
}

function calculateJornal(hours) {
    const valorPorHora = 7500; // $60,000 / 8 horas
    return Math.round(hours * valorPorHora);
}

function updateContinueButton() {
    const ciclo = document.getElementById('checkinCiclo').value;
    const nivel = document.getElementById('checkinNivel').value;
    const activity = document.getElementById('checkinActivity').value;
    
    document.getElementById('continueToRecognition').disabled = !(ciclo && nivel && activity);
}

// ===== CHECK-IN - SELECCIÓN DE ACTIVIDAD =====
function handleNivelChange() {
    const nivel = document.getElementById('checkinNivel').value;
    const activitySelect = document.getElementById('checkinActivity');
    
    activitySelect.innerHTML = '<option value="">Seleccionar actividad...</option>';
    activitySelect.disabled = false;
    
    if (nivel && activitiesByLevel[nivel]) {
        activitiesByLevel[nivel].forEach(activity => {
            const option = document.createElement('option');
            option.value = activity;
            option.textContent = activity;
            activitySelect.appendChild(option);
        });
    }
    
    updateContinueButton();
}

function handleActivityChange() {
    updateContinueButton();
}

function continueToRecognition() {
    const ciclo = document.getElementById('checkinCiclo').value;
    const nivel = document.getElementById('checkinNivel').value;
    const activity = document.getElementById('checkinActivity').value;
    const hours = parseFloat(document.getElementById('checkinHours').value);
    
    if (!ciclo || !nivel || !activity) {
        showMessage('checkinMessage', 'Completa todos los campos', 'error');
        return;
    }
    
    const valorJornal = calculateJornal(hours);
    
    selectedActivity = {
        ciclo: ciclo,
        nivel: `Nivel ${nivel}`,
        activity: activity,
        hours: hours,
        valorJornal: valorJornal
    };
    
    document.getElementById('activitySelection').style.display = 'none';
    document.getElementById('faceRecognition').style.display = 'block';
    document.getElementById('selectedActivityDisplay').innerHTML = `
        <strong>Ciclo:</strong> ${selectedActivity.ciclo}<br>
        <strong>Nivel:</strong> ${selectedActivity.nivel}<br>
        <strong>Actividad:</strong> ${selectedActivity.activity}<br>
        <strong>Horas:</strong> ${selectedActivity.hours} hrs<br>
        <strong>Valor:</strong> $${selectedActivity.valorJornal.toLocaleString()}
    `;
    
    showMessage('checkinMessage', 'Ahora inicia el reconocimiento facial', 'info');
}

function backToActivitySelection() {
    stopCheckinCamera();
    document.getElementById('faceRecognition').style.display = 'none';
    document.getElementById('activitySelection').style.display = 'block';
    document.getElementById('employeeInfo').style.display = 'none';
    selectedActivity = null;
}

// ===== CHECK-IN - RECONOCIMIENTO FACIAL =====
async function startCheckinCamera() {
    if (!modelsLoaded) {
        showMessage('checkinMessage', 'Espera a que se carguen los modelos', 'error');
        return;
    }

    if (employees.length === 0) {
        showMessage('checkinMessage', 'No hay empleados registrados', 'error');
        return;
    }

    if (!selectedActivity) {
        showMessage('checkinMessage', 'Selecciona una actividad primero', 'error');
        return;
    }

    try {
        checkinStream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        const video = document.getElementById('checkinVideo');
        video.srcObject = checkinStream;
        await video.play();
        
        document.getElementById('startCheckinCamera').disabled = true;
        document.getElementById('stopCheckinCamera').disabled = false;
        document.getElementById('employeeInfo').style.display = 'none';
        
        showMessage('checkinMessage', '🔍 Reconocimiento activo...', 'info');
        
        recognitionInterval = setInterval(recognizeFace, 1000);
    } catch (error) {
        console.error('Error:', error);
        showMessage('checkinMessage', 'No se pudo acceder a la cámara', 'error');
    }
}

async function recognizeFace() {
    const video = document.getElementById('checkinVideo');
    const canvas = document.getElementById('checkinCanvas');
    
    if (!video.videoWidth || !video.videoHeight) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    try {
        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
            ctx.strokeStyle = '#27ae60';
            ctx.lineWidth = 3;
            const box = detection.detection.box;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            const descriptor = detection.descriptor;
            let bestMatch = null;
            let bestDistance = 0.6;

            for (const employee of employees) {
                const savedDescriptor = new Float32Array(employee.descriptor);
                const distance = faceapi.euclideanDistance(descriptor, savedDescriptor);
                
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = employee;
                }
            }

            if (bestMatch) {
                const today = new Date().toLocaleDateString('es-CO');
                const alreadyCheckedIn = allRecords.some(
                    record => record.employeeId === bestMatch.id && 
                    new Date(record.timestamp).toLocaleDateString('es-CO') === today
                );

                if (alreadyCheckedIn) {
                    showMessage('checkinMessage', `⚠️ ${bestMatch.name} ya registró entrada hoy`, 'info');
                } else {
                    await registerEntry(bestMatch);
                }
                
                stopCheckinCamera();
            }
        }
    } catch (error) {
        console.error('Error en reconocimiento:', error);
    }
}

async function registerEntry(employee) {
    const now = new Date();
    const entry = {
        employeeId: employee.id,
        employeeName: employee.name,
        ciclo: selectedActivity.ciclo,
        nivel: selectedActivity.nivel,
        activity: selectedActivity.activity,
        hours: selectedActivity.hours,
        valorJornal: selectedActivity.valorJornal,
        signature: employee.signature,
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString('es-CO'),
        date: now.toLocaleDateString('es-CO')
    };

    allRecords.push(entry);
    await saveData();

    document.getElementById('infoName').textContent = employee.name;
    document.getElementById('infoId').textContent = employee.id;
    document.getElementById('infoNivel').textContent = selectedActivity.nivel;
    document.getElementById('infoActivity').textContent = selectedActivity.activity;
    document.getElementById('infoTime').textContent = entry.time;
    
    // Actualizar el success box con la nueva información
    const successBox = document.getElementById('employeeInfo');
    successBox.querySelector('table').innerHTML = `
        <tr><td><strong>Empleado:</strong></td><td>${employee.name}</td></tr>
        <tr><td><strong>ID:</strong></td><td>${employee.id}</td></tr>
        <tr><td><strong>Ciclo:</strong></td><td>${selectedActivity.ciclo}</td></tr>
        <tr><td><strong>Nivel:</strong></td><td>${selectedActivity.nivel}</td></tr>
        <tr><td><strong>Actividad:</strong></td><td>${selectedActivity.activity}</td></tr>
        <tr><td><strong>Horas:</strong></td><td>${selectedActivity.hours} hrs</td></tr>
        <tr><td><strong>Hora Entrada:</strong></td><td>${entry.time}</td></tr>
        <tr class="highlight"><td><strong>Valor Jornal:</strong></td><td>💰 $${selectedActivity.valorJornal.toLocaleString()}</td></tr>
    `;
    
    successBox.style.display = 'block';

    showMessage('checkinMessage', `✅ Entrada registrada para ${employee.name}`, 'success');
    updateStats();
}

function stopCheckinCamera() {
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
        recognitionInterval = null;
    }
    
    stopCamera(checkinStream);
    checkinStream = null;
    
    document.getElementById('startCheckinCamera').disabled = false;
    document.getElementById('stopCheckinCamera').disabled = true;
    
    const canvas = document.getElementById('checkinCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ===== REGISTROS DE HOY =====
function displayRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = '';

    const today = new Date().toLocaleDateString('es-CO');
    const todayRecords = allRecords.filter(r => 
        new Date(r.timestamp).toLocaleDateString('es-CO') === today
    );

    if (todayRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No hay registros hoy</td></tr>';
        return;
    }

    const sorted = [...todayRecords].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );

    sorted.forEach(record => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${record.time}</td>
            <td>${record.employeeName}</td>
            <td>${record.employeeId}</td>
            <td>${record.ciclo || 'N/A'}</td>
            <td>${record.nivel}</td>
            <td>${record.activity}</td>
            <td>${record.hours} hrs</td>
            <td>$${record.valorJornal.toLocaleString()}</td>
        `;
    });
}

function updateStats() {
    const today = new Date().toLocaleDateString('es-CO');
    const todayRecords = allRecords.filter(r => 
        new Date(r.timestamp).toLocaleDateString('es-CO') === today
    );

    const totalPayment = todayRecords.reduce((sum, r) => sum + (r.valorJornal || 60000), 0);

    document.getElementById('totalEmployees').textContent = employees.length;
    document.getElementById('totalEntries').textContent = todayRecords.length;
    document.getElementById('totalPayment').textContent = `$${totalPayment.toLocaleString()}`;
}

function exportRecords() {
    const today = new Date().toLocaleDateString('es-CO');
    const todayRecords = allRecords.filter(r => 
        new Date(r.timestamp).toLocaleDateString('es-CO') === today
    );

    if (todayRecords.length === 0) {
        alert('No hay registros para exportar');
        return;
    }

    let csv = 'Hora,Nombre,ID,Ciclo,Nivel,Actividad,Horas,Valor\n';
    todayRecords.forEach(r => {
        csv += `${r.time},"${r.employeeName}",${r.employeeId},"${r.ciclo || 'N/A'}","${r.nivel}","${r.activity}",${r.hours},${r.valorJornal}\n`;
    });

    downloadCSV(csv, `registros-${today.replace(/\//g, '-')}.csv`);
}


async function clearRecords() {
    if (confirm('¿Eliminar todos los registros de hoy?')) {
        const today = new Date().toLocaleDateString('es-CO');
        allRecords = allRecords.filter(r => 
            new Date(r.timestamp).toLocaleDateString('es-CO') !== today
        );
        await saveData();
        displayRecords();
        updateStats();
        showMessage('recordsMessage', 'Registros eliminados', 'success');
    }
}

async function clearEmployees() {
    if (employees.length === 0) {
        showMessage('recordsMessage', 'No hay empleados para eliminar', 'info');
        return;
    }
    
    if (confirm(`¿Eliminar los ${employees.length} empleados? Esta acción no se puede deshacer.`)) {
        employees = [];
        await saveData();
        updateStats();
        populateFilters();
        showMessage('recordsMessage', 'Empleados eliminados', 'success');
    }
}

// ===== JORNADAS =====
function displayWorkdays() {
    const tbody = document.getElementById('workdaysBody');
    tbody.innerHTML = '';

    if (allRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No hay jornadas registradas</td></tr>';
        updateWorkdaysStats(allRecords);
        return;
    }

    // Agrupar por empleado
    const grouped = {};
    allRecords.forEach(record => {
        const key = record.employeeId;
        if (!grouped[key]) {
            grouped[key] = {
                employeeName: record.employeeName,
                employeeId: record.employeeId,
                signature: record.signature,
                records: []
            };
        }
        grouped[key].records.push(record);
    });

    Object.values(grouped).forEach(emp => {
        emp.records.forEach((record) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${record.employeeName}</td>
                <td>${record.employeeId}</td>
                <td>${record.ciclo || 'N/A'}</td>
                <td>${record.nivel}</td>
                <td>${record.activity}</td>
                <td>${record.date}</td>
                <td>${record.hours} hrs</td>
                <td>$${record.valorJornal.toLocaleString()}</td>
                <td class="signature-cell">
                    ${emp.signature ? `<img src="${emp.signature}" alt="Firma">` : '<span class="no-signature">Sin firma</span>'}
                </td>
            `;
        });
    });

    updateWorkdaysStats(allRecords);
}

function updateWorkdaysStats(records) {
    const totalPayment = records.reduce((sum, r) => sum + (r.valorJornal || 60000), 0);
    
    document.getElementById('totalWorkdays').textContent = records.length;
    document.getElementById('totalAccumulated').textContent = `$${totalPayment.toLocaleString()}`;
}


function applyFilters() {
    const employeeFilter = document.getElementById('filterEmployee').value;
    const monthFilter = document.getElementById('filterMonth').value;
    const activityFilter = document.getElementById('filterActivity').value;

    let filtered = [...allRecords];

    if (employeeFilter) {
        filtered = filtered.filter(r => r.employeeId === employeeFilter);
    }

    if (monthFilter) {
        filtered = filtered.filter(r => {
            const date = new Date(r.timestamp);
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthFilter;
        });
    }

    if (activityFilter) {
        filtered = filtered.filter(r => r.activity === activityFilter);
    }

    currentFilteredRecords = filtered;

    const deleteBtn = document.getElementById('deleteFilteredWorkdays');
    if (filtered.length > 0 && (employeeFilter || monthFilter || activityFilter)) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = `🗑️ Eliminar Filtradas (${filtered.length})`;
    } else {
        deleteBtn.disabled = true;
        deleteBtn.textContent = '🗑️ Eliminar Filtradas';
    }

    const tbody = document.getElementById('workdaysBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="no-data">No hay resultados</td></tr>';
        updateWorkdaysStats([]);
        return;
    }

    filtered.forEach(record => {
        const employee = employees.find(e => e.id === record.employeeId);
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${record.employeeName}</td>
            <td>${record.employeeId}</td>
            <td>${record.ciclo || 'N/A'}</td>
            <td>${record.nivel}</td>
            <td>${record.activity}</td>
            <td>${record.date}</td>
            <td>${record.hours} hrs</td>
            <td>$${record.valorJornal.toLocaleString()}</td>
            <td class="signature-cell">
                ${employee?.signature ? `<img src="${employee.signature}" alt="Firma">` : '<span class="no-signature">Sin firma</span>'}
            </td>
        `;
    });

    updateWorkdaysStats(filtered);
}


function populateFilters() {
    // Filtro de empleados
    const empSelect = document.getElementById('filterEmployee');
    empSelect.innerHTML = '<option value="">Todos</option>';
    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.textContent = emp.name;
        empSelect.appendChild(option);
    });

    // Filtro de meses
    const monthSelect = document.getElementById('filterMonth');
    monthSelect.innerHTML = '<option value="">Todos</option>';
    const months = new Set();
    allRecords.forEach(r => {
        const date = new Date(r.timestamp);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(month);
    });
    [...months].sort().forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });

    // Filtro de actividades
    const actSelect = document.getElementById('filterActivity');
    actSelect.innerHTML = '<option value="">Todas</option>';
    const activities = new Set();
    allRecords.forEach(r => activities.add(r.activity));
    [...activities].sort().forEach(act => {
        const option = document.createElement('option');
        option.value = act;
        option.textContent = act;
        actSelect.appendChild(option);
    });
}

function exportWorkdays() {
    if (allRecords.length === 0) {
        alert('No hay jornadas para exportar');
        return;
    }

    let csv = 'Empleado,ID,Ciclo,Nivel,Actividad,Fecha,Horas,Valor\n';
    allRecords.forEach(r => {
        csv += `"${r.employeeName}",${r.employeeId},"${r.ciclo || 'N/A'}","${r.nivel}","${r.activity}",${r.date},${r.hours},${r.valorJornal}\n`;
    });

    downloadCSV(csv, 'jornadas-completas.csv');
}

// ===== REPORTES =====
function generateReports() {
    // Stats generales
    document.getElementById('reportTotalJornadas').textContent = allRecords.length;
    document.getElementById('reportTotalPagos').textContent = 
        `$${(allRecords.length * JORNAL_VALUE).toLocaleString()}`;
    
    const uniqueActivities = new Set(allRecords.map(r => r.activity));
    document.getElementById('reportActividades').textContent = uniqueActivities.size;

    // ===== CONTINUACIÓN DEL JAVASCRIPT (PARTE FINAL) =====

    // Top actividades
    generateActivityMetrics();
    generateEmployeeMetrics();
    generateLevelMetrics();
}

function generateActivityMetrics() {
    const activityCount = {};
    allRecords.forEach(r => {
        activityCount[r.activity] = (activityCount[r.activity] || 0) + 1;
    });

    const sorted = Object.entries(activityCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const container = document.getElementById('activityMetrics');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos</p>';
        return;
    }

    const maxCount = sorted[0][1];
    
    container.innerHTML = sorted.map(([activity, count]) => {
        const percentage = (count / maxCount) * 100;
        const total = count * JORNAL_VALUE;
        return `
            <div class="metric-item">
                <div class="metric-label">
                    <span>${activity}</span>
                    <span>${count} veces - $${total.toLocaleString()}</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${percentage}%">${count}</div>
                </div>
            </div>
        `;
    }).join('');
}

function generateEmployeeMetrics() {
    const employeeCount = {};
    allRecords.forEach(r => {
        if (!employeeCount[r.employeeId]) {
            employeeCount[r.employeeId] = {
                name: r.employeeName,
                count: 0
            };
        }
        employeeCount[r.employeeId].count++;
    });

    const sorted = Object.entries(employeeCount)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const container = document.getElementById('employeeMetrics');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos</p>';
        return;
    }

    const maxCount = sorted[0].count;
    
    container.innerHTML = sorted.map(emp => {
        const percentage = (emp.count / maxCount) * 100;
        const total = emp.count * JORNAL_VALUE;
        return `
            <div class="metric-item">
                <div class="metric-label">
                    <span>${emp.name} (${emp.id})</span>
                    <span>${emp.count} jornadas - $${total.toLocaleString()}</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${percentage}%">${emp.count}</div>
                </div>
            </div>
        `;
    }).join('');
}

function generateLevelMetrics() {
    const levelCount = {};
    allRecords.forEach(r => {
        levelCount[r.nivel] = (levelCount[r.nivel] || 0) + 1;
    });

    const sorted = Object.entries(levelCount)
        .sort((a, b) => a[0].localeCompare(b[0]));

    const container = document.getElementById('levelMetrics');
    
    if (sorted.length === 0) {
        container.innerHTML = '<p class="no-data">No hay datos</p>';
        return;
    }

    const maxCount = Math.max(...sorted.map(([_, count]) => count));
    
    container.innerHTML = sorted.map(([nivel, count]) => {
        const percentage = (count / maxCount) * 100;
        const total = count * JORNAL_VALUE;
        return `
            <div class="metric-item">
                <div class="metric-label">
                    <span>${nivel}</span>
                    <span>${count} jornadas - $${total.toLocaleString()}</span>
                </div>
                <div class="metric-bar">
                    <div class="metric-fill" style="width: ${percentage}%">${count}</div>
                </div>
            </div>
        `;
    }).join('');
}

function exportDetailedReport() {
    if (allRecords.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    let csv = 'REPORTE COMPLETO DE JORNADAS\n\n';
    csv += 'Empleado,ID,Nivel,Actividad,Fecha,Hora,Valor\n';
    
    allRecords.forEach(r => {
        csv += `"${r.employeeName}",${r.employeeId},"${r.nivel}","${r.activity}",${r.date},${r.time},${r.valorJornal}\n`;
    });

    csv += `\n\nTOTAL JORNADAS,${allRecords.length}\n`;
    csv += `TOTAL PAGADO,$${(allRecords.length * JORNAL_VALUE).toLocaleString()}\n`;

    downloadCSV(csv, 'reporte-completo.csv');
}
// ===== ELIMINAR JORNADAS FILTRADAS =====
async function deleteFilteredWorkdays() {
    if (currentFilteredRecords.length === 0) {
        alert('No hay jornadas filtradas para eliminar');
        return;
    }

    const employeeFilter = document.getElementById('filterEmployee').value;
    const monthFilter = document.getElementById('filterMonth').value;
    const activityFilter = document.getElementById('filterActivity').value;

    // Construir mensaje descriptivo
    let filterDescription = 'las siguientes jornadas filtradas:\n\n';
    
    if (employeeFilter) {
        const empName = employees.find(e => e.id === employeeFilter)?.name || employeeFilter;
        filterDescription += `👤 Empleado: ${empName}\n`;
    }
    if (monthFilter) {
        filterDescription += `📅 Mes: ${monthFilter}\n`;
    }
    if (activityFilter) {
        filterDescription += `🔧 Actividad: ${activityFilter}\n`;
    }
    
    const totalAmount = currentFilteredRecords.length * JORNAL_VALUE;
    filterDescription += `\n📊 Total: ${currentFilteredRecords.length} jornadas`;
    filterDescription += `\n💰 Monto: $${totalAmount.toLocaleString()}`;
    filterDescription += `\n\n⚠️ ESTA ACCIÓN NO SE PUEDE DESHACER`;

    const confirmation = confirm(`¿Eliminar ${filterDescription}?`);
    
    if (!confirmation) {
        return;
    }

    // Segunda confirmación para seguridad
    const doubleCheck = confirm(
        `⚠️ ÚLTIMA CONFIRMACIÓN\n\n` +
        `Se eliminarán ${currentFilteredRecords.length} jornadas PERMANENTEMENTE.\n\n` +
        `¿Estás completamente seguro?`
    );

    if (!doubleCheck) {
        return;
    }

    try {
        // Obtener IDs únicos de los registros a eliminar
        const idsToDelete = new Set(
            currentFilteredRecords.map(r => r.timestamp)
        );

        // Filtrar allRecords eliminando los que coinciden
        const recordsBeforeDelete = allRecords.length;
        allRecords = allRecords.filter(r => !idsToDelete.has(r.timestamp));
        const recordsDeleted = recordsBeforeDelete - allRecords.length;

        // Guardar cambios
        await saveData();

        // Limpiar filtros
        document.getElementById('filterEmployee').value = '';
        document.getElementById('filterMonth').value = '';
        document.getElementById('filterActivity').value = '';
        currentFilteredRecords = [];

        // Actualizar interfaz
        displayWorkdays();
        populateFilters();

        // Mensaje de éxito
        alert(
            `✅ Eliminación exitosa\n\n` +
            `🗑️ Jornadas eliminadas: ${recordsDeleted}\n` +
            `💰 Monto eliminado: $${(recordsDeleted * JORNAL_VALUE).toLocaleString()}\n` +
            `📊 Jornadas restantes: ${allRecords.length}`
        );

        console.log(`✅ ${recordsDeleted} jornadas eliminadas correctamente`);

    } catch (error) {
        console.error('❌ Error al eliminar jornadas:', error);
        alert('❌ Error al eliminar jornadas: ' + error.message);
    }
}

// ===== UTILIDADES =====
function stopCamera(stream) {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

function stopAllCameras() {
    stopCamera(registerStream);
    stopCamera(checkinStream);
    registerStream = null;
    checkinStream = null;
    
    if (recognitionInterval) {
        clearInterval(recognitionInterval);
        recognitionInterval = null;
    }
    
    document.getElementById('startRegisterCamera').disabled = false;
    document.getElementById('capturePhoto').disabled = true;
    document.getElementById('saveEmployee').disabled = true;
    document.getElementById('startCheckinCamera').disabled = false;
    document.getElementById('stopCheckinCamera').disabled = true;
}

function showMessage(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.className = `message ${type}`;
    el.style.display = 'block';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function clearAllData() {
    const totalEmpleados = employees.length;
    const totalRegistros = allRecords.length;
    const totalPago = allRecords.reduce((sum, r) => sum + (r.valorJornal || 60000), 0);

    if (totalEmpleados === 0 && totalRegistros === 0) {
        showMessage('reportsMessage', 'No hay datos para eliminar', 'info');
        return;
    }

    // Construir mensaje detallado
    let mensaje = '⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n';
    mensaje += 'Estás a punto de ELIMINAR PERMANENTEMENTE:\n\n';
    
    if (totalEmpleados > 0) {
        mensaje += `👤 ${totalEmpleados} Empleado${totalEmpleados > 1 ? 's' : ''} registrado${totalEmpleados > 1 ? 's' : ''}\n`;
    }
    
    if (totalRegistros > 0) {
        mensaje += `📋 ${totalRegistros} Jornada${totalRegistros > 1 ? 's' : ''} registrada${totalRegistros > 1 ? 's' : ''}\n`;
        mensaje += `💰 Monto total: $${totalPago.toLocaleString('es-CO')}\n`;
    }
    
    mensaje += '\n🔴 ESTA ACCIÓN NO SE PUEDE DESHACER\n';
    mensaje += '🔴 Se perderán todos los reconocimientos faciales\n';
    mensaje += '🔴 Se perderán todas las firmas digitales\n';
    mensaje += '🔴 Se perderá todo el historial de pagos\n\n';
    mensaje += '¿Estás COMPLETAMENTE seguro?';

    const primeraConfirmacion = confirm(mensaje);
    
    if (!primeraConfirmacion) {
        console.log('❌ Eliminación cancelada por el usuario');
        return;
    }

    // Segunda confirmación de seguridad
    const palabraClave = 'ELIMINAR';
    const confirmacionTexto = prompt(
        `⚠️ ÚLTIMA CONFIRMACIÓN ⚠️\n\n` +
        `Para confirmar la eliminación permanente de:\n` +
        `• ${totalEmpleados} empleados\n` +
        `• ${totalRegistros} jornadas\n` +
        `• $${totalPago.toLocaleString('es-CO')} en pagos\n\n` +
        `Escribe la palabra: ${palabraClave}`
    );

    if (confirmacionTexto !== palabraClave) {
        alert('❌ Palabra incorrecta. Eliminación cancelada por seguridad.');
        console.log('❌ Palabra de confirmación incorrecta');
        return;
    }

    try {
        console.log('🗑️ Iniciando eliminación completa de datos...');
        
        // Guardar datos antes de eliminar (por si acaso)
        const backupEmpleados = [...employees];
        const backupRegistros = [...allRecords];
        
        // Limpiar arrays
        employees = [];
        allRecords = [];
        currentFilteredRecords = [];
        
        // Guardar en localStorage
        await saveData();
        
        // Limpiar localStorage completamente
        localStorage.removeItem('facial_employees');
        localStorage.removeItem('facial_records');
        
        console.log('✅ Datos eliminados correctamente');
        console.log(`   📊 Empleados eliminados: ${totalEmpleados}`);
        console.log(`   📊 Registros eliminados: ${totalRegistros}`);
        console.log(`   💰 Monto eliminado: $${totalPago.toLocaleString('es-CO')}`);
        
        // Actualizar todas las interfaces
        updateStats();
        displayRecords();
        displayWorkdays();
        populateFilters();
        generateReports();
        
        // Mensaje de éxito
        const mensajeExito = 
            `✅ ELIMINACIÓN COMPLETADA\n\n` +
            `🗑️ Empleados eliminados: ${totalEmpleados}\n` +
            `🗑️ Jornadas eliminadas: ${totalRegistros}\n` +
            `💰 Monto eliminado: $${totalPago.toLocaleString('es-CO')}\n\n` +
            `El sistema ha sido reiniciado completamente.`;
        
        alert(mensajeExito);
        showMessage('reportsMessage', '✅ Todos los datos han sido eliminados permanentemente', 'success');
        
    } catch (error) {
        console.error('❌ Error al eliminar datos:', error);
        alert('❌ Error al eliminar datos: ' + error.message);
        showMessage('reportsMessage', 'Error al eliminar datos: ' + error.message, 'error');
    }
}