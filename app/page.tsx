import Growth from './growth';
import {getChatGPTUser} from './chatgpt-auth';
import RAGCoachWidget from './components/rag-coach-widget';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <><a href="/studio" style={{position:'fixed',right:24,bottom:20,zIndex:40,padding:'12px 20px',background:'#ff873d',color:'#07101f',borderRadius:12,fontWeight:700}}>Open growth studio ↗</a><RAGCoachWidget signedIn={!!user}/><Growth signedIn={!!user}/></>;}
