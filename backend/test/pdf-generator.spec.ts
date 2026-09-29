import { describe, it, expect } from 'vitest';
import { PdfGeneratorService } from '../src/modules/calibraciones/pdf-generator.service.js';

describe('🏛️ PdfGeneratorService — Validación Oficial y Verificabilidad de Certificados PDF y QR (HU-04)', () => {
  const service = new PdfGeneratorService();

  const testCertData = {
    numeroCertificado: 'CERT-NTC2031-2026-9901',
    codigoFolio: 'FOLIO-SICM-2026-0099',
    fechaEmision: new Date('2026-05-15T10:00:00.000Z'),
    fechaVencimiento: new Date('2027-05-15T10:00:00.000Z'),
    laboratorioAcreditado: 'Laboratorio de Ensayos Metrológicos ONAC-18-LAB-042',
    tecnicoNombre: 'Ing. Carlos Mendoza (Metrólogo L2)',
    instrumento: {
      serial: 'BAL-2026-XYZ-01',
      marca: 'Mettler Toledo',
      modelo: 'Jaguar 8142',
      tipo: 'BASCULA_CAMIONERA',
      categoriaExactitud: 'CLASE_III',
      capacidadMaxima: 80000,
      capacidadMinima: 400,
      unidadMedida: 'kg',
      divisionEscala: 20,
      codigoPrecintoSIMEL: 'SIMEL-PREC-2026-778',
    },
    resultado: 'Conforme',
    patronesUtilizados: [
      {
        codigoPatron: 'PAT-MASA-M1-001',
        descripcion: 'Juego de Pesas Clase M1 Trazables INM (1000 kg)',
        certificadoTrazabilidad: 'CERT-INM-CO-2025-091',
        fechaVencimientoPatron: new Date('2027-12-31T00:00:00.000Z'),
      },
      {
        codigoPatron: 'PAT-MASA-M1-002',
        descripcion: 'Pesas Paralelepípedas Clase M1 (2000 kg)',
        certificadoTrazabilidad: 'CERT-INM-CO-2025-092',
        fechaVencimientoPatron: new Date('2027-12-31T00:00:00.000Z'),
      },
    ],
    erroresMaximosPermitidos: [
      { cargaNominal: 10000, errorEncontrado: 5, errorMaximoPermitido: 10, cumple: true },
      { cargaNominal: 40000, errorEncontrado: 10, errorMaximoPermitido: 20, cumple: true },
      { cargaNominal: 80000, errorEncontrado: 18, errorMaximoPermitido: 30, cumple: true },
    ],
    verificationUrl: 'https://weightcontrol.gov.co/verificar?serial=BAL-2026-XYZ-01&cert=CERT-NTC2031-2026-9901',
  };

  it('debe generar un buffer PDF binario válido con cabecera estándar %PDF-1.4', async () => {
    const pdfBuffer = await service.generateCertificadoPdf(testCertData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(15000); // Debe ser > 15KB debido al QR y gráficos incrustados

    const pdfHeader = pdfBuffer.subarray(0, 8).toString('utf-8');
    expect(pdfHeader).toContain('%PDF-1.4');
  });

  it('debe incrustar el código QR dinámico como objeto de imagen binario XObject en el PDF', async () => {
    const pdfBuffer = await service.generateCertificadoPdf(testCertData);
    const pdfText = pdfBuffer.toString('binary');

    // Comprobar presencia de objeto de imagen /Subtype /Image generado a partir del QR
    expect(pdfText).toContain('/Subtype /Image');
    expect(pdfText).toContain('/ColorSpace /DeviceRGB');
  });

  it('debe contener los metadatos institucionales y el número de certificado oficial', async () => {
    const pdfBuffer = await service.generateCertificadoPdf(testCertData);
    const pdfRaw = pdfBuffer.toString('utf-8');

    // Metadatos de documento
    expect(pdfRaw).toContain('CERT-NTC2031-2026-9901');
    expect(pdfRaw).toContain('Superintendencia de Industria y Comercio - ONAC');
    expect(pdfRaw).toContain('WeightControl Metrology Engine');
  });

  it('debe renderizar correctamente un certificado con dictamen NO CONFORME y alertar visualmente', async () => {
    const nonConformingData = {
      ...testCertData,
      resultado: 'No Conforme',
      erroresMaximosPermitidos: [
        { cargaNominal: 10000, errorEncontrado: 25, errorMaximoPermitido: 10, cumple: false },
      ],
    };

    const pdfBuffer = await service.generateCertificadoPdf(nonConformingData);
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(15000);
    const pdfRaw = pdfBuffer.toString('utf-8');
    expect(pdfRaw).toContain('CERT-NTC2031-2026-9901');
  });
});
