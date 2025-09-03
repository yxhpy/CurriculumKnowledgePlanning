import { useEffect, useRef, useCallback } from 'react';

export interface ProgressUpdate {
  type: 'progress';
  task_id: string;
  step: string;
  progress: number;
  message: string;
  timestamp: number;
  data?: any;
}

export interface CompletionUpdate {
  type: 'completion';
  task_id: string;
  success: boolean;
  message: string;
  timestamp: number;
  course_id?: number;
}

export interface ErrorUpdate {
  type: 'error';
  task_id: string;
  message: string;
  timestamp: number;
  step?: string;
}

export type WebSocketMessage = ProgressUpdate | CompletionUpdate | ErrorUpdate;

interface UseWebSocketProps {
  taskId: string;
  onProgress?: (update: ProgressUpdate) => void;
  onCompletion?: (update: CompletionUpdate) => void;
  onError?: (update: ErrorUpdate) => void;
  enabled?: boolean;
}

export const useWebSocket = ({
  taskId,
  onProgress,
  onCompletion,
  onError,
  enabled = true,
}: UseWebSocketProps) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000; // 3 seconds

  const connect = useCallback(() => {
    if (!enabled || !taskId) return;

    // 构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/ws/course-generation/${taskId}`;
    
    // 开发环境说明：WebSocket通过Vite代理连接到后端

    console.log('Connecting to WebSocket:', wsUrl);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`WebSocket connected for task ${taskId}`);
        reconnectAttemptsRef.current = 0;
        
        // 发送ping来保持连接活跃
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // 每30秒ping一次
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') {
            return; // 忽略pong响应
          }

          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);

          switch (message.type) {
            case 'progress':
              onProgress?.(message as ProgressUpdate);
              break;
            case 'completion':
              onCompletion?.(message as CompletionUpdate);
              // 任务完成后关闭连接
              ws.close();
              break;
            case 'error':
              onError?.(message as ErrorUpdate);
              break;
            default:
              console.warn('Unknown WebSocket message type:', message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log(`WebSocket closed for task ${taskId}:`, event.code, event.reason);
        wsRef.current = null;

        // 如果不是正常关闭，尝试重连
        if (enabled && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [taskId, enabled, onProgress, onCompletion, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting');
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (enabled && taskId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, taskId, connect, disconnect]);

  return {
    connected: wsRef.current?.readyState === WebSocket.OPEN,
    disconnect,
  };
};