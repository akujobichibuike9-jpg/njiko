import 'dotenv/config';

export interface AppConfig {
  port: number;
  env: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT ?? 4000),
  env: process.env.NODE_ENV ?? 'development',
};
