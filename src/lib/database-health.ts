import "server-only";

import net from "net";
import { prisma } from "@/lib/prisma";

export type DatabaseHealth = {
  databaseConnected: boolean;
  prismaConnected: boolean;
  checkedAt: string;
};

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const databaseConnected = await checkTcpConnection();
  let prismaConnected = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    prismaConnected = true;
  } catch (error) {
    console.error("Database health Prisma check failed", error);
  }

  return {
    databaseConnected,
    prismaConnected,
    checkedAt: new Date().toISOString(),
  };
}

async function checkTcpConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;

  try {
    const parsedUrl = new URL(databaseUrl);
    const host = parsedUrl.hostname;
    const port = Number(parsedUrl.port || 5432);

    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 3000 });

      socket.once("connect", () => {
        socket.destroy();
        resolve(true);
      });

      socket.once("timeout", () => {
        socket.destroy();
        resolve(false);
      });

      socket.once("error", () => {
        socket.destroy();
        resolve(false);
      });
    });
  } catch (error) {
    console.error("Database health TCP check failed", error);
    return false;
  }
}
