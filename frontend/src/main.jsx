import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Nav, Row, Spinner, Table } from 'react-bootstrap';
import { createRoot } from 'react-dom/client';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const api = async (path, options = {}) => {
  const token = localStorage.getItem('taller_token');
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
  if (!(options.body instanceof FormData) && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Ocurrió un error');
  return data;
};

function Brand() {
  return <div className="brand"><span className="brand-mark"><i className="bi bi-wrench-adjustable-circle" /></span><span>TALLER <b>ORO</b><small>GESTIÓN MECÁNICA</small></span></div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('jefe@talleroro.local');
  const [password, setPassword] = useState('CambiaEstaClave2026!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      localStorage.setItem('taller_token', data.token); onLogin(data.user);
    } catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  return <main className="login-page"><div className="login-grid"><section className="login-intro"><Brand/><div><p className="eyebrow">CONTROL Y TRAZABILIDAD</p><h1>El trabajo fino<br/><em>empieza aquí.</em></h1><p>Gestiona cada orden con seguridad, responsables identificados y una bitácora inalterable.</p></div><div className="intro-footer"><i className="bi bi-shield-lock-fill"/> Acceso protegido · Roles verificables · Operaciones auditadas</div></section><section className="login-panel"><Card className="auth-card"><Card.Body><p className="eyebrow">ACCESO SEGURO</p><h2>Bienvenido</h2><p className="muted">Ingresa con tus credenciales de taller.</p>{error && <Alert variant="danger">{error}</Alert>}{sent && <Alert variant="success">Solicitud registrada. El Administrador debe autorizarla.</Alert>}<Form onSubmit={submit}><Form.Group className="mb-3"><Form.Label>Correo electrónico</Form.Label><Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Form.Group><Form.Group className="mb-2"><Form.Label>Contraseña</Form.Label><Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Form.Group><button type="button" className="link-gold" onClick={async () => { try { await api('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }); setSent(true); } catch (requestError) { setError(requestError.message); } }}>¿Olvidaste tu contraseña?</button><Button className="w-100 mt-4 btn-gold" type="submit" disabled={busy}>{busy ? <Spinner size="sm"/> : <><i className="bi bi-box-arrow-in-right me-2"/>Ingresar al sistema</>}</Button></Form><p className="secure-note"><i className="bi bi-lock-fill"/> Sesión cifrada y protegida</p></Card.Body></Card></section></div></main>;
}

const emptyCustomer = { fullName: '', alternateContact: '', age: '', birthDate: '', personalPhone: '', workPhone: '', personalEmail: '', workEmail: '', street: '', neighborhood: '', municipality: '', state: '', postalCode: '' };
const calculateAge = (value) => {
  if (!value) return '';
  const birth = new Date(`${value}T00:00:00`), today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

function Field({ label, type = 'text', value, onChange, required, optional, help, ...props }) {
  return <Col md={6}><Form.Group><Form.Label>{label}{optional && <span className="optional-label">Opcional</span>}</Form.Label><Form.Control type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...props}/>{help && <Form.Text>{help}</Form.Text>}</Form.Group></Col>;
}

function CustomerRegistration() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyCustomer);
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState('list');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const load = async () => {
    setLoading(true);
    try { setCustomers(await api('/customers')); }
    catch (requestError) { setNotice({ variant: 'danger', message: requestError.message }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value, ...(key === 'birthDate' ? { age: calculateAge(value) } : {}) }));
  const submit = async (event) => {
    event.preventDefault();
    if (!photo) { setNotice({ variant: 'danger', message: 'Selecciona la fotografía del cliente.' }); return; }
    setBusy(true); setNotice(null);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value)); body.append('photo', photo);
      const result = await api('/customers', { method: 'POST', body });
      setForm(emptyCustomer); setPhoto(null); setMode('list'); setNotice({ variant: 'success', message: result.message }); await load();
    } catch (requestError) { setNotice({ variant: 'danger', message: requestError.message }); } finally { setBusy(false); }
  };
  return <section className="customers-module"><div className="section-head customers-head"><div><p className="eyebrow">EXPEDIENTES</p><h2>Registro de clientes</h2></div><Button className="btn-gold" onClick={() => { setNotice(null); setMode(mode === 'list' ? 'create' : 'list'); }}><i className={`bi ${mode === 'list' ? 'bi-person-plus' : 'bi-arrow-left'} me-2`}/>{mode === 'list' ? 'Registrar cliente' : 'Volver al listado'}</Button></div>{notice && <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}><i className={`bi ${notice.variant === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}/>{notice.message}</Alert>}{mode === 'create' ? <Form className="customer-form" onSubmit={submit}><div className="form-section"><p className="eyebrow">DATOS PERSONALES</p><Row className="g-3"><Field label="Nombre completo" value={form.fullName} onChange={(value) => change('fullName', value)} required maxLength="160"/><Field label="Contacto alternativo" value={form.alternateContact} onChange={(value) => change('alternateContact', value)} required maxLength="160"/><Field label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(value) => change('birthDate', value)} required/><Field label="Edad" type="number" value={form.age} onChange={(value) => change('age', value)} required min="0" max="130"/><Field label="Teléfono personal" value={form.personalPhone} onChange={(value) => change('personalPhone', value)} required pattern="[0-9+() .-]{10,25}" help="10 dígitos; se acepta +52."/><Field label="Teléfono de trabajo" value={form.workPhone} onChange={(value) => change('workPhone', value)} pattern="[0-9+() .-]{10,25}" optional/><Field label="Gmail personal" type="email" value={form.personalEmail} onChange={(value) => change('personalEmail', value)} required maxLength="180"/><Field label="Gmail de trabajo" type="email" value={form.workEmail} onChange={(value) => change('workEmail', value)} optional maxLength="180"/><Col md={6}><Form.Group><Form.Label>Fotografía</Form.Label><Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files[0] || null)} required/><Form.Text>JPG, PNG o WEBP, máximo 15 MB.</Form.Text></Form.Group></Col></Row></div><div className="form-section"><p className="eyebrow">DIRECCIÓN</p><Row className="g-3"><Field label="Calle" value={form.street} onChange={(value) => change('street', value)} required maxLength="160"/><Field label="Colonia" value={form.neighborhood} onChange={(value) => change('neighborhood', value)} required maxLength="120"/><Field label="Municipio" value={form.municipality} onChange={(value) => change('municipality', value)} required maxLength="120"/><Field label="Estado" value={form.state} onChange={(value) => change('state', value)} required maxLength="120"/><Field label="Código postal" value={form.postalCode} onChange={(value) => change('postalCode', value)} required pattern="[0-9]{5}" maxLength="5" help="5 dígitos."/></Row></div><div className="customer-actions"><Button variant="outline-secondary" onClick={() => setMode('list')} disabled={busy}>Cancelar</Button><Button className="btn-gold" type="submit" disabled={busy}>{busy ? <Spinner size="sm"/> : <><i className="bi bi-check2-circle me-2"/>Guardar cliente</>}</Button></div></Form> : <Card className="table-card"><Table responsive hover><thead><tr><th>CLIENTE</th><th>CONTACTO</th><th>DIRECCIÓN</th><th>REGISTRO</th></tr></thead><tbody>{loading ? <tr><td colSpan="4" className="text-center py-4"><Spinner size="sm"/> Cargando clientes...</td></tr> : customers.length ? customers.map((customer) => <tr key={customer.id}><td><b>{customer.fullName}</b><small className="d-block">{customer.personalEmail}</small></td><td>{customer.personalPhone}<small className="d-block">{customer.alternateContact}</small></td><td>{customer.street}, {customer.neighborhood}<small className="d-block">{customer.municipality}, {customer.state} C.P. {customer.postalCode}</small></td><td>{new Date(customer.createdAt).toLocaleDateString('es-MX')}</td></tr>) : <tr><td colSpan="4" className="text-center py-5">Aún no hay clientes registrados.</td></tr>}</tbody></Table></Card>}</section>;
}

const tiles = [['bi-clipboard-check', 'Órdenes activas', '12', '+3 hoy'], ['bi-car-front', 'Vehículos en taller', '08', '2 por entregar'], ['bi-box-seam', 'Solicitudes de refacciones', '04', '1 urgente']];
function Dashboard({ user, logout }) {
  const [section, setSection] = useState('Inicio');
  const [show, setShow] = useState(false);
  const can = (permission) => user.permissions.includes(permission);
  const canRegisterCustomers = ['SYSTEM_ADMIN', 'RECEPTIONIST'].includes(user.roleCode);
  const body = section === 'Inicio' ? <><section className="hero"><div><p className="eyebrow">VISTA GENERAL</p><h2>Todo bajo control.</h2><p>La operación del taller está en marcha. Revisa las prioridades del día.</p></div><div className="hero-seal"><i className="bi bi-shield-check"/><small>OPERACIÓN<br/>VERIFICADA</small></div></section><Row className="g-3 mt-1">{tiles.map(([icon, label, value, detail]) => <Col md={4} key={label}><Card className="metric"><Card.Body><div className="metric-icon"><i className={`bi ${icon}`}/></div><p>{label}</p><h3>{value}</h3><small>{detail}</small></Card.Body></Card></Col>)}</Row></> : section === 'Clientes' ? <CustomerRegistration/> : <Empty section={section}/>;
  return <div className="app-shell"><aside className="side"><Brand/><Nav className="flex-column"><Nav.Link active={section === 'Inicio'} onClick={() => setSection('Inicio')}><i className="bi bi-grid-1x2"/>Inicio</Nav.Link><Nav.Link onClick={() => setSection('Órdenes')}><i className="bi bi-clipboard2-pulse"/>Órdenes de trabajo</Nav.Link>{canRegisterCustomers && <Nav.Link active={section === 'Clientes'} onClick={() => setSection('Clientes')}><i className="bi bi-person-vcard"/>Clientes</Nav.Link>}<Nav.Link><i className="bi bi-car-front"/>Vehículos</Nav.Link><Nav.Link><i className="bi bi-tools"/>Checklists</Nav.Link><Nav.Link><i className="bi bi-box-seam"/>Refacciones <Badge>4</Badge></Nav.Link>{can('users.manage') && <><hr/><p className="nav-title">ADMINISTRACIÓN</p><Nav.Link onClick={() => setSection('Usuarios')}><i className="bi bi-people"/>Usuarios y roles</Nav.Link><Nav.Link onClick={() => setSection('Bitácora')}><i className="bi bi-journal-text"/>Bitácora de seguridad</Nav.Link></>}</Nav><div className="sidebar-user"><div className="avatar">{user.full_name.slice(0, 1)}</div><div><b>{user.full_name}</b><small>{user.roleName}</small></div><button onClick={logout} title="Salir"><i className="bi bi-box-arrow-right"/></button></div></aside><main className="content"><header><div><p className="eyebrow">LUNES, 22 DE SEPTIEMBRE</p><h1>{section === 'Inicio' ? <>Buen día, <em>{user.full_name.split(' ')[0]}.</em></> : section}</h1></div><div className="header-actions"><button className="icon-btn" aria-label="Notificaciones"><i className="bi bi-bell"/><span/></button><Button className="btn-gold" onClick={() => setShow(true)}><i className="bi bi-plus-lg me-2"/>Nueva orden</Button></div></header>{body}</main><Modal show={show} onHide={() => setShow(false)} centered><Modal.Header closeButton><Modal.Title>Nueva orden de trabajo</Modal.Title></Modal.Header><Modal.Body><Alert variant="warning"><i className="bi bi-shield-check me-2"/>Toda modificación quedará firmada y registrada.</Alert><Form.Group><Form.Label>Cliente</Form.Label><Form.Control placeholder="Nombre del cliente"/></Form.Group><Form.Group className="mt-3"><Form.Label>Vehículo</Form.Label><Form.Control placeholder="Marca, modelo y año"/></Form.Group></Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setShow(false)}>Cancelar</Button><Button className="btn-gold">Crear orden</Button></Modal.Footer></Modal></div>;
}
function Empty({ section }) { return <div className="empty-state"><i className="bi bi-cone-striped"/><h2>{section}</h2><p>Este módulo estará disponible en la siguiente fase.</p></div>; }
function App() { const [user, setUser] = useState(null); const logout = () => { localStorage.removeItem('taller_token'); setUser(null); }; return user ? <Dashboard user={user} logout={logout}/> : <Login onLogin={setUser}/>; }
createRoot(document.getElementById('root')).render(<App/>);
