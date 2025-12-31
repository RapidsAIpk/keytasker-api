import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
  }

  async onModuleInit() {
    await this.$connect();

    Object.assign(
      this,
      this.$extends({
        name: 'softDelete',
        query: {
          $allModels: {
            async findMany({ args, query }: any) {
              args = {
                ...args,
                where: { ...args?.where, deletedAt: { isSet: false } },
              };

              return query(args);
            },
            async count({ args, query }: any) {
              args = {
                ...args,
                where: { ...args?.where, deletedAt: { isSet: false } },
              };

              return query(args);
            },
            async findUnique({ args, query }: any) {
              args = {
                ...args,
                where: { ...args?.where, deletedAt: { isSet: false } },
              };

              return query(args);
            },
          },
        },
      })
    );
  }
}