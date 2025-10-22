// src/prices/price.service.ts
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface LatestPriceRow {
  price: number; // 변환된 number
  captured_at: string; // ISO string (또는 Date로 캐스팅)
}

@Injectable()
export class PriceService {
  constructor(private readonly ds: DataSource) {}

  /**
   * 스냅샷 저장: 항상 INSERT, (item_id, source, captured_minute) 기준 중복 무시
   * @param itemId market: 실제 숫자 ID / auction: matchKey 등 문자열 키
   * @param price  현재가(또는 시작가)
   * @param source 'market' | 'auction' | 'cron' 등
   * @param meta   부가정보(JSON)
   */

  async saveSnapshot(itemId: string, price: number, source: string, meta?: Record<string, any>) {
    await this.ds.query(
      `
      INSERT INTO price_history (item_id, source, price, captured_at, meta)
      VALUES ($1, $2, $3, now(), $4)
      ON CONFLICT (item_id, source, captured_minute) DO NOTHING
      `,
      [itemId, source, price, meta ?? null],
    );
  }

  // ✅ 최신값 조회 (인덱스: item_id, captured_at DESC)
  async getLatest(itemId: string, opts?: { source?: string }): Promise<LatestPriceRow | null> {
    const params: any[] = [itemId];
    let where = `item_id = $1`;

    if (opts?.source) {
      params.push(opts.source);
      where += ` AND source = $2`;
    }

    const [row] = await this.ds.query(
      `SELECT price, captured_at
        FROM price_history
        WHERE ${where}
        ORDER BY captured_at DESC
        LIMIT 1`,
      params,
    );

    if (!row) return null;
    return {
      price: Number(row.price), // NUMERIC → number
      captured_at: row.captured_at,
    };
  }
}
