import Growth from './growth';
import { getChatGPTUser } from './chatgpt-auth';
import RAGCoachWidget from './components/rag-coach-widget';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getChatGPTUser();
  return (
    <>
      <RAGCoachWidget signedIn={!!user} />
      <Growth signedIn={!!user} />
    </>
  );
}
