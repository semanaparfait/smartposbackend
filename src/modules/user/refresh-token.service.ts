import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

const hash = (token: string) =>
  createHash('sha256').update(token).digest('hex');

// How long a website sign-in lasts without being used (REFRESH_DAYS, default 30).
export const refreshDays = () => Number(process.env.REFRESH_DAYS ?? 30) || 30;

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  // A new token for a sign-in; the plain value is returned once, for the cookie.
  async issue(userId: string, sid: string, deviceId?: string | null) {
    const token = randomBytes(48).toString('base64url');
    await this.repo.insert({
      user: { id: userId },
      tokenHash: hash(token),
      sid,
      deviceId: deviceId ?? null,
      expiresAt: new Date(Date.now() + refreshDays() * 86_400_000),
    });
    return token;
  }

  // Swaps a token for a new one. Null when it is unknown, expired or already
  // used; a used one also ends every sign-in of that user.
  async rotate(token: string) {
    const row = await this.repo.findOne({
      where: { tokenHash: hash(token) },
      relations: { user: true },
    });
    if (!row) return null;
    if (row.revokedAt) {
      // Just replaced (another tab renewed a moment ago): not a stolen token.
      if (Date.now() - row.revokedAt.getTime() > 60_000)
        await this.revokeAll(row.user.id);
      return null;
    }
    if (row.expiresAt.getTime() < Date.now()) return null;

    const claimed = await this.repo.update(
      { id: row.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    // Another request renewed it at the same moment.
    if (!claimed.affected) return null;

    const next = await this.issue(row.user.id, row.sid, row.deviceId);
    return {
      userId: row.user.id,
      sid: row.sid,
      deviceId: row.deviceId,
      token: next,
    };
  }

  async revoke(token: string) {
    await this.repo.update(
      { tokenHash: hash(token), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  // Signs the user out of every website sign-in (password changed, account off).
  async revokeAll(userId: string) {
    await this.repo.update(
      { user: { id: userId }, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
