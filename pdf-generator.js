// ============================================
// GENERADOR PDF - SOLO PÁGINA 4 PARA PROBAR
// ============================================

function generatePDFReport() {
    if (allRecords.length === 0) {
        alert('No hay datos para generar el reporte PDF');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        
        // Crear PDF en HORIZONTAL desde el inicio
        const doc = new jsPDF({
            orientation: 'landscape',  // ← HORIZONTAL desde el principio
            unit: 'mm',
            format: 'letter'
        });

        // Colores
        const colors = {
            header: [44, 62, 80],
            lightGray: [236, 240, 241],
            success: [39, 174, 96],
            danger: [231, 76, 60]
        };

        // ============================================
        // HEADER PARA HORIZONTAL
        // ============================================
        function addHeader() {
            doc.setFillColor(...colors.header);
            doc.rect(0, 0, 279, 30, 'F');  // 279mm = ancho landscape

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('REPORTE DE JORNALES AGRÍCOLAS', 139.5, 15, { align: 'center' });

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            const fecha = new Date().toLocaleDateString('es-CO', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Generado: ${fecha}`, 139.5, 25, { align: 'center' });
        }

        // ============================================
        // FOOTER PARA HORIZONTAL
        // ============================================
        function addFooter(pageNum) {
            doc.setFillColor(...colors.lightGray);
            doc.rect(0, 205, 279, 10, 'F');  // 205mm = altura footer landscape

            doc.setTextColor(50, 50, 50);
            doc.setFontSize(8);
            doc.text(`Página ${pageNum}`, 139.5, 211, { align: 'center' });
        }

        // ============================================
        // TÍTULO DE LA SECCIÓN
        // ============================================
        addHeader();
        
        doc.setFillColor(...colors.header);
        doc.rect(10, 40, 259, 10, 'F');  // Título más abajo
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTRO COMPLETO DE JORNALES', 139.5, 46.5, { align: 'center' });

        // ============================================
        // PREPARAR DATOS
        // ============================================
        const completeData = allRecords
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((record, index) => {
                const employee = employees.find(e => e.id === record.employeeId);
                return [
                    (index + 1).toString(),
                    record.employeeId,
                    record.employeeName,
                    record.ciclo || 'N/A',
                    record.nivel.replace('Nivel ', 'N'),
                    record.activity,
                    record.date,
                    record.time,
                    `${record.hours}h`,
                    `$${record.valorJornal.toLocaleString('es-CO')}`,
                    employee?.signature || null
                ];
            });

        // ============================================
        // TABLA COMPLETA
        // ============================================
        let pageNum = 1;
        
        doc.autoTable({
            startY: 55,  // Más abajo: 40 (título) + 10 (altura) + 5 (espacio)
            head: [['#', 'ID', 'Nombre', 'Ciclo', 'Niv', 'Labor', 'Fecha', 'Hora', 'Hrs', 'Valor', 'Firma']],
            body: completeData.map(row => row.slice(0, -1)),
            theme: 'grid',
            headStyles: {
                fillColor: colors.header,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
                valign: 'middle',
                cellPadding: 3
            },
            bodyStyles: {
                fontSize: 8,
                cellPadding: 2.5,
                valign: 'middle'
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },    // # - reducido
                1: { halign: 'center', cellWidth: 22 },   // ID - reducido
                2: { cellWidth: 45 },                     // Nombre - reducido
                3: { halign: 'center', cellWidth: 18 },   // Ciclo - reducido
                4: { halign: 'center', cellWidth: 10 },   // Niv - reducido
                5: { cellWidth: 60 },                     // Labor - reducido
                6: { halign: 'center', cellWidth: 22 },   // Fecha - reducido
                7: { halign: 'center', cellWidth: 18 },   // Hora - reducido
                8: { halign: 'center', cellWidth: 12 },   // Hrs - reducido
                9: { halign: 'right', cellWidth: 22 },    // Valor - reducido
                10: { halign: 'center', cellWidth: 18 }   // Firma
            },
            alternateRowStyles: {
                fillColor: colors.lightGray
            },
            margin: { 
                left: 10, 
                right: 10,
                top: 40,     // Margen superior aumentado
                bottom: 20   // Espacio para el footer
            },
            didDrawPage: function(data) {
                // En cada página nueva, agregar header y footer
                if (data.pageNumber > 1) {
                    addHeader();
                    
                    // Agregar título también en páginas siguientes
                    doc.setFillColor(...colors.header);
                    doc.rect(10, 40, 259, 10, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('REGISTRO COMPLETO DE JORNALES (Continuación)', 139.5, 46.5, { align: 'center' });
                }
                addFooter(pageNum++);
            },
            didDrawCell: function(data) {
                // Agregar firmas
                if (data.column.index === 10 && data.section === 'body') {
                    const signature = completeData[data.row.index][10];
                    if (signature) {
                        try {
                            doc.addImage(
                                signature,
                                'PNG',
                                data.cell.x + 2,
                                data.cell.y + 1,
                                14,
                                6
                            );
                        } catch (e) {
                            doc.setFontSize(7);
                            doc.setTextColor(...colors.success);
                            doc.text('✔', data.cell.x + 9, data.cell.y + 4, { align: 'center' });
                        }
                    } else {
                        doc.setFontSize(7);
                        doc.setTextColor(...colors.danger);
                        doc.text('✗', data.cell.x + 9, data.cell.y + 4, { align: 'center' });
                    }
                }
            }
        });

        // ============================================
        // GUARDAR
        // ============================================
        const filename = `reporte-jornales-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);

        alert(`✅ PDF generado: ${allRecords.length} registros en ${pageNum} página(s)`);

    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error: ' + error.message);
    }
}

console.log('📄 Generador PDF simplificado cargado');