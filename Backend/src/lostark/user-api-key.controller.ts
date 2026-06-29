import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/auth/entities/user.entity';
import { ApiKeyCryptoService } from './api-key-crypto.service';

class SetApiKeyDto {
  apiKey!: string;
}

@Controller('user/api-key')
@UseGuards(AuthGuard('jwt'))
export class UserApiKeyController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly crypto: ApiKeyCryptoService,
  ) {}

  /** GET /user/api-key — returns status only, never the plaintext key */
  @Get()
  async getStatus(@Req() req: any) {
    const userId: string = req.user?.id ?? req.user?.sub;
    const fresh = await this.userRepo.findOne({ where: { id: userId } });
    const hasKey = !!fresh?.encryptedApiKey;
    let maskedKey: string | null = null;
    if (hasKey && fresh?.encryptedApiKey) {
      try {
        const plain = this.crypto.decrypt(fresh.encryptedApiKey);
        maskedKey = this.crypto.mask(plain);
      } catch {
        maskedKey = '***';
      }
    }
    return { hasApiKey: hasKey, maskedKey };
  }

  /** PUT /user/api-key — save (encrypt) user's personal LostArk API key */
  @Put()
  async setApiKey(@Req() req: any, @Body() dto: SetApiKeyDto) {
    const userId: string = req.user?.id ?? req.user?.sub;
    const { apiKey } = dto;
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      throw new BadRequestException('Invalid API key format');
    }
    const encrypted = this.crypto.encrypt(apiKey.trim());
    await this.userRepo.update(userId, { encryptedApiKey: encrypted });
    return { success: true };
  }

  /** DELETE /user/api-key — remove stored API key */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApiKey(@Req() req: any) {
    const userId: string = req.user?.id ?? req.user?.sub;
    await this.userRepo.update(userId, { encryptedApiKey: null as any });
  }
}
