import {requireChatGPTUser} from './chatgpt-auth';
import Workspace from './workspace';
export const dynamic='force-dynamic';
export default async function Page(){
 if(process.env.SOLAR_VERCEL_BUILD==='1')return <main style={{maxWidth:680,margin:'12vh auto',padding:32}}><h1>SoluMove Solar</h1><p>Le site est hébergé sur Vercel.</p><p>La connexion et les services de données doivent être configurés pour ouvrir votre espace de gestion. Le backend actuel utilise Cloudflare D1/R2 et la passerelle d’authentification Sites.</p></main>;
 const user=await requireChatGPTUser('/');return <Workspace actor={user.userId}/>;
}
