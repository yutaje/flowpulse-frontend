import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, 
  LogOut, ShieldAlert, LayoutDashboard, Ticket as TicketIcon, Trash2, Edit3, Play, Square, MessageSquare, FolderPlus, RefreshCw, Calendar, Users, Crown, Folder, UserCheck, Kanban, ListFilter, ArrowUpDown, ChevronLeft, ChevronRight, Settings, BarChart3, Bell, Check, Download, Building2, Phone, Mail, BarChart, X, Upload 
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000'; 

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');
  const [taskViewMode, setTaskViewMode] = useState('kanban'); // 'kanban', 'list'
  const [showGanttModal, setShowGanttModal] = useState(false);

  // --- NOVOS ESTADOS PARA O RELATÓRIO DIÁRIO ---
  const [dailyReport, setDailyReport] = useState(null);
  const [todayTickets, setTodayTickets] = useState([]);
  const [generatingDaily, setGeneratingDaily] = useState(false);
  const [weekStatus, setWeekStatus] = useState([]);

  // Função para ir buscar o relatório de hoje
  const fetchDailyReport = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/my-day/today`, { headers });
      setDailyReport(res.data.report);
      setTodayTickets(res.data.tickets_worked);
    } catch (err) {
      console.error("Erro ao carregar o dia:", err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/audit-logs/`, { headers });
      setAuditLogs(res.data);
    } catch (err) {
      console.error("Erro ao carregar os logs do sistema:", err);
    }
  };

const fetchWeekStatus = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/my-day/week`, { headers });
      setWeekStatus(res.data);
    } catch (err) {
      console.error("Erro ao carregar a semana:", err);
    }
  };

  const generateDailyReportIA = async () => {
    if (todayTickets.length === 0) {
      alert("Ainda não registaste tempo em nenhuma tarefa hoje para a IA resumir!");
      return;
    }
    setGeneratingDaily(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/tickets/my-day/generate-ai`, {}, { headers });
      
      setDailyReport(prev => ({
        ...prev,
        summary: res.data.summary,
        detailed_report: res.data.detailed_report
      }));
    } catch (err) {
      alert("Erro ao ligar ao assistente inteligente.");
    } finally {
      setGeneratingDaily(false);
    }
  };

  const submitDailyReport = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/my-day/today`, {
        summary: dailyReport.summary,
        detailed_report: dailyReport.detailed_report,
        kilometers: Number(dailyReport.kilometers || 0),
        overtime_hours: Number(dailyReport.overtime_hours || 0)
      }, { headers });
      
      alert("Relatório Diário Submetido com Sucesso! Excelente trabalho hoje.");
      fetchDailyReport(); // Recarrega para veres o crachá verde de 'SUBMETIDO'
    } catch (err) {
      alert("Erro ao submeter relatório.");
    }
  };

  const reopenDailyReport = async () => {
    if (!window.confirm("Queres reabrir o relatório para edição? O estado passará novamente a Rascunho e a tua equipa será notificada se já o tiverem lido.")) return;
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/my-day/reopen`, {}, { headers });
      
      // Recarrega os dados do dia e a barrinha da semana!
      fetchDailyReport();
      fetchWeekStatus(); 
    } catch (err) {
      alert("Erro ao reabrir o relatório.");
    }
  };

  // Carregar os dados automaticamente quando mudas para o separador
  useEffect(() => {
    if (activeTab === 'my-day' && token) {
      fetchDailyReport();
      fetchWeekStatus();
    }
    if (activeTab === 'admin' && token) {
      fetchAuditLogs();
    }
  }, [activeTab, token]);

  // Estados para o Modal de Tarefas do Projeto
  const [showProjectTasksModal, setShowProjectTasksModal] = useState(false);
  const [activeProjectForTasks, setActiveProjectForTasks] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estados para o Modal de Conclusão de Tarefa
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [ticketToComplete, setTicketToComplete] = useState(null);
  const [finalDesc, setFinalDesc] = useState('');
  const [extraTime, setExtraTime] = useState('');
  const [completionFile, setCompletionFile] = useState(null);

  // Estados para a Recomendação de IA (Foco Inteligente)
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [loadingAiRec, setLoadingAiRec] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [clients, setClients] = useState([]); 
  const [stats, setStats] = useState({ total_tickets: 0, to_do: 0, in_progress: 0, done: 0 });
  const [notifications, setNotifications] = useState([]); 
  const [showNotificationsModal, setShowNotificationsModal] = useState(false); 

  // Estados da Barra de Pesquisa Rápida (Spotlight / Cmd+K)
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  
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

  // Filtros Globais
  const [search, setSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Filtro de Estatísticas
  const [statsPeriod, setStatsPeriod] = useState('7'); 

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Estados Modais de Tarefa
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Média');
  const [newStatus, setNewStatus] = useState('To Do');
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientId, setNewClientId] = useState(''); 
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newEstimatedHours, setNewEstimatedHours] = useState(0);
  const [newDueDate, setNewDueDate] = useState('');
  const [newStartDate, setNewStartDate] = useState('');

  // Estados dos Projetos
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProjectMode, setEditProjectMode] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTeamId, setProjectTeamId] = useState('');
  const [projectClientId, setProjectClientId] = useState(''); 
  const [projectTicketIds, setProjectTicketIds] = useState([]); 

  // Estados dos Clientes
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Estados para Editar Cliente
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editClientCompany, setEditClientCompany] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');

  // Estados das Equipas
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

  // Estados da Administração (Criação de Utilizador)
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Member');

  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [activeTaskForComments, setActiveTaskForComments] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarTeamFilter, setCalendarTeamFilter] = useState('all');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

  const getLocalDateString = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Atalho de Teclado global (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowQuickSearch(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowQuickSearch(false);
        setShowGanttModal(false);
        setShowProjectTasksModal(false);
        setShowCompleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/notifications/`, { headers });
      setNotifications(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (token) {
      fetchActiveWorkers();
      fetchNotifications();
      const radarWorkers = setInterval(fetchActiveWorkers, 10000); 
      const radarNotifs = setInterval(fetchNotifications, 15000); 
      return () => { clearInterval(radarWorkers); clearInterval(radarNotifs); };
    }
  }, [token]);

  const markNotifAsRead = async (id) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/notifications/${id}/read`, {}, { headers });
      fetchNotifications();
    } catch (e) {}
  };

  const markAllNotifsAsRead = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/notifications/read-all`, {}, { headers });
      fetchNotifications();
    } catch (e) {}
  };

  const handleOpenTaskFromNotif = (message) => {
    const match = message.match(/#(\d+)/);
    if (match) {
      const ticketId = Number(match[1]);
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setShowNotificationsModal(false); // Fecha o modal de notificações
        changeTab('tasks'); // Muda para a aba de Tarefas
      } else {
        alert("A tarefa correspondente não foi encontrada ou não tens permissão para aceder.");
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

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

      try {
        const clientsRes = await axios.get(`${API_URL}/clients/`, { headers });
        setClients(clientsRes.data);
      } catch (e) { console.error(e); }

      fetchNotifications();
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/reports/export-csv`, {
        headers,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'relatorio_total_horas_utilizador.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Erro ao exportar relatório.');
    }
  };

  const handleOpenCreateUserModal = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('Member');
    setShowUserModal(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/users/`, {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      }, { headers });
      setShowUserModal(false);
      fetchData();
      alert('Utilizador criado com sucesso!');
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar utilizador.');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Tens a certeza que pretendes alterar o cargo para ${newRole}?`)) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/users/${userId}`, { role: newRole }, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao alterar o cargo.');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUserInfo.id) {
      alert('Não podes apagar a tua própria conta!');
      return;
    }
    if (!window.confirm("ATENÇÃO: Tens a certeza absoluta que pretendes apagar este utilizador?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/users/${userId}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar utilizador.');
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
    setProjectClientId('');
    setProjectTicketIds([]);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (proj) => {
    setEditProjectMode(true);
    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setProjectDesc(proj.description || '');
    setProjectTeamId(proj.team_id || '');
    setProjectClientId(proj.client_id || '');
    setShowProjectModal(true);

    const projTasks = tickets.filter(t => t.project_id === proj.id).map(t => t.id);
    setProjectTicketIds(projTasks); 
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

  const openProjectTasksModal = (proj) => {
    setActiveProjectForTasks(proj);
    setShowProjectTasksModal(true);
  };

  const openCompleteModal = (ticket) => {
    if (ticket.status === 'Done') return;
    setTicketToComplete(ticket);
    setFinalDesc('');
    setExtraTime(ticket.tracked_hours > 0 ? ticket.tracked_hours : (ticket.estimated_hours || ''));
    setCompletionFile(null);
    setShowCompleteModal(true);
  };

  // Função para gerar relatório automaticamente com o Gemini
  const handleGenerateAI = async () => {
    if (!ticketToComplete) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/tickets/${ticketToComplete.id}/generate-ai-report`, {}, { headers });
      setFinalDesc(res.data.generated_report);
    } catch (err) {
      alert('Erro ao gerar relatório automático com o Gemini.');
    }
  };

  // Função para buscar recomendação de foco inteligente da IA
  const fetchAiRecommendation = async () => {
    setLoadingAiRec(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/ai-focus-recommendation`, { headers });
      setAiRecommendation(res.data.recommendation);
    } catch (err) {
      setAiRecommendation('Não foi possível carregar a recomendação da IA neste momento.');
    } finally {
      setLoadingAiRec(false);
    }
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
        client_id: projectClientId ? Number(projectClientId) : null,
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
      setProjectClientId('');
      setProjectTicketIds([]);
      fetchData();
    } catch (err) {
      alert('Erro ao guardar projeto.');
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/clients/`, {
        name: clientName,
        email: clientEmail || null,
        company: clientCompany || null,
        phone: clientPhone || null
      }, { headers });
      setShowClientModal(false);
      setClientName('');
      setClientEmail('');
      setClientCompany('');
      setClientPhone('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar cliente.');
    }
  };

  const openEditClientModal = (client) => {
    setCurrentClientId(client.id);
    setEditClientName(client.name);
    setEditClientEmail(client.email || '');
    setEditClientCompany(client.company || '');
    setEditClientPhone(client.phone || '');
    setShowEditClientModal(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/clients/${currentClientId}`, {
        name: editClientName,
        email: editClientEmail || null,
        company: editClientCompany || null,
        phone: editClientPhone || null
      }, { headers });
      setShowEditClientModal(false);
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar cliente.');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!window.confirm("Tens a certeza que pretendes apagar este cliente?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/clients/${clientId}`, { headers });
      fetchData();
    } catch (err) {
      alert('Erro ao apagar cliente.');
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
    setNewStartDate('');
    setNewClientId('');
    setNewProjectId('');
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
    setNewStartDate(ticket.start_date ? ticket.start_date.split('T')[0] : '');
    setNewProjectId(ticket.project_id || '');
    setNewClientId(ticket.client_id || '');
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
        project_id: newProjectId ? Number(newProjectId) : null,
        client_id: newClientId ? Number(newClientId) : null,
        assigned_to_id: newAssignedTo ? Number(newAssignedTo) : null,
        estimated_hours: Number(newEstimatedHours),
        due_date: newDueDate ? newDueDate : null,
        start_date: newStartDate ? newStartDate : null
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
    const isTargetDone = newStat === 'Done' || newStat === 'Concluído' || newStat === 'Concluido';
    const ticket = tickets.find(t => t.id === ticketId);

    if (isTargetDone) {
      if (ticket && ticket.status === 'Done') return;
      if (ticket) {
        openCompleteModal(ticket);
        return;
      }
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      let updatePayload = { status: newStat };
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
    const ticketId = Number(e.dataTransfer.getData('text/plain'));
    const ticket = tickets.find(t => t.id === ticketId);
    const isTargetDone = targetStatus === 'Done';

    if (ticket && isTargetDone) {
      if (ticket.status === 'Done') return;
      openCompleteModal(ticket);
      return;
    }

    if (ticketId) {
      handleStatusChange(ticketId, targetStatus);
    }
  };

  const getPriorityBadgeStyle = (priority) => {
    switch (priority) {
      case 'Crítica': return 'bg-red-950/80 text-red-400 border-red-500/40';
      case 'Alta': return 'bg-orange-950/80 text-orange-400 border-orange-500/40';
      case 'Média': return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
      case 'Baixa': return 'bg-zinc-900 text-zinc-400 border-zinc-800';
      default: return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const getCalendarTicketStyle = (ticket) => {
    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
    if (isDone) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 line-through opacity-70';
    switch (ticket.priority) {
      case 'Crítica': return 'bg-red-950/40 border-red-500/30 text-red-300';
      case 'Alta': return 'bg-orange-950/40 border-orange-500/30 text-orange-300';
      case 'Média': return 'bg-amber-950/40 border-amber-500/30 text-amber-300';
      case 'Baixa': default: return 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100';
    }
  };

  const isAdmin = currentUserInfo.role === 'Admin';
  const isManagerOrAdmin = isAdmin || currentUserInfo.role === 'Manager';

  const availableTeams = isAdmin ? teams : teams.filter(t => t.members?.some(m => m.id === currentUserInfo.id) || t.owner_id === currentUserInfo.id);
  const availableTeamIds = availableTeams.map(t => t.id);
  const availableProjects = isAdmin ? projects : projects.filter(p => !p.team_id || availableTeamIds.includes(p.team_id));
  const availableProjectIds = availableProjects.map(p => p.id);
  const availableTickets = isAdmin ? tickets : tickets.filter(t => t.assigned_to_id === currentUserInfo.id || availableProjectIds.includes(t.project_id));

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const ganttMonthDays = Array.from({ length: daysInCurrentMonth }).map((_, i) => {
    const dayNum = i + 1;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return {
      dateStr: `${year}-${mm}-${dd}`,
      dayNum: dayNum
    };
  });

  const todayStr = getLocalDateString(new Date());

  const quickFilteredProjects = quickSearchQuery.trim() === '' ? [] : availableProjects.filter(p => 
    p.name.toLowerCase().includes(quickSearchQuery.toLowerCase()) || 
    (p.description && p.description.toLowerCase().includes(quickSearchQuery.toLowerCase()))
  ).slice(0, 4);

  const quickFilteredTickets = quickSearchQuery.trim() === '' ? [] : availableTickets.filter(t => 
    t.title.toLowerCase().includes(quickSearchQuery.toLowerCase()) || 
    (t.description && t.description.toLowerCase().includes(quickSearchQuery.toLowerCase()))
  ).slice(0, 5);

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

  const activeTasksList = availableTickets.filter(t => t.status && !['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));
  const doneTickets = availableTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));
  const overdueTickets = availableTickets.filter(t => t.due_date && t.due_date.split('T')[0] < todayStr && t.status && !['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()));

  const filteredTickets = availableTickets.filter(ticket => {
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
    if (sortBy === 'newest') return b.id - a.id;
    else if (sortBy === 'deadline') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    } else if (sortBy === 'priority') {
      const weights = { 'Crítica': 4, 'Alta': 3, 'Média': 2, 'Baixa': 1 };
      return (weights[b.priority] || 0) - (weights[a.priority] || 0);
    }
    return 0;
  });

  const filteredTeams = availableTeams.filter(team => team.name.toLowerCase().includes(teamSearch.toLowerCase()));

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
    if (!projectId) return 'Projeto Geral';
    const p = availableProjects.find(proj => proj.id === projectId);
    return p ? p.name : 'Projeto Geral';
  };

  const getClientName = (clientId) => {
    if (!clientId) return null;
    const c = clients.find(client => client.id === clientId);
    return c ? c.name : null;
  };

  // 1. Função para descobrir o nome
  const getLogUserName = (userId) => {
    if (!userId) return 'Sessão Não Iniciada'; // Mais preciso para os logins
    const user = usersList.find(u => u.id === userId);
    return user ? (user.name || user.email) : `Colaborador #${userId}`;
  };

  // 2. Função para traduzir as rotas (Agora com extração de IDs!)
  const translateLogAction = (action, details) => {
    if (!details) return { badge: action, text: 'Ação desconhecida' };
    
    const isSuccess = details.includes('Status: 20'); 
    const statusText = isSuccess ? '' : '(Falhou)';

    if (details.includes('/login')) return { badge: 'LOGIN', text: `Tentativa de login ${statusText}` };
    if (details.includes('/tickets/my-day')) return { badge: 'RELATÓRIO', text: `Atualizou o relatório diário ${statusText}` };
    
    // VERIFICA SE É UMA AÇÃO NAS TAREFAS
    if (details.includes('/tickets/')) {
      // Magia para extrair o ID da tarefa da Rota (Ex: /tickets/15 -> 15)
      const match = details.match(/\/tickets\/(\d+)/);
      const ticketId = match ? match[1] : '';
      const taskRef = ticketId ? `Tarefa #${ticketId}` : 'uma tarefa';

      if (details.includes('/complete')) return { badge: 'TAREFA', text: `Concluiu a ${taskRef} ${statusText}` };
      if (action === 'POST') return { badge: 'TAREFA', text: `Criou uma nova tarefa ${statusText}` };
      if (action === 'PUT') return { badge: 'TAREFA', text: `Modificou a ${taskRef} (Cronómetro/Estado/Edição) ${statusText}` };
      if (action === 'DELETE') return { badge: 'TAREFA', text: `Apagou a ${taskRef} ${statusText}` };
    }
    
    // VERIFICA SE É UMA AÇÃO NOS PROJETOS
    if (details.includes('/projects/')) {
      const match = details.match(/\/projects\/(\d+)/);
      const projId = match ? match[1] : '';
      const projRef = projId ? `Projeto #${projId}` : 'um projeto';

      if (action === 'POST') return { badge: 'PROJETO', text: `Criou um novo projeto ${statusText}` };
      if (action === 'PUT') return { badge: 'PROJETO', text: `Editou o ${projRef} ${statusText}` };
      if (action === 'DELETE') return { badge: 'PROJETO', text: `Apagou o ${projRef} ${statusText}` };
    }

    // VERIFICA SE É UMA AÇÃO NOS UTILIZADORES
    if (details.includes('/users/')) {
      if (action === 'POST') return { badge: 'COLABORADOR', text: `Registou um novo colaborador ${statusText}` };
      if (action === 'PUT') return { badge: 'COLABORADOR', text: `Editou permissões de um colaborador ${statusText}` };
      if (action === 'DELETE') return { badge: 'COLABORADOR', text: `Apagou um colaborador ${statusText}` };
    }
    
    const area = details.split(' |')[0].replace('Rota: ', '');
    return { badge: action, text: `Ação na área: ${area}` };
  };


  const kanbanColumns = [
    { id: 'To Do', title: 'A fazer', color: 'bg-zinc-500' },
    { id: 'In Progress', title: 'Em progresso', color: 'bg-blue-500' },
    { id: 'In Review', title: 'Em revisão', color: 'bg-amber-500' },
    { id: 'Done', title: 'Concluído', color: 'bg-emerald-500' }
  ];

  const getVisibleWorkers = () => {
    if (isAdmin) return activeWorkers;
    const colleagueIds = new Set();
    if (currentUserInfo.id) colleagueIds.add(currentUserInfo.id);
    availableTeams.forEach(t => t.members?.forEach(m => colleagueIds.add(m.id)));
    return activeWorkers.filter(w => colleagueIds.has(w.assigned_to_id));
  };

  const visibleWorkers = getVisibleWorkers();

  const periodLabels = { '7': 'na última semana', '30': 'no último mês', '180': 'nos últimos 6 meses' };
  let chartLabels = [];
  let tasksPerPeriod = [];
  let hoursPerPeriod = [];

  const safeNumber = (val) => { const n = Number(val); return isNaN(n) ? 0 : n; };

  if (statsPeriod === '7' || statsPeriod === '30') {
    const numDays = parseInt(statsPeriod) || 7;
    const daysArray = Array.from({length: numDays}).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (numDays - 1 - i));
      return getLocalDateString(d); 
    });
    tasksPerPeriod = daysArray.map(date => availableTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()) && t.due_date && t.due_date.startsWith(date)).length || 0);
    hoursPerPeriod = daysArray.map(date => availableTickets.filter(t => t.due_date && t.due_date.startsWith(date)).reduce((sum, t) => sum + safeNumber(t.tracked_hours), 0));
    chartLabels = daysArray.map(date => { const parts = date.split('-'); return `${parts[2]}/${parts[1]}`; });
  } else {
    const monthsArray = Array.from({length: 6}).map((_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i));
      const yyyy = d.getFullYear(); const mm = String(d.getMonth() + 1).padStart(2, '0');
      return `${yyyy}-${mm}`;
    });
    tasksPerPeriod = monthsArray.map(month => availableTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()) && t.due_date && t.due_date.startsWith(month)).length || 0);
    hoursPerPeriod = monthsArray.map(month => availableTickets.filter(t => t.due_date && t.due_date.startsWith(month)).reduce((sum, t) => sum + safeNumber(t.tracked_hours), 0));
    chartLabels = monthsArray.map(month => { const parts = month.split('-'); return `${parts[1]}/${parts[0].slice(2)}`; }); 
  }

  const maxTasks = Math.max(...(tasksPerPeriod.length ? tasksPerPeriod : [0]), 5); 
  const maxHours = Math.max(...(hoursPerPeriod.length ? hoursPerPeriod : [0]), 10);
  const totalTasksPeriod = tasksPerPeriod.reduce((sum, val) => sum + safeNumber(val), 0);
  const totalHoursPeriod = hoursPerPeriod.reduce((sum, val) => sum + safeNumber(val), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 shrink-0 h-screen sticky top-0 z-20">
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

          {isManagerOrAdmin && (
            <button onClick={() => changeTab('clients')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'clients' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
              <Building2 className="w-4 h-4" /> Clientes
            </button>
          )}

          <button onClick={() => changeTab('tasks')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'tasks' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <CheckCircle2 className="w-4 h-4" /> Tarefas
          </button>

          {/* NOVO BOTÃO "O MEU DIA" */}
          <button onClick={() => changeTab('my-day')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'my-day' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 border border-transparent'}`}>
            <Clock className="w-4 h-4" /> O Meu Dia
          </button>

          <button onClick={() => changeTab('teams')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'teams' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Users className="w-4 h-4" /> Equipas
          </button>

          <button onClick={() => changeTab('calendar')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'calendar' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Calendar className="w-4 h-4" /> Calendário
          </button>

          <button onClick={() => changeTab('statistics')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'statistics' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <BarChart3 className="w-4 h-4" /> Estatísticas
          </button>

          {isAdmin && (
            <button onClick={() => changeTab('admin')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition mt-4 border ${activeTab === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm' : 'border-transparent text-amber-500/70 hover:text-amber-400 hover:bg-amber-500/10'}`}>
              <ShieldAlert className="w-4 h-4" /> Administração
            </button>
          )}

          <div className="pt-4 mt-2 border-t border-zinc-800/80">
            <button onClick={() => changeTab('settings')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'settings' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
              <Settings className="w-4 h-4" /> Definições
            </button>
          </div>
        </nav>

        <div className="pt-4 border-t border-zinc-800">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        <header className="shrink-0 h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-8 flex items-center justify-between z-10 sticky top-0">
          <button
            onClick={() => setShowQuickSearch(true)}
            className="flex items-center gap-3 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-xl text-xs transition shadow-sm group w-72"
          >
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition" />
            <span className="flex-1 text-left truncate">Pesquisar tarefas ou projetos...</span>
            <kbd className="bg-zinc-950 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] font-mono">⌘K</kbd>
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotificationsModal(true)}
              className="relative p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl transition"
              title="Notificações"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 pb-16 relative">
          
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

          {activeTab === 'dashboard' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold tracking-tight">Dashboard & Gestão</h1>
                <button onClick={() => {fetchData(); fetchActiveWorkers();}} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 px-4 py-2 rounded-xl text-sm transition">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </button>
              </div>

              {/* CARTÃO DE RECOMENDAÇÃO INTELIGENTE DA IA */}
              <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-900 border border-purple-500/30 rounded-2xl p-6 mb-6 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">✨</div>
                    <h2 className="text-base font-semibold text-zinc-100">Foco Inteligente (Assistente IA)</h2>
                  </div>
                  <button
                    onClick={fetchAiRecommendation}
                    disabled={loadingAiRec}
                    className="flex items-center gap-1.5 text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl transition"
                  >
                    {loadingAiRec ? 'A analisar...' : '🧠 Onde devo focar-me hoje?'}
                  </button>
                </div>
                
                {aiRecommendation ? (
                  <div className="text-sm text-zinc-300 whitespace-pre-line bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 mt-3 leading-relaxed">
                    {aiRecommendation}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    Clica no botão acima para pedir ao Gemini para analisar as tuas prioridades e prazos atuais.
                  </p>
                )}
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
                      {isAdmin ? 'Visão global da empresa' : 'Colegas das tuas equipas'}
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
                      const isDone = ticket.status === 'Done';
                      const assignee = getAssigneeName(ticket.assigned_to_id);
                      const clientNameStr = getClientName(ticket.client_id);
                      return (
                        <div key={ticket.id} className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                              <h3 className="font-medium text-sm text-zinc-100">{ticket.title}</h3>
                              <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">📁 {getProjectName(ticket.project_id)}</span>
                              {clientNameStr && <span className="text-[10px] bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded text-blue-300">🏢 {clientNameStr}</span>}
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
                            {!isDone && (
                              <button onClick={() => openCompleteModal(ticket)} className="p-2 text-emerald-400 hover:text-emerald-300 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Concluir com Relatório">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
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

          {/* ADMINISTRAÇÃO */}
          {activeTab === 'admin' && isAdmin && (
            <div className="max-w-6xl mx-auto py-4 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> Painel de Administração
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1">Gestão global de utilizadores, acessos e relatórios do sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleExportCSV} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-medium text-xs px-4 py-2 rounded-xl transition shadow-sm">
                    <Download className="w-4 h-4 text-emerald-400" /> Exportar Relatório CSV
                  </button>
                  <button onClick={() => fetchData()} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={handleOpenCreateUserModal} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs px-4 py-2 rounded-xl hover:bg-amber-500/20 transition">
                    <UserCheck className="w-4 h-4" /> Criar Utilizador
                  </button>
                </div>
              </div>

              {/* TABELA DE UTILIZADORES (A que já tinhas) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
                  <h2 className="text-sm font-semibold text-zinc-200">Utilizadores do Sistema</h2>
                </div>
                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800/60 bg-zinc-950/40 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <div className="col-span-1">ID</div>
                  <div className="col-span-3">Nome</div>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Cargo</div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>

                <div className="divide-y divide-zinc-800/60">
                  {usersList.map(user => {
                    const isMe = user.id === currentUserInfo.id;
                    return (
                      <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-850/50 transition">
                        <div className="col-span-1 text-xs font-mono text-zinc-500">#{user.id}</div>
                        <div className="col-span-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.role === 'Admin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'}`}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <span className="text-sm font-medium text-zinc-200 truncate">{user.name || 'Sem nome'}</span>
                        </div>
                        <div className="col-span-4 text-sm text-zinc-400 truncate">{user.email}</div>
                        <div className="col-span-2">
                          <select 
                            value={user.role} 
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={isMe}
                            className={`w-full bg-zinc-950 border text-xs rounded-xl px-3 py-1.5 focus:outline-none transition ${user.role === 'Admin' ? 'border-amber-500/30 text-amber-400' : 'border-zinc-800 text-zinc-300'} ${isMe ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-zinc-600'}`}
                          >
                            <option value="Member">Member</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isMe}
                            className={`p-2 rounded-xl border transition flex items-center justify-center ${isMe ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-950 border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}
                            title={isMe ? "Não te podes apagar a ti próprio" : "Apagar utilizador"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SISTEMA DE LOGS (BIG BROTHER) - NOVO! */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl mt-6">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    🛡️ Registos do Sistema (Audit Logs)
                  </h2>
                  <button 
                    onClick={fetchAuditLogs}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition"
                  >
                    🔄 Atualizar
                  </button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data/Hora</th>
                        <th className="px-4 py-3 font-medium">User ID</th>
                        <th className="px-4 py-3 font-medium">Ação</th>
                        <th className="px-4 py-3 font-medium">Detalhes (Rota e Status)</th>
                      </tr>
                    </thead>
                                        <tbody className="divide-y divide-zinc-800/50">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => {
                          const translated = translateLogAction(log.action, log.details);
                          
                          return (
                            <tr key={log.id} className="hover:bg-zinc-800/20 transition">
                              {/* DATA */}
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400">
                                {new Date(log.created_at).toLocaleString('pt-PT')}
                              </td>
                              
                              {/* NOME DO UTILIZADOR */}
                              <td className="px-4 py-3">
                                <span className="bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-2 py-1 rounded text-xs font-medium">
                                  👤 {getLogUserName(log.user_id)}
                                </span>
                              </td>
                              
                              {/* BADGE DA AÇÃO */}
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                  translated.badge === 'LOGIN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                  log.action === 'DELETE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  log.action === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  log.action === 'PUT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                }`}>
                                  {translated.badge}
                                </span>
                              </td>
                              
                              {/* TEXTO HUMANO + DETALHE TÉCNICO */}
                              <td className="px-4 py-3 text-xs">
                                <span className="font-medium text-zinc-200">{translated.text}</span>
                                <span className="text-zinc-600 block mt-0.5 text-[10px] font-mono">
                                  {log.details}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center text-zinc-500">
                            Nenhum registo encontrado no sistema.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* CLIENTES */}
          {activeTab === 'clients' && isManagerOrAdmin && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Gestão de Clientes</h1>
                  <p className="text-xs text-zinc-400 mt-0.5">Consulte projetos, tarefas e informações de contacto dos clientes</p>
                </div>
                <button 
                  onClick={() => {
                    setClientName('');
                    setClientEmail('');
                    setClientCompany('');
                    setClientPhone('');
                    setShowClientModal(true);
                  }} 
                  className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition"
                >
                  <Plus className="w-4 h-4" /> Novo Cliente
                </button>
              </div>

              {clients.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                  Nenhum cliente registado no sistema.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {clients.map(client => {
                    const clientProjects = availableProjects.filter(p => p.client_id === client.id);
                    const clientTickets = availableTickets.filter(t => t.client_id === client.id);
                    return (
                      <div key={client.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between group hover:border-zinc-700 transition space-y-4">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div>
                                <h2 className="font-semibold text-base text-zinc-100">{client.name}</h2>
                                {client.company && <p className="text-xs text-zinc-400">{client.company}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditClientModal(client)} className="p-1.5 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-lg transition" title="Editar Cliente">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteClient(client.id)} className="p-1.5 bg-zinc-950 border border-zinc-800 text-red-400 hover:text-red-300 rounded-lg transition" title="Apagar Cliente">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 py-3 border-y border-zinc-800/60 text-xs text-zinc-400">
                            {client.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* LISTAGEM DE PROJETOS E TAREFAS ASSOCIADOS */}
                        <div className="space-y-3 pt-2">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Projetos ({clientProjects.length})</p>
                            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                              {clientProjects.length === 0 ? (
                                <p className="text-[11px] text-zinc-600 italic">Sem projetos associados.</p>
                              ) : (
                                clientProjects.map(p => (
                                  <div key={p.id} className="text-xs bg-zinc-950 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-zinc-300">
                                    <span className="truncate">📁 {p.name}</span>
                                    <button onClick={() => openProjectTasksModal(p)} className="text-[10px] text-blue-400 hover:underline shrink-0">Ver</button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Tarefas ({clientTickets.length})</p>
                            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                              {clientTickets.length === 0 ? (
                                <p className="text-[11px] text-zinc-600 italic">Sem tarefas associadas.</p>
                              ) : (
                                clientTickets.map(t => (
                                  <div key={t.id} className="text-xs bg-zinc-950 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg flex items-center justify-between text-zinc-300">
                                    <span className="truncate">✓ #{t.id} - {t.title}</span>
                                    <span className="text-[10px] text-zinc-500 shrink-0">{t.status}</span>
                                  </div>
                                ))
                              )}
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

          {/* PROJETOS */}
          {activeTab === 'projects' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold tracking-tight">Projetos</h1>
                <button onClick={handleOpenCreateProjectModal} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">
                  <FolderPlus className="w-4 h-4" /> Novo Projeto
                </button>
              </div>
              
              {availableProjects.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500 text-sm">
                  Nenhum projeto associado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableProjects.map(proj => {
                    const projTickets = availableTickets.filter(t => t.project_id === proj.id);
                    const total = projTickets.length;
                    const done = projTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase())).length;
                    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
                    const team = availableTeams.find(t => t.id === proj.team_id);
                    const clientNameStr = getClientName(proj.client_id);

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

                        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-400">
                            <Users className="w-3.5 h-3.5" />
                            <span className="truncate max-w-[120px]">{team ? team.name : 'Equipa Geral'}</span>
                          </div>
                          {clientNameStr && (
                            <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/30 px-2.5 py-1 rounded-md text-blue-300">
                              <Building2 className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px]">{clientNameStr}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 mb-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-zinc-400 font-medium">Progresso</span>
                            <span className="text-emerald-400 font-bold">{percent}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-2.5 overflow-hidden">
                            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${percent}%` }}></div>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 text-right">
                            {done} de {total} tarefas concluídas
                          </p>
                        </div>

                        <button 
                          onClick={() => openProjectTasksModal(proj)}
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
            <div className="flex flex-col h-full min-h-[calc(100vh-160px)]">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-end mb-6 shrink-0">
                <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
                  <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex items-center">
                    <button onClick={() => setTaskViewMode('kanban')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${taskViewMode === 'kanban' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                      <Kanban className="w-3.5 h-3.5" /> Kanban
                    </button>
                    <button onClick={() => setTaskViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${taskViewMode === 'list' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                      <ListFilter className="w-3.5 h-3.5" /> Lista
                    </button>
                  </div>

                  <button 
                    onClick={() => setShowGanttModal(true)} 
                    className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-850 px-3.5 py-2 rounded-xl text-xs font-medium transition shadow-sm"
                  >
                    <BarChart className="w-3.5 h-3.5 text-blue-400" /> Cronograma (Gantt)
                  </button>

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
                    {availableProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
                        className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 flex flex-col h-full min-h-[400px]"
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
                              const isDone = ticket.status === 'Done';
                              const assignee = getAssigneeName(ticket.assigned_to_id);
                              const clientNameStr = getClientName(ticket.client_id);
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
                                      {!isDone && (
                                        <button onClick={() => openCompleteModal(ticket)} title="Concluir com Relatório" className="p-1.5 bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300 rounded-md transition">
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}
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

                                  <div className="flex flex-wrap items-center justify-between text-[11px] pt-2 border-t border-zinc-900 gap-1">
                                    <span className="bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">📁 {getProjectName(ticket.project_id)}</span>
                                    {clientNameStr && <span className="bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">🏢 {clientNameStr}</span>}
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
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex-1 overflow-y-auto min-h-[400px]">
                  {sortedTickets.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 text-sm">Nenhuma tarefa encontrada.</div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {sortedTickets.map(ticket => {
                        const isRunning = activeTimerTask?.id === ticket.id;
                        const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                        const assignee = getAssigneeName(ticket.assigned_to_id);
                        const clientNameStr = getClientName(ticket.client_id);
                        return (
                          <div key={ticket.id} className={`p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${isDone ? 'bg-zinc-900/30 opacity-60' : 'hover:bg-zinc-850/50'}`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-zinc-500 font-mono">#{ticket.id}</span>
                                <h2 className={`font-medium text-sm ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>{ticket.title}</h2>
                                <span className="text-[10px] bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-400">📁 {getProjectName(ticket.project_id)}</span>
                                {clientNameStr && <span className="text-[10px] bg-blue-950/40 border border-blue-500/30 px-2 py-0.5 rounded text-blue-300">🏢 {clientNameStr}</span>}
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
                              {!isDone && (
                                <button onClick={() => openCompleteModal(ticket)} className="p-2 text-emerald-400 hover:text-emerald-300 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Concluir com Relatório">
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
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
                  Nenhuma equipa associada.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredTeams.map(team => {
                    const teamProjects = availableProjects.filter(p => p.team_id === team.id);
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

            const calendarFilteredTickets = availableTickets.filter(t => {
              if (!t.due_date) return false;
              if (calendarTeamFilter === 'all') return true;
              
              const teamProjIds = availableProjects.filter(p => p.team_id === Number(calendarTeamFilter)).map(p => p.id);
              return teamProjIds.includes(t.project_id);
            });

            const firstDayIndex = new Date(year, month, 1).getDay();
            const adjustedFirstDay = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
            const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
            const goToToday = () => setCurrentDate(new Date());

            const todayString = getLocalDateString(new Date());

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

                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex-1 flex flex-col shadow-xl min-h-[500px]">
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
                        <input type="text" value={settingsName} onChange={e => setSettingsName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" placeholder="O teu nome" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
                        <input type="email" value={settingsEmail} onChange={e => setSettingsEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" placeholder="teu.email@empresa.com" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Cargo</label>
                        <input type="text" value={currentUserInfo.role} disabled className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">ID de Colaborador</label>
                        <input type="text" value={`#${currentUserInfo.id}`} disabled className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 cursor-not-allowed" />
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

                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col">
                  <h2 className="text-base font-semibold text-zinc-100">Segurança</h2>
                  <p className="text-xs text-zinc-400 mb-6">Altere a sua senha de acesso</p>

                  <form onSubmit={handleUpdatePassword} className="space-y-4 flex-1 flex flex-col">
                    <div>
                      <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Senha atual</label>
                      <input type="password" value={settingsCurrentPassword} onChange={e => setSettingsCurrentPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" placeholder="Para confirmar a sua identidade" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Nova senha</label>
                        <input type="password" value={settingsNewPassword} onChange={e => setSettingsNewPassword(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" placeholder="Mínimo de 6 caracteres" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Confirmar senha</label>
                        <input type="password" value={settingsConfirmPassword} onChange={e => setSettingsConfirmPassword(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 transition" placeholder="Repita a nova senha" />
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

          {activeTab === 'statistics' && (
            <div className="max-w-7xl mx-auto py-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Estatísticas</h1>
                  <p className="text-xs text-zinc-400">Análise de produtividade e desempenho</p>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={statsPeriod} 
                    onChange={e => setStatsPeriod(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-xl px-3 py-2 focus:outline-none cursor-pointer hover:bg-zinc-850 transition"
                  >
                    <option value="7">Última semana</option>
                    <option value="30">Último mês</option>
                    <option value="180">Últimos 6 meses</option>
                  </select>
                  <button onClick={() => fetchData()} className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-zinc-700 transition">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider group-hover:text-zinc-300 transition">Tarefas Concluídas</h3>
                    <p className="text-3xl font-bold text-zinc-100">{totalTasksPeriod}</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{periodLabels[statsPeriod]}</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 border border-zinc-700/50"><CheckCircle2 className="w-6 h-6" /></div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between group hover:border-zinc-700 transition">
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider group-hover:text-zinc-300 transition">Horas Registadas</h3>
                    <p className="text-3xl font-bold text-zinc-100">{Number(totalHoursPeriod).toFixed(2)}h</p>
                    <p className="text-[10px] text-zinc-500 mt-1">{periodLabels[statsPeriod]}</p>
                  </div>
                  <div className="p-3 bg-zinc-800/50 rounded-xl text-zinc-400 border border-zinc-700/50"><Clock className="w-6 h-6" /></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col h-48">
                  <h3 className="text-sm font-semibold text-zinc-100">Tarefas Concluídas</h3>
                  <p className="text-[10px] text-zinc-400 mb-4">Evolução da produtividade ({periodLabels[statsPeriod]})</p>
                  
                  <div className="flex-1 flex flex-col relative w-full h-full">
                    <div className="flex-1 relative w-full flex items-end gap-1 z-10">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                        <div className="border-t border-dashed border-zinc-500 w-full h-0"></div>
                        <div className="border-t border-dashed border-zinc-500 w-full h-0"></div>
                        <div className="border-t border-solid border-zinc-500 w-full h-0"></div>
                      </div>
                      
                      {tasksPerPeriod.map((count, i) => {
                        const safeCount = Number(count) || 0;
                        const height = maxTasks > 0 ? (safeCount / maxTasks) * 100 : 0;
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end z-10 group h-full relative">
                            {safeCount > 0 && <span className="text-[10px] font-mono text-zinc-400 absolute -top-5 opacity-0 group-hover:opacity-100 transition">{safeCount}</span>}
                            <div className="w-full max-w-[12px] bg-blue-500 rounded-t-sm hover:bg-blue-400 transition-all duration-300" style={{ height: `${height}%`, minHeight: safeCount > 0 ? '2px' : '0' }}></div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="w-full flex items-end gap-1 mt-2">
                      {chartLabels.map((lbl, i) => {
                        const showLabel = statsPeriod !== '30' || i % 5 === 0 || i === chartLabels.length - 1;
                        return (
                          <div key={i} className="flex-1 flex justify-center">
                            <span className="text-[8px] text-zinc-600 truncate text-center w-full">{showLabel ? lbl : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col h-48">
                  <h3 className="text-sm font-semibold text-zinc-100">Horas Registadas</h3>
                  <p className="text-[10px] text-zinc-400 mb-4">Tempo de trabalho ({periodLabels[statsPeriod]})</p>

                  <div className="flex-1 flex flex-col relative w-full h-full">
                    <div className="flex-1 relative w-full z-10">
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 z-0">
                        <div className="border-t border-dashed border-zinc-500 w-full h-0"></div>
                        <div className="border-t border-dashed border-zinc-500 w-full h-0"></div>
                        <div className="border-t border-solid border-zinc-500 w-full h-0"></div>
                      </div>

                      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible z-10" preserveAspectRatio="none">
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={hoursPerPeriod.map((h, i) => {
                            const len = hoursPerPeriod.length || 1;
                            const x = ((i + 0.5) / len) * 100;
                            const safeH = Number(h) || 0;
                            const y = maxHours > 0 ? 100 - (safeH / maxHours) * 100 : 100;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </svg>
                    </div>

                    <div className="w-full flex items-end gap-1 mt-2">
                      {chartLabels.map((lbl, i) => {
                        const showLabel = statsPeriod !== '30' || i % 5 === 0 || i === chartLabels.length - 1;
                        return (
                          <div key={i} className="flex-1 flex justify-center">
                            <span className="text-[8px] text-zinc-600 truncate text-center w-full">{showLabel ? lbl : ''}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ============================================= */}
          {/* NOVO SEPARADOR: O MEU DIA (RELATÓRIO DIÁRIO)   */}
          {/* ============================================= */}
          {activeTab === 'my-day' && (
            <div className="max-w-4xl mx-auto py-4 space-y-6">
              
              {/* 1. TÍTULO DA PÁGINA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-blue-400 flex items-center gap-2">
                    <Clock className="w-5 h-5" /> Relatório Diário de Atividade
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1">Gere e submete o teu trabalho de hoje.</p>
                </div>
                {dailyReport && (
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border w-fit ${dailyReport.status === 'Submetido' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                    Estado: {dailyReport.status.toUpperCase()}
                  </div>
                )}
              </div>

              {/* 2. BARRA DOS ÚLTIMOS 7 DIAS */}
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 shadow-sm">
                <h2 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">O Teu Registo (Últimos 7 dias)</h2>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {weekStatus.map((day) => {
                    let bgColor = 'bg-zinc-950 border-zinc-800/50';
                    let textColor = 'text-zinc-500';
                    let icon = '➖';
                    
                    if (day.status === 'Submetido') { 
                      bgColor = 'bg-emerald-500/10 border-emerald-500/30'; textColor = 'text-emerald-400'; icon = '✔️'; 
                    } else if (day.status === 'Rascunho') { 
                      bgColor = 'bg-amber-500/10 border-amber-500/30'; textColor = 'text-amber-400'; icon = '📝'; 
                    } else if (day.status === 'Em falta') { 
                      bgColor = 'bg-red-500/10 border-red-500/30'; textColor = 'text-red-400'; icon = '✖️'; 
                    }

                    const isToday = day.date === new Date().toISOString().split('T')[0];

                    return (
                      <div key={day.date} className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-2 px-1 rounded-xl border ${bgColor} ${isToday ? 'ring-1 ring-blue-500/50 shadow-md' : ''}`}>
                        <span className={`text-[10px] font-medium uppercase ${textColor}`}>{day.day_name}</span>
                        <span className={`text-lg font-bold ${textColor}`}>{day.day_num}</span>
                        <span className="text-[10px] mt-1" title={day.status}>{icon}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LISTA DE TAREFAS DE HOJE */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <h2 className="text-sm font-semibold text-zinc-100 mb-4 border-b border-zinc-800 pb-2">Tarefas em que trabalhaste hoje</h2>
                
                {todayTickets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    Ainda não registaste tempo em nenhuma tarefa hoje.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayTickets.map(t => (
                      <div key={t.id} className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-zinc-500">#{t.id}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${t.status === 'Done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {t.status}
                            </span>
                          </div>
                          <h3 className="text-sm font-medium text-zinc-200">{t.title}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Tempo Hoje</p>
                          <p className="text-lg font-bold text-blue-400">{t.hours_today}h</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* DADOS EXTRAS E IA */}
              {/* DADOS EXTRAS E IA */}
              {dailyReport && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Quilómetros (Kms)</label>
                      <input 
                        type="number" 
                        value={dailyReport.kilometers || ''} 
                        onChange={e => setDailyReport({...dailyReport, kilometers: e.target.value})}
                        disabled={dailyReport.status === 'Submetido'}
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none transition ${dailyReport.status === 'Submetido' ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Ex: 45" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Horas Extraordinárias</label>
                      <input 
                        type="number" 
                        step="0.5"
                        value={dailyReport.overtime_hours || ''} 
                        onChange={e => setDailyReport({...dailyReport, overtime_hours: e.target.value})}
                        disabled={dailyReport.status === 'Submetido'}
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none transition ${dailyReport.status === 'Submetido' ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Ex: 1.5" 
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-zinc-100">Resumo Profissional</h2>
                      <button 
                        onClick={generateDailyReportIA}
                        disabled={generatingDaily || dailyReport?.status === 'Submetido'}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm ${generatingDaily || dailyReport?.status === 'Submetido' ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}
                      >
                        {generatingDaily ? '✨ A analisar dia...' : '✨ Gerar Resumo do Dia'}
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Resumo Curto</label>
                        <textarea 
                          value={dailyReport.summary || ''} 
                          onChange={e => setDailyReport({...dailyReport, summary: e.target.value})}
                          disabled={dailyReport.status === 'Submetido'}
                          rows="2" 
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${dailyReport.status === 'Submetido' ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                          placeholder="Clica no botão ✨ acima para a IA redigir por ti..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Relatório Detalhado</label>
                        <textarea 
                          value={dailyReport.detailed_report || ''} 
                          onChange={e => setDailyReport({...dailyReport, detailed_report: e.target.value})}
                          disabled={dailyReport.status === 'Submetido'}
                          rows="5" 
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${dailyReport.status === 'Submetido' ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                          placeholder="Descrição de todas as intervenções e estado atual..." 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    {dailyReport.status === 'Submetido' ? (
                      <button 
                        onClick={reopenDailyReport}
                        className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium text-sm px-6 py-2.5 rounded-xl transition shadow-sm"
                      >
                        ✏️ Editar Relatório
                      </button>
                    ) : (
                      <button 
                        onClick={submitDailyReport}
                        className="bg-blue-600 text-white font-medium text-sm px-6 py-2.5 rounded-xl hover:bg-blue-500 transition shadow-md"
                      >
                        Submeter Relatório de Hoje
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* MODAL DE TAREFAS DO PROJETO */}
      {showProjectTasksModal && activeProjectForTasks && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowProjectTasksModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Tarefas do Projeto: {activeProjectForTasks.name}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Visão geral de todas as tarefas (ativas e concluídas)</p>
              </div>
              <button onClick={() => setShowProjectTasksModal(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {availableTickets.filter(t => t.project_id === activeProjectForTasks.id).length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma tarefa associada a este projeto.
                </div>
              ) : (
                availableTickets
                  .filter(t => t.project_id === activeProjectForTasks.id)
                  .map(ticket => {
                    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                    const assignee = getAssigneeName(ticket.assigned_to_id);
                    return (
                      <div key={ticket.id} className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs transition ${isDone ? 'bg-zinc-950/40 border-zinc-900 opacity-60' : 'bg-zinc-950 border-zinc-800/80 shadow-sm'}`}>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 font-mono">#{ticket.id}</span>
                            <span className={`font-medium truncate ${isDone ? 'line-through text-zinc-400' : 'text-zinc-100'}`}>{ticket.title}</span>
                            {ticket.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-400 truncate pl-6">{ticket.description || 'Sem descrição'}</p>
                          <div className="flex items-center gap-4 text-[11px] text-zinc-500 pl-6 pt-1">
                            <span>Estado: <strong className={isDone ? 'text-emerald-400' : 'text-blue-400'}>{ticket.status}</strong></span>
                            {assignee && <span>👤 {assignee}</span>}
                            {ticket.due_date && <span>📅 {ticket.due_date.split('T')[0]}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONCLUSÃO DE TAREFA */}
      {showCompleteModal && ticketToComplete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Concluir Tarefa</h2>
                  <p className="text-xs text-zinc-400 truncate max-w-[300px]">{ticketToComplete.title}</p>
                </div>
              </div>
              <button onClick={() => setShowCompleteModal(false)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (finalDesc.length < 10) {
                alert('A descrição final deve ter pelo menos 10 caracteres.');
                return;
              }
              try {
                const formData = new FormData();
                formData.append('final_description', finalDesc);
                formData.append('tracked_hours', extraTime ? Number(extraTime) : 0);
                if (completionFile) {
                  formData.append('file', completionFile);
                }

                const headers = { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'multipart/form-data'
                };

                await axios.put(`${API_URL}/tickets/${ticketToComplete.id}/complete`, formData, { headers });
                setShowCompleteModal(false);
                setFinalDesc('');
                setExtraTime('');
                setCompletionFile(null);
                fetchData();
              } catch (err) {
                alert('Erro ao concluir tarefa.');
              }
            }} className="space-y-4">
              
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Descrição Final <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    className="flex items-center gap-1.5 text-[11px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-lg transition"
                  >
                    ✨ Gerar com IA
                  </button>
                </div>
                <textarea 
                  value={finalDesc}
                  onChange={e => setFinalDesc(e.target.value)}
                  rows="4"
                  maxLength="500"
                  required
                  placeholder="Clica em 'Gerar com IA' ou descreve o trabalho realizado..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700 resize-none"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-zinc-500">
                  <span>{finalDesc.length}/500 caracteres (mínimo 10)</span>
                  {finalDesc.length < 10 && <span className="text-amber-400">Mínimo não atingido</span>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tempo Gasto Total</label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 text-zinc-500 absolute left-3.5" />
                  <input 
                    type="number"
                    step="0.25"
                    value={extraTime}
                    onChange={e => setExtraTime(e.target.value)}
                    placeholder="Ex: 16"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-16 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-700"
                  />
                  <span className="absolute right-3.5 text-xs text-zinc-500 font-medium">horas</span>
                </div>
                {ticketToComplete?.estimated_hours > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Estimativa inicial: <strong className="text-zinc-400">{ticketToComplete.estimated_hours}h</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Estado</label>
                <select disabled className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-emerald-400 font-medium cursor-not-allowed">
                  <option>Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Anexos / Fotografias</label>
                <label className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition group">
                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:text-zinc-200 rounded-xl mb-2 transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-zinc-300">
                    {completionFile ? completionFile.name : 'Arrastar ficheiro ou clicar para selecionar'}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Suporta imagens, documentos e relatórios</span>
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setCompletionFile(e.target.files[0]);
                      }
                    }} 
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setShowCompleteModal(false)} 
                  className="px-4 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="bg-zinc-100 text-zinc-950 font-medium text-sm px-5 py-2.5 rounded-xl hover:bg-white transition shadow-sm"
                >
                  Concluir Tarefa
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL GANTT */}
      {showGanttModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fadeIn" onClick={() => setShowGanttModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-6xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl"><BarChart className="w-4 h-4" /></div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100">Cronograma do Mês (Gantt View)</h2>
                  <p className="text-xs text-zinc-400">Distribuição temporal e duração das tarefas</p>
                </div>
              </div>
              <button onClick={() => setShowGanttModal(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto pr-1">
              {sortedTickets.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-500">Nenhuma tarefa encontrada para exibir no cronograma.</div>
              ) : (
                <div className="min-w-[1200px]">
                  <div className="flex pb-2.5 border-b border-zinc-800 bg-zinc-950/60 rounded-xl px-3 mb-3 items-center">
                    <div className="w-64 shrink-0 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tarefa</div>
                    <div className="flex flex-1 gap-1">
                      {ganttMonthDays.map((dayObj, i) => {
                        const isToday = dayObj.dateStr === todayStr;
                        return (
                          <div key={i} className={`w-8 shrink-0 text-center text-[10px] font-mono py-1 rounded-lg ${isToday ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-zinc-500'}`}>
                            {dayObj.dayNum}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sortedTickets.map(ticket => {
                      const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                      const startDate = ticket.start_date ? ticket.start_date.split('T')[0] : (ticket.due_date ? ticket.due_date.split('T')[0] : null);
                      const dueDate = ticket.due_date ? ticket.due_date.split('T')[0] : startDate;

                      return (
                        <div key={ticket.id} className="flex items-center bg-zinc-950/70 border border-zinc-850 hover:border-zinc-700 p-2.5 rounded-xl transition">
                          <div className="w-64 shrink-0 pr-3 min-w-0">
                            <p className="text-xs font-medium text-zinc-200 truncate" title={ticket.title}>#{ticket.id} - {ticket.title}</p>
                            <p className="text-[10px] text-zinc-500 truncate">📁 {getProjectName(ticket.project_id)}</p>
                          </div>

                          <div className="flex flex-1 gap-1 items-center relative">
                            {ganttMonthDays.map((dayObj, i) => {
                              const inRange = startDate && dueDate && dayObj.dateStr >= startDate && dayObj.dateStr <= dueDate;
                              const isStart = dayObj.dateStr === startDate;
                              const isEnd = dayObj.dateStr === dueDate;

                              return (
                                <div key={i} className="w-8 shrink-0 h-8 border-r border-zinc-900/40 flex items-center justify-center relative">
                                  {inRange && (
                                    <div 
                                      title={`De ${startDate} até ${dueDate}: ${ticket.title}`}
                                      className={`absolute inset-y-1 h-5 rounded-md flex items-center justify-center text-[9px] font-bold px-1 truncate shadow-sm z-10 ${
                                        isDone ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                      } ${isStart ? 'left-0 rounded-l-md' : '-left-1'} ${isEnd ? 'right-0 rounded-r-md' : '-right-1'}`}
                                    >
                                      {isStart && `#${ticket.id}`}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL / OVERLAY DA PESQUISA RÁPIDA (SPOTLIGHT / CMD+K) */}
      {showQuickSearch && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-28 px-4 z-50 animate-fadeIn" onClick={() => setShowQuickSearch(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 py-3.5 border-b border-zinc-800 gap-3 bg-zinc-950/50">
              <Search className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Procurar projetos ou tarefas..."
                value={quickSearchQuery}
                onChange={e => setQuickSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 focus:outline-none placeholder-zinc-500"
              />
              <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded shrink-0">ESC para fechar</span>
            </div>

            <div className="max-h-96 overflow-y-auto p-3 space-y-4">
              {quickSearchQuery.trim() === '' ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  Começa a escrever para pesquisar nas tuas tarefas e projetos atribuídos...
                </div>
              ) : quickFilteredProjects.length === 0 && quickFilteredTickets.length === 0 ? (
                <div className="py-10 text-center text-xs text-zinc-500">
                  Nenhum resultado encontrado para "{quickSearchQuery}".
                </div>
              ) : (
                <>
                  {quickFilteredProjects.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-1.5">Projetos</p>
                      <div className="space-y-1">
                        {quickFilteredProjects.map(proj => (
                          <div
                            key={proj.id}
                            onClick={() => {
                              setShowQuickSearch(false);
                              // goToProjectTasks(proj.id); // se tiveres essa função, descomenta
                            }}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg group-hover:bg-blue-500/20 transition">
                                <Folder className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-200 truncate">{proj.name}</p>
                                <p className="text-xs text-zinc-500 truncate">{proj.description || 'Sem descrição'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium bg-zinc-950 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg shrink-0">Ver tarefas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickFilteredTickets.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-1.5 mt-3">Tarefas</p>
                      <div className="space-y-1">
                        {quickFilteredTickets.map(ticket => (
                          <div
                            key={ticket.id}
                            onClick={() => {
                              setShowQuickSearch(false);
                              openComments(ticket);
                            }}
                            className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-zinc-800 text-zinc-300 border border-zinc-700/50 rounded-lg group-hover:bg-zinc-750 transition">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-zinc-500">#{ticket.id}</span>
                                  <p className="text-sm font-medium text-zinc-200 truncate">{ticket.title}</p>
                                </div>
                                <p className="text-xs text-zinc-500 truncate">📁 {getProjectName(ticket.project_id)} • {ticket.status}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium bg-zinc-950 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg shrink-0">Detalhes</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between text-[11px] text-zinc-500">
              <span>Navegação rápida segura por função</span>
              <span className="font-mono">FlowPulse Spotlight</span>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP / MODAL NOTIFICAÇÕES */}
      {showNotificationsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-semibold text-zinc-100">Notificações</h2>
                <p className="text-xs text-zinc-400 mt-0.5">O que se passa nos teus projetos</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllNotifsAsRead} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition" title="Marcar todas como lidas">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setShowNotificationsModal(false)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition">Fechar</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center">
                  <Bell className="w-6 h-6 mb-2 opacity-50" />
                  Tudo limpo! Nenhuma notificação.
                </div>
              ) : (
                notifications.map(n => {
                  const hasTaskRef = /#\d+/.test(n.message);

                  return (
                    <div key={n.id} className={`p-4 rounded-xl flex items-start justify-between gap-3.5 transition ${n.is_read ? 'bg-zinc-900/50 opacity-70' : 'bg-zinc-950 border border-zinc-800/80 shadow-sm'}`}>
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${n.is_read ? 'bg-zinc-700' : 'bg-red-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${n.is_read ? 'text-zinc-400 font-normal' : 'text-zinc-100 font-medium'}`}>{n.message}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider font-mono">
                            {new Date(n.created_at).toLocaleString('pt-PT')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasTaskRef && (
                          <button 
                            onClick={() => handleOpenTaskFromNotif(n.message)}
                            className="px-2.5 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-medium rounded-lg transition flex items-center gap-1"
                            title="Abrir Tarefa"
                          >
                            🔍 Ver Tarefa
                          </button>
                        )}

                        {!n.is_read && (
                          <button onClick={() => markNotifAsRead(n.id)} className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-medium rounded-lg transition">
                            Ler
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO DE UTILIZADOR */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Novo Utilizador</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome Completo</label>
                <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Cargo</label>
                <select value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none">
                  <option value="Member">Member (Acesso Base)</option>
                  <option value="Manager">Manager (Gestor de Equipas)</option>
                  <option value="Admin">Admin (Acesso Total)</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-amber-500 text-amber-950 font-bold text-sm px-4 py-2 rounded-xl hover:bg-amber-400 transition">Registar Utilizador</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAÇÃO DE CLIENTE */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Novo Cliente</h2>
            <form onSubmit={handleSaveClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome / Designação</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Empresa</label>
                <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Telefone</label>
                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowClientModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR CLIENTE */}
      {showEditClientModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Editar Cliente</h2>
            <form onSubmit={handleUpdateClient} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome / Designação</label>
                <input type="text" value={editClientName} onChange={e => setEditClientName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Empresa</label>
                <input type="text" value={editClientCompany} onChange={e => setEditClientCompany(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Telefone</label>
                <input type="text" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowEditClientModal(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100 transition">Cancelar</button>
                <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition">Guardar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OUTROS MODAIS */}
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
              {availableTickets.filter(t => t.due_date && t.due_date.split('T')[0] === selectedCalendarDate).length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma tarefa agendada para este dia.
                </div>
              ) : (
                availableTickets
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
                          <button onClick={() => { setSelectedCalendarDate(null); openComments(ticket); }} className="text-xs font-medium text-blue-400 hover:underline">
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
                  <select value={newProjectId} onChange={e => setNewProjectId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Nenhum (Projeto Geral)</option>
                    {availableProjects.map(proj => <option key={proj.id} value={proj.id}>{proj.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cliente</label>
                  <select value={newClientId} onChange={e => setNewClientId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Nenhum</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Atribuir a</label>
                  <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Não atribuído</option>
                    {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Horas Estimadas</label>
                  <input type="number" step="0.5" value={newEstimatedHours} onChange={e => setNewEstimatedHours(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data de Início</label>
                  <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data Limite</label>
                  <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none [color-scheme:dark]" />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Equipa Responsável</label>
                  <select value={projectTeamId} onChange={e => setProjectTeamId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Nenhuma (Geral)</option>
                    {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cliente</label>
                  <select value={projectClientId} onChange={e => setProjectClientId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Nenhum</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Tarefas Associadas</label>
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {availableTickets.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center">Nenhuma tarefa disponível para associar.</p>
                  ) : (
                    availableTickets.map(ticket => {
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
                  {availableProjects.map(proj => {
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