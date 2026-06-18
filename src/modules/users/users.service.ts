import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { CursorPage } from '../../common/dto/pagination.dto';
import { LEGACY_ITSHOW_SEED_USER_PREFIX, SEED_STUDENT_NAME_USER_PREFIX, SEED_STUDENT_USER_PREFIX } from '../../common/student-roster';
import { decodeCursor, encodeCursor } from '../../common/utils/cursor';
import { UserEntity } from '../../database/entities';
import { UserListQueryDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(UserEntity) private readonly users: Repository<UserEntity>) {}

  async list(query: UserListQueryDto): Promise<CursorPage<UserEntity>> {
    const limit = query.limit ?? 20;
    const cursor = decodeCursor(query.cursor);
    const qb = this.users.createQueryBuilder('user')
      .where('user.oauthId NOT LIKE :legacySeedPrefix', { legacySeedPrefix: `${LEGACY_ITSHOW_SEED_USER_PREFIX}%` })
      .andWhere('user.oauthId NOT LIKE :studentSeedPrefix', { studentSeedPrefix: `${SEED_STUDENT_USER_PREFIX}%` })
      .andWhere('user.oauthId NOT LIKE :studentNameSeedPrefix', { studentNameSeedPrefix: `${SEED_STUDENT_NAME_USER_PREFIX}%` })
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .take(limit + 1);
    if (query.search) {
      qb.andWhere(new Brackets((nested) => {
        nested.where('user.name ILIKE :search', { search: `%${query.search}%` }).orWhere('user.email ILIKE :search', { search: `%${query.search}%` });
      }));
    }
    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }
    if (cursor) {
      qb.andWhere('(user.createdAt, user.id) < (:date, :id)', { date: cursor.date, id: cursor.id });
    }
    const rows = await qb.getMany();
    const items = rows.slice(0, limit);
    const last = items.at(-1);
    return { items, nextCursor: rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null };
  }
}
