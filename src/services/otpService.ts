/**
 * OTP Service & Demo API Provider
 * 
 * Provides simulated Demo API gateway for testing verification codes
 * without requiring paid SMS provider credits or external secrets.
 */

export interface DemoApiRequestLog {
  id: string;
  timestamp: string;
  endpoint: string;
  method: 'POST' | 'GET';
  payload: Record<string, any>;
  response: Record<string, any>;
  status: number;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  otp?: string;
  expiresInSeconds: number;
  error?: string;
  apiMetadata?: {
    endpoint: string;
    provider: 'DEMO_SMS_GATEWAY';
    messageId: string;
    deliveredAt: string;
    smsText: string;
  };
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

const DEMO_API_LOGS_KEY = 'tryathome_demo_api_logs';

export class OtpService {
  /**
   * Send OTP using Demo API Gateway
   * Simulates an external SMS gateway API response with latency and delivery metadata
   */
  static async sendOtpViaDemoApi(mobile: string, generatedOtp: string): Promise<SendOtpResult> {
    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    const messageId = `MSG-DEMO-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const smsText = `Your TRYatHOME verification code is ${generatedOtp}. Valid for 5 minutes. Do not share this OTP with anyone.`;

    const apiMetadata = {
      endpoint: '/api/v1/auth/demo-send-otp',
      provider: 'DEMO_SMS_GATEWAY' as const,
      messageId,
      deliveredAt: new Date().toLocaleTimeString(),
      smsText,
    };

    // Store log for inspection in demo/dev mode
    try {
      const logs: DemoApiRequestLog[] = this.getDemoApiLogs();
      logs.unshift({
        id: messageId,
        timestamp: new Date().toISOString(),
        endpoint: '/api/v1/auth/demo-send-otp',
        method: 'POST',
        payload: { mobile: `+91${cleanMobile}`, channel: 'SMS' },
        response: {
          status: 200,
          statusText: 'OK',
          delivered: true,
          messageId,
          code: generatedOtp,
        },
        status: 200,
      });
      localStorage.setItem(DEMO_API_LOGS_KEY, JSON.stringify(logs.slice(0, 20)));
    } catch {}

    return {
      success: true,
      message: `[Demo API] OTP delivered to +91 ${cleanMobile}`,
      otp: generatedOtp,
      expiresInSeconds: 300,
      apiMetadata,
    };
  }

  /**
   * Retrieve recent Demo API logs
   */
  static getDemoApiLogs(): DemoApiRequestLog[] {
    try {
      const raw = localStorage.getItem(DEMO_API_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Send OTP (standard interface)
   */
  static async sendOtp(mobile: string, generatedOtp: string): Promise<SendOtpResult> {
    return this.sendOtpViaDemoApi(mobile, generatedOtp);
  }
}

