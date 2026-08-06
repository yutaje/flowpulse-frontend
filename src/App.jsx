import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, 
  LogOut, ShieldAlert, LayoutDashboard, Ticket as TicketIcon, Trash2, Edit3, Play, Square, Check
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000'; 

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total_tickets: 0, to_do: 0, in_progress: 0, done: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cronómetro / Timer Ativo
  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Modais
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);

  // Form Fields
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Média');
  const [newStatus, setNewStatus] = useState('To Do');
  const [newProjectId, setNewProjectId] = useState(1);
  const [newEstimatedHours, setNewEstimatedHours] = useState(0);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, search, statusFilter]);

  // Gestão do Cronómetro Global
  useEffect(() => {
    let interval = null;
    if (activeTimerTask) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
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
    if (activeTimerTask) {
      stopTimer(); // Para o anterior se houver
    }
    setActiveTimerTask(task);
    setSecondsElapsed(0);
  };

  const stopTimer = async () => {
    if (!activeTimerTask) return;
    
    const hoursSpent = secondsElapsed / 3600; // converter segundos em horas decimais
    const updatedTrackedHours = (activeTimerTask.tracked_hours || 0) + hoursSpent;

    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/${activeTimerTask.id}`, {
        tracked_hours: Number(updatedTrackedHours.toFixed(2))
      }, { headers });

      setActiveTimerTask(null);
      setSecondsElapsed(0);
      fetchData();
    } catch (err) {
      alert('Erro ao guardar o tempo registado.');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const res = await axios.post(`${API_URL}/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const accessToken = res.data.access_token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);
    } catch (err) {
      setError('Credenciais inválidas. Confirma o email e password.');
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

      const [ticketsRes, statsRes, projectsRes] = await Promise.all([
        axios.get(query, { headers }),
        axios.get(`${API_URL}/tickets/me/stats`, { headers }),
        axios.get(`${API_URL}/projects/`, { headers })
      ]);

      setTickets(ticketsRes.data);
      setStats(statsRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditMode(false);
    setNewTitle('');
    setNewDesc('');
    setNewPriority('Média');
    setNewStatus('To Do');
    setNewEstimatedHours(0);
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
        estimated_hours: Number(newEstimatedHours)
      };

      if (editMode) {
        await axios.put(`${API_URL}/tickets/${currentTicketId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/tickets/`, payload, { headers });
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Erro ao guardar a tarefa. Verifica os dados.');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm("Tens a certeza que pretendes apagar esta tarefa?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/tickets/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar a tarefa.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-zinc-800 rounded-xl text-zinc-100">
              <TicketIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">FlowPulse</h1>
              <p className="text-sm text-zinc-400">Entra no teu painel de operações</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input 
                type="text" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition"
                placeholder="Ex: admin@admin.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 transition"
                placeholder="••••••••"
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-zinc-100 text-zinc-950 font-medium py-2.5 rounded-xl text-sm hover:bg-white transition shadow-sm mt-2"
            >
              Entrar na Plataforma
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-16">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <TicketIcon className="w-5 h-5 text-zinc-200" />
          </div>
          <span className="font-semibold tracking-tight text-lg">FlowPulse</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition bg-zinc-950 border border-zinc-800 px-3.5 py-1.5 rounded-lg"
        >
          <LogOut className="w-4 h-4" /> Terminar Sessão
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8">
        {/* Banner do Cronómetro Ativo */}
        {activeTimerTask && (
          <div className="mb-6 bg-gradient-to-r from-blue-900/40 to-zinc-900 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl animate-pulse">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">A trabalhar em:</p>
                <p className="text-sm font-semibold text-zinc-100">{activeTimerTask.title}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-xl font-bold tracking-wider text-zinc-100">{formatTime(secondsElapsed)}</span>
              <button 
                onClick={stopTimer}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 p-2.5 rounded-xl transition flex items-center gap-2 text-xs font-medium"
                title="Parar e Registar Horas"
              >
                <Square className="w-4 h-4 fill-current" /> Parar
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total de Tarefas</p>
            <p className="text-2xl font-semibold mt-1">{stats.total_tickets}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Por Fazer</p>
            <p className="text-2xl font-semibold mt-1">{stats.to_do}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Em Progresso</p>
            <p className="text-2xl font-semibold mt-1">{stats.in_progress}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
            <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Concluído</p>
            <p className="text-2xl font-semibold mt-1">{stats.done}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input 
              type="text" 
              placeholder="Pesquisar por título..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3.5 py-2 focus:outline-none focus:border-zinc-700"
            >
              <option value="">Todos os Estados</option>
              <option value="To Do">Por Fazer</option>
              <option value="In Progress">Em Progresso</option>
              <option value="Done">Concluído</option>
            </select>

            <button 
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition ml-auto sm:ml-0"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">A carregar tarefas...</div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma tarefa encontrada.</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {tickets.map((ticket) => {
                const priorityColor = 
                  ticket.priority === 'Crítica' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  ticket.priority === 'Alta' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-blue-500/10 text-blue-400 border-blue-500/20';

                const statusText = 
                  ticket.status === 'Done' ? 'Concluído' :
                  ticket.status === 'In Progress' ? 'Em Progresso' :
                  'Por Fazer';

                const statusColor = 
                  ticket.status === 'Done' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                  ticket.status === 'In Progress' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                  'text-amber-400 bg-amber-500/10 border-amber-500/20';

                const isRunning = activeTimerTask?.id === ticket.id;

                return (
                  <div key={ticket.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-850/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                        <h2 className="font-medium text-sm text-zinc-100">{ticket.title}</h2>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${priorityColor}`}>
                          {ticket.priority}
                        </span>
                        {isRunning && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                            ATIVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1 pl-7">{ticket.description || 'Sem descrição'}</p>
                      <div className="text-[11px] text-zinc-500 pl-7 flex items-center gap-3">
                        <span>⏱️ Registado: <strong>{ticket.tracked_hours || 0}h</strong></span>
                        <span>🎯 Estimado: <strong>{ticket.estimated_hours || 0}h</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pl-7 sm:pl-0">
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${statusColor}`}>
                        {statusText}
                      </span>

                      {/* Botão de Play para o Cronómetro */}
                      <button 
                        onClick={() => startTimer(ticket)}
                        className={`p-2 rounded-lg border transition ${isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`}
                        title="Iniciar Cronómetro"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                      
                      <button 
                        onClick={() => handleOpenEditModal(ticket)}
                        className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg transition"
                        title="Editar Tarefa"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="p-2 text-red-400 hover:text-red-300 bg-zinc-950 border border-zinc-800 rounded-lg transition"
                        title="Apagar Tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">{editMode ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h2>
            <form onSubmit={handleSaveTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título</label>
                <input 
                  type="text" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea 
                  value={newDesc} 
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows="3"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Prioridade</label>
                  <select 
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Estado</label>
                  <select 
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none"
                  >
                    <option value="To Do">Por Fazer</option>
                    <option value="In Progress">Em Progresso</option>
                    <option value="Done">Concluído</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Projeto</label>
                  <select 
                    value={newProjectId} 
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none"
                    required
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Horas Estimadas</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={newEstimatedHours} 
                    onChange={(e) => setNewEstimatedHours(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition"
                >
                  {editMode ? 'Atualizar Tarefa' : 'Guardar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}