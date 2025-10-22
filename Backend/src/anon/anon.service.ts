import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnonUser } from './anon-user.entity';
import { createHash } from 'crypto';

export interface AnonUserMeta {
  userAgent?: string;
  lastIp?: string;
}

@Injectable()
export class AnonUserService {
  private readonly IP_SALT = process.env.IP_HASH_SALT || 'loapwa-anon-ip-salt-2024';

  constructor(
    @InjectRepository(AnonUser)
    private anonUserRepository: Repository<AnonUser>,
  ) {}

  private hashIp(ip: string): string {
    return createHash('sha256')
      .update(ip + this.IP_SALT)
      .digest('hex')
      .substring(0, 16); // 16자리로 단축
  }

  async upsert(anonId: string, meta?: AnonUserMeta): Promise<AnonUser> {
    const existing = await this.anonUserRepository.findOne({
      where: { id: anonId },
    });

    if (existing) {
      // Update lastSeenAt and meta
      existing.lastSeenAt = new Date();
      if (meta?.userAgent) existing.userAgent = meta.userAgent;
      if (meta?.lastIp) existing.lastIp = this.hashIp(meta.lastIp);

      return await this.anonUserRepository.save(existing);
    } else {
      // Create new anon user
      const anonUser = this.anonUserRepository.create({
        id: anonId,
        createdAt: new Date(),
        lastSeenAt: new Date(),
        userAgent: meta?.userAgent,
        lastIp: meta?.lastIp ? this.hashIp(meta.lastIp) : undefined,
      });

      return await this.anonUserRepository.save(anonUser);
    }
  }

  async findById(anonId: string): Promise<AnonUser | null> {
    return await this.anonUserRepository.findOne({
      where: { id: anonId },
    });
  }
}
