import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Handle BigInt serialization in JSON.stringify automatically
(BigInt.prototype as any).toJSON = function () {
  const intVal = Number(this);
  return Number.isSafeInteger(intVal) ? intVal : this.toString();
};
