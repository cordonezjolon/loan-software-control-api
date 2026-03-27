import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';
import { ResponseInterceptor } from '@/shared/interceptors/response.interceptor';

interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/api/v1')
      .expect(200)
      .expect(res => {
        const body = res.body as ApiEnvelope<{ message: string }>;
        expect(body.success).toBe(true);
        expect(body.data.message).toBe('Loan Management API is running!');
      });
  });

  it('/health (GET)', () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    return request(server)
      .get('/api/v1/health')
      .expect(200)
      .expect(res => {
        const body = res.body as ApiEnvelope<Record<string, unknown>>;
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('message');
        expect(body.data).toHaveProperty('version');
        expect(body.data).toHaveProperty('timestamp');
      });
  });
});
