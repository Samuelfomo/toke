// types/express.d.ts
declare namespace Express {
  interface Request {
    context?: {
      type: 'master' | 'tenant';
      tenantId?: string;
      [key: string]: any;
    };
  }
}
