import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, 
  LogOut, ShieldAlert, LayoutDashboard, Ticket as TicketIcon, Trash2, Edit3, Play, Square, MessageSquare, FolderPlus, RefreshCw, Calendar, Users, Crown, Folder, UserCheck, Kanban, ListFilter, ArrowUpDown, ChevronLeft, ChevronRight, Settings 
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000'; 

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');
  const [taskViewMode, setTaskViewMode] = useState('kanban');

  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState({ total_tickets: 0, to_do: 0, in_progress: 0, done: 0 });
  
  const [activeWorkers, setActiveWorkers] = useState([]);
  const [currentUserInfo, setCurrentUserInfo] = useState({ id: null, role: 'Member', name: '', email: '' });

  // Estados do Perfil / Definições
  const [settingsName, setSettingsName] = useState('');
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState('');
  const [settingsNewPassword, setSettingsNewPassword] = useState('');
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');

  const [search, setSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Média');
  const [newStatus, setNewStatus] = useState('To Do');
  const [newProjectId, setNewProjectId] = useState(1);
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newEstimatedHours, setNewEstimatedHours] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');

  // Estados dos Projetos
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProjectMode, setEditProjectMode] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTeamId, setProjectTeamId] = useState('');
  const [projectTicketIds, setProjectTicketIds] = useState([]); 

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [newTeamOwnerId, setNewTeamOwnerId] = useState('');
  const [newTeamMemberIds, setNewTeamMemberIds] = useState([]);

  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamDesc, setEditTeamDesc] = useState('');
  const [editTeamOwnerId, setEditTeamOwnerId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeTaskForComments, setActiveTaskForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarTeamFilter, setCalendarTeamFilter] = useState('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);


  useEffect(() => {
    if (token) fetchData();
  }, [token, search, statusFilter, projectFilter, priorityFilter]);

  useEffect(() => {
    let interval = null;
    if (activeTimerTask) {
      interval = setInterval(() => setSecondsElapsed(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask]);

  const fetchActiveWorkers = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/active`, { headers });
      setActiveWorkers(res.data);
    } catch (e) { console.error("Erro a buscar online", e); }
  };

  useEffect(() => {
    if (token) {
      fetchActiveWorkers();
      const radar = setInterval(fetchActiveWorkers, 10000); 
      return () => clearInterval(radar);
    }
  }, [token]);

  const changeTab = (tabName) => {
    setActiveTab(tabName);
    localStorage.setItem('activeTab', tabName);
  };

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const startTimer = async (task) => {
    if (task.status === 'Done') return;
    
    // AQUI ESTÁ A MUDANÇA: Bloquear se já houver um cronómetro a contar
    if (activeTimerTask) {
      alert('Já tens um cronómetro a contar! Pára a tarefa atual antes de iniciares outra.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      let updatePayload = { is_running: true };
      
      if (!task.assigned_to_id && currentUserInfo.id) {
        updatePayload.assigned_to_id = currentUserInfo.id;
        task.assigned_to_id = currentUserInfo.id;
      }

      await axios.put(`${API_URL}/tickets/${task.id}`, updatePayload, { headers });
      setActiveTimerTask(task);
      setSecondsElapsed(0);
      fetchActiveWorkers();
      if (updatePayload.assigned_to_id) fetchData();
    } catch (err) {
      alert('Erro ao iniciar o cronómetro no servidor.');
    }
  };

  const stopTimer = async () => {
    if (!activeTimerTask) return;
    const hoursSpent = secondsElapsed / 3600;
    const updatedTracked = (activeTimerTask.tracked_hours || 0) + hoursSpent;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.put(`${API_URL}/tickets/${activeTimerTask.id}`, { 
        tracked_hours: Number(updatedTracked.toFixed(2)),
        is_running: false,
        session_hours: hoursSpent 
      }, { headers });
      
      setActiveTimerTask(null);
      setSecondsElapsed(0);
      fetchData(); 
      fetchActiveWorkers();
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
    localStorage.removeItem('activeTab');
    setToken('');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      let query = `${API_URL}/tickets/?`;
      if (search) query += `search=${search}&`;

      try {
        const ticketsRes = await axios.get(query, { headers });
        setTickets(ticketsRes.data);
      } catch (e) { console.error(e); }

      try {
        const statsRes = await axios.get(`${API_URL}/tickets/me/stats`, { headers });
        setStats(statsRes.data);
        setCurrentUserInfo({ id: statsRes.data.user_id, role: statsRes.data.role });
        
        const usersRes = await axios.get(`${API_URL}/users/`, { headers });
        setUsersList(usersRes.data);
        const me = usersRes.data.find(u => u.id === statsRes.data.user_id);
        if (me) {
          setCurrentUserInfo(prev => ({ ...prev, name: me.name || '', email: me.email || '' }));
          setSettingsName(me.name || '');
          setSettingsEmail(me.email || '');
        }
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/users/${currentUserInfo.id}`, {
        name: settingsName,
        email: settingsEmail
      }, { headers });
      setProfileMessage('Perfil atualizado com sucesso!');
      fetchData();
      setTimeout(() => setProfileMessage(''), 3000);
    } catch (err) {
      setProfileMessage('Erro ao atualizar perfil.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setSecurityMessage('');
    if (settingsNewPassword !== settingsConfirmPassword) {
      setSecurityMessage('As senhas não coincidem!');
      return;
    }
    if (settingsNewPassword.length < 6) {
      setSecurityMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/users/${currentUserInfo.id}`, {
        password: settingsNewPassword
      }, { headers });
      
      setSecurityMessage('Senha alterada com sucesso!');
      setSettingsCurrentPassword('');
      setSettingsNewPassword('');
      setSettingsConfirmPassword('');
      setTimeout(() => setSecurityMessage(''), 3000);
    } catch (err) {
      setSecurityMessage('Erro ao alterar senha. Tenta novamente.');
    }
  };

  const handleOpenCreateProjectModal = () => {
    setEditProjectMode(false);
    setProjectName('');
    setProjectDesc('');
    setProjectTeamId('');
    setProjectTicketIds([]);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (proj) => {
    setEditProjectMode(true);
    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setProjectDesc(proj.description || '');
    setProjectTeamId(proj.team_id || '');
    setShowProjectModal(true);

    const projTasks = tickets.filter(t => t.project_id === proj.id).map(t => t.id);
    setProjectTicketIds(projTasks); 

    setShowProjectModal(true);
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Tens a certeza que pretendes apagar este projeto?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/projects/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar projeto.');
    }
  };

  const goToProjectTasks = (projectId) => {
    setProjectFilter(projectId.toString());
    changeTab('tasks');
  };

  const toggleProjectTicketSelection = (ticketId) => {
    if (projectTicketIds.includes(ticketId)) {
      setProjectTicketIds(projectTicketIds.filter(id => id !== ticketId));
    } else {
      setProjectTicketIds([...projectTicketIds, ticketId]);
    }
  };

  const handleSaveProject = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        name: projectName,
        description: projectDesc,
        team_id: projectTeamId ? Number(projectTeamId) : null,
        ticket_ids: projectTicketIds
      };

      if (editProjectMode) {
        await axios.put(`${API_URL}/projects/${currentProjectId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/projects/`, payload, { headers });
      }
      setShowProjectModal(false);
      setProjectName('');
      setProjectDesc('');
      setProjectTeamId('');
      setProjectTicketIds([]);
      fetchData();
    } catch (err) {
      alert('Erro ao guardar projeto.');
    }
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/teams/`, { 
        name: newTeamName, 
        description: newTeamDesc,
        owner_id: newTeamOwnerId ? Number(newTeamOwnerId) : null,
        member_ids: newTeamMemberIds
      }, { headers });
      setShowTeamModal(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setNewTeamOwnerId('');
      setNewTeamMemberIds([]);
      fetchData();
      alert('Equipa criada com sucesso!');
    } catch (err) {
      alert('Erro ao criar equipa.');
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm("Tens a certeza que pretendes apagar esta equipa?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/teams/${teamId}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar equipa.');
    }
  };

  const openEditTeamModal = (team) => {
    setCurrentTeam(team);
    setEditTeamName(team.name);
    setEditTeamDesc(team.description || '');
    setEditTeamOwnerId(team.owner_id);
    setSelectedMemberIds(team.members ? team.members.map(m => m.id) : []);
    setSelectedProjectIds(projects.filter(p => p.team_id === team.id).map(p => p.id));
    setShowEditTeamModal(true);
  };

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/teams/${currentTeam.id}`, {
        name: editTeamName,
        description: editTeamDesc,
        owner_id: Number(editTeamOwnerId),
        member_ids: selectedMemberIds,
        project_ids: selectedProjectIds
      }, { headers });
      setShowEditTeamModal(false);
      fetchData();
      alert('Equipa atualizada com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar equipa.');
    }
  };

  const toggleNewTeamMember = (userId) => {
    if (newTeamMemberIds.includes(userId)) {
      setNewTeamMemberIds(newTeamMemberIds.filter(id => id !== userId));
    } else {
      setNewTeamMemberIds([...newTeamMemberIds, userId]);
    }
  };

  const toggleMemberSelection = (userId) => {
    if (selectedMemberIds.includes(userId)) {
      setSelectedMemberIds(selectedMemberIds.filter(id => id !== userId));
    } else {
      setSelectedMemberIds([...selectedMemberIds, userId]);
    }
  };

  const toggleProjectSelection = (projId) => {
    if (selectedProjectIds.includes(projId)) {
      setSelectedProjectIds(selectedProjectIds.filter(id => id !== projId));
    } else {
      setSelectedProjectIds([...selectedProjectIds, projId]);
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
      await axios.post(`${API_URL}/tickets/${activeTaskForComments.id}/comments?author_id=${currentUserInfo.id}`, { text: newCommentText }, { headers });
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
    setNewAssignedTo('');
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
    setNewAssignedTo(ticket.assigned_to_id || '');
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
        assigned_to_id: newAssignedTo ? Number(newAssignedTo) : null,
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

  const handleStatusChange = async (ticketId, newStat) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      let updatePayload = { status: newStat };
      if (newStat === 'Done' || newStat === 'Concluído' || newStat === 'Concluido') {
        updatePayload.is_running = false;
        if (activeTimerTask && activeTimerTask.id === ticketId) {
            setActiveTimerTask(null);
            setSecondsElapsed(0);
        }
      }

      await axios.put(`${API_URL}/tickets/${ticketId}`, updatePayload, { headers });
      fetchData();
      fetchActiveWorkers();
    } catch (err) {
      alert('Erro ao alterar o estado.');
    }
  };

  const handleDeleteTicket = async (id) => {
    if (!window.confirm("Tens a certeza que pretendes apagar esta tarefa?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/tickets/${id}`, { headers });
      fetchData();
      fetchActiveWorkers();
    } catch (err) {
      alert('Erro ao apagar tarefa.');
    }
  };

  const handleDragStart = (e, ticketId) => {
    e.dataTransfer.setData('text/plain', ticketId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('text/plain');
    if (ticketId) {
      handleStatusChange(Number(ticketId), targetStatus);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'Crítica':
        return 'bg-red-950/80 text-red-400 border-red-500/40';
      case 'Alta':
        return 'bg-orange-950/80 text-orange-400 border-orange-500/40';
      case 'Média':
        return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'Baixa':
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const getCalendarTicketStyle = (ticket) => {
    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
    if (isDone) {
      return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 line-through opacity-70';
    }
    switch (ticket.priority) {
      case 'Crítica':
        return 'bg-red-950/40 border-red-500/30 text-red-300';
      case 'Alta':
        return 'bg-orange-950/40 border-orange-500/30 text-orange-300';
      case 'Média':
        return 'bg-amber-950/40 border-amber-500/30 text-amber-300';
      case 'Baixa':
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100';
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
  
  const activeTasksList = tickets.filter(t => t.status && !['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));
  const doneTickets = tickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));
  const overdueTickets = tickets.filter(t => t.due_date && t.due_date.split('T')[0] < todayStr && t.status && !['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));

  const filteredTickets = tickets.filter(ticket => {
    if (projectFilter && ticket.project_id !== Number(projectFilter)) return false;
    if (priorityFilter && ticket.priority !== priorityFilter) return false;
    
    if (taskViewMode === 'list') {
      if (statusFilter) {
        if (ticket.status !== statusFilter) return false;
      } else {
        if (ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase())) return false;
      }
    }
    return true;
  });

  const sortedTickets = [...filteredTickets].sort((a, b) => {
    if (sortBy === 'newest') {
      return b.id - a.id;
    } else if (sortBy === 'deadline') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    } else if (sortBy === 'priority') {
      const weights = { 'Crítica': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return (weights[b.priority] || 0) - (weights[a.priority] || 0);
    }
    return 0;
  });

  const filteredTeams = teams.filter(team => team.name.toLowerCase().includes(teamSearch.toLowerCase()));

  const getUserDisplayName = (user) => {
    if (!user) return 'Desconhecido';
    return user.name && user.name.trim() !== '' ? user.name : user.email;
  };

  const getTeamLeaderName = (team) => {
    if (!team || !team.members) return 'Sem líder';
    const leader = team.members.find(m => m.id === team.owner_id);
    return leader ? getUserDisplayName(leader) : 'Administrador';
  };

  const getAssigneeName = (userId) => {
    if (!userId) return null;
    const user = usersList.find(u => u.id === userId);
    return user ? getUserDisplayName(user) : null;
  };

  const getProjectName = (projectId) => {
    const p = projects.find(proj => proj.id === projectId);
    return p ? p.name : 'Projeto Geral';
  };

  const kanbanColumns = [
    { id: 'To Do', title: 'A fazer', color: 'bg-zinc-500' },
    { id: 'In Progress', title: 'Em progresso', color: 'bg-blue-500' },
    { id: 'In Review', title: 'Em revisão', color: 'bg-amber-500' },
    { id: 'Done', title: 'Concluído', color: 'bg-emerald-500' }
  ];

  const getVisibleWorkers = () => {
    if (currentUserInfo.role === 'Admin' || currentUserInfo.role === 'Manager') {
      return activeWorkers;
    }
    const myTeams = teams.filter(t => t.members?.some(m => m.id === currentUserInfo.id));
    const colleagueIds = new Set();
    
    if (currentUserInfo.id) colleagueIds.add(currentUserInfo.id);

    myTeams.forEach(t => t.members?.forEach(m => colleagueIds.add(m.id)));
    
    return activeWorkers.filter(w => colleagueIds.has(w.assigned_to_id));
  };

  const visibleWorkers = getVisibleWorkers();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 shrink-0 h-screen sticky top-0">
        <div className="flex items-center gap-3 px-3 py-3 mb-6">
          <div className="p-2 bg-zinc-800 rounded-lg"><TicketIcon className="w-5 h-5 text-zinc-200" /></div>
          <span className="font-semibold tracking-tight text-lg">FlowPulse</span>
        </div>

        <nav className="space-y-1.5 flex-1">
          <button onClick={() => changeTab('dashboard')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => changeTab('projects')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'projects' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <FolderPlus className="w-4 h-4" /> Projetos
          </button>
          <button onClick={() => changeTab('tasks')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'tasks' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <CheckCircle2 className="w-4 h-4" /> Tarefas
          </button>
          <button onClick={() => changeTab('teams')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'teams' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Users className="w-4 h-4" /> Equipas
          </button>
          <button onClick={() => changeTab('calendar')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'calendar' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Calendar className="w-4 h-4" /> Calendário
          </button>
          <button onClick={() => changeTab('settings')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'settings' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Settings className="w-4 h-4" /> Definições
          </button>
        </nav>

        <div className="pt-4 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 h-screen overflow-y-auto p-8 pb-16">
        
        {/* CRONÓMETRO ATIVO */}
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

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold tracking-tight">Dashboard & Gestão</h1>
              <button onClick={() => {fetchData(); fetchActiveWorkers();}} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 px-4 py-2 rounded-xl text-sm transition">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div 
                onClick={() => { changeTab('tasks'); setStatusFilter(''); }}
                className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm group"
              >
                <div>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider group-hover:text-zinc-200 transition">Tarefas Ativas</p>
                  <p className="text-3xl font-bold mt-1 text-zinc-100">{activeTasksList.length}</p>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 border border-zinc-700/50 group-hover:bg-zinc-800 transition"><Calendar className="w-5 h-5" /></div>
              </div>

              <div 
                onClick={() => { changeTab('tasks'); setStatusFilter(''); }}
                className="bg-zinc-900/80 border border-zinc-800/80 hover:border-red-500/40 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm group"
              >
                <div>
                  <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Atrasadas</p>
                  <p className="text-3xl font-bold mt-1 text-red-400">{overdueTickets.length}</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 group-hover:bg-red-500/20 transition"><AlertCircle className="w-5 h-5" /></div>
              </div>

              <div 
                onClick={() => { changeTab('tasks'); setStatusFilter('Done'); }}
                className="bg-zinc-900/80 border border-zinc-800/80 hover:border-emerald-500/40 p-5 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-sm group"
              >
                <div>
                  <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Concluídas</p>
                  <p className="text-3xl font-bold mt-1 text-emerald-400">{doneTickets.length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition"><CheckCircle2 className="w-5 h-5" /></div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800/80 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Horas Hoje</p>
                  <p className="text-3xl font-bold mt-1 text-blue-400">
                    {((stats.hours_today || 0) + (activeTimerTask ? (secondsElapsed / 3600) : 0)).toFixed(2)}h
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20"><Clock className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    A trabalhar agora
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {currentUserInfo.role === 'Admin' || currentUserInfo.role === 'Manager' 
                      ? 'Visão global da empresa' 
                      : 'Colegas das tuas equipas'}
                  </p>
                </div>
                <div className="text-xs font-mono text-zinc-500 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                  {visibleWorkers.length} online
                </div>
              </div>

              {visibleWorkers.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhum colega a faturar tempo neste momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {visibleWorkers.map(ticket => {
                    const workerName = getAssigneeName(ticket.assigned_to_id);
                    return (
                      <div key={ticket.id} className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl flex items-center gap-3 shadow-sm group hover:border-emerald-500/30 transition">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 font-bold text-xs">
                          {workerName ? workerName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate">{workerName || 'Sem dono'}</p>
                          <p className="text-[11px] text-zinc-500 truncate mt-0.5" title={ticket.title}>Em: {ticket.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Tarefas do Sistema</h2>
                  <p className="text-xs text-zinc-400">Visão geral e gestão rápida</p>
                </div>
                <button onClick={handleOpenCreateModal} className="flex items-center gap-1.5 bg-zinc-100 text-zinc-950 font-medium text-xs px-3.5 py-2 rounded-xl hover:bg-white transition">
                  <Plus className="w-3.5 h-3.5" /> Nova Tarefa
                </button>
              </div>

              {activeTasksList.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma tarefa ativa neste momento.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeTasksList.map(ticket => {
                    const isRunning = activeTimerTask?.id === ticket.id;
                    const assignee = getAssigneeName(ticket.assigned_to_id);
                    return (
                      <div key={ticket.id} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                            <h3 className="font-medium text-sm text-zinc-100">{ticket.title}</h3>
                            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">📁 {getProjectName(ticket.project_id)}</span>
                            {ticket.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            )}
                            {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">ATIVO</span>}
                          </div>
                          <p className="text-xs text-zinc-400 pl-6">{ticket.description || 'Sem descrição'}</p>
                          <div className="text-[11px] text-zinc-500 pl-6 flex items-center gap-3 pt-1">
                            <span>⏱️ <strong>{ticket.tracked_hours || 0}h</strong> / 🎯 <strong>{ticket.estimated_hours || 0}h</strong></span>
                            {ticket.due_date && <span>📅 <strong>{ticket.due_date.split('T')[0]}</strong></span>}
                            {assignee && <span className="text-emerald-400">👤 {assignee}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select 
                            value={ticket.status} 
                            onChange={e => handleStatusChange(ticket.id, e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
                          >
                            <option value="To Do">A fazer</option>
                            <option value="In Progress">Em progresso</option>
                            <option value="In Review">Em revisão</option>
                            <option value="Done">Concluído</option>
                          </select>
                          <button onClick={() => startTimer(ticket)} className={`p-2 rounded-lg border transition ${isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`} title="Iniciar Cronómetro">
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

        {/* PROJETOS */}
        {activeTab === 'projects' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold tracking-tight">Projetos</h1>
              <button onClick={handleOpenCreateProjectModal} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">
                <FolderPlus className="w-4 h-4" /> Novo Projeto
              </button>
            </div>
            
            {projects.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                Nenhum projeto registado.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(proj => {
                  const projTickets = tickets.filter(t => t.project_id === proj.id);
                  const total = projTickets.length;
                  const done = projTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase())).length;
                  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
                  const team = teams.find(t => t.id === proj.team_id);

                  return (
                    <div key={proj.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col group hover:border-zinc-700 transition">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 pr-4">
                          <h2 className="font-semibold text-base text-zinc-100 truncate" title={proj.name}>{proj.name}</h2>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2 min-h-[32px]">{proj.description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => openEditProjectModal(proj)} className="p-1.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition" title="Editar Projeto"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteProject(proj.id)} className="p-1.5 bg-zinc-950 border border-zinc-800 text-red-400 hover:text-red-300 rounded-lg transition" title="Apagar Projeto"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 text-xs">
                        <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-md text-zinc-400">
                          <Users className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[120px]">{team ? team.name : 'Equipa Geral'}</span>
                        </div>
                      </div>

                      <div className="mt-6 mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="text-zinc-400 font-medium">Progresso</span>
                          <span className="text-emerald-400 font-bold">{percent}%</span>
                        </div>
                        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-2 text-right">
                          {done} de {total} tarefas concluídas
                        </p>
                      </div>

                      <button 
                        onClick={() => goToProjectTasks(proj.id)}
                        className="mt-auto w-full flex items-center justify-center gap-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2 rounded-xl text-xs font-medium transition"
                      >
                        <ListFilter className="w-3.5 h-3.5" /> Ver Tarefas
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAREFAS */}
        {activeTab === 'tasks' && (
          <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input type="text" placeholder="Pesquisar tarefas..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center">
                  <button onClick={() => setTaskViewMode('kanban')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${taskViewMode === 'kanban' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    <Kanban className="w-3.5 h-3.5" /> Kanban
                  </button>
                  <button onClick={() => setTaskViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${taskViewMode === 'list' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                    <ListFilter className="w-3.5 h-3.5" /> Lista
                  </button>
                </div>

                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-300">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-zinc-500" />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-transparent text-zinc-300 focus:outline-none text-xs">
                    <option value="newest" className="bg-zinc-900">Ordem de criação</option>
                    <option value="deadline" className="bg-zinc-900">Deadline (Prazo)</option>
                    <option value="priority" className="bg-zinc-900">Prioridade</option>
                  </select>
                </div>

                <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none">
                  <option value="">Todos os projetos</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                {taskViewMode === 'list' && (
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none">
                    <option value="">Estados (Ativos)</option>
                    <option value="To Do">A fazer</option>
                    <option value="In Progress">Em progresso</option>
                    <option value="In Review">Em revisão</option>
                    <option value="Done">Concluído</option>
                  </select>
                )}

                <button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition ml-auto sm:ml-0">
                  <Plus className="w-4 h-4" /> Nova Tarefa
                </button>
              </div>
            </div>

            {taskViewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-x-auto pb-4 items-start">
                {kanbanColumns.map(col => {
                  const columnTickets = sortedTickets.filter(t => t.status === col.id);
                  return (
                    <div 
                      key={col.id} 
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col h-full min-h-[500px]"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}></span>
                          <h3 className="font-semibold text-sm text-zinc-200">{col.title}</h3>
                        </div>
                        <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">{columnTickets.length}</span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {columnTickets.length === 0 ? (
                          <div className="h-32 border border-dashed border-zinc-800/80 rounded-xl flex items-center justify-center text-xs text-zinc-600">
                            Arraste tarefas aqui
                          </div>
                        ) : (
                          columnTickets.map(ticket => {
                            const isRunning = activeTimerTask?.id === ticket.id;
                            const assignee = getAssigneeName(ticket.assigned_to_id);
                            return (
                              <div 
                                key={ticket.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, ticket.id)}
                                className="bg-zinc-950 border border-zinc-800/90 hover:border-zinc-700 p-4 rounded-xl cursor-grab active:cursor-grabbing transition space-y-3 shadow-sm group"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-zinc-500">#{ticket.id}</span>
                                    {ticket.priority && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                        {ticket.priority}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                    <button onClick={() => startTimer(ticket)} title="Iniciar Cronómetro" className={`p-1.5 rounded-md border transition ${isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400 animate-pulse' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`}>
                                      <Play className="w-3 h-3 fill-current" />
                                    </button>
                                    <button onClick={() => openComments(ticket)} title="Comentários" className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition">
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleOpenEditModal(ticket)} title="Editar" className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition">
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => handleDeleteTicket(ticket.id)} title="Apagar" className="p-1.5 bg-zinc-900 border border-zinc-800 text-red-400 hover:text-red-300 rounded-md transition">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium text-sm text-zinc-100 leading-snug">{ticket.title}</h4>
                                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{ticket.description || 'Sem descrição'}</p>
                                </div>

                                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-zinc-900">
                                  <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">📁 {getProjectName(ticket.project_id)}</span>
                                  {assignee && <span className="text-emerald-400 font-medium">👤 {assignee}</span>}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex-1 overflow-y-auto">
                {sortedTickets.length === 0 ? (
                  <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma tarefa encontrada.</div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {sortedTickets.map(ticket => {
                      const isRunning = activeTimerTask?.id === ticket.id;
                      const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                      const assignee = getAssigneeName(ticket.assigned_to_id);
                      return (
                        <div key={ticket.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${isDone ? 'bg-zinc-900/30 opacity-60' : 'hover:bg-zinc-850/50'}`}>
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                              <h2 className={`font-medium text-sm ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>{ticket.title}</h2>
                              <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">📁 {getProjectName(ticket.project_id)}</span>
                              {ticket.priority && (
                                <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                  {ticket.priority}
                                </span>
                              )}
                              {isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONCLUÍDO</span>}
                              {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">ATIVO</span>}
                            </div>
                            <p className="text-xs text-zinc-400 pl-7">{ticket.description || 'Sem descrição'}</p>
                            <div className="text-[11px] text-zinc-500 pl-7 flex items-center gap-3">
                              <span>⏱️ <strong>{ticket.tracked_hours || 0}h</strong> / 🎯 <strong>{ticket.estimated_hours || 0}h</strong></span>
                              {ticket.due_date && <span>📅 <strong>{ticket.due_date.split('T')[0]}</strong></span>}
                              {assignee && <span className="text-emerald-400">👤 {assignee}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <select 
                              value={ticket.status} 
                              onChange={e => handleStatusChange(ticket.id, e.target.value)}
                              className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
                            >
                              <option value="To Do">A fazer</option>
                              <option value="In Progress">Em progresso</option>
                              <option value="In Review">Em revisão</option>
                              <option value="Done">Concluído</option>
                            </select>
                            <button onClick={() => startTimer(ticket)} disabled={isDone} className={`p-2 rounded-lg border transition ${isDone ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-900 text-zinc-700' : isRunning ? 'bg-blue-500 text-zinc-950 border-blue-400' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`} title="Iniciar Cronómetro">
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
            )}
          </div>
        )}

        {/* EQUIPAS */}
        {activeTab === 'teams' && (
          <div>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                <input type="text" placeholder="Pesquisar equipas..." value={teamSearch} onChange={e => setTeamSearch(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <button onClick={() => setShowTeamModal(true)} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition ml-auto sm:ml-0">
                <Users className="w-4 h-4" /> Nova Equipa
              </button>
            </div>
            
            {filteredTeams.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                Nenhuma equipa encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredTeams.map(team => {
                  const teamProjects = projects.filter(p => p.team_id === team.id);
                  const leaderName = getTeamLeaderName(team);
                  return (
                    <div key={team.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{team.name}</h2>
                          <p className="text-xs text-zinc-400 mt-0.5">{team.description || 'Sem descrição'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditTeamModal(team)} className="p-2 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteTeam(team.id)} className="p-2 bg-zinc-950 border border-zinc-800 text-red-400 hover:text-red-300 rounded-xl transition"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-300 border-y border-zinc-800/60 py-4">
                        <div className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /><span>Líder: <strong className="text-zinc-100">{leaderName}</strong></span></div>
                        <div className="flex items-center gap-2 text-zinc-400"><Users className="w-4 h-4 text-zinc-400" /><span>{team.members ? team.members.length : 0} membro(s)</span></div>
                        <div className="flex items-center gap-2 text-zinc-400"><Folder className="w-4 h-4 text-zinc-400" /><span>{teamProjects.length} projeto(s)</span></div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Membros</h3>
                          <div className="space-y-2">
                            {team.members && team.members.map(member => (
                              <div key={member.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between text-xs">
                                <span className="font-medium text-zinc-200">{getUserDisplayName(member)}</span>
                                {member.id === team.owner_id && <span className="text-[10px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">Líder</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Projetos</h3>
                          <div className="space-y-2">
                            {teamProjects.map(proj => (
                              <div key={proj.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-xs text-zinc-200 font-medium">📁 {proj.name}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CALENDÁRIO */}
        {activeTab === 'calendar' && (() => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          
          const monthNames = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho", 
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
          ];

          const userTeams = teams.filter(t => t.members?.some(m => m.id === currentUserInfo.id));
          const availableTeams = (currentUserInfo.role === 'Admin' || currentUserInfo.role === 'Manager') ? teams : userTeams;

          const calendarFilteredTickets = tickets.filter(t => {
            if (!t.due_date) return false;
            if (calendarTeamFilter === 'all') return true;
            
            const teamProjIds = projects.filter(p => p.team_id === Number(calendarTeamFilter)).map(p => p.id);
            return teamProjIds.includes(t.project_id);
          });

          const firstDayIndex = new Date(year, month, 1).getDay();
          const adjustedFirstDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
          const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
          const goToToday = () => setCurrentDate(new Date());

          const todayString = getLocalDateString();

          return (
            <div className="flex flex-col h-[calc(100vh-100px)]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Calendário</h1>
                  <p className="text-xs text-zinc-400">Visualize prazos e marcos dos projetos</p>
                </div>

                <div className="flex items-center gap-3">
                  <select 
                    value={calendarTeamFilter} 
                    onChange={e => setCalendarTeamFilter(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none"
                  >
                    <option value="all">Todas as equipas</option>
                    {availableTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>

                  <button onClick={() => fetchData()} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex-1 flex flex-col shadow-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <button onClick={prevMonth} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={nextMonth} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={goToToday} className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs rounded-xl transition">
                      Hoje
                    </button>
                  </div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-200">
                    {monthNames[month]} de {year}
                  </h2>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                  {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                    <span key={d} className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                  {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-zinc-950/20 border border-zinc-900 rounded-xl opacity-20"></div>
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const formattedDay = String(dayNum).padStart(2, '0');
                    const formattedMonth = String(month + 1).padStart(2, '0');
                    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
                    
                    const isToday = dateStr === todayString;
                    const dayTasks = calendarFilteredTickets.filter(t => t.due_date && t.due_date.split('T')[0] === dateStr);

                    return (
                      <div 
                        key={dateStr} 
                        onClick={() => setSelectedCalendarDate(dateStr)}
                        className={`bg-zinc-950/60 border rounded-xl p-2 flex flex-col overflow-hidden transition cursor-pointer hover:border-zinc-500 ${isToday ? 'border-zinc-500 shadow-sm' : 'border-zinc-850'}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`text-xs font-mono font-medium ${isToday ? 'bg-zinc-800 text-zinc-100 w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-sm' : 'text-zinc-400'}`}>
                            {dayNum}
                          </span>
                          {dayTasks.length > 0 && (
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                          {dayTasks.map(ticket => {
                            const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                            return (
                              <div 
                                key={ticket.id} 
                                onClick={(e) => { e.stopPropagation(); openComments(ticket); }}
                                title={ticket.title}
                                className={`text-[10px] px-2 py-1 rounded-lg border truncate transition ${getCalendarTicketStyle(ticket)}`}
                              >
                                {ticket.title}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* DEFINIÇÕES */}
        {activeTab === 'settings' && (
          <div className="max-w-6xl mx-auto py-4">
            <div className="mb-6">
              <h1 className="text-xl font-bold tracking-tight">Definições</h1>
              <p className="text-xs text-zinc-400">Gerencie a sua conta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PERFIL */}
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col">
                <h2 className="text-base font-semibold text-zinc-100">Perfil</h2>
                <p className="text-xs text-zinc-400 mb-6">Atualize as suas informações pessoais</p>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center text-lg font-bold shadow-inner">
                    {currentUserInfo.name ? currentUserInfo.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{currentUserInfo.name || 'Utilizador'}</p>
                    <p className="text-xs text-zinc-400">{currentUserInfo.email}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Nome</label>
                      <input 
                        type="text" 
                        value={settingsName} 
                        onChange={e => setSettingsName(e.target.value)} 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" 
                        placeholder="O teu nome" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
                      <input 
                        type="email" 
                        value={settingsEmail} 
                        onChange={e => setSettingsEmail(e.target.value)} 
                        required 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" 
                        placeholder="teu.email@empresa.com" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Cargo</label>
                      <input 
                        type="text" 
                        value={currentUserInfo.role} 
                        disabled 
                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">ID de Colaborador</label>
                      <input 
                        type="text" 
                        value={`#${currentUserInfo.id}`} 
                        disabled 
                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" 
                      />
                    </div>
                  </div>

                  {profileMessage && (
                    <p className={`text-xs mt-2 ${profileMessage.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profileMessage}
                    </p>
                  )}

                  <div className="mt-auto pt-6 flex justify-end">
                    <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-xs px-4 py-2 rounded-xl hover:bg-white transition shadow-sm">
                      Guardar alterações
                    </button>
                  </div>
                </form>
              </div>

              {/* SEGURANÇA */}
              <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col">
                <h2 className="text-base font-semibold text-zinc-100">Segurança</h2>
                <p className="text-xs text-zinc-400 mb-6">Altere a sua senha de acesso</p>

                <form onSubmit={handleUpdatePassword} className="space-y-4 flex-1 flex flex-col">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Senha atual</label>
                    <input 
                      type="password" 
                      value={settingsCurrentPassword} 
                      onChange={e => setSettingsCurrentPassword(e.target.value)} 
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" 
                      placeholder="Para confirmar a sua identidade" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Nova senha</label>
                      <input 
                        type="password" 
                        value={settingsNewPassword} 
                        onChange={e => setSettingsNewPassword(e.target.value)} 
                        required 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" 
                        placeholder="Mínimo de 6 caracteres" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Confirmar senha</label>
                      <input 
                        type="password" 
                        value={settingsConfirmPassword} 
                        onChange={e => setSettingsConfirmPassword(e.target.value)} 
                        required 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" 
                        placeholder="Repita a nova senha" 
                      />
                    </div>
                  </div>

                  {securityMessage && (
                    <p className={`text-xs mt-2 ${securityMessage.includes('sucesso') ? 'text-emerald-400' : 'text-red-400'}`}>
                      {securityMessage}
                    </p>
                  )}

                  <div className="mt-auto pt-6 flex justify-end">
                    <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-xs px-4 py-2 rounded-xl hover:bg-white transition shadow-sm">
                      Alterar senha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* POP-UP / MODAL DO DIA SELECIONADO NO CALENDÁRIO */}
      {selectedCalendarDate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Tarefas do Dia</h2>
                <p className="text-xs text-blue-400 font-mono mt-0.5">Prazo: {selectedCalendarDate}</p>
              </div>
              <button onClick={() => setSelectedCalendarDate(null)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-xl transition">Fechar</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {tickets.filter(t => t.due_date && t.due_date.split('T')[0] === selectedCalendarDate).length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma tarefa agendada para este dia.
                </div>
              ) : (
                tickets
                  .filter(t => t.due_date && t.due_date.split('T')[0] === selectedCalendarDate)
                  .map(ticket => {
                    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                    const assignee = getAssigneeName(ticket.assigned_to_id);
                    return (
                      <div key={ticket.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500">#{ticket.id}</span>
                            {ticket.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${isDone ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-900 text-zinc-300 border border-zinc-800'}`}>
                            {ticket.status}
                          </span>
                        </div>
                        <h4 className="font-medium text-sm text-zinc-100">{ticket.title}</h4>
                        <p className="text-xs text-zinc-400">{ticket.description || 'Sem descrição'}</p>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-zinc-900">
                          <span>📁 {getProjectName(ticket.project_id)}</span>
                          {assignee && <span className="text-emerald-400">👤 {assignee}</span>}
                          <button 
                            onClick={() => { setSelectedCalendarDate(null); openComments(ticket); }} 
                            className="text-xs font-medium text-blue-400 hover:underline"
                          >
                            Ver detalhes / comentários
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE TAREFA */}
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
                    <option value="To Do">A fazer</option>
                    <option value="In Progress">Em progresso</option>
                    <option value="In Review">Em revisão</option>
                    <option value="Done">Concluído</option>
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
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Atribuir a</label>
                  <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Não atribuído</option>
                    {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Horas Estimadas</label>
                  <input type="number" step="0.5" value={newEstimatedHours} onChange={e => setNewEstimatedHours(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data Limite</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">{editMode ? 'Atualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PROJETOS (CRIAR E EDITAR) */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">{editProjectMode ? 'Editar Projeto' : 'Novo Projeto'}</h2>
            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Projeto</label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Equipa Responsável</label>
                <select value={projectTeamId} onChange={e => setProjectTeamId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none">
                  <option value="">Nenhuma (Projeto Geral)</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Tarefas Associadas</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {tickets.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center">Nenhuma tarefa criada.</p>
                  ) : (
                    tickets.map(ticket => {
                      const isSelected = projectTicketIds.includes(ticket.id);
                      return (
                        <div key={ticket.id} onClick={() => toggleProjectTicketSelection(ticket.id)} className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-zinc-800 border border-zinc-700 text-zinc-100' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900'}`}>
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">{ticket.title}</span>
                            <span className="text-[10px] text-zinc-500 mt-0.5">{ticket.status}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 ${isSelected ? 'bg-blue-500/20 text-blue-400 font-bold' : 'bg-zinc-800 text-zinc-500'}`}>
                            {isSelected ? 'Incluída' : 'Adicionar'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowProjectModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">
                  {editProjectMode ? 'Guardar Alterações' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EQUIPA (CRIAR E EDITAR) */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Nova Equipa</h2>
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome da Equipa</label>
                <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={newTeamDesc} onChange={e => setNewTeamDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Líder da Equipa</label>
                <select value={newTeamOwnerId} onChange={e => setNewTeamOwnerId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none">
                  <option value="">Seleciona o líder...</option>
                  {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Membros</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {usersList.map(user => {
                    const isSelected = newTeamMemberIds.includes(user.id);
                    return (
                      <div key={user.id} onClick={() => toggleNewTeamMember(user.id)} className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-zinc-800 border border-zinc-700 text-zinc-100' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900'}`}>
                        <span>{getUserDisplayName(user)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-zinc-800 text-zinc-500'}`}>{isSelected ? 'Selecionado' : 'Adicionar'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setShowTeamModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Criar Equipa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Editar Equipa</h2>
            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome da Equipa</label>
                <input type="text" value={editTeamName} onChange={e => setEditTeamName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição</label>
                <textarea value={editTeamDesc} onChange={e => setEditTeamDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Líder da Equipa</label>
                <select value={editTeamOwnerId} onChange={e => setEditTeamOwnerId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none">
                  {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Membros</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {usersList.map(user => {
                    const isSelected = selectedMemberIds.includes(user.id);
                    return (
                      <div key={user.id} onClick={() => toggleMemberSelection(user.id)} className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-zinc-800 border border-zinc-700 text-zinc-100' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900'}`}>
                        <span>{getUserDisplayName(user)}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'bg-zinc-800 text-zinc-500'}`}>{isSelected ? 'Membro' : 'Adicionar'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Projetos Associados</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {projects.map(proj => {
                    const isSelected = selectedProjectIds.includes(proj.id);
                    return (
                      <div key={proj.id} onClick={() => toggleProjectSelection(proj.id)} className={`p-2.5 rounded-lg flex items-center justify-between text-xs cursor-pointer transition ${isSelected ? 'bg-zinc-800 border border-zinc-700 text-zinc-100' : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900'}`}>
                        <span>{proj.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${isSelected ? 'bg-blue-500/20 text-blue-400 font-bold' : 'bg-zinc-800 text-zinc-500'}`}>{isSelected ? 'Associado' : 'Adicionar'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setShowEditTeamModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Guardar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMENTÁRIOS */}
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
    </div>
  );
}