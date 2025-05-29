import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      username: string;
      email: string;
      isVerified: boolean;
      role?: string;
    };
  }
}
