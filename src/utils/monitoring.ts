// src/utils/monitoring.ts
import { Gauge, Counter, register } from 'prom-client';
import logger from './logger';

// Prometheus metrics
const metrics = {
  activeUsers: new Gauge({
    name: 'active_users',
    help: 'Number of active users'
  }),
  otpRequests: new Counter({
    name: 'otp_requests_total',
    help: 'Total OTP requests',
    labelNames: ['status']
  }),
  apiLatency: new Gauge({
    name: 'api_latency',
    help: 'API endpoint latency',
    labelNames: ['endpoint']
  }),
  whatsappStatus: new Gauge({
    name: 'whatsapp_connection_status',
    help: 'WhatsApp connection status (1: connected, 0: disconnected)'
  })
};

export { metrics };