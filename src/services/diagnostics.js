import {supabase} from '../supabase';
let lastSent=0;
let screen='app';
export function diagnosticScreen(value){screen=['admin','participant','suspect','login'].includes(value)?value:'app';}
export function recordDiagnostic(category){
 if(Date.now()-lastSent<60000)return;lastSent=Date.now();
 // Deliberately no Error.message/stack, URL/query, note content, token or email.
 const release=(process.env.REACT_APP_RELEASE||'unknown').replace(/[^a-zA-Z0-9._-]/g,'').slice(0,64);
 supabase.rpc('record_client_diagnostic',{category,screen,release}).then(()=>{},()=>{});
}
export function installDiagnostics(){
 window.addEventListener('error',()=>recordDiagnostic('unhandled'));
 window.addEventListener('unhandledrejection',()=>recordDiagnostic('promise'));
}
