'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Award
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

export default function ProjectsWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const projectsData = data?.projects_info || {};
  
  // Mock data if no real data available
  const mockProjectsData = {
    active_projects: 4,
    completed_projects: 12,
    total_budget: 45000,
    spent_budget: 32000,
    upcoming_projects: [
      {
        id: 1,
        title: 'Ανακαίνιση Κοινού Χώρου',
        status: 'planning',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        budget: 15000,
        contractor: 'Ανακαινιστικές Εργασίες ΑΕ'
      },
      {
        id: 2,
        title: 'Εγκατάσταση Φωτισμού LED',
        status: 'approved',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        budget: 8500,
        contractor: 'Ηλεκτρολογικές Επισκευές ΟΕ'
      }
    ],
    active_projects_list: [
      {
        id: 1,
        title: 'Αντικατάσταση Κλιματιστικών',
        progress: 75,
        budget: 12000,
        spent: 9000,
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        contractor: 'Κλιματιστικές Επισκευές ΑΕ'
      },
      {
        id: 2,
        title: 'Βαφή Κτιρίου',
        progress: 30,
        budget: 8000,
        spent: 2400,
        deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        contractor: 'Βαφικές Εργασίες ΟΕ'
      }
    ]
  };

  const projects = { ...mockProjectsData, ...projectsData };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'text-yellow-300 bg-yellow-500/20';
      case 'approved': return 'text-blue-300 bg-blue-500/20';
      case 'active': return 'text-green-300 bg-green-500/20';
      case 'completed': return 'text-gray-300 bg-gray-500/20';
      default: return 'text-gray-300 bg-gray-500/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning': return 'Σχεδιασμός';
      case 'approved': return 'Εγκεκριμένο';
      case 'active': return 'Ενεργό';
      case 'completed': return 'Ολοκληρώθηκε';
      default: return status;
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-indigo-500/20">
        <FileText className="w-6 h-6 text-indigo-300" />
        <h2 className="text-lg font-bold text-white">Έργα & Προσφορές</h2>
      </div>
      
      <div className="space-y-4 h-full overflow-y-auto">
        {/* Project Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-3 rounded-xl border border-green-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              <h3 className="text-xs font-semibold text-green-100">Ενεργά Έργα</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              {projects.active_projects}
            </div>
            <div className="text-xs text-green-200">σε εξέλιξη</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-xl border border-blue-500/30">
            <div className="flex items-center space-x-2 mb-2">
              <Award className="w-4 h-4 text-blue-300" />
              <h3 className="text-xs font-semibold text-blue-100">Ολοκληρώθηκαν</h3>
            </div>
            <div className="text-2xl font-bold text-white">
              {projects.completed_projects}
            </div>
            <div className="text-xs text-blue-200">έργα</div>
          </div>
        </div>

        {/* Budget Overview */}
        <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
          <div className="flex items-center space-x-2 mb-3">
            <DollarSign className="w-4 h-4 text-purple-300" />
            <h3 className="text-sm font-semibold text-purple-100">Προϋπολογισμός</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <div className="text-lg font-bold text-white">
                €{projects.total_budget.toLocaleString()}
              </div>
              <div className="text-xs text-purple-200">Συνολικός Προϋπολογισμός</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-300">
                €{projects.spent_budget.toLocaleString()}
              </div>
              <div className="text-xs text-purple-200">Δαπανήθηκε</div>
            </div>
          </div>
          
          {/* Budget Progress */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-purple-200 mb-1">
              <span>Ποσοστό Δαπανών</span>
              <span>{Math.round((projects.spent_budget / projects.total_budget) * 100)}%</span>
            </div>
            <div className="w-full bg-purple-900/50 rounded-full h-2">
              <div 
                className="bg-purple-400 h-2 rounded-full transition-all"
                style={{ width: `${(projects.spent_budget / projects.total_budget) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        {projects.active_projects_list && projects.active_projects_list.length > 0 && (
          <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 backdrop-blur-sm p-4 rounded-xl border border-cyan-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-4 h-4 text-cyan-300" />
              <h3 className="text-sm font-semibold text-cyan-100">Ενεργά Έργα</h3>
            </div>
            
            <div className="space-y-3">
              {projects.active_projects_list.slice(0, 2).map((project: any) => (
                <div key={project.id} className="bg-cyan-800/30 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {project.title}
                    </h4>
                    <div className="text-xs text-cyan-300">
                      {project.progress}%
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-cyan-900/50 rounded-full h-1.5 mb-2">
                    <div 
                      className="bg-cyan-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-300">Προϋπολογισμός:</div>
                      <div className="text-white font-semibold">€{project.budget.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-gray-300">Δαπανήθηκε:</div>
                      <div className="text-cyan-300 font-semibold">€{project.spent.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2 text-xs text-cyan-200">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(project.deadline, 'dd/MM', { locale: el })}
                    </div>
                    <div className="truncate">
                      {project.contractor}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Projects */}
        {projects.upcoming_projects && projects.upcoming_projects.length > 0 && (
          <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 backdrop-blur-sm p-4 rounded-xl border border-orange-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="w-4 h-4 text-orange-300" />
              <h3 className="text-sm font-semibold text-orange-100">Επερχόμενα Έργα</h3>
            </div>
            
            <div className="space-y-2">
              {projects.upcoming_projects.slice(0, 2).map((project: any) => (
                <div key={project.id} className="bg-orange-800/30 p-2 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {project.title}
                    </h4>
                    <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-orange-200">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(project.start_date, 'dd/MM', { locale: el })}
                    </div>
                    <div className="font-semibold">
                      €{project.budget.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="text-xs text-orange-300 mt-1 truncate">
                    {project.contractor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-lg border border-gray-600/30 text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-gray-300" />
            <div className="text-xs text-gray-300">Συνεργεία</div>
            <div className="text-sm font-bold text-white">
              {projects.active_projects + 2}
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-3 rounded-lg border border-gray-600/30 text-center">
            <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-gray-300" />
            <div className="text-xs text-gray-300">Κρίσιμα</div>
            <div className="text-sm font-bold text-white">1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
