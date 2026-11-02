import Studio from './studio';
import {getChatGPTUser} from '../chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){return <Studio signedIn={!!(await getChatGPTUser())}/>}
