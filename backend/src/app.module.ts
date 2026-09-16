import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { InstrumentosModule } from './modules/instrumentos/instrumentos.module.js';
import { CalibracionesModule } from './modules/calibraciones/calibraciones.module.js';
import { AlertasModule } from './modules/alertas/alertas.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri:
          configService.get<string>('MONGODB_URI') ||
          'mongodb://admin:adminpassword123@localhost:27018/weightcontrol?authSource=admin',
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    InstrumentosModule,
    CalibracionesModule,
    AlertasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
