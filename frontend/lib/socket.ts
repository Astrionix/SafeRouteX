import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect(token?: string) {
        if (this.socket?.connected) return;

        this.socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
            autoConnect: true,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
            if (token) {
                this.socket?.emit('auth', token);
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('auth:success', (data) => {
            console.log('Socket authenticated:', data);
        });

        // Re-emit events to registered listeners
        ['sos:new', 'sos:location', 'sos:stopped', 'report:new'].forEach(event => {
            this.socket?.on(event, (data) => {
                this.listeners.get(event)?.forEach(cb => cb(data));
            });
        });
    }

    disconnect() {
        this.socket?.disconnect();
        this.socket = null;
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);

        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    emit(event: string, data: any) {
        this.socket?.emit(event, data);
    }

    emitSOSLocation(sosId: string, lat: number, lon: number, accuracy?: number) {
        this.socket?.emit('sos:location', { sosId, lat, lon, accuracy });
    }

    joinSOSRoom(sosId: string) {
        this.socket?.emit('sos:join', sosId);
    }

    leaveSOSRoom(sosId: string) {
        this.socket?.emit('sos:leave', sosId);
    }

    subscribeAdmin() {
        this.socket?.emit('admin:subscribe');
    }
}

export const socketService = new SocketService();
