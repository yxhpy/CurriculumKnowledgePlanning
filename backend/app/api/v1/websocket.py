"""
WebSocket endpoints for real-time updates
"""
import json
import logging
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # 存储活跃的WebSocket连接，按task_id分组
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, task_id: str):
        await websocket.accept()
        if task_id not in self.active_connections:
            self.active_connections[task_id] = set()
        self.active_connections[task_id].add(websocket)
        logger.info(f"WebSocket connected for task {task_id}")
    
    def disconnect(self, websocket: WebSocket, task_id: str):
        if task_id in self.active_connections:
            self.active_connections[task_id].discard(websocket)
            if not self.active_connections[task_id]:
                del self.active_connections[task_id]
        logger.info(f"WebSocket disconnected for task {task_id}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)
    
    async def broadcast_to_task(self, message: dict, task_id: str):
        """向特定任务的所有连接广播消息"""
        if task_id not in self.active_connections:
            return
        
        message_str = json.dumps(message, ensure_ascii=False)
        disconnected = set()
        
        for connection in self.active_connections[task_id].copy():
            try:
                if connection.client_state == WebSocketState.CONNECTED:
                    await connection.send_text(message_str)
                else:
                    disconnected.add(connection)
            except Exception as e:
                logger.error(f"Error sending message to WebSocket: {e}")
                disconnected.add(connection)
        
        # 清理断开的连接
        for conn in disconnected:
            self.active_connections[task_id].discard(conn)

# 全局连接管理器
manager = ConnectionManager()

@router.websocket("/course-generation/{task_id}")
async def websocket_course_generation(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for course generation progress updates
    客户端连接后会接收到课程生成过程的实时更新
    """
    await manager.connect(websocket, task_id)
    try:
        while True:
            # 保持连接活跃，接收客户端的ping消息
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=1.0)
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # 超时是正常的，继续保持连接
                continue
            except Exception as e:
                logger.error(f"WebSocket receive error: {e}")
                break
    except WebSocketDisconnect:
        manager.disconnect(websocket, task_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, task_id)

async def send_progress_update(task_id: str, step: str, progress: int, message: str, data: dict = None):
    """
    发送进度更新到WebSocket客户端
    
    Args:
        task_id: 任务ID
        step: 当前步骤名称
        progress: 进度百分比 (0-100)
        message: 进度描述消息
        data: 附加数据
    """
    update = {
        "type": "progress",
        "task_id": task_id,
        "step": step,
        "progress": progress,
        "message": message,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    if data:
        update["data"] = data
    
    await manager.broadcast_to_task(update, task_id)
    logger.info(f"Sent progress update for task {task_id}: {step} ({progress}%) - {message}")

async def send_completion_update(task_id: str, success: bool, message: str, course_id: int = None):
    """
    发送任务完成通知
    
    Args:
        task_id: 任务ID
        success: 是否成功
        message: 完成消息
        course_id: 生成的课程ID（如果成功）
    """
    update = {
        "type": "completion",
        "task_id": task_id,
        "success": success,
        "message": message,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    if course_id:
        update["course_id"] = course_id
    
    await manager.broadcast_to_task(update, task_id)
    logger.info(f"Sent completion update for task {task_id}: {'SUCCESS' if success else 'FAILED'} - {message}")

async def send_error_update(task_id: str, error_message: str, step: str = None):
    """
    发送错误更新
    
    Args:
        task_id: 任务ID
        error_message: 错误消息
        step: 出错的步骤
    """
    update = {
        "type": "error",
        "task_id": task_id,
        "message": error_message,
        "timestamp": asyncio.get_event_loop().time()
    }
    
    if step:
        update["step"] = step
    
    await manager.broadcast_to_task(update, task_id)
    logger.error(f"Sent error update for task {task_id}: {error_message}")