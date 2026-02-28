import { Layers, Truck, Scale, MapPin } from 'lucide-react';

const Card = ({ title, value, unit, icon: Icon, color }: any) => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between hover:bg-zinc-800/50 transition-colors">
        <div className="flex items-center justify-between mb-4">
            <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{title}</span>
            <div className={`p-2 rounded-lg bg-${color}-500/10`}>
                <Icon size={20} className={`text-${color}-500`} />
            </div>
        </div>
        <div className="flex items-end gap-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">{value}</h2>
            <span className="text-zinc-500 mb-1 font-medium">{unit}</span>
        </div>
    </div>
);

export default function Dashboard() {
    // Statik verilerle başlayalım (Test için)
    const stats = {
        todayCount: 12,
        todayTonnage: 240,
        activeProjects: 3,
        totalVehicles: 8
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Hoşgeldin, Admin 👋</h1>
                    <p className="text-zinc-500">Bugünkü saha operasyonlarına genel bakış.</p>
                </div>

                {/* Date / Filters (Future) */}
                <div className="text-zinc-500 text-sm bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800">
                    📅 {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="Bugünkü Sefer" value={stats.todayCount} unit="Adet" icon={Truck} color="blue" />
                <Card title="Toplam Tonaj" value={stats.todayTonnage} unit="Ton" icon={Scale} color="yellow" />
                <Card title="Aktif Şantiye" value={stats.activeProjects} unit="Lokasyon" icon={MapPin} color="green" />
                <Card title="Kayıtlı Plaka" value={stats.totalVehicles} unit="Araç" icon={Layers} color="purple" />
            </div>

            {/* Recent Activity Placeholders */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-96">
                {/* Main Chart Area */}
                <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex items-center justify-center text-zinc-600 border-dashed">
                    📊 Grafik Alanı (Gelecek)
                </div>

                {/* Live Feed */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Canlı Akış
                    </h3>
                    <div className="space-y-4">
                        <div className="flex gap-4 items-start border-l-2 border-zinc-800 pl-4 py-1">
                            <div className="flex-1">
                                <p className="text-sm text-zinc-300"><span className="font-bold text-white">34 ABC 12</span> - Kum Döktü</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-yellow-500 font-mono">22 Ton</span>
                                    <span className="text-xs text-zinc-600">2 dk önce</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 items-start border-l-2 border-zinc-800 pl-4 py-1 opacity-60">
                            <div className="flex-1">
                                <p className="text-sm text-zinc-300"><span className="font-bold text-white">35 DEF 99</span> - Beton Mikseri</p>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-blue-500 font-mono">8 m³</span>
                                    <span className="text-xs text-zinc-600">15 dk önce</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
