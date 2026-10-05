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

function Brand() { return <div className="brand"><span className="brand-mark"><i className="bi bi-wrench-adjustable-circle" /></span><span>TALLER <b>ORO</b><small>GESTIÓN MECÁNICA</small></span></div>; }

function Login({ onLogin }) {
  const [email, setEmail] = useState('jefe@talleroro.local');
  const [password, setPassword] = useState('CambiaEstaClave2026!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); localStorage.setItem('taller_token', data.token); onLogin(data.user); }
    catch (requestError) { setError(requestError.message); } finally { setBusy(false); }
  };
  return <main className="login-page"><div className="login-grid" style={{ gridTemplateColumns: '1fr' }}><section className="login-panel"><Card className="auth-card"><Card.Body><h2>Bienvenido</h2>{error && <Alert variant="danger">{error}</Alert>}{sent && <Alert variant="success">Solicitud registrada. El Administrador debe autorizarla.</Alert>}<Form onSubmit={submit}><Form.Group className="mb-3"><Form.Label>Correo electrónico</Form.Label><Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></Form.Group><Form.Group className="mb-2"><Form.Label>Contraseña</Form.Label><Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></Form.Group><button type="button" className="link-gold" onClick={async () => { try { await api('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }); setSent(true); } catch (requestError) { setError(requestError.message); } }}>¿Olvidaste tu contraseña?</button><Button className="w-100 mt-4 btn-gold" type="submit" disabled={busy}>{busy ? <Spinner size="sm" /> : <><i className="bi bi-box-arrow-in-right me-2" />Ingresar</>}</Button></Form><p className="secure-note"><i className="bi bi-lock-fill" /> Sesión cifrada y protegida</p></Card.Body></Card></section></div></main>;
}

const emptyCustomer = { fullName: '', alternateContact: '', age: '', birthDate: '', personalPhone: '', workPhone: '', personalEmail: '', workEmail: '', password: '', confirmPassword: '', street: '', neighborhood: '', municipality: '', state: '', postalCode: '' };
const calculateAge = (value) => {
  if (!value) return '';
  const birth = new Date(`${value}T00:00:00`), today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};
const passwordError = (password, confirmPassword) => {
  if (password.length < 12) return 'La contraseña debe tener al menos 12 caracteres.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe incluir mayúscula, minúscula y número.';
  if (password !== confirmPassword) return 'La confirmación de contraseña no coincide.';
  return null;
};
function Field({ label, type = 'text', value, onChange, required, optional, help, ...props }) { return <Col md={6}><Form.Group><Form.Label>{label}{optional && <span className="optional-label">Opcional</span>}</Form.Label><Form.Control type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...props} />{help && <Form.Text>{help}</Form.Text>}</Form.Group></Col>; }

/** Desplegables encadenados alimentados por el catálogo SEPOMEX. */
function PostalAddressFields({ address, onChange }) {
  const [states, setStates] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [colonies, setColonies] = useState([]);
  const [stateId, setStateId] = useState('');
  const [municipalityId, setMunicipalityId] = useState('');
  const [postalChoices, setPostalChoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadMunicipalities = async (id) => {
    setLoading(true);
    try { setMunicipalities(await api(`/postal/states/${id}/municipalities`)); }
    catch (error) { setMessage(error.message); setMunicipalities([]); }
    finally { setLoading(false); }
  };
  const loadColonies = async (state, municipality) => {
    setLoading(true);
    try { setColonies(await api(`/postal/colonies?state=${encodeURIComponent(state)}&municipality=${encodeURIComponent(municipality)}`)); }
    catch (error) { setMessage(error.message); setColonies([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api('/postal/states').then(setStates).catch((error) => setMessage(error.message));
  }, []);
  useEffect(() => {
    const selected = states.find((state) => state.name === address.state);
    if (selected && String(selected.id) !== stateId) { setStateId(String(selected.id)); loadMunicipalities(selected.id); }
  }, [states, address.state]);
  useEffect(() => {
    const selected = municipalities.find((municipality) => municipality.name === address.municipality);
    if (selected && String(selected.id) !== municipalityId) { setMunicipalityId(String(selected.id)); loadColonies(address.state, selected.name); }
  }, [municipalities, address.municipality]);

  const selectState = async (event) => {
    const selected = states.find((state) => String(state.id) === event.target.value);
    setStateId(event.target.value); setMunicipalityId(''); setMunicipalities([]); setColonies([]); setPostalChoices([]); setMessage('');
    onChange({ state: selected?.name || '', municipality: '', neighborhood: '', postalCode: '' });
    if (selected) await loadMunicipalities(selected.id);
  };
  const selectMunicipality = async (event) => {
    const selected = municipalities.find((municipality) => String(municipality.id) === event.target.value);
    setMunicipalityId(event.target.value); setColonies([]); setPostalChoices([]); setMessage('');
    onChange({ municipality: selected?.name || '', neighborhood: '', postalCode: '' });
    if (selected) await loadColonies(address.state, selected.name);
  };
  const selectColony = (event) => {
    const selected = colonies.find((colony) => colony.name === event.target.value);
    const choices = selected?.postalCodes || [];
    setPostalChoices(choices);
    onChange({ neighborhood: selected?.name || '', postalCode: choices.length === 1 ? choices[0] : '' });
  };
  const changePostalCode = async (value) => {
    const postalCode = value.replace(/\D/g, '').slice(0, 5);
    onChange({ postalCode }); setMessage(''); setPostalChoices([]);
    if (postalCode.length !== 5) return;
    setLoading(true);
    try {
      const result = await api(`/postal/codes/${postalCode}`);
      if (!result.state || !result.municipality) { setMessage('No se encontraron datos SEPOMEX para ese código postal.'); return; }
      const selectedState = states.find((state) => state.name === result.state);
      const nextMunicipalities = selectedState ? await api(`/postal/states/${selectedState.id}/municipalities`) : [];
      const selectedMunicipality = nextMunicipalities.find((municipality) => municipality.name === result.municipality);
      setStateId(selectedState ? String(selectedState.id) : ''); setMunicipalities(nextMunicipalities); setMunicipalityId(selectedMunicipality ? String(selectedMunicipality.id) : ''); setColonies(result.colonies);
      onChange({ state: result.state, municipality: result.municipality, neighborhood: '', postalCode });
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  return <><Col md={6}><Form.Group><Form.Label>Estado</Form.Label><Form.Select value={stateId} onChange={selectState} required disabled={!states.length || loading}><option value="">Selecciona un estado</option>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</Form.Select></Form.Group></Col><Col md={6}><Form.Group><Form.Label>Municipio</Form.Label><Form.Select value={municipalityId} onChange={selectMunicipality} required disabled={!stateId || loading}><option value="">Selecciona un municipio</option>{municipalities.map((municipality) => <option key={municipality.id} value={municipality.id}>{municipality.name}</option>)}</Form.Select></Form.Group></Col><Col md={6}><Form.Group><Form.Label>Colonia</Form.Label><Form.Select value={address.neighborhood} onChange={selectColony} required disabled={!municipalityId || loading}><option value="">Selecciona una colonia</option>{colonies.map((colony) => <option key={colony.name} value={colony.name}>{colony.name}</option>)}</Form.Select></Form.Group></Col><Col md={6}><Form.Group><Form.Label>Código postal</Form.Label><Form.Control value={address.postalCode} onChange={(event) => changePostalCode(event.target.value)} required inputMode="numeric" pattern="[0-9]{5}" maxLength="5" disabled={loading} /><Form.Text>{loading ? 'Consultando catálogo SEPOMEX...' : 'Escribe 5 dígitos para completar la dirección.'}</Form.Text>{postalChoices.length > 1 && <Form.Select className="mt-2" value={address.postalCode} onChange={(event) => onChange({ postalCode: event.target.value })} required><option value="">Selecciona un código postal</option>{postalChoices.map((postalCode) => <option key={postalCode} value={postalCode}>{postalCode}</option>)}</Form.Select>}{message && <Form.Text className="text-danger d-block">{message}</Form.Text>}</Form.Group></Col></>;
}

function CustomerRegistration({ canEdit }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyCustomer);
  const [photo, setPhoto] = useState(null);
  const [mode, setMode] = useState('list');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const isCreating = mode === 'create';
  const isEditing = mode === 'edit';
  const load = async () => { setLoading(true); try { setCustomers(await api('/customers')); } catch (requestError) { setNotice({ variant: 'danger', message: requestError.message }); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value, ...(key === 'birthDate' ? { age: calculateAge(value) } : {}) }));
  const changeAddress = (values) => setForm((current) => ({ ...current, ...values }));
  const openList = () => { setForm(emptyCustomer); setPhoto(null); setMode('list'); };
  const openCreate = () => { setNotice(null); setForm(emptyCustomer); setPhoto(null); setMode('create'); };
  const openEdit = (customer) => { setNotice(null); setPhoto(null); setForm({ ...emptyCustomer, ...customer, birthDate: customer.birthDate?.slice(0, 10) || '', age: String(customer.age) }); setMode('edit'); };
  const submit = async (event) => {
    event.preventDefault();
    if (isCreating) { const invalidPassword = passwordError(form.password, form.confirmPassword); if (invalidPassword) { setNotice({ variant: 'danger', message: invalidPassword }); return; } if (!photo) { setNotice({ variant: 'danger', message: 'Selecciona la fotografía del cliente.' }); return; } }
    setBusy(true); setNotice(null);
    try {
      const body = new FormData();
      Object.entries(form).filter(([key]) => !['id', 'password', 'confirmPassword'].includes(key)).forEach(([key, value]) => body.append(key, value));
      if (isCreating) { body.append('password', form.password); body.append('confirmPassword', form.confirmPassword); }
      if (photo) body.append('photo', photo);
      const result = await api(isCreating ? '/customers' : `/customers/${form.id}`, { method: isCreating ? 'POST' : 'PUT', body });
      openList(); setNotice({ variant: 'success', message: result.message }); await load();
    } catch (requestError) { setNotice({ variant: 'danger', message: requestError.message }); } finally { setBusy(false); }
  };
  const title = isEditing ? 'Editar cliente' : 'Registro de clientes';
  return <section className="customers-module"><div className="section-head customers-head"><div><p className="eyebrow">EXPEDIENTES</p><h2>{title}</h2></div><Button className="btn-gold" onClick={mode === 'list' ? openCreate : openList}><i className={`bi ${mode === 'list' ? 'bi-person-plus' : 'bi-arrow-left'} me-2`} />{mode === 'list' ? 'Registrar cliente' : 'Volver al listado'}</Button></div>{notice && <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}><i className={`bi ${notice.variant === 'success' ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`} />{notice.message}</Alert>}{mode !== 'list' ? <Form className="customer-form" onSubmit={submit}><div className="form-section"><p className="eyebrow">DATOS PERSONALES</p><Row className="g-3"><Field label="Nombre completo" value={form.fullName} onChange={(value) => change('fullName', value)} required maxLength="160" /><Field label="Contacto alternativo" value={form.alternateContact} onChange={(value) => change('alternateContact', value)} required maxLength="160" /><Field label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(value) => change('birthDate', value)} required /><Field label="Edad" type="number" value={form.age} onChange={(value) => change('age', value)} required min="0" max="130" /><Field label="Teléfono personal" value={form.personalPhone} onChange={(value) => change('personalPhone', value)} required pattern="[0-9+() .-]{10,25}" help="10 dígitos; se acepta +52." /><Field label="Teléfono de trabajo" value={form.workPhone} onChange={(value) => change('workPhone', value)} pattern="[0-9+() .-]{10,25}" optional /><Field label="Gmail personal" type="email" value={form.personalEmail} onChange={(value) => change('personalEmail', value)} required maxLength="180" /><Field label="Gmail de trabajo" type="email" value={form.workEmail} onChange={(value) => change('workEmail', value)} optional maxLength="180" />{isCreating && <><Field label="Contraseña" type="password" value={form.password} onChange={(value) => change('password', value)} required minLength="12" maxLength="72" autoComplete="new-password" help="Mínimo 12 caracteres con mayúscula, minúscula y número." /><Field label="Confirmar contraseña" type="password" value={form.confirmPassword} onChange={(value) => change('confirmPassword', value)} required minLength="12" maxLength="72" autoComplete="new-password" /></>}<Col md={6}><Form.Group><Form.Label>Fotografía</Form.Label><Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files[0] || null)} required={isCreating} /><Form.Text>{isCreating ? 'JPG, PNG o WEBP, máximo 15 MB.' : 'Opcional. Al no seleccionar una, se conserva la fotografía actual.'}</Form.Text></Form.Group></Col></Row></div><div className="form-section"><p className="eyebrow">DIRECCIÓN</p><Row className="g-3"><Field label="Calle" value={form.street} onChange={(value) => change('street', value)} required maxLength="160" /><PostalAddressFields address={form} onChange={changeAddress} /></Row></div><div className="customer-actions"><Button variant="outline-secondary" onClick={openList} disabled={busy}>Cancelar</Button><Button className="btn-gold" type="submit" disabled={busy}>{busy ? <Spinner size="sm" /> : <><i className="bi bi-check2-circle me-2" />{isEditing ? 'Guardar cambios' : 'Guardar cliente'}</>}</Button></div></Form> : <Card className="table-card"><Table responsive hover><thead><tr><th>CLIENTE</th><th>CONTACTO</th><th>DIRECCIÓN</th><th>REGISTRO</th>{canEdit && <th>ACCIONES</th>}</tr></thead><tbody>{loading ? <tr><td colSpan={canEdit ? 5 : 4} className="text-center py-4"><Spinner size="sm" /> Cargando clientes...</td></tr> : customers.length ? customers.map((customer) => <tr key={customer.id}><td><b>{customer.fullName}</b><small className="d-block">{customer.personalEmail}</small></td><td>{customer.personalPhone}<small className="d-block">{customer.alternateContact}</small></td><td>{customer.street}, {customer.neighborhood}<small className="d-block">{customer.municipality}, {customer.state} C.P. {customer.postalCode}</small></td><td>{new Date(customer.createdAt).toLocaleDateString('es-MX')}</td>{canEdit && <td><Button variant="outline-secondary" size="sm" onClick={() => openEdit(customer)} aria-label={`Editar a ${customer.fullName}`} title="Editar cliente"><i className="bi bi-pencil-square" /></Button></td>}</tr>) : <tr><td colSpan={canEdit ? 5 : 4} className="text-center py-5">Aún no hay clientes registrados.</td></tr>}</tbody></Table></Card>}</section>;
}

const phase3Customer = { firstNames: '', firstLastName: '', secondLastName: '', curp: '', rfc: '', birthDate: '', age: '', personalEmail: '', personalPhone: '', workPhone: '', street: '', neighborhood: '', municipality: '', state: '', locality: '', postalCode: '', additionalContactName: '', additionalContactEmail: '', additionalContactPhone: '' };
function Phase3CustomerRegistration({ canEdit }) {
  const [form, setForm] = useState(phase3Customer); const [photo, setPhoto] = useState(null); const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1 } }); const [filters, setFilters] = useState({ search: '', status: '', sort: 'asc' }); const [notice, setNotice] = useState(null); const [mode, setMode] = useState('list');
  const load = async (page = 1) => { try { const query = new URLSearchParams({ page, limit: '10', sort: filters.sort }); if (filters.search) query.set('search', filters.search); if (filters.status) query.set('status', filters.status); setData(await api(`/customers?${query}`)); } catch (error) { setNotice({ variant: 'danger', message: error.message }); } };
  useEffect(() => { load(); }, [filters.sort, filters.status]);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value, ...(key === 'birthDate' ? { age: calculateAge(value) } : {}) }));
  const submit = async (event) => { event.preventDefault(); if (!photo) { setNotice({ variant: 'danger', message: 'Selecciona la fotografía del cliente.' }); return; } try { const body = new FormData(); Object.entries(form).forEach(([key, value]) => body.append(key, value)); body.append('photo', photo); const result = await api('/customers', { method: 'POST', body }); setNotice({ variant: 'success', message: result.message }); setMode('list'); setForm(phase3Customer); setPhoto(null); load(); } catch (error) { setNotice({ variant: 'danger', message: error.message }); } };
  return <section className="customers-module"><div className="section-head customers-head"><div><p className="eyebrow">ADMINISTRACIÓN</p><h2>Clientes</h2></div><Button className="btn-gold" onClick={() => setMode(mode === 'list' ? 'create' : 'list')}><i className={`bi ${mode === 'list' ? 'bi-person-plus' : 'bi-arrow-left'} me-2`} />{mode === 'list' ? 'Registrar cliente' : 'Volver al listado'}</Button></div>{notice && <Alert variant={notice.variant} dismissible onClose={() => setNotice(null)}>{notice.message}</Alert>}{mode === 'create' ? <Form className="customer-form" onSubmit={submit}><div className="form-section"><p className="eyebrow">DATOS DEL CLIENTE</p><Row className="g-3"><Field label="Nombre o nombres" value={form.firstNames} onChange={(v) => change('firstNames', v)} required /><Field label="Primer apellido" value={form.firstLastName} onChange={(v) => change('firstLastName', v)} required /><Field label="Segundo apellido" value={form.secondLastName} onChange={(v) => change('secondLastName', v)} required /><Field label="CURP" value={form.curp} onChange={(v) => change('curp', v.toUpperCase())} required maxLength="18" /><Field label="RFC" value={form.rfc} onChange={(v) => change('rfc', v.toUpperCase())} required maxLength="13" /><Field label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={(v) => change('birthDate', v)} required /><Field label="Edad" type="number" value={form.age} onChange={() => {}} required readOnly /><Field label="Email" type="email" value={form.personalEmail} onChange={(v) => change('personalEmail', v)} required /><Field label="Teléfono personal" value={form.personalPhone} onChange={(v) => change('personalPhone', v)} required /><Field label="Teléfono de trabajo" value={form.workPhone} onChange={(v) => change('workPhone', v)} optional /><Field label="Contacto adicional" value={form.additionalContactName} onChange={(v) => change('additionalContactName', v)} required /><Field label="Email contacto adicional" type="email" value={form.additionalContactEmail} onChange={(v) => change('additionalContactEmail', v)} required /><Field label="Teléfono contacto adicional" value={form.additionalContactPhone} onChange={(v) => change('additionalContactPhone', v)} required /><Col md={6}><Form.Group><Form.Label>Fotografía</Form.Label><Form.Control type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files[0] || null)} required /><Form.Text>JPG, PNG o WEBP, máximo 15 MB.</Form.Text></Form.Group></Col></Row></div><div className="form-section"><p className="eyebrow">DIRECCIÓN</p><Row className="g-3"><Field label="Calle" value={form.street} onChange={(v) => change('street', v)} required /><PostalAddressFields address={form} onChange={(values) => setForm((current) => ({ ...current, ...values, locality: values.locality || values.municipality || current.locality }))} /><Field label="Localidad" value={form.locality} onChange={() => {}} required readOnly help="Se completa con SEPOMEX." /></Row></div><div className="customer-actions"><Button variant="outline-secondary" onClick={() => setMode('list')}>Cancelar</Button><Button className="btn-gold" type="submit">Guardar cliente</Button></div></Form> : <><Row className="g-2 mb-3"><Col md={5}><Form.Control placeholder="Buscar por nombre, CURP o RFC" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && load()} /></Col><Col md={3}><Form.Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todos los estatus</option><option value="ACTIVE">Activos</option><option value="SUSPENDED">Suspendidos</option></Form.Select></Col><Col md={2}><Form.Select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="asc">Nombre A-Z</option><option value="desc">Nombre Z-A</option></Form.Select></Col><Col md={2}><Button variant="outline-secondary" className="w-100" onClick={() => load()}>Buscar</Button></Col></Row><Card className="table-card"><Table responsive hover><thead><tr><th>CLIENTE</th><th>CURP / RFC</th><th>TALLER</th><th>ESTATUS</th>{canEdit && <th>ACCIONES</th>}</tr></thead><tbody>{data.items.length ? data.items.map((customer) => <tr key={customer.id}><td><b>{customer.fullName}</b><small className="d-block">{customer.personalEmail}</small></td><td>{customer.curp}<small className="d-block">{customer.rfc}</small></td><td>{customer.workshops || 'Sin asignar'}</td><td>{customer.status}</td>{canEdit && <td><Button size="sm" variant="outline-danger" onClick={async () => { await api(`/customers/${customer.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'SUSPENDED' }) }); load(data.pagination.page); }}>Suspender</Button></td>}</tr>) : <tr><td colSpan={canEdit ? 5 : 4} className="text-center py-4">Sin clientes para los filtros seleccionados.</td></tr>}</tbody></Table></Card><div className="customer-actions"><Button variant="outline-secondary" disabled={data.pagination.page <= 1} onClick={() => load(data.pagination.page - 1)}>Anterior</Button><span className="align-self-center">Página {data.pagination.page} de {data.pagination.pages || 1}</span><Button variant="outline-secondary" disabled={data.pagination.page >= data.pagination.pages} onClick={() => load(data.pagination.page + 1)}>Siguiente</Button></div></>}</section>;
}
CustomerRegistration = Phase3CustomerRegistration;

const tiles = [['bi-clipboard-check', 'Órdenes activas', '12', '+3 hoy'], ['bi-car-front', 'Vehículos en taller', '08', '2 por entregar'], ['bi-box-seam', 'Solicitudes de refacciones', '04', '1 urgente']];
function Dashboard({ user, logout }) {
  const [section, setSection] = useState('Inicio');
  const [show, setShow] = useState(false);
  const can = (permission) => user.permissions.includes(permission);
  const canRegisterCustomers = ['SYSTEM_ADMIN', 'RECEPTIONIST', 'SECRETARY', 'CLIENT'].includes(user.roleCode);
  const body = section === 'Inicio' ? <><section className="hero"><div><p className="eyebrow">VISTA GENERAL</p><h2>Todo bajo control.</h2><p>La operación del taller está en marcha. Revisa las prioridades del día.</p></div><div className="hero-seal"><i className="bi bi-shield-check" /><small>OPERACIÓN<br />VERIFICADA</small></div></section><Row className="g-3 mt-1">{tiles.map(([icon, label, value, detail]) => <Col md={4} key={label}><Card className="metric"><Card.Body><div className="metric-icon"><i className={`bi ${icon}`} /></div><p>{label}</p><h3>{value}</h3><small>{detail}</small></Card.Body></Card></Col>)}</Row></> : section === 'Clientes' ? <CustomerRegistration canEdit={user.roleCode === 'SYSTEM_ADMIN'} /> : <Empty section={section} />;
  return <div className="app-shell"><aside className="side"><Brand /><Nav className="flex-column"><Nav.Link active={section === 'Inicio'} onClick={() => setSection('Inicio')}><i className="bi bi-grid-1x2" />Inicio</Nav.Link><Nav.Link onClick={() => setSection('Órdenes')}><i className="bi bi-clipboard2-pulse" />Órdenes de trabajo</Nav.Link>{canRegisterCustomers && <Nav.Link active={section === 'Clientes'} onClick={() => setSection('Clientes')}><i className="bi bi-person-vcard" />Clientes</Nav.Link>}<Nav.Link><i className="bi bi-car-front" />Vehículos</Nav.Link><Nav.Link><i className="bi bi-tools" />Checklists</Nav.Link><Nav.Link><i className="bi bi-box-seam" />Refacciones <Badge>4</Badge></Nav.Link>{can('users.manage') && <><hr /><p className="nav-title">ADMINISTRACIÓN</p><Nav.Link onClick={() => setSection('Usuarios')}><i className="bi bi-people" />Usuarios y roles</Nav.Link><Nav.Link onClick={() => setSection('Bitácora')}><i className="bi bi-journal-text" />Bitácora de seguridad</Nav.Link></>}</Nav><div className="sidebar-user"><div className="avatar">{user.full_name.slice(0, 1)}</div><div><b>{user.full_name}</b><small>{user.roleName}</small></div><button onClick={logout} aria-label="Cerrar sesión"><i className="bi bi-box-arrow-right me-2" />Cerrar sesión</button></div></aside><main className="content"><header><div><p className="eyebrow">LUNES, 22 DE SEPTIEMBRE</p><h1>{section === 'Inicio' ? <>Buen día, <em>{user.full_name.split(' ')[0]}.</em></> : section}</h1></div><div className="header-actions"><button className="icon-btn" aria-label="Notificaciones"><i className="bi bi-bell" /><span /></button><Button className="btn-gold" onClick={() => setShow(true)}><i className="bi bi-plus-lg me-2" />Nueva orden</Button></div></header>{body}</main><Modal show={show} onHide={() => setShow(false)} centered><Modal.Header closeButton><Modal.Title>Nueva orden de trabajo</Modal.Title></Modal.Header><Modal.Body><Alert variant="warning"><i className="bi bi-shield-check me-2" />Toda modificación quedará firmada y registrada.</Alert><Form.Group><Form.Label>Cliente</Form.Label><Form.Control placeholder="Nombre del cliente" /></Form.Group><Form.Group className="mt-3"><Form.Label>Vehículo</Form.Label><Form.Control placeholder="Marca, modelo y año" /></Form.Group></Modal.Body><Modal.Footer><Button variant="outline-secondary" onClick={() => setShow(false)}>Cancelar</Button><Button className="btn-gold">Crear orden</Button></Modal.Footer></Modal></div>;
}
function Empty({ section }) { return <div className="empty-state"><i className="bi bi-cone-striped" /><h2>{section}</h2><p>Este módulo estará disponible en la siguiente fase.</p></div>; }
function App() { const [user, setUser] = useState(null); const logout = () => { localStorage.removeItem('taller_token'); setUser(null); }; return user ? <Dashboard user={user} logout={logout} /> : <Login onLogin={setUser} />; }
createRoot(document.getElementById('root')).render(<App />);
