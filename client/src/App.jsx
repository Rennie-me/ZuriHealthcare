import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

function getSavedUser() {
  try {
    return JSON.parse(localStorage.getItem("zuri-user") || "null");
  } catch {
    return null;
  }
}

const savedUser = getSavedUser();
const savedToken = localStorage.getItem("zuri-token");

function App() {
  const [user, setUser] = useState(savedUser);
  const [token, setToken] = useState(savedToken);
  const [notice, setNotice] = useState("");

  function signIn(session) {
    localStorage.setItem("zuri-user", JSON.stringify(session.user));
    localStorage.setItem("zuri-token", session.token);
    setUser(session.user);
    setToken(session.token);
    setNotice("");
  }

  function signOut() {
    localStorage.removeItem("zuri-user");
    localStorage.removeItem("zuri-token");
    setUser(null);
    setToken(null);
  }

  if (!user || !token) {
    return <AuthPage onSignIn={signIn} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Zuri Healthcare home">
          <span className="brand-mark">+</span>
          <span>Zuri <strong>Healthcare</strong></span>
        </a>
        <div className="profile">
          <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div className="profile-copy"><strong>{user.name}</strong><span>{user.role}</span></div>
          <button className="button button-quiet" onClick={signOut}>Log out</button>
        </div>
      </header>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      <main className="main-content">
        <div className="welcome">
          <div><p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1>{user.role === "admin" ? "Admin dashboard" : `Welcome back, ${user.name.split(" ")[0]}`}</h1>
            <p className="muted">{dashboardSubtitle(user.role)}</p>
          </div>
          <span className="welcome-icon">✚</span>
        </div>
        {user.role === "patient" && <PatientDashboard user={user} token={token} notify={setNotice} />}
        {user.role === "doctor" && <DoctorDashboard token={token} notify={setNotice} />}
        {user.role === "admin" && <AdminDashboard token={token} notify={setNotice} />}
      </main>
      <footer className="footer">Zuri Healthcare <span>·</span> Care made a little simpler</footer>
    </div>
  );
}

function dashboardSubtitle(role) {
  if (role === "admin") return "Manage your team and keep appointments moving.";
  if (role === "doctor") return "Review your appointment requests and schedule.";
  return "Your care, appointments, and next steps in one place.";
}

function AuthPage({ onSignIn }) {
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api(`/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      onSignIn(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-art">
        <a className="brand brand-light" href="#"><span className="brand-mark">+</span><span>Zuri <strong>Healthcare</strong></span></a>
        <div className="art-copy">
          <span className="art-label">YOUR HEALTH, IN GOOD HANDS</span>
          <h1>Better care<br />starts with a<br /><em>connection.</em></h1>
          <p>Find your doctor, book a visit, and stay in the loop — all from one calm, simple place.</p>
          <div className="art-stats"><span>✦ <strong>Thoughtful care</strong></span><span>✦ <strong>Simple scheduling</strong></span></div>
        </div>
        <div className="art-footer">HERE FOR YOUR HEALTH · EVERY STEP OF THE WAY</div>
      </section>
      <section className="auth-side">
        <div className="auth-card">
          <span className="form-icon">✚</span>
          <p className="eyebrow">WELCOME TO ZURI</p>
          <h2>{registering ? "Create your account" : "Good to see you"}</h2>
          <p className="muted">{registering ? "Sign up to start managing your care." : "Sign in to continue to your dashboard."}</p>
          {error && <div className="error-box" role="alert">{error}</div>}
          <form onSubmit={submit} className="form-stack">
            {registering && <label>Full name<input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Jamie Lee" /></label>}
            <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label>
            <label>Password<input required type="password" minLength={registering ? 8 : undefined} autoComplete={registering ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={registering ? "At least 8 characters" : "Enter your password"} /></label>
            <button className="button button-primary button-wide" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Sign in"} <span>→</span></button>
          </form>
          <p className="switch-auth">{registering ? "Already have an account?" : "New to Zuri?"} <button onClick={() => { setRegistering(!registering); setError(""); }}> {registering ? "Sign in" : "Create an account"}</button></p>
          <p className="auth-note">Doctors and administrators: sign in with credentials created by your administrator.</p>
        </div>
        <span className="auth-bottom">A LITTLE MORE CARE, A LOT LESS HASSLE</span>
      </section>
    </div>
  );
}

function PatientDashboard({ user, token, notify }) {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ doctorId: "", appointmentDate: "", reason: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [doctorList, appointmentList] = await Promise.all([
        api("/doctors", { token }), api("/appointments", { token }),
      ]);
      setDoctors(doctorList);
      setAppointments(appointmentList);
    } catch (loadError) { setError(loadError.message); }
  }, [token]);
  useEffect(() => { loadData(); }, [loadData]);

  async function book(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await api("/appointments", { token, method: "POST", body: JSON.stringify(form) });
      setForm({ doctorId: "", appointmentDate: "", reason: "" });
      notify("Your appointment request has been sent.");
      await loadData();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  return <>
    <div className="stats-grid">
      <StatCard label="Total appointments" value={appointments.length} icon="▦" />
      <StatCard label="Awaiting response" value={appointments.filter((a) => a.status === "pending").length} icon="◷" />
      <StatCard label="Available doctors" value={doctors.length} icon="✚" />
    </div>
    <div className="content-grid">
      <section className="panel">
        <PanelHeading title="Book an appointment" detail="Choose a doctor and a time that works for you." />
        {error && <div className="error-box" role="alert">{error}</div>}
        <form className="form-stack compact-form" onSubmit={book}>
          <label>Choose a doctor<select required value={form.doctorId} onChange={(event) => setForm({ ...form, doctorId: event.target.value })}>
            <option value="">Select a doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
          </select></label>
          <label>Date &amp; time<input required type="datetime-local" min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} value={form.appointmentDate} onChange={(event) => setForm({ ...form, appointmentDate: event.target.value })} /></label>
          <label>What would you like help with?<textarea required rows="3" maxLength="2000" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Share a short reason for your visit" /></label>
          <button className="button button-primary" disabled={busy || doctors.length === 0}>{busy ? "Sending…" : "Request appointment →"}</button>
        </form>
      </section>
      <section className="panel appointment-panel">
        <PanelHeading title="Your appointments" detail="Keep track of your requests and visits." />
        <AppointmentList appointments={appointments} role="patient" empty="Your appointments will appear here." />
      </section>
    </div>
  </>;
}

function DoctorDashboard({ token, notify }) {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");
  const loadData = useCallback(async () => {
    try { setAppointments(await api("/appointments", { token })); }
    catch (loadError) { setError(loadError.message); }
  }, [token]);
  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(id, status) {
    setError("");
    try {
      await api(`/appointments/${id}/status`, { token, method: "PATCH", body: JSON.stringify({ status }) });
      notify(`Appointment ${status}.`);
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }
  const pending = appointments.filter((appointment) => appointment.status === "pending");
  return <>
    <div className="stats-grid">
      <StatCard label="Assigned appointments" value={appointments.length} icon="▦" />
      <StatCard label="Needs your attention" value={pending.length} icon="◷" />
      <StatCard label="Approved" value={appointments.filter((a) => a.status === "approved").length} icon="✓" />
    </div>
    <section className="panel">
      <PanelHeading title="Appointment requests" detail="Review requests assigned to you and update their status." />
      {error && <div className="error-box" role="alert">{error}</div>}
      <AppointmentList appointments={appointments} role="doctor" onUpdate={updateStatus} empty="No appointments have been assigned to you yet." />
    </section>
  </>;
}

function AdminDashboard({ token, notify }) {
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [role, setRole] = useState("doctor");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [userList, appointmentList] = await Promise.all([
        api("/users", { token }), api("/appointments", { token }),
      ]);
      setUsers(userList);
      setAppointments(appointmentList);
    } catch (loadError) { setError(loadError.message); }
  }, [token]);
  useEffect(() => { loadData(); }, [loadData]);

  function startEdit(user) {
    setEditing(user.id);
    setRole(user.role);
    setForm({ name: user.name, email: user.email, password: "" });
    setError("");
  }
  function resetForm() {
    setEditing(null);
    setForm({ name: "", email: "", password: "" });
  }
  async function saveUser(event) {
    event.preventDefault();
    setBusy(true); setError("");
    const body = { name: form.name, email: form.email, role };
    if (form.password) body.password = form.password;
    try {
      await api(editing ? `/users/${editing}` : "/users", {
        token, method: editing ? "PUT" : "POST", body: JSON.stringify(body),
      });
      resetForm();
      notify(editing ? "User details updated." : `${role === "doctor" ? "Doctor" : "Patient"} added.`);
      await loadData();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name}? Their appointments will also be deleted.`)) return;
    setError("");
    try {
      await api(`/users/${user.id}`, { token, method: "DELETE" });
      if (editing === user.id) resetForm();
      notify("User deleted.");
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }
  async function updateStatus(id, status) {
    setError("");
    try {
      await api(`/appointments/${id}/status`, { token, method: "PATCH", body: JSON.stringify({ status }) });
      notify(`Appointment ${status}.`);
      await loadData();
    } catch (requestError) { setError(requestError.message); }
  }

  return <>
    <div className="stats-grid">
      <StatCard label="Patients" value={users.filter((u) => u.role === "patient").length} icon="◎" />
      <StatCard label="Doctors" value={users.filter((u) => u.role === "doctor").length} icon="✚" />
      <StatCard label="All appointments" value={appointments.length} icon="▦" />
    </div>
    {error && <div className="error-box page-error" role="alert">{error}</div>}
    <div className="content-grid admin-grid">
      <section className="panel">
        <PanelHeading title={editing ? "Edit user" : "Add a user"} detail="Create or update a doctor or patient account." />
        <form className="form-stack compact-form" onSubmit={saveUser}>
          <label>Account type<select value={role} disabled={Boolean(editing)} onChange={(event) => setRole(event.target.value)}><option value="doctor">Doctor</option><option value="patient">Patient</option></select></label>
          <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Jordan Smith" /></label>
          <label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label>
          <label>{editing ? "New password (optional)" : "Temporary password"}<input required={!editing} type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? "Leave blank to keep current" : "At least 8 characters"} /></label>
          <div className="button-row"><button className="button button-primary" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add user"}</button>{editing && <button className="button button-outline" type="button" onClick={resetForm}>Cancel</button>}</div>
        </form>
      </section>
      <section className="panel users-panel">
        <PanelHeading title="System users" detail="Manage patient and doctor accounts." />
        <div className="user-list">{users.map((item) => <div className="user-row" key={item.id}>
          <span className="avatar small-avatar">{item.name.charAt(0).toUpperCase()}</span>
          <div className="user-info"><strong>{item.name}</strong><span>{item.email}</span></div>
          <span className={`role-tag ${item.role}`}>{item.role}</span>
          <button className="text-button" onClick={() => startEdit(item)}>Edit</button>
          <button className="text-button danger-text" onClick={() => deleteUser(item)}>Delete</button>
        </div>)}
          {users.length === 0 && <p className="empty-state">No users found. Add your first account.</p>}
        </div>
      </section>
    </div>
    <section className="panel admin-appointments">
      <PanelHeading title="All appointments" detail="View requests across the clinic and update pending ones." />
      <AppointmentList appointments={appointments} role="admin" onUpdate={updateStatus} empty="No appointments have been booked yet." />
    </section>
  </>;
}

function StatCard({ label, value, icon }) {
  return <div className="stat-card"><span className="stat-icon">{icon}</span><div><span className="stat-value">{value}</span><span className="stat-label">{label}</span></div></div>;
}

function PanelHeading({ title, detail }) {
  return <div className="panel-heading"><div><h2>{title}</h2><p>{detail}</p></div><span className="panel-dot">✳</span></div>;
}

function AppointmentList({ appointments, role, onUpdate, empty }) {
  if (!appointments.length) return <div className="empty-state"><span>◷</span><p>{empty}</p></div>;
  return <div className="appointment-list">{appointments.map((appointment) => <article className="appointment-row" key={appointment.id}>
    <span className="date-tile"><strong>{new Date(appointment.appointment_date).toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{new Date(appointment.appointment_date).toLocaleDateString(undefined, { month: "short" })}</span></span>
    <div className="appointment-info">
      <strong>{role === "patient" ? appointment.doctor_name : appointment.patient_name}</strong>
      <span>{new Date(appointment.appointment_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
      <p>{appointment.reason}</p>
    </div>
    <div className="appointment-actions"><span className={`status-badge ${appointment.status}`}>{appointment.status}</span>
      {onUpdate && appointment.status === "pending" && <div className="action-buttons">
        <button className="approve-button" onClick={() => onUpdate(appointment.id, "approved")} aria-label="Approve appointment">✓</button>
        <button className="decline-button" onClick={() => onUpdate(appointment.id, "declined")} aria-label="Decline appointment">×</button>
      </div>}
    </div>
  </article>)}</div>;
}

export default App;
