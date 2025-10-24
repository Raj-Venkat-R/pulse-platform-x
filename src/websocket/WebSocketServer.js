const WebSocket = require('ws');
const { Pool } = require('pg');

class WebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.clients = new Map(); // Store connected clients
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection');
      
      // Store client connection
      const clientId = this.generateClientId();
      this.clients.set(clientId, {
        ws,
        subscriptions: new Set(),
        lastPing: Date.now()
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connection',
        client_id: clientId,
        message: 'Connected to appointment system'
      }));

      // Handle incoming messages
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(clientId, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(clientId);
      });
    });

    // Set up ping/pong for connection health
    this.setupHeartbeat();
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (data.type) {
      case 'subscribe':
        this.handleSubscribe(clientId, data);
        break;
      case 'unsubscribe':
        this.handleUnsubscribe(clientId, data);
        break;
      case 'ping':
        this.handlePing(clientId);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  handleSubscribe(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel, filters } = data;
    
    // Add subscription
    client.subscriptions.add(channel);
    
    // Send confirmation
    client.ws.send(JSON.stringify({
      type: 'subscription_confirmed',
      channel,
      filters
    }));

    // Send current data for the subscription
    this.sendCurrentData(clientId, channel, filters);
  }

  handleUnsubscribe(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channel } = data;
    client.subscriptions.delete(channel);
    
    client.ws.send(JSON.stringify({
      type: 'unsubscription_confirmed',
      channel
    }));
  }

  handlePing(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastPing = Date.now();
    client.ws.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now()
    }));
  }

  async sendCurrentData(clientId, channel, filters = {}) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      let data = null;

      switch (channel) {
        case 'queue_status':
          data = await this.getQueueStatus(filters);
          break;
        case 'appointment_updates':
          data = await this.getAppointmentUpdates(filters);
          break;
        case 'doctor_availability':
          data = await this.getDoctorAvailability(filters);
          break;
        default:
          console.log('Unknown channel:', channel);
          return;
      }

      client.ws.send(JSON.stringify({
        type: 'data_update',
        channel,
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error sending current data:', error);
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to fetch current data'
      }));
    }
  }

  async getQueueStatus(filters) {
    let query = `
      SELECT 
        qm.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        u.first_name || ' ' || u.last_name as doctor_name,
        u.specialty as doctor_specialty,
        a.appointment_number,
        a.reason_for_visit
      FROM queue_management qm
      JOIN patients p ON qm.patient_id = p.id
      JOIN users u ON qm.doctor_id = u.id
      LEFT JOIN appointments a ON qm.appointment_id = a.id
      WHERE qm.current_status IN ('waiting', 'called', 'in_consultation')
    `;

    const values = [];
    let paramCount = 0;

    if (filters.doctor_id) {
      paramCount++;
      query += ` AND qm.doctor_id = $${paramCount}`;
      values.push(filters.doctor_id);
    }

    if (filters.location_id) {
      paramCount++;
      query += ` AND u.location_id = $${paramCount}`;
      values.push(filters.location_id);
    }

    query += ` ORDER BY qm.doctor_id, qm.priority_score DESC, qm.check_in_time ASC`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getAppointmentUpdates(filters) {
    let query = `
      SELECT 
        a.*,
        p.first_name || ' ' || p.last_name as patient_name,
        p.phone as patient_phone,
        u.first_name || ' ' || u.last_name as doctor_name
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.doctor_id = u.id
      WHERE a.updated_at > NOW() - INTERVAL '1 hour'
    `;

    const values = [];
    let paramCount = 0;

    if (filters.doctor_id) {
      paramCount++;
      query += ` AND a.doctor_id = $${paramCount}`;
      values.push(filters.doctor_id);
    }

    if (filters.status) {
      paramCount++;
      query += ` AND a.status = $${paramCount}`;
      values.push(filters.status);
    }

    query += ` ORDER BY a.updated_at DESC LIMIT 50`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getDoctorAvailability(filters) {
    let query = `
      SELECT 
        u.id as doctor_id,
        u.first_name || ' ' || u.last_name as doctor_name,
        u.specialty,
        a.date,
        a.start_time,
        a.end_time,
        a.is_available
      FROM availability a
      JOIN users u ON a.doctor_id = u.id
      WHERE a.date >= CURRENT_DATE
    `;

    const values = [];
    let paramCount = 0;

    if (filters.doctor_id) {
      paramCount++;
      query += ` AND a.doctor_id = $${paramCount}`;
      values.push(filters.doctor_id);
    }

    if (filters.specialty) {
      paramCount++;
      query += ` AND u.specialty = $${paramCount}`;
      values.push(filters.specialty);
    }

    query += ` ORDER BY a.date, a.start_time`;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  // Broadcast updates to all subscribed clients
  broadcastUpdate(channel, data, filters = {}) {
    const message = JSON.stringify({
      type: 'data_update',
      channel,
      data,
      timestamp: Date.now()
    });

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error('Error sending message to client:', error);
          this.clients.delete(clientId);
        }
      }
    });
  }

  // Broadcast to specific clients based on filters
  broadcastToFilteredClients(channel, data, filters) {
    const message = JSON.stringify({
      type: 'data_update',
      channel,
      data,
      filters,
      timestamp: Date.now()
    });

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(channel)) {
        // Check if client should receive this update based on filters
        if (this.shouldReceiveUpdate(client, channel, filters)) {
          try {
            client.ws.send(message);
          } catch (error) {
            console.error('Error sending filtered message to client:', error);
            this.clients.delete(clientId);
          }
        }
      }
    });
  }

  shouldReceiveUpdate(client, channel, filters) {
    // Implement filtering logic based on client subscriptions and filters
    // This is a simplified version - you might want to store client-specific filters
    return true;
  }

  // Specific update methods
  notifyQueueUpdate(doctorId, queueData) {
    this.broadcastToFilteredClients('queue_status', queueData, { doctor_id: doctorId });
  }

  notifyAppointmentUpdate(appointmentId, appointmentData) {
    this.broadcastUpdate('appointment_updates', appointmentData);
  }

  notifyPatientCalled(doctorId, patientData) {
    this.broadcastToFilteredClients('queue_status', {
      type: 'patient_called',
      doctor_id: doctorId,
      patient_name: patientData.patient_name,
      token_number: patientData.token_number
    }, { doctor_id: doctorId });
  }

  notifyQueuePositionChange(patientId, newPosition) {
    this.broadcastUpdate('queue_status', {
      type: 'queue_position_change',
      patient_id: patientId,
      new_position: newPosition
    });
  }

  setupHeartbeat() {
    // Check for dead connections every 30 seconds
    setInterval(() => {
      const now = Date.now();
      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > 60000) { // 60 seconds timeout
          console.log('Removing inactive client:', clientId);
          client.ws.terminate();
          this.clients.delete(clientId);
        }
      });
    }, 30000);
  }

  getConnectionStats() {
    return {
      total_connections: this.clients.size,
      active_connections: Array.from(this.clients.values()).filter(
        client => client.ws.readyState === WebSocket.OPEN
      ).length
    };
  }
}

module.exports = WebSocketServer;
