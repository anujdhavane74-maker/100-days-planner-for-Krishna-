import CoachView from './coach-view';
import { getChatGPTUser } from '../chatgpt-auth';

export const dynamic = 'force-dynamic';

export default async function CoachPage() {
  const user = await getChatGPTUser();
  return <CoachView signedIn={!!user} />;
}
