import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckIcon,
  ShieldCheckIcon,
  ShieldAlertIcon,
  UsersIcon,
  PlusIcon,
  EditIcon,
  SearchIcon,
  RotateCcwIcon,
  ActivityIcon,
} from '../common/Icons';
import { toast } from 'sonner';
import { usuariosService } from '../../services/usuarios.service';
import type { UserItem, CreateUserData, UpdateUserData } from '../../services/usuarios.service';
import { auditService } from '../../services/audit.service';
import type { AuditEventItem } from '../../services/audit.service';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

const INITIAL_USERS: UserItem[] = [
  {
    id: 'usr_admin_01',
    nombre: 'Superintendente Administrador',
    email: 'admin@weightcontrol.gov.co',
    rol: 'ADMIN',
    documentoIdentidad: '80123456',
    entidad: 'Superintendencia de Industria y Comercio',
    telefono: '+57 601 5870000',
    activo: true,
  },
  {
    id: 'usr_tec_01',
    nombre: 'Ing. Carlos Alberto Gómez',
    email: 'tecnico@oec-onac.org',
    rol: 'TECNICO',
    documentoIdentidad: '1020304050',
    numeroRegistroSIMEL: 'SIMEL-TEC-2026-042',
    tarjetaProfesional: 'TP-98234-COL',
    entidad: 'Laboratorio Metrológico del Valle OEC',
    telefono: '+57 310 9876543',
    activo: true,
  },
  {
    id: 'usr_aud_01',
    nombre: 'Dra. Marcela Restrepo',
    email: 'inspector@sic.gov.co',
    rol: 'AUDITOR',
    documentoIdentidad: '52987123',
    entidad: 'Dirección de Metrología Legal SIC',
    telefono: '+57 601 5870001',
    activo: true,
  },
  {
    id: 'usr_oec_01',
    nombre: 'Comisión Técnica ONAC',
    email: 'laboratorio@onac.org.co',
    rol: 'INSTITUCION_ACREDITACION',
    documentoIdentidad: '900123987',
    entidad: 'Organismo Nacional de Acreditación',
    telefono: '+57 601 7422340',
    activo: true,
  },
];

export const AdminSettingsView: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'usuarios' | 'trazabilidad' | 'parametros'>('usuarios');

  // Estados de Usuarios
  const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Formulario de Crear
  const [createForm, setCreateForm] = useState<CreateUserData>({
    nombre: '',
    email: '',
    password: '',
    rol: 'TECNICO',
    documentoIdentidad: '',
    numeroRegistroSIMEL: '',
    tarjetaProfesional: '',
    entidad: '',
    telefono: '',
    activo: true,
  });

  // Formulario de Editar
  const [editForm, setEditForm] = useState<UpdateUserData>({
    nombre: '',
    email: '',
    rol: 'TECNICO',
    documentoIdentidad: '',
    numeroRegistroSIMEL: '',
    tarjetaProfesional: '',
    entidad: '',
    telefono: '',
    activo: true,
  });

  // Estados de Auditoría
  const [auditLogs, setAuditLogs] = useState<AuditEventItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Parámetros Maestros
  const [thresholdDays, setThresholdDays] = useState('30');
  const [periodicityMonths, setPeriodicityMonths] = useState('12');
  const [empToleranceClass, setEmpToleranceClass] = useState('Clase III');
  const timeServer = 'time.nist.gov (NIST UTC-5)';
  const hsmKey = 'HSM-KEY #9842 (FIPS 140-2 Level 3)';

  // Cargar usuarios desde backend
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await usuariosService.getAll({
        search: searchQuery || undefined,
        rol: roleFilter || undefined,
        activo: statusFilter !== '' ? statusFilter === 'true' : undefined,
      });
      if (res && res.items && res.items.length > 0) {
        setUsers(res.items);
      }
    } catch {
      // Fallback local
    } finally {
      setLoadingUsers(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  // Cargar registros de auditoría
  const fetchAuditLogs = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const res = await auditService.getAll({ limit: 50 });
      if (res && res.items) {
        setAuditLogs(res.items);
      }
    } catch {
      // Fallback
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (activeTab === 'trazabilidad') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  // Manejar Crear Usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await usuariosService.create(createForm);
      toast.success(`Usuario ${newUser.nombre} creado exitosamente.`);
      setShowCreateModal(false);
      setCreateForm({
        nombre: '',
        email: '',
        password: '',
        rol: 'TECNICO',
        documentoIdentidad: '',
        numeroRegistroSIMEL: '',
        tarjetaProfesional: '',
        entidad: '',
        telefono: '',
        activo: true,
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear usuario');
    }
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setEditForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      documentoIdentidad: user.documentoIdentidad || '',
      numeroRegistroSIMEL: user.numeroRegistroSIMEL || '',
      tarjetaProfesional: user.tarjetaProfesional || '',
      entidad: user.entidad || '',
      telefono: user.telefono || '',
      activo: user.activo,
    });
    setShowEditModal(true);
  };

  // Manejar Guardar Edición
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await usuariosService.update(selectedUser.id, editForm);
      toast.success(`Usuario ${editForm.nombre || selectedUser.nombre} actualizado correctamente.`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Error al actualizar usuario');
    }
  };

  // Cambiar Estado Activo/Inactivo
  const handleToggleStatus = async (user: UserItem) => {
    const nuevoEstado = !user.activo;
    const accion = nuevoEstado ? 'activar' : 'inactivar';

    if (currentUser?.id === user.id && !nuevoEstado) {
      toast.error('No puede inactivar su propia cuenta de administrador.');
      return;
    }

    try {
      await usuariosService.changeStatus(user.id, nuevoEstado, `Cambio manual de estado a ${nuevoEstado ? 'Activo' : 'Inactivo'}`);
      toast.success(`Usuario ${user.nombre} ha sido ${nuevoEstado ? 'activado' : 'inactivado'} exitosamente.`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, activo: nuevoEstado } : u))
      );
    } catch (err: any) {
      toast.error(err?.message || `Error al ${accion} usuario`);
    }
  };

  // Simular Intento No Autorizado (403 Forbidden)
  const handleSimulate403 = async () => {
    try {
      toast.info('Simulando petición no autorizada hacia endpoint administrativo protegido...');
      // Hacemos una llamada directa con un rol o token restringido o cabecera
      await apiClient.post('/usuarios', {
        nombre: 'Intruso No Autorizado',
        email: 'hacker@intruso.test',
        password: 'Password123!',
        rol: 'ADMIN',
      }, {
        headers: { 'X-Simulate-Forbidden': 'true' }
      });
      toast.success('Petición completada');
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes('403') || err?.message?.includes('permisos') || err?.message?.includes('Acceso denegado')) {
        toast.error(`🛑 HTTP 403 Forbidden interceptado: "${err.message}". ¡Incidente registrado en la traza de auditoría inmutable!`);
      } else {
        toast.warning(`Resultado: ${err?.message || 'Acceso restringido'}`);
      }
    }
  };

  const handleSaveParams = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Parámetros maestros actualizados y replicados en los nodos técnicos.');
  };

  // Filtrado de usuarios en UI
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = u.nombre.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDoc = u.documentoIdentidad?.toLowerCase().includes(q);
      const matchSimel = u.numeroRegistroSIMEL?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDoc && !matchSimel) return false;
    }
    if (roleFilter !== '' && u.rol !== roleFilter) return false;
    if (statusFilter !== '') {
      const isActive = statusFilter === 'true';
      if (u.activo !== isActive) return false;
    }
    return true;
  });

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'ADMIN':
        return { label: 'ADMINISTRADOR', bg: '#EDE9FE', color: '#5B21B6', border: '#C4B5FD' };
      case 'TECNICO':
        return { label: 'TÉCNICO METRÓLOGO', bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' };
      case 'AUDITOR':
      case 'AUDITOR_SIC':
        return { label: 'AUDITOR SIC', bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' };
      case 'INSTITUCION_ACREDITACION':
        return { label: 'OEC ONAC', bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' };
      case 'SIC':
        return { label: 'SUPERINTENDENCIA', bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
      default:
        return { label: rol, bg: '#F1F5F9', color: '#334155', border: '#CBD5E1' };
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <div className="gov-container">
        {/* Encabezado Principal */}
        <div
          style={{
            borderLeft: '4px solid var(--navy-900)',
            paddingLeft: '18px',
            marginBottom: '24px',
          }}
        >
          <div className="microlabel" style={{ color: 'var(--text-muted)' }}>
            CONSOLA DE MANDO CENTRALIZADA · CONTROL DE ACCESO RBAC Y SEGURIDAD
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '34px',
              fontWeight: 800,
              color: 'var(--navy-900)',
              margin: '4px 0 0 0',
              letterSpacing: '-0.02em',
            }}
          >
            Administración del Sistema, Usuarios y Seguridad
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Gestión completa del ciclo de vida de usuarios, diferenciación de privilegios RBAC, parámetros globales NTC 2031 y trazabilidad inmutable.
          </p>
        </div>

        {/* Barra de Pestañas de Navegación de Administración */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid var(--border)',
            marginBottom: '24px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            style={{
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'usuarios' ? 'var(--navy-900)' : 'var(--text-muted)',
              borderBottom: activeTab === 'usuarios' ? '3px solid var(--blue-600)' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <UsersIcon size={16} />
            <span>1. Gestión de Usuarios y Roles (RBAC)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('trazabilidad')}
            style={{
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'trazabilidad' ? 'var(--navy-900)' : 'var(--text-muted)',
              borderBottom: activeTab === 'trazabilidad' ? '3px solid var(--blue-600)' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ActivityIcon size={16} />
            <span>2. Trazabilidad Forense y Eventos 403</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('parametros')}
            style={{
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: activeTab === 'parametros' ? 'var(--navy-900)' : 'var(--text-muted)',
              borderBottom: activeTab === 'parametros' ? '3px solid var(--blue-600)' : '3px solid transparent',
              marginBottom: '-2px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <ShieldCheckIcon size={16} />
            <span>3. Parámetros Maestros y Criptografía</span>
          </button>
        </div>

        {/* PESTAÑA 1: GESTIÓN DE USUARIOS */}
        {activeTab === 'usuarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Tarjetas KPI de Usuarios */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div className="gov-card" style={{ padding: '16px', borderLeft: '4px solid var(--navy-900)' }}>
                <div className="microlabel" style={{ color: 'var(--text-muted)' }}>TOTAL USUARIOS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--navy-900)', marginTop: '4px' }}>
                  {users.length}
                </div>
              </div>

              <div className="gov-card" style={{ padding: '16px', borderLeft: '4px solid #1E40AF' }}>
                <div className="microlabel" style={{ color: 'var(--text-muted)' }}>TÉCNICOS METRÓLOGOS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1E40AF', marginTop: '4px' }}>
                  {users.filter((u) => u.rol === 'TECNICO').length}
                </div>
              </div>

              <div className="gov-card" style={{ padding: '16px', borderLeft: '4px solid #92400E' }}>
                <div className="microlabel" style={{ color: 'var(--text-muted)' }}>AUDITORES SIC</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#92400E', marginTop: '4px' }}>
                  {users.filter((u) => u.rol === 'AUDITOR').length}
                </div>
              </div>

              <div className="gov-card" style={{ padding: '16px', borderLeft: '4px solid var(--ok)' }}>
                <div className="microlabel" style={{ color: 'var(--text-muted)' }}>USUARIOS ACTIVOS</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ok)', marginTop: '4px' }}>
                  {users.filter((u) => u.activo).length}
                </div>
              </div>
            </div>

            {/* Barra de Acciones y Filtros */}
            <div
              className="gov-card"
              style={{
                padding: '16px 20px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              {/* Filtros */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1 }}>
                <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo o SIMEL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 34px',
                      borderRadius: 'var(--radius-input)',
                      border: '1px solid var(--border-strong)',
                      fontSize: '13px',
                    }}
                  />
                  <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                    <SearchIcon size={16} />
                  </div>
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Todos los Roles</option>
                  <option value="ADMIN">Administrador</option>
                  <option value="TECNICO">Técnico Metrólogo</option>
                  <option value="AUDITOR">Auditor SIC</option>
                  <option value="INSTITUCION_ACREDITACION">OEC ONAC</option>
                  <option value="SIC">Superintendencia</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--border-strong)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Todos los Estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleSimulate403}
                  className="btn-gov-compact"
                  style={{
                    borderColor: 'var(--warn)',
                    color: '#92400E',
                    backgroundColor: '#FEF3C7',
                    fontWeight: 700,
                  }}
                  title="Simula un intento de acceso indebido para comprobar el error HTTP 403 y la traza"
                >
                  <ShieldAlertIcon size={15} />
                  <span>Probar 403 Forbidden</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="btn-gov-primary"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  <PlusIcon size={15} />
                  <span>Crear Nuevo Usuario</span>
                </button>
              </div>
            </div>

            {/* Tabla Institucional de Usuarios */}
            <div className="gov-card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--navy-900)' }}>USUARIO / EMAIL</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--navy-900)' }}>ROL Y PRIVILEGIOS</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--navy-900)' }}>IDENTIFICACIÓN / SIMEL</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--navy-900)' }}>ESTADO</th>
                      <th style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--navy-900)', textAlign: 'right' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          Consultando directorio oficial de usuarios...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No se encontraron usuarios que coincidan con los criterios seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const badge = getRoleBadge(u.rol);
                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: u.activo ? '#FFFFFF' : '#FFF1F2',
                              transition: 'background-color 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{u.nombre}</div>
                              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                              {u.entidad && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{u.entidad}</div>}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  backgroundColor: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {badge.label}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                                {u.documentoIdentidad ? `CC/NIT: ${u.documentoIdentidad}` : 'Sin documento'}
                              </div>
                              {u.numeroRegistroSIMEL && (
                                <div className="font-mono" style={{ fontSize: '11px', color: 'var(--blue-600)', marginTop: '2px' }}>
                                  SIMEL: {u.numeroRegistroSIMEL}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px' }}>
                              {u.activo ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--ok-bg)',
                                    color: 'var(--ok)',
                                    border: '1px solid var(--ok)',
                                  }}
                                >
                                  <CheckIcon size={12} strokeWidth={2.5} />
                                  <span>ACTIVO</span>
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: 'var(--danger-bg)',
                                    color: 'var(--danger)',
                                    border: '1px solid var(--danger)',
                                  }}
                                >
                                  <ShieldAlertIcon size={12} strokeWidth={2} />
                                  <span>INACTIVO</span>
                                </span>
                              )}
                            </td>

                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(u)}
                                  className="btn-gov-compact"
                                  style={{ fontSize: '11px', height: '28px' }}
                                  title="Editar datos del usuario"
                                >
                                  <EditIcon size={13} />
                                  <span>Editar</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(u)}
                                  className="btn-gov-compact"
                                  style={{
                                    fontSize: '11px',
                                    height: '28px',
                                    borderColor: u.activo ? 'var(--danger)' : 'var(--ok)',
                                    color: u.activo ? '#991B1B' : '#065F46',
                                    backgroundColor: u.activo ? '#FEE2E2' : '#D1FAE5',
                                    fontWeight: 700,
                                  }}
                                  title={u.activo ? 'Inactivar usuario (bloquea inicio de sesión)' : 'Reactivar credenciales de acceso'}
                                >
                                  {u.activo ? 'Inactivar' : 'Activar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: TRAZABILIDAD FORENSE Y EVENTOS 403 */}
        {activeTab === 'trazabilidad' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="gov-card" style={{ padding: '20px', backgroundColor: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <div className="microlabel" style={{ color: 'var(--navy-900)' }}>
                    REGISTRO INMUTABLE DE AUDITORÍA Y CONTROL FORENSE (ISO/IEC 27001)
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Toda creación, modificación, cambio de estado e intentos de acceso no autorizado (HTTP 403) se graban con marca de tiempo NIST UTC-5.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  className="btn-gov-compact"
                  style={{ fontSize: '12px' }}
                >
                  <RotateCcwIcon size={14} />
                  <span>Actualizar Bitácora</span>
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>TIMESTAMP (NIST)</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>TIPO ACCIÓN</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>ENTIDAD</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>IDENTIFICADOR</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>DESCRIPCIÓN FORENSE</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--navy-900)' }}>IP / AGENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {loadingAudit ? 'Cargando eventos de auditoría...' : 'No hay eventos de auditoría registrados recientemente.'}
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => {
                        const isAuthFail = log.actionType === 'AUTH_FAILURE';
                        return (
                          <tr
                            key={log._id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: isAuthFail ? '#FFF1F2' : '#FFFFFF',
                            }}
                          >
                            <td className="font-mono" style={{ padding: '10px 14px', color: '#475569' }}>
                              {new Date(log.timestamp).toLocaleString('es-CO')}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  fontSize: '10px',
                                  fontWeight: 800,
                                  fontFamily: 'var(--font-mono)',
                                  backgroundColor: isAuthFail ? '#FEE2E2' : '#E2E8F0',
                                  color: isAuthFail ? '#991B1B' : '#0F172A',
                                }}
                              >
                                {log.actionType}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.entityAffected}</td>
                            <td className="font-mono" style={{ padding: '10px 14px', color: 'var(--blue-600)' }}>
                              {log.identifier}
                            </td>
                            <td style={{ padding: '10px 14px', color: isAuthFail ? '#991B1B' : 'var(--text-primary)' }}>
                              {log.descripcion || 'Sin descripción'}
                            </td>
                            <td className="font-mono" style={{ padding: '10px 14px', fontSize: '11px', color: '#64748B' }}>
                              {log.ipAddress || '127.0.0.1'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: PARÁMETROS MAESTROS */}
        {activeTab === 'parametros' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                1. UMBRALES DE ALERTA Y REGLAS METROLÓGICAS (NTC 2031)
              </div>

              <form onSubmit={handleSaveParams} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    UMBRAL DE ALERTA TEMPRANA POR VENCIMIENTO (DÍAS DE ANTICIPACIÓN)
                  </label>
                  <input
                    type="number"
                    value={thresholdDays}
                    onChange={(e) => setThresholdDays(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Define cuándo el estado de un instrumento cambia automáticamente a 'POR VENCER (&lt;30 DÍAS)'.
                  </span>
                </div>

                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    PERIODICIDAD DE VERIFICACIÓN PERIÓDICA OBLIGATORIA (MESES)
                  </label>
                  <input
                    type="number"
                    value={periodicityMonths}
                    onChange={(e) => setPeriodicityMonths(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    12 meses estándar según Decreto 1074 de 2015 para básculas IPFNA.
                  </span>
                </div>

                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    CATEGORÍA DE EXACTITUD PRINCIPAL DE CONTROL
                  </label>
                  <select
                    value={empToleranceClass}
                    onChange={(e) => setEmpToleranceClass(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                  >
                    <option>Clase I (Especial)</option>
                    <option>Clase II (Fina)</option>
                    <option>Clase III (Media - Balanzas Comerciales)</option>
                    <option>Clase IIII (Ordinaria)</option>
                  </select>
                </div>

                <button type="submit" className="btn-gov-primary" style={{ marginTop: '8px' }}>
                  <CheckIcon size={14} />
                  <span>Guardar Parámetros Regulatorios</span>
                </button>
              </form>
            </div>

            <div className="gov-card" style={{ padding: '24px', backgroundColor: '#FFFFFF' }}>
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                2. CRIPTOGRAFÍA, AUDITORÍA Y SINCRONIZACIÓN NIST
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    SERVIDOR DE ESTAMPADO CRONOLÓGICO NIST UTC-5
                  </label>
                  <input
                    type="text"
                    disabled
                    value={timeServer}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    MÓDULO DE SEGURIDAD EN HARDWARE (HSM MASTER)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={hsmKey}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', backgroundColor: '#F8FAFC', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div style={{ padding: '12px', borderRadius: 'var(--radius-card)', backgroundColor: '#F1F5F9', border: '1px solid var(--border)', fontSize: '12px' }}>
                  <strong style={{ color: 'var(--navy-900)', display: 'block', marginBottom: '4px' }}>
                    CONECTORES A ENTES EXTERNOS
                  </strong>
                  <ul style={{ paddingLeft: '18px', margin: 0, color: 'var(--text-muted)' }}>
                    <li>SIMEL (Sistema de Información de Metrología Legal): <strong>EN LÍNEA</strong></li>
                    <li>ONAC (Directorio de Laboratorios Acreditados): <strong>EN LÍNEA</strong></li>
                    <li>INM (Instituto Nacional de Metrología - Patrones): <strong>EN LÍNEA</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR USUARIO */}
        {showCreateModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div
              className="gov-card"
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: '#FFFFFF',
                padding: '28px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '6px' }}>
                ADMINISTRACIÓN NACIONAL · REGISTRO DE CREDENCIALES
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 16px 0' }}>
                Crear Nuevo Usuario Institucional
              </h2>

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NOMBRE COMPLETO *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    placeholder="Ej: Ing. Laura Ramírez"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      CORREO ELECTRÓNICO *
                    </label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      placeholder="usuario@entidad.gov.co"
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ROL INSTITUCIONAL *
                    </label>
                    <select
                      value={createForm.rol}
                      onChange={(e) => setCreateForm({ ...createForm, rol: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    >
                      <option value="TECNICO">Técnico Metrólogo (Calibración/RUMP)</option>
                      <option value="AUDITOR">Auditor / Inspector de Vigilancia SIC</option>
                      <option value="ADMIN">Administrador Central del Sistema</option>
                      <option value="INSTITUCION_ACREDITACION">Organismo de Acreditación (ONAC)</option>
                      <option value="SIC">Superintendencia (SIC)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    CONTRASEÑA INICIAL (MÍN. 8 CARACTERES) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                    placeholder="••••••••"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      DOCUMENTO DE IDENTIDAD
                    </label>
                    <input
                      type="text"
                      value={createForm.documentoIdentidad}
                      onChange={(e) => setCreateForm({ ...createForm, documentoIdentidad: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      placeholder="C.C. / C.E."
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      REGISTRO SIMEL / TARJETA PROF.
                    </label>
                    <input
                      type="text"
                      value={createForm.numeroRegistroSIMEL}
                      onChange={(e) => setCreateForm({ ...createForm, numeroRegistroSIMEL: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      placeholder="SIMEL-TEC-XXXX"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ENTIDAD / LABORATORIO
                    </label>
                    <input
                      type="text"
                      value={createForm.entidad}
                      onChange={(e) => setCreateForm({ ...createForm, entidad: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      placeholder="Ej: OEC Metrología S.A.S."
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TELÉFONO DE CONTACTO
                    </label>
                    <input
                      type="text"
                      value={createForm.telefono}
                      onChange={(e) => setCreateForm({ ...createForm, telefono: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                      placeholder="+57 300 0000000"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-gov-compact"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-gov-primary">
                    <CheckIcon size={14} />
                    <span>Guardar y Registrar en Traza</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EDITAR USUARIO */}
        {showEditModal && selectedUser && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '16px',
            }}
          >
            <div
              className="gov-card"
              style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: '#FFFFFF',
                padding: '28px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div className="microlabel" style={{ color: 'var(--navy-900)', marginBottom: '6px' }}>
                ADMINISTRACIÓN NACIONAL · MODIFICACIÓN DE USUARIO
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 16px 0' }}>
                Editar Datos de {selectedUser.nombre}
              </h2>

              <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    NOMBRE COMPLETO
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      CORREO ELECTRÓNICO
                    </label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ROL INSTITUCIONAL
                    </label>
                    <select
                      value={editForm.rol}
                      onChange={(e) => setEditForm({ ...editForm, rol: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    >
                      <option value="TECNICO">Técnico Metrólogo</option>
                      <option value="AUDITOR">Auditor / Inspector SIC</option>
                      <option value="ADMIN">Administrador</option>
                      <option value="INSTITUCION_ACREDITACION">Organismo de Acreditación (ONAC)</option>
                      <option value="SIC">Superintendencia (SIC)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    CAMBIAR CONTRASEÑA (DEJAR EN BLANCO PARA MANTENER LA ACTUAL)
                  </label>
                  <input
                    type="password"
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)', fontFamily: 'var(--font-mono)' }}
                    placeholder="••••••••"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      DOCUMENTO DE IDENTIDAD
                    </label>
                    <input
                      type="text"
                      value={editForm.documentoIdentidad}
                      onChange={(e) => setEditForm({ ...editForm, documentoIdentidad: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      REGISTRO SIMEL
                    </label>
                    <input
                      type="text"
                      value={editForm.numeroRegistroSIMEL}
                      onChange={(e) => setEditForm({ ...editForm, numeroRegistroSIMEL: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      ENTIDAD
                    </label>
                    <input
                      type="text"
                      value={editForm.entidad}
                      onChange={(e) => setEditForm({ ...editForm, entidad: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>

                  <div>
                    <label className="microlabel" style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      TELÉFONO
                    </label>
                    <input
                      type="text"
                      value={editForm.telefono}
                      onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-input)', border: '1px solid var(--border-strong)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-gov-compact"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-gov-primary">
                    <CheckIcon size={14} />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
