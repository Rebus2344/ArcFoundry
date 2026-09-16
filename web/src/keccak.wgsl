struct Params { words:array<u32,32> }; struct Record { hash:array<u32,8>, offset:u32, valid:u32 };
@group(0) @binding(0) var<storage,read> params:Params; @group(0) @binding(1) var<storage,read_write> records:array<Record>; @group(0) @binding(2) var<storage,read_write> result:array<Record>;
var<workgroup> partials:array<Record,64>;
const RC=array<vec2<u32>,24>(vec2(0x00000001u,0x00000000u),vec2(0x00008082u,0x00000000u),vec2(0x0000808au,0x80000000u),vec2(0x80008000u,0x80000000u),vec2(0x0000808bu,0x00000000u),vec2(0x80000001u,0x00000000u),vec2(0x80008081u,0x80000000u),vec2(0x00008009u,0x80000000u),vec2(0x0000008au,0x00000000u),vec2(0x00000088u,0x00000000u),vec2(0x80008009u,0x00000000u),vec2(0x8000000au,0x00000000u),vec2(0x8000808bu,0x00000000u),vec2(0x0000008bu,0x80000000u),vec2(0x00008089u,0x80000000u),vec2(0x00008003u,0x80000000u),vec2(0x00008002u,0x80000000u),vec2(0x00000080u,0x80000000u),vec2(0x0000800au,0x00000000u),vec2(0x8000000au,0x80000000u),vec2(0x80008081u,0x80000000u),vec2(0x00008080u,0x80000000u),vec2(0x80000001u,0x00000000u),vec2(0x80008008u,0x80000000u));
fn rol(v:vec2<u32>,n:u32)->vec2<u32>{if(n<32u){return (v<<vec2(n))|(v.yx>>vec2(32u-n));}let k=n-32u;return (v.yx<<vec2(k))|(v>>vec2(32u-k));}
fn swap(v:u32)->u32{return (v>>24u)|((v>>8u)&0xff00u)|((v<<8u)&0xff0000u)|(v<<24u);}
fn less(a:Record,b:Record)->bool{if(a.valid==0u){return false;}if(b.valid==0u){return true;}
if(a.hash[0]!=b.hash[0]){return a.hash[0]<b.hash[0];}
if(a.hash[1]!=b.hash[1]){return a.hash[1]<b.hash[1];}
if(a.hash[2]!=b.hash[2]){return a.hash[2]<b.hash[2];}
if(a.hash[3]!=b.hash[3]){return a.hash[3]<b.hash[3];}
if(a.hash[4]!=b.hash[4]){return a.hash[4]<b.hash[4];}
if(a.hash[5]!=b.hash[5]){return a.hash[5]<b.hash[5];}
if(a.hash[6]!=b.hash[6]){return a.hash[6]<b.hash[6];}
if(a.hash[7]!=b.hash[7]){return a.hash[7]<b.hash[7];}
return a.offset<b.offset;}
fn hashAt(index:u32)->Record{let lo=params.words[29]+index;let hi=params.words[30]+select(0u,1u,lo<params.words[29]);
var a0=vec2(params.words[0],params.words[1]);
var a1=vec2(params.words[2],params.words[3]);
var a2=vec2(params.words[4],params.words[5]);
var a3=vec2(params.words[6],params.words[7]);
var a4=vec2(params.words[8],params.words[9]);
var a5=vec2(params.words[10],params.words[11]);
var a6=vec2(params.words[12],params.words[13]);
var a7=vec2(params.words[14],params.words[15]);
var a8=vec2(params.words[16],params.words[17]);
var a9=vec2(params.words[18],params.words[19]);
var a10=vec2(params.words[20],params.words[21]);
var a11=vec2(params.words[22],params.words[23]);
var a12=vec2(params.words[24],params.words[25]);
var a13=vec2(params.words[26],params.words[27]);
var a14=vec2(params.words[28],1u);
var a15=vec2(0u);
var a16=vec2(0u,0x80000000u);
var a17=vec2(0u);
var a18=vec2(0u);
var a19=vec2(0u);
var a20=vec2(0u);
var a21=vec2(0u);
var a22=vec2(0u);
var a23=vec2(0u);
var a24=vec2(0u);
a5.y=swap(hi);a6.x=swap(lo);for(var round=0u;round<24u;round++){
let c0=a0^a5^a10^a15^a20;
let c1=a1^a6^a11^a16^a21;
let c2=a2^a7^a12^a17^a22;
let c3=a3^a8^a13^a18^a23;
let c4=a4^a9^a14^a19^a24;
let d0=c4^rol(c1,1u);a0^=d0;a5^=d0;a10^=d0;a15^=d0;a20^=d0;
let d1=c0^rol(c2,1u);a1^=d1;a6^=d1;a11^=d1;a16^=d1;a21^=d1;
let d2=c1^rol(c3,1u);a2^=d2;a7^=d2;a12^=d2;a17^=d2;a22^=d2;
let d3=c2^rol(c4,1u);a3^=d3;a8^=d3;a13^=d3;a18^=d3;a23^=d3;
let d4=c3^rol(c0,1u);a4^=d4;a9^=d4;a14^=d4;a19^=d4;a24^=d4;
var t=a1;var u=vec2(0u);
u=a10;a10=rol(t,1u);t=u;
u=a7;a7=rol(t,3u);t=u;
u=a11;a11=rol(t,6u);t=u;
u=a17;a17=rol(t,10u);t=u;
u=a18;a18=rol(t,15u);t=u;
u=a3;a3=rol(t,21u);t=u;
u=a5;a5=rol(t,28u);t=u;
u=a16;a16=rol(t,36u);t=u;
u=a8;a8=rol(t,45u);t=u;
u=a21;a21=rol(t,55u);t=u;
u=a24;a24=rol(t,2u);t=u;
u=a4;a4=rol(t,14u);t=u;
u=a15;a15=rol(t,27u);t=u;
u=a23;a23=rol(t,41u);t=u;
u=a19;a19=rol(t,56u);t=u;
u=a13;a13=rol(t,8u);t=u;
u=a12;a12=rol(t,25u);t=u;
u=a2;a2=rol(t,43u);t=u;
u=a20;a20=rol(t,62u);t=u;
u=a14;a14=rol(t,18u);t=u;
u=a22;a22=rol(t,39u);t=u;
u=a9;a9=rol(t,61u);t=u;
u=a6;a6=rol(t,20u);t=u;
u=a1;a1=rol(t,44u);t=u;
{
let b0=a0;
let b1=a1;
let b2=a2;
let b3=a3;
let b4=a4;
a0=b0^((~b1)&b2);
a1=b1^((~b2)&b3);
a2=b2^((~b3)&b4);
a3=b3^((~b4)&b0);
a4=b4^((~b0)&b1);
}
{
let b0=a5;
let b1=a6;
let b2=a7;
let b3=a8;
let b4=a9;
a5=b0^((~b1)&b2);
a6=b1^((~b2)&b3);
a7=b2^((~b3)&b4);
a8=b3^((~b4)&b0);
a9=b4^((~b0)&b1);
}
{
let b0=a10;
let b1=a11;
let b2=a12;
let b3=a13;
let b4=a14;
a10=b0^((~b1)&b2);
a11=b1^((~b2)&b3);
a12=b2^((~b3)&b4);
a13=b3^((~b4)&b0);
a14=b4^((~b0)&b1);
}
{
let b0=a15;
let b1=a16;
let b2=a17;
let b3=a18;
let b4=a19;
a15=b0^((~b1)&b2);
a16=b1^((~b2)&b3);
a17=b2^((~b3)&b4);
a18=b3^((~b4)&b0);
a19=b4^((~b0)&b1);
}
{
let b0=a20;
let b1=a21;
let b2=a22;
let b3=a23;
let b4=a24;
a20=b0^((~b1)&b2);
a21=b1^((~b2)&b3);
a22=b2^((~b3)&b4);
a23=b3^((~b4)&b0);
a24=b4^((~b0)&b1);
}
a0^=RC[round];}
return Record(array<u32,8>(swap(a0.x),swap(a0.y),swap(a1.x),swap(a1.y),swap(a2.x),swap(a2.y),swap(a3.x),swap(a3.y)),index,1u);}
@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>,@builtin(local_invocation_index) lid:u32,@builtin(workgroup_id) group:vec3<u32>){var best:Record;for(var j=0u;j<8u;j++){let index=gid.x*8u+j;if(index<params.words[31]){let candidate=hashAt(index);if(less(candidate,best)){best=candidate;}}}partials[lid]=best;
workgroupBarrier();for(var stride=32u;stride>0u;stride>>=1u){if(lid<stride){let other=partials[lid+stride];if(less(other,partials[lid])){partials[lid]=other;}}workgroupBarrier();}
if(lid==0u){records[group.x]=partials[0];}}
@compute @workgroup_size(64) fn reduce(@builtin(local_invocation_index) lid:u32){var best:Record;let count=(params.words[31]+511u)/512u;for(var i=lid;i<count;i+=64u){let candidate=records[i];if(less(candidate,best)){best=candidate;}}partials[lid]=best;
workgroupBarrier();for(var stride=32u;stride>0u;stride>>=1u){if(lid<stride){let other=partials[lid+stride];if(less(other,partials[lid])){partials[lid]=other;}}workgroupBarrier();}
if(lid==0u){result[0]=partials[0];}}
