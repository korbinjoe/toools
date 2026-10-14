// Read retries are safe during discovery/index loading. Do not wrap arbitrary
// database writes: their response may be lost after a successful commit.
export async function databaseRead<T>(read: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await read(); }
    catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (attempt >= 3 || !/fetch failed|terminated|timed? out|connection.*(closed|reset|terminated)/i.test(message)) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
