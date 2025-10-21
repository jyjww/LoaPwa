import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'crypto';

export class HashExistingIpAddresses1760978000000 implements MigrationInterface {
  name = 'HashExistingIpAddresses1760978000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const IP_SALT = process.env.IP_HASH_SALT || 'loapwa-anon-ip-salt-2024';

    // 기존 IP 주소를 해시로 변환
    const users = await queryRunner.query(`
      SELECT id, "lastIp" FROM anon_users WHERE "lastIp" IS NOT NULL
    `);

    for (const user of users) {
      if (user.lastIp) {
        const hashedIp = createHash('sha256')
          .update(user.lastIp + IP_SALT)
          .digest('hex')
          .substring(0, 16);

        await queryRunner.query(
          `
          UPDATE anon_users 
          SET "lastIp" = $1 
          WHERE id = $2
        `,
          [hashedIp, user.id],
        );
      }
    }

    console.log(`Hashed ${users.length} IP addresses for anonymous users`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 해시된 IP는 원본으로 복원할 수 없으므로 NULL로 설정
    await queryRunner.query(`
      UPDATE anon_users SET "lastIp" = NULL
    `);

    console.log('Cleared all hashed IP addresses (cannot restore original IPs)');
  }
}
