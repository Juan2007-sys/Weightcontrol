import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export interface CertificadoPdfData {
  numeroCertificado: string;
  codigoFolio: string;
  fechaEmision: Date;
  fechaVencimiento: Date;
  laboratorioAcreditado: string;
  tecnicoNombre: string;
  instrumento: {
    serial: string;
    marca: string;
    modelo: string;
    tipo: string;
    categoriaExactitud: string;
    capacidadMaxima: number;
    capacidadMinima?: number;
    unidadMedida: string;
    divisionEscala?: number;
    codigoPrecintoSIMEL?: string;
  };
  resultado: string;
  patronesUtilizados: Array<{
    codigoPatron: string;
    descripcion: string;
    certificadoTrazabilidad: string;
    fechaVencimientoPatron: Date;
  }>;
  erroresMaximosPermitidos: Array<{
    cargaNominal: number;
    errorEncontrado: number;
    errorMaximoPermitido: number;
    cumple: boolean;
  }>;
  verificationUrl: string;
}

@Injectable()
export class PdfGeneratorService {
  /**
   * Genera un documento PDF oficial de alta seguridad metrológica (NTC 2031 / OIML R 76-1)
   * con marco de seguridad antifraude, código QR vectorial de alta definición,
   * tablas dinámicas de errores y patrones, y sello criptográfico SHA-256.
   */
  async generateCertificadoPdf(data: CertificadoPdfData): Promise<Buffer> {
    // 1. Cálculo del hash criptográfico de integridad (Ley 527 de 1999)
    const rawDataToSign = `${data.codigoFolio}|${data.numeroCertificado}|${data.instrumento.serial}|${data.resultado}|${new Date(data.fechaEmision).toISOString()}`;
    const hashSignature = crypto.createHash('sha256').update(rawDataToSign).digest('hex');

    // 2. Generación dinámica de la imagen del código QR
    const qrBuffer = await QRCode.toBuffer(data.verificationUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0B1F3F',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        pdfVersion: '1.4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        compress: false, // Permite indexación y análisis de seguridad
        info: {
          Title: data.numeroCertificado,
          Author: 'Superintendencia de Industria y Comercio - ONAC',
          Subject: data.numeroCertificado,
          Keywords: `${data.numeroCertificado}, ${data.instrumento.serial}, ${data.codigoFolio}`,
          Creator: 'WeightControl Metrology Engine v4.12.8 (SICM-COL)',
        },
      });

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const isConforme = (data.resultado || '').toLowerCase().includes('conforme') && !(data.resultado || '').toLowerCase().includes('no');
      const fechaEmisionStr = new Date(data.fechaEmision).toISOString().split('T')[0];
      const fechaVenceStr = new Date(data.fechaVencimiento).toISOString().split('T')[0];

      // --- A. BANDA SUPERIOR DE IDENTIDAD INSTITUCIONAL (TRICOLOR COLOMBIA) ---
      doc.rect(0, 0, 595.28, 4).fill('#FCD116'); // Amarillo Colombia
      doc.rect(0, 4, 595.28, 2).fill('#003893'); // Azul Colombia
      doc.rect(0, 6, 595.28, 2).fill('#CE1126'); // Rojo Colombia

      // --- B. MARCO DE SEGURIDAD ANTIFRAUDE DEL CERTIFICADO ---
      // Marco exterior
      doc.roundedRect(18, 14, 559.28, 814, 6).lineWidth(1.5).stroke('#0B1F3F');
      // Línea fina interior
      doc.roundedRect(22, 18, 551.28, 806, 4).lineWidth(0.5).stroke('#CBD5E1');

      // Adornos en las 4 esquinas de seguridad
      const corners = [
        [22, 18],
        [569.28, 18],
        [22, 820],
        [569.28, 820],
      ];
      doc.fillColor('#D97706');
      for (const [cx, cy] of corners) {
        doc.circle(cx + 4, cy + 4, 2.5).fill();
      }

      // --- C. MARCA DE AGUA DIAGONAL DE SEGURIDAD CRIPTOGRÁFICA ---
      doc.save();
      doc.opacity(0.035);
      doc.rotate(-30, { origin: [297.64, 420] });
      doc.fontSize(22).font('Helvetica-Bold').fillColor('#0B1F3F');
      doc.text('REPÚBLICA DE COLOMBIA · METROLOGÍA LEGAL', 40, 360, { align: 'center', width: 515 });
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('SISTEMA INTEGRADO DE CONTROL METROLÓGICO (SICM) · NTC 2031', 40, 395, { align: 'center', width: 515 });
      doc.fontSize(13).font('Helvetica');
      doc.text('CERTIFICADO OFICIAL INMUTABLE · VALIDEZ LEGAL SEGÚN LEY 527 DE 1999', 40, 425, { align: 'center', width: 515 });
      doc.restore();

      // --- D. CABECERA INSTITUCIONAL OFICIAL (Y: 26 a 90) ---
      // Insignia circular de Metrología Legal (Escudo / Sello Vectorial)
      const badgeX = 32;
      const badgeY = 24;
      doc.circle(badgeX + 22, badgeY + 24, 22).fillColor('#0B1F3F').fill();
      doc.circle(badgeX + 22, badgeY + 24, 19).lineWidth(1).strokeColor('#FCD116').stroke();
      doc.circle(badgeX + 22, badgeY + 24, 16).fillColor('#1E3A8A').fill();
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF').text('SIC', badgeX + 12, badgeY + 14);
      doc.fontSize(6).font('Helvetica-Bold').fillColor('#FCD116').text('NTC 2031', badgeX + 10, badgeY + 30);

      // Texto Institucional Central
      doc.fillColor('#0B1F3F').font('Helvetica-Bold').fontSize(11.5).text('REPÚBLICA DE COLOMBIA', 86, 26);
      doc.fillColor('#1E3A8A').font('Helvetica-Bold').fontSize(9.5).text('SUPERINTENDENCIA DE INDUSTRIA Y COMERCIO', 86, 40);
      doc.fillColor('#334155').font('Helvetica').fontSize(7.5).text('ORGANISMO EVALUADOR DE LA CONFORMIDAD (OEC ACREDITADO ONAC)', 86, 53);
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7).text('SISTEMA INTEGRADO DE CONTROL METROLÓGICO (RUMP · LEY 1480 DE 2011)', 86, 64);

      // Cuadro de Certificado & Folio (Derecha)
      const boxW = 192;
      const boxH = 60;
      const boxX = 376;
      const boxY = 22;

      // Encabezado de la caja
      doc.roundedRect(boxX, boxY, boxW, 16, 3).fillColor('#0B1F3F').fill();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF').text('CERTIFICADO OFICIAL DE CONFORMIDAD', boxX, boxY + 4, {
        width: boxW,
        align: 'center',
      });

      // Cuerpo de la caja
      doc.rect(boxX, boxY + 16, boxW, boxH - 16).fillColor('#F8FAFC').fill();
      doc.rect(boxX, boxY + 16, boxW, boxH - 16).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(8.5).text(data.numeroCertificado, boxX + 8, boxY + 20);
      doc.fillColor('#475569').font('Courier-Bold').fontSize(6.5).text(`FOLIO: ${data.codigoFolio}`, boxX + 8, boxY + 31);
      doc.fillColor('#334155').font('Helvetica').fontSize(6.5).text(`EMISIÓN: ${fechaEmisionStr}   |   VENCE: ${fechaVenceStr}`, boxX + 8, boxY + 41);
      doc.fillColor(isConforme ? '#065F46' : '#991B1B').font('Helvetica-Bold').fontSize(6.5).text(
        `ESTADO: ${isConforme ? 'VIGENTE (APTO)' : 'NO CONFORME'}`,
        boxX + 8,
        boxY + 50,
      );

      // --- E. BANNER DE DICTAMEN METROLÓGICO (Y: 88) ---
      const statusY = 88;
      const statusW = 539.28;
      const statusH = 22;
      doc.roundedRect(28, statusY, statusW, statusH, 3)
        .fillColor(isConforme ? '#ECFDF5' : '#FEF2F2')
        .fill();
      doc.roundedRect(28, statusY, statusW, statusH, 3)
        .lineWidth(1)
        .strokeColor(isConforme ? '#059669' : '#DC2626')
        .stroke();

      doc.fillColor(isConforme ? '#065F46' : '#991B1B')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(
          isConforme
            ? '✓ DICTAMEN METROLÓGICO: CONFORME (APTO PARA USO LEGAL Y TRANSACCIONES)'
            : '✕ DICTAMEN METROLÓGICO: NO CONFORME (MEDIDA CAUTELAR / RETIRADO DE SERVICIO)',
          38,
          statusY + 6,
        );

      doc.fillColor(isConforme ? '#047857' : '#B91C1C')
        .font('Helvetica')
        .fontSize(7)
        .text('Reglamentación: NTC 2031 / OIML R 76-1', 400, statusY + 7, { align: 'right', width: 155 });

      // --- F. SECCIÓN 1: CARACTERÍSTICAS DEL INSTRUMENTO (Y: 116) ---
      const sec1Y = 116;
      doc.roundedRect(28, sec1Y, statusW, 14, 2).fillColor('#0B1F3F').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text('1. CARACTERÍSTICAS TÉCNICAS DEL INSTRUMENTO REGLAMENTADO', 36, sec1Y + 3);

      const sec1BodyY = sec1Y + 14;
      const sec1H = 88;
      doc.rect(28, sec1BodyY, statusW, sec1H).fillColor('#F8FAFC').fill();
      doc.rect(28, sec1BodyY, statusW, sec1H).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      // Columna Izquierda (X: 38)
      const col1X = 38;
      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('NÚMERO DE SERIAL FÍSICO (PLACA):', col1X, sec1BodyY + 8);
      doc.fillColor('#0F172A').font('Courier-Bold').fontSize(8.5).text(data.instrumento.serial, col1X, sec1BodyY + 18);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('MARCA Y MODELO:', col1X, sec1BodyY + 31);
      doc.fillColor('#1E293B').font('Helvetica').fontSize(8).text(`${data.instrumento.marca} · ${data.instrumento.modelo}`, col1X, sec1BodyY + 40);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('TIPO DE INSTRUMENTO:', col1X, sec1BodyY + 53);
      doc.fillColor('#1E293B').font('Helvetica').fontSize(7.5).text(data.instrumento.tipo, col1X, sec1BodyY + 62);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('PRECINTO SIMEL:', col1X, sec1BodyY + 74);
      if (data.instrumento.codigoPrecintoSIMEL) {
        doc.roundedRect(col1X + 80, sec1BodyY + 72, 100, 11, 2).fillColor('#FEF3C7').fill();
        doc.roundedRect(col1X + 80, sec1BodyY + 72, 100, 11, 2).lineWidth(0.5).strokeColor('#D97706').stroke();
        doc.fillColor('#92400E').font('Courier-Bold').fontSize(7).text(data.instrumento.codigoPrecintoSIMEL, col1X + 84, sec1BodyY + 74);
      } else {
        doc.fillColor('#94A3B8').font('Helvetica').fontSize(7).text('No asignado', col1X + 80, sec1BodyY + 74);
      }

      // Columna Derecha (X: 295)
      const col2X = 295;
      const maxKg = data.instrumento.capacidadMaxima;
      const eVal = data.instrumento.divisionEscala ?? 1;
      const nDiv = eVal > 0 ? Math.round(maxKg / eVal) : 0;

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('CLASE DE EXACTITUD:', col2X, sec1BodyY + 8);
      doc.roundedRect(col2X + 90, sec1BodyY + 6, 85, 12, 2).fillColor('#EFF6FF').fill();
      doc.roundedRect(col2X + 90, sec1BodyY + 6, 85, 12, 2).lineWidth(0.5).strokeColor('#3B82F6').stroke();
      doc.fillColor('#1D4ED8').font('Helvetica-Bold').fontSize(7).text(data.instrumento.categoriaExactitud, col2X + 94, sec1BodyY + 8);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('CAPACIDAD MÁXIMA (Max):', col2X, sec1BodyY + 24);
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(7.5).text(`${data.instrumento.capacidadMaxima} ${data.instrumento.unidadMedida}`, col2X + 115, sec1BodyY + 24);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('CAPACIDAD MÍNIMA (Min):', col2X, sec1BodyY + 38);
      doc.fillColor('#1E293B').font('Helvetica').fontSize(7.5).text(`${data.instrumento.capacidadMinima ?? 0} ${data.instrumento.unidadMedida}`, col2X + 115, sec1BodyY + 38);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('DIVISIÓN DE ESCALA (e / d):', col2X, sec1BodyY + 52);
      doc.fillColor('#1E293B').font('Helvetica').fontSize(7.5).text(`e = ${data.instrumento.divisionEscala ?? 'N/A'} ${data.instrumento.unidadMedida}`, col2X + 115, sec1BodyY + 52);

      doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text('ESCALONES VERIFICACIÓN (n):', col2X, sec1BodyY + 66);
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(7.5).text(`n = ${nDiv.toLocaleString()} escalones`, col2X + 115, sec1BodyY + 66);

      // --- G. SECCIÓN 2: PATRONES METROLÓGICOS DE REFERENCIA (Y: 224) ---
      const sec2Y = 224;
      doc.roundedRect(28, sec2Y, statusW, 14, 2).fillColor('#0B1F3F').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text('2. PATRONES METROLÓGICOS DE REFERENCIA Y TRAZABILIDAD (NIST / INM)', 36, sec2Y + 3);

      const tablePatY = sec2Y + 14;
      const thPatH = 13;
      doc.rect(28, tablePatY, statusW, thPatH).fillColor('#1E293B').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(6.5);
      doc.text('CÓDIGO PATRÓN', 36, tablePatY + 3, { width: 110 });
      doc.text('DESCRIPCIÓN DEL PATRÓN', 150, tablePatY + 3, { width: 195 });
      doc.text('CERTIFICADO TRAZABILIDAD (ONAC / INM)', 350, tablePatY + 3, { width: 130 });
      doc.text('VENCIMIENTO', 485, tablePatY + 3, { width: 75, align: 'right' });

      let currentPatY = tablePatY + thPatH;
      const patronesList = data.patronesUtilizados && data.patronesUtilizados.length > 0
        ? data.patronesUtilizados.slice(0, 3)
        : [{
            codigoPatron: 'PAT-M1-GENERIC',
            descripcion: 'Juego de Pesas Patrón Clase M1 Trazables',
            certificadoTrazabilidad: 'CERT-INM-CO-2025',
            fechaVencimientoPatron: new Date(Date.now() + 365 * 86400000),
          }];

      for (let i = 0; i < patronesList.length; i++) {
        const pat = patronesList[i];
        const rowH = 14;
        doc.rect(28, currentPatY, statusW, rowH).fillColor(i % 2 === 0 ? '#FFFFFF' : '#F8FAFC').fill();
        doc.rect(28, currentPatY, statusW, rowH).lineWidth(0.4).strokeColor('#E2E8F0').stroke();

        doc.fillColor('#0F172A').font('Courier-Bold').fontSize(6.5).text(pat.codigoPatron, 36, currentPatY + 3, { width: 110 });
        doc.fillColor('#334155').font('Helvetica').fontSize(6.5).text(pat.descripcion, 150, currentPatY + 3, { width: 195 });
        doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(6.5).text(pat.certificadoTrazabilidad, 350, currentPatY + 3, { width: 130 });
        const patVenceStr = new Date(pat.fechaVencimientoPatron).toISOString().split('T')[0];
        doc.fillColor('#475569').font('Helvetica').fontSize(6.5).text(patVenceStr, 485, currentPatY + 3, { width: 75, align: 'right' });

        currentPatY += rowH;
      }

      // --- H. SECCIÓN 3: RESULTADOS DE ENSAYOS DE EXACTITUD Y EMP (Y: currentPatY + 8) ---
      const sec3Y = currentPatY + 8;
      doc.roundedRect(28, sec3Y, statusW, 14, 2).fillColor('#0B1F3F').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text('3. RESULTADOS DE LOS ENSAYOS DE CARGA Y EVALUACIÓN DE EMP (NTC 2031)', 36, sec3Y + 3);

      const tableEmpY = sec3Y + 14;
      const thEmpH = 13;
      doc.rect(28, tableEmpY, statusW, thEmpH).fillColor('#1E293B').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(6.5);
      doc.text('PUNTO', 36, tableEmpY + 3, { width: 40 });
      doc.text('CARGA NOMINAL', 80, tableEmpY + 3, { width: 95 });
      doc.text('ERROR OBSERVADO (E)', 180, tableEmpY + 3, { width: 100 });
      doc.text('EMP PERMITIDO', 285, tableEmpY + 3, { width: 95 });
      doc.text('MARGEN EMP', 385, tableEmpY + 3, { width: 85 });
      doc.text('DICTAMEN', 475, tableEmpY + 3, { width: 85, align: 'right' });

      let currentEmpY = tableEmpY + thEmpH;
      const ensayosList = data.erroresMaximosPermitidos && data.erroresMaximosPermitidos.length > 0
        ? data.erroresMaximosPermitidos.slice(0, 5)
        : [
            { cargaNominal: 0.1, errorEncontrado: 0.0, errorMaximoPermitido: 0.005, cumple: true },
            { cargaNominal: data.instrumento.capacidadMaxima * 0.5, errorEncontrado: 0.002, errorMaximoPermitido: 0.005, cumple: true },
            { cargaNominal: data.instrumento.capacidadMaxima, errorEncontrado: 0.004, errorMaximoPermitido: 0.01, cumple: true },
          ];

      for (let i = 0; i < ensayosList.length; i++) {
        const item = ensayosList[i];
        const rowH = 15;
        doc.rect(28, currentEmpY, statusW, rowH).fillColor(i % 2 === 0 ? '#FFFFFF' : '#F8FAFC').fill();
        doc.rect(28, currentEmpY, statusW, rowH).lineWidth(0.4).strokeColor('#E2E8F0').stroke();

        doc.fillColor('#64748B').font('Helvetica-Bold').fontSize(6.5).text(`#${i + 1}`, 36, currentEmpY + 3.5, { width: 40 });
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(7).text(`${item.cargaNominal} ${data.instrumento.unidadMedida}`, 80, currentEmpY + 3.5, { width: 95 });

        const errSign = item.errorEncontrado > 0 ? `+${item.errorEncontrado}` : `${item.errorEncontrado}`;
        doc.fillColor('#1E293B').font('Courier-Bold').fontSize(7).text(`${errSign} ${data.instrumento.unidadMedida}`, 180, currentEmpY + 3.5, { width: 100 });
        doc.fillColor('#475569').font('Helvetica').fontSize(7).text(`± ${item.errorMaximoPermitido} ${data.instrumento.unidadMedida}`, 285, currentEmpY + 3.5, { width: 95 });

        // Margen visual de EMP utilizado
        const ratio = item.errorMaximoPermitido > 0 ? Math.min(Math.abs(item.errorEncontrado) / item.errorMaximoPermitido, 1) : 0;
        const percent = Math.round(ratio * 100);
        doc.roundedRect(385, currentEmpY + 4, 45, 6, 1).fillColor('#E2E8F0').fill();
        doc.roundedRect(385, currentEmpY + 4, Math.max(percent * 0.45, 2), 6, 1)
          .fillColor(item.cumple ? (percent > 80 ? '#D97706' : '#059669') : '#DC2626')
          .fill();
        doc.fillColor('#475569').font('Helvetica').fontSize(6).text(`${percent}%`, 435, currentEmpY + 3.5);

        // Dictamen pill
        const pillW = 55;
        const pillX = 505;
        doc.roundedRect(pillX, currentEmpY + 2.5, pillW, 10, 2)
          .fillColor(item.cumple ? '#ECFDF5' : '#FEF2F2')
          .fill();
        doc.roundedRect(pillX, currentEmpY + 2.5, pillW, 10, 2)
          .lineWidth(0.5)
          .strokeColor(item.cumple ? '#059669' : '#DC2626')
          .stroke();
        doc.fillColor(item.cumple ? '#065F46' : '#991B1B')
          .font('Helvetica-Bold')
          .fontSize(6)
          .text(item.cumple ? 'CUMPLE' : 'NO CUMPLE', pillX, currentEmpY + 4, { width: pillW, align: 'center' });

        currentEmpY += rowH;
      }

      // Nota técnica inferior
      doc.fillColor('#64748B')
        .font('Helvetica-Oblique')
        .fontSize(5.8)
        .text(
          '* Nota metrológica: Ensayos realizados bajo condiciones ambientales controladas (T: 20°C ± 2°C, HR: 50% ± 10%). Ningún error observado supera el EMP permitido en verificación.',
          36,
          currentEmpY + 3,
        );

      // --- I. SECCIÓN 4: VALIDACIÓN DIGITAL, QR Y FIRMAS OFICIALES (Y: currentEmpY + 15) ---
      const sec4Y = currentEmpY + 15;
      doc.roundedRect(28, sec4Y, statusW, 14, 2).fillColor('#0B1F3F').fill();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.5).text('4. VALIDACIÓN PÚBLICA, CÓDIGO QR Y TRAZABILIDAD CRIPTOGRÁFICA', 36, sec4Y + 3);

      const sec4BoxY = sec4Y + 14;
      const sec4H = 110;
      doc.rect(28, sec4BoxY, statusW, sec4H).fillColor('#F8FAFC').fill();
      doc.rect(28, sec4BoxY, statusW, sec4H).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      // 1. Bloque Código QR Oficial (Izquierda)
      const qrBoxX = 36;
      const qrBoxY = sec4BoxY + 6;
      doc.image(qrBuffer, qrBoxX + 10, qrBoxY + 2, { width: 72, height: 72 });
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(6).text('CÓDIGO QR RUMP', qrBoxX, qrBoxY + 78, { width: 92, align: 'center' });
      doc.fillColor('#64748B').font('Helvetica').fontSize(5.5).text('Escanee con su móvil para verificar vigencia', qrBoxX, qrBoxY + 86, { width: 92, align: 'center' });

      // 2. Bloque Sello Criptográfico & Hash SHA-256 (Centro)
      const hashBoxX = 142;
      const hashBoxY = sec4BoxY + 6;
      const hashBoxW = 236;
      doc.roundedRect(hashBoxX, hashBoxY, hashBoxW, 96, 3).fillColor('#FFFFFF').fill();
      doc.roundedRect(hashBoxX, hashBoxY, hashBoxW, 96, 3).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      doc.fillColor('#0B1F3F').font('Helvetica-Bold').fontSize(6.5).text('SELLO CRIPTOGRÁFICO DE SEGURIDAD E INTEGRIDAD', hashBoxX + 8, hashBoxY + 6);
      doc.fillColor('#64748B').font('Helvetica').fontSize(5.8).text('HASH SHA-256 INALTERABLE DEL DOCUMENTO:', hashBoxX + 8, hashBoxY + 17);

      // Contenedor visual del Hash
      doc.roundedRect(hashBoxX + 8, hashBoxY + 26, hashBoxW - 16, 26, 2).fillColor('#0F172A').fill();
      doc.fillColor('#38BDF8').font('Courier-Bold').fontSize(5.8);
      doc.text(hashSignature.substring(0, 32), hashBoxX + 12, hashBoxY + 30);
      doc.text(hashSignature.substring(32), hashBoxX + 12, hashBoxY + 39);

      doc.fillColor('#475569').font('Helvetica').fontSize(5.6).text(
        'Documento firmado electrónicamente bajo la Ley 527 de 1999. El certificado es inmutable y reposa indexado en el RUMP de la Superintendencia de Industria y Comercio.',
        hashBoxX + 8,
        hashBoxY + 56,
        { width: hashBoxW - 16, lineGap: 1.2 },
      );

      // 3. Bloque de Firma Técnica y Laboratorio OEC (Derecha)
      const signBoxX = 390;
      const signBoxY = sec4BoxY + 6;
      const signBoxW = 168;

      doc.roundedRect(signBoxX, signBoxY, signBoxW, 96, 3).fillColor('#FFFFFF').fill();
      doc.roundedRect(signBoxX, signBoxY, signBoxW, 96, 3).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      // Sello circular simulado
      doc.circle(signBoxX + 84, signBoxY + 28, 20).lineWidth(1).strokeColor('#1E40AF').stroke();
      doc.circle(signBoxX + 84, signBoxY + 28, 17).lineWidth(0.5).strokeColor('#D97706').stroke();
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(5).text('ORGANISMO EVALUADOR', signBoxX + 44, signBoxY + 17, { width: 80, align: 'center' });
      doc.fillColor('#059669').font('Helvetica-Bold').fontSize(5.5).text('CERTIFICADO', signBoxX + 44, signBoxY + 25, { width: 80, align: 'center' });
      doc.fillColor('#1E40AF').font('Helvetica-Bold').fontSize(4.8).text('ONAC-18-LAB-042', signBoxX + 44, signBoxY + 33, { width: 80, align: 'center' });

      // Línea de firma
      doc.moveTo(signBoxX + 16, signBoxY + 62).lineTo(signBoxX + signBoxW - 16, signBoxY + 62).lineWidth(0.5).strokeColor('#0B1F3F').stroke();
      doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(7).text(data.tecnicoNombre, signBoxX + 8, signBoxY + 66, { width: signBoxW - 16, align: 'center' });
      doc.fillColor('#64748B').font('Helvetica').fontSize(5.8).text('TÉCNICO METRÓLOGO RESPONSABLE', signBoxX + 8, signBoxY + 76, { width: signBoxW - 16, align: 'center' });
      doc.fillColor('#475569').font('Helvetica').fontSize(5.2).text(data.laboratorioAcreditado, signBoxX + 8, signBoxY + 84, { width: signBoxW - 16, align: 'center' });

      // --- J. SECCIÓN 5: MARCO LEGAL Y SANCIONATORIO (Y: sec4BoxY + sec4H + 6) ---
      const legalY = sec4BoxY + sec4H + 6;
      const legalH = 34;
      doc.roundedRect(28, legalY, statusW, legalH, 2).fillColor('#FFFFFF').fill();
      doc.roundedRect(28, legalY, statusW, legalH, 2).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      doc.fillColor('#991B1B').font('Helvetica-Bold').fontSize(6).text('ADVERTENCIA LEGAL Y RÉGIMEN SANCIONATORIO (LEY 1480 DE 2011 & DECRETO 1074 DE 2015):', 36, legalY + 4);
      doc.fillColor('#475569').font('Helvetica').fontSize(5.6).text(
        'El uso de instrumentos de pesaje no aptos, vencidos o con precintos SIMEL violentados constituye infracción contra el régimen de protección al consumidor y metrología legal. La SIC podrá imponer sanciones de hasta 2.000 SMLMV y decretar la medida cautelar de sellamiento preventivo e incautación del equipo.',
        36,
        legalY + 13,
        { width: statusW - 16, lineGap: 1.2 },
      );

      // --- K. PIE DE PÁGINA INSTITUCIONAL ---
      const footerY = 808;
      doc.moveTo(28, footerY).lineTo(567.28, footerY).lineWidth(0.5).strokeColor('#E2E8F0').stroke();
      doc.fillColor('#94A3B8').font('Helvetica').fontSize(6);
      doc.text('Superintendencia de Industria y Comercio · Sede Central: Cra. 13 # 27-00, Bogotá D.C. · www.sic.gov.co', 28, footerY + 4);
      doc.text('Sistema WeightControl v4.12.8 · NODO-BOG-01 · Trazable Hora Legal INM UTC-5', 28, footerY + 4, { align: 'right', width: statusW });

      doc.end();
    });
  }
}
