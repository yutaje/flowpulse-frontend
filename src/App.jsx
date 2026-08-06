import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, 
  LogOut, ShieldAlert, LayoutDashboard, Ticket as TicketIcon, Trash2, Edit3, Play, Square, MessageSquare, FolderPlus, RefreshCw, Calendar, Users, Crown, Folder 
} from 'lucide-react';

const API_URL = 'https://flowpulse-frontend-six.vercel.app/'; 

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | projects | tasks | teams

  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({ total_tickets: 0, to_do: 0, in_progress: 0, done: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cronómetro
  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Modais de Tarefa
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);

  // Modais de Projeto, Equipas e Comentários
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeTaskForComments, setActiveTaskForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Form Fields de Tarefa
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Média');
  const [newStatus, setNewStatus] = useState('To Do');
  const [newProjectId, setNewProjectId] = useState(1);
  const [newEstimatedHours, setNewEstimatedHours] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');

  useEffect(() => {
    if (token) fetchData();
  }, [token, search, statusFilter]);

  useEffect(() => {
    let interval = null;
    if (activeTimerTask) {
      interval = setInterval(() => setSecondsElapsed(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const startTimer = (task) => {
    if (task.status === 'Done') return;
    if (activeTimerTask) stopTimer();
    setActiveTimerTask(task);
    setSecondsElapsed(0);
  };

  const stopTimer = async () => {
    if (!activeTimerTask) return;
    const hoursSpent = secondsElapsed / 3600;
    const updatedTracked = (activeTimerTask.tracked_hours || 0) + hoursSpent;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/${activeTimerTask.id}`, { tracked_hours: Number(updatedTracked.toFixed(2)) }, { headers });
      setActiveTimerTask(null);
      setSecondsElapsed(0);
      fetchData();
    } catch (err) {
      alert('Erro ao registar o tempo.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const res = await axios.post(`${API_URL}/login`, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      localStorage.setItem('token', res.data.access_token);
      setToken(res.data.access_token);
    } catch (err) {
      setError('Credenciais inválidas. Confirma o teu email e password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let query = `${API_URL}/tickets/?`;
      if (search) query += `search=${search}&`;
      if (statusFilter) query += `status=${statusFilter}&`;

      try {
        const ticketsRes = await axios.get(query, { headers });
        setTickets(ticketsRes.data);
      } catch (e) { console.error(e); }

      try {
        const statsRes = await axios.get(`${API_URL}/tickets/me/stats`, { headers });
        setStats(statsRes.data);
      } catch (e) { console.error(e); }

      try {
        const projectsRes = await axios.get(`${API_URL}/projects/`, { headers });
        setProjects(projectsRes.data);
      } catch (e) { console.error(e); }

      try {
        const teamsRes = await axios.get(`${API_URL}/teams/`, { headers });
        setTeams(teamsRes.data);
      } catch (e) { console.error(e); }

    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/projects/`, { name: projectName, description: projectDesc }, { headers });
      setShowProjectModal(false);
      setProjectName('');
      setProjectDesc('');
      fetchData();
      alert('Projeto criado com sucesso!');
    } catch (err) {
      alert('Erro ao criar projeto.');
    }
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/teams/`, { name: teamName, description: teamDesc }, { headers });
      setShowTeamModal(false);
      setTeamName('');
      setTeamDesc('');
      fetchData();
      alert('Equipa criada com sucesso!');
    } catch (err) {
      alert('Apenas Managers e Admins podem criar equipas.');
    }
  };

  const openComments = async (ticket) => {
    setActiveTaskForComments(ticket);
    setShowCommentsModal(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/${ticket.id}/comments`, { headers });
      setComments(res.data);
    } catch (err) {
      setComments([]);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/tickets/${activeTaskForComments.id}/comments?author_id=1`, { text: newCommentText }, { headers });
      setNewCommentText('');
      const res = await axios.get(`${API_URL}/tickets/${activeTaskForComments.id}/comments`, { headers });
      setComments(res.data);
    } catch (err) {
      alert('Erro ao enviar comentário.');
    }
  };

  const handleOpenCreateModal = () => {
    setEditMode(false);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('Média');
    setNewStatus('To Do');
    setNewEstimatedHours(0);
    setNewDueDate('');
    setNewProjectId(projects.length > 0 ? projects[0].id : 1);
    setShowModal(true);
  };

  const handleOpenEditModal = (ticket) => {
    setEditMode(true);
    setCurrentTicketId(ticket.id);
    setNewTitle(ticket.title);
    setNewDesc(ticket.description || '');
    setNewPriority(ticket.priority);
    setNewStatus(ticket.status);
    setNewEstimatedHours(ticket.estimated_hours || 0);
    setNewDueDate(ticket.due_date ? ticket.due_date.split('T')[0] : '');
    setNewProjectId(ticket.project_id);
    setShowModal(true);
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        title: newTitle, 
        description: newDesc, 
        priority: newPriority,
        status: newStatus, 
        project_id: Number(newProjectId), 
        estimated_hours: Number(newEstimatedHours),
        due_date: newDueDate ? newDueDate : null
      };
      if (editMode) {
        await axios.put(`${API_URL}/tickets/${currentTicketId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/tickets/`, payload, { headers });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Erro ao guardar a tarefa.');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm("Tens a certeza que pretendes apagar esta tarefa?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/tickets/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar tarefa.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-100"><TicketIcon className="w-6 h-6" /></div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">FlowPulse</h1>
              <p className="text-sm text-zinc-400">Entra no teu painel de operações</p>
            </div>
          </div>
          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">{error}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none" placeholder="admin@admin.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-zinc-100 text-zinc-950 font-medium py-2.5 rounded-xl text-sm hover:bg-white transition shadow-sm mt-2">
              Entrar na Plataforma
            </button>
          </form>
        </div>
      </div>
    );
  }

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();
  const dueTodayTickets = tickets.filter(t => t.due_date && t.due_date.split('T')[0] === todayStr && t.status !== 'Done');
  const overdueTickets = tickets.filter(t => t.due_date && t.due_date.split('T')[0] < todayStr && t.status !== 'Done');

  const displayedTickets = tickets.filter(ticket => {
    if (statusFilter) return true;
    return ticket.status !== 'Done';
  });

  const activeTasksList = tickets.filter(t => t.status !== 'Done');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      
      {/* SIDEBAR LATERAL */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="p-2 bg-zinc-800 rounded-lg"><TicketIcon className="w-5 h-5 text-zinc-200" /></div>
          <span className="font-semibold tracking-tight text-lg">FlowPulse</span>
        </div>

        <nav className="space-y-1.5 flex-1">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}
          >
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('projects')} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'projects' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}
          >
            <FolderPlus className="w-4 h-4" /> Projetos
          </button>
          <button 
            onClick={() => setActiveTab('tasks')} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'tasks' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}
          >
            <CheckCircle2 className="w-4 h-4" /> Tarefas
          </button>
          <button 
            onClick={() => setActiveTab('teams')} 
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'teams' ? 'bg-zinc-100 text-zinc-950 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}
          >
            <Users className="w-4 h-4" /> Equipas
          </button>
        </nav>

        <div className="pt-4 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-screen overflow-y-auto p-8 pb-16">
        
        {/* BARRA SUPERIOR DE CRONÓMETRO ATIVO */}
        {activeTimerTask && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/40 to-zinc-900 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl animate-pulse"><Clock className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">A trabalhar em:</p>
                <p className="text-sm font-semibold text-zinc-100">{activeTimerTask.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl font-bold tracking-wider text-zinc-100">{formatTime(secondsElapsed)}</span>
              <button onClick={stopTimer} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 p-2.5 rounded-xl transition flex items-center gap-2 text-xs font-medium">
                <Square className="w-4 h-4 fill-current" /> Parar e Guardar
              </button>
            </div>
          </div>
        )}

        {/* CONTEÚDO DINÂMICO */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
              <button onClick={fetchData} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 px-4 py-2 rounded-xl text-sm transition">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            {/* 4 Cards Superiores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Tarefas Hoje</p>
                  <p className="text-3xl font-bold mt-1 text-zinc-100">{stats.to_do + stats.in_progress}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 border border-zinc-700/50"><Calendar className="w-5 h-5" /></div>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Atrasadas</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">{overdueTickets.length}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20"><AlertCircle className="w-5 h-5" /></div>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Concluídas</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-400">{stats.done}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-5 h-5" /></div>
              </div>
              <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Horas Hoje</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">
                    {tickets.reduce((acc, t) => acc + (t.tracked_hours || 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20"><Clock className="w-5 h-5" /></div>
              </div>
            </div>

            {/* Grelha Prazo Hoje & Atrasadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-2 text-amber-400 font-semibold text-sm">
                  <span className="text-base">🔥</span> Prazo Hoje ({dueTodayTickets.length})
                </div>
                <p className="text-xs text-zinc-400 mb-4">Tarefas com deadline para hoje</p>
                {dueTodayTickets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl">
                    Nenhuma tarefa com prazo para hoje
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dueTodayTickets.map(t => (
                      <div key={t.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">{t.title}</span>
                        <span className="text-amber-400 font-mono">Hoje</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800/80 p-6 rounded-2xl">
                <div className="flex items-center gap-2.5 mb-2 text-red-400 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4" /> Atrasadas ({overdueTickets.length})
                </div>
                <p className="text-xs text-zinc-400 mb-4">Tarefas com prazo ultrapassado</p>
                {overdueTickets.length === 0 ? (
                  <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800/80 rounded-xl">
                    Nenhuma tarefa atrasada
                  </div>
                ) : (
                  <div className="space-y-2">
                    {overdueTickets.map(t => (
                      <div key={t.id} className="bg-zinc-950 border border-red-500/20 p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-200">{t.title}</span>
                        <span className="text-red-400 font-mono">{t.due_date.split('T')[0]}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ÁREA DE TAREFAS ATIVAS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Tarefas Ativas</h2>
                  <p className="text-xs text-zinc-400">As tuas tarefas para despachar</p>
                </div>
                <button onClick={handleOpenCreateModal} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 font-medium text-xs px-3.5 py-2 rounded-xl hover:bg-white transition">
                  <Plus className="w-3.5 h-3.5" /> Nova Tarefa
                </button>
              </div>

              {activeTasksList.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Não tens tarefas ativas neste momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeTasksList.map(ticket => {
                    const isRunning = activeTimerTask?.id === ticket.id;
                    return (
                      <div key={ticket.id} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-zinc-700 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                            <h3 className="font-medium text-sm text-zinc-100">{ticket.title}</h3>
                            {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">ATIVO</span>}
                          </div>
                          <p className="text-xs text-zinc-400 pl-6">{ticket.description || 'Sem descrição'}</p>
                          <div className="text-[11px] text-zinc-500 pl-6 flex items-center gap-3 pt-1">
                            <span>⏱️ Registado: <strong>{ticket.tracked_hours || 0}h</strong></span>
                            <span>🎯 Estimado: <strong>{ticket.estimated_hours || 0}h</strong></span>
                            {ticket.due_date && <span>📅 Deadline: <strong>{ticket.due_date.split('T')[0]}</strong></span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => startTimer(ticket)} 
                            className={`p-2 rounded-lg border transition ${isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`} 
                            title="Iniciar Cronómetro"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                          <button onClick={() => openComments(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Comentários">
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleOpenEditModal(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Editar">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold tracking-tight">Projetos</h1>
              <button onClick={() => setShowProjectModal(true)} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">
                <FolderPlus className="w-4 h-4" /> Novo Projeto
              </button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-6">
              {projects.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-8">Nenhum projeto registado.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map(proj => (
                    <div key={proj.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-xl space-y-2">
                      <h2 className="font-semibold text-sm text-zinc-100">{proj.name}</h2>
                      <p className="text-xs text-zinc-400">{proj.description || 'Sem descrição'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input type="text" placeholder="Pesquisar tarefas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3.5 py-2 focus:outline-none">
                  <option value="">Todos os Estados (Ativos)</option>
                  <option value="To Do">Por Fazer</option>
                  <option value="In Progress">Em Progresso</option>
                  <option value="Done">Concluído</option>
                </select>
                <button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition ml-auto sm:ml-0">
                  <Plus className="w-4 h-4" /> Nova Tarefa
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {loading ? <div className="p-8 text-center text-zinc-500 text-sm">A carregar...</div> : displayedTickets.length === 0 ? <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma tarefa encontrada.</div> : (
                <div className="divide-y divide-zinc-800">
                  {displayedTickets.map(ticket => {
                    const isRunning = activeTimerTask?.id === ticket.id;
                    const isDone = ticket.status === 'Done';
                    return (
                      <div key={ticket.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${isDone ? 'bg-zinc-900/30 opacity-60' : 'hover:bg-zinc-850/50'}`}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                            <h2 className={`font-medium text-sm ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>{ticket.title}</h2>
                            {isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONCLUÍDO</span>}
                            {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">ATIVO</span>}
                          </div>
                          <p className="text-xs text-zinc-400 pl-7">{ticket.description || 'Sem descrição'}</p>
                          <div className="text-[11px] text-zinc-500 pl-7 flex items-center gap-3">
                            <span>⏱️ Registado: <strong>{ticket.tracked_hours || 0}h</strong></span>
                            <span>🎯 Estimado: <strong>{ticket.estimated_hours || 0}h</strong></span>
                            {ticket.due_date && <span>📅 Deadline: <strong>{ticket.due_date.split('T')[0]}</strong></span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => startTimer(ticket)} 
                            disabled={isDone}
                            className={`p-2 rounded-lg border transition ${isDone ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-40' : isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`} 
                            title={isDone ? 'Cronómetro desativado (tarefa concluída)' : 'Iniciar Cronómetro'}
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                          <button onClick={() => openComments(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Comentários">
                            <MessageSquare className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleOpenEditModal(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Editar">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteTicket(ticket.id)} className="p-2 text-red-400 hover:text-red-300 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Apagar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'teams' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold tracking-tight">Equipas</h1>
              <button onClick={() => setShowTeamModal(true)} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">
                <Users className="w-4 h-4" /> Nova Equipa
              </button>
            </div>
            
            {teams.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                Nenhuma equipa registada.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {teams.map(team => (
                  <div key={team.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                    
                    {/* Cabeçalho do Card */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{team.name}</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">{team.description || 'Sem descrição'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition" title="Editar Equipa">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-2 bg-zinc-950 border border-zinc-800 text-red-400 hover:text-red-300 rounded-xl transition" title="Apagar Equipa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Meta info (Líder, Membros, Projetos) */}
                    <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-300 border-y border-zinc-800/60 py-4">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-400" />
                        <span>Líder: <strong className="text-zinc-100">Administrador</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Users className="w-4 h-4 text-zinc-400" />
                        <span>1 membro</span>
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400">
                        <Folder className="w-4 h-4 text-zinc-400" />
                        <span>{projects.length} projeto(s)</span>
                      </div>
                    </div>

                    {/* Secção de Membros */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Membros</h3>
                        <button className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl transition">
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </button>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                            A
                          </div>
                          <span className="text-sm font-medium text-zinc-200">Administrador</span>
                        </div>
                        <span className="text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">Líder</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal de Criar Projeto */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Novo Projeto</h2>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Projeto</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Criar Projeto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criar Equipa */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Nova Equipa</h2>
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome da Equipa</label>
                <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={teamDesc} onChange={e => setTeamDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Criar Equipa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Comentários */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <h2 className="text-lg font-semibold mb-2">Comentários: {activeTaskForComments?.title}</h2>
            <div className="flex-1 overflow-y-auto space-y-3 my-4 pr-2">
              {comments.length === 0 ? <p className="text-xs text-zinc-500 text-center py-6">Ainda sem comentários.</p> : comments.map(c => (
                <div key={c.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs space-y-1">
                  <p className="text-zinc-300">{c.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2 mt-auto pt-3 border-t border-zinc-800">
              <input type="text" value={newCommentText} onChange={e => setNewCommentText(e.target.value)} placeholder="Escreve um comentário..." className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none" />
              <button type="submit" className="bg-zinc-100 text-zinc-950 text-xs font-medium px-4 py-2 rounded-xl hover:bg-white transition">Enviar</button>
            </form>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowCommentsModal(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100 transition">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tarefa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">{editMode ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h2>
            <form onSubmit={handleSaveTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título</label>
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows="3" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Prioridade</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Estado</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="To Do">Por Fazer</option><option value="In Progress">Em Progresso</option><option value="Done">Concluído</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Projeto</label>
                  <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none" required>
                    {projects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Horas Estimadas</label>
                  <input type="number" step="0.5" value={newEstimatedHours} onChange={e => setNewEstimatedHours(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Data Limite (Deadline)</label>
                <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">{editMode ? 'Atualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}