import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    console.log('Backend baslatiliyor...');
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api/v1');
    app.enableCors();

    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));

    const port = process.env.PORT || 3000;
    await app.listen(port);
    console.log(`🚀 Backend calisiyor: http://localhost:${port}/api/v1`);
    console.log(`📦 Database: SQLite`);
    console.log(`☁️  Storage: ${process.env.STORAGE_TYPE || 'local'}`);
}
bootstrap();
