import type {Metadata} from 'next';
import './globals.css';
import './agenda.css';
export const metadata:Metadata={title:'SoluMove Solar — Gestion photovoltaïque',description:'Clients, projets solaires, stock, paiements, contrats et ressources humaines.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'},manifest:'/manifest.webmanifest',appleWebApp:{capable:true,title:'SoluMove Solar',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>}
