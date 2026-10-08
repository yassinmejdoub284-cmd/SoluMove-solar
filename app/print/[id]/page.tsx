import PrintDocument from './print-document';
export default async function PrintPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <PrintDocument id={id}/>}
