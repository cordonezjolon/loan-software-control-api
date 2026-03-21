import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './controllers/clients.controller';
import { ClientsService } from './services/clients.service';
import { Client } from './entities/client.entity';
import { ClientRepository } from './repositories/client.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ClientsController],
  providers: [ClientsService, ClientRepository],
  exports: [ClientsService],
})
export class ClientsModule {}
