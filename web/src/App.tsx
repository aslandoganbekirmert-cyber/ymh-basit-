import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Building2, Truck, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { API_BASE_URL } from './config';
import Dashboard from './pages/Dashboard';

// --- Sidebar Navigation Component ---
const Sidebar = () => {
  const location = useLocation();
  const menuItems = [
    { icon: LayoutDashboard, label: 'Panel', path: '/' },
    { icon: FileText, label: 'İrsaliyeler', path: '/transactions' },
    { icon: Building2, label: 'Projeler', path: '/projects' },
    { icon: Truck, label: 'Araçlar', path: '/vehicles' },
    { icon: Settings, label: 'Ayarlar', path: '/settings' },
  ];

  return (
    <div className="w-64 bg-zinc-950 border-r border-zinc-900 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo Area */}
      <div className="h-20 flex items-center px-6 border-b border-zinc-900">
        <div className="text-yellow-500 font-bold text-2xl tracking-tight flex items-center gap-2">
          ⚡ YMH <span className="text-white font-light text-sm">ADMIN</span>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? 'bg-yellow-500/10 text-yellow-500 font-medium'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
            >
              <item.icon size={20} className={isActive ? 'text-yellow-500' : 'text-zinc-500 group-hover:text-white'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Logic */}
      <div className="p-4 border-t border-zinc-900">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
          <LogOut size={20} />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
};

// --- Page Placeholders ---
const Transactions = () => <div className="text-white text-2xl font-bold">📋 İrsaliyeler (Çok Yakında)</div>;
const Projects = () => <div className="text-white text-2xl font-bold">🏗️ Proje Yönetimi</div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black text-white pl-64">
        <Sidebar />
        <main className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="*" element={<div className="text-zinc-500">Sayfa Bulunamadı</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
