import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  CheckCircle2, Clock, AlertCircle, Plus, Search, 
  LogOut, ShieldAlert, LayoutDashboard, Ticket as TicketIcon, Trash2, Edit3, Play, Pause, Hand, Square, MessageSquare, FolderPlus, RefreshCw, Calendar, Users, Crown, Folder, UserCheck, Kanban, ListFilter, ArrowUpDown, ChevronLeft, ChevronRight, Settings, BarChart3, Bell, Check, Download, Building2, Phone, Mail, BarChart, X, Upload, Paperclip, Star 
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000'; 

// FORMATADOR UNIVERSAL DE HORAS DECIMAIS -> HH:MM
const formatToHHMM = (hoursFloat) => {
  const num = Number(hoursFloat);
  if (isNaN(num) || num <= 0) return "00:00";
  const totalMinutes = Math.round(num * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Lista centralizada de cargos disponíveis na aplicação
const ROLES_LIST = [
  { value: "Admin", label: "Administrador", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  { value: "Gestor de Operações", label: "Gestor de Operações", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  { value: "Gestor de Projeto", label: "Gestor de Projeto", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { value: "Líder de Equipa", label: "Líder de Equipa", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "Técnico", label: "Técnico / Colaborador", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" }
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'dashboard');
  const [taskViewMode, setTaskViewMode] = useState('kanban'); // 'kanban', 'list'
  const [showGanttModal, setShowGanttModal] = useState(false);
  // Controla a abertura do menu/sidebar em modo gaveta no telemóvel
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- NOVOS ESTADOS PARA O RELATÓRIO DIÁRIO ---
  const [dailyReport, setDailyReport] = useState(null);
  const [todayTickets, setTodayTickets] = useState([]);
  const [generatingDaily, setGeneratingDaily] = useState(false);
  const [weekStatus, setWeekStatus] = useState([]);
  // Começa com a data de hoje por defeito
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  // Só dá para editar se for Rascunho (que inclui os novos e os Recusados)
  const canEdit = dailyReport && dailyReport.status === 'Rascunho';
  // Fotografia anexada ao relatório
  const [imagem, setImagem] = useState(null);
  // Modal de detalhes da tarefa concluída
  const [selectedTicketDetails, setSelectedTicketDetails] = useState(null);
  const [ticketHistoryLogs, setTicketHistoryLogs] = useState([]);
  // Histórico da tarefa no modal de edição
  const [ticketLogs, setTicketLogs] = useState([]);
  // Filtros de data para os logs da tarefa no modal
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  // Modal dedicado de histórico/logs de auditoria da tarefa
  const [showTaskLogsModal, setShowTaskLogsModal] = useState(false);
  const [selectedTaskForLogs, setSelectedTaskForLogs] = useState(null);
  // Controla a abertura da dropdown personalizada de Tipo de Tarefa
  const [isTaskTypeDropdownOpen, setIsTaskTypeDropdownOpen] = useState(false);

  // Função para ir buscar o relatório do dia selecionado
  const fetchDailyReport = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/my-day/today?target_date=${selectedDate}`, { headers });
      setDailyReport(res.data.report);
      setTodayTickets(res.data.tickets_worked);
    } catch (err) {
      console.error("Erro ao carregar o dia:", err);
    }
  };

  // --- Exportação de Relatório via Backend (PDF / Word) ---
  const exportarRelatorio = async (formato) => {
    try {
      const endpoint = formato === 'pdf' ? 'export-pdf' : 'export-word';
      
      const response = await axios.get(`${API_URL}/tickets/my-day/${endpoint}?target_date=${selectedDate}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      // Se o backend mandar um JSON de erro por engano mas vier como blob, vamos ler para ver o que diz
      if (response.data.type === 'application/json' || response.data.size < 200) {
        const text = await response.data.text();
        console.error("Erro do Backend:", text);
        alert("Erro do Servidor: " + text);
        return;
      }

      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      
      const extensao = formato === 'pdf' ? 'pdf' : 'docx';
      link.download = `Relatorio_${selectedDate}.${extensao}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro completo ao exportar:", error);
      // Vamos tentar ler o erro real se vier do servidor
      if (error.response && error.response.data) {
        const errorText = await error.response.data.text();
        console.error("Detalhe do erro:", errorText);
        alert("Erro no servidor: " + errorText);
      } else {
        alert("Erro ao descarregar o relatório. Abre a consola do browser (F12) para ver o erro técnico.");
      }
    }
  };

  const exportDailyReportPDF = (reportData, ticketsList) => {
  console.log("A tentar gerar PDF...", { reportData, ticketsList });

  try {
    if (!ticketsList || ticketsList.length === 0) {
      alert("Não tens tarefas registadas para hoje para exportar no PDF!");
      return;
    }

    const doc = new jsPDF();
    const todayStr = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    doc.setFontSize(14);
    doc.text(`Data: ${reportData?.date || todayStr}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${nowStr}`, 14, 26);

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Registos de Trabalho", 14, 38);

    const tableRows = ticketsList.map(t => [
      t.id,
      t.title,
      t.start_time || reportData?.date || '-',
      t.end_time || '-',
      `${t.hours_today || 0}h`
    ]);

    doc.autoTable({
      startY: 44,
      head: [['ID', 'TAREFA', 'INICIO', 'FIM', 'DURACAO']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    const totalHours = ticketsList.reduce((acc, t) => acc + (t.hours_today || 0), 0);
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Total concluido: ${totalHours.toFixed(2)}h`, 14, finalY);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(`${ticketsList.length} registos`, 14, finalY + 10);
    doc.text(`${totalHours.toFixed(2)}h registadas`, 14, finalY + 15);

    doc.save(`registos_trabalho_${todayStr}.pdf`);
    console.log("PDF gerado com sucesso!");
  } catch (err) {
    console.error("Erro crítico ao gerar o PDF:", err);
    alert("Ocorreu um erro ao gerar o PDF. Abre a consola (F12) para ver os detalhes.");
  }
};

  const fetchAdminUsersReports = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // ⚠️ Corrigido para incluir /tickets/ no caminho:
      const res = await axios.get(`${API_URL}/tickets/admin/reports/users-status`, { headers });
      setAdminUsersReports(res.data);
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
    }
  };

  // A função que os botões de atualizar vão chamar
  const handleRefresh = async () => {
    setIsRefreshing(true); // Liga a animação

    try {
      await fetchAdminUsersReports();
    } catch (error) {
      console.error("Erro ao atualizar:", error);
    } finally {
      // Desliga a animação (com um delay de meio segundo para o utilizador ver o botão a rodar)
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // --- ADMIN: Validar / Recusar um relatório de um colaborador ---
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      let reason = null;

      if (newStatus === 'Recusado') {
        reason = window.prompt("Qual o motivo da recusa? (O técnico vai ver isto)");

        // Se o admin cancelar o prompt, não fazemos o pedido
        if (reason === null) return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      // Atenção ao /tickets aqui no início do caminho:
      await axios.put(`${API_URL}/tickets/admin/reports/${reportId}/status`, {
        status: newStatus,
        rejection_reason: reason
      }, { headers });
      alert(`Relatório alterado com sucesso!`);
      fetchAdminUsersReports(); // Atualiza a lista na hora
    } catch (err) {
      console.error("Erro ao atualizar estado:", err);
      alert("Erro ao alterar o estado do relatório.");
    }
  };

 const exportAdminReportPDF = (report, userName) => {
  try {
    const doc = new jsPDF();
    const reportDate = report.date || new Date().toISOString().split('T')[0];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(`Data: ${reportDate}`, 14, 15);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Gerado em ${nowStr}`, 14, 21);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text("Registos de Trabalho", 14, 32);
    doc.setFontSize(10);
    doc.text(`Colaborador: ${userName || 'Desconhecido'}`, 14, 38);

    const userTickets = (report.tickets && report.tickets.length > 0) ? report.tickets : [
      { 
        id: report.id || '1', 
        title: report.summary || 'Atividade Operacional Geral', 
        start_date: reportDate, 
        due_date: reportDate, 
        hours_today: report.overtime_hours ?? 1.0 
      }
    ];

    const tableRows = userTickets.map(t => [
      t.id ?? '-',
      t.title ?? t.name ?? 'Intervenção técnica',
      t.start_date ?? reportDate,
      t.due_date ?? reportDate,
      `${t.hours_today ?? 0}h`
    ]);

    // O comando final que desenha a tabela (usa o import da linha 1)
    autoTable(doc, {
      startY: 44,
      head: [['ID', 'TAREFA', 'INICIO', 'FIM', 'DURACAO']],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [24, 24, 27], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 60;
    const totalDuration = userTickets.reduce((acc, t) => acc + (Number(t.hours_today) || 0), 0);

    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0);
    doc.text(`Total concluido: ${totalDuration.toFixed(2)}h`, 14, finalY);

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(`${userTickets.length} registos`, 14, finalY + 8);
    doc.text(`${totalDuration.toFixed(2)}h registadas`, 14, finalY + 13);
    doc.text(`Quilómetros: ${report.kilometers || 0} km`, 14, finalY + 18);

    const safeName = (userName || 'utilizador').replace(/\s+/g, '_');
    doc.save(`registos_trabalho_${safeName}_${reportDate}.pdf`);
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    alert("Erro ao gerar o PDF. Vê a consola (F12).");
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
      const formData = new FormData();
      formData.append("summary", dailyReport.summary || "");
      formData.append("detailed_report", dailyReport.detailed_report || "");
      formData.append("kilometers", Number(dailyReport.kilometers || 0));
      formData.append("overtime_hours", Number(dailyReport.overtime_hours || 0));
      formData.append("pending_work", dailyReport.pending_work || "");
      formData.append("observations", dailyReport.observations || "");
      formData.append("materials_used", dailyReport.materials_used || "");

      if (imagem) {
        formData.append("file", imagem);
      }

      // No Axios, quando enviamos FormData, não podemos meter o 'Content-Type': 'application/json'
      // Por isso enviamos só a Authorization e o Axios resolve o resto sozinho
      const headers = { Authorization: `Bearer ${token}` };

      await axios.put(`${API_URL}/tickets/my-day/today?target_date=${selectedDate}`, formData, { headers });
      
      alert("Relatório Diário Submetido com Sucesso! Excelente trabalho hoje.");
      setImagem(null);
      fetchDailyReport(); 
    } catch (err) {
      console.error("Erro ao submeter:", err);
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
      fetchAdminUsersReports();
    }
    if (activeTab === 'aprovacoes' && token) {
      fetchAdminUsersReports();
    }
  }, [activeTab, token]);

  // Recarrega o relatório sempre que o utilizador clica noutro dia
  useEffect(() => {
    if (activeTab === 'my-day' && token) {
      fetchDailyReport();
    }
  }, [selectedDate]);

  // Estados para o Modal de Tarefas do Projeto
  const [showProjectTasksModal, setShowProjectTasksModal] = useState(false);
  const [activeProjectForTasks, setActiveProjectForTasks] = useState(null);
  const [projectModalTickets, setProjectModalTickets] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Estados para o Modal de Tarefas da Equipa
  const [showTeamTasksModal, setShowTeamTasksModal] = useState(false);
  const [activeTeamForTasks, setActiveTeamForTasks] = useState(null);

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

  // --- ESTADOS DO CHAT ---
  const [chatRooms, setChatRooms] = useState([]);
  const [activeChatRoom, setActiveChatRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [showNewChatList, setShowNewChatList] = useState(false);
  const [showNewChatView, setShowNewChatView] = useState(false);
  const [selectedUserIdsForNewChat, setSelectedUserIdsForNewChat] = useState([]);
  const [groupChatName, setGroupChatName] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [chatSummary, setChatSummary] = useState(null);
  const [loadingAiChat, setLoadingAiChat] = useState(false);
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const chatWsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // --- NOVOS ESTADOS DO CHAT POR PROJETO ---
  const [chatContext, setChatContext] = useState('direct'); // 'direct' ou 'project'
  const [selectedChatProjectId, setSelectedChatProjectId] = useState('');
  const [newChatProjectId, setNewChatProjectId] = useState('');

  // Estados da Barra de Pesquisa Rápida (Spotlight / Cmd+K)
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  
  const [adminUsersReports, setAdminUsersReports] = useState([]);
  const [selectedAdminUser, setSelectedAdminUser] = useState(null);
  // Controla qual o dia que estamos a inspecionar no Dashboard (começa hoje)
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  // O estado que controla se a animação está a rodar
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Estados dos Filtros de Relatórios (Admin)
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterStatus, setFilterStatus] = useState("");
  // Filtro por dia específico na lista de relatórios do colaborador selecionado (vazio = mostra todos)
  const [selectedApprovalDate, setSelectedApprovalDate] = useState("");

  // --- ADMIN: Lógica de Filtragem dos Relatórios (Pesquisa + Mês + Ano + Estado) ---
  const getFilteredUsers = () => {
    // 1º - Verifica se a lista principal de utilizadores existe
    if (!adminUsersReports) return [];

    return adminUsersReports.map(user => {
      // 2º - Filtra os relatórios que estão DENTRO do utilizador
      const filteredReports = user.reports.filter(report => {
        const reportDate = new Date(report.date);
        const reportMonth = (reportDate.getMonth() + 1).toString();
        const reportYear = reportDate.getFullYear().toString();

        const matchMonth = filterMonth ? reportMonth === filterMonth : true;
        const matchYear = filterYear ? reportYear === filterYear : true;
        const matchStatus = filterStatus ? report.status === filterStatus : true;

        return matchMonth && matchYear && matchStatus;
      });

      // Retorna o utilizador apenas com os relatórios que passaram no filtro
      return { ...user, reports: filteredReports };
    }).filter(user => {
      // 3º - Filtra os utilizadores pela barra de pesquisa
      const matchSearch = (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || "").toLowerCase().includes(searchTerm.toLowerCase());

      // Magia: Só mostra o utilizador se ele corresponder à pesquisa de nome E tiver relatórios para mostrar!
      return matchSearch && user.reports.length > 0;
    });
  };

  // Esta é a lista que vamos mandar renderizar no HTML!
  const filteredUsersReports = getFilteredUsers();

  // Lógica para o Dashboard Lowkey do Dia Selecionado
  const getSelectedDayDashboard = () => {
    if (!adminUsersReports) return [];

    return adminUsersReports.map(user => {
      // Procura o relatório para a data selecionada no calendário
      const relatorioDia = user.reports.find(r => r.date.split('T')[0] === dashboardDate);

      let status = "Em falta";
      let icone = "✖️";
      let corTexto = "text-zinc-500";
      let corBorda = "border-zinc-800";

      if (relatorioDia) {
        if (relatorioDia.status === "Submetido" || relatorioDia.status === "Validado") {
          status = relatorioDia.status;
          icone = "✔️";
          corTexto = "text-emerald-500/80";
          corBorda = "border-emerald-500/20";
        } else if (relatorioDia.status === "Rascunho") {
          status = "A preencher...";
          icone = "📝";
          corTexto = "text-yellow-500/80";
          corBorda = "border-yellow-500/20";
        }
      }

      return {
        id: user.user_id,
        nome: user.name,
        status,
        icone,
        corTexto,
        corBorda,
        hora: relatorioDia?.submitted_at ? new Date(relatorioDia.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "--:--"
      };
    });
  };

  const dashboardCardsData = getSelectedDayDashboard();

  const [activeWorkers, setActiveWorkers] = useState([]);
  const [currentUserInfo, setCurrentUserInfo] = useState({ id: null, role: 'Técnico', name: '', email: '' });

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
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  
  // Filtro de Estatísticas
  const [statsPeriod, setStatsPeriod] = useState('7'); 
  const [chartHoursData, setChartHoursData] = useState({ labels: [], hours: [] });
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [activeTimerTask, setActiveTimerTask] = useState(() => {
    const saved = localStorage.getItem('flowpulse_activeTimerTask');
    return saved ? JSON.parse(saved) : null;
  });

  const [timerStartTime, setTimerStartTime] = useState(() => {
    return localStorage.getItem('flowpulse_timerStartTime') || null;
  });

  const [secondsElapsed, setSecondsElapsed] = useState(() => {
    const savedStart = localStorage.getItem('flowpulse_timerStartTime');
    if (savedStart) {
      const startMs = new Date(savedStart).getTime();
      const nowMs = Date.now();
      return Math.max(0, Math.floor((nowMs - startMs) / 1000));
    }
    return 0;
  });

  // Estados para controlo de inatividade do cronómetro
  const [showIdleModal, setShowIdleModal] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);
  const IDLE_LIMIT_MS = 15 * 60 * 1000; // 15 minutos em milissegundos

  // Estados de Feedback
  const [pendingFeedbacks, setPendingFeedbacks] = useState([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedbackReq, setSelectedFeedbackReq] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");

  // Estados para criar pedido de feedback
  const [showCreateFeedbackModal, setShowCreateFeedbackModal] = useState(false);
  const [feedbackTargetTicket, setFeedbackTargetTicket] = useState(null);
  const [newFeedbackTitle, setNewFeedbackTitle] = useState("");
  const [newFeedbackDesc, setNewFeedbackDesc] = useState("");
  const [newFeedbackDeadline, setNewFeedbackDeadline] = useState("");
  const [newFeedbackUsers, setNewFeedbackUsers] = useState([]);

  // Estados Modais de Tarefa
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('Média');
  const [newTaskType, setNewTaskType] = useState('Geral');
  const [taskTypes, setTaskTypes] = useState(['Geral', 'Software', 'Hardware', 'Redes']);
  const [typeFilter, setTypeFilter] = useState('');
  const [knowledgeSort, setKnowledgeSort] = useState('newest');
  const [selectedKnowledgeTicket, setSelectedKnowledgeTicket] = useState(null);
  const [newStatus, setNewStatus] = useState('To Do');
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientId, setNewClientId] = useState(''); 
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [estHours, setEstHours] = useState(1);
  const [estMinutes, setEstMinutes] = useState(30);
  const [newDueDate, setNewDueDate] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newBlockedById, setNewBlockedById] = useState('');
  // --- Autocomplete da dependência (Bloqueada por) ---
  const [dependencySearch, setDependencySearch] = useState('');
  const [showDependencyDropdown, setShowDependencyDropdown] = useState(false);
  // --- Subtarefas da tarefa em edição ---
  const [subtasks, setSubtasks] = useState([]);
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubAssignee, setNewSubAssignee] = useState('');
  const [returningTicket, setReturningTicket] = useState(false);

  // Estados dos Projetos
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editProjectMode, setEditProjectMode] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectTeamIds, setProjectTeamIds] = useState([]);
  const [projectClientId, setProjectClientId] = useState(''); 
  const [projectTicketIds, setProjectTicketIds] = useState([]); 
  // Data final do projeto
  const [projectDueDate, setProjectDueDate] = useState('');

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

  // Estados para os Projetos associados ao Cliente (criação e edição)
  const [selectedClientProjects, setSelectedClientProjects] = useState([]);
  const [selectedNewClientProjectId, setSelectedNewClientProjectId] = useState('');

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
  const [selectedNewProjectId, setSelectedNewProjectId] = useState('');

  // Estados da Administração (Criação de Utilizador)
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Técnico');

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
    if (activeTimerTask && timerStartTime) {
      // Recalcula imediatamente os segundos reais
      const startMs = new Date(timerStartTime).getTime();
      setSecondsElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

      interval = setInterval(() => {
        const nowMs = Date.now();
        setSecondsElapsed(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [activeTimerTask, timerStartTime]);

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

  const fetchTaskTypes = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // ⚠️ Certifica-te de que tem o /tickets/ aqui:
      const res = await axios.get(`${API_URL}/tickets/task-types/list`, { headers });
      setTaskTypes(res.data);
    } catch (err) {
      console.error("Erro ao carregar tipos de tarefa", err);
    }
  };

  useEffect(() => {
    if (token) fetchTaskTypes();
  }, [token]);

  // Carregar dados do gráfico de Horas Registadas na aba de Estatísticas
  const fetchChartHours = async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/statistics/chart-hours?period=${statsPeriod}`, { headers });
      setChartHoursData(res.data);
    } catch (err) {
      console.error("Erro ao carregar dados do gráfico de horas:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchChartHours();
    }
  }, [activeTab, statsPeriod, token]);

  // Atualiza contadores/horas de hoje e o gráfico de horas em simultâneo
  const handleRefreshStats = async () => {
    if (!token) return;
    try {
      setIsRefreshingStats(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, chartRes] = await Promise.all([
        axios.get(`${API_URL}/tickets/me/stats`, { headers }),
        axios.get(`${API_URL}/tickets/statistics/chart-hours?period=${statsPeriod || "7"}`, { headers })
      ]);

      setStats(statsRes.data);
      setChartHoursData(chartRes.data);
    } catch (error) {
      console.error("Erro ao atualizar estatísticas:", error);
    } finally {
      setIsRefreshingStats(false);
    }
  };

  // Carregar salas de chat do utilizador (Diretas ou de Projetos)
  const fetchChatRooms = async () => {
    if (!token || !currentUserInfo.id) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Se estivermos no contexto de projetos e houver um projeto selecionado,
      // garantimos primeiro que a sala geral do projeto está sincronizada no backend!
      if (chatContext === 'project' && selectedChatProjectId) {
        try {
          await axios.post(`${API_URL}/chat/projects/${selectedChatProjectId}/sync-general?current_user_id=${currentUserInfo.id}`, {}, { headers });
        } catch (err) {
          console.error("Erro ao auto-sincronizar canal geral:", err);
        }
      }

      let url = `${API_URL}/chat/rooms?user_id=${currentUserInfo.id}&context=${chatContext}`;
      if (chatContext === 'project' && selectedChatProjectId) {
        url += `&project_id=${selectedChatProjectId}`;
      }

      const res = await axios.get(url, { headers });
      setChatRooms(res.data);

      // Magia: Soma todas as não lidas de todas as salas e atualiza a bolinha de fora!
      const totalUnread = res.data.reduce((sum, room) => sum + (room.unread_count || 0), 0);
      setChatUnreadCount(totalUnread);

    } catch (e) {
      console.error("Erro ao carregar salas de chat", e);
    }
  };

  // Recarregar conversas sempre que muda de contexto ou de projeto selecionado
  useEffect(() => {
    if (token && currentUserInfo.id) {
      fetchChatRooms();
    }
  }, [chatContext, selectedChatProjectId]);

  // Carregar o número total de mensagens não lidas
  const fetchUnreadCount = async () => {
    if (!token || !currentUserInfo.id) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/chat/unread-count?user_id=${currentUserInfo.id}`, { headers });
      setChatUnreadCount(res.data.unread_count);
    } catch (e) {
      console.error("Erro ao carregar mensagens não lidas", e);
    }
  };

  // Carregar histórico de mensagens de uma sala específica
  const openChatRoom = async (room) => {
    setActiveChatRoom(room);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Vai buscar o histórico
      const res = await axios.get(`${API_URL}/chat/history/${room.id}`, { headers });
      setChatMessages(res.data);

      // Avisa o backend que as mensagens desta sala foram lidas
      await axios.put(`${API_URL}/chat/rooms/${room.id}/read?user_id=${currentUserInfo.id}`, {}, { headers });

      // Vai buscar o novo número de mensagens não lidas (para apagar ou diminuir a bolinha)
      fetchUnreadCount();

    } catch (e) {
      console.error("Erro ao carregar histórico de chat", e);
    }
  };

  // 1. Efect para o WebSocket e SCROLL AUTOMÁTICO
  useEffect(() => {
    if (!activeChatRoom || !token || !currentUserInfo.id) return;

    // Converte o endereço para ws:// (WebSocket)
    const wsUrl = API_URL.replace('http', 'ws') + `/chat/ws/${activeChatRoom.id}/${currentUserInfo.id}`;
    const ws = new WebSocket(wsUrl);
    chatWsRef.current = ws;

    ws.onmessage = (event) => {
      const newMsg = JSON.parse(event.data);

      // A. Adiciona a mensagem à lista em tempo real
      setChatMessages(prev => {
        const updated = [...prev, newMsg];

        // B. Puxa o ecrã para baixo com um micro-delay para garantir que a mensagem já lá está!
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);

        return updated;
      });

      // C. A BOLINHA VERMELHA SÓ ACENDE SE QUEM MANDOU FOI A OUTRA PESSOA
      if (newMsg.sender_id !== currentUserInfo.id) {
        // Se a aba estiver fechada, acende a bolinha
        if (!showChatModal) {
          setChatUnreadCount(prev => prev + 1);
        }

        // 🔔 Atualiza a lista de conversas para o ícone/badge acender na sidebar
        fetchChatRooms();
      }
    };

    return () => {
      ws.close();
    };
  }, [activeChatRoom, currentUserInfo.id, token, showChatModal]);

  // Faz scroll automático para o fundo sempre que as mensagens carregam ou mudas de sala
  useEffect(() => {
    if (activeChatRoom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" }); 
      }, 50);
    }
  }, [chatMessages, activeChatRoom]);

  // Carrega as mensagens afixadas do localStorage sempre que mudas de sala de chat
  useEffect(() => {
    if (activeChatRoom) {
      const savedPins = localStorage.getItem(`pinned_chat_${activeChatRoom.id}`);
      if (savedPins) {
        setPinnedMessages(JSON.parse(savedPins));
      } else {
        setPinnedMessages([]);
      }
    }
  }, [activeChatRoom]);

  // Guarda automaticamente no localStorage sempre que afixares ou desafixares uma mensagem
  useEffect(() => {
    if (activeChatRoom) {
      localStorage.setItem(`pinned_chat_${activeChatRoom.id}`, JSON.stringify(pinnedMessages));
    }
  }, [pinnedMessages, activeChatRoom]);

  // 2. Função de Envio de Mensagem 
  const sendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatWsRef.current || !activeChatRoom) return;

    // Envia para o backend (o WebSocket encarrega-se de devolver à sala e mostrar na janela)
    chatWsRef.current.send(JSON.stringify({ content: chatInput }));

    // Limpa a caixa de texto instantaneamente
    setChatInput('');

    // Puxa o ecrã para baixo do teu lado
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Pede à IA um resumo inteligente do histórico da conversa ativa
  // Aceita uma prompt personalizada (customPromptText); se vazia, usa a prompt default
  const handleSummarizeChatWithAI = async (customPromptText = '') => {
    if (!activeChatRoom || chatMessages.length === 0) {
      alert("Não há mensagens suficientes nesta conversa.");
      return;
    }
    
    setLoadingAiChat(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const historyText = chatMessages.map(m => `- ${m.content}`).join('\n');
      
      const defaultPrompt = `És o assistente executivo da RFS. Analisa estritamente o seguinte histórico de chat e extrai os pontos principais em tópicos claros.`;
      
      const userInstruction = customPromptText.trim() !== '' ? customPromptText : defaultPrompt;

      const strictPrompt = `
      Instrução: ${userInstruction}
      
      Histórico de mensagens da conversa:
      ${historyText}
      `;

      const res = await axios.post(`${API_URL}/chat/summarize`, {
        room_id: activeChatRoom.id,
        prompt: strictPrompt,
        messages: historyText
      }, { headers });
      
      setChatSummary(res.data.summary);
      setShowAiPromptModal(false);
      setCustomAiPrompt('');
    } catch (err) {
      alert("Erro ao comunicar com a IA. Tenta novamente.");
      setShowAiPromptModal(false);
    } finally {
      setLoadingAiChat(false);
    }
  };

  // Iniciar (ou abrir) uma conversa direta com um colega
  const startDirectChat = async (otherUserId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      // Chama o endpoint do backend que criamos agora
      const res = await axios.post(`${API_URL}/chat/rooms/direct/${otherUserId}?current_user_id=${currentUserInfo.id}`, {}, { headers });

      // Fecha a lista de novos chats, atualiza as salas e abre logo esta sala
      setShowNewChatList(false);
      await fetchChatRooms();
      openChatRoom(res.data);
    } catch (err) {
      console.error("Erro ao iniciar chat direto:", err);
      alert("Erro ao abrir conversa com o colega.");
    }
  };

  // Carregar as salas quando a app arranca ou o token muda
  useEffect(() => {
    if (token && currentUserInfo.id) {
      fetchChatRooms();
      fetchUnreadCount(); // <--- ADICIONAR ESTA LINHA AQUI!
    }
  }, [token, currentUserInfo.id]);

  useEffect(() => {
    if (token) {
      fetchActiveWorkers();
      fetchNotifications();
      fetchData();

      // Radar que atualiza tarefas e utilizadores ativos sem precisar de F5
      const radarWorkers = setInterval(fetchActiveWorkers, 5000); 
      const radarTasks = setInterval(fetchData, 5000); 
      const radarNotifs = setInterval(fetchNotifications, 15000); 

      return () => { 
        clearInterval(radarWorkers); 
        clearInterval(radarTasks); 
        clearInterval(radarNotifs); 
      };
    }
  }, [token]);

  // Carrega os pedidos de feedback pendentes
  useEffect(() => {
    if (token) {
      fetchPendingFeedbacks();
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
      const res = await axios.post(`${API_URL}/tickets/${task.id}/start-timer`, {}, { headers });
      const nowIso = new Date().toISOString();

      // Guarda no localStorage
      localStorage.setItem('flowpulse_activeTimerTask', JSON.stringify(res.data));
      localStorage.setItem('flowpulse_timerStartTime', nowIso);

      setTimerStartTime(nowIso);
      setActiveTimerTask(res.data);
      setSecondsElapsed(0);
      fetchActiveWorkers();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao iniciar o cronómetro no servidor.');
    }
  };

  const stopTimer = async () => {
    if (!activeTimerTask) return;
    const hoursSpent = secondsElapsed / 3600;
    const endTime = new Date().toISOString();
    
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      await axios.post(`${API_URL}/tickets/${activeTimerTask.id}/stop-timer`, { 
        session_hours: hoursSpent,
        start_time: timerStartTime,
        end_time: endTime
      }, { headers });
      
      // Limpa os dados do localStorage
      localStorage.removeItem('flowpulse_activeTimerTask');
      localStorage.removeItem('flowpulse_timerStartTime');

      setActiveTimerTask(null);
      setSecondsElapsed(0);
      setTimerStartTime(null);
      fetchData(); 
      fetchActiveWorkers();
    } catch (err) {
      alert('Erro ao registar o tempo exato.');
    }
  };

  // 1. O utilizador confirmou que ainda está presente
  const handleKeepWorking = () => {
    setShowIdleModal(false);
    setIdleCountdown(60);
  };

  // 2. Parar cronómetro descontando o tempo inativo
  const handleAutoStopIdleTimer = async () => {
    setShowIdleModal(false);
    if (!activeTimerTask) return;

    try {
      const idleHours = 15 / 60; // 15 minutos em formato de horas decimais (0.25h)
      const totalSessionHours = Math.max(0, (secondsElapsed / 3600) - idleHours);

      const now = new Date();
      const adjustedEndTime = new Date(now.getTime() - (15 * 60 * 1000)); // Termina no momento em que ficou inativo

      const payload = {
        tracked_hours: Number(((activeTimerTask.tracked_hours || 0) + totalSessionHours).toFixed(2)),
        session_hours: Number(totalSessionHours.toFixed(2)),
        start_time: timerStartTime,
        end_time: adjustedEndTime.toISOString()
      };

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/tickets/${activeTimerTask.id}/stop-timer`, payload, { headers });

      const idleTaskId = activeTimerTask.id;
      setActiveTimerTask(null);
      setSecondsElapsed(0);
      setTimerStartTime(null);
      fetchData();
      fetchActiveWorkers();
      alert(`⏱️ O cronómetro da tarefa #${idleTaskId} foi pausado por inatividade. Foram descontados 15 minutos.`);
    } catch (err) {
      console.error("Erro ao pausar cronómetro por inatividade:", err);
    }
  };

  // Função para procurar feedbacks pendentes
  const fetchPendingFeedbacks = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/feedback/my-pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingFeedbacks(res.data.filter(f => !f.has_responded));
    } catch (err) {
      console.error("Erro ao carregar feedbacks:", err);
    }
  };

  // Submeter resposta de feedback
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/feedback/requests/${selectedFeedbackReq.id}/respond`,
        { rating: feedbackRating, comment: feedbackComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Feedback enviado com sucesso! Obrigado pela colaboração.");
      setShowFeedbackModal(false);
      setSelectedFeedbackReq(null);
      setFeedbackComment("");
      fetchPendingFeedbacks();
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao enviar feedback.");
    }
  };

  // Submeter pedido de feedback (Gestor/Admin)
  const handleCreateFeedbackRequest = async (e) => {
    e.preventDefault();
    if (!newFeedbackTitle.trim() || !newFeedbackDeadline) {
      alert("Indica o título e a data/hora limite.");
      return;
    }

    try {
      const payload = {
        title: newFeedbackTitle.trim(),
        description: newFeedbackDesc.trim() || null,
        ticket_id: feedbackTargetTicket?.id || null,
        project_id: feedbackTargetTicket?.project_id || null,
        target_user_ids: newFeedbackUsers,
        deadline: new Date(newFeedbackDeadline).toISOString()
      };

      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/feedback/requests`, payload, { headers });

      alert("✅ Pedido de feedback enviado com sucesso! Os colaboradores foram notificados.");
      setShowCreateFeedbackModal(false);
      setFeedbackTargetTicket(null);
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao criar pedido de feedback.");
    }
  };

  // Deteta inatividade do utilizador apenas quando há um cronómetro ativo
  useEffect(() => {
    // Só monitoriza se houver um cronómetro ativo
    if (!activeTimerTask) {
      setShowIdleModal(false);
      return;
    }

    let idleTimeout;

    const resetIdleTimer = () => {
      if (showIdleModal) return; // Não reinicia se o modal de aviso já estiver aberto
      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        setShowIdleModal(true);
        setIdleCountdown(60);
      }, IDLE_LIMIT_MS);
    };

    // Eventos do browser para detetar atividade do utilizador
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach(evt => window.addEventListener(evt, resetIdleTimer));

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimeout);
      activityEvents.forEach(evt => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [activeTimerTask, showIdleModal]);

  // Contagem decrescente do Modal de Aviso (60 segundos)
  useEffect(() => {
    let timer;
    if (showIdleModal && idleCountdown > 0) {
      timer = setInterval(() => {
        setIdleCountdown(prev => prev - 1);
      }, 1000);
    } else if (showIdleModal && idleCountdown <= 0) {
      // Tempo esgotado -> Parar cronómetro automaticamente e descontar os 15 min de inatividade
      handleAutoStopIdleTimer();
    }
    return () => clearInterval(timer);
  }, [showIdleModal, idleCountdown]);

  // Agarrar uma tarefa que ainda não tem dono, sem precisar de arrancar o cronómetro
  const handleGrabTask = async (ticket) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/${ticket.id}/grab`, {}, { headers });
      alert("Tarefa agarrada com sucesso!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || "Erro ao agarrar tarefa.");
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
    localStorage.removeItem('flowpulse_activeTimerTask');
    localStorage.removeItem('flowpulse_timerStartTime');
    setToken('');
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      // Vai primeiro buscar o utilizador logado, para sabermos o role ANTES de filtrar os tickets
      // (evita usar um role desatualizado vindo do estado de renders anteriores)
      let loggedRole = currentUserInfo.role;
      let loggedId = currentUserInfo.id;

      try {
        const statsRes = await axios.get(`${API_URL}/tickets/me/stats`, { headers });
        setStats(statsRes.data);
        loggedRole = statsRes.data.role;
        loggedId = statsRes.data.user_id;
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

      let query = `${API_URL}/tickets/?`;
      if (search) query += `search=${search}&`;

      try {
        const ticketsRes = await axios.get(query, { headers });

        // 🔒 FILTRO DE SEGURANÇA PARA A LISTAGEM GERAL:
        // Inclui tarefas onde o utilizador é o responsável, o criador OU tem uma subtarefa atribuída
        const userRole = loggedRole?.toLowerCase();
        let ticketsToSave = ticketsRes.data;

        // 🔒 Só os cargos de gestão global veem todos os tickets à partida;
        // os restantes cargos (Técnico, Gestor de Projeto, Líder de Equipa) ficam
        // limitados aqui às suas próprias tarefas — a visibilidade extra de
        // projeto/equipa é tratada depois em `canSeeProjectTickets`.
        if (!["admin", "gestor de operações", "manager"].includes(userRole)) {
          ticketsToSave = ticketsRes.data.filter(t => 
            t.assigned_to_id === loggedId || 
            t.creator_id === loggedId ||
            t.sub_tasks?.some(sub => sub.assigned_to_id === loggedId)
          );
        }

        setTickets(ticketsToSave);
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
    setNewUserRole('Técnico');
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
    setProjectTeamIds([]);
    setProjectClientId('');
    setProjectDueDate('');
    setProjectTicketIds([]);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (proj) => {
    setEditProjectMode(true);
    setCurrentProjectId(proj.id);
    setProjectName(proj.name);
    setProjectDesc(proj.description || '');
    setProjectTeamIds(proj.team_ids || (proj.teams ? proj.teams.map(t => t.id) : []));
    setProjectClientId(proj.client_id || '');
    setProjectDueDate(proj.due_date ? proj.due_date.split('T')[0] : '');
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

  const openProjectTasksModal = async (proj) => {
    setActiveProjectForTasks(proj);
    setShowProjectTasksModal(true);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/project/${proj.id}`, { headers });
      setProjectModalTickets(res.data); // Guarda todos os tickets do projeto (tuos e dos colegas)
    } catch (err) {
      console.error("Erro ao carregar tarefas do projeto:", err);
      setProjectModalTickets([]);
    }
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

    if (!projectName.trim()) {
      alert("O nome do projeto é obrigatório!");
      return;
    }
    if (!projectDesc.trim()) {
      alert("A descrição do projeto é obrigatória!");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        name: projectName.trim(),
        description: projectDesc.trim(),
        team_ids: projectTeamIds, // envia o array de IDs
        client_id: projectClientId ? Number(projectClientId) : null, // Permite null (cliente opcional)
        due_date: projectDueDate || null,
        ticket_ids: projectTicketIds
      };

      if (editProjectMode) {
        await axios.put(`${API_URL}/projects/${currentProjectId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/projects/`, payload, { headers });
      }

      // Propaga automaticamente o cliente do projeto para todas as tarefas associadas
      if (projectClientId && projectTicketIds.length > 0) {
        await Promise.all(
          projectTicketIds.map(ticketId =>
            axios.put(`${API_URL}/tickets/${ticketId}`, { client_id: Number(projectClientId) }, { headers })
              .catch(err => console.error(`Erro ao propagar cliente para a tarefa #${ticketId}`, err))
          )
        );
      }

      setShowProjectModal(false);
      setProjectName('');
      setProjectDesc('');
      setProjectTeamIds([]);
      setProjectClientId('');
      setProjectDueDate('');
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
      const payload = {
        name: clientName.trim(),
        company: clientCompany.trim(),
        email: clientEmail ? clientEmail.trim() : null,
        phone: clientPhone ? clientPhone.trim() : null,
        project_ids: selectedClientProjects
      };
      await axios.post(`${API_URL}/clients/`, payload, { headers });
      setShowClientModal(false);
      setClientName('');
      setClientEmail('');
      setClientCompany('');
      setClientPhone('');
      setSelectedClientProjects([]);
      setSelectedNewClientProjectId('');
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
    const initialClientProjects = (projects || [])
      .filter(p => p.client_id === client.id)
      .map(p => p.id);
    setSelectedClientProjects(initialClientProjects);
    setSelectedNewClientProjectId('');
    setShowEditClientModal(true);
  };

  const handleUpdateClient = async (e) => {
    e.preventDefault();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/clients/${currentClientId}`, {
        name: editClientName.trim(),
        company: editClientCompany.trim(),
        email: editClientEmail ? editClientEmail.trim() : null,
        phone: editClientPhone ? editClientPhone.trim() : null,
        project_ids: selectedClientProjects
      }, { headers });
      setShowEditClientModal(false);
      setSelectedClientProjects([]);
      setSelectedNewClientProjectId('');
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
    const initialProjects = (projects || []).filter(p => {
      if (p.team_ids && Array.isArray(p.team_ids)) {
        return p.team_ids.includes(team.id);
      }
      if (p.teams && Array.isArray(p.teams)) {
        return p.teams.some(t => t.id === team.id);
      }
      return p.team_id === team.id;
    }).map(p => p.id);
    setSelectedProjectIds(initialProjects);
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

      // Sincroniza os team_ids de cada projeto (adiciona ou remove esta equipa)
      for (const proj of projects) {
        const isNowAssociated = selectedProjectIds.includes(proj.id);
        const currentTeamIds = proj.team_ids || (proj.teams ? proj.teams.map(t => t.id) : (proj.team_id ? [proj.team_id] : []));
        const wasAssociated = currentTeamIds.includes(currentTeam.id);

        if (isNowAssociated && !wasAssociated) {
          const updatedTeamIds = [...currentTeamIds, currentTeam.id];
          await axios.put(`${API_URL}/projects/${proj.id}`, { team_ids: updatedTeamIds }, { headers });
        } else if (!isNowAssociated && wasAssociated) {
          const updatedTeamIds = currentTeamIds.filter(id => id !== currentTeam.id);
          await axios.put(`${API_URL}/projects/${proj.id}`, { team_ids: updatedTeamIds }, { headers });
        }
      }

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
    setNewTaskType('Geral');
    setNewStatus('To Do');
    setNewAssignedTo('');
    setEstHours(1);
    setEstMinutes(0);
    setNewDueDate('');
    setNewStartDate('');
    setNewClientId('');
    setNewProjectId('');
    setNewBlockedById('');
    setDependencySearch('');
    setShowDependencyDropdown(false);
    setSubtasks([]);
    setNewSubTitle('');
    setNewSubAssignee('');
    setTicketHistoryLogs([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (ticket) => {
    setEditMode(true);
    setCurrentTicketId(ticket.id);
    setNewTitle(ticket.title);
    setNewDesc(ticket.description || '');
    setNewPriority(ticket.priority);
    setNewTaskType(ticket.task_type || 'Geral');
    setNewStatus(ticket.status);
    setNewAssignedTo(ticket.assigned_to_id || '');
    const totalMinutes = Math.round((ticket.estimated_hours || 0) * 60);
    setEstHours(Math.floor(totalMinutes / 60));
    setEstMinutes(totalMinutes % 60);
    setNewDueDate(ticket.due_date ? ticket.due_date.split('T')[0] : '');
    setNewStartDate(ticket.start_date ? ticket.start_date.split('T')[0] : '');
    setNewProjectId(ticket.project_id || '');
    setNewClientId(ticket.client_id || '');
    setNewBlockedById(ticket.blocked_by_id || '');
    const blockingTicket = ticket.blocked_by_id ? tickets.find(t => t.id === ticket.blocked_by_id) : null;
    setDependencySearch(blockingTicket ? `#${blockingTicket.id} - ${blockingTicket.title}` : '');
    setShowDependencyDropdown(false);
    setSubtasks([]);
    setNewSubTitle('');
    setNewSubAssignee('');
    fetchTicketHistory(ticket.id);
    setShowModal(true);
    fetchSubtasks(ticket.id);
  };

  const handleSaveTicket = async (e) => {
    e.preventDefault();
    if (!newDesc.trim()) {
      alert('A descrição é um campo obrigatório!');
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = {
        title: newTitle, 
        description: newDesc, 
        priority: newPriority,
        task_type: newTaskType,
        status: newStatus, 
        project_id: newProjectId ? Number(newProjectId) : null,
        client_id: newClientId ? Number(newClientId) : null,
        assigned_to_id: newAssignedTo ? Number(newAssignedTo) : null,
        estimated_hours: Number(estHours) + (Number(estMinutes) / 60),
        due_date: newDueDate ? newDueDate : null,
        start_date: newStartDate ? newStartDate : null,
        blocked_by_id: newBlockedById ? Number(newBlockedById) : null
      };
      if (editMode) {
        await axios.put(`${API_URL}/tickets/${currentTicketId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/tickets/`, payload, { headers });
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao guardar a tarefa.');
    }
  };

  // --- Gestão de Subtarefas ---
  const fetchSubtasks = async (ticketId) => {
    if (!ticketId) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/${ticketId}/subtasks`, { headers });
      setSubtasks(res.data);
    } catch (err) {
      console.error("Erro ao carregar subtarefas", err);
    }
  };

  const handleAddSubtask = async (e) => {
    e.preventDefault();
    if (!newSubTitle.trim() || !currentTicketId) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/tickets/${currentTicketId}/subtasks`, {
        title: newSubTitle,
        assigned_to_id: newSubAssignee ? Number(newSubAssignee) : null
      }, { headers });
      setNewSubTitle('');
      setNewSubAssignee('');
      fetchSubtasks(currentTicketId);
      fetchData(); // 🔄 Atualiza logo a lista geral e a Kanban
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao criar subtarefa.');
    }
  };

  // 1. O Técnico submete para aprovação
  const handleSubmitSubtaskForApproval = async (subId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/subtasks/${subId}/submit`, {}, { headers });
      fetchSubtasks(currentTicketId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao submeter subtarefa para aprovação.');
    }
  };

  // 2. O Criador aprova
  const handleApproveSubtask = async (subId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/subtasks/${subId}/approve`, {}, { headers });
      fetchSubtasks(currentTicketId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao aprovar subtarefa.');
    }
  };

  // 3. O Criador recusa com motivo
  const handleRejectSubtask = async (subId) => {
    const reason = window.prompt("Indica o motivo da recusa para o técnico corrigir:");
    if (!reason || !reason.trim()) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/tickets/subtasks/${subId}/reject`, { reason: reason.trim() }, { headers });
      fetchSubtasks(currentTicketId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao recusar subtarefa.');
    }
  };

  // --- Devolução de Tarefa (com motivo obrigatório) ---
  const handleReturnTicket = async () => {
    if (!currentTicketId) return;
    const reason = window.prompt("⚠️ Indica obrigatoriamente o motivo/descrição para devolver esta tarefa:");
    if (!reason || !reason.trim()) {
      alert("A devolução foi cancelada. O motivo é obrigatório.");
      return;
    }
    try {
      setReturningTicket(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/tickets/${currentTicketId}/return`, { reason }, { headers });
      alert("Tarefa devolvida com sucesso ao estado inicial.");
      setShowModal(false);
      fetchData();
      fetchActiveWorkers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao devolver tarefa.');
    } finally {
      setReturningTicket(false);
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

    // Observação obrigatória para o histórico em qualquer outra mudança de estado
    const observation = window.prompt(`📝 Vais mudar o estado para "${newStat}". Introduz a observação obrigatória para o histórico:`);
    if (!observation || !observation.trim()) {
      alert("A alteração de estado foi cancelada porque a observação é obrigatória.");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      let updatePayload = { status: newStat };
      await axios.put(`${API_URL}/tickets/${ticketId}`, updatePayload, { headers });

      // Grava a observação como comentário/log associado à tarefa
      await axios.post(
        `${API_URL}/tickets/${ticketId}/comments?author_id=${currentUserInfo.id}`,
        { text: `[Mudança de Estado para ${newStat}]: ${observation.trim()}` },
        { headers }
      );

      fetchData();
      fetchActiveWorkers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao alterar o estado.');
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

  const getTaskTypeBadgeStyle = (type) => {
    switch (type) {
      case 'Software': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'Hardware': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Redes': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'Geral': default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
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

  const userRole = (currentUserInfo?.role || "").toLowerCase();

  const isAdmin = userRole === "admin";
  const isManagerOrAdmin = ["admin", "gestor de operações", "manager"].includes(userRole);
  const isProjectManagerRole = userRole === "gestor de projeto" || isManagerOrAdmin;
  const isTeamLeaderRole = userRole === "líder de equipa" || isManagerOrAdmin;

  // Função auxiliar de permissões no frontend
  const canManageTicket = (ticket) => {
    if (!ticket || !currentUserInfo) return false;

    if (isManagerOrAdmin) return true;
    if (ticket.creator_id === currentUserInfo.id) return true;
    if (ticket.assigned_to_id === currentUserInfo.id) return true;

    // Se o utilizador for gestor do projeto (cargo global ou gestor específico deste projeto)
    const project = projects.find(p => p.id === ticket.project_id);
    if (isProjectManagerRole && project) return true;
    if (project && project.manager_id === currentUserInfo.id) return true;

    // Se o utilizador for líder da equipa (cargo global ou líder específico desta equipa)
    const team = teams.find(t => t.id === ticket.team_id);
    if (isTeamLeaderRole && team) return true;
    if (team && (team.leader_id === currentUserInfo.id || team.manager_id === currentUserInfo.id)) return true;

    return false;
  };

  const availableTeams = isAdmin ? teams : teams.filter(t => t.members?.some(m => m.id === currentUserInfo.id) || t.owner_id === currentUserInfo.id);
  const availableTeamIds = availableTeams.map(t => t.id);
  const availableProjects = isAdmin ? projects : projects.filter(p => !p.team_id || availableTeamIds.includes(p.team_id));
  const availableProjectIds = availableProjects.map(p => p.id);

  // Líder de Equipa = dono (owner_id) de pelo menos uma das suas equipas, ou tem o cargo global de Líder de Equipa
  const isTeamLeader = isTeamLeaderRole || availableTeams.some(t => t.owner_id === currentUserInfo.id);
  // Admin, Manager e Líder de Equipa veem todas as tarefas dos projetos a que têm acesso; um membro normal só vê as suas
  const canSeeProjectTickets = isManagerOrAdmin || isTeamLeader;
  // 🔍 Inclui tickets onde o colaborador tem subtarefas atribuídas
  const availableTickets = isAdmin
    ? tickets
    : tickets.filter(t => 
        t.assigned_to_id === currentUserInfo.id || 
        t.creator_id === currentUserInfo.id || 
        t.sub_tasks?.some(sub => sub.assigned_to_id === currentUserInfo.id) ||
        (canSeeProjectTickets && availableProjectIds.includes(t.project_id))
      );

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

  // 🔧 CORRIGIDO: este useEffect estava depois do "if (!token) return", o que
  // violava as Regras dos Hooks (deixava de ser chamado quando não há token
  // e o número/ordem de hooks mudava entre renders). Agora fica sempre antes
  // de qualquer return condicional.
  useEffect(() => {
    if (selectedTicketDetails) {
      fetchTicketHistory(selectedTicketDetails.id);
    } else {
      setTicketHistoryLogs([]);
    }
  }, [selectedTicketDetails]);

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
    // Data atual de referência
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());

    if (isDone) {
      // Procura a data em que foi concluída (pode ser due_date, updated_at ou um campo de conclusão se o tiveres guardado)
      // Se não tiveres uma data específica de conclusão, podes usar a due_date ou a data de atualização
      const completedDate = ticket.updated_at ? new Date(ticket.updated_at) : new Date(ticket.due_date || ticket.created_at);

      // Se foi concluída há mais de 7 dias, esconde da vista principal!
      if (completedDate < sevenDaysAgo) {
        return false;
      }
    }

    if (projectFilter && ticket.project_id !== Number(projectFilter)) return false;
    if (priorityFilter && ticket.priority !== priorityFilter) return false;
    if (typeFilter && ticket.task_type !== typeFilter) return false;

    // 🔧 NOVO: Filtro "Criadas por mim"
    if (filterCreatedByMe && ticket.creator_id !== currentUserInfo.id) return false;

    // 🔧 NOVO: Filtro "Não atribuídas" (para managers/admins distribuírem)
    if (filterUnassigned && ticket.assigned_to_id !== null) return false;

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

  // 🛠️ Filtro da Kanban pessoal (mostra apenas as tuas tarefas, exceto se fores Admin/Manager)
  const myKanbanTickets = availableTickets.filter(ticket => {
    if (isManagerOrAdmin) return true;
    return (
      ticket.assigned_to_id === currentUserInfo?.id || 
      ticket.creator_id === currentUserInfo?.id ||
      ticket.sub_tasks?.some(sub => sub.assigned_to_id === currentUserInfo?.id)
    );
  });

  // Aplica os mesmos filtros de projeto/prioridade/tipo e a mesma ordenação da lista, mas sobre myKanbanTickets
  const filteredKanbanTickets = myKanbanTickets.filter(ticket => {
    // Esconde tarefas concluídas há mais de 7 dias
    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
    if (isDone) {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const completedDate = ticket.updated_at ? new Date(ticket.updated_at) : new Date(ticket.due_date || ticket.created_at);
      if (completedDate < sevenDaysAgo) return false;
    }

    if (projectFilter && ticket.project_id !== Number(projectFilter)) return false;
    if (priorityFilter && ticket.priority !== priorityFilter) return false;
    if (typeFilter && ticket.task_type !== typeFilter) return false;

    // 🔧 Filtros rápidos globais na Kanban
    if (filterCreatedByMe && ticket.creator_id !== currentUserInfo.id) return false;
    if (filterUnassigned && ticket.assigned_to_id !== null) return false;

    return true;
  });

  const sortedKanbanTickets = [...filteredKanbanTickets].sort((a, b) => {
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

  // Histórico de atividade de uma tarefa específica (endpoint dedicado no backend)
  const fetchTicketHistory = async (ticketId) => {
    if (!ticketId || !isAdmin) { setTicketHistoryLogs([]); return; }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/tickets/${ticketId}/audit-logs`, { headers });
      setTicketHistoryLogs(res.data);
    } catch (err) {
      console.error("Erro ao carregar o histórico da tarefa", err);
      setTicketHistoryLogs([]);
    }
  };

  // Histórico da tarefa mostrado no modal de edição
  const fetchTicketLogs = async (ticketId, sDate = logStartDate, eDate = logEndDate) => {
    try {
      let query = `${API_URL}/tickets/${ticketId}/audit-logs?`;
      if (sDate) query += `start_date=${sDate}&`;
      if (eDate) query += `end_date=${eDate}&`;

      const res = await axios.get(query, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTicketLogs(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar histórico", err);
      setTicketLogs([]);
    }
  };

  // Abre o modal dedicado de histórico/logs de auditoria de uma tarefa
  const openTaskLogsModal = (ticket) => {
    setSelectedTaskForLogs(ticket);
    setLogStartDate('');
    setLogEndDate('');
    fetchTicketLogs(ticket.id, '', '');
    setShowTaskLogsModal(true);
  };

  const kanbanColumns = [
    { id: 'To Do', title: 'Pendente', color: 'bg-zinc-500' },
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
  const maxHours = Math.max(...(chartHoursData.hours.length ? chartHoursData.hours : [0]), 1);
  const totalTasksPeriod = tasksPerPeriod.reduce((sum, val) => sum + safeNumber(val), 0);
  const totalHoursPeriod = hoursPerPeriod.reduce((sum, val) => sum + safeNumber(val), 0);

  // 🔒 Verifica se o utilizador apenas tem uma subtarefa nesta tarefa (modal de edição)
  const editingTicketObj = tickets.find(t => t.id === currentTicketId);
  const isOwnerOrCreator = canManageTicket(editingTicketObj);
  const isSubtaskCollaborator = !isOwnerOrCreator && subtasks.some(s => s.assigned_to_id === currentUserInfo?.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex overflow-hidden">
      
      {/* Overlay escuro de fundo quando o menu abre no telemóvel */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs"
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col p-4 h-screen transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:sticky md:top-0 md:shrink-0 md:z-20
      `}>
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

          {/* NOVO BOTÃO "MENSAGENS" */}
          <button onClick={() => changeTab('messages')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'messages' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 border border-transparent'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Mensagens
          </button>

          <button onClick={() => changeTab('calendar')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'calendar' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <Calendar className="w-4 h-4" /> Calendário
          </button>

          <button onClick={() => changeTab('statistics')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'statistics' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
            <BarChart3 className="w-4 h-4" /> Estatísticas
          </button>

          {/* Só as chefias (Admin/Manager) veem a página de Aprovações */}
          {isManagerOrAdmin && (
            <button onClick={() => changeTab('aprovacoes')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${activeTab === 'aprovacoes' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850'}`}>
              <ListFilter className="w-4 h-4" /> 📋 Aprovações
            </button>
          )}

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
          <div className="flex items-center gap-3">
            {/* Botão de Menu (Hambúrguer) - visível apenas no telemóvel */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden bg-[#18181b] border border-[#27272a] text-zinc-300 p-2 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#27272a]"
              title="Menu"
            >
              {/* Ícone de 3 pontinhos / barras */}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
              </svg>
            </button>

            <button
              onClick={() => setShowQuickSearch(true)}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-xl text-xs transition shadow-sm group w-72"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition" />
              <span className="flex-1 text-left truncate">Pesquisar tarefas ou projetos...</span>
              <kbd className="bg-zinc-950 border border-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[10px] font-mono">⌘K</kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">

            {/* === ÍCONE DE CHAT NOVO === */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowChatModal(!showChatModal);
                  if (!showChatModal) {
                    fetchChatRooms();
                    setChatUnreadCount(0); // Limpa a bolinha vermelha ao abrir
                  }
                }}
                className="relative p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl transition cursor-pointer"
                title="Mensagens"
              >
                {/* Ícone de Balão de Mensagem */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>

                {chatUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {chatUnreadCount}
                  </span>
                )}
              </button>

              {/* MINI ABA POP-UP DO CHAT */}
              {showChatModal && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 text-zinc-200 overflow-hidden flex flex-col h-[400px]">
                  
                  {/* Cabeçalho da Aba */}
                  <div className="flex justify-between items-center px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                    <h3 className="font-semibold text-sm">
                      {activeChatRoom ? (
                        <button onClick={() => setActiveChatRoom(null)} className="text-blue-400 hover:underline text-xs">
                          ← Voltar
                        </button>
                      ) : showNewChatList ? (
                        <button onClick={() => setShowNewChatList(false)} className="text-blue-400 hover:underline text-xs">
                          ← Conversas
                        </button>
                      ) : "Mensagens"}
                    </h3>

                    <div className="flex items-center gap-2">
                      {!activeChatRoom && !showNewChatList && (
                        <button 
                          onClick={() => setShowNewChatList(true)}
                          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1 rounded-lg transition"
                        >
                          + Nova Conversa
                        </button>
                      )}
                      <button onClick={() => setShowChatModal(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
                    </div>
                  </div>

                  {/* Conteúdo dinâmico da Aba */}
                  {activeChatRoom ? (
                    // Janela de Chat Ativa
                    <div className="flex-1 flex flex-col justify-between p-3 bg-zinc-950 overflow-hidden">
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {chatMessages.map((msg, index) => {
                          const isMe = msg.sender_id === currentUserInfo.id;
                          return (
                            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${isMe ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-200'}`}>
                                {msg.content}
                              </div>
                              <span className="text-[9px] text-zinc-500 mt-0.5">{msg.created_at || msg.last_time}</span>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      <form onSubmit={sendChatMessage} className="mt-2 flex gap-2 pt-2 border-t border-zinc-800">
                        <input 
                          type="text" 
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          placeholder="Escreve uma mensagem..."
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-blue-500"
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-medium transition">
                          Enviar
                        </button>
                      </form>
                    </div>
                  ) : showNewChatList ? (
                    // Lista de Colaboradores para escolher com quem falar
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider px-2 py-1">Selecionar Colaborador</p>
                      {usersList.filter(u => u.id !== currentUserInfo.id).map(user => (
                        <div 
                          key={user.id}
                          onClick={() => startDirectChat(user.id)}
                          className="p-3 hover:bg-zinc-800/60 rounded-xl cursor-pointer transition flex items-center gap-3 border border-transparent hover:border-zinc-700"
                        >
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200">
                            {(user.name || user.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-zinc-100">{user.name || 'Sem nome'}</p>
                            <p className="text-[10px] text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Lista de Salas Existentes
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                      {chatRooms.length === 0 ? (
                        <div className="text-center py-12 space-y-2">
                          <p className="text-xs text-zinc-500">Ainda não tens conversas ativas.</p>
                          <button 
                            onClick={() => setShowNewChatList(true)}
                            className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-xl hover:bg-blue-600/30 transition"
                          >
                            Iniciar primeira conversa
                          </button>
                        </div>
                      ) : (
                        chatRooms.map(room => (
                          <div 
                            key={room.id}
                            onClick={() => openChatRoom(room)}
                            className="p-3 hover:bg-zinc-800/60 rounded-xl cursor-pointer transition border border-transparent hover:border-zinc-700 flex justify-between items-center"
                          >
                            <div className="min-w-0 pr-2 flex-1 flex items-center gap-2.5">

                              {/* 🔵 BOLINHA AZUL DE NÃO LIDA */}
                              {room.unread_count > 0 && (
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                              )}

                              <div className="min-w-0">
                                <p className={`text-xs truncate ${room.unread_count > 0 ? 'font-bold text-white' : 'font-semibold text-zinc-100'}`}>
                                  {room.name}
                                </p>
                                <p className={`text-[11px] truncate mt-0.5 ${room.unread_count > 0 ? 'font-semibold text-zinc-200' : 'text-zinc-400'}`}>
                                  {room.last_message}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`text-[9px] ${room.unread_count > 0 ? 'text-blue-400 font-bold' : 'text-zinc-500'}`}>
                                {room.last_time}
                              </span>

                              {/* (Opcional) Mostra também o número de mensagens dentro da sala */}
                              {room.unread_count > 0 && (
                                <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  {room.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
            {/* FIM DO ÍCONE DE CHAT */}

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

              {/* BANNER DE FEEDBACKS PENDENTES */}
              {pendingFeedbacks.length > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-2xl mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <span className="text-base animate-bounce">📋</span>
                    <span>Tens <strong>{pendingFeedbacks.length}</strong> pedido(s) de feedback a aguardar a tua resposta.</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFeedbackReq(pendingFeedbacks[0]);
                      setShowFeedbackModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                  >
                    Responder Agora
                  </button>
                </div>
              )}

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
                      {stats.hours_today || "00:00"}
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
                              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
                                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                <span>{formatToHHMM(ticket.tracked_hours)}</span>
                                <span className="text-zinc-600">/</span>
                                <span className="text-zinc-300 font-medium">{formatToHHMM(ticket.estimated_hours)}</span>
                              </div>
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
                            {!ticket.assigned_to_id && (
                              <button onClick={() => handleGrabTask(ticket)} className="p-2 text-amber-400 hover:text-amber-300 bg-zinc-900 border border-amber-500/30 rounded-lg transition" title="Agarrar Tarefa">
                                ✋
                              </button>
                            )}
                            {!isDone && (
                              <button
                                onClick={() => (isRunning ? stopTimer() : startTimer(ticket))}
                                className={`p-2 rounded-lg border transition ${isRunning ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`}
                                title={isRunning ? "Parar Cronómetro" : "Iniciar Cronómetro"}
                              >
                                {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              </button>
                            )}
                            <button onClick={() => openComments(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Comentários">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => {
                                  setFeedbackTargetTicket(ticket);
                                  setNewFeedbackTitle(`Feedback da Tarefa #${ticket.id}: ${ticket.title}`);
                                  setNewFeedbackDesc("");
                                  const defaultDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
                                  setNewFeedbackDeadline(defaultDate);
                                  setNewFeedbackUsers(ticket.assigned_to_id ? [ticket.assigned_to_id] : []);
                                  setShowCreateFeedbackModal(true);
                                }}
                                className="p-2 text-amber-400 hover:text-amber-300 bg-zinc-900 border border-zinc-800 rounded-lg transition"
                                title="Pedir Feedback desta Tarefa"
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}
                            {canManageTicket(ticket) && (
                              <button onClick={() => handleOpenEditModal(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Editar">
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canManageTicket(ticket) && (
                              <button onClick={() => handleDeleteTicket(ticket.id)} className="p-2 text-rose-500/80 hover:text-rose-400 bg-zinc-900 border border-zinc-800 rounded-lg transition" title="Apagar">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
                  <p className="text-xs text-zinc-400 mt-1">Gestão global de utilizadores e acessos do sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleExportCSV} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-medium text-xs px-4 py-2 rounded-xl transition shadow-sm">
                    <Download className="w-4 h-4 text-emerald-400" /> Exportar CSV Completo
                  </button>
                  <button onClick={handleOpenCreateUserModal} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs px-4 py-2 rounded-xl hover:bg-amber-500/20 transition">
                    <UserCheck className="w-4 h-4" /> Criar Utilizador
                  </button>
                </div>
              </div>

              {/* TABELA DE UTILIZADORES */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
                  <h2 className="text-sm font-semibold text-zinc-200">Gestão de Contas</h2>
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
                    const roleObj = ROLES_LIST.find(r => r.value.toLowerCase() === (user.role || "").toLowerCase()) || {
                      label: user.role || "Técnico",
                      color: "text-zinc-400 bg-zinc-800 border-zinc-700"
                    };
                    return (
                      <div key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-zinc-850/50 transition">
                        <div className="col-span-1 text-xs font-mono text-zinc-500">#{user.id}</div>
                        <div className="col-span-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${roleObj.color}`}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-zinc-200 truncate">{user.name || 'Sem nome'}</span>
                            <span className={`w-fit text-[10px] font-semibold px-2 py-0.5 rounded-full border ${roleObj.color}`}>
                              {roleObj.label}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-4 text-sm text-zinc-400 truncate">{user.email}</div>
                        <div className="col-span-2">
                          <select 
                            value={user.role} 
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            disabled={isMe}
                            className={`w-full bg-zinc-950 border text-xs rounded-xl px-3 py-1.5 focus:outline-none transition ${roleObj.color} ${isMe ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-zinc-600'}`}
                          >
                            {ROLES_LIST.map((r) => (
                              <option key={r.value} value={r.value} className="bg-zinc-900 text-zinc-200">
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 flex justify-end gap-2">
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isMe}
                            className={`p-2 rounded-xl border transition flex items-center justify-center ${isMe ? 'bg-zinc-950 border-zinc-900 text-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-950 border-zinc-800 text-red-400 hover:text-red-300 hover:bg-red-500/10'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SISTEMA DE LOGS (BIG BROTHER) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    🛡️ Registos do Sistema (Audit Logs)
                  </h2>
                  <button onClick={fetchAuditLogs} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition">
                    🔄 Atualizar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-zinc-400">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-950/50 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Data/Hora</th>
                        <th className="px-4 py-3 font-medium">Utilizador</th>
                        <th className="px-4 py-3 font-medium">Ação</th>
                        <th className="px-4 py-3 font-medium">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {auditLogs.length > 0 ? (
                        auditLogs.map((log) => {
                          const translated = translateLogAction(log.action, log.details);
                          return (
                            <tr key={log.id} className="hover:bg-zinc-800/20 transition">
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-zinc-400">{new Date(log.created_at).toLocaleString('pt-PT')}</td>
                              <td className="px-4 py-3"><span className="bg-zinc-800 border border-zinc-700/50 text-zinc-300 px-2 py-1 rounded text-xs font-medium">👤 {getLogUserName(log.user_id)}</span></td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${translated.badge === 'LOGIN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : log.action === 'DELETE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                                  {translated.badge}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs"><span className="font-medium text-zinc-200">{translated.text}</span><span className="text-zinc-600 block mt-0.5 text-[10px] font-mono">{log.details}</span></td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan="4" className="px-4 py-8 text-center text-zinc-500">Nenhum registo encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* APROVAÇÕES — só para chefias (Admin/Manager) validarem o dia de trabalho da equipa */}
          {activeTab === 'aprovacoes' && isManagerOrAdmin && (
            <div className="max-w-7xl mx-auto py-4 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-amber-400 flex items-center gap-2">
                    <ListFilter className="w-5 h-5" /> Centro de Aprovações
                  </h1>
                  <p className="text-xs text-zinc-400 mt-1">Auditoria e validação de relatórios diários da equipa</p>
                </div>
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg transition shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'A atualizar...' : 'Atualizar'}
                </button>
              </div>

              {/* A TUA INTERFACE BRUTAL COMEÇA AQUI */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                {/* Dashboard Dinâmico por Data */}
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-widest">
                      Ponto de Situação ({dashboardDate})
                    </h2>
                    <input 
                      type="date" 
                      value={dashboardDate}
                      onChange={(e) => setDashboardDate(e.target.value)}
                      className="bg-[#18181b] border border-[#27272a] text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-yellow-600 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dashboardCardsData.map(tec => (
                      <div key={tec.id} className={`bg-[#18181b] border ${tec.corBorda} rounded-xl p-4 flex flex-col justify-between shadow-sm transition-all hover:bg-[#27272a]`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-zinc-200 font-medium truncate pr-2">{tec.nome}</span>
                          <span className="text-xs">{tec.icone}</span>
                        </div>
                        <div className="flex justify-between items-end mt-2">
                          <span className={`text-xs font-medium ${tec.corTexto}`}>{tec.status}</span>
                          <span className="text-[10px] text-zinc-600 font-mono">{tec.hora}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Barra de Filtros */}
                <div className="bg-[#18181b] border border-[#27272a] p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4 items-center shadow-md">
                  <div className="flex-1 w-full">
                    <input 
                      type="text" 
                      placeholder="Pesquisar por técnico ou email..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-[#27272a] border border-[#3f3f46] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-600 transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-[#27272a] border border-[#3f3f46] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-600 cursor-pointer">
                      <option value="">Qualquer Estado</option>
                      <option value="Submetido">🟡 Submetido (Por Validar)</option>
                      <option value="Validado">🟢 Validado</option>
                      <option value="Rascunho">🔴 Recusado/Rascunho</option>
                    </select>
                  </div>
                  <div className="w-full md:w-48">
                    <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="w-full bg-[#27272a] border border-[#3f3f46] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-yellow-600 cursor-pointer">
                      <option value="">Todo o Ano</option>
                      <option value="1">Janeiro</option><option value="2">Fevereiro</option><option value="3">Março</option><option value="4">Abril</option><option value="5">Maio</option><option value="6">Junho</option><option value="7">Julho</option><option value="8">Agosto</option><option value="9">Setembro</option><option value="10">Outubro</option><option value="11">Novembro</option><option value="12">Dezembro</option>
                    </select>
                  </div>
                </div>

                {/* Grelha Principal: Lista Esquerda e Detalhes Direita */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Lista de Utilizadores */}
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/80">
                    {filteredUsersReports.length === 0 ? (
                      <p className="text-xs text-zinc-500 text-center py-8">Sem utilizadores ou a carregar...</p>
                    ) : (
                      filteredUsersReports.map(item => (
                        <div 
                          key={item.user_id}
                          onClick={() => setSelectedAdminUser(item)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${selectedAdminUser?.user_id === item.user_id ? 'bg-blue-600/10 border-blue-500/40 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                              {item.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-[11px] text-zinc-500 truncate">{item.reports.length} relatório(s)</p>
                            </div>
                          </div>
                          <span className="text-xs text-zinc-500 shrink-0">➔</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Relatórios do Utilizador Selecionado */}
                  <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl p-4 max-h-[600px] overflow-y-auto space-y-4">
                    {!selectedAdminUser ? (
                      <div className="h-full flex items-center justify-center py-16 text-center text-xs text-zinc-500">
                        Seleciona um colaborador à esquerda para inspecionar.
                      </div>
                    ) : selectedAdminUser.reports.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-16 text-center text-xs text-zinc-500">
                        Este colaborador não tem relatórios com os filtros atuais.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="pb-3 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-100">Relatórios de: {selectedAdminUser.name}</h3>
                            <span className="text-xs font-mono text-zinc-500">{selectedAdminUser.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={selectedApprovalDate}
                              onChange={(e) => setSelectedApprovalDate(e.target.value)}
                              className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
                            />
                            {selectedApprovalDate && (
                              <button
                                type="button"
                                onClick={() => setSelectedApprovalDate("")}
                                className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                                title="Limpar filtro de data"
                              >
                                Limpar
                              </button>
                            )}
                          </div>
                        </div>

                        {(() => {
                          const relatoriosFiltradosPorData = selectedAdminUser.reports.filter((rep) => {
                            // Se não houver data selecionada no calendário, mostra todos
                            if (!selectedApprovalDate) return true;
                            // Normaliza a data do relatório (YYYY-MM-DD)
                            const repDateStr = String(rep.date).split("T")[0];
                            return repDateStr === selectedApprovalDate;
                          });

                          if (relatoriosFiltradosPorData.length === 0) {
                            return (
                              <div className="py-10 text-center text-xs text-zinc-500">
                                Sem relatórios para a data selecionada.
                              </div>
                            );
                          }

                          return relatoriosFiltradosPorData.map(rep => (
                          <div key={rep.id} className={`bg-zinc-900 border ${rep.status === 'Submetido' ? 'border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.05)]' : 'border-zinc-800'} rounded-xl p-5 space-y-4 transition`}>
                            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-zinc-800/60">
                              <span className="text-sm font-mono font-bold text-blue-400">📅 Data: {rep.date.split('T')[0]}</span>
                              
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${rep.status === 'Validado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : rep.status === 'Submetido' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                                  {rep.status.toUpperCase()}
                                </span>

                                {rep.status === 'Submetido' && (
                                  <>
                                    <button onClick={() => handleUpdateReportStatus(rep.id, 'Validado')} className="text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded transition">
                                      ✅ Validar
                                    </button>
                                    <button onClick={() => handleUpdateReportStatus(rep.id, 'Recusado')} className="text-xs font-medium bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded transition">
                                      ❌ Recusar
                                    </button>
                                  </>
                                )}
                                <button onClick={() => exportAdminReportPDF(rep, selectedAdminUser.name)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-1.5 rounded transition flex items-center gap-1">
                                  📥 Exportar PDF
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-400 bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
                              <div>🚗 Kms: <strong className="text-zinc-200 block sm:inline mt-1 sm:mt-0">{rep.kilometers || 0} km</strong></div>
                              <div>⏱️ H. Extra: <strong className="text-zinc-200 block sm:inline mt-1 sm:mt-0">{rep.overtime_hours || 0} h</strong></div>
                            </div>

                            {rep.summary && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Resumo do Dia</p>
                                <p className="text-sm text-zinc-200 bg-[#18181b] p-3 rounded-lg border border-zinc-800/60 leading-relaxed">{rep.summary}</p>
                              </div>
                            )}

                            {rep.detailed_report && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Relatório Detalhado</p>
                                <p className="text-xs text-zinc-300 bg-[#18181b] p-3 rounded-lg border border-zinc-800/60 whitespace-pre-wrap leading-relaxed">{rep.detailed_report}</p>
                              </div>
                            )}

                            {rep.image_path && (
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Fotografia Anexada</p>
                                <a href={`${API_URL}/${rep.image_path}`} target="_blank" rel="noopener noreferrer">
                                  <img src={`${API_URL}/${rep.image_path}`} alt="Anexo do relatório" className="max-h-48 rounded-lg border border-zinc-700 hover:border-blue-500 transition shadow-sm" />
                                </a>
                              </div>
                            )}
                          </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
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
                    setSelectedClientProjects([]);
                    setSelectedNewClientProjectId('');
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
                          {proj.teams && proj.teams.length > 0 ? (
                            proj.teams.map(t => (
                              <div key={t.id} className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md text-zinc-300">
                                <Users className="w-3 h-3 text-blue-400" />
                                <span className="truncate max-w-[110px]">{t.name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800/60 px-2 py-0.5 rounded-md text-zinc-500 italic">
                              Sem equipas
                            </div>
                          )}

                          {clientNameStr && (
                            <div className="flex items-center gap-1.5 bg-blue-950/40 border border-blue-500/30 px-2.5 py-1 rounded-md text-blue-300">
                              <Building2 className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[120px]">{clientNameStr}</span>
                            </div>
                          )}

                          {proj.due_date && (
                            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-md text-zinc-300 font-mono">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{proj.due_date.split('T')[0]}</span>
                            </div>
                          )}
                        </div>

                        {/* CÁLCULO DINÂMICO DO PROJETO COM HORAS TRABALHADAS + TEMPO REAL */}
                        {(() => {
                          // Tarefas deste projeto
                          const projTasks = tickets.filter(t => t.project_id === proj.id);
                          
                          // Soma das estimativas de todas as tarefas
                          const totalEstimated = projTasks.reduce((acc, t) => acc + (Number(t.estimated_hours) || 0), 0);
                          
                          // Soma das horas já feitas em cada tarefa + segundos em direto se a tarefa estiver a contar
                          const totalTracked = projTasks.reduce((acc, t) => {
                            const isLive = activeTimerTask?.id === t.id;
                            const liveHours = isLive ? (secondsElapsed / 3600) : 0;
                            return acc + (Number(t.tracked_hours) || 0) + liveHours;
                          }, 0);

                          const percent = totalEstimated > 0 
                            ? Math.min(Math.round((totalTracked / totalEstimated) * 100), 100) 
                            : 0;

                          const isOvertime = totalEstimated > 0 && totalTracked > totalEstimated;

                          return (
                            <div className="mt-3 space-y-1.5">
                              {/* Indicadores de Percentagem e Horas HH:MM */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-zinc-300">
                                  Progresso: <span className={isOvertime ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>{percent}%</span>
                                </span>
                                <span className="text-[11px] font-mono text-zinc-400">
                                  ⏱️ {formatToHHMM(totalTracked)} / 🎯 {formatToHHMM(totalEstimated)}
                                </span>
                              </div>

                              {/* Barra de Progresso do Projeto */}
                              <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ease-out ${
                                    isOvertime 
                                      ? 'bg-red-500' 
                                      : projTasks.some(t => t.is_running) 
                                        ? 'bg-emerald-400' 
                                        : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}

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
                    <button onClick={() => setTaskViewMode('knowledge')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${taskViewMode === 'knowledge' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}>
                      🧠 Base de Conhecimento
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

                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none">
                    <option value="">Qualquer tipo</option>
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Redes">Redes</option>
                    <option value="Geral">Geral</option>
                  </select>

                  {taskViewMode === 'list' && (
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none">
                      <option value="">Estados (Ativos)</option>
                      <option value="To Do">Pendente</option>
                      <option value="In Progress">Em progresso</option>
                      <option value="In Review">Em revisão</option>
                      <option value="Done">Concluído</option>
                    </select>
                  )}

                  {/* --- NOVOS FILTROS RÁPIDOS --- */}
                  <button
                    onClick={() => setFilterCreatedByMe(!filterCreatedByMe)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                      filterCreatedByMe 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 shadow-sm' 
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    👤 Criadas por mim
                  </button>

                  {isManagerOrAdmin && (
                    <button
                      onClick={() => setFilterUnassigned(!filterUnassigned)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                        filterUnassigned 
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-sm' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      📋 Não atribuídas (Para distribuir)
                    </button>
                  )}

                  <button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-zinc-100 text-zinc-950 font-medium text-sm px-4 py-2 rounded-xl hover:bg-white transition ml-auto sm:ml-0">
                    <Plus className="w-4 h-4" /> Nova Tarefa
                  </button>
                </div>
              </div>

              {taskViewMode === 'knowledge' ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex-1 overflow-y-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-100">Base de Conhecimento</h2>
                      <p className="text-xs text-zinc-400 mt-1">Consulta tarefas concluídas por ti e pela tua equipa para encontrar soluções passadas.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={knowledgeSort || 'newest'} 
                        onChange={e => setKnowledgeSort(e.target.value)} 
                        className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none"
                      >
                        <option value="newest">Mais recente</option>
                        <option value="oldest">Mais antigo</option>
                      </select>

                      <span className="text-xs font-medium text-zinc-500">Filtrar por tipo:</span>
                      <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-xl px-3 py-2 focus:outline-none">
                        <option value="">Todas as Categorias</option>
                        <option value="Software">Software</option>
                        <option value="Hardware">Hardware</option>
                        <option value="Redes">Redes</option>
                        <option value="Geral">Geral</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {availableTickets
                      .filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()))
                      .filter(t => typeFilter === '' || t.task_type === typeFilter)
                      .sort((a, b) => {
                        if (knowledgeSort === 'oldest') {
                          return a.id - b.id;
                        }
                        return b.id - a.id;
                      })
                      .map(ticket => {
                        const assignee = getAssigneeName(ticket.assigned_to_id);
                        return (
                          <div key={ticket.id} onClick={() => setSelectedKnowledgeTicket(ticket)} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl hover:border-zinc-700 transition group flex flex-col sm:flex-row gap-4 justify-between items-start shadow-sm cursor-pointer">
                            <div className="space-y-3 flex-1 w-full min-w-0">
                              
                              {/* CABEÇALHO DO TICKET */}
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">#{ticket.id}</span>
                                <h3 className="font-medium text-sm text-zinc-100 truncate">{ticket.title}</h3>
                                {ticket.task_type && ticket.task_type !== 'Geral' && (
                                  <span className="text-[10px] px-2 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 font-medium whitespace-nowrap">
                                    {ticket.task_type}
                                  </span>
                                )}
                              </div>
                              
                              {/* CAIXA DE CONHECIMENTO (PROBLEMA + SOLUÇÃO + ANEXOS) */}
                              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/60 space-y-4">
                                
                                {/* PROBLEMA ORIGINAL */}
                                <div>
                                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5" /> Problema Original
                                  </p>
                                  <p className="text-xs text-zinc-400 leading-relaxed">
                                    {ticket.description || 'Sem descrição inicial registada.'}
                                  </p>
                                </div>

                                {/* SOLUÇÃO / DESCRIÇÃO FINAL */}
                                <div className="pt-3 border-t border-zinc-800/60">
                                  <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Solução Aplicada
                                  </p>
                                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                                    {ticket.final_description || 'Tarefa concluída sem relatório detalhado.'}
                                  </p>
                                </div>

                                {/* ANEXOS / IMAGENS */}
                                {ticket.attachment_path && (
                                  <div className="pt-3 border-t border-zinc-800/60">
                                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                      <Paperclip className="w-3.5 h-3.5" /> Ficheiros Anexados
                                    </p>
                                    
                                    {/* Verifica se é uma imagem pela extensão */}
                                    {ticket.attachment_path.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                      <a href={`${API_URL}/${ticket.attachment_path}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="block max-w-sm rounded-xl overflow-hidden border border-zinc-700 hover:border-blue-500 transition shadow-sm">
                                        <img 
                                          src={`${API_URL}/${ticket.attachment_path}`} 
                                          alt="Anexo da Tarefa" 
                                          className="w-full h-auto object-cover max-h-48"
                                        />
                                      </a>
                                    ) : (
                                      <a href={`${API_URL}/${ticket.attachment_path}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-xl w-fit border border-blue-500/20 hover:bg-blue-500/20 transition">
                                        <Download className="w-4 h-4" /> Transferir Documento
                                      </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* RODAPÉ DO TICKET */}
                              <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-4 pt-1">
                                <span className="flex items-center gap-1"><Folder className="w-3.5 h-3.5" /> {getProjectName(ticket.project_id)}</span>
                                {assignee && <span className="text-emerald-400 font-medium flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Resolvido por: {assignee}</span>}
                                {ticket.due_date && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {ticket.due_date.split('T')[0]}</span>}
                              </div>
                            </div>
                            
                            {/* BOTÃO DE COMENTÁRIOS */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); openComments(ticket); }} 
                              className="shrink-0 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-3 py-2 rounded-xl transition flex items-center gap-2 mt-2 sm:mt-0"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Ver Discussão
                            </button>
                          </div>
                        );
                    })}
                    {availableTickets.filter(t => t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase()) && (typeFilter === '' || t.task_type === typeFilter)).length === 0 && (
                      <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                        Nenhuma tarefa concluída encontrada nesta categoria.
                      </div>
                    )}
                  </div>
                </div>
              ) : taskViewMode === 'kanban' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 overflow-x-auto pb-4 items-start">
                  {kanbanColumns.map(col => {
                    // 🛑 FILTRO DE ÚLTIMA INSTÂNCIA NA KANBAN
                    // Garante que só chegam ao ecrã os tickets do próprio utilizador (se for Member),
                    // independentemente do que vier de sortedKanbanTickets/availableTickets/API.
                    const columnTickets = sortedKanbanTickets
                      .filter(t => t.status === col.id)
                      .filter(t => {
                        if (isManagerOrAdmin) return true;
                        return (
                          t.assigned_to_id === currentUserInfo?.id || 
                          t.creator_id === currentUserInfo?.id ||
                          t.sub_tasks?.some(sub => sub.assigned_to_id === currentUserInfo?.id)
                        );
                      });
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
                              const isOwnerOrCreator = canManageTicket(ticket);
                              return (
                                <div 
                                  key={ticket.id}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, ticket.id)}
                                  onClick={() => handleOpenEditModal(ticket)}
                                  className={`bg-zinc-900/90 border p-3.5 rounded-2xl shadow-sm transition-all duration-200 cursor-pointer flex flex-col gap-3 group relative hover:shadow-md ${
                                    ticket.is_running 
                                      ? 'border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30' 
                                      : 'border-zinc-800 hover:border-zinc-700'
                                  }`}
                                >
                                  {/* CABEÇALHO DO CARD COM BADGE SÓ COM O NOME */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono text-zinc-500">#{ticket.id}</span>
                                      {ticket.priority && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                          {ticket.priority}
                                        </span>
                                      )}
                                      {ticket.is_running && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                          <span className="truncate max-w-[90px]">
                                            {getAssigneeName(ticket.assigned_to_id) || 'Ativo'}
                                          </span>
                                        </span>
                                      )}
                                    </div>

                                    {/* BOTÕES DE AÇÃO COMPLETOS */}
                                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                                      {/* CONTROLO DINÂMICO DE PLAY / AGARRAR */}
                                      {!isDone && (
                                        ticket.assigned_to_id === currentUserInfo?.id ? (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              isRunning ? stopTimer() : startTimer(ticket);
                                            }}
                                            title={ticket.is_running ? "Pausar Cronómetro" : "Iniciar Cronómetro"}
                                            className={`p-1.5 rounded-lg text-xs transition cursor-pointer bg-zinc-900 border border-zinc-800 flex items-center justify-center ${
                                              ticket.is_running
                                                ? "text-emerald-400 border-emerald-500/30"
                                                : "text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                                            }`}
                                          >
                                            {ticket.is_running ? (
                                              <Pause className="w-3.5 h-3.5 fill-current" />
                                            ) : (
                                              <Play className="w-3.5 h-3.5 fill-current" />
                                            )}
                                          </button>
                                        ) : !ticket.assigned_to_id ? (
                                          <button
                                            type="button"
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              try {
                                                const headers = { Authorization: `Bearer ${token}` };
                                                await axios.put(`${API_URL}/tickets/${ticket.id}/grab`, {}, { headers });
                                                fetchData();
                                              } catch (err) {
                                                alert(err.response?.data?.detail || "Erro ao assumir a tarefa.");
                                              }
                                            }}
                                            title="Agarrar esta tarefa para mim"
                                            className="p-1.5 rounded-lg text-xs transition cursor-pointer bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 flex items-center justify-center"
                                          >
                                            <Hand className="w-3.5 h-3.5" />
                                          </button>
                                        ) : null
                                      )}

                                      {/* BOTÃO DE EDITAR (Apenas Criador ou Gestores/Admin) */}
                                      {((currentUserInfo?.role && ['admin', 'manager', 'gestor de operações', 'gestor de projeto', 'gestor de projetos'].includes(currentUserInfo.role.toLowerCase())) || ticket.creator_id === currentUserInfo?.id) && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleOpenEditModal(ticket); }}
                                          title="Editar Tarefa"
                                          className="p-1.5 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* 3. Concluir com Relatório (✓) */}
                                      {(isOwnerOrCreator || isManagerOrAdmin) && !isDone && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            openCompleteModal(ticket);
                                          }}
                                          title="Concluir com Relatório"
                                          className="p-1.5 bg-zinc-900 border border-zinc-800 text-emerald-400 hover:text-emerald-300 rounded-md transition cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* 4. Comentários (💬) */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openComments(ticket);
                                        }}
                                        title="Comentários"
                                        className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-md transition cursor-pointer"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                      </button>

                                      {/* 5. Pedir Feedback (⭐) */}
                                      {isManagerOrAdmin && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFeedbackTargetTicket(ticket);
                                            setNewFeedbackTitle(`Feedback da Tarefa #${ticket.id}: ${ticket.title}`);
                                            setNewFeedbackDesc("");
                                            const defaultDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
                                            setNewFeedbackDeadline(defaultDate);
                                            setNewFeedbackUsers(ticket.assigned_to_id ? [ticket.assigned_to_id] : []);
                                            setShowCreateFeedbackModal(true);
                                          }}
                                          title="Pedir Feedback desta Tarefa"
                                          className="p-1.5 bg-zinc-900 border border-zinc-800 text-amber-400 hover:text-amber-300 hover:border-amber-500/30 rounded-md transition cursor-pointer"
                                        >
                                          <Star className="w-3.5 h-3.5 fill-current" />
                                        </button>
                                      )}

                                      {/* 6. Histórico / Logs (📜) */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openTaskLogsModal(ticket);
                                        }}
                                        title="Histórico de Alterações"
                                        className="p-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-400 rounded-md transition cursor-pointer"
                                      >
                                        📜
                                      </button>

                                      {/* 7. Apagar (🗑️) */}
                                      {canManageTicket(ticket) && (
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
                                          title="Apagar Tarefa"
                                          className="p-1.5 bg-zinc-900 border border-zinc-800 text-red-400 hover:text-red-300 rounded-md transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* TÍTULO E DESCRIÇÃO */}
                                  <div>
                                    <h4 className="font-medium text-sm text-zinc-100 leading-snug">{ticket.title}</h4>
                                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{ticket.description || 'Sem descrição'}</p>
                                  </div>

                                  {/* CÁLCULO DINÂMICO COM SEGUNDOS EM TEMPO REAL */}
                                  {(() => {
                                    const isCurrentlyActive = activeTimerTask?.id === ticket.id;
                                    const currentLiveHours = isCurrentlyActive ? (secondsElapsed / 3600) : 0;
                                    
                                    const tracked = (Number(ticket.tracked_hours) || 0) + currentLiveHours;
                                    const estimated = Number(ticket.estimated_hours) || 0;
                                    const percent = estimated > 0 ? Math.min(Math.round((tracked / estimated) * 100), 100) : 0;
                                    const isOvertime = estimated > 0 && tracked > estimated;

                                    return (
                                      <>
                                        {/* BARRA DE PROGRESSO EM TEMPO REAL */}
                                        <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800/80 my-0.5">
                                          <div 
                                            className={`h-full rounded-full transition-all duration-300 ease-out ${
                                              isOvertime 
                                                ? 'bg-red-500' 
                                                : ticket.is_running 
                                                  ? 'bg-emerald-400' 
                                                  : 'bg-blue-500'
                                            }`} 
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>

                                        {/* TEMPO EM HH:MM (Atualiza segundo a segundo enquanto trabalhas) */}
                                        <div className="flex flex-col gap-2">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className={`flex items-center gap-1.5 font-mono font-medium ${ticket.is_running ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                                              <Clock className={`w-3.5 h-3.5 ${ticket.is_running ? 'animate-spin text-emerald-400' : 'text-zinc-500'}`} />
                                              <span>{formatToHHMM(tracked)}</span>
                                              <span className="text-zinc-600">/</span>
                                              <span className="text-zinc-500">{formatToHHMM(ticket.estimated_hours)}</span>
                                            </span>

                                            {ticket.due_date ? (
                                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                                ticket.due_date.split('T')[0] < todayStr && ticket.status !== 'Done'
                                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                  : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                                              }`}>
                                                📅 {ticket.due_date.split('T')[0]}
                                              </span>
                                            ) : (
                                              <span className="text-[10px] text-zinc-600 italic">Sem prazo</span>
                                            )}
                                          </div>

                                          <div className="flex items-center justify-between text-[11px] pt-1">
                                            <span className="bg-zinc-950 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800 truncate max-w-[140px]">
                                              📁 {getProjectName(ticket.project_id)}
                                            </span>
                                            {assignee && <span className="text-emerald-400 font-medium">👤 {assignee}</span>}
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
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
                                {ticket.task_type && ticket.task_type !== 'Geral' && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getTaskTypeBadgeStyle(ticket.task_type)}`}>
                                    {ticket.task_type === 'Software' ? '💻 ' : ticket.task_type === 'Hardware' ? '🔧 ' : '🌐 '}{ticket.task_type}
                                  </span>
                                )}
                                {isDone && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CONCLUÍDO</span>}
                                {isRunning && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">ATIVO</span>}
                              </div>
                              <p className="text-xs text-zinc-400 pl-7">{ticket.description || 'Sem descrição'}</p>

                              {/* Subtarefas na Vista de Lista */}
                              {ticket.sub_tasks && ticket.sub_tasks.some(s => s.assigned_to_id === currentUserInfo?.id) && (
                                <div className="ml-7 mt-2 bg-indigo-950/30 border border-indigo-500/20 rounded-lg p-2 space-y-1 max-w-md">
                                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block">
                                    Subtarefas atribuídas a ti:
                                  </span>
                                  {ticket.sub_tasks
                                    .filter(s => s.assigned_to_id === currentUserInfo?.id)
                                    .map(sub => {
                                      const subStatus = sub.status || "Pendente";
                                      return (
                                        <div key={sub.id} className="flex items-center justify-between gap-2 text-xs text-zinc-300">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border shrink-0 ${
                                              subStatus === 'Aprovada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                              subStatus === 'Aguardar Aprovação' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                              'bg-zinc-900 text-zinc-400 border-zinc-800'
                                            }`}>
                                              {subStatus}
                                            </span>
                                            <span className={sub.is_completed ? "line-through text-zinc-500 truncate" : "truncate"}>{sub.title}</span>
                                          </div>
                                          {subStatus === 'Pendente' && (
                                            <button
                                              type="button"
                                              onClick={() => handleSubmitSubtaskForApproval(sub.id)}
                                              className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-[9px] font-medium px-1.5 py-0.5 rounded-lg transition shrink-0"
                                            >
                                              Submeter
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              )}

                              <div className="text-[11px] text-zinc-500 pl-7 flex items-center gap-3">
                                <span className="font-mono">
                                  ⏱️ <strong>{formatToHHMM(ticket.tracked_hours)}</strong> / 🎯 <strong>{formatToHHMM(ticket.estimated_hours)}</strong>
                                </span>
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
                                <option value="To Do">Pendente</option>
                                <option value="In Progress">Em progresso</option>
                                <option value="In Review">Em revisão</option>
                                <option value="Done">Concluído</option>
                              </select>
                              {!isDone && (
                                <button onClick={() => openCompleteModal(ticket)} className="p-2 text-emerald-400 hover:text-emerald-300 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Concluir com Relatório">
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              {!ticket.assigned_to_id && (
                                <button onClick={() => handleGrabTask(ticket)} className="p-2 text-amber-400 hover:text-amber-300 bg-zinc-950 border border-amber-500/30 rounded-lg transition" title="Agarrar Tarefa">
                                  ✋
                                </button>
                              )}
                              {(() => {
                                const canPlay = !ticket.assigned_to_id || ticket.assigned_to_id === currentUserInfo?.id;
                                const disabled = isDone || !canPlay;
                                return (
                                  <button
                                    onClick={() => (isRunning ? stopTimer() : startTimer(ticket))}
                                    disabled={disabled}
                                    className={`p-2 rounded-lg border transition ${disabled ? 'opacity-40 cursor-not-allowed bg-zinc-950 border-zinc-900 text-zinc-700' : isRunning ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30' : 'bg-zinc-950 text-zinc-400 hover:text-zinc-100 border-zinc-800'}`}
                                    title={isRunning ? "Parar Cronómetro" : !canPlay ? "Tarefa atribuída a outro utilizador" : "Iniciar Cronómetro"}
                                  >
                                    {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                                  </button>
                                );
                              })()}
                              <button onClick={() => openComments(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Comentários">
                                <MessageSquare className="w-4 h-4" />
                              </button>
                              {isManagerOrAdmin && (
                                <button
                                  onClick={() => {
                                    setFeedbackTargetTicket(ticket);
                                    setNewFeedbackTitle(`Feedback da Tarefa #${ticket.id}: ${ticket.title}`);
                                    setNewFeedbackDesc("");
                                    const defaultDate = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
                                    setNewFeedbackDeadline(defaultDate);
                                    setNewFeedbackUsers(ticket.assigned_to_id ? [ticket.assigned_to_id] : []);
                                    setShowCreateFeedbackModal(true);
                                  }}
                                  className="p-2 text-amber-400 hover:text-amber-300 bg-zinc-950 border border-zinc-800 rounded-lg transition"
                                  title="Pedir Feedback desta Tarefa"
                                >
                                  <Star className="w-4 h-4 fill-current" />
                                </button>
                              )}
                              {(() => {
                                const userRole = (currentUserInfo?.role || '').toLowerCase();
                                const canEditTicket = ['admin', 'manager', 'gestor de operações', 'gestor de projeto', 'gestor de projetos'].includes(userRole) || ticket.creator_id === currentUserInfo?.id;
                                if (!canEditTicket) return null;
                                return (
                                  <button onClick={() => handleOpenEditModal(ticket)} className="p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Editar">
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                );
                              })()}
                              {canManageTicket(ticket) && (
                                <button onClick={() => handleDeleteTicket(ticket.id)} className="p-2 text-red-400 hover:text-red-300 bg-zinc-950 border border-zinc-800 rounded-lg transition" title="Apagar">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
                    const teamProjects = (projects || availableProjects || []).filter(p => {
                      if (p.team_ids && Array.isArray(p.team_ids)) {
                        return p.team_ids.includes(team.id);
                      }
                      if (p.teams && Array.isArray(p.teams)) {
                        return p.teams.some(t => t.id === team.id);
                      }
                      return p.team_id === team.id;
                    });
                    const leaderName = getTeamLeaderName(team);
                    return (
                      <div key={team.id} className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{team.name}</h2>
                            <p className="text-xs text-zinc-400 mt-0.5">{team.description || 'Sem descrição'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* BOTÃO PARA ABRIR O POOL DE TAREFAS DA EQUIPA */}
                            <button 
                              onClick={() => {
                                setActiveTeamForTasks(team);
                                setShowTeamTasksModal(true);
                              }}
                              className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition"
                              title="Ver todas as tarefas desta equipa"
                            >
                              🎯 Pool de Tarefas
                            </button>
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
                              {teamProjects.length === 0 ? (
                                <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-xl text-xs text-zinc-600 italic">
                                  Nenhum projeto associado.
                                </div>
                              ) : (
                                teamProjects.map(proj => (
                                  <div 
                                    key={proj.id} 
                                    onClick={() => openProjectTasksModal(proj)}
                                    className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-700 transition"
                                  >
                                    <div>
                                      <span className="text-xs font-semibold text-zinc-200 block">{proj.name}</span>
                                      <span className="text-[10px] text-zinc-500 font-mono">
                                        {proj.due_date ? `Prazo: ${proj.due_date.split('T')[0]}` : 'Sem prazo'}
                                      </span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                      {proj.progress_percentage || 0}%
                                    </span>
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

          {/* MENSAGENS COM SUPORTE A DIRETAS, PROJETOS E SUBCHATS */}
          {activeTab === 'messages' && (
            <div className="absolute inset-x-8 top-0 bottom-8 flex bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
              
              {/* COLUNA ESQUERDA: Lista de Conversas ou Seleção de Nova Conversa */}
              <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/50">
                <div className="p-4 border-b border-zinc-800 flex flex-col gap-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-lg font-bold text-white">
                        {showNewChatView ? 'Novo Canal / Subchat' : 'Mensagens'}
                      </h2>
                      <p className="text-xs text-zinc-400">
                        {showNewChatView ? 'Seleciona os participantes' : 'Conversas de equipa e projetos'}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowNewChatView(!showNewChatView);
                        setSelectedUserIdsForNewChat([]);
                        setGroupChatName('');
                        setNewChatProjectId(selectedChatProjectId || '');
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-lg transition ${showNewChatView ? 'bg-zinc-800 text-zinc-300' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                      {showNewChatView ? '✕ Cancelar' : '+ Nova'}
                    </button>
                  </div>

                  {/* SELETOR DE CONTEXTO: CONVERSAS DIRETAS VS PROJETOS */}
                  {!showNewChatView && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setChatContext('direct');
                            setActiveChatRoom(null);
                          }}
                          className={`py-1.5 rounded-lg font-medium transition ${
                            chatContext === 'direct' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          💬 Diretas / Geral
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChatContext('project');
                            setActiveChatRoom(null);
                            if (!selectedChatProjectId && availableProjects.length > 0) {
                              setSelectedChatProjectId(String(availableProjects[0].id));
                            }
                          }}
                          className={`py-1.5 rounded-lg font-medium transition ${
                            chatContext === 'project' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          📁 Projetos
                        </button>
                      </div>

                      {chatContext === 'project' && (
                        <div className="flex gap-2 items-center">
                          <select
                            value={selectedChatProjectId}
                            onChange={(e) => {
                              setSelectedChatProjectId(e.target.value);
                              setActiveChatRoom(null);
                            }}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                          >
                            <option value="">Todos os Projetos</option>
                            {availableProjects.map(p => (
                              <option key={p.id} value={p.id}>📁 {p.name}</option>
                            ))}
                          </select>
                          {selectedChatProjectId && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const headers = { Authorization: `Bearer ${token}` };
                                    await axios.post(`${API_URL}/chat/projects/${selectedChatProjectId}/sync-general?current_user_id=${currentUserInfo.id}`, {}, { headers });
                                    fetchChatRooms();
                                  } catch (err) {
                                    alert("Erro ao sincronizar canal geral do projeto.");
                                  }
                                }}
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs transition"
                                title="Sincronizar canal geral do projeto"
                              >
                                🔄
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewChatProjectId(selectedChatProjectId);
                                  setSelectedUserIdsForNewChat([]);
                                  setGroupChatName('');
                                  setShowNewChatView(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 cursor-pointer shadow-sm"
                                title="Criar um subchat para este projeto"
                              >
                                + Subchat
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {showNewChatView ? (
                  /* VISTA DE CRIAÇÃO DE CANAL / SUBCHAT */
                  <div className="flex-1 flex flex-col overflow-hidden p-3">
                    {/* Seletor de Associação de Projeto */}
                    <div className="mb-2">
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Associar a um Projeto (Opcional)
                      </label>
                      <select
                        value={newChatProjectId}
                        onChange={(e) => setNewChatProjectId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Sem Projeto (Chat Geral/Direto)</option>
                        {availableProjects.map(p => (
                          <option key={p.id} value={p.id}>📁 {p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Nome do Canal ou Subchat */}
                    <div className="mb-3">
                      <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                        Nome do Canal / Subchat
                      </label>
                      <input 
                        type="text"
                        value={groupChatName}
                        onChange={e => setGroupChatName(e.target.value)}
                        placeholder="Ex: #alinhamento-campo, #design..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Participantes ({selectedUserIdsForNewChat.length} selecionados)
                    </p>

                    {/* Lista de Colaboradores para escolher participantes do Subchat */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {(() => {
                        // Se estiver a criar um subchat de projeto, filtra apenas colaboradores das equipas desse projeto
                        let targetUsers = usersList.filter(u => u.id !== currentUserInfo.id);

                        if (newChatProjectId) {
                          const projObj = availableProjects.find(p => p.id === Number(newChatProjectId));
                          if (projObj) {
                            const teamIds = projObj.team_ids || (projObj.teams ? projObj.teams.map(t => t.id) : []);
                            const allowedMemberIds = new Set();

                            teams
                              .filter(t => teamIds.includes(t.id))
                              .forEach(t => {
                                if (t.owner_id) allowedMemberIds.add(t.owner_id);
                                if (t.leader_id) allowedMemberIds.add(t.leader_id);
                                t.members?.forEach(m => allowedMemberIds.add(m.id));
                              });

                            targetUsers = targetUsers.filter(u => allowedMemberIds.has(u.id));
                          }
                        }

                        if (targetUsers.length === 0) {
                          return (
                            <div className="text-center py-8 text-xs text-zinc-500 italic">
                              Nenhum membro encontrado nas equipas deste projeto.
                            </div>
                          );
                        }

                        return targetUsers.map(user => {
                          const isSelected = selectedUserIdsForNewChat.includes(user.id);
                          return (
                            <div 
                              key={user.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedUserIdsForNewChat(selectedUserIdsForNewChat.filter(id => id !== user.id));
                                } else {
                                  setSelectedUserIdsForNewChat([...selectedUserIdsForNewChat, user.id]);
                                }
                              }}
                              className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between border ${
                                isSelected
                                  ? 'bg-blue-600/20 border-blue-500/50 text-white'
                                  : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-200 shrink-0">
                                  {(user.name || user.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{user.name || 'Sem nome'}</p>
                                  <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700'
                              }`}>
                                {isSelected ? '✓' : ''}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Botão de Criação com deteção de duplicados */}
                    {selectedUserIdsForNewChat.length > 0 && (
                      <button 
                        onClick={async () => {
                          const createRoomRequest = async (force = false) => {
                            try {
                              const headers = { Authorization: `Bearer ${token}` };
                              const payload = {
                                name: groupChatName.trim() || `Canal (${selectedUserIdsForNewChat.length + 1})`,
                                type: newChatProjectId ? "project" : (selectedUserIdsForNewChat.length === 1 ? "direct" : "group"),
                                member_ids: selectedUserIdsForNewChat,
                                project_id: newChatProjectId ? Number(newChatProjectId) : null,
                                force_create: force
                              };

                              const res = await axios.post(`${API_URL}/chat/rooms?current_user_id=${currentUserInfo.id}`, payload, { headers });
                              
                              // Aviso de canais duplicados
                              if (res.data.warning) {
                                const confirmCreate = window.confirm(res.data.message);
                                if (confirmCreate) {
                                  await createRoomRequest(true);
                                }
                                return;
                              }

                              setShowNewChatView(false);
                              await fetchChatRooms();
                              openChatRoom({ id: res.data.room_id, name: res.data.name });
                            } catch (err) {
                              alert("Erro ao criar sala de chat.");
                            }
                          };

                          await createRoomRequest(false);
                        }}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-2.5 rounded-xl transition shadow-md"
                      >
                        Criar Canal / Conversa ({selectedUserIdsForNewChat.length} participantes)
                      </button>
                    )}
                  </div>
                ) : (
                  /* LISTA DINÂMICA DE CONVERSAS */
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {chatRooms.length === 0 ? (
                      <div className="text-center py-12 px-4 space-y-2">
                        <p className="text-xs text-zinc-500">
                          {chatContext === 'project' ? 'Sem canais associados a este projeto.' : 'Ainda não tens conversas ativas.'}
                        </p>
                      </div>
                    ) : (
                      chatRooms.map(room => (
                        <div 
                          key={room.id}
                          onClick={() => openChatRoom(room)}
                          className={`p-3 rounded-xl cursor-pointer transition border flex justify-between items-center ${activeChatRoom?.id === room.id ? 'bg-blue-600/10 border-blue-500/40 text-white' : 'border-transparent hover:bg-zinc-800/60 text-zinc-300'}`}
                        >
                          <div className="min-w-0 pr-2 flex-1 flex items-center gap-2.5">
                            {room.unread_count > 0 && (
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                {room.is_general && <span className="text-[10px] bg-blue-950/60 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30">Geral</span>}
                                <p className={`text-xs truncate ${room.unread_count > 0 ? 'font-bold text-white' : 'font-semibold'}`}>
                                  {room.name}
                                </p>
                              </div>
                              <p className="text-[11px] truncate mt-0.5 text-zinc-400">
                                {room.last_message || 'Sem mensagens'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-500 shrink-0">{room.last_time}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: Área Principal de Chat + Pesquisa + Fixar + IA */}
              <div className="flex-1 flex flex-col bg-zinc-900 overflow-hidden relative">
                {activeChatRoom ? (
                  <>
                    <div className="p-4 border-b border-zinc-800 flex flex-col gap-3 bg-zinc-950/35 shrink-0">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-white text-sm">{activeChatRoom.name}</h3>
                          <span className="text-xs text-emerald-400">● Ativo em tempo real</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Botão para Ver Membros da Sala */}
                          <button 
                            type="button"
                            onClick={() => setShowMembersDrawer(!showMembersDrawer)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                            title="Ver participantes desta sala"
                          >
                            👥 Membros ({activeChatRoom.members?.length || 0})
                          </button>

                          {/* Botão de Mensagens Afixadas */}
                          <button 
                            type="button"
                            onClick={() => setShowPinnedDrawer(!showPinnedDrawer)}
                            className="relative bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                          >
                            📌 Afixadas ({pinnedMessages.length})
                          </button>

                          {/* Botão de Resumo de IA */}
                          <button 
                            type="button"
                            onClick={() => setShowAiPromptModal(true)}
                            disabled={loadingAiChat}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg transition-all cursor-pointer"
                          >
                            {loadingAiChat ? '✨ A resumir...' : '✨ Resumir Chat com IA'}
                          </button>
                        </div>
                      </div>

                      {/* Barra de Pesquisa de Mensagens */}
                      <div className="relative">
                        <input 
                          type="text"
                          value={chatSearchQuery}
                          onChange={e => setChatSearchQuery(e.target.value)}
                          placeholder="Pesquisar mensagens nesta conversa..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                        />
                        {chatSearchQuery && (
                          <button 
                            type="button"
                            onClick={() => setChatSearchQuery('')}
                            className="absolute right-3 top-2 text-zinc-500 hover:text-zinc-300 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>

                    {/* GAVETA LATERAL / DROPDOWN DE MEMBROS DA SALA */}
                    {showMembersDrawer && (
                      <div className="bg-zinc-950 border-b border-zinc-800 p-3 space-y-2 max-h-48 overflow-y-auto shrink-0 animate-fadeIn">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Participantes do Canal ({activeChatRoom.members?.length || 0})
                          </p>
                          <button 
                            type="button"
                            onClick={() => setShowMembersDrawer(false)}
                            className="text-zinc-500 hover:text-zinc-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {(activeChatRoom.members || []).map(member => {
                            const isMe = member.id === currentUserInfo.id;
                            return (
                              <div 
                                key={member.id} 
                                className={`p-2 rounded-xl border flex items-center gap-2.5 text-xs ${
                                  isMe 
                                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-200' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                }`}
                              >
                                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-[10px] text-zinc-200 shrink-0">
                                  {(member.name || member.email).charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1 truncate">
                                  <p className="font-medium truncate">
                                    {member.name || member.email} {isMe && <span className="text-[10px] text-blue-400 font-bold">(Tu)</span>}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 truncate">{member.email}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {chatSummary && (
                      <div className="bg-purple-950/40 border-b border-purple-500/30 p-3.5 text-xs text-purple-200 flex justify-between items-start animate-fadeIn shrink-0">
                        <div>
                          <p className="font-bold text-purple-400 mb-1 flex items-center gap-1">✨ Resumo Inteligente da Conversa</p>
                          <p className="leading-relaxed">{chatSummary}</p>
                        </div>
                        <button onClick={() => setChatSummary(null)} className="text-purple-400 hover:text-white text-sm ml-2">✕</button>
                      </div>
                    )}

                    {/* Histórico de Mensagens */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/40">
                      {chatMessages
                        .filter(msg => msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                        .map((msg, index) => {
                          const isMe = msg.sender_id === currentUserInfo.id;
                          const isPinned = pinnedMessages.some(p => p.content === msg.content);
                          return (
                            <div 
                              key={index} 
                              id={`msg-item-${index}`}
                              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} transition-all duration-300`}
                            >
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <div className={`px-4 py-2.5 rounded-2xl text-xs relative ${isMe ? 'bg-blue-600 text-white rounded-br-xs' : 'bg-zinc-800 text-zinc-200 rounded-bl-xs'}`}>
                                  {msg.content}
                                  {isPinned && <span className="absolute -top-2 -right-2 text-[10px]" title="Mensagem Afixada">📌</span>}
                                </div>
                                
                                <button 
                                  onClick={() => {
                                    if (!isPinned) setPinnedMessages([...pinnedMessages, msg]);
                                    else setPinnedMessages(pinnedMessages.filter(p => p.content !== msg.content));
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition text-zinc-500 hover:text-zinc-300 text-xs p-1"
                                  title={isPinned ? "Desafixar mensagem" : "Afixar mensagem"}
                                >
                                  📌
                                </button>
                              </div>
                              <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.created_at || msg.last_time}</span>
                            </div>
                          );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={sendChatMessage} className="p-4 border-t border-zinc-800 bg-zinc-950/35 flex gap-2 shrink-0">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder="Escreve uma mensagem..." 
                        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                      <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">
                        Enviar
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                    <svg className="w-12 h-12 stroke-1 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm font-medium text-zinc-400">Seleciona uma conversa ou canal à esquerda para começar a conversar.</p>
                  </div>
                )}
              </div>

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
                      <p className="text-xs text-zinc-400 mb-1.5">{currentUserInfo.email}</p>
                      {(() => {
                        const roleObj = ROLES_LIST.find(r => r.value.toLowerCase() === (currentUserInfo.role || "").toLowerCase()) || {
                          label: currentUserInfo.role || "Técnico",
                          color: "text-zinc-400 bg-zinc-800 border-zinc-700"
                        };
                        return (
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleObj.color}`}>
                            {roleObj.label}
                          </span>
                        );
                      })()}
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
                  <button
                    type="button"
                    onClick={handleRefreshStats}
                    className="flex items-center gap-2 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStats ? "animate-spin" : ""}`} />
                    <span>Atualizar</span>
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
                    <p className="text-3xl font-bold text-zinc-100">
                      {Number(chartHoursData.hours.reduce((sum, h) => sum + h, 0)).toFixed(2)}h
                    </p>
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
                          points={chartHoursData.hours.map((h, i) => {
                            const len = chartHoursData.hours.length || 1;
                            const x = ((i + 0.5) / len) * 100;
                            const safeH = Number(h) || 0;
                            
                            // 🔧 ALTERAÇÃO AQUI: Usa um limite máximo dinâmico adaptado aos dados atuais da semana
                            const currentMaxHours = Math.max(...(chartHoursData.hours || [0]), 1);
                            const y = currentMaxHours > 0 ? 100 - (safeH / currentMaxHours) * 100 : 100;
                            
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </svg>
                    </div>

                    <div className="w-full flex items-end gap-1 mt-2">
                      {chartHoursData.labels.map((lbl, i) => {
                        const showLabel = statsPeriod !== '30' || i % 5 === 0 || i === chartHoursData.labels.length - 1;
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
                <div className="flex gap-3">
                  {/* Botão PDF */}
                  <button 
                    onClick={() => exportarRelatorio('pdf')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    📥 Exportar Relatório em PDF
                  </button>

                  {/* Botão Word */}
                  <button 
                    onClick={() => exportarRelatorio('word')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    📄 Exportar Relatório em Word
                  </button>
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
                    const isSelected = day.date === selectedDate;

                    return (
                      <div
                        key={day.date}
                        onClick={() => setSelectedDate(day.date)}
                        className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-2 px-1 rounded-xl border cursor-pointer transition-all ${bgColor} ${isToday ? 'ring-1 ring-blue-500/50 shadow-md' : ''} ${isSelected ? 'border-yellow-500 scale-105' : ''}`}
                      >
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
                      <div key={t.id} onClick={() => setSelectedTicketDetails(t)} className="bg-zinc-950 border border-zinc-800 p-3.5 rounded-xl flex items-center justify-between cursor-pointer hover:border-zinc-700 transition">
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

              {/* AVISO DE RELATÓRIO DEVOLVIDO PARA CORREÇÃO */}
              {dailyReport && dailyReport.status === 'Rascunho' && dailyReport.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl mb-4 flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <h4 className="text-red-400 font-bold text-sm">Relatório Devolvido para Correção</h4>
                    <p className="text-red-300 text-xs mt-1">
                      <strong>Motivo do Admin:</strong> {dailyReport.rejection_reason}
                    </p>
                  </div>
                </div>
              )}

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
                        disabled={!canEdit}
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
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
                        disabled={!canEdit}
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Ex: 1.5" 
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-sm font-semibold text-zinc-100">Resumo Profissional</h2>
                      <button 
                        onClick={generateDailyReportIA}
                        disabled={generatingDaily || !canEdit}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm ${generatingDaily || !canEdit ? 'bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}
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
                          disabled={!canEdit}
                          rows="2" 
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                          placeholder="Clica no botão ✨ acima para a IA redigir por ti..." 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Relatório Detalhado</label>
                        <textarea 
                          value={dailyReport.detailed_report || ''} 
                          onChange={e => setDailyReport({...dailyReport, detailed_report: e.target.value})}
                          disabled={!canEdit}
                          rows="5" 
                          className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                          placeholder="Descrição de todas as intervenções e estado atual..." 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 👈 NOVOS CAMPOS ADICIONADOS AQUI */}
                  <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Trabalhos Pendentes</label>
                      <textarea 
                        value={dailyReport.pending_work || ''} 
                        onChange={e => setDailyReport({...dailyReport, pending_work: e.target.value})}
                        disabled={!canEdit}
                        rows="2" 
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Indica se ficou algum trabalho por terminar para amanhã..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Incidentes / Observações</label>
                      <textarea 
                        value={dailyReport.observations || ''} 
                        onChange={e => setDailyReport({...dailyReport, observations: e.target.value})}
                        disabled={!canEdit}
                        rows="2" 
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Regista incidentes ocorridos ou observações relevantes..." 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Material Utilizado</label>
                      <textarea 
                        value={dailyReport.materials_used || ''} 
                        onChange={e => setDailyReport({...dailyReport, materials_used: e.target.value})}
                        disabled={!canEdit}
                        rows="2" 
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none resize-none transition ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-700'}`} 
                        placeholder="Lista o material aplicado nas intervenções de hoje..." 
                      />
                    </div>
                  </div>

                  {/* UPLOAD DE FOTOGRAFIAS */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Fotografias Anexadas</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      disabled={!canEdit}
                      onChange={(e) => setImagem(e.target.files[0])}
                      className={`w-full bg-[#18181b] border border-[#27272a] text-gray-300 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    {dailyReport.status === 'Submetido' ? (
                      <button 
                        onClick={reopenDailyReport}
                        className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium text-sm px-6 py-2.5 rounded-xl transition shadow-sm"
                      >
                        ✏️ Editar Relatório
                      </button>
                    ) : canEdit && (
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

      {/* MODAL TASK POOL DO PROJETO / EQUIPA */}
      {showProjectTasksModal && activeProjectForTasks && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowProjectTasksModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            
            {/* Cabeçalho */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <span>🎯 Pool de Tarefas:</span> {activeProjectForTasks.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">Vê o progresso da equipa e agarra tarefas livres.</p>
              </div>
              <button onClick={() => setShowProjectTasksModal(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                ✕
              </button>
            </div>

            {/* Lista de Tarefas do Projeto (Usa projectModalTickets) */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {projectModalTickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhuma tarefa associada a este projeto neste momento.
                </div>
              ) : (
                projectModalTickets.map(ticket => {
                    const isDone = ticket.status && ['done', 'concluído', 'concluido'].includes(ticket.status.toLowerCase());
                    const assigneeName = getAssigneeName(ticket.assigned_to_id);
                    
                    return (
                      <div key={ticket.id} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center justify-between gap-4">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500">#{ticket.id}</span>
                            <h4 className="font-medium text-sm text-zinc-100 truncate">{ticket.title}</h4>
                            {ticket.priority && (
                              <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${getPriorityBadgeStyle(ticket.priority)}`}>
                                {ticket.priority}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-400 truncate pl-6">{ticket.description || 'Sem descrição'}</p>
                          <div className="flex items-center gap-4 text-[11px] text-zinc-500 pl-6 pt-1">
                            <span>Estado: <strong className="text-zinc-300">{ticket.status}</strong></span>
                            {assigneeName ? (
                              <span className="text-amber-400">👤 Atribuído a: {assigneeName}</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">🟢 Disponível (Livre)</span>
                            )}
                          </div>
                        </div>

                        {/* Botão de Agarrar Tarefa */}
                        <div className="shrink-0">
                          {!assigneeName && !isDone ? (
                            <button 
                              onClick={async () => {
                                try {
                                  const headers = { Authorization: `Bearer ${token}` };
                                  await axios.put(`${API_URL}/tickets/${ticket.id}/grab`, {}, { headers });
                                  alert("Tarefa agarrada com sucesso! Passou para ti.");
                                  openProjectTasksModal(activeProjectForTasks); // Atualiza o modal
                                  fetchData(); // Atualiza a Kanban geral
                                } catch (error) {
                                  alert(error.response?.data?.detail || "Erro ao agarrar tarefa.");
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-md flex items-center gap-1.5"
                            >
                              ✋ Agarrar
                            </button>
                          ) : (
                            <span className="text-[11px] text-zinc-500 italic bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                              {isDone ? 'Concluída' : 'Ocupada'}
                            </span>
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

      {/* MODAL TASK POOL DA EQUIPA */}
      {showTeamTasksModal && activeTeamForTasks && (() => {
        // 1. Obter os IDs de todos os projetos associados a esta equipa
        const teamProjectIds = (projects || []).filter(p => {
          if (p.team_ids && Array.isArray(p.team_ids)) {
            return p.team_ids.includes(activeTeamForTasks?.id);
          }
          if (p.teams && Array.isArray(p.teams)) {
            return p.teams.some(t => t.id === activeTeamForTasks?.id);
          }
          return p.team_id === activeTeamForTasks?.id;
        }).map(p => p.id);

        // 2. Filtrar as tarefas que pertencem a esses projetos OU diretamente à equipa
        const teamPoolTasks = (tickets || []).filter(t => {
          const belongsToProject = t.project_id && teamProjectIds.includes(t.project_id);
          const belongsDirectlyToTeam = t.team_id === activeTeamForTasks?.id;
          const isDone = t.status && ['done', 'concluído', 'concluido'].includes(t.status.toLowerCase());

          // Apenas tarefas ativas/não concluídas da equipa
          return (belongsToProject || belongsDirectlyToTeam) && !isDone;
        });

        return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowTeamTasksModal(false)}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
              
              {/* Cabeçalho do Modal */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <span>👥 Pool de Tarefas da Equipa:</span> {activeTeamForTasks.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Tarefas disponíveis nos projetos desta equipa.</p>
                </div>
                <button onClick={() => setShowTeamTasksModal(false)} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                  ✕
                </button>
              </div>

              {/* Lista de Tarefas da Equipa */}
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {teamPoolTasks.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-zinc-800/80 rounded-2xl">
                    <span className="text-xs text-zinc-500 italic">
                      Nenhuma tarefa disponível nos projetos desta equipa de momento.
                    </span>
                  </div>
                ) : (
                  teamPoolTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-2xl flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                            #{task.id}
                          </span>
                          <span className="text-xs font-semibold text-zinc-200 truncate">
                            {task.title}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                          <span>📁 {getProjectName(task.project_id)}</span>
                          <span className="font-mono">🎯 {formatToHHMM(task.estimated_hours)}</span>
                          {/* EXIBIÇÃO DO UTILIZADOR ATRIBUÍDO OU STATUS LIVRE */}
                          {(() => {
                            const assignedUser = (usersList || []).find(u => u.id === task.assigned_to_id);
                            const userName = assignedUser ? (assignedUser.name || assignedUser.email) : null;

                            return task.assigned_to_id ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                                <span>👤</span>
                                <span>{userName || `User #${task.assigned_to_id}`}</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400 font-medium">
                                <span>🔓</span>
                                <span>Livre</span>
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Botão de Agarrar / Iniciar se a tarefa não estiver atribuída */}
                      {!task.assigned_to_id && (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const headers = { Authorization: `Bearer ${token}` };
                              await axios.put(`${API_URL}/tickets/${task.id}/grab`, {}, { headers });
                              fetchData();
                            } catch (err) {
                              alert(err.response?.data?.detail || 'Erro ao assumir tarefa.');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium transition cursor-pointer shrink-0"
                        >
                          Assumir Tarefa
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        );
      })()}

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
                formData.append('tracked_hours', ticketToComplete?.tracked_hours ? Number(ticketToComplete.tracked_hours) : 0);
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
                // Apanha mensagens do backend, ex.: "⚠️ Não podes concluir esta tarefa principal! Ainda existem X subtarefas..."
                alert(err.response?.data?.detail || 'Erro ao concluir tarefa.');
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
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tempo Total Contabilizado (Cronómetro)</label>
                <div className="relative flex items-center">
                  <Clock className="w-4 h-4 text-emerald-400 absolute left-3.5" />
                  <input 
                    type="text"
                    readOnly
                    disabled
                    value={`${formatToHHMM(ticketToComplete?.tracked_hours)} (${(ticketToComplete?.tracked_hours || 0).toFixed(2)}h)`}
                    className="w-full bg-zinc-950/60 border border-zinc-800 text-emerald-400 font-mono font-bold rounded-xl pl-10 pr-4 py-2.5 text-sm cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Previsto: <strong className="text-zinc-400">{formatToHHMM(ticketToComplete?.estimated_hours)}</strong> • O tempo é calculado automaticamente pelas sessões de trabalho registadas.
                </p>
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Cargo / Função *</label>
                <select
                  value={newUserRole || "Técnico"}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none focus:border-blue-500 transition cursor-pointer"
                  required
                >
                  {ROLES_LIST.map((r) => (
                    <option key={r.value} value={r.value} className="bg-zinc-900 text-zinc-200">
                      {r.label}
                    </option>
                  ))}
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome / Designação <span className="text-red-400">*</span></label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Empresa <span className="text-red-400">*</span></label>
                <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Telefone</label>
                <input type="text" value={clientPhone} onChange={e => setClientPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>

              {/* SECÇÃO DE PROJETOS ASSOCIADOS AO CLIENTE */}
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  PROJETOS DO CLIENTE (0, 1 OU VÁRIOS)
                </label>

                {/* 1. Lista de projetos atualmente associados */}
                <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                  {selectedClientProjects.length === 0 ? (
                    <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-xl text-xs text-zinc-600 italic">
                      Nenhum projeto associado a este cliente.
                    </div>
                  ) : (
                    selectedClientProjects.map(projId => {
                      const projObj = (projects || []).find(p => p.id === projId);
                      if (!projObj) return null;
                      return (
                        <div
                          key={projId}
                          className="flex items-center justify-between p-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"
                        >
                          <span className="font-medium text-zinc-200 truncate">📁 {projObj.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedClientProjects(selectedClientProjects.filter(id => id !== projId))}
                            className="text-zinc-500 hover:text-red-400 text-xs px-1 cursor-pointer font-bold"
                            title="Remover projeto deste cliente"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Seletor para adicionar novos projetos */}
                <div className="flex gap-2">
                  <select
                    value={selectedNewClientProjectId || ''}
                    onChange={(e) => setSelectedNewClientProjectId(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    <option value="">Selecionar projeto para associar...</option>
                    {(projects || [])
                      .filter(p => !selectedClientProjects.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedNewClientProjectId) return;
                      const pId = Number(selectedNewClientProjectId);
                      if (!selectedClientProjects.includes(pId)) {
                        setSelectedClientProjects([...selectedClientProjects, pId]);
                      }
                      setSelectedNewClientProjectId('');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome / Designação <span className="text-red-400">*</span></label>
                <input type="text" value={editClientName} onChange={e => setEditClientName(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Empresa <span className="text-red-400">*</span></label>
                <input type="text" value={editClientCompany} onChange={e => setEditClientCompany(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input type="email" value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Telefone</label>
                <input type="text" value={editClientPhone} onChange={e => setEditClientPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>

              {/* SECÇÃO DE PROJETOS ASSOCIADOS AO CLIENTE */}
              <div className="mt-4 pt-3 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  PROJETOS DO CLIENTE (0, 1 OU VÁRIOS)
                </label>

                {/* 1. Lista de projetos atualmente associados */}
                <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                  {selectedClientProjects.length === 0 ? (
                    <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-xl text-xs text-zinc-600 italic">
                      Nenhum projeto associado a este cliente.
                    </div>
                  ) : (
                    selectedClientProjects.map(projId => {
                      const projObj = (projects || []).find(p => p.id === projId);
                      if (!projObj) return null;
                      return (
                        <div
                          key={projId}
                          className="flex items-center justify-between p-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"
                        >
                          <span className="font-medium text-zinc-200 truncate">📁 {projObj.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedClientProjects(selectedClientProjects.filter(id => id !== projId))}
                            className="text-zinc-500 hover:text-red-400 text-xs px-1 cursor-pointer font-bold"
                            title="Remover projeto deste cliente"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Seletor para adicionar novos projetos */}
                <div className="flex gap-2">
                  <select
                    value={selectedNewClientProjectId || ''}
                    onChange={(e) => setSelectedNewClientProjectId(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    <option value="">Selecionar projeto para associar...</option>
                    {(projects || [])
                      .filter(p => !selectedClientProjects.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedNewClientProjectId) return;
                      const pId = Number(selectedNewClientProjectId);
                      if (!selectedClientProjects.includes(pId)) {
                        setSelectedClientProjects([...selectedClientProjects, pId]);
                      }
                      setSelectedNewClientProjectId('');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer shrink-0"
                  >
                    Adicionar
                  </button>
                </div>
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
            {/* Cabeçalho fixo */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800 shrink-0">
              <h2 className="text-lg font-semibold">{editMode ? 'Editar Tarefa' : 'Criar Nova Tarefa'}</h2>
              <button type="button" onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">✕</button>
            </div>

            {/* Formulário com scroll vertical */}
            <form onSubmit={handleSaveTicket} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  disabled={isSubtaskCollaborator}
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 outline-none transition ${
                    isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição <span className="text-red-400">*</span></label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  required
                  rows="3"
                  disabled={isSubtaskCollaborator}
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 outline-none resize-none transition ${
                    isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                  }`}
                  placeholder="Detalhes obrigatórios da tarefa..."
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Prioridade</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    disabled={isSubtaskCollaborator}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none transition ${
                      isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                    }`}
                  >
                    <option value="Baixa">Baixa</option><option value="Média">Média</option><option value="Alta">Alta</option><option value="Crítica">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Estado</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    disabled={isSubtaskCollaborator}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none transition ${
                      isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                    }`}
                  >
                    <option value="To Do">Pendente</option>
                    <option value="In Progress">Em progresso</option>
                    <option value="In Review">Em revisão</option>
                    <option value="Done">Concluído</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Tipo de Tarefa</label>
                  
                  <div className="flex gap-2">
                    {/* Caixa principal que simula o select fechado */}
                    <div 
                      onClick={() => !isSubtaskCollaborator && setIsTaskTypeDropdownOpen(!isTaskTypeDropdownOpen)}
                      className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 flex justify-between items-center select-none transition ${
                        isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'cursor-pointer'
                      }`}
                    >
                      <span>{newTaskType || "Selecionar tipo..."}</span>
                      <span className="text-zinc-500 text-xs">▼</span>
                    </div>

                    {/* Botão + para criar novo tipo (Apenas Managers/Admins) */}
                    {isManagerOrAdmin && (
                      <button
                        type="button"
                        onClick={async () => {
                          const newType = window.prompt("Nome do novo tipo de tarefa (ex: Cibersegurança):");
                          if (newType && newType.trim() !== '') {
                            try {
                              const headers = { Authorization: `Bearer ${token}` };
                              const res = await axios.post(`${API_URL}/tickets/task-types/create`, { name: newType.trim() }, { headers });
                              await fetchTaskTypes();
                              setNewTaskType(res.data.name);
                            } catch (err) {
                              alert(err.response?.data?.detail || "Erro ao criar tipo de tarefa.");
                            }
                          }
                        }}
                        className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-xl font-bold transition shrink-0 cursor-pointer"
                        title="Criar novo tipo de tarefa"
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Menu Dropdown Aberto com o X em cada opção */}
                  {isTaskTypeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                      {taskTypes.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-zinc-500 text-center">Sem tipos criados. Usa o botão + para adicionar.</div>
                      ) : (
                        taskTypes.map(type => {
                          const typeName = typeof type === 'object' ? type.name : type;
                          const typeId = typeof type === 'object' ? type.id : null;

                          return (
                            <div 
                              key={typeName}
                              className="flex items-center justify-between px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              onClick={() => {
                                setNewTaskType(typeName);
                                setIsTaskTypeDropdownOpen(false);
                              }}
                            >
                              <span>{typeName}</span>

                              {/* Botão X para apagar (visível para Managers/Admins em todas as opções, já que são todas personalizadas) */}
                              {isManagerOrAdmin && typeId && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation(); // Evita selecionar a opção ao clicar no X
                                    if (window.confirm(`Tens a certeza que queres apagar o tipo "${typeName}"?`)) {
                                      try {
                                        const headers = { Authorization: `Bearer ${token}` };
                                        await axios.delete(`${API_URL}/tickets/task-types/${typeId}`, { headers });
                                        await fetchTaskTypes();
                                        if (newTaskType === typeName) setNewTaskType('');
                                      } catch (err) {
                                        alert("Erro ao apagar tipo de tarefa.");
                                      }
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 font-bold px-2 py-0.5 text-xs rounded bg-zinc-800/80 hover:bg-zinc-700 transition"
                                  title={`Apagar ${typeName}`}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* Se for Admin/Manager vê os dois campos. Se for Member, o projeto e o atribuir a ficam ocultos no backend e frontend */}
              {isManagerOrAdmin && (
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
              )}

              <div className="grid grid-cols-2 gap-3">
                {isManagerOrAdmin && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Atribuir a</label>
                    <select value={newAssignedTo} onChange={e => setNewAssignedTo(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                      <option value="">Não atribuído</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                    </select>
                  </div>
                )}
                <div className={!isManagerOrAdmin ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Horas Estimadas <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Campo das Horas */}
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={estHours}
                        onChange={e => setEstHours(Math.max(0, parseInt(e.target.value) || 0))}
                        disabled={isSubtaskCollaborator}
                        className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none pr-8 ${
                          isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                        }`}
                      />
                      <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">h</span>
                    </div>

                    {/* Dropdown de Minutos Exatos */}
                    <select
                      value={estMinutes}
                      onChange={e => setEstMinutes(Number(e.target.value))}
                      disabled={isSubtaskCollaborator}
                      className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none ${
                        isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                      }`}
                    >
                      <option value={0}>00 min</option>
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    disabled={isSubtaskCollaborator}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 outline-none [color-scheme:dark] transition ${
                      isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Data Limite</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    disabled={isSubtaskCollaborator}
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 outline-none [color-scheme:dark] transition ${
                      isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                    }`}
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Depende da Tarefa (Bloqueada por)</label>
                <input
                  type="text"
                  placeholder="Começa a escrever o nome da tarefa antecedente..."
                  value={dependencySearch}
                  onChange={e => {
                    setDependencySearch(e.target.value);
                    setShowDependencyDropdown(true);
                    if (!e.target.value) setNewBlockedById('');
                  }}
                  onFocus={() => setShowDependencyDropdown(true)}
                  disabled={isSubtaskCollaborator}
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 outline-none transition ${
                    isSubtaskCollaborator ? 'opacity-70 cursor-not-allowed bg-zinc-900/50' : 'focus:border-blue-500'
                  }`}
                />
                {showDependencyDropdown && dependencySearch && (
                  <div className="absolute z-10 w-full bg-zinc-900 border border-zinc-800 mt-1 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                    {availableTickets
                      .filter(t => t.id !== currentTicketId)
                      .filter(t => t.title.toLowerCase().includes(dependencySearch.toLowerCase()) || String(t.id).includes(dependencySearch))
                      .slice(0, 20)
                      .map(t => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setNewBlockedById(t.id);
                            setDependencySearch(`#${t.id} - ${t.title}`);
                            setShowDependencyDropdown(false);
                          }}
                          className="px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800 last:border-b-0"
                        >
                          #{t.id} - {t.title}
                        </div>
                      ))}
                    {availableTickets.filter(t => t.id !== currentTicketId && (t.title.toLowerCase().includes(dependencySearch.toLowerCase()) || String(t.id).includes(dependencySearch))).length === 0 && (
                      <div className="px-3 py-2 text-xs text-zinc-500 text-center">Nenhuma tarefa encontrada.</div>
                    )}
                  </div>
                )}
              </div>

              {/* SECÇÃO DE SUBTAREFAS (apenas em edição, requer tarefa já criada) */}
              {editMode && (
                <div className="border-t border-zinc-800 pt-4">
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Subtarefas da Tarefa
                  </label>

                  <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
                    {subtasks.length === 0 ? (
                      <p className="text-xs text-zinc-500">Sem subtarefas ainda.</p>
                    ) : (
                      subtasks.map(sub => {
                        const isMySubtask = sub.assigned_to_id === currentUserInfo?.id;
                        const subStatus = sub.status || "Pendente";

                        return (
                          <div
                            key={sub.id}
                            className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                              isMySubtask
                                ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                                : 'bg-zinc-950/60 border-zinc-850 opacity-60'
                            }`}
                          >
                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                                  subStatus === 'Aprovada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                  subStatus === 'Aguardar Aprovação' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                  'bg-zinc-900 text-zinc-400 border-zinc-800'
                                }`}>
                                  {subStatus}
                                </span>
                                <span className="text-xs font-medium text-zinc-200 truncate">{sub.title}</span>
                              </div>
                              {isMySubtask && (
                                <span className="text-[10px] text-blue-400 font-semibold mt-1">📌 Atribuída a ti</span>
                              )}
                              {sub.rejection_reason && subStatus === 'Pendente' && isMySubtask && (
                                <p className="text-[11px] text-red-400 mt-1.5 bg-red-950/30 border border-red-500/20 px-2 py-1 rounded-lg">
                                  ⚠️ <strong>Correção:</strong> {sub.rejection_reason}
                                </p>
                              )}
                            </div>

                            {/* Botão de Ação para o Colaborador */}
                            {isMySubtask && subStatus === 'Pendente' && (
                              <button
                                type="button"
                                onClick={() => handleSubmitSubtaskForApproval(sub.id)}
                                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer shadow"
                              >
                                Concluir & Submeter
                              </button>
                            )}

                            {/* Botões para o Criador/Admin validar */}
                            {isOwnerOrCreator && subStatus === 'Aguardar Aprovação' && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleApproveSubtask(sub.id)}
                                  className="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
                                >
                                  ✓ Aprovar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSubtask(sub.id)}
                                  className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-lg transition cursor-pointer"
                                >
                                  ✕ Recusar
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nova subtarefa..."
                      value={newSubTitle}
                      onChange={e => setNewSubTitle(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-sm text-zinc-100 focus:outline-none"
                    />
                    <select
                      value={newSubAssignee}
                      onChange={e => setNewSubAssignee(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-100 focus:outline-none"
                    >
                      <option value="">Atribuir a...</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{getUserDisplayName(u)}</option>)}
                    </select>
                    <button type="button" onClick={handleAddSubtask} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-3 py-1.5 text-sm rounded-xl font-medium transition">
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-3 pt-3 border-t border-zinc-800 shrink-0 mt-4">
                {isSubtaskCollaborator ? (
                  <div className="flex justify-end w-full">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <>
                    {editMode ? (
                      <button
                        type="button"
                        onClick={handleReturnTicket}
                        disabled={returningTicket}
                        className="bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-500/30 px-3 py-2 text-xs rounded-xl font-medium transition cursor-pointer"
                      >
                        {returningTicket ? 'A devolver...' : '🔄 Devolver Tarefa'}
                      </button>
                    ) : <span />}

                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100 transition cursor-pointer">
                        Cancelar
                      </button>
                      <button type="submit" className="bg-zinc-100 text-zinc-950 font-medium text-xs px-4 py-2 rounded-xl hover:bg-white transition shadow-sm cursor-pointer">
                        {editMode ? 'Atualizar' : 'Guardar'}
                      </button>
                    </div>
                  </>
                )}
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
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Projeto <span className="text-rose-500">*</span></label>
                <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} required placeholder="Ex: Redesenho de Infraestrutura" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Descrição <span className="text-rose-500">*</span></label>
                <textarea required value={projectDesc} onChange={e => setProjectDesc(e.target.value)} rows="2" className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none resize-none" placeholder="Descreve o âmbito do projeto..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Data Limite do Projeto</label>
                <input 
                  type="date" 
                  value={projectDueDate} 
                  onChange={e => setProjectDueDate(e.target.value)} 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none [color-scheme:dark]" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Equipas Associadas (Opcional)
                  </label>
                  
                  <div className="flex flex-wrap gap-1.5 p-2 bg-zinc-950 border border-zinc-800 rounded-xl min-h-[42px] max-h-32 overflow-y-auto items-center">
                    {(teams || availableTeams || []).length === 0 ? (
                      <span className="text-xs text-zinc-600 italic px-1">Nenhuma equipa registada no sistema.</span>
                    ) : (
                      (teams || availableTeams || []).map(t => {
                        const isSelected = projectTeamIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setProjectTeamIds(projectTeamIds.filter(id => id !== t.id));
                              } else {
                                setProjectTeamIds([...projectTeamIds, t.id]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                              isSelected 
                                ? 'bg-blue-600 text-white shadow-sm border border-blue-500' 
                                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                            }`}
                          >
                            <span>👥 {t.name}</span>
                            {isSelected && <span className="font-bold text-white text-[10px]">✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Cliente do Projeto (Opcional)</label>
                  <select value={projectClientId || ""} onChange={e => setProjectClientId(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none">
                    <option value="">Nenhum (Sem Cliente)</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
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
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  PROJETOS ASSOCIADOS
                </label>

                {/* 1. Lista dos projetos que já estão associados com botão para remover */}
                <div className="space-y-1.5 mb-3 max-h-36 overflow-y-auto">
                  {selectedProjectIds.length === 0 ? (
                    <div className="p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-xl text-xs text-zinc-600 italic">
                      Nenhum projeto associado a esta equipa.
                    </div>
                  ) : (
                    selectedProjectIds.map(projId => {
                      const projObj = (projects || []).find(p => p.id === projId);
                      if (!projObj) return null;
                      return (
                        <div 
                          key={projId}
                          className="flex items-center justify-between p-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"
                        >
                          <span className="font-medium text-zinc-200 truncate">{projObj.name}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedProjectIds(selectedProjectIds.filter(id => id !== projId))}
                            className="text-zinc-500 hover:text-red-400 text-xs px-1 cursor-pointer font-bold"
                            title="Remover projeto da equipa"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 2. Campo para Adicionar Novo Projeto à Equipa */}
                <div className="flex gap-2">
                  <select
                    value={selectedNewProjectId || ''}
                    onChange={(e) => setSelectedNewProjectId(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-700"
                  >
                    <option value="">Selecionar projeto para adicionar...</option>
                    {(projects || [])
                      .filter(p => !selectedProjectIds.includes(p.id))
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedNewProjectId) return;
                      const pId = Number(selectedNewProjectId);
                      if (!selectedProjectIds.includes(pId)) {
                        setSelectedProjectIds([...selectedProjectIds, pId]);
                      }
                      setSelectedNewProjectId('');
                    }}
                    className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
                  >
                    Adicionar
                  </button>
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
              {comments.length === 0 ? <p className="text-xs text-zinc-500 text-center py-6">Ainda sem comentários.</p> : comments.map(comment => (
                <div key={comment.id} className="bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-purple-400">👤 {comment.author_name}</span>
                    <span className="text-[10px] text-zinc-500">{comment.created_at ? comment.created_at.split('T')[0] : ''}</span>
                  </div>
                  <p className="text-xs text-zinc-300">{comment.text}</p>
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

      {selectedTicketDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 text-zinc-100 shadow-2xl relative">
            
            {/* Cabeçalho */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-xs font-mono text-zinc-400">#{selectedTicketDetails.id}</span>
                <h3 className="text-lg font-bold text-zinc-100 mt-1">{selectedTicketDetails.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedTicketDetails(null)}
                className="text-zinc-400 hover:text-zinc-100 text-sm bg-zinc-800 px-2.5 py-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo Detalhado */}
            <div className="space-y-4 text-sm text-zinc-300 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <span className="block text-xs font-medium text-zinc-500 uppercase">Estado / Prioridade</span>
                <p className="mt-0.5">{selectedTicketDetails.status} • <span className="font-semibold">{selectedTicketDetails.priority}</span></p>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-500 uppercase">Descrição Inicial</span>
                <p className="mt-0.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-zinc-300">
                  {selectedTicketDetails.description || "Sem descrição inicial."}
                </p>
              </div>

              <div>
                <span className="block text-xs font-medium text-zinc-500 uppercase">Observações de Campo / Relatório Final</span>
                <p className="mt-0.5 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-zinc-300 whitespace-pre-wrap">
                  {selectedTicketDetails.final_description || "Sem observações finais registadas."}
                </p>
              </div>

              {selectedTicketDetails.attachment_path && (
                <div>
                  <span className="block text-xs font-medium text-zinc-500 uppercase">Anexo</span>
                  <a 
                    href={`${API_URL.replace('/api', '')}/${selectedTicketDetails.attachment_path}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="inline-block mt-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-xl font-medium transition"
                  >
                    📥 Descarregar / Ver Anexo
                  </a>
                </div>
              )}

              {/* Histórico de Passagens / Atividade da Tarefa (apenas Admin, tal como o /audit-logs/) */}
              {isAdmin && (
                <div className="border-t border-zinc-800 pt-4">
                  <span className="block text-xs font-medium text-zinc-500 uppercase mb-2">📜 Histórico de Passagens / Atividade</span>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {ticketHistoryLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">Sem registos de histórico para esta tarefa ainda.</p>
                    ) : (
                      ticketHistoryLogs.map(log => (
                        <div key={log.id} className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-xl flex flex-col gap-1">
                          <div className="flex justify-between items-center text-[11px] text-zinc-500">
                            <span className="font-bold text-blue-400">{log.action}</span>
                            <span>{log.created_at ? new Date(log.created_at).toLocaleString('pt-PT') : ''}</span>
                          </div>
                          <div className="text-xs font-medium text-zinc-200">{log.details}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end">
              <button
                onClick={() => setSelectedTicketDetails(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE ALERTA DE INATIVIDADE */}
      {showIdleModal && activeTimerTask && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-2xl animate-pulse">
              ⏱️
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-zinc-100">Ainda estás a trabalhar?</h3>
              <p className="text-xs text-zinc-400">
                Não detetámos atividade há 15 minutos na tarefa <strong className="text-zinc-200">#{activeTimerTask.id} - {activeTimerTask.title}</strong>.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
              <p className="text-xs text-zinc-400">
                O cronómetro será pausado automaticamente em:
              </p>
              <p className="text-2xl font-black text-amber-400 mt-1">
                {idleCountdown}s
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleAutoStopIdleTimer}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2.5 rounded-xl transition cursor-pointer"
              >
                Pausar Agora
              </button>
              <button
                type="button"
                onClick={handleKeepWorking}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Continuar a Trabalhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RESPOSTA DE FEEDBACK */}
      {showFeedbackModal && selectedFeedbackReq && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Pedido de Feedback</span>
                <h3 className="text-base font-bold text-zinc-100">{selectedFeedbackReq.title}</h3>
              </div>
              <button 
                onClick={() => setShowFeedbackModal(false)} 
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            {selectedFeedbackReq.description && (
              <p className="text-xs text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                {selectedFeedbackReq.description}
              </p>
            )}

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              {/* Avaliação em Estrelas */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 text-center">Classificação Geral</label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl transition cursor-pointer transform hover:scale-110 ${
                        star <= feedbackRating ? 'text-amber-400' : 'text-zinc-700'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* Comentário */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Comentários / Sugestões</label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Escreve aqui a tua avaliação honesta..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-amber-500 transition"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2.5 rounded-xl transition cursor-pointer"
                >
                  Mais tarde
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Submeter Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CRIAR PEDIDO DE FEEDBACK (GESTOR) */}
      {showCreateFeedbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <div>
                <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Qualidade & Avaliação</span>
                <h3 className="text-base font-bold text-zinc-100">Solicitar Feedback</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateFeedbackModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFeedbackRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Título do Pedido *</label>
                <input
                  type="text"
                  value={newFeedbackTitle}
                  onChange={(e) => setNewFeedbackTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Instruções / O que avaliar?</label>
                <textarea
                  value={newFeedbackDesc}
                  onChange={(e) => setNewFeedbackDesc(e.target.value)}
                  placeholder="Ex: Como correu a instalação no cliente? Houve imprevistos técnicos?"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Prazo Limite *</label>
                <input
                  type="datetime-local"
                  value={newFeedbackDeadline}
                  onChange={(e) => setNewFeedbackDeadline(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateFeedbackModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  Enviar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUSIVO DE HISTÓRICO E LOGS DA TAREFA */}
      {showTaskLogsModal && selectedTaskForLogs && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setShowTaskLogsModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  📜 Registo de Atividade da Tarefa #{selectedTaskForLogs.id}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-md">{selectedTaskForLogs.title}</p>
              </div>
              <button onClick={() => setShowTaskLogsModal(false)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition">
                ✕
              </button>
            </div>

            {/* Barra de Filtros por Intervalo de Datas */}
            <div className="flex items-center justify-between gap-3 my-4 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Filtrar por data:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="date"
                  value={logStartDate}
                  onChange={e => {
                    setLogStartDate(e.target.value);
                    fetchTicketLogs(selectedTaskForLogs.id, e.target.value, logEndDate);
                  }}
                  className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none [color-scheme:dark]"
                />
                <span className="text-zinc-500 text-xs">até</span>
                <input 
                  type="date"
                  value={logEndDate}
                  onChange={e => {
                    setLogEndDate(e.target.value);
                    fetchTicketLogs(selectedTaskForLogs.id, logStartDate, e.target.value);
                  }}
                  className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none [color-scheme:dark]"
                />
                {(logStartDate || logEndDate) && (
                  <button
                    onClick={() => {
                      setLogStartDate('');
                      setLogEndDate('');
                      fetchTicketLogs(selectedTaskForLogs.id, '', '');
                    }}
                    className="text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-800 rounded-lg transition"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Registos / Logs */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {ticketLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Nenhum registo de auditoria encontrado para o intervalo de datas selecionado.
                </div>
              ) : (
                ticketLogs.map(log => (
                  <div key={log.id} className="bg-zinc-950 border border-zinc-800/80 p-3.5 rounded-xl space-y-1 hover:border-zinc-700 transition">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                        👤 {log.username || `Utilizador #${log.user_id}`}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {log.created_at ? new Date(log.created_at).toLocaleString('pt-PT') : ''}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-200">{log.action}</div>
                    <p className="text-xs text-zinc-400 bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
                      {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Rodapé */}
            <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setShowTaskLogsModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DETALHADO DA BASE DE CONHECIMENTO */}
      {selectedKnowledgeTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={() => setSelectedKnowledgeTicket(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] text-zinc-100" onClick={e => e.stopPropagation()}>
            
            {/* Cabeçalho */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-lg">#{selectedKnowledgeTicket.id}</span>
                <h2 className="text-base font-bold text-zinc-100">{selectedKnowledgeTicket.title}</h2>
                {selectedKnowledgeTicket.task_type && selectedKnowledgeTicket.task_type !== 'Geral' && (
                  <span className="text-[10px] px-2.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400 font-medium">
                    {selectedKnowledgeTicket.task_type}
                  </span>
                )}
              </div>
              <button 
                onClick={() => setSelectedKnowledgeTicket(null)} 
                className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Metadados / Informações úteis */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                <div>📁 Projeto: <strong className="text-zinc-200 block mt-0.5">{getProjectName(selectedKnowledgeTicket.project_id)}</strong></div>
                <div>👤 Resolvido por: <strong className="text-emerald-400 block mt-0.5">{getAssigneeName(selectedKnowledgeTicket.assigned_to_id) || 'Equipa'}</strong></div>
                <div>
                  📅 Conclusão: 
                  <strong className="text-zinc-200 block mt-0.5">
                    {selectedKnowledgeTicket.completed_at 
                      ? new Date(selectedKnowledgeTicket.completed_at).toLocaleDateString('pt-PT') 
                      : 'N/A'}
                  </strong>
                </div>
              </div>

              {/* Problema Original */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-1.5">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Problema Original
                </p>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {selectedKnowledgeTicket.description || 'Sem descrição inicial registada.'}
                </p>
              </div>

              {/* Solução Aplicada */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-emerald-500/20 space-y-1.5">
                <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Solução Aplicada (Relatório Final)
                </p>
                <p className="text-sm text-zinc-100 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedKnowledgeTicket.final_description || 'Tarefa concluída sem relatório detalhado.'}
                </p>
              </div>

              {/* Anexos e Fotografias */}
              {selectedKnowledgeTicket.attachment_path && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Ficheiro Anexo / Evidência
                  </p>
                  
                  {selectedKnowledgeTicket.attachment_path.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                    <a href={`${API_URL}/${selectedKnowledgeTicket.attachment_path}`} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-zinc-700 hover:border-blue-500 transition shadow-sm max-w-sm">
                      <img 
                        src={`${API_URL}/${selectedKnowledgeTicket.attachment_path}`} 
                        alt="Anexo da Tarefa Concluída" 
                        className="w-full h-auto object-cover max-h-60"
                      />
                    </a>
                  ) : (
                    <a href={`${API_URL}/${selectedKnowledgeTicket.attachment_path}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-xl w-fit border border-blue-500/20 hover:bg-blue-500/20 transition">
                      <Download className="w-4 h-4" /> Transferir Documento Anexo
                    </a>
                  )}
                </div>
              )}

            </div>

            {/* Rodapé do Modal */}
            <div className="pt-4 mt-4 border-t border-zinc-800 flex justify-end">
              <button 
                onClick={() => setSelectedKnowledgeTicket(null)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}