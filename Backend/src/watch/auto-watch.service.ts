// src/watch/auto-watch.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AutoWatch } from './entities/auto-watch.entity';

@Injectable()
export class AutoWatchService {
  constructor(
    @InjectRepository(AutoWatch) private repo: Repository<AutoWatch>,
    private ds: DataSource,
  ) {}

  async find(userId: string, itemKey: string): Promise<AutoWatch | null> {
    return this.repo.findOne({ where: { user_id: userId, item_key: itemKey } });
  }

  async upsert(userId: string, itemKey: string, enabled: boolean): Promise<AutoWatch> {
    const exist = await this.repo.findOne({ where: { user_id: userId, item_key: itemKey } });
    if (!exist) {
      return this.repo.save({
        user_id: userId,
        item_key: itemKey,
        enabled,
        last_seen_at: new Date(),
      });
    }
    exist.enabled = enabled;
    exist.last_seen_at = new Date();
    return this.repo.save(exist);
  }

  async touch(userId: string, itemKey: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(AutoWatch)
      .set({ last_seen_at: () => 'now()' })
      .where('user_id = :userId AND item_key = :itemKey', { userId, itemKey })
      .execute();
  }

  async listEnabled(): Promise<AutoWatch[]> {
    return this.repo.find({ where: { enabled: true } });
  }

  async markSnapshotted(id: string): Promise<void> {
    await this.repo.update(id, { last_snapshot_at: new Date() });
  }

  async hasRecentFavorite(itemKey: string, days = 3): Promise<boolean> {
    const colon = itemKey.indexOf(':');
    const source = itemKey.slice(0, colon);
    const payload = itemKey.slice(colon + 1);

    // createdAt/updatedAt 추가해놨다면 updated_at 기준, 아니면 last_checked_at/last_notified_at로 대체
    const [row] = await this.ds.query(
      `
      SELECT COUNT(*)::int AS cnt
        FROM favorite f
      WHERE f.active = true
        AND f.source = $1
        AND COALESCE(f.updated_at, f.last_checked_at, f.last_notified_at, now()) 
            >= now() - ($2 || ' days')::interval
        AND (
              ($1 = 'market'  AND f.item_id::text = $3)
            OR ($1 = 'auction' AND f.match_key = $3)
        )
      `,
      [source, String(days), payload],
    );
    return Number(row?.cnt ?? 0) > 0;
  }

  async disable(id: string): Promise<void> {
    await this.repo.update(id, { enabled: false });
  }
}
