import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private readonly appService: AppService,
  ) {}

  @Get('health')
  @HealthCheck()
  check() {
    return this.health.check([]);
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
