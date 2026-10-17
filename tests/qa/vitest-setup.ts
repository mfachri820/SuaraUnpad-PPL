import { prepareDatabase } from './prepare-database.cjs';

export default async function setup() {
  await prepareDatabase();
}
