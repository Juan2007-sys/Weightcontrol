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
  Alerta,
  AlertaDocument,
  NivelAlerta,
} from '../schemas/index.js';

async function bootstrapSeed() {
  console.log('🌱 Iniciando carga de datos iniciales (Seed)...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const usuarioModel = app.get<Model<UsuarioDocument>>(getModelToken(Usuario.name));
  const instrumentoModel = app.get<Model<InstrumentoDocument>>(getModelToken(Instrumento.name));
  const calibracionModel = app.get<Model<CalibracionDocument>>(getModelToken(Calibracion.name));
  const alertaModel = app.get<Model<AlertaDocument>>(getModelToken(Alerta.name));

  const passwordHashAdmin = await bcrypt.hash('Admin123456!', 10);
  const passwordHashTecnico = await bcrypt.hash('Tecnico123456!', 10);
  const passwordHashInspector = await bcrypt.hash('Inspector123456!', 10);

  // 1. Usuarios
  const usuariosSeed = [
    {
      nombre: 'Administrador Central SIC',
      email: 'admin@weightcontrol.gov.co',
      password: passwordHashAdmin,
      rol: RolUsuario.ADMIN,
      cargo: 'DIRECTOR NACIONAL DE METROLOGÍA LEGAL',
      entidad: 'Superintendencia de Industria y Comercio',
      activo: true,
    },
    {
      nombre: 'Ing. M. Gómez B.',
      email: 'inspector@sic.gov.co',
      password: passwordHashInspector,
      rol: RolUsuario.AUDITOR,
      cargo: 'AUDITOR FISCALIZADOR III',
      entidad: 'Superintendencia de Industria y Comercio',
      activo: true,
    },
    {
      nombre: 'Técnico Metrólogo Juan Pérez',
      email: 'tecnico@oec-onac.org',
      password: passwordHashTecnico,
      rol: RolUsuario.TECNICO,
      cargo: 'METRÓLOGO SENIOR CALIBRADOR',
      entidad: 'ONAC-18-LAB-042',
      activo: true,
    },
  ];

  for (const u of usuariosSeed) {
    const exists = await usuarioModel.findOne({ email: u.email });
    if (!exists) {
      await usuarioModel.create(u);
      console.log(`✅ Usuario creado: ${u.email}`);
    } else {
      console.log(`ℹ️ Usuario ya existe: ${u.email}`);
    }
  }

  const adminUser = await usuarioModel.findOne({ email: 'admin@weightcontrol.gov.co' });
  const adminId = adminUser?._id ? String(adminUser._id) : undefined;

  // 2. Instrumentos
  const instrumentosSeed = [
    {
      serial: 'BAL-2025-99201-BOG',
      marca: 'Torrey',
      modelo: 'L-EQ-10/20',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 30,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 5,
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
      fechaUltimaCalibracion: new Date('2025-05-14T09:15:00.000Z'),
      fechaProximaCalibracion: new Date('2026-05-14T09:15:00.000Z'),
      estado: EstadoInstrumento.VIGENTE,
      creadoPor: adminId as any,
    },
    {
      serial: 'CAM-2024-11840-MED',
      marca: 'Toledo',
      modelo: 'Jaguar 8142',
      tipo: TipoInstrumento.BASCULA,
      categoriaExactitud: CategoriaExactitud.CLASE_III,
      capacidadMaxima: 80000,
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
      fechaUltimaCalibracion: new Date('2024-04-10T14:30:00.000Z'),
      fechaProximaCalibracion: new Date('2025-04-10T14:30:00.000Z'),
      estado: EstadoInstrumento.VENCIDO,
      creadoPor: adminId as any,
    },
    {
      serial: 'DISP-2025-33412-CAL',
      marca: 'Gilbarco',
      modelo: 'Encore 500S',
      tipo: TipoInstrumento.DINAMOMETRO,
      categoriaExactitud: CategoriaExactitud.CLASE_II,
      capacidadMaxima: 200,
      unidadMedida: UnidadMedida.KG,
      divisionEscala: 2,
      codigoPrecintoSIMEL: 'STAMP-CO-7719201',
      propietario: {
        nombreRazonSocial: 'Terpel Colombia S.A.S.',
        nitRut: '860.004.832-1',
        direccion: 'Av. Pasoancho con Calle 13',
        ciudad: 'Cali',
        departamento: 'Valle del Cauca',
      },
      ubicacionFisica: 'Isla 02 Manguera 04',
      fechaUltimaCalibracion: new Date('2025-01-20T11:00:00.000Z'),
      fechaProximaCalibracion: new Date('2025-10-20T11:00:00.000Z'),
      estado: EstadoInstrumento.POR_VENCER,
      creadoPor: adminId as any,
    },
  ];

  for (const inst of instrumentosSeed) {
    const exists = await instrumentoModel.findOne({ serial: inst.serial });
    if (!exists) {
      const created = await (instrumentoModel as any).create(inst);
      console.log(`✅ Instrumento creado: ${inst.serial}`);

      const createdId = created?._id ? String(created._id) : undefined;

      // Calibración inicial asociada
      await (calibracionModel as any).create({
        instrumento: createdId,
        tecnico: adminId,
        laboratorioAcreditado: 'METROLOGÍA INDUSTRIAL DE COLOMBIA S.A.S. (ONAC-18-LAB-042)',
        numeroCertificado: `CERT-${inst.serial.replace(/[^0-9]/g, '')}-2025`,
        fechaCalibracion: inst.fechaUltimaCalibracion,
        fechaProximaCalibracion: inst.fechaProximaCalibracion,
        resultado: inst.estado === EstadoInstrumento.VENCIDO ? ResultadoCalibracion.NO_CONFORME : ResultadoCalibracion.CONFORME,
        codigoPrecintoSIMEL: inst.codigoPrecintoSIMEL,
        observaciones: 'Ensayos metrológicos reglamentarios según NTC 2031.',
      });
    } else {
      console.log(`ℹ️ Instrumento ya existe: ${inst.serial}`);
    }
  }

  // 3. Alertas
  const instVencido = await instrumentoModel.findOne({ serial: 'CAM-2024-11840-MED' });
  const instPorVencer = await instrumentoModel.findOne({ serial: 'DISP-2025-33412-CAL' });

  const alertasSeed = [];

  if (instPorVencer) {
    alertasSeed.push({
      instrumento: instPorVencer._id,
      serial: instPorVencer.serial,
      marca: instPorVencer.marca,
      modelo: instPorVencer.modelo,
      fechaProximaCalibracion: instPorVencer.fechaProximaCalibracion,
      diasRestantes: 25,
      nivelCriticidad: NivelAlerta.PREVENTIVA,
      mensaje: 'El equipo DISP-2025-33412-CAL en Cali requiere verificación metrológica obligatoria.',
      canalesNotificados: ['EMAIL', 'SISTEMA'],
      leida: false,
      despachada: true,
    });
  }

  if (instVencido) {
    alertasSeed.push({
      instrumento: instVencido._id,
      serial: instVencido.serial,
      marca: instVencido.marca,
      modelo: instVencido.modelo,
      fechaProximaCalibracion: instVencido.fechaProximaCalibracion,
      diasRestantes: -150,
      nivelCriticidad: NivelAlerta.VENCIDA,
      mensaje: 'La báscula CAM-2024-11840-MED superó la fecha límite sin calibración registrada.',
      canalesNotificados: ['EMAIL', 'SISTEMA', 'AUDIT_LOG'],
      leida: false,
      despachada: true,
    });
  }

  for (const a of alertasSeed) {
    const exists = await alertaModel.findOne({ serial: a.serial, nivelCriticidad: a.nivelCriticidad });
    if (!exists) {
      await (alertaModel as any).create(a);
      console.log(`✅ Alerta creada: ${a.serial} (${a.nivelCriticidad})`);
    } else {
      console.log(`ℹ️ Alerta ya existe: ${a.serial} (${a.nivelCriticidad})`);
    }
  }

  console.log('🎉 Seed completado exitosamente.');
  await app.close();
}

bootstrapSeed().catch((err) => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
