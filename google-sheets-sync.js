// ============================================
// SINCRONIZACIÓN CON GOOGLE SHEETS
// ============================================

// 📝 IMPORTANTE: Reemplaza esta URL con la tuya
// La URL debe terminar en /exec
const SHEETS_CONFIG = {
    scriptUrl: 'https://script.google.com/macros/s/AKfycbyh0_vSBsLzoriTSZ8mDR7Wn35PV6NjZWBYoMC3OHF2T59cNPMWdrcRanJPxbmuTQxy/exec',
    enabled: true,
    autoSync: true,
    syncInterval: 5 * 60 * 1000 // 5 minutos
};

// Estado de sincronización
let syncStatus = {
    lastSync: null,
    syncing: false,
    errors: [],
    lastResult: null
};

// ============================================
// FUNCIÓN PRINCIPAL: ENVIAR A GOOGLE SHEETS
// ============================================
async function sendToGoogleSheets(records) {
    if (!SHEETS_CONFIG.enabled) {
        console.log('⛔ Sincronización deshabilitada');
        return { success: false, message: 'Sincronización deshabilitada' };
    }

    if (!records || records.length === 0) {
        console.log('⚠️ No hay registros para sincronizar');
        return { success: false, message: 'No hay registros para sincronizar' };
    }

    // Verificar URL
    if (!SHEETS_CONFIG.scriptUrl.includes('/exec')) {
        console.error('❌ URL incorrecta. Debe terminar en /exec');
        return { 
            success: false, 
            message: 'URL del script incorrecta. Configura la URL completa del Web App.' 
        };
    }

    syncStatus.syncing = true;
    updateSyncUI('syncing');

    try {
        const dataToSend = records.map(record => ({
            timestamp: record.timestamp,
            date: record.date,
            time: record.time,
            employeeId: record.employeeId,
            employeeName: record.employeeName,
            ciclo: record.ciclo || 'N/A',
            nivel: record.nivel,
            activity: record.activity,
            hours: record.hours,
            valorJornal: record.valorJornal
        }));

        console.log(`📤 Enviando ${dataToSend.length} registros a Google Sheets...`);
        console.log('🌐 URL:', SHEETS_CONFIG.scriptUrl);

        const response = await fetch(SHEETS_CONFIG.scriptUrl, {
            method: 'POST',
            mode: 'no-cors', // ⚠️ Importante para evitar problemas de CORS
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'addRecords',
                records: dataToSend
            })
        });

        console.log('📥 Respuesta recibida');
        
        // Con mode: 'no-cors', no podemos leer la respuesta
        // pero si no hay error, asumimos que fue exitoso
        syncStatus.lastSync = new Date().toISOString();
        syncStatus.errors = [];
        syncStatus.lastResult = { 
            success: true, 
            count: dataToSend.length 
        };
        
        updateSyncUI('success');
        console.log('✅ Sincronización completada');
        
        return { 
            success: true, 
            message: `${dataToSend.length} registros enviados`,
            timestamp: syncStatus.lastSync
        };

    } catch (error) {
        console.error('❌ Error al sincronizar:', error);
        
        syncStatus.errors.push({
            timestamp: new Date().toISOString(),
            error: error.message
        });
        
        updateSyncUI('error');
        
        return { 
            success: false, 
            message: error.message,
            errorDetails: error.toString()
        };
    } finally {
        syncStatus.syncing = false;
    }
}

// ============================================
// PROBAR CONEXIÓN
// ============================================
async function testSheetsConnection() {
    console.log('🔧 Probando conexión con Google Sheets...');
    updateSyncUI('syncing');
    
    if (!SHEETS_CONFIG.scriptUrl.includes('/exec')) {
        showMessage('recordsMessage', '❌ URL incorrecta. Debe terminar en /exec', 'error');
        updateSyncUI('error');
        return { success: false };
    }
    
    try {
        console.log('🌐 URL:', SHEETS_CONFIG.scriptUrl);
        
        const response = await fetch(SHEETS_CONFIG.scriptUrl, {
            method: 'GET',
            mode: 'no-cors'
        });
        
        console.log('✅ Conexión establecida (modo no-cors)');
        showMessage('recordsMessage', '✅ Conexión establecida con Google Sheets', 'success');
        updateSyncUI('success');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        showMessage('recordsMessage', `❌ Error: ${error.message}`, 'error');
        updateSyncUI('error');
        return { success: false, message: error.message };
    }
}

// ============================================
// SINCRONIZAR TODOS LOS REGISTROS
// ============================================
async function syncAllRecords() {
    console.log('🔄 Iniciando sincronización manual...');
    
    if (!allRecords || allRecords.length === 0) {
        showMessage('recordsMessage', '⚠️ No hay registros para sincronizar', 'info');
        return;
    }

    console.log(`📊 Registros a sincronizar: ${allRecords.length}`);

    const result = await sendToGoogleSheets(allRecords);
    
    if (result.success) {
        showMessage('recordsMessage', `✅ ${result.message}`, 'success');
        console.log('🎉 Sincronización completada exitosamente');
    } else {
        showMessage('recordsMessage', `❌ Error: ${result.message}`, 'error');
        console.error('❌ Sincronización fallida');
    }
}

// ============================================
// SINCRONIZACIÓN AUTOMÁTICA
// ============================================
let autoSyncInterval = null;

function startAutoSync() {
    if (!SHEETS_CONFIG.autoSync || !SHEETS_CONFIG.enabled) {
        console.log('⏸️ Auto-sincronización deshabilitada');
        return;
    }

    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }

    console.log(`⏰ Auto-sincronización activada (cada ${SHEETS_CONFIG.syncInterval / 1000}s)`);
    
    autoSyncInterval = setInterval(async () => {
        if (allRecords && allRecords.length > 0 && !syncStatus.syncing) {
            console.log('⏰ Ejecutando auto-sincronización...');
            await sendToGoogleSheets(allRecords);
        }
    }, SHEETS_CONFIG.syncInterval);
}

function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        console.log('⏸️ Auto-sincronización detenida');
    }
}

// ============================================
// HOOK: SINCRONIZAR AL REGISTRAR ENTRADA
// ============================================
if (typeof window !== 'undefined') {
    const originalRegisterEntry = window.registerEntry;
    
    if (originalRegisterEntry) {
        window.registerEntry = async function(employee) {
            await originalRegisterEntry(employee);
            
            if (SHEETS_CONFIG.enabled && SHEETS_CONFIG.autoSync && allRecords && allRecords.length > 0) {
                console.log('🔄 Auto-sincronizando nuevo registro...');
                const lastRecord = allRecords[allRecords.length - 1];
                await sendToGoogleSheets([lastRecord]);
            }
        };
        
        console.log('✅ Hook de sincronización automática instalado');
    }
}

// ============================================
// UI: ACTUALIZAR INDICADOR DE ESTADO
// ============================================
function updateSyncUI(status) {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    
    switch(status) {
        case 'syncing':
            indicator.innerHTML = '🔄 Sincronizando...';
            indicator.className = 'sync-status syncing';
            indicator.style.background = '#3498db';
            indicator.style.color = '#ffffff';
            break;
            
        case 'success':
            const time = syncStatus.lastSync 
                ? new Date(syncStatus.lastSync).toLocaleTimeString('es-CO', {hour: '2-digit', minute: '2-digit'})
                : 'Nunca';
            indicator.innerHTML = `✅ Último sync: ${time}`;
            indicator.className = 'sync-status success';
            indicator.style.background = '#27ae60';
            indicator.style.color = '#ffffff';
            break;
            
        case 'error':
            indicator.innerHTML = '❌ Error al sincronizar';
            indicator.className = 'sync-status error';
            indicator.style.background = '#e74c3c';
            indicator.style.color = '#ffffff';
            break;
            
        default:
            indicator.innerHTML = '⏸️ No configurado';
            indicator.className = 'sync-status idle';
            indicator.style.background = '#95a5a6';
            indicator.style.color = '#ffffff';
    }
}

// ============================================
// UI: AGREGAR CONTROLES
// ============================================
function addSyncControls() {
    const recordsPanel = document.getElementById('recordsPanel');
    if (!recordsPanel) {
        console.warn('⚠️ Panel de registros no encontrado');
        return;
    }

    const buttonsDiv = recordsPanel.querySelector('.buttons');
    if (!buttonsDiv) {
        console.warn('⚠️ Contenedor de botones no encontrado');
        return;
    }

    // Indicador de estado
    const syncIndicator = document.createElement('div');
    syncIndicator.id = 'syncIndicator';
    syncIndicator.className = 'sync-status idle';
    syncIndicator.style.cssText = `
        padding: 10px 15px;
        margin: 10px 0;
        border-radius: 5px;
        text-align: center;
        font-weight: bold;
        background: #95a5a6;
        color: white;
    `;
    syncIndicator.innerHTML = '📊 Google Sheets - No configurado';
    
    // Botón de prueba
    const testButton = document.createElement('button');
    testButton.id = 'testSheets';
    testButton.className = 'btn btn-secondary';
    testButton.innerHTML = '🔧 Probar Conexión';
    testButton.onclick = testSheetsConnection;
    testButton.style.marginRight = '10px';
    
    // Botón de sincronización
    const syncButton = document.createElement('button');
    syncButton.id = 'syncToSheets';
    syncButton.className = 'btn btn-success';
    syncButton.innerHTML = '🔄 Sincronizar Ahora';
    syncButton.onclick = syncAllRecords;
    syncButton.style.marginRight = '10px';

    // Botón de configuración
    const configButton = document.createElement('button');
    configButton.id = 'configSheets';
    configButton.className = 'btn btn-primary';
    configButton.innerHTML = '⚙️ Configurar URL';
    configButton.onclick = showSheetsConfig;

    recordsPanel.insertBefore(syncIndicator, buttonsDiv);
    buttonsDiv.appendChild(testButton);
    buttonsDiv.appendChild(syncButton);
    buttonsDiv.appendChild(configButton);

    console.log('✅ Controles de sincronización agregados');
    updateSyncUI(SHEETS_CONFIG.enabled ? 'idle' : 'error');
}

// ============================================
// CONFIGURACIÓN
// ============================================
function showSheetsConfig() {
    const currentUrl = SHEETS_CONFIG.scriptUrl;

    const instructions = `
📖 CÓMO OBTENER LA URL:

1. Abre tu Google Apps Script
2. Click en "Implementar" → "Nueva implementación"
3. Selecciona "Aplicación web"
4. Configura:
   - Ejecutar como: Yo
   - Quién tiene acceso: Cualquier persona
5. Click "Implementar"
6. Copia la URL que termina en /exec

⚠️ IMPORTANTE: La URL debe terminar en /exec
`.trim();

    alert(instructions);

    const newUrl = prompt(
        'Pega aquí la URL completa del Web App:\n(debe terminar en /exec)',
        currentUrl
    );

    if (newUrl && newUrl.trim() !== '' && newUrl !== currentUrl) {
        const cleanUrl = newUrl.trim();
        
        if (!cleanUrl.includes('/exec')) {
            alert('❌ ERROR: La URL debe terminar en /exec\n\nEjemplo:\nhttps://script.google.com/macros/s/ABC123.../exec');
            return;
        }
        
        SHEETS_CONFIG.scriptUrl = cleanUrl;
        SHEETS_CONFIG.enabled = true;
        
        localStorage.setItem('sheets_config', JSON.stringify(SHEETS_CONFIG));
        
        alert('✅ Configuración guardada!\n\nHaz clic en "🔧 Probar Conexión" para verificar.');
        updateSyncUI('idle');
        
        console.log('✅ Nueva URL guardada:', SHEETS_CONFIG.scriptUrl);
    }
}

function loadSheetsConfig() {
    try {
        const saved = localStorage.getItem('sheets_config');
        if (saved) {
            const config = JSON.parse(saved);
            Object.assign(SHEETS_CONFIG, config);
            console.log('✅ Configuración cargada desde localStorage');
        }
    } catch (error) {
        console.error('❌ Error al cargar configuración:', error);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
function initGoogleSheetsSync() {
    console.log('🚀 Inicializando módulo de Google Sheets...');
    
    loadSheetsConfig();
    
    setTimeout(() => {
        addSyncControls();
        
        if (SHEETS_CONFIG.enabled && SHEETS_CONFIG.scriptUrl.includes('/exec')) {
            startAutoSync();
            console.log('✅ Sincronización con Google Sheets ACTIVA');
            console.log('🔗 URL:', SHEETS_CONFIG.scriptUrl);
        } else {
            console.log('⚠️ Sincronización no configurada');
            console.log('💡 Haz clic en "⚙️ Configurar URL" para empezar');
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleSheetsSync);
} else {
    initGoogleSheetsSync();
}

console.log('✅ google-sheets-sync.js cargado correctamente')