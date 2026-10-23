// Shared Node/Deno body budget. No unbounded req.json(), timers or SDK calls.
export class RequestBodyError extends Error {
 constructor(code,status=400){super(code);this.name='RequestBodyError';this.code=code;this.status=status;}
}
export async function readBoundedJson(request,{maxBytes=4200,timeoutMs=5000}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||!Number.isFinite(timeoutMs)||timeoutMs<1)
  throw new TypeError('Invalid request budget');
 if((request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase()!=='application/json')
  throw new RequestBodyError('invalid_content_type',415);
 const announced=request.headers.get('content-length');
 if(announced!==null&&(!/^[0-9]+$/.test(announced)||Number(announced)>maxBytes))
  throw new RequestBodyError('request_too_large',413);
 if(request.signal?.aborted)throw new RequestBodyError('request_aborted',400);
 const reader=request.body?.getReader();if(!reader)throw new RequestBodyError('missing_request');
 let timer,abort,finished=false;
 const cancel=()=>{try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{/* Never wait on an untrusted cancel hook. */}};
 try{
  const expired=new Promise((_,reject)=>{
   timer=setTimeout(()=>{cancel();reject(new RequestBodyError('request_timeout',408));},timeoutMs);
   abort=()=>{cancel();reject(new RequestBodyError('request_aborted',400));};
   request.signal?.addEventListener('abort',abort,{once:true});
   if(request.signal?.aborted)abort();
  });
  const read=async()=>{
   const decoder=new TextDecoder('utf-8',{fatal:true}),chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;if(size>maxBytes)throw new RequestBodyError('request_too_large',413);
    chunks.push(decoder.decode(value,{stream:true}));
   }
   chunks.push(decoder.decode());
   let data;try{data=JSON.parse(chunks.join(''));}catch{throw new RequestBodyError('invalid_json');}
   if(!data||typeof data!=='object'||Array.isArray(data))throw new RequestBodyError('invalid_json');
   finished=true;return data;
  };
  return await Promise.race([read(),expired]);
 }catch(error){
  if(error instanceof RequestBodyError)throw error;
  throw new RequestBodyError('invalid_json');
 }finally{
  clearTimeout(timer);if(abort)request.signal?.removeEventListener('abort',abort);
  if(!finished)cancel();
  try{reader.releaseLock();}catch{/* A cancelled pending read may settle asynchronously. */}
 }
}
