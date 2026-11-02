import Studio from './studio';
import {getChatGPTUser} from '../chatgpt-auth';
import RAGCoachWidget from '../components/rag-coach-widget';
export const dynamic='force-dynamic';
export default async function Page(){const signedIn=!!(await getChatGPTUser());return <><RAGCoachWidget signedIn={signedIn}/><Studio signedIn={signedIn}/></>}
