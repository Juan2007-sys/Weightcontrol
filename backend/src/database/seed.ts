import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  Usuario,
  UsuarioDocument,
  RolUsuario,
  Instrumento,
  InstrumentoDocument,
  TipoInstrumento,
  CategoriaExactitud,
  EstadoInstrumento,
  UnidadMedida,
  Calibracion,
  CalibracionDocument,
  ResultadoCalibracion,
  Certificado,
  CertificadoDocument,
  TipoCertificado,
  EstadoCertificado,
  TrazabilidadEvento,
  TrazabilidadEventoDocument,
  TipoAccionAuditoria,
  EntidadAfectada,
  Alerta,
  AlertaDocument,
  NivelAlerta,
} from '../schemas/index.js';

async function bootstrapSeed() {
  console.log('🌱 ========================================================');
  console.log('⚖️   WEIGHTCONTROL - CARGA DE SEMILLA METROLÓGICA (SEED)');
  console.log('    Superintendencia de Industria y Comercio (SIC) & ONAC');
  console.log('========================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);

  const usuarioModel = app.get<Model<UsuarioDocument>>(getModelToken(Usuario.name));
  const instrumentoModel = app.get<Model<InstrumentoDocument>>(getModelToken(Instrumento.name));
  const calibracionModel = app.get<Model<CalibracionDocument>>(getModelToken(Calibracion.name));
  const certificadoModel = app.get<Model<CertificadoDocument>>(getModelToken(Certificado.name));
  const trazabilidadModel = app.get<Model<TrazabilidadEventoDocument>>(getModelToken(TrazabilidadEvento.name));
  const alertaModel = app.get<Model<AlertaDocument>>(getModelToken(Alerta.name));

  console.log('🧹 Sincronizando colecciones para paridad de equipo...');
  await Promise.all([
    usuarioModel.deleteMany({}),
    instrumentoModel.deleteMany({}),
    calibracionModel.deleteMany({}),
    certificadoModel.deleteMany({}),
    trazabilidadModel.deleteMany({}),
    alertaModel.deleteMany({}),
  ]);
  console.log('✅ Colecciones limpiadas con éxito.\n');

  // =========================================================================
  // 1. USUARIOS (Todos los roles del sistema + caso inactivo)
  // =========================================================================
  console.log('👤 Creando usuarios con perfiles de metrología legal y auditoría...');
  const saltRounds = 10;
  const hashAdmin = await bcrypt.hash('Admin123456!', saltRounds);
  const hashInspector = await bcrypt.hash('Inspector123456!', saltRounds);
  const hashTecnico = await bcrypt.hash('Tecnico123456!', saltRounds);
  const hashOnac = await bcrypt.hash('Onac123456!', saltRounds);
  const hashInactivo = await bcrypt.hash('Inactivo123456!', saltRounds);

  const usuariosData = [
    {
      nombre: 'Dr. Alejandro Morales Ramos',
      email: 'admin@weightcontrol.gov.co',
      password: hashAdmin,
      rol: RolUsuario.ADMIN,
      documentoIdentidad: 'CC-1029384756',
      tarjetaProfesional: 'TP-ING-88912',
      entidad: 'Superintendencia de Industria y Comercio (SIC)',
      telefono: '+57 (601) 587-0000 ext. 101',
      activo: true,
    },
    {
      nombre: 'Dra. Marcela Gómez Barreto',
      email: 'inspector@sic.gov.co',
      password: hashInspector,
      rol: RolUsuario.AUDITOR,
      documentoIdentidad: 'CC-79845123',
      tarjetaProfesional: 'TP-AUD-45120',
      entidad: 'Delegatura de Control Metrológico - SIC',
      telefono: '+57 (601) 587-0000 ext. 204',
      activo: true,
    },
    {
      nombre: 'Ing. Juan Carlos Pérez Morales',
      email: 'tecnico@oec-onac.org',
      password: hashTecnico,
      rol: RolUsuario.TECNICO,
      documentoIdentidad: 'CC-80123987',
      tarjetaProfesional: 'TP-MET-99120',
      numeroRegistroSIMEL: 'SIMEL-REP-2024-00891',
      entidad: 'Laboratorio de Ensayos Metrológicos ONAC-18-LAB-042',
      telefono: '+57 310 456 7890',
      activo: true,
    },
    {
      nombre: 'Ing. Sandra Patricia Ospina',
      email: 'acreditacion@onac.org.co',
      password: hashOnac,
      rol: RolUsuario.INSTITUCION_ACREDITACION,
      documentoIdentidad: 'NIT-900.207.241-1',
      tarjetaProfesional: 'TP-EVAL-12903',
      entidad: 'Organismo Nacional de Acreditación de Colombia (ONAC)',
      telefono: '+57 (601) 745-8888',
      activo: true,
    },
    {
      nombre: 'Técnico Inactivo de Prueba',
      email: 'inactivo@weightcontrol.gov.co',
      password: hashInactivo,
      rol: RolUsuario.TECNICO,
      documentoIdentidad: 'CC-52891024',
      tarjetaProfesional: 'TP-MET-33211',
      entidad: 'Ex-Calibrador (Desactivado por auditoría)',
      telefono: '+57 300 000 0000',
      activo: false,
    },
  ];

  const usuariosGuardados = await usuarioModel.insertMany(usuariosData);
  const adminUser = usuariosGuardados.find((u) => u.email === 'admin@weightcontrol.gov.co')!;
  const tecnicoUser = usuariosGuardados.find((u) => u.email === 'tecnico@oec-onac.org')!;
  const inspectorUser = usuariosGuardados.find((u) => u.email === 'inspector@sic.gov.co')!;

  console.log(`✅ ${usuariosGuardados.length} usuarios registrados exitosamente.\n`);

  // =========================================================================
  // 2. INSTRUMENTOS METROLÓGICOS (Clases I, II, III, IIII con Fotos Reales)
  // =========================================================================
  console.log('⚖️  Creando instrumentos metrológicos (NTC 2031 / OIML R 76-1)...');

  const ahora = new Date();
  const hace2Meses = new Date(ahora.getTime() - 60 * 24 * 3600 * 1000);
  const dentroDe10Meses = new Date(ahora.getTime() + 305 * 24 * 3600 * 1000);

  const hace11Meses = new Date(ahora.getTime() - 345 * 24 * 3600 * 1000);
  const dentroDe20Dias = new Date(ahora.getTime() + 20 * 24 * 3600 * 1000);

  const hace15Meses = new Date(ahora.getTime() - 450 * 24 * 3600 * 1000);
  const hace3Meses = new Date(ahora.getTime() - 85 * 24 * 3600 * 1000);

  const hace1Mes = new Date(ahora.getTime() - 30 * 24 * 3600 * 1000);
  const dentroDe11Meses = new Date(ahora.getTime() + 335 * 24 * 3600 * 1000);

  const hace11MesesYMedio = new Date(ahora.getTime() - 355 * 24 * 3600 * 1000);
  const dentroDe10Dias = new Date(ahora.getTime() + 10 * 24 * 3600 * 1000);

  const instrumentosData = [
    {
      serial: 'BAL-2025-99201-BOG',
      marca: 'Torrey',
      modelo: 'L-EQ-10/20',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 30,
      capacidadMinima: 0.1,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.005,
      numeroDivisionesVerificacion: 6000,
      codigoPrecintoSIMEL: 'STAMP-CO-9982415',
      propietario: {
        nombreRazonSocial: 'Almacenes Éxito S.A.',
        nitRut: '890.900.608-9',
        direccion: 'Calle 80 # 69Q-50',
        ciudad: 'Bogotá D.C.',
        departamento: 'Cundinamarca',
      },
      ubicacionFisica: 'Caja 14 - Sección Frutas y Verduras',
      fechaUltimaCalibracion: hace2Meses,
      fechaProximaCalibracion: dentroDe10Meses,
      estado: EstadoInstrumento.VIGENTE,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'CAM-2024-11840-MED',
      marca: 'Toledo',
      modelo: 'Jaguar 8142',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 80000,
      capacidadMinima: 400,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 20,
      numeroDivisionesVerificacion: 4000,
      codigoPrecintoSIMEL: 'STAMP-CO-8812049',
      propietario: {
        nombreRazonSocial: 'Cervecería Unión S.A.',
        nitRut: '890.903.939-5',
        direccion: 'Autopista Sur Cra 50A # 8-39',
        ciudad: 'Medellín',
        departamento: 'Antioquia',
      },
      ubicacionFisica: 'Báscula Camionera Ingreso Principal Puerta 1',
      fechaUltimaCalibracion: hace15Meses,
      fechaProximaCalibracion: hace3Meses,
      estado: EstadoInstrumento.VENCIDO,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'DISP-2025-33412-CAL',
      marca: 'Gilbarco',
      modelo: 'CraneScale Pro 500',
      tipo: TipoInstrumento.DINAMOMETRO,
      categoriaExactitud: CategoriaExactitud.CLASE_II,
      capacidadMaxima: 500,
      capacidadMinima: 1,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.05,
      numeroDivisionesVerificacion: 10000,
      codigoPrecintoSIMEL: 'STAMP-CO-7719201',
      propietario: {
        nombreRazonSocial: 'Terpel Colombia S.A.S.',
        nitRut: '860.004.832-1',
        direccion: 'Av. Pasoancho con Calle 13',
        ciudad: 'Cali',
        departamento: 'Valle del Cauca',
      },
      ubicacionFisica: 'Muelle de Carga Granel y Combustible Isla 02',
      fechaUltimaCalibracion: hace11Meses,
      fechaProximaCalibracion: dentroDe20Dias,
      estado: EstadoInstrumento.POR_VENCER,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'BAL-2026-85286-BOG',
      marca: 'Mettler Toledo',
      modelo: 'XPE205 Precision Balance',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_I,
      capacidadMaxima: 220,
      capacidadMinima: 0.01,
      unidadMedida: UnidadMedida.G,
      divisionEscala: 0.0001,
      numeroDivisionesVerificacion: 2200000,
      codigoPrecintoSIMEL: 'STAMP-CO-9910452',
      propietario: {
        nombreRazonSocial: 'Laboratorios Farmacéuticos Baxter S.A.S.',
        nitRut: '860.015.714-3',
        direccion: 'Zona Franca Fontibón, Calle 100 # 65-10',
        ciudad: 'Bogotá D.C.',
        departamento: 'Cundinamarca',
      },
      ubicacionFisica: 'Sala Limpia ISO 5 - Pesaje de Principios Activos Estériles',
      fechaUltimaCalibracion: hace1Mes,
      fechaProximaCalibracion: dentroDe11Meses,
      estado: EstadoInstrumento.VIGENTE,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'PES-2025-44109-BCA',
      marca: 'Troemner',
      modelo: 'Class F1 Precision Kit',
      tipo: TipoInstrumento.PESA,
      categoriaExactitud: CategoriaExactitud.CLASE_II,
      capacidadMaxima: 20,
      capacidadMinima: 0.001,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.0001,
      numeroDivisionesVerificacion: 200000,
      codigoPrecintoSIMEL: 'STAMP-CO-6652011',
      propietario: {
        nombreRazonSocial: 'Industria de Alimentos Zenú S.A.S.',
        nitRut: '890.900.276-8',
        direccion: 'Carrera 64C # 104-56',
        ciudad: 'Bucaramanga',
        departamento: 'Santander',
      },
      ubicacionFisica: 'Laboratorio de Aseguramiento de Calidad Lote 3',
      fechaUltimaCalibracion: hace2Meses,
      fechaProximaCalibracion: dentroDe10Meses,
      estado: EstadoInstrumento.VIGENTE,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'BAS-2024-77150-BAQ',
      marca: 'Avery Weigh-Tronix',
      modelo: 'GSE-560 Industrial Hopper',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_IIII,
      capacidadMaxima: 5000,
      capacidadMinima: 100,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 5,
      numeroDivisionesVerificacion: 1000,
      codigoPrecintoSIMEL: 'STAMP-CO-5519402',
      propietario: {
        nombreRazonSocial: 'Cementos Argos S.A.',
        nitRut: '890.100.251-8',
        direccion: 'Vía 40 Las Flores',
        ciudad: 'Barranquilla',
        departamento: 'Atlántico',
      },
      ubicacionFisica: 'Silo 2 de Despacho y Ensacado Masivo',
      fechaUltimaCalibracion: hace15Meses,
      fechaProximaCalibracion: hace3Meses,
      estado: EstadoInstrumento.VENCIDO,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
    {
      serial: 'BAL-2026-10294-PER',
      marca: 'Gram Precision',
      modelo: 'M4-30P Digital Countertop',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 15,
      capacidadMinima: 0.05,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 0.002,
      numeroDivisionesVerificacion: 7500,
      codigoPrecintoSIMEL: 'STAMP-CO-4491028',
      propietario: {
        nombreRazonSocial: 'Panificadora Bimbo de Colombia S.A.',
        nitRut: '830.003.558-7',
        direccion: 'Variante Chía-Cota Km 1.5',
        ciudad: 'Pereira',
        departamento: 'Risaralda',
      },
      ubicacionFisica: 'Línea 3 - Dosificación e Ingredientes de Masa Madre',
      fechaUltimaCalibracion: hace11MesesYMedio,
      fechaProximaCalibracion: dentroDe10Dias,
      estado: EstadoInstrumento.POR_VENCER,
      evidenciasFotograficas: {
        fotoEquipo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
        fotoPrecinto: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        fotoUbicacion: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80',
      },
      creadoPor: adminUser._id,
    },
  ];

  const instrumentosGuardados = await instrumentoModel.insertMany(instrumentosData);
  console.log(`✅ ${instrumentosGuardados.length} instrumentos creados con fotografías de alta resolución.\n`);

  // =========================================================================
  // 3. CALIBRACIONES Y ENSAYOS METROLÓGICOS (NTC 2031 / OIML R 76-1)
  // =========================================================================
  console.log('🔬 Registrando calibraciones, ensayos de excentricidad y EMP...');

  const patronesComerciales = [
    {
      codigoPatron: 'PAT-M1-SET-01',
      descripcion: 'Juego de Pesas Patrón Clase M1 de 1g a 20kg en Acero Inoxidable',
      certificadoTrazabilidad: 'INM-COL-MET-2025-00412',
      fechaVencimientoPatron: dentroDe10Meses,
    },
    {
      codigoPatron: 'PAT-F1-05KG',
      descripcion: 'Pesa Paralelepípeda Patrón F1 de 5kg Calibrada por Interferometría',
      certificadoTrazabilidad: 'INM-COL-MET-2025-00109',
      fechaVencimientoPatron: dentroDe10Meses,
    },
  ];

  const calibracionesData: any[] = [];
  const certificadosData: any[] = [];

  for (const inst of instrumentosGuardados) {
    const esConforme = inst.estado !== EstadoInstrumento.VENCIDO;
    const numCertificado = `CERT-${inst.serial.replace(/[^0-9]/g, '') || '001'}-2025`;
    const folioCode = `FOLIO-${inst.serial}-SIC`;

    // Generar tabla de errores EMP según NTC 2031 para cada capacidad
    const e = inst.divisionEscala;
    const max = inst.capacidadMaxima;
    const p1 = Number((max * 0.1).toFixed(3));
    const p2 = Number((max * 0.25).toFixed(3));
    const p3 = Number((max * 0.5).toFixed(3));
    const p4 = Number((max * 0.75).toFixed(3));
    const p5 = max;

    const empBase = inst.categoriaExactitud === CategoriaExactitud.CLASE_I ? e * 1.5 : e * 2.0;

    const puntosMedicion = [
      {
        cargaNominal: p1,
        errorEncontrado: esConforme ? Number((empBase * 0.2).toFixed(4)) : Number((empBase * 2.4).toFixed(4)),
        errorMaximoPermitido: empBase,
        cumple: esConforme,
      },
      {
        cargaNominal: p2,
        errorEncontrado: esConforme ? Number((-empBase * 0.3).toFixed(4)) : Number((empBase * 3.1).toFixed(4)),
        errorMaximoPermitido: empBase,
        cumple: esConforme,
      },
      {
        cargaNominal: p3,
        errorEncontrado: esConforme ? Number((empBase * 0.4).toFixed(4)) : Number((-empBase * 2.8).toFixed(4)),
        errorMaximoPermitido: empBase * 1.5,
        cumple: esConforme,
      },
      {
        cargaNominal: p4,
        errorEncontrado: esConforme ? Number((empBase * 0.6).toFixed(4)) : Number((empBase * 3.5).toFixed(4)),
        errorMaximoPermitido: empBase * 1.5,
        cumple: esConforme,
      },
      {
        cargaNominal: p5,
        errorEncontrado: esConforme ? Number((empBase * 0.8).toFixed(4)) : Number((empBase * 4.2).toFixed(4)),
        errorMaximoPermitido: empBase * 2.0,
        cumple: esConforme,
      },
    ];

    calibracionesData.push({
      instrumento: inst._id,
      tecnico: tecnicoUser._id,
      laboratorioAcreditado: 'METROLOGÍA INDUSTRIAL DE COLOMBIA S.A.S. (ONAC-18-LAB-042)',
      numeroCertificado: numCertificado,
      codigoFolio: folioCode,
      fechaCalibracion: inst.fechaUltimaCalibracion,
      fechaProximaCalibracion: inst.fechaProximaCalibracion,
      resultado: esConforme ? ResultadoCalibracion.CONFORME : ResultadoCalibracion.NO_CONFORME,
      codigoPrecintoSIMEL: inst.codigoPrecintoSIMEL,
      patronesUtilizados: patronesComerciales,
      erroresMaximosPermitidos: puntosMedicion,
      incertidumbreExpandida: `U = ${(inst.divisionEscala * 0.35).toFixed(4)} ${inst.unidadMedida} (k=2, 95.45% factor de cobertura normal)`,
      observaciones: esConforme
        ? 'Ensayos metrológicos reglamentarios según NTC 2031 / OIML R 76-1. El equipo opera dentro del Error Máximo Permitido.'
        : 'ADVERTENCIA: Errores sistemáticos en carga media y máxima exceden el EMP permitido por la SIC. Instrumento rechazado para uso en comercio.',
      bloqueadoInmutable: true,
      archivoInformeUrl: `/api/calibraciones/${numCertificado}/pdf`,
    });
  }

  const calibracionesGuardadas = await calibracionModel.insertMany(calibracionesData);
  console.log(`✅ ${calibracionesGuardadas.length} calibraciones técnicas inmutables creadas.\n`);

  // =========================================================================
  // 4. CERTIFICADOS DIGITALES (Fase 4 & HU-04: Firma HSM + Código QR Dinámico)
  // =========================================================================
  console.log('📜 Generando certificados digitales con estampados criptográficos...');

  for (let i = 0; i < calibracionesGuardadas.length; i++) {
    const cal = calibracionesGuardadas[i];
    const inst = instrumentosGuardados[i];
    const esValido = cal.resultado === ResultadoCalibracion.CONFORME;

    certificadosData.push({
      codigoFolio: cal.codigoFolio,
      instrumento: inst._id,
      calibracion: cal._id,
      emitidoPor: adminUser._id,
      tipoCertificado: TipoCertificado.CONFORMIDAD_METROLOGICA,
      fechaEmision: cal.fechaCalibracion,
      fechaVencimiento: cal.fechaProximaCalibracion,
      codigoQR: `https://weightcontrol.gov.co/verificar/${cal.codigoFolio}`,
      firmaDigital: {
        firmante: adminUser.nombre,
        cargo: 'Director Nacional de Control Metrológico - SIC',
        fechaFirma: cal.fechaCalibracion,
        hashFirma: 'b4a9f93315a6b0c6df8b09341416e788f6a9e10ff61b0c036322ad19239a0397',
      },
      sellosAplicados: [
        'ConMarcaAgua',
        'ConFirmaDigital',
        'SelloSIMEL',
        'EstampadoCronologicoNIST',
        'AcreditacionONAC',
      ],
      estado: esValido ? EstadoCertificado.VALIDO : EstadoCertificado.EXPIRADO,
      motivoAnulacion: esValido ? undefined : 'Vencimiento reglamentario anual sin recertificación metrológica.',
      pdfUrl: `/api/calibraciones/${cal._id}/pdf`,
    });
  }

  const certificadosGuardados = await certificadoModel.insertMany(certificadosData);
  console.log(`✅ ${certificadosGuardados.length} certificados oficiales emitidos y firmados digitalmente.\n`);

  // =========================================================================
  // 5. ALERTAS METROLÓGICAS TEMPRANAS (HU-02 & Sistema de Vigilancia SIC)
  // =========================================================================
  console.log('🚨 Generando alertas preventivas y críticas de vigilancia...');

  const alertasData: any[] = [];
  for (const inst of instrumentosGuardados) {
    if (inst.estado === EstadoInstrumento.POR_VENCER) {
      alertasData.push({
        instrumento: inst._id,
        serial: inst.serial,
        marca: inst.marca,
        modelo: inst.modelo,
        fechaProximaCalibracion: inst.fechaProximaCalibracion,
        diasRestantes: 20,
        nivelCriticidad: NivelAlerta.PREVENTIVA,
        mensaje: `El instrumento de pesaje ${inst.serial} (${inst.marca} ${inst.modelo}) en ${inst.propietario?.ciudad} vencerá en los próximos 20 días. Se requiere agendar calibración reglamentaria SIMEL.`,
        canalesNotificados: ['EMAIL', 'SISTEMA', 'SMS_SIMEL'],
        leida: false,
        despachada: true,
      });
    } else if (inst.estado === EstadoInstrumento.VENCIDO) {
      alertasData.push({
        instrumento: inst._id,
        serial: inst.serial,
        marca: inst.marca,
        modelo: inst.modelo,
        fechaProximaCalibracion: inst.fechaProximaCalibracion,
        diasRestantes: -85,
        nivelCriticidad: NivelAlerta.VENCIDA,
        mensaje: `ATENCIÓN: El instrumento ${inst.serial} perteneciente a '${inst.propietario?.nombreRazonSocial}' superó la fecha límite de calibración legal. El uso comercial se encuentra suspendido.`,
        canalesNotificados: ['EMAIL', 'SISTEMA', 'AUDIT_LOG', 'NOTIFICACION_SIC'],
        leida: false,
        despachada: true,
      });
    }
  }

  const alertasGuardadas = await alertaModel.insertMany(alertasData);
  console.log(`✅ ${alertasGuardadas.length} alertas metrológicas activadas.\n`);

  // =========================================================================
  // 6. TRAZABILIDAD Y AUDITORÍA ISO/IEC 27001 (HU-05)
  // =========================================================================
  console.log('🛡️  Registrando pistas de auditoría inmutable en trazabilidad_eventos...');

  const eventosAuditoria: any[] = [
    {
      timestamp: hace2Meses,
      userId: adminUser._id,
      userRole: adminUser.rol,
      actionType: TipoAccionAuditoria.CREATE,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: 'BAL-2025-99201-BOG',
      newState: {
        serial: 'BAL-2025-99201-BOG',
        propietario: 'Almacenes Éxito S.A.',
        precinto: 'STAMP-CO-9982415',
      },
      ipAddress: '190.158.204.12',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) WeightControl-Desktop/1.0',
      descripcion: 'Registro inicial de báscula comercial en SIMEL con carga de evidencias fotográficas',
    },
    {
      timestamp: hace2Meses,
      userId: tecnicoUser._id,
      userRole: tecnicoUser.rol,
      actionType: TipoAccionAuditoria.CALIBRATE,
      entityAffected: EntidadAfectada.CALIBRACION,
      identifier: 'CERT-202599201-2025',
      newState: {
        calibracionFolio: 'FOLIO-BAL-2025-99201-BOG-SIC',
        resultado: 'Conforme',
        empCumplido: true,
      },
      ipAddress: '186.84.90.15',
      userAgent: 'MetrologyStation/3.4 (Ubuntu Linux 24.04; x64)',
      descripcion: 'Ejecución exitosa de ensayo de exactitud y linealidad según NTC 2031',
    },
    {
      timestamp: hace1Mes,
      userId: adminUser._id,
      userRole: adminUser.rol,
      actionType: TipoAccionAuditoria.GENERATE_CERT,
      entityAffected: EntidadAfectada.CERTIFICADO,
      identifier: 'FOLIO-BAL-2026-85286-BOG-SIC',
      newState: {
        folio: 'FOLIO-BAL-2026-85286-BOG-SIC',
        firmaHSM: true,
        entidad: 'Superintendencia de Industria y Comercio',
      },
      ipAddress: '190.158.204.12',
      userAgent: 'WeightControl-SecurityGateway/2.1',
      descripcion: 'Generación y firma digital del certificado de calibración Clase I para Baxter S.A.S.',
    },
    {
      timestamp: hace11Meses,
      userId: inspectorUser._id,
      userRole: inspectorUser.rol,
      actionType: TipoAccionAuditoria.INSPECTION,
      entityAffected: EntidadAfectada.INSTRUMENTO,
      identifier: 'CAM-2024-11840-MED',
      newState: {
        resultadoInspeccion: 'NO_CONFORME',
        motivo: 'Desviación en celda de carga 4 superó EMP en 35kg',
      },
      ipAddress: '200.69.112.5',
      userAgent: 'SIC-MobileInspector/1.8 (Android 14)',
      descripcion: 'Inspección de campo en planta Cervecería Unión S.A. Detectada no conformidad metrológica',
    },
    {
      timestamp: new Date(Date.now() - 2 * 3600 * 1000),
      userId: adminUser._id,
      userRole: adminUser.rol,
      actionType: TipoAccionAuditoria.AUTH_LOGIN,
      entityAffected: EntidadAfectada.USUARIO,
      identifier: adminUser.email,
      ipAddress: '190.158.204.12',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0',
      descripcion: 'Inicio de sesión exitoso con credenciales de alta gerencia metrológica',
    },
  ];

  await trazabilidadModel.insertMany(eventosAuditoria);
  console.log(`✅ ${eventosAuditoria.length} eventos de auditoría ISO 27001 creados.\n`);

  console.log('========================================================');
  console.log('🎉 SEED METROLÓGICO COMPLETADO CON ÉXITO');
  console.log('   - 5 Usuarios (Admin, Auditor SIC, Técnico ONAC, etc.)');
  console.log('   - 7 Instrumentos (Clases I, II, III, IIII con Fotos HD)');
  console.log('   - 7 Calibraciones con Ensayos Metrológicos');
  console.log('   - 7 Certificados Oficiales con QR y Firma Digital');
  console.log('   - Alertas preventivas y críticas activas');
  console.log('   - Pistas de auditoría inmutable ISO 27001');
  console.log('========================================================\n');

  await app.close();
}

bootstrapSeed().catch((err) => {
  console.error('❌ Error catastrófico en seed:', err);
  process.exit(1);
});
