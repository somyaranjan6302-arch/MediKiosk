import json
import logging
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("medikiosk.ws")
router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast_alert(self, alert_data: dict):
        message = json.dumps(alert_data)
        logger.warning(f"BROADCASTING EMERGENCY ALERT TO {len(self.active_connections)} CLIENTS: {alert_data.get('rule_id')}")
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending to WS client: {e}")
                disconnected.append(connection)
        for dead in disconnected:
            self.disconnect(dead)

manager = ConnectionManager()

@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial connected message
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to MediKiosk Real-Time Triage Alert Network"
        })
        while True:
            # Keep connection alive, listen for ping or ack
            data = await websocket.receive_text()
            # Optional heartbeat / echo
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
