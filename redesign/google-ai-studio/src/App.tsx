import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BookOpen,
  Check,
  Search,
  MoreHorizontal,
  Bell,
  HelpCircle,
  User,
  Printer,
  Plus,
  MapPin,
  Download,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILS ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- TYPES ---
type Profile = 'professor' | 'admin';

// --- COMPONENTS ---

const Sidebar = ({ profile, setProfile }: { profile: Profile, setProfile: (p: Profile) => void }) => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Painel' },
    { icon: GraduationCap, label: 'Atribuições', active: true },
    { icon: Users, label: 'Docentes' },
    { icon: BookOpen, label: 'Disciplinas' },
    { icon: Settings, label: 'Configurações' },
  ];

  return (
    <aside className="w-64 bg-admin-sidebar h-screen sticky top-0 flex flex-col border-r border-[#e2e8f0]">
      <div className="p-6 flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
          <GraduationCap size={20} />
        </div>
        <div>
          <h1 className="text-sm font-display font-bold tracking-tight text-primary leading-none">
            Portal Acadêmico
          </h1>
          <p className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase mt-1">
            GESTÃO DE DOCENTES
          </p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3 rounded-lg text-xs font-bold tracking-wider transition-all",
              item.active 
                ? "bg-accent-blue/10 text-accent-blue shadow-sm" 
                : "text-secondary/60 hover:text-primary hover:bg-surface/50"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-2">
        <button 
          onClick={() => setProfile(profile === 'professor' ? 'admin' : 'professor')}
          className="w-full flex items-center gap-4 px-4 py-3 text-xs font-bold tracking-wider text-secondary/60 hover:text-primary transition-all"
        >
          <User size={18} />
          MUDAR PARA {profile === 'professor' ? 'ADMIN' : 'PROFESSOR'}
        </button>
        
        <button className="w-full btn-primary py-3 flex items-center justify-center gap-2 mb-4">
          <span className="text-lg">+</span> Nova Atribuição
        </button>

        <button className="w-full flex items-center gap-4 px-4 py-3 text-xs font-bold tracking-wider text-secondary/60 hover:text-primary transition-all">
          <LogOut size={18} />
          SAIR
        </button>
      </div>
    </aside>
  );
};

const Header = ({ profile }: { profile: Profile }) => {
  const tabs = profile === 'professor' 
    ? ['Minha Grade', 'Planos de Ensino', 'Relatórios']
    : ['Sistema de Atribuição', 'Semestre 2024.2', 'Campus Central'];

  return (
    <header className="h-20 flex items-center justify-between px-12 bg-white border-b border-[#e2e8f0] sticky top-0 z-10">
      <div className="flex items-center gap-10">
        <h2 className="text-xl font-display font-bold text-primary">
          {profile === 'professor' ? 'Portal do Docente' : 'Sistema de Atribuição'}
        </h2>
        
        <nav className="flex items-center gap-6">
          {tabs.map((tab, i) => (
            <button 
              key={tab} 
              className={cn(
                "text-sm font-bold tracking-tight transition-all pb-1 border-b-2",
                i === 0 ? "text-primary border-primary" : "text-secondary/40 border-transparent hover:text-secondary/60"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-secondary/40 hover:text-primary transition-colors">
          <Bell size={20} />
        </button>
        <button className="text-secondary/40 hover:text-primary transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-[#e2e8f0]">
          <div className="w-8 h-8 rounded-full bg-surface overflow-hidden border border-[#e2e8f0]">
            <img 
              src="https://picsum.photos/seed/user/100/100" 
              alt="User" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

const Stepper = ({ currentStep, steps, profile }: { currentStep: number, steps: string[], profile: Profile }) => {
  if (profile === 'admin') {
    const adminSteps = [
      { title: 'RECEBER PREFERÊNCIAS', desc: '3/10 Envios recebidos dos docentes.', status: 'completed' },
      { title: 'CONSOLIDAR RASCUNHO', desc: 'Revisar lacunas e consolidar por curso.', status: 'active' },
      { title: 'RESOLVER CONFLITOS', desc: 'Corrigir choques de horários e locais.', status: 'upcoming' },
      { title: 'PUBLICAR GRADE', desc: 'Validar e liberar horários oficiais.', status: 'upcoming' },
    ];

    return (
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] font-bold tracking-widest text-primary uppercase">
            FECHAMENTO DA GRADE EM 4 ETAPAS
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-secondary/40 uppercase tracking-wider">PRÓXIMO PASSO:</span>
            <span className="bg-accent-blue/10 text-accent-blue px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
              Consolidar rascunho com 7 pendências
            </span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {adminSteps.map((s, i) => (
            <div 
              key={s.title}
              className={cn(
                "p-5 rounded-xl border transition-all relative overflow-hidden",
                s.status === 'active' ? "bg-white border-accent-blue shadow-xl shadow-accent-blue/5 ring-1 ring-accent-blue/10" : 
                s.status === 'completed' ? "bg-surface-low border-[#e2e8f0]" : "bg-white border-[#e2e8f0] opacity-50"
              )}
            >
              {s.status === 'active' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-blue" />
              )}
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  s.status === 'active' ? "bg-accent-blue text-white" : 
                  s.status === 'completed' ? "bg-green-500 text-white" : "bg-surface text-secondary/40"
                )}>
                  {s.status === 'completed' ? <Check size={14} /> : i + 1}
                </div>
                {s.status === 'active' && (
                  <span className="text-[8px] font-bold text-accent-blue uppercase tracking-widest bg-accent-blue/5 px-2 py-1 rounded border border-accent-blue/20">
                    EM FOCO
                  </span>
                )}
              </div>
              <h4 className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-1",
                s.status === 'active' ? "text-primary" : "text-secondary/40"
              )}>{s.title}</h4>
              <p className="text-[10px] text-secondary/60 font-medium leading-tight">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-16 py-12">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={label} className="flex items-center gap-4 group">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500",
              isActive ? "bg-primary text-white scale-110 shadow-lg" : 
              isCompleted ? "bg-primary/10 text-primary" : "bg-surface text-secondary/40"
            )}>
              {isCompleted ? <Check size={18} /> : stepNumber}
            </div>
            <span className={cn(
              "text-sm font-bold tracking-tight transition-all duration-500",
              isActive ? "text-primary" : "text-secondary/40"
            )}>
              {label}
            </span>
            {index < steps.length - 1 && (
              <div className="w-12 h-[2px] bg-surface rounded-full overflow-hidden">
                <div className={cn(
                  "h-full bg-primary transition-all duration-700",
                  isCompleted ? "w-full" : "w-0"
                )} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AdminContextBar = () => {
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 mb-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-12">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">CURSO / PROGRAMA</p>
          <h3 className="text-lg font-display font-bold text-accent-blue">ENGENHARIA DE SOFTWARE</h3>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">SEMESTRE ATUAL</p>
          <h3 className="text-lg font-display font-bold text-primary">2024.2</h3>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">COORDENADOR RESP.</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[8px] font-bold">RS</div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-tight">DR. RICARDO SILVA</h3>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="bg-accent-blue/10 text-accent-blue px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />
          Rascunho em Edição
        </span>
      </div>
    </div>
  );
};

// --- PROFESSOR SCREENS ---

const StepFormation = () => (
  <div className="max-w-3xl mx-auto space-y-12">
    <div className="space-y-2">
      <h3 className="text-2xl font-display font-bold text-primary">Formação Acadêmica</h3>
      <p className="text-secondary/60">Mantenha seu currículo atualizado para garantir a elegibilidade em novas matérias.</p>
    </div>

    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-2">
        <label className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">Graduação Principal</label>
        <input 
          type="text" 
          defaultValue="Engenharia de Software"
          className="w-full bg-surface-low border-none rounded-md px-4 py-3 focus:ring-2 ring-primary/20 transition-all outline-none" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">Especialização</label>
        <input 
          type="text" 
          placeholder="Ex: Gestão de Projetos"
          className="w-full bg-surface-low border-none rounded-md px-4 py-3 focus:ring-2 ring-primary/20 transition-all outline-none" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">Mestrado</label>
        <input 
          type="text" 
          defaultValue="Ciência da Computação"
          className="w-full bg-surface-low border-none rounded-md px-4 py-3 focus:ring-2 ring-primary/20 transition-all outline-none" 
        />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">Doutorado</label>
        <input 
          type="text" 
          defaultValue="Inteligência Artificial"
          className="w-full bg-surface-low border-none rounded-md px-4 py-3 focus:ring-2 ring-primary/20 transition-all outline-none" 
        />
      </div>
      <div className="col-span-2 space-y-2">
        <label className="text-[10px] font-bold tracking-wider text-secondary/60 uppercase">Área / Subárea de Atuação</label>
        <div className="flex flex-wrap gap-2">
          {['Sistemas Distribuídos', 'Machine Learning', 'Arquitetura de Software'].map(tag => (
            <span key={tag} className="px-3 py-1 bg-primary/5 text-primary text-xs font-medium rounded-full border border-primary/10">
              {tag}
            </span>
          ))}
          <button className="px-3 py-1 border border-dashed border-secondary/30 text-secondary/60 text-xs font-medium rounded-full hover:border-primary hover:text-primary transition-all">
            + Adicionar Área
          </button>
        </div>
      </div>
    </div>
  </div>
);

const StepEligibleSubjects = () => {
  const subjects = [
    { name: 'Engenharia de Software', fit: 98, course: 'Bacharelado', semester: '4º Semestre', code: 'ESW400' },
    { name: 'Algoritmos Avançados', fit: 85, course: 'Ciência da Comp.', semester: '2º Semestre', code: 'ALGO200' },
    { name: 'Sistemas Operacionais', fit: 62, course: 'Engenharia', semester: '5º Semestre', code: 'SOP500' },
    { name: 'Inteligência Artificial', fit: 95, course: 'Ciência da Comp.', semester: '6º Semestre', code: 'IA600' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold text-primary">Matérias Elegíveis</h3>
          <p className="text-secondary/60">Com base na sua formação, estas são as matérias com maior afinidade.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/40" size={16} />
          <input 
            type="text" 
            placeholder="Buscar matéria..." 
            className="pl-10 pr-4 py-2 bg-surface-low border-none rounded-full text-xs outline-none focus:ring-2 ring-primary/10 w-64"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <div key={subject.code} className="card-academic hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-widest text-secondary/40 uppercase">{subject.code}</p>
                <h4 className="text-lg font-display font-bold text-primary group-hover:text-secondary transition-colors">{subject.name}</h4>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-primary bg-surface px-2 py-1 rounded">{subject.fit}% Fit</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider text-secondary/60 uppercase">
              <span>{subject.course}</span>
              <div className="w-1 h-1 rounded-full bg-surface" />
              <span>{subject.semester}</span>
            </div>
            <div className="mt-6 flex justify-end">
              <button className="text-xs font-bold text-primary flex items-center gap-2 group-hover:gap-3 transition-all">
                SELECIONAR <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepClasses = () => {
  const classes = [
    { id: 'T-A', name: 'Turma A', period: 'Noturno', subject: 'Engenharia de Software', campus: 'Central', students: 42 },
    { id: 'T-B', name: 'Turma B', period: 'Vespertino', subject: 'Engenharia de Software', campus: 'Central', students: 38 },
    { id: 'T-C', name: 'Turma C', period: 'Noturno', subject: 'Algoritmos Avançados', campus: 'Central', students: 35 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-2">
        <h3 className="text-2xl font-display font-bold text-primary">Seleção de Turmas</h3>
        <p className="text-secondary/60">Escolha as turmas disponíveis para as matérias selecionadas.</p>
      </div>

      <div className="space-y-4">
        {classes.map((item) => (
          <div key={item.id} className="card-academic flex items-center justify-between hover:bg-surface-low/30 transition-all">
            <div className="flex items-center gap-8">
              <div className="w-12 h-12 bg-primary/5 rounded-md flex items-center justify-center text-primary font-bold">
                {item.id}
              </div>
              <div>
                <h4 className="font-display font-bold text-primary">{item.name}</h4>
                <p className="text-xs text-secondary/60">{item.subject}</p>
              </div>
              <div className="h-8 w-[1px] bg-surface" />
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-wider text-secondary/40 uppercase">Período</p>
                <p className="text-xs font-medium text-primary">{item.period}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold tracking-wider text-secondary/40 uppercase">Alunos</p>
                <p className="text-xs font-medium text-primary">{item.students}</p>
              </div>
            </div>
            <button className="btn-secondary py-2 px-4 text-xs">
              VINCULAR TURMA
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepSchedules = () => {
  const [selectedSlots, setSelectedSlots] = useState<string[]>(['seg-3', 'seg-4', 'qua-1', 'qua-2', 'ter-3', 'ter-4']);

  const days = [
    { id: 'seg', label: 'SEGUNDA', short: 'SEG' },
    { id: 'ter', label: 'TERÇA', short: 'TER' },
    { id: 'qua', label: 'QUARTA', short: 'QUA' },
    { id: 'qui', label: 'QUINTA', short: 'QUI' },
    { id: 'sex', label: 'SEXTA', short: 'SEX' },
  ];

  const slots = [
    { id: 1, time: '19:25 - 20:15', label: 'Bloco 1' },
    { id: 2, time: '20:15 - 21:05', label: 'Bloco 2' },
    { id: 'interval', time: 'INTERVALO', label: '' },
    { id: 3, time: '21:20 - 22:10', label: 'Bloco 3' },
    { id: 4, time: '22:10 - 23:00', label: 'Bloco 4' },
  ];

  const playSelectSound = (isSelecting: boolean) => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      // Higher pitch for selection, lower for deselection
      const startFreq = isSelecting ? 880 : 440;
      const endFreq = isSelecting ? 440 : 220;
      
      osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.1);
      
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  };

  const toggleSlot = (dayId: string, slotId: string | number) => {
    if (slotId === 'interval') return;
    const key = `${dayId}-${slotId}`;
    
    if (selectedSlots.includes(key)) {
      playSelectSound(false);
      setSelectedSlots(selectedSlots.filter(s => s !== key));
    } else {
      playSelectSound(true);
      setSelectedSlots([...selectedSlots, key]);
    }
  };

  const selectAll = () => {
    const allKeys: string[] = [];
    days.forEach(day => {
      slots.forEach(slot => {
        if (slot.id !== 'interval') {
          allKeys.push(`${day.id}-${slot.id}`);
        }
      });
    });
    
    const isAllSelected = allKeys.every(key => selectedSlots.includes(key));
    
    if (isAllSelected) {
      setSelectedSlots([]);
      playSelectSound(false);
    } else {
      setSelectedSlots(allKeys);
      playSelectSound(true);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold tracking-[0.2em] text-secondary/40 uppercase">PROCESSO DE ATRIBUIÇÃO 2024.2</p>
          <h2 className="text-4xl font-display font-bold text-primary">Preferências de Horário</h2>
        </div>
        <div className="flex items-center gap-6 bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">HORAS SELECIONADAS</p>
            <p className="text-2xl font-display font-bold text-primary">{selectedSlots.length.toString().padStart(2, '0')}h <span className="text-sm text-secondary/40 font-sans">/ 40h</span></p>
          </div>
          <div className="h-10 w-px bg-[#e2e8f0]" />
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">STATUS CARGA</p>
            <span className="bg-accent-blue/10 text-accent-blue px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">VÁLIDO</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Sugeridos */}
          <div className="card-academic bg-surface-low/30 border-dashed border-2">
            <div className="flex items-center gap-2 mb-6">
              <Plus size={16} className="text-secondary/40 rotate-45" />
              <h4 className="text-xs font-bold text-primary uppercase tracking-widest">Sugeridos por Afinidade</h4>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Engenharia de Software', fit: '98% Fit', desc: 'BACHARELADO • 4º SEMESTRE' },
                { name: 'Algoritmos Avançados', fit: '85% Fit', desc: 'CIÊNCIA DA COMP. • 2º SEMESTRE' },
                { name: 'Sistemas Operacionais', fit: '62% Fit', desc: 'ENGENHARIA • 5º SEMESTRE' },
              ].map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-sm hover:border-accent-blue/40 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-1">
                    <h5 className="text-sm font-bold text-primary group-hover:text-accent-blue transition-colors">{item.name}</h5>
                    <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/5 px-2 py-0.5 rounded">{item.fit}</span>
                  </div>
                  <p className="text-[10px] text-secondary/40 font-bold uppercase tracking-wider">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div className="card-academic bg-[#536171] text-white">
            <div className="flex items-center gap-2 mb-6">
              <FileText size={16} className="opacity-60" />
              <h4 className="text-xs font-bold uppercase tracking-widest opacity-60">Resumo de Seleção</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1 border-l-2 border-accent-blue/40 pl-4">
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">TURMA A - NOTURNO</p>
                  <h5 className="text-sm font-bold">Engenharia de Software</h5>
                  <p className="text-[10px] opacity-60">4 Horas/Semana</p>
                </div>
                <div className="space-y-1 border-l-2 border-accent-blue/40 pl-4">
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">TURMA C - VESPERTINO</p>
                  <h5 className="text-sm font-bold">Algoritmos Avançados</h5>
                  <p className="text-[10px] opacity-60">4 Horas/Semana</p>
                </div>
              </div>
              <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                <p className="text-xs font-bold opacity-60">Total Parcial</p>
                <p className="text-3xl font-display font-bold">{selectedSlots.length.toString().padStart(2, '0')}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="col-span-8 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-[#536171]" />
                <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest">Selecionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-white border border-[#e2e8f0]" />
                <span className="text-[10px] font-bold text-secondary/60 uppercase tracking-widest">Disponível</span>
              </div>
            </div>
            <button 
              onClick={selectAll}
              className="flex items-center gap-2 text-[10px] font-bold text-accent-blue hover:text-accent-blue/80 uppercase tracking-widest transition-all border border-accent-blue/20 px-3 py-1.5 rounded-lg hover:bg-accent-blue/5 shadow-sm"
            >
              <CheckSquare size={14} />
              {selectedSlots.length === (days.length * (slots.length - 1)) ? 'Limpar Tudo' : 'Selecionar Tudo'}
            </button>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-[140px_repeat(5,1fr)] border-b border-[#e2e8f0]">
              <div className="p-4" />
              {days.map(day => (
                <div key={day.id} className="p-4 text-center border-l border-[#e2e8f0] bg-surface-low/30">
                  <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest mb-1">{day.label}</p>
                  <p className="text-sm font-display font-bold text-primary">{day.short}</p>
                </div>
              ))}
            </div>

            {slots.map((slot, i) => (
              <div key={i} className={cn(
                "grid grid-cols-[140px_repeat(5,1fr)] border-b border-[#e2e8f0] last:border-b-0",
                slot.id === 'interval' ? "bg-surface-low/30" : ""
              )}>
                <div className="p-4 flex flex-col justify-center bg-surface-low/10">
                  <p className="text-[11px] font-bold text-primary">{slot.time}</p>
                  {slot.label && <p className="text-[9px] text-secondary/40 font-bold uppercase tracking-wider">{slot.label}</p>}
                </div>

                {slot.id === 'interval' ? (
                  <div className="col-span-5 p-2 text-[10px] font-bold text-secondary/20 tracking-[0.5em] text-center uppercase">
                    INTERVALO
                  </div>
                ) : (
                  days.map(day => {
                    const key = `${day.id}-${slot.id}`;
                    const isSelected = selectedSlots.includes(key);

                    return (
                      <motion.div 
                        key={day.id} 
                        onClick={() => toggleSlot(day.id, slot.id)}
                        initial={false}
                        animate={{
                          backgroundColor: isSelected ? "#536171" : "rgba(255, 255, 255, 0)"
                        }}
                        whileHover={{ backgroundColor: isSelected ? "#536171" : "rgba(59, 75, 107, 0.08)" }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 400, 
                          damping: 25,
                          backgroundColor: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } 
                        }}
                        className={cn(
                          "p-2 border-l border-[#e2e8f0] min-h-[80px] cursor-pointer relative flex items-center justify-center overflow-hidden"
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {isSelected && (
                            <motion.div 
                              key="selected"
                              initial={{ opacity: 0, scale: 0.5, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -10 }}
                              transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              className="flex flex-col items-center gap-1"
                            >
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1, type: "spring" }}
                                className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shadow-sm"
                              >
                                <Check size={14} className="text-white" />
                              </motion.div>
                              <span className="text-[8px] font-bold text-white uppercase tracking-[0.15em]">SELECIONADO</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        {/* Wave Ripple Effect on Click */}
                        <motion.div
                          className="absolute inset-0 bg-white/10 pointer-events-none"
                          initial={{ scale: 0, opacity: 0 }}
                          whileTap={{ scale: 4, opacity: 1 }}
                          transition={{ duration: 0.4 }}
                        />
                      </motion.div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StepReview = () => {
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-3 gap-12">
      <div className="col-span-2 space-y-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-display font-bold text-primary">Revisão das Preferências</h3>
          <div className="card-academic space-y-6">
            <div className="flex justify-between items-center border-b border-surface pb-4">
              <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Matérias e Turmas</h4>
              <button className="text-xs text-secondary/60 hover:text-primary underline">Editar</button>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-primary">Engenharia de Software</p>
                  <p className="text-xs text-secondary/60">Turma A • Noturno</p>
                </div>
                <p className="text-sm font-medium text-primary">04 Horas/Semana</p>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold text-primary">Algoritmos Avançados</p>
                  <p className="text-xs text-secondary/60">Turma C • Noturno</p>
                </div>
                <p className="text-sm font-medium text-primary">04 Horas/Semana</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Grade de Preferência</h4>
          <div className="card-academic p-0 overflow-hidden">
            <div className="grid grid-cols-6 bg-surface-low text-[10px] font-bold tracking-widest text-secondary/60 uppercase">
              <div className="p-3 border-r border-surface">Horário</div>
              <div className="p-3 border-r border-surface">SEG</div>
              <div className="p-3 border-r border-surface">TER</div>
              <div className="p-3 border-r border-surface">QUA</div>
              <div className="p-3 border-r border-surface">QUI</div>
              <div className="p-3">SEX</div>
            </div>
            {[1, 2, 3, 4].map(row => (
              <div key={row} className="grid grid-cols-6 border-t border-surface text-xs">
                <div className="p-3 border-r border-surface bg-surface-low/30 text-secondary/40">Bloco {row}</div>
                {[1, 2, 3, 4, 5].map(col => (
                  <div key={col} className={cn(
                    "p-3 border-r border-surface h-12",
                    (row === 3 && col === 1) || (row === 4 && col === 1) ? "bg-primary/10" : ""
                  )}>
                    {((row === 3 && col === 1) || (row === 4 && col === 1)) && <Check size={12} className="text-primary" />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card-academic bg-primary text-white space-y-6">
          <h4 className="text-xs font-bold uppercase tracking-widest opacity-60">Resumo Final</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <span className="text-sm opacity-80">Carga Total</span>
              <span className="text-3xl font-display font-bold">08h</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="w-[20%] h-full bg-white" />
            </div>
            <p className="text-[10px] opacity-60 uppercase tracking-wider">Mínimo obrigatório: 20h</p>
          </div>
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle size={14} className="text-white" />
              <span className="opacity-80">Carga horária abaixo do mínimo</span>
            </div>
          </div>
        </div>
        
        <div className="card-academic border-dashed border-2 flex flex-col items-center justify-center text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-secondary/40">
            <FileText size={24} />
          </div>
          <p className="text-xs font-medium text-secondary/60 px-4">Ao enviar, suas preferências serão analisadas pela coordenação.</p>
        </div>
      </div>
    </div>
  );
};

// --- ADMIN SCREENS ---

const AdminConsolidation = () => {
  const days = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const slots = [
    { time: '18:30 - 19:20', content: [
      { subject: 'ENG. REQUISITOS', prof: 'Prof. Aline Rocha', room: 'Sala 101', type: 'normal' },
      { subject: 'ALGORITMOS', prof: 'Conflito Detectado', room: 'Revisar horários', type: 'conflict' },
      { subject: 'SIST. DISTRIBUÍDOS', prof: 'Prof. K. Mendes', room: 'Lab 04', type: 'normal' },
      { subject: 'GESTÃO DE PROJETOS', prof: 'Prof. Mariana Souza', room: 'Sala 202', type: 'normal' },
      { type: 'free' }
    ]},
    { time: '19:20 - 20:10', content: [{ type: 'free' }, { type: 'free' }, { type: 'free' }, { type: 'free' }, { type: 'free' }] },
    { time: '20:10 - 20:30', type: 'interval', label: 'INTERVALO' },
    { time: '20:30 - 21:20', content: [{ type: 'free' }, { type: 'free' }, { type: 'free' }, { type: 'free' }, { type: 'free' }] },
    { time: '21:20 - 22:10', content: [
      { subject: 'ÉTICA PROFISSIONAL', prof: 'Prof. Jonas D\'Avila', room: 'Sala 101', type: 'normal' },
      { type: 'free' },
      { subject: 'SISTEMAS OPERACIONAIS', prof: 'Prof. Ricardo Almeida', room: 'Lab 02', type: 'normal' },
      { type: 'free' },
      { subject: 'MATEMÁTICA DISCRETA', prof: 'Prof. Clara Campos', room: 'Sala 101', type: 'normal' }
    ]},
  ];

  return (
    <div className="space-y-8 pb-32">
      <AdminContextBar />
      <Stepper currentStep={2} steps={[]} profile="admin" />

      <div className="card-academic overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-primary">QUADRO SEMANAL</h2>
            <p className="text-xs text-secondary/40 mt-1">Visualize e organize os blocos de aula para todos os dias</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-surface-low p-1 rounded-lg">
              <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white shadow-sm rounded-md text-primary">Rascunho</button>
              <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-secondary/40">Oficial</button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-surface-low rounded-lg transition-colors text-secondary/60"><Printer size={18} /></button>
              <button className="p-2 hover:bg-surface-low rounded-lg transition-colors text-secondary/60"><Download size={18} /></button>
            </div>
          </div>
        </div>

        <div className="border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-surface-low/50 border-b border-[#e2e8f0]">
            <div className="p-4 text-[10px] font-bold text-secondary/40 uppercase tracking-widest text-center border-r border-[#e2e8f0]">BLOCO</div>
            {days.map(day => (
              <div key={day} className="p-4 text-[10px] font-bold text-secondary/40 uppercase tracking-widest text-center border-r border-[#e2e8f0] last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {slots.map((slot, i) => (
            <div key={i} className={cn(
              "grid grid-cols-[120px_repeat(5,1fr)] border-b border-[#e2e8f0] last:border-b-0",
              slot.type === 'interval' ? "bg-surface-low/30" : "bg-white"
            )}>
              <div className="p-4 flex items-center justify-center text-[10px] font-bold text-primary border-r border-[#e2e8f0]">
                {slot.time}
              </div>
              
              {slot.type === 'interval' ? (
                <div className="col-span-5 p-2 text-[10px] font-bold text-secondary/20 tracking-[0.3em] text-center uppercase">
                  {slot.time} ({slot.label})
                </div>
              ) : (
                slot.content?.map((item, j) => (
                  <div key={j} className="p-3 border-r border-[#e2e8f0] last:border-r-0 min-h-[100px] flex">
                    {item.type === 'free' ? (
                      <button className="w-full h-full border-2 border-dashed border-[#e2e8f0] rounded-lg flex flex-col items-center justify-center gap-2 group hover:border-accent-blue/40 transition-all">
                        <div className="w-6 h-6 rounded-full bg-surface-low flex items-center justify-center group-hover:bg-accent-blue/10 transition-all">
                          <Plus size={14} className="text-secondary/40 group-hover:text-accent-blue" />
                        </div>
                        <span className="text-[8px] font-bold text-secondary/20 uppercase tracking-widest">LIVRE</span>
                      </button>
                    ) : (
                      <div className={cn(
                        "w-full p-3 rounded-lg border flex flex-col justify-between transition-all",
                        item.type === 'conflict' ? "bg-accent-red/5 border-accent-red/30" : "bg-accent-blue/5 border-accent-blue/20"
                      )}>
                        <div>
                          <h5 className={cn(
                            "text-[9px] font-bold leading-tight mb-1",
                            item.type === 'conflict' ? "text-accent-red" : "text-accent-blue"
                          )}>{item.subject}</h5>
                          <p className="text-[8px] text-secondary/60 font-medium">{item.prof}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <MapPin size={8} className="text-secondary/40" />
                          <span className="text-[8px] text-secondary/40 font-bold uppercase tracking-wider">{item.room}</span>
                        </div>
                        {item.type === 'conflict' && (
                          <div className="mt-2 pt-2 border-t border-accent-red/10 flex items-center gap-1">
                            <AlertCircle size={10} className="text-accent-red" />
                            <span className="text-[8px] font-bold text-accent-red uppercase tracking-widest">Conflito</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-bold tracking-widest text-primary uppercase">ALERTAS DE LACUNAS E CONFLITOS</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent-red/5 border-l-4 border-accent-red p-4 rounded-r-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="text-accent-red" size={20} />
              <div>
                <h4 className="text-[10px] font-bold text-accent-red uppercase tracking-widest">CONFLITO DE HORÁRIO</h4>
                <p className="text-xs text-secondary/60">Prof. Ricardo Silva já possui aula Terça-feira (18:30).</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-accent-red uppercase tracking-widest border-b border-accent-red/30">Resolver</button>
          </div>
          <div className="bg-accent-blue/5 border-l-4 border-accent-blue p-4 rounded-r-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="text-accent-blue" size={20} />
              <div>
                <h4 className="text-[10px] font-bold text-accent-blue uppercase tracking-widest">LACUNA DE ATRIBUIÇÃO</h4>
                <p className="text-xs text-secondary/60">Disciplina 'Estatística' sem docente vinculado.</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-accent-blue uppercase tracking-widest border-b border-accent-blue/30">Atribuir</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card-academic">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="text-accent-blue" size={18} />
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">GERENCIAR SLOT DE AULA</h4>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">DIA DA SEMANA</label>
                <select className="input-academic"><option>Segunda-feira</option></select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">INÍCIO</label>
                <input type="time" className="input-academic" defaultValue="18:30" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">DISCIPLINA</label>
              <select className="input-academic"><option>Selecione a disciplina...</option></select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">LOCAL / SALA</label>
              <div className="flex flex-wrap gap-2 p-3 bg-surface-low rounded-lg border border-[#e2e8f0]">
                <span className="bg-accent-blue/10 text-accent-blue px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1">Sala 101 <Plus size={10} className="rotate-45" /></span>
                <input placeholder="Adicionar local..." className="bg-transparent outline-none text-[10px] flex-1" />
              </div>
            </div>
            <button className="w-full btn-primary mt-4">Adicionar ao Quadro</button>
          </div>
        </div>

        <div className="card-academic">
          <div className="flex items-center gap-3 mb-6">
            <Users className="text-accent-blue" size={18} />
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">PERFIL DOCENTE E FILA</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">DOCENTE</label>
              <select className="input-academic"><option>Selecione um professor...</option></select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">ESTRUTURA DE CARREIRA</label>
              <select className="input-academic"><option>Magistério Superior A / Nível 1</option></select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">PRIORIDADE (0-100)</label>
                <input type="number" className="input-academic" defaultValue="100" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">CARGA ALVO</label>
                <input type="number" className="input-academic" defaultValue="20" />
              </div>
            </div>
            <button className="w-full btn-secondary mt-4">Salvar Perfil</button>
          </div>
        </div>

        <div className="card-academic">
          <div className="flex items-center gap-3 mb-6">
            <MapPin className="text-accent-blue" size={18} />
            <h4 className="text-xs font-bold text-primary uppercase tracking-widest">CATEGORIAS DE LOCAL</h4>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">CATEGORIA DE SALA</label>
              <select className="input-academic"><option>Sala 100 max</option></select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">TIPO</label>
                <select className="input-academic"><option>Teórica</option></select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">CAPACIDADE</label>
                <input type="number" className="input-academic" defaultValue="40" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">EQUIPAMENTO BASE</label>
              <textarea className="input-academic h-20 resize-none" placeholder="Projetor, bancada, etc..."></textarea>
            </div>
            <button className="w-full btn-secondary mt-2">Salvar Categoria</button>
          </div>
        </div>
      </div>

      <div className="card-academic bg-surface-low/30">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle2 className="text-accent-blue" size={18} />
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest">ATRIBUIÇÃO: PROFESSOR POR TURMA/MATÉRIA</h4>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_200px] gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">MATÉRIA</label>
            <select className="input-academic"><option>Engenharia de Requisitos</option></select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">PROFESSOR ATRIBUÍDO</label>
            <select className="input-academic"><option>Prof. Aline Rocha</option></select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">BLOCOS SEMANAIS</label>
            <input type="number" className="input-academic" defaultValue="2" />
          </div>
          <button className="btn-secondary w-full">Confirmar Atribuição</button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">PROGRESSO DA GRADE</p>
              <div className="flex items-center gap-3">
                <div className="w-48 h-2 bg-surface-low rounded-full overflow-hidden">
                  <div className="bg-accent-blue h-full w-[84%]" />
                </div>
                <span className="text-xs font-bold text-primary">84%</span>
              </div>
            </div>
            <div className="h-10 w-px bg-[#e2e8f0]" />
            <div className="flex gap-6">
              <div>
                <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">CONFLITOS</p>
                <p className="text-sm font-bold text-accent-red">03 ATIVOS</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">LACUNAS</p>
                <p className="text-sm font-bold text-accent-blue">05 PENDENTES</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="btn-secondary px-8">Salvar Rascunho</button>
            <button className="btn-primary px-8">Finalizar Etapa</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminConflicts = () => {
  return <AdminConsolidation />;
};

const AdminClosing = () => {
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-3 gap-10">
      <div className="col-span-2 space-y-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-bold text-primary">Fechamento Manual</h3>
          <p className="text-secondary/60">Ajuste fino da grade e definição de responsabilidades administrativas.</p>
        </div>

        <div className="card-academic space-y-8">
          <div className="flex items-center justify-between pb-6 border-b border-surface">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center text-primary font-bold">RS</div>
              <div>
                <h4 className="text-sm font-bold text-primary">Dr. Ricardo Silva</h4>
                <p className="text-xs text-secondary/60">Engenharia de Software • 40h Semanais</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest hover:text-primary transition-all">Ver Perfil Completo</button>
          </div>

          <div className="space-y-6">
            <h5 className="text-[10px] font-bold uppercase tracking-widest text-secondary/40">Matérias Atribuídas</h5>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Arquitetura de Software', class: 'Turma A', hours: '4h' },
                { name: 'Sistemas Distribuídos', class: 'Turma B', hours: '4h' },
                { name: 'Gestão de Projetos', class: 'Turma A', hours: '2h' },
                { name: 'Tópicos Especiais', class: 'Turma C', hours: '4h' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-surface-low rounded-md border border-surface flex justify-between items-center group hover:border-primary/20 transition-all">
                  <div>
                    <p className="text-xs font-bold text-primary">{item.name}</p>
                    <p className="text-[10px] text-secondary/60">{item.class} • {item.hours}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500">
                    <AlertCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-surface flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Carga Horária Atingida</span>
            </div>
            <button className="btn-secondary py-2 text-[10px] font-bold uppercase tracking-wider">Adicionar Matéria</button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-xl font-display font-bold text-primary">Gestão de Turma</h3>
        <div className="card-academic space-y-6">
          <div className="space-y-4">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">Selecionar Turma</p>
            <select className="w-full bg-surface-low border border-surface rounded-md px-4 py-3 text-xs font-bold text-primary outline-none focus:border-primary/40 transition-all">
              <option>Engenharia de Software - Turma A</option>
              <option>Engenharia de Software - Turma B</option>
              <option>Ciência da Computação - Turma A</option>
            </select>
          </div>

          <div className="space-y-4 pt-6 border-t border-surface">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">Coordenador da Turma</p>
            <div className="p-4 bg-primary/5 rounded-md border border-primary/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">RS</div>
              <div>
                <p className="text-xs font-bold text-primary">Dr. Ricardo Silva</p>
                <p className="text-[10px] text-secondary/60">Atribuído em 12/03</p>
              </div>
            </div>
            <button className="w-full btn-secondary py-2 text-[10px] font-bold uppercase tracking-wider">Trocar Coordenador</button>
          </div>

          <div className="space-y-4 pt-6 border-t border-surface">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">Status de Fechamento</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-primary">Matérias Atribuídas</span>
              <span className="text-xs font-bold text-primary">12 / 12</span>
            </div>
            <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminPublication = () => {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-12 py-12">
      <div className="space-y-6">
        <div className="w-24 h-24 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-100 shadow-sm">
          <CheckCircle2 size={48} />
        </div>
        <h3 className="text-4xl font-display font-bold text-primary tracking-tight">Grade Pronta para Publicação</h3>
        <p className="text-lg text-secondary/60 max-w-xl mx-auto leading-relaxed">
          O processo de atribuição 2024.2 foi concluído com sucesso. Todas as turmas possuem professores e os conflitos foram sanados.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {[
          { label: 'TURMAS FECHADAS', value: '24 / 24', sub: '100% de cobertura' },
          { label: 'DOCENTES ATRIBUÍDOS', value: '112', sub: 'Total de professores' },
          { label: 'STATUS DA GRADE', value: 'VÁLIDA', sub: 'Pronta para o sistema', color: 'text-green-600' },
        ].map((stat, i) => (
          <div key={i} className="card-academic space-y-2 text-left">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">{stat.label}</p>
            <p className={cn("text-3xl font-display font-bold text-primary", stat.color)}>{stat.value}</p>
            <p className="text-[10px] text-secondary/40 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="pt-12 space-y-8">
        <div className="card-academic bg-surface-low/30 border-dashed max-w-2xl mx-auto p-8">
          <h4 className="text-xs font-bold uppercase tracking-widest text-secondary/60 mb-6">Próximos Passos</h4>
          <div className="text-left space-y-4">
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
              <p className="text-sm text-secondary/60">Notificação automática para todos os professores via e-mail institucional.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
              <p className="text-sm text-secondary/60">Sincronização dos horários com o Portal do Aluno e Diário de Classe.</p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</div>
              <p className="text-sm text-secondary/60">Abertura do período de lançamento de planos de ensino.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <button className="btn-primary px-16 py-5 text-lg shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all">
            PUBLICAR GRADE OFICIAL 2024.2
          </button>
          <p className="text-xs text-secondary/40 max-w-md mx-auto">
            Ao clicar em publicar, esta grade se tornará a versão oficial do semestre e não poderá ser editada sem autorização do conselho.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [profile, setProfile] = useState<Profile>('professor');
  const [step, setStep] = useState(1);

  const professorSteps = ['Formação', 'Matérias', 'Turmas', 'Horários', 'Envio'];
  const adminSteps = ['RECEBER PREFERÊNCIAS', 'CONSOLIDAR RASCUNHO', 'RESOLVER CONFLITOS', 'PUBLICAR GRADE'];

  const currentSteps = profile === 'professor' ? professorSteps : adminSteps;

  const renderContent = () => {
    if (profile === 'professor') {
      switch (step) {
        case 1: return <StepFormation />;
        case 2: return <StepEligibleSubjects />;
        case 3: return <StepClasses />;
        case 4: return <StepSchedules />;
        case 5: return <StepReview />;
        default: return null;
      }
    } else {
      switch (step) {
        case 1: return <AdminConsolidation />;
        case 2: return <AdminConflicts />;
        case 3: return <AdminClosing />;
        case 4: return <AdminPublication />;
        default: return null;
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar profile={profile} setProfile={(p) => { setProfile(p); setStep(1); }} />
      
      <main className="flex-1 flex flex-col">
        <Header profile={profile} />
        
        <div className="px-12 pb-32">
          <div className="py-8 space-y-1">
            <p className="text-[10px] font-bold tracking-[0.2em] text-secondary/40 uppercase">
              PROCESSO DE ATRIBUIÇÃO 2024.2
            </p>
            <h2 className="text-4xl font-display font-bold text-primary">
              {profile === 'professor' ? 'Atribuição de Aulas' : 'Gestão de Atribuição'}
            </h2>
          </div>

          <Stepper currentStep={step} steps={currentSteps} profile={profile} />

          <AnimatePresence mode="wait">
            <motion.div
              key={`${profile}-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* FOOTER NAVIGATION */}
        <footer className="fixed bottom-0 left-64 right-0 h-24 bg-surface-low/80 backdrop-blur-md border-t border-surface flex items-center justify-between px-12 z-20">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest disabled:opacity-20 transition-all hover:gap-3"
          >
            <ChevronLeft size={16} /> ETAPA ANTERIOR
          </button>
          
          <div className="hidden md:block text-center">
            <p className="text-[10px] font-bold text-secondary/40 uppercase tracking-widest">
              As alterações são salvas automaticamente
            </p>
          </div>

          <button 
            onClick={() => setStep(Math.min(currentSteps.length, step + 1))}
            disabled={step === currentSteps.length}
            className="btn-primary flex items-center gap-2 uppercase text-xs tracking-widest"
          >
            {step === 4 ? 'PRÓXIMA ETAPA: REVISÃO E ENVIO' :
             step === currentSteps.length - 1 ? 'REVISAR E ENVIAR' : 
             step === currentSteps.length ? 'FINALIZAR PROCESSO' : 'PRÓXIMA ETAPA'} 
            <ChevronRight size={16} />
          </button>
        </footer>
      </main>
    </div>
  );
}
