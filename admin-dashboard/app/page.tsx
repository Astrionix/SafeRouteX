'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { io, Socket } from 'socket.io-client';
import {
    Shield, AlertTriangle, MapPin, Users, Camera, Lightbulb,
    FileWarning, CheckCircle, XCircle, Eye, Clock, TrendingUp
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminMap = dynamic(() => import('@/components/AdminMap'), { ssr: false });

interface SOSEvent {
    sosId: string;
    userId: string;
    userName: string;
    userPhone: string;
    location: { lat: number; lon: number };
    startedAt: string;
}

interface Report {
    id: string;
    type: string;
    description: string;
    lat: number;
    lon: number;
    reporter_name: string;
    created_at: string;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'sos' | 'reports' | 'analytics'>('sos');
    const [activeSOS, setActiveSOS] = useState<SOSEvent[]>([]);
    const [pendingReports, setPendingReports] = useState<Report[]>([]);
    const [stats, setStats] = useState({
        activeSos: 0, pendingReports: 0, activeCctv: 0, brokenLights: 0, crimes30d: 0
    });
    const [socket, setSocket] = useState<Socket | null>(null);
    const [selectedSOS, setSelectedSOS] = useState<SOSEvent | null>(null);

    // Initialize Socket.IO connection
    useEffect(() => {
        const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000');

        newSocket.on('connect', () => {
            console.log('Admin connected to server');
            newSocket.emit('auth', 'dev-token'); // For demo
            newSocket.emit('admin:subscribe');
        });

        newSocket.on('sos:new', (data: SOSEvent) => {
            setActiveSOS(prev => [data, ...prev]);
            toast.error(`🆘 New SOS from ${data.userName}!`, { duration: 10000 });
        });

        newSocket.on('sos:location', (data: any) => {
            setActiveSOS(prev => prev.map(sos =>
                sos.sosId === data.sosId ? { ...sos, location: { lat: data.lat, lon: data.lon } } : sos
            ));
        });

        newSocket.on('sos:stopped', (data: any) => {
            setActiveSOS(prev => prev.filter(sos => sos.sosId !== data.sosId));
            toast.success(`SOS from ${data.userName} resolved`);
        });

        newSocket.on('report:new', (data: any) => {
            setPendingReports(prev => [data.report, ...prev]);
            toast(`📢 New report: ${data.report.type}`, { icon: '🔔' });
        });

        setSocket(newSocket);
        return () => { newSocket.disconnect(); };
    }, []);

    // Fetch initial data
    useEffect(() => {
        fetchStats();
        fetchReports();
        fetchActiveSOS();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/layers/stats`);
            const data = await res.json();
            setStats({
                activeSos: parseInt(data.stats.active_sos) || 0,
                pendingReports: parseInt(data.stats.pending_reports) || 0,
                activeCctv: parseInt(data.stats.active_cctv) || 0,
                brokenLights: parseInt(data.stats.broken_lights) || 0,
                crimes30d: parseInt(data.stats.crimes_30d) || 0
            });
        } catch (e) {
            // Demo data
            setStats({ activeSos: 2, pendingReports: 5, activeCctv: 1250, brokenLights: 45, crimes30d: 127 });
        }
    };

    const fetchActiveSOS = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/sos/active`, {
                headers: { Authorization: 'Bearer dev-token' }
            });
            const data = await res.json();
            setActiveSOS(data.activeSOS || []);
        } catch (e) {
            // Demo data
            setActiveSOS([
                {
                    sosId: 'demo-1', userId: 'u1', userName: 'Priya Sharma', userPhone: '+91 98765 43210',
                    location: { lat: 12.9716, lon: 77.5946 }, startedAt: new Date().toISOString()
                }
            ]);
        }
    };

    const fetchReports = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/reports/unverified`, {
                headers: { Authorization: 'Bearer dev-token' }
            });
            const data = await res.json();
            setPendingReports(data.reports || []);
        } catch (e) {
            // Demo
            setPendingReports([
                {
                    id: '1', type: 'dark_street', description: 'Street lights not working', lat: 12.97, lon: 77.60,
                    reporter_name: 'John', created_at: new Date().toISOString()
                },
                {
                    id: '2', type: 'harassment', description: 'Harassment near bus stop', lat: 12.93, lon: 77.62,
                    reporter_name: 'Sarah', created_at: new Date().toISOString()
                }
            ]);
        }
    };

    const handleVerifyReport = async (reportId: string, status: 'verified' | 'rejected') => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/report/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer dev-token' },
                body: JSON.stringify({ reportId, status })
            });
            setPendingReports(prev => prev.filter(r => r.id !== reportId));
            toast.success(`Report ${status}`);
        } catch (e) {
            setPendingReports(prev => prev.filter(r => r.id !== reportId));
            toast.success(`Report ${status} (demo)`);
        }
    };

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-dark-200 border-r border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Shield className="w-6 h-6 text-primary-400" />
                        SafeRouteX Admin
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">Police Control Center</p>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-2">
                    <div className={`card flex items-center gap-3 ${stats.activeSos > 0 ? 'sos-alert border-danger-500/50' : ''}`}>
                        <AlertTriangle className={`w-5 h-5 ${stats.activeSos > 0 ? 'text-danger-500' : 'text-gray-500'}`} />
                        <div>
                            <p className="text-2xl font-bold text-danger-400">{stats.activeSos}</p>
                            <p className="text-xs text-gray-400">Active SOS</p>
                        </div>
                    </div>
                    <div className="card flex items-center gap-3">
                        <FileWarning className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="text-xl font-bold">{stats.pendingReports}</p>
                            <p className="text-xs text-gray-400">Pending Reports</p>
                        </div>
                    </div>
                    <div className="card flex items-center gap-3">
                        <Camera className="w-5 h-5 text-safe-500" />
                        <div>
                            <p className="text-xl font-bold">{stats.activeCctv}</p>
                            <p className="text-xs text-gray-400">Active CCTV</p>
                        </div>
                    </div>
                    <div className="card flex items-center gap-3">
                        <Lightbulb className="w-5 h-5 text-yellow-500" />
                        <div>
                            <p className="text-xl font-bold text-yellow-400">{stats.brokenLights}</p>
                            <p className="text-xs text-gray-400">Broken Lights</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {[
                        { id: 'sos', label: 'Live SOS Feed', icon: AlertTriangle, badge: activeSOS.length },
                        { id: 'reports', label: 'Reports', icon: FileWarning, badge: pendingReports.length },
                        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${activeTab === item.id ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            <item.icon className="w-4 h-4" />
                            <span className="flex-1 text-left text-sm">{item.label}</span>
                            {item.badge !== undefined && item.badge > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-danger-500 rounded-full">{item.badge}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex">
                {/* Map */}
                <div className="flex-1 relative">
                    <AdminMap
                        activeSOS={activeSOS}
                        selectedSOS={selectedSOS}
                        reports={pendingReports}
                    />
                </div>

                {/* Right Panel */}
                <div className="w-96 bg-dark-200 border-l border-white/10 overflow-y-auto">
                    {activeTab === 'sos' && (
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${activeSOS.length > 0 ? 'bg-danger-500 animate-pulse' : 'bg-gray-600'}`} />
                                Live SOS Feed
                            </h2>

                            {activeSOS.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>No active SOS alerts</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeSOS.map(sos => (
                                        <div
                                            key={sos.sosId}
                                            onClick={() => setSelectedSOS(sos)}
                                            className={`card cursor-pointer border-danger-500/50 hover:bg-danger-500/10 transition-colors ${selectedSOS?.sosId === sos.sosId ? 'ring-2 ring-danger-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-semibold text-white">{sos.userName}</p>
                                                    <p className="text-xs text-gray-400">{sos.userPhone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="inline-flex items-center gap-1 text-xs text-danger-400">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(sos.startedAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                                                <MapPin className="w-3 h-3" />
                                                {sos.location.lat.toFixed(4)}, {sos.location.lon.toFixed(4)}
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <button className="flex-1 btn-primary text-xs py-1.5">
                                                    <Eye className="w-3 h-3 inline mr-1" /> Track
                                                </button>
                                                <a href={`tel:${sos.userPhone}`} className="flex-1 btn-danger text-xs py-1.5 text-center">
                                                    Call User
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-4">Pending Reports</h2>

                            {pendingReports.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                    <p>All reports reviewed</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pendingReports.map(report => (
                                        <div key={report.id} className="card">
                                            <div className="flex items-start justify-between">
                                                <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                                                    {report.type.replace('_', ' ')}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {new Date(report.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-2">{report.description || 'No description'}</p>
                                            <p className="text-xs text-gray-500 mt-1">By: {report.reporter_name}</p>
                                            <div className="mt-3 flex gap-2">
                                                <button
                                                    onClick={() => handleVerifyReport(report.id, 'verified')}
                                                    className="flex-1 btn-primary text-xs py-1.5 flex items-center justify-center gap-1"
                                                >
                                                    <CheckCircle className="w-3 h-3" /> Verify
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyReport(report.id, 'rejected')}
                                                    className="flex-1 px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs flex items-center justify-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="p-4">
                            <h2 className="text-lg font-bold mb-4">Analytics</h2>
                            <div className="space-y-4">
                                <div className="card">
                                    <p className="text-sm text-gray-400">Crimes (Last 30 days)</p>
                                    <p className="text-3xl font-bold text-primary-400">{stats.crimes30d}</p>
                                </div>
                                <div className="card">
                                    <p className="text-sm text-gray-400">CCTV Coverage</p>
                                    <div className="mt-2 h-2 bg-dark-300 rounded-full">
                                        <div className="h-full bg-safe-500 rounded-full" style={{ width: '78%' }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">78% operational</p>
                                </div>
                                <div className="card">
                                    <p className="text-sm text-gray-400">Streetlight Status</p>
                                    <div className="mt-2 h-2 bg-dark-300 rounded-full">
                                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: '92%' }} />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">92% operational</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
